import { setTimeout as sleep } from 'node:timers/promises';
import type { ChatParams, StreamEvent } from './types.js';

const REASONING = `用户发来了一个问题，我先梳理一下要点：
1. 当前处于 Mock 演示模式，没有真实调用大模型；
2. 需要同时展示「思考过程」「Markdown」「代码高亮」「表格」等渲染能力；
3. 回答要简洁，并提示如何接入真实模型。`;

function buildAnswer(question: string) {
  return `> 当前为 **Mock 演示模式**（未配置 \`LLM_API_KEY\`），以下是模拟的流式回复。

你的问题是：「${question.slice(0, 100)}」

下面演示几种常见的渲染效果：

### 1. 代码高亮

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

### 2. 表格

| 能力 | 实现方式 |
| --- | --- |
| 流式输出 | SSE + ReadableStream |
| 中断生成 | AbortController |
| 状态管理 | Zustand + persist |
| 渲染优化 | requestAnimationFrame 批量合并 |

### 3. 接入真实模型

1. 复制 \`.env.example\` 为 \`.env\`
2. 填入 DeepSeek 的 API Key
3. 重启服务即可
`;
}

/** 无 API Key 时的模拟流，便于直接演示 */
export async function* mockStream(params: ChatParams, signal: AbortSignal): AsyncGenerator<StreamEvent> {
  const question = [...params.messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  if (params.model.includes('reasoner')) {
    for (const piece of chunkText(REASONING, 3)) {
      await sleep(20, undefined, { signal });
      yield { type: 'reasoning', content: piece };
    }
  }

  const answer = buildAnswer(question);
  for (const piece of chunkText(answer, 4)) {
    await sleep(15, undefined, { signal });
    yield { type: 'content', content: piece };
  }

  yield { type: 'usage', usage: { prompt: question.length, completion: answer.length } };
}

function* chunkText(text: string, size: number) {
  const chars = [...text];
  for (let i = 0; i < chars.length; i += size) {
    yield chars.slice(i, i + size).join('');
  }
}
