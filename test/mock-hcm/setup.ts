import { startMockHcmServer } from './server';

export default async function globalSetup() {
  startMockHcmServer(4000);

  await new Promise((r) => setTimeout(r, 100));
}