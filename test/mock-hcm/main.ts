import { startMockHcmServer } from './server';

const port = Number(process.env.PORT) || 4000;
startMockHcmServer(port);
