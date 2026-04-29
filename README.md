# Time-Off Microservice

A robust NestJS-based microservice for managing employee time-off requests with seamless HCM (Human Capital Management) system integration.

## 🎯 Overview

This service manages the complete lifecycle of employee time-off requests while maintaining accurate balance synchronization with an external HCM system (the source of truth). It provides REST APIs for creating, approving, rejecting, and tracking leave requests with built-in safeguards against race conditions, duplicate submissions, and balance inconsistencies.

## ✨ Key Features

- **Complete Request Lifecycle**: Create, approve, reject, and cancel time-off requests
- **Dual-Layer Balance Validation**: Local cache + real-time HCM verification
- **Idempotency Support**: Prevent duplicate submissions with idempotency keys
- **State Machine**: Enforce valid state transitions (PENDING → APPROVED/REJECTED/CANCELLED)
- **Batch Synchronization**: Periodic reconciliation with HCM for balance updates
- **Optimistic Locking**: Handle concurrent operations safely
- **Rollback Mechanism**: Compensating transactions for partial failures
- **Comprehensive Testing**: 77 unit tests + 10 integration tests (77% coverage)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Create .env file with required configuration
cat > .env << EOF
PORT=3000
HCM_BASE_URL=http://localhost:4000
DB_PATH=:memory:
LOG_LEVEL=info
EOF
```

> **Important**: Create the `.env` file before starting any services. The configuration above sets up the service to work with the mock HCM server.

### Running with Mock HCM (Recommended for Testing)

For testing, start the mock HCM server first:

```bash
# Terminal 1: Start mock HCM server
npm run mock-hcm

# Terminal 2: Start the service (reads from .env)
npm run start:dev

# Terminal 3: Seed test data
npm run seed
```

## 📚 API Documentation

### Employee Management

#### Create Employee
```http
POST /employees
Content-Type: application/json

{
  "name": "Alice Johnson",
  "email": "alice@company.com",
  "role": "EMPLOYEE"
}
```

#### Get Employee
```http
GET /employees/:id
```

### Balance Management

#### Get Balance
```http
GET /balances/:employeeId/:locationId
```

**Response:**
```json
{
  "employeeId": "emp-123",
  "locationId": "loc1",
  "availableDays": 10,
  "usedDays": 2
}
```

### Time-Off Requests

#### Create Request
```http
POST /timeoff/request
Content-Type: application/json

{
  "employeeId": "emp-123",
  "locationId": "loc1",
  "startDate": "2026-05-01",
  "endDate": "2026-05-03",
  "days": 2,
  "idempotencyKey": "unique-key-123"
}
```

#### Approve Request
```http
POST /timeoff/:requestId/approve
```

#### Reject Request
```http
POST /timeoff/:requestId/reject
```

#### Cancel Request
```http
POST /timeoff/:requestId/cancel
```

#### Get Employee Requests
```http
GET /timeoff/employee/:employeeId
```

### Synchronization

#### Trigger Batch Sync
```http
POST /sync/trigger
```

**Response:**
```json
{
  "synced": 5,
  "failed": 0
}
```

## 🧪 Testing

### Run All Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Test Results

- **Total Tests**: 87 (77 unit + 10 integration)
- **Coverage**: 77.14% overall
- **Test Suites**: 13 passed
- **Execution Time**: ~3-5 seconds

### Test Coverage by Module

| Module | Coverage | Tests |
|--------|----------|-------|
| Balance | 84.28% | 15 |
| Employee | 83.05% | 12 |
| TimeOff | 87.06% | 23 |
| Sync | 76.74% | 7 |
| HCM Client | 77.77% | 10 |

## 🔧 Configuration

### Environment Variables

```bash
# Application
PORT=3000                              
NODE_ENV=development                        

# Database
DB_PATH=./timeoff.db                       

# HCM Integration
HCM_BASE_URL=http://localhost:4000      

# Logging
LOG_LEVEL=info                          
```

### Example `.env` file

```env
PORT=3000
HCM_BASE_URL=http://localhost:4000
DB_PATH=:memory:
LOG_LEVEL=info
```

## 📁 Project Structure

```
timeoff-service/
├── src/
│   ├── balance/              # Balance management module
│   │   ├── __tests__/        # Unit tests
│   │   ├── dto/              # Data transfer objects
│   │   ├── balance.controller.ts
│   │   ├── balance.service.ts
│   │   ├── balance.repository.ts
│   │   └── balance.entity.ts
│   ├── employee/             # Employee management module
│   ├── timeoff/              # Time-off request module
│   ├── sync/                 # Synchronization module
│   ├── hcm-client/           # HCM integration module
│   ├── database/             # Database configuration
│   └── main.ts               # Application entry point
├── test/
│   ├── integration/          # Integration tests
│   └── mock-hcm/             # Mock HCM server
├── scripts/
│   ├── seed.ts               # Database seeding script
│   └── reset.ts              # Reset script
├── libs/                     # Shared libraries
│   ├── entities/            
│   ├── enums.ts              
│   └── interfaces.ts         
├── TRD.md                    # Technical Requirements Document
├── TEST-COVERAGE-REPORT.md   # Test coverage report
├── TESTING.md                # Testing guide
└── package.json
```

## 🔄 Data Flow

### Approval Workflow

```
1. Client submits time-off request
   ↓
2. Service validates employee exists
   ↓
3. Request created in PENDING status
   ↓
4. Manager triggers approval
   ↓
5. Check local balance (fast, defensive)
   ↓
6. Validate with HCM (source of truth)
   ↓
7. Deduct from HCM
   ↓
8. Update local balance
   ↓
9. Mark request as APPROVED
   ↓
10. Return success response
```

### Synchronization Flow

```
1. Trigger batch sync (manual or scheduled)
   ↓
2. Fetch all balances from HCM
   ↓
3. For each balance:
   - Upsert into local database
   - Update sync timestamp
   ↓
4. Log sync results
   ↓
5. Return summary (synced/failed counts)
```

## 🛡️ Error Handling

### Idempotency

All write operations support idempotency keys to prevent duplicate submissions:

```javascript
// First request
POST /timeoff/request
{ ..., "idempotencyKey": "key-123" }
// Response: 201 Created, requestId: "req-456"

// Duplicate request (same key)
POST /timeoff/request
{ ..., "idempotencyKey": "key-123" }
// Response: 201 Created, requestId: "req-456" (same ID)
```

### Rollback Mechanism

If HCM deduction succeeds but local update fails:

1. Service catches the error
2. Calls HCM rollback API to restore balance
3. Logs the incident
4. Returns 500 error to client

### State Machine

Requests follow strict state transitions:

```
PENDING → APPROVED ✓
PENDING → REJECTED ✓
PENDING → CANCELLED ✓
APPROVED → REJECTED ✗ (409 Conflict)
APPROVED → CANCELLED ✗ (409 Conflict)
```

## 🎯 Key Design Decisions

### 1. Dual-Check Strategy
- **Local check first**: Fast rejection for obvious failures
- **HCM validation**: Source of truth before final approval
- **Rationale**: Defensive against HCM unreliability

### 2. Optimistic Locking
- Version field on balance records
- Detects concurrent updates
- Automatic retry on conflicts

### 3. Batch Sync
- Full table overwrite (HCM always wins)
- Handles any drift or discrepancies
- Simple and reliable

### 4. SQLite Database
- Lightweight and zero-config
- ACID transactions
- Sufficient for moderate scale
- Easy local development

## 📖 Documentation

- **[TRD.md](./TRD.md)** - Technical Requirements Document
- **[TEST-COVERAGE-REPORT.md](./TEST-COVERAGE-REPORT.md)** - Detailed test coverage

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Testing with [Jest](https://jestjs.io/)
- Database: [SQLite](https://www.sqlite.org/)

---

**Version**: 0.1.0  
**Last Updated**: April 29, 2026
