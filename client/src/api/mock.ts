import type { StreamEvent } from '../types';
import type { ChatRequest } from './chat';

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

function* chunkText(text: string, size: number) {
  const chars = [...text];
  for (let i = 0; i < chars.length; i += size) yield chars.slice(i, i + size).join('');
}

/** 纯前端 Mock：静态部署（如 Vercel 未挂 API）时也能完整演示 */
export async function mockStreamChat(
  body: ChatRequest,
  { signal, onEvent }: { signal: AbortSignal; onEvent: (event: StreamEvent) => void },
) {
  const question = [...body.messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  if (body.model.includes('reasoner')) {
    const reasoning = '当前为前端 Mock 演示模式。先梳理问题要点，再给出结构化回答。';
    for (const piece of chunkText(reasoning, 3)) {
      await sleep(12, signal);
      onEvent({ type: 'reasoning', content: piece });
    }
  }

  const answer = `> 当前为 **前端 Mock 演示模式**（静态部署，未连接后端 API）。

你的问题是：「${question.slice(0, 100)}」

### 本项目技术亮点

\`\`\`ts
async function* streamChat(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) return;
    yield value;
  }
}
\`\`\`

| 能力 | 实现方式 |
| --- | --- |
| 流式输出 | SSE + ReadableStream |
| 中断生成 | AbortController |
| 状态管理 | Zustand + persist |
| 渲染优化 | requestAnimationFrame 批量合并 |

源码：https://github.com/zs8501/ai-chat-studio
`;

  for (const piece of chunkText(answer, 4)) {
    await sleep(10, signal);
    onEvent({ type: 'content', content: piece });
  }

  onEvent({ type: 'usage', usage: { prompt: question.length, completion: answer.length } });
  onEvent({ type: 'done' });
}
