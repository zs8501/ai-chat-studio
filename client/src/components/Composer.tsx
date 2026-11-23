import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useChatStore } from '../store/chat';

export function Composer() {
  const isStreaming = useChatStore((s) => s.isStreaming);
  const activeId = useChatStore((s) => s.activeId);
  const { send, stop } = useChatStore.getState();
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  useEffect(() => {
    ref.current?.focus();
  }, [activeId]);

  const submit = () => {
    if (!text.trim() || isStreaming) return;
    send(text);
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // 中文输入法选词时按 Enter 不应触发发送
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="composer">
      <div className="composer-box">
        <textarea
          ref={ref}
          rows={1}
          value={text}
          placeholder="输入消息，Enter 发送，Shift + Enter 换行"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {isStreaming ? (
          <button className="btn btn-stop" onClick={stop}>
            ■ 停止
          </button>
        ) : (
          <button className="btn btn-primary" disabled={!text.trim()} onClick={submit}>
            发送
          </button>
        )}
      </div>
      <p className="composer-tip">AI 生成内容仅供参考，请注意甄别</p>
    </div>
  );
}
