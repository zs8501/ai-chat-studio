import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

try {
  process.loadEnvFile(path.join(rootDir, '.env'));
} catch {
  // .env 不存在时使用系统环境变量
}

const apiKey = process.env.LLM_API_KEY?.trim() ?? '';

export const config = {
  port: Number(process.env.PORT ?? 3001),
  apiKey,
  baseURL: (process.env.LLM_BASE_URL ?? 'https://api.deepseek.com').replace(/\/+$/, ''),
  models: (process.env.LLM_MODELS ?? 'deepseek-chat,deepseek-reasoner')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  mock: !apiKey,
};
