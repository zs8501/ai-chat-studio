import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { app } from './app.js';
import { config, rootDir } from './config.js';

// 本地 / Docker：由同一服务托管前端；Vercel 上静态资源走 public/
const clientDist = path.join(rootDir, 'client', 'dist');
if (!process.env.VERCEL && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
    console.log(config.mock ? '未配置 LLM_API_KEY，已启用 Mock 演示模式' : `已连接模型服务：${config.baseURL}`);
  });
}

export default app;
