import express, { Express, Request, Response, NextFunction } from 'express';
import internalRouter from './routes/internal';
import mentionsRouter from './routes/mentions';
import statsRouter from './routes/stats';
import { initDb } from './db';

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.use('/internal', internalRouter);
  app.use('/internal', mentionsRouter);
  app.use('/internal', statsRouter);

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
}

export async function startServer(): Promise<void> {
  await initDb();
  const app = createApp();
  const { PORT } = require('./config');
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
