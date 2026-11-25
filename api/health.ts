import type { VercelRequest, VercelResponse } from '@vercel/node';

const models = (process.env.LLM_MODELS ?? 'deepseek-chat,deepseek-reasoner')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    mock: !process.env.LLM_API_KEY?.trim(),
    models,
  });
}
