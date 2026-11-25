const { setTimeout: sleep } = require('node:timers/promises');

const models = () =>
  String(process.env.LLM_MODELS || 'deepseek-chat,deepseek-reasoner')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const apiKey = () => String(process.env.LLM_API_KEY || '').trim();
const baseURL = () => String(process.env.LLM_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');

function send(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function* chunkText(text, size) {
  const chars = [...text];
  for (let i = 0; i < chars.length; i += size) yield chars.slice(i, i + size).join('');
}

async function mockStream(res, model, question, signal) {
  if (String(model).includes('reasoner')) {
    const reasoning = '当前为 Mock 演示模式。先梳理问题要点，再给出结构化回答。';
    for (const piece of chunkText(reasoning, 3)) {
      await sleep(12, undefined, { signal });
      send(res, { type: 'reasoning', content: piece });
    }
  }

  const answer = `> 当前为 **Mock 演示模式**（未配置 \`LLM_API_KEY\`）。

你的问题是：「${String(question).slice(0, 100)}」

### 演示内容

\`\`\`ts
const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify(payload) });
\`\`\`

| 能力 | 实现 |
| --- | --- |
| 流式输出 | SSE |
| 中断生成 | AbortController |
| 部署 | Vercel Serverless |

在 Vercel 项目 Settings → Environment Variables 中填写 \`LLM_API_KEY\` 后重新部署，即可接入真实模型。`;

  for (const piece of chunkText(answer, 4)) {
    await sleep(10, undefined, { signal });
    send(res, { type: 'content', content: piece });
  }
  send(res, { type: 'usage', usage: { prompt: String(question).length, completion: answer.length } });
}

async function* readSSE(body) {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of body) {
    buffer = (buffer + decoder.decode(chunk, { stream: true })).replace(/\r\n/g, '\n');
    let index;
    while ((index = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const data = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).replace(/^ /, ''))
        .join('\n');
      if (data) yield data;
    }
  }
}

async function llmStream(res, params, signal) {
  const response = await fetch(`${baseURL()}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey()}`,
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
    const chunk = JSON.parse(data);
    const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
    if (delta && delta.reasoning_content) send(res, { type: 'reasoning', content: delta.reasoning_content });
    if (delta && delta.content) send(res, { type: 'content', content: delta.content });
    if (chunk.usage) {
      send(res, {
        type: 'usage',
        usage: { prompt: chunk.usage.prompt_tokens, completion: chunk.usage.completion_tokens },
      });
    }
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const model = body.model;
  const messages = body.messages;
  const temperature = body.temperature;

  if (!model || !models().includes(model)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: '不支持的模型' }));
    return;
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'messages 不能为空' }));
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

  const question = [...messages].reverse().find((m) => m.role === 'user');
  const q = (question && question.content) || '';

  try {
    if (!apiKey()) {
      await mockStream(res, model, q, controller.signal);
    } else {
      await llmStream(res, { model, messages, temperature }, controller.signal);
    }
    send(res, { type: 'done' });
  } catch (err) {
    if (!controller.signal.aborted) {
      send(res, { type: 'error', message: err instanceof Error ? err.message : '未知错误' });
    }
  } finally {
    res.end();
  }
};

module.exports.config = { maxDuration: 300 };
