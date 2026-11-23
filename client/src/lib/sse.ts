/**
 * 增量 SSE 解析器：网络分片可能在任意位置截断，
 * 需要缓冲到完整的事件块（以空行分隔）后再回调。
 */
export function createSSEParser(onData: (data: string) => void) {
  let buffer = '';

  return {
    feed(text: string) {
      buffer = (buffer + text).replace(/\r\n/g, '\n');

      let index: number;
      while ((index = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);

        const data = block
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).replace(/^ /, ''))
          .join('\n');
        if (data) onData(data);
      }
    },
  };
}
