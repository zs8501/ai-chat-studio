import { config } from './config.js';
import { readSSE } from './sse.js';
import type { ChatParams, StreamEvent } from './types.js';

interface ChatCompletionChunk {
  choices?: { delta?: { content?: string | null; reasoning_content?: string | null } }[];
  usage?: { prompt_tokens: number; completion_tokens: number } | null;
}

/** 调用 OpenAI 兼容接口（DeepSeek / 通义千问 / OpenAI 等），并转换为统一事件流 */
export async function* llmStream(params: ChatParams, signal: AbortSignal): AsyncGenerator<StreamEvent> {
  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      stream: true,
      stream_options: { include_usage: true },
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(`模型接口返回错误 ${response.status}：${text.slice(0, 300)}`);
  }

  for await (const data of readSSE(response.body)) {
    if (data === '[DONE]') return;

    const chunk = JSON.parse(data) as ChatCompletionChunk;
    const delta = chunk.choices?.[0]?.delta;
    if (delta?.reasoning_content) yield { type: 'reasoning', content: delta.reasoning_content };
    if (delta?.content) yield { type: 'content', content: delta.content };
    if (chunk.usage) {
      yield {
        type: 'usage',
        usage: { prompt: chunk.usage.prompt_tokens, completion: chunk.usage.completion_tokens },
      };
    }
  }
}
