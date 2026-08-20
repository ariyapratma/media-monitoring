import express, { Express, Request, Response } from 'express';
import internalRouter from './routes/internal';
import mentionsRouter from './routes/mentions';
import statsRouter from './routes/stats';
import { initDb } from './db';
import { PORT } from './config';

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.use('/internal', internalRouter);
  app.use('/', mentionsRouter);
  app.use('/', statsRouter);

  app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
}

export async function startServer(): Promise<void> {
  await initDb();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
