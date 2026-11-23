import { useLayoutEffect, useRef } from 'react';
import { getPreset, PRESETS } from '../presets';
import { useActiveConversation, useChatStore } from '../store/chat';
import { Composer } from './Composer';
import { MessageItem } from './MessageItem';

interface Props {
  models: string[];
  onOpenSidebar: () => void;
}

export function ChatView({ models, onOpenSidebar }: Props) {
  const conversation = useActiveConversation();
  const defaultModel = useChatStore((s) => s.model);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const { setModel, newConversation, send } = useChatStore.getState();

  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const messages = conversation?.messages ?? [];
  const preset = getPreset(conversation?.presetId ?? 'assistant');
  const model = conversation?.model ?? defaultModel;
  const lastAssistantId = messages.findLast((m) => m.role === 'assistant')?.id;

  // 用户向上翻看历史时不强制滚动到底部
  const handleScroll = () => {
    const el = listRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useLayoutEffect(() => {
    stickToBottom.current = true;
  }, [conversation?.id]);

  return (
    <main className="chat">
      <header className="chat-header">
        <button className="icon-btn menu-btn" onClick={onOpenSidebar} title="会话列表">
          ☰
        </button>
        <div className="chat-title">
          <span>{preset.icon}</span>
          <span className="ellipsis">{conversation?.title ?? '新对话'}</span>
        </div>
        <select
          className="model-select"
          value={model}
          disabled={isStreaming}
          onChange={(e) => setModel(e.target.value)}
        >
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </header>

      <div className="message-list" ref={listRef} onScroll={handleScroll}>
        {messages.length === 0 ? (
          <div className="welcome">
            <h1>{preset.icon} 今天想聊点什么？</h1>
            <p className="welcome-sub">选择一个角色开始，或直接输入问题</p>
            <div className="preset-grid">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={`preset-card ${p.id === preset.id ? 'active' : ''}`}
                  onClick={() => newConversation(p.id)}
                >
                  <div className="preset-name">
                    {p.icon} {p.name}
                  </div>
                  <div className="preset-desc">{p.description}</div>
                </button>
              ))}
            </div>
            <div className="examples">
              {preset.examples.map((e) => (
                <button key={e} className="example" onClick={() => send(e)}>
                  {e} →
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages">
            {messages.map((m) => (
              <MessageItem key={m.id} message={m} canRegenerate={m.id === lastAssistantId && !isStreaming} />
            ))}
          </div>
        )}
      </div>

      <Composer />
    </main>
  );
}
