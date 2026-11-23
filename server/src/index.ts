import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { chatRouter } from './chat.js';
import { config, rootDir } from './config.js';

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mock: config.mock, models: config.models });
});
app.use('/api', chatRouter);

// 生产环境由同一服务托管前端构建产物
const clientDist = path.join(rootDir, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
  console.log(config.mock ? '未配置 LLM_API_KEY，已启用 Mock 演示模式' : `已连接模型服务：${config.baseURL}`);
});
