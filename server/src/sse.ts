/** 把上游 SSE 字节流解析为逐条的 data 字符串 */
export async function* readSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of body) {
    buffer = (buffer + decoder.decode(chunk, { stream: true })).replace(/\r\n/g, '\n');

    let index: number;
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
