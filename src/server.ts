import { startServer } from './app';

startServer().catch((err: Error) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
