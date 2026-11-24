import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'client', 'dist');
const dest = path.join(root, 'public');

if (!fs.existsSync(src)) {
  console.error('client/dist 不存在，请先构建前端');
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log('已复制 client/dist → public');
