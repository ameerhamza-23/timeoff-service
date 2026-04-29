import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import axios from 'axios';
import { AppModule } from '../../src/app.module';

const HCM_URL = 'http://localhost:4000';

const seedHcm = (
  entries: { employeeId: string; locationId: string; availableDays: number }[],
) => axios.post(`${HCM_URL}/hcm/seed`, entries);

const resetHcm = () => axios.post(`${HCM_URL}/hcm/reset`);

const setUnreliable = (enabled: boolean) =>
  axios.post(`${HCM_URL}/hcm/unreliable`, { enabled });

describe('TimeOff Integration Tests', () => {
  let app: INestApplication;
  let employeeId: string;
  let managerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );

    process.env.DB_PATH = ':memory:';
    process.env.HCM_BASE_URL = HCM_URL;

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetHcm();

    // Create employee and manager for each test
    const empRes = await request(app.getHttpServer())
      .post('/employees')
      .send({ name: 'Alice', email: `alice+${Date.now()}@test.com`, role: 'EMPLOYEE' });
    employeeId = empRes.body.id;

    const mgrRes = await request(app.getHttpServer())
      .post('/employees')
      .send({ name: 'Bob', email: `bob+${Date.now()}@test.com`, role: 'MANAGER' });
    managerId = mgrRes.body.id;

    await seedHcm([{ employeeId, locationId: 'loc1', availableDays: 10 }]);
  });

  describe('Full approval lifecycle', () => {
    it('creates → approves → balance decremented', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/timeoff/request')
        .send({
          employeeId,
          locationId: 'loc1',
          startDate: '2026-05-01',
          endDate: '2026-05-03',
          days: 2,
          idempotencyKey: `key-${Date.now()}`,
        });

      expect(createRes.status).toBe(201);
      const requestId = createRes.body.id;
      expect(createRes.body.status).toBe('PENDING');

      // Seed local balance
      await request(app.getHttpServer()).post('/sync/trigger');

      const approveRes = await request(app.getHttpServer()).post(
        `/timeoff/${requestId}/approve`,
      );

      expect(approveRes.status).toBe(201);
      expect(approveRes.body.status).toBe('APPROVED');

      const balanceRes = await request(app.getHttpServer()).get(
        `/balances/${employeeId}/loc1`,
      );
      expect(balanceRes.body.availableDays).toBe(8);
    });
  });

  describe('Idempotency', () => {
    it('returns the same request on duplicate idempotency key', async () => {
      const payload = {
        employeeId,
        locationId: 'loc1',
        startDate: '2026-05-01',
        endDate: '2026-05-02',
        days: 1,
        idempotencyKey: 'fixed-key-123',
      };

      const first = await request(app.getHttpServer())
        .post('/timeoff/request')
        .send(payload);

      const second = await request(app.getHttpServer())
        .post('/timeoff/request')
        .send(payload);

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(first.body.id).toBe(second.body.id);
    });
  });

  describe('Insufficient balance', () => {
    it('rejects approval when local balance is insufficient', async () => {
      await seedHcm([{ employeeId, locationId: 'loc1', availableDays: 1 }]);
      await request(app.getHttpServer()).post('/sync/trigger');

      const createRes = await request(app.getHttpServer())
        .post('/timeoff/request')
        .send({
          employeeId,
          locationId: 'loc1',
          startDate: '2026-05-01',
          endDate: '2026-05-05',
          days: 5,
          idempotencyKey: `key-${Date.now()}`,
        });

      const approveRes = await request(app.getHttpServer()).post(
        `/timeoff/${createRes.body.id}/approve`,
      );

      expect(approveRes.status).toBe(400);
    });
  });

  describe('HCM unreliable mode', () => {
    it('local guard catches insufficient balance even when HCM silently succeeds', async () => {
      // Seed low balance
      await seedHcm([{ employeeId, locationId: 'loc1', availableDays: 1 }]);
      await request(app.getHttpServer()).post('/sync/trigger');

      // Enable HCM unreliable mode
      await setUnreliable(true);

      const createRes = await request(app.getHttpServer())
        .post('/timeoff/request')
        .send({
          employeeId,
          locationId: 'loc1',
          startDate: '2026-05-01',
          endDate: '2026-05-05',
          days: 5,
          idempotencyKey: `key-${Date.now()}`,
        });

      const approveRes = await request(app.getHttpServer()).post(
        `/timeoff/${createRes.body.id}/approve`,
      );
      expect(approveRes.status).toBe(400);
    });
  });

  describe('Batch sync', () => {
    it('overwrites local balance with HCM data', async () => {
      // First sync — 10 days
      await request(app.getHttpServer()).post('/sync/trigger');

      const before = await request(app.getHttpServer()).get(
        `/balances/${employeeId}/loc1`,
      );
      expect(before.body.availableDays).toBe(10);

      // HCM gives employee a work anniversary bonus
      await seedHcm([{ employeeId, locationId: 'loc1', availableDays: 15 }]);
      await request(app.getHttpServer()).post('/sync/trigger');

      const after = await request(app.getHttpServer()).get(
        `/balances/${employeeId}/loc1`,
      );
      expect(after.body.availableDays).toBe(15);
    });

    it('work anniversary: request succeeds after balance refresh', async () => {
      // Initial balance: 1 day
      await seedHcm([{ employeeId, locationId: 'loc1', availableDays: 1 }]);
      await request(app.getHttpServer()).post('/sync/trigger');

      // HCM anniversary bonus: now 10 days
      await seedHcm([{ employeeId, locationId: 'loc1', availableDays: 10 }]);
      await request(app.getHttpServer()).post('/sync/trigger');

      const createRes = await request(app.getHttpServer())
        .post('/timeoff/request')
        .send({
          employeeId,
          locationId: 'loc1',
          startDate: '2026-05-01',
          endDate: '2026-05-05',
          days: 5,
          idempotencyKey: `key-${Date.now()}`,
        });

      const approveRes = await request(app.getHttpServer()).post(
        `/timeoff/${createRes.body.id}/approve`,
      );

      expect(approveRes.status).toBe(201);
      expect(approveRes.body.status).toBe('APPROVED');
    });
  });

  describe('State machine', () => {
    it('cannot approve an already approved request', async () => {
      await request(app.getHttpServer()).post('/sync/trigger');

      const createRes = await request(app.getHttpServer())
        .post('/timeoff/request')
        .send({
          employeeId,
          locationId: 'loc1',
          startDate: '2026-05-01',
          endDate: '2026-05-02',
          days: 1,
          idempotencyKey: `key-${Date.now()}`,
        });

      await request(app.getHttpServer()).post(
        `/timeoff/${createRes.body.id}/approve`,
      );

      const secondApprove = await request(app.getHttpServer()).post(
        `/timeoff/${createRes.body.id}/approve`,
      );

      expect(secondApprove.status).toBe(409);
    });

    it('cannot reject an already approved request', async () => {
      await request(app.getHttpServer()).post('/sync/trigger');

      const createRes = await request(app.getHttpServer())
        .post('/timeoff/request')
        .send({
          employeeId,
          locationId: 'loc1',
          startDate: '2026-05-01',
          endDate: '2026-05-02',
          days: 1,
          idempotencyKey: `key-${Date.now()}`,
        });

      await request(app.getHttpServer()).post(
        `/timeoff/${createRes.body.id}/approve`,
      );

      const rejectRes = await request(app.getHttpServer()).post(
        `/timeoff/${createRes.body.id}/reject`,
      );

      expect(rejectRes.status).toBe(409);
    });

    it('can cancel a pending request', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/timeoff/request')
        .send({
          employeeId,
          locationId: 'loc1',
          startDate: '2026-05-01',
          endDate: '2026-05-02',
          days: 1,
          idempotencyKey: `key-${Date.now()}`,
        });

      const cancelRes = await request(app.getHttpServer()).post(
        `/timeoff/${createRes.body.id}/cancel`,
      );

      expect(cancelRes.status).toBe(201);
      expect(cancelRes.body.status).toBe('CANCELLED');
    });
  });

  describe('Concurrent approvals', () => {
    it('only one of two concurrent approvals succeeds', async () => {
      await request(app.getHttpServer()).post('/sync/trigger');

      // Create two separate requests for same employee+location
      const [r1, r2] = await Promise.all([
        request(app.getHttpServer())
          .post('/timeoff/request')
          .send({
            employeeId,
            locationId: 'loc1',
            startDate: '2026-05-01',
            endDate: '2026-05-06',
            days: 6,
            idempotencyKey: `key-a-${Date.now()}`,
          }),
        request(app.getHttpServer())
          .post('/timeoff/request')
          .send({
            employeeId,
            locationId: 'loc1',
            startDate: '2026-05-07',
            endDate: '2026-05-12',
            days: 6,
            idempotencyKey: `key-b-${Date.now()}`,
          }),
      ]);

      // Try to approve both concurrently — only one should succeed
      const [a1, a2] = await Promise.all([
        request(app.getHttpServer()).post(`/timeoff/${r1.body.id}/approve`),
        request(app.getHttpServer()).post(`/timeoff/${r2.body.id}/approve`),
      ]);

      const statuses = [a1.status, a2.status];
      expect(statuses).toContain(201);
      expect(statuses).toContain(400);
    });
  });
});
