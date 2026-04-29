import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const HCM_URL = process.env.HCM_BASE_URL || 'http://localhost:4000';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

async function seed() {
  console.log('Starting seed process...\n');

  try {
    // Step 0: Check if services are running
    console.log('Checking if services are running...');
    try {
      await axios.get(`${BASE_URL}/employees/test-connection`, { validateStatus: () => true });
      console.log(`  TimeOff Service is running on ${BASE_URL}`);
    } catch (error) {
      console.error(` TimeOff Service is NOT running on ${BASE_URL}`);
      console.error('\n Please start the TimeOff Service first:');
      console.error(`     HCM_BASE_URL=${HCM_URL} npm run start:dev\n`);
      process.exit(1);
    }

    try {
      await axios.get(`${HCM_URL}/hcm/balances`);
      console.log(` Mock HCM Server is running on ${HCM_URL}`);
    } catch (error) {
      console.error(` Mock HCM Server is NOT running on ${HCM_URL}`);
      console.error('\n Please start the Mock HCM Server first:');
      console.error('     npm run mock-hcm\n');
      process.exit(1);
    }

    console.log();

    // Step 1: Create employees
    console.log('📝 Creating employees...');
    const employees: Employee[] = [];

    const employeeData = [
      { name: 'Alice Johnson', email: 'alice@company.com', role: 'EMPLOYEE' },
      { name: 'Bob Smith', email: 'bob@company.com', role: 'EMPLOYEE' },
      { name: 'Charlie Brown', email: 'charlie@company.com', role: 'EMPLOYEE' },
      { name: 'Diana Prince', email: 'diana@company.com', role: 'MANAGER' },
      { name: 'Eve Wilson', email: 'eve@company.com', role: 'EMPLOYEE' },
    ];

    for (const data of employeeData) {
      try {
        const response = await axios.post(`${BASE_URL}/employees`, data);
        employees.push(response.data);
        console.log(`  ✓ Created ${data.name} (${response.data.id})`);
      } catch (error: any) {
        if (error.response?.status === 409) {
          console.log(`  ⚠ ${data.name} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }

    console.log(`\n✅ Created ${employees.length} employees\n`);

    // Step 2: Seed HCM with balance data
    console.log('💰 Seeding HCM with balance data...');
    const hcmData = employees.map((emp) => ({
      employeeId: emp.id,
      locationId: 'loc1',
      availableDays: Math.floor(Math.random() * 15) + 10, // Random between 10-24 days
    }));

    await axios.post(`${HCM_URL}/hcm/seed`, hcmData);
    console.log(`  ✓ Seeded ${hcmData.length} balance records in HCM`);

    // Step 3: Sync balances from HCM to local DB
    console.log('\n🔄 Syncing balances from HCM...');
    await axios.post(`${BASE_URL}/sync/trigger`);
    console.log('  ✓ Sync completed');

    // Step 4: Create some sample time-off requests
    console.log('\n📅 Creating sample time-off requests...');
    const requests = [
      {
        employeeId: employees[0].id,
        locationId: 'loc1',
        startDate: '2026-05-01',
        endDate: '2026-05-03',
        days: 2,
        idempotencyKey: `seed-request-1-${Date.now()}`,
      },
      {
        employeeId: employees[1].id,
        locationId: 'loc1',
        startDate: '2026-05-10',
        endDate: '2026-05-15',
        days: 5,
        idempotencyKey: `seed-request-2-${Date.now()}`,
      },
      {
        employeeId: employees[2].id,
        locationId: 'loc1',
        startDate: '2026-06-01',
        endDate: '2026-06-02',
        days: 1,
        idempotencyKey: `seed-request-3-${Date.now()}`,
      },
    ];

    const createdRequests: any[] = [];
    for (const request of requests) {
      const response = await axios.post(`${BASE_URL}/timeoff/request`, request);
      createdRequests.push(response.data);
      const employee = employees.find((e) => e.id === request.employeeId);
      console.log(
        `  ✓ Created request for ${employee?.name}: ${request.days} days (${request.startDate} to ${request.endDate})`,
      );
    }

    // Step 5: Approve one request
    if (createdRequests.length > 0) {
      console.log('\n✅ Approving first request...');
      await axios.post(`${BASE_URL}/timeoff/${createdRequests[0].id}/approve`);
      console.log(`  ✓ Approved request ${createdRequests[0].id}`);
    }

    // Step 6: Display summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Seed completed successfully!\n');
    console.log('Summary:');
    console.log(`  • Employees created: ${employees.length}`);
    console.log(`  • Time-off requests: ${createdRequests.length}`);
    console.log(`  • Approved requests: 1`);
    console.log('\n' + '='.repeat(50));
    console.log('\n📋 Sample Employee IDs:');
    employees.forEach((emp) => {
      console.log(`  • ${emp.name}: ${emp.id}`);
    });
    console.log('\n💡 You can now test the API with these employees!');
    console.log(`   Base URL: ${BASE_URL}`);
    console.log(`   HCM URL: ${HCM_URL}\n`);
  } catch (error: any) {
    console.error('\n❌ Seed failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Connection refused. Make sure the services are running:');
      console.error(`   1. Mock HCM Server: npm run mock-hcm (should be on ${HCM_URL})`);
      console.error(`   2. TimeOff Service: HCM_BASE_URL=${HCM_URL} npm run start:dev (should be on ${BASE_URL})`);
    }
    process.exit(1);
  }
}

// Run the seed
seed();
