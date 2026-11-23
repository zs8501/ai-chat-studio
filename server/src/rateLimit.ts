import type { RequestHandler } from 'express';

/** 简易内存限流：每个 IP 在时间窗口内最多 limit 次请求 */
export function rateLimit({ windowMs, limit }: { windowMs: number; limit: number }): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req, res, next) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= limit) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    }

    entry.count++;
    next();
  };
}
