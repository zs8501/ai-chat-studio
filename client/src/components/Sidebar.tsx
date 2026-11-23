import { useMemo, useState } from 'react';
import type { ServerInfo } from '../api/chat';
import { formatTime } from '../lib/utils';
import { getPreset } from '../presets';
import { useChatStore } from '../store/chat';

interface Props {
  open: boolean;
  onClose: () => void;
  serverInfo: ServerInfo | null;
}

export function Sidebar({ open, onClose, serverInfo }: Props) {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const theme = useChatStore((s) => s.theme);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const { newConversation, selectConversation, deleteConversation, toggleTheme } = useChatStore.getState();
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return k ? conversations.filter((c) => c.title.toLowerCase().includes(k)) : conversations;
  }, [conversations, keyword]);

  return (
    <>
      <div className={`sidebar-mask ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">✨ AI Chat Studio</div>
          <button
            className="btn btn-primary btn-block"
            disabled={isStreaming}
            onClick={() => {
              newConversation();
              onClose();
            }}
          >
            ＋ 新建对话
          </button>
          <input
            className="search"
            placeholder="搜索会话"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <ul className="conversation-list">
          {filtered.map((c) => (
            <li
              key={c.id}
              className={`conversation-item ${c.id === activeId ? 'active' : ''}`}
              onClick={() => {
                selectConversation(c.id);
                onClose();
              }}
            >
              <span className="conversation-icon">{getPreset(c.presetId).icon}</span>
              <div className="conversation-meta">
                <div className="conversation-title">{c.title}</div>
                <div className="conversation-time">{formatTime(c.updatedAt)}</div>
              </div>
              <button
                className="icon-btn conversation-delete"
                title="删除"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`确定删除「${c.title}」吗？`)) deleteConversation(c.id);
                }}
              >
                ✕
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="conversation-empty">{keyword ? '没有匹配的会话' : '暂无会话'}</li>}
        </ul>

        <div className="sidebar-footer">
          <span className={`status-dot ${serverInfo ? (serverInfo.mock ? 'mock' : 'online') : 'offline'}`} />
          <span className="status-text">
            {serverInfo ? (serverInfo.mock ? 'Mock 演示模式' : '已连接模型') : '服务未连接'}
          </span>
          <button className="icon-btn" title="切换主题" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </aside>
    </>
  );
}
