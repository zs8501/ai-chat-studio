import cors from 'cors';
import express from 'express';
import { chatRouter } from './chat.js';
import { config } from './config.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, mock: config.mock, models: config.models });
  });
  app.use('/api', chatRouter);

  return app;
}

export const app = createApp();
