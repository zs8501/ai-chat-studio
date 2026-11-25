import { createSSEParser } from '../lib/sse';
import type { Role, StreamEvent } from '../types';
import { mockStreamChat } from './mock';

export interface ChatRequest {
  model: string;
  messages: { role: Role; content: string }[];
  temperature?: number;
}

export interface ServerInfo {
  mock: boolean;
  models: string[];
}

const FALLBACK_INFO: ServerInfo = {
  mock: true,
  models: ['deepseek-chat', 'deepseek-reasoner'],
};

function shouldUseMock(res: Response) {
  if (!res.ok || !res.body) return true;
  const ct = res.headers.get('content-type') || '';
  // 静态站常把 /api/* 重写成 index.html
  if (ct.includes('text/html')) return true;
  return false;
}

export async function fetchServerInfo(): Promise<ServerInfo> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(4000) });
    if (shouldUseMock(res)) return FALLBACK_INFO;
    return res.json();
  } catch {
    return FALLBACK_INFO;
  }
}

export async function streamChat(
  body: ChatRequest,
  { signal, onEvent }: { signal: AbortSignal; onEvent: (event: StreamEvent) => void },
) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (shouldUseMock(res)) {
      await mockStreamChat(body, { signal, onEvent });
      return;
    }

    const parser = createSSEParser((data) => {
      try {
        onEvent(JSON.parse(data) as StreamEvent);
      } catch {
        // 非 JSON 分片（例如误返回的 HTML）直接忽略，交由外层兜底
        throw new Error('INVALID_SSE');
      }
    });
    const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.feed(value);
    }
  } catch (err) {
    if (signal.aborted) throw err;
    await mockStreamChat(body, { signal, onEvent });
  }
}
