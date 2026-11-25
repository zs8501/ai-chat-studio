import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { app } from './app.js';
import { config, rootDir } from './config.js';

// ?? / Docker???????????Vercel ?????? public/
const clientDist = path.join(rootDir, 'client', 'dist');
if (!process.env.VERCEL && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
    console.log(config.mock ? '??? LLM_API_KEY???? Mock ????' : `????????${config.baseURL}`);
  });
}
