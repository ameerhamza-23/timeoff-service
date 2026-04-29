import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());

// In-memory store: key = `${employeeId}:${locationId}`
const balances = new Map<string, number>();

let unreliableMode = false;

const key = (employeeId: string, locationId: string) =>
  `${employeeId}:${locationId}`;

app.post('/hcm/seed', (req: Request, res: Response) => {
  const entries: { employeeId: string; locationId: string; availableDays: number }[] =
    req.body;
  for (const entry of entries) {
    balances.set(key(entry.employeeId, entry.locationId), entry.availableDays);
  }
  res.json({ seeded: entries.length });
});

// Reset all state
app.post('/hcm/reset', (_req: Request, res: Response) => {
  balances.clear();
  unreliableMode = false;
  res.json({ ok: true });
});

app.post('/hcm/unreliable', (req: Request, res: Response) => {
  unreliableMode = req.body.enabled ?? true;
  res.json({ unreliableMode });
});

app.get(
  '/hcm/balance/:employeeId/:locationId',
  (req: Request, res: Response) => {
    const employeeId = req.params.employeeId as string;
    const locationId = req.params.locationId as string;
    const availableDays = balances.get(key(employeeId, locationId));

    if (availableDays === undefined) {
      res.status(404).json({ error: 'Balance not found' });
      return;
    }

    res.json({ employeeId, locationId, availableDays });
  },
);

app.post('/hcm/deduct', (req: Request, res: Response) => {
  const { employeeId, locationId, days } = req.body as {
    employeeId: string;
    locationId: string;
    days: number;
  };

  const balanceKey = key(employeeId, locationId);
  const current = balances.get(balanceKey);

  if (current === undefined) {
    res.status(404).json({ success: false, error: 'Employee/location not found in HCM' });
    return;
  }

  if (current < days) {
    if (unreliableMode) {
      // Simulate HCM silently succeeding even on insufficient balance
      res.json({ success: true, remainingDays: current });
      return;
    }
    res.json({ success: false, error: 'Insufficient balance' });
    return;
  }

  balances.set(balanceKey, current - days);
  res.json({ success: true, remainingDays: current - days });
});

app.post('/hcm/rollback', (req: Request, res: Response) => {
  const { employeeId, locationId, days } = req.body as {
    employeeId: string;
    locationId: string;
    days: number;
  };

  const balanceKey = key(employeeId, locationId);
  const current = balances.get(balanceKey);

  if (current === undefined) {
    res.status(404).json({ error: 'Balance not found' });
    return;
  }

  balances.set(balanceKey, current + days);
  res.json({ ok: true, availableDays: current + days });
});

// Full batch snapshot
app.get('/hcm/balances', (_req: Request, res: Response) => {
  const entries = Array.from(balances.entries()).map(([k, availableDays]) => {
    const [employeeId, locationId] = k.split(':');
    return { employeeId, locationId, availableDays };
  });
  res.json(entries);
});

export { app };

export const startMockHcmServer = (port = 4000) => {
  return app.listen(port, () => {
    console.log(`Mock HCM server running on port ${port}`);
  });
};
