import { createSSEParser } from '../lib/sse';
import type { Role, StreamEvent } from '../types';

export interface ChatRequest {
  model: string;
  messages: { role: Role; content: string }[];
  temperature?: number;
}

export interface ServerInfo {
  mock: boolean;
  models: string[];
}

export async function fetchServerInfo(): Promise<ServerInfo> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('服务不可用');
  return res.json();
}

export async function streamChat(
  body: ChatRequest,
  { signal, onEvent }: { signal: AbortSignal; onEvent: (event: StreamEvent) => void },
) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    let message = `请求失败（${res.status}）`;
    try {
      message = (await res.json()).error ?? message;
    } catch {
      // 非 JSON 响应，保留默认提示
    }
    throw new Error(message);
  }

  const parser = createSSEParser((data) => onEvent(JSON.parse(data) as StreamEvent));
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.feed(value);
  }
}
