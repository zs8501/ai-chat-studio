import { Router } from 'express';
import { config } from './config.js';
import { llmStream } from './llm.js';
import { mockStream } from './mock.js';
import { rateLimit } from './rateLimit.js';
import type { ChatMessage, ChatParams, StreamEvent } from './types.js';

const ROLES = new Set(['system', 'user', 'assistant']);
const MAX_TOTAL_CHARS = 60_000;

function parseParams(body: unknown): ChatParams | string {
  const { model, messages, temperature } = (body ?? {}) as Record<string, unknown>;

  if (typeof model !== 'string' || !config.models.includes(model)) return '不支持的模型';
  if (!Array.isArray(messages) || messages.length === 0) return 'messages 不能为空';

  const valid = messages.every(
    (m): m is ChatMessage => !!m && ROLES.has(m.role) && typeof m.content === 'string',
  );
  if (!valid) return 'messages 格式错误';

  const total = messages.reduce((sum: number, m: ChatMessage) => sum + m.content.length, 0);
  if (total > MAX_TOTAL_CHARS) return '上下文过长，请新建会话';

  if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 2)) {
    return 'temperature 取值范围为 0 ~ 2';
  }

  return { model, messages, temperature };
}

export const chatRouter = Router();

chatRouter.post('/chat', rateLimit({ windowMs: 60_000, limit: 20 }), async (req, res) => {
  const params = parseParams(req.body);
  if (typeof params === 'string') {
    res.status(400).json({ error: params });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const controller = new AbortController();
  res.on('close', () => controller.abort());

  const send = (event: StreamEvent) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  try {
    const source = config.mock ? mockStream(params, controller.signal) : llmStream(params, controller.signal);
    for await (const event of source) send(event);
    send({ type: 'done' });
  } catch (err) {
    if (!controller.signal.aborted) {
      console.error('[chat]', err);
      send({ type: 'error', message: err instanceof Error ? err.message : '未知错误' });
    }
  } finally {
    res.end();
  }
});
