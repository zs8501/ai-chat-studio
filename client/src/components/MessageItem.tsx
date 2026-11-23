import { memo, useState } from 'react';
import { copyText } from '../lib/utils';
import { useChatStore } from '../store/chat';
import type { Message } from '../types';
import { Markdown } from './Markdown';

interface Props {
  message: Message;
  canRegenerate: boolean;
}

/** memo：流式输出时只有正在生成的那条消息会重新渲染 */
export const MessageItem = memo(function MessageItem({ message, canRegenerate }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const streaming = message.status === 'streaming';
  const thinking = streaming && !message.content;

  const handleCopy = async () => {
    await copyText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`message ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="avatar">{isUser ? '我' : 'AI'}</div>
      <div className="message-body">
        {message.reasoning && (
          <details className="reasoning" open={thinking}>
            <summary>{thinking ? '思考中…' : '已深度思考'}</summary>
            <div className="reasoning-content">{message.reasoning}</div>
          </details>
        )}

        <div className="bubble">
          {isUser ? (
            <div className="plain-text">{message.content}</div>
          ) : message.content ? (
            <Markdown content={message.content} />
          ) : (
            thinking && !message.reasoning && <span className="typing"><i /><i /><i /></span>
          )}
          {streaming && message.content && <span className="cursor" />}
        </div>

        {message.status === 'error' && <div className="message-error">⚠️ {message.error}</div>}
        {message.status === 'stopped' && <div className="message-hint">已停止生成</div>}

        {!isUser && !streaming && (
          <div className="message-actions">
            {message.content && (
              <button className="text-btn" onClick={handleCopy}>
                {copied ? '已复制' : '复制'}
              </button>
            )}
            {canRegenerate && (
              <button className="text-btn" onClick={() => useChatStore.getState().regenerate()}>
                重新生成
              </button>
            )}
            {message.usage && (
              <span className="usage">
                tokens：{message.usage.prompt} + {message.usage.completion}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
