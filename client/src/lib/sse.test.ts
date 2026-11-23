import { describe, expect, it } from 'vitest';
import { createSSEParser } from './sse';

function collect(chunks: string[]) {
  const result: string[] = [];
  const parser = createSSEParser((data) => result.push(data));
  chunks.forEach((c) => parser.feed(c));
  return result;
}

describe('createSSEParser', () => {
  it('解析完整事件', () => {
    expect(collect(['data: hello\n\ndata: world\n\n'])).toEqual(['hello', 'world']);
  });

  it('处理在任意位置被截断的分片', () => {
    expect(collect(['da', 'ta: {"a"', ':1}\n', '\ndata: x\n\n'])).toEqual(['{"a":1}', 'x']);
  });

  it('不完整的事件块暂不回调', () => {
    expect(collect(['data: pending\n'])).toEqual([]);
  });

  it('兼容 CRLF 换行', () => {
    expect(collect(['data: a\r\n\r\ndata: b\r\n\r\n'])).toEqual(['a', 'b']);
  });

  it('合并多行 data 并忽略注释与其他字段', () => {
    expect(collect([': ping\nevent: msg\ndata: line1\ndata: line2\n\n'])).toEqual(['line1\nline2']);
  });

  it('保留中文与多字节字符', () => {
    expect(collect(['data: 你好，世界 🚀\n\n'])).toEqual(['你好，世界 🚀']);
  });
});
