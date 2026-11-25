export const config = {
  runtime: 'nodejs',
  maxDuration: 300,
};

const models = () =>
  String(process.env.LLM_MODELS || 'deepseek-chat,deepseek-reasoner')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const apiKey = () => String(process.env.LLM_API_KEY || '').trim();
const baseURL = () => String(process.env.LLM_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');

function sseEncode(event) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function* chunkText(text, size) {
  const chars = [...text];
  for (let i = 0; i < chars.length; i += size) yield chars.slice(i, i + size).join('');
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
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

async function mockEvents(model, question, signal) {
  const events = [];
  if (String(model).includes('reasoner')) {
    const reasoning = '先梳理问题要点，再给出结构化回答。';
    for (const piece of chunkText(reasoning, 3)) {
      await sleep(8, signal);
      events.push({ type: 'reasoning', content: piece });
    }
  }

  const answer = `你的问题是：「${String(question).slice(0, 100)}」

这是 Mock 回退（未读取到 LLM_API_KEY）。请确认 Vercel 环境变量已配置并重新部署。`;
  for (const piece of chunkText(answer, 4)) {
    await sleep(8, signal);
    events.push({ type: 'content', content: piece });
  }
  events.push({ type: 'usage', usage: { prompt: String(question).length, completion: answer.length } });
  events.push({ type: 'done' });
  return events;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const model = body.model;
  const messages = body.messages;
  const temperature = body.temperature;

  if (!model || !models().includes(model)) {
    return Response.json({ error: '不支持的模型' }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'messages 不能为空' }, { status: 400 });
  }

  const question = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const encoder = new TextEncoder();
  const key = apiKey();

  const stream = new ReadableStream({
    async start(controller) {
      const signal = request.signal;
      const push = (event) => controller.enqueue(encoder.encode(sseEncode(event)));

      try {
        if (!key) {
          for (const event of await mockEvents(model, question, signal)) push(event);
          controller.close();
          return;
        }

        const response = await fetch(`${baseURL()}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            stream: true,
            stream_options: { include_usage: true },
          }),
          signal,
        });

        if (!response.ok || !response.body) {
          const text = await response.text().catch(() => '');
          push({ type: 'error', message: `模型接口返回错误 ${response.status}：${text.slice(0, 300)}` });
          controller.close();
          return;
        }

        for await (const data of readSSE(response.body)) {
          if (data === '[DONE]') break;
          const chunk = JSON.parse(data);
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.reasoning_content) push({ type: 'reasoning', content: delta.reasoning_content });
          if (delta?.content) push({ type: 'content', content: delta.content });
          if (chunk.usage) {
            push({
              type: 'usage',
              usage: { prompt: chunk.usage.prompt_tokens, completion: chunk.usage.completion_tokens },
            });
          }
        }
        push({ type: 'done' });
        controller.close();
      } catch (err) {
        if (!signal.aborted) {
          push({ type: 'error', message: err instanceof Error ? err.message : '未知错误' });
        }
        try {
          controller.close();
        } catch {
          // ignore
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
