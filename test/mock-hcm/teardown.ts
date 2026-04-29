export default function globalTeardown() {
  // kill whatever is running on port 4000
  const { execSync } = require('child_process');

  try {
    execSync('lsof -ti:4000 | xargs kill -9');
  } catch (e) {}
}