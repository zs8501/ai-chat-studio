import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { streamChat } from '../api/chat';
import { uid } from '../lib/utils';
import { getPreset } from '../presets';
import type { Conversation, Message } from '../types';

/** 发送给模型的最大历史消息条数，避免上下文无限增长 */
const MAX_CONTEXT_MESSAGES = 20;

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  model: string;
  theme: 'light' | 'dark';
  isStreaming: boolean;

  newConversation: (presetId?: string) => string;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  setModel: (model: string) => void;
  toggleTheme: () => void;
  send: (text: string) => Promise<void>;
  stop: () => void;
  regenerate: () => Promise<void>;
}

let controller: AbortController | null = null;

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => {
      const updateConversation = (id: string, updater: (c: Conversation) => Conversation) =>
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === id ? { ...updater(c), updatedAt: Date.now() } : c)),
        }));

      const patchMessage = (convId: string, msgId: string, patch: (m: Message) => Partial<Message>) =>
        updateConversation(convId, (c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch(m) } : m)),
        }));

      const runAssistant = async (convId: string) => {
        const conv = get().conversations.find((c) => c.id === convId);
        if (!conv) return;

        const history = conv.messages
          .filter((m) => m.status !== 'error' && m.content)
          .slice(-MAX_CONTEXT_MESSAGES)
          .map(({ role, content }) => ({ role, content }));

        const assistant: Message = {
          id: uid(),
          role: 'assistant',
          content: '',
          reasoning: '',
          status: 'streaming',
          createdAt: Date.now(),
        };
        updateConversation(convId, (c) => ({ ...c, messages: [...c.messages, assistant] }));

        const current = new AbortController();
        controller = current;
        set({ isStreaming: true });

        // token 到达频率很高，按帧合并后再写入 store，避免每个 token 都触发一次渲染
        let pending = { content: '', reasoning: '' };
        let frame = 0;
        const flush = () => {
          frame = 0;
          if (!pending.content && !pending.reasoning) return;
          const chunk = pending;
          pending = { content: '', reasoning: '' };
          patchMessage(convId, assistant.id, (m) => ({
            content: m.content + chunk.content,
            reasoning: (m.reasoning ?? '') + chunk.reasoning,
          }));
        };
        const scheduleFlush = () => {
          if (!frame) frame = requestAnimationFrame(flush);
        };
        const flushNow = () => {
          cancelAnimationFrame(frame);
          flush();
        };

        try {
          await streamChat(
            {
              model: conv.model,
              messages: [{ role: 'system', content: getPreset(conv.presetId).systemPrompt }, ...history],
            },
            {
              signal: current.signal,
              onEvent: (event) => {
                switch (event.type) {
                  case 'content':
                    pending.content += event.content;
                    scheduleFlush();
                    break;
                  case 'reasoning':
                    pending.reasoning += event.content;
                    scheduleFlush();
                    break;
                  case 'usage':
                    patchMessage(convId, assistant.id, () => ({ usage: event.usage }));
                    break;
                  case 'error':
                    throw new Error(event.message);
                }
              },
            },
          );
          flushNow();
          patchMessage(convId, assistant.id, () => ({ status: 'done' }));
        } catch (err) {
          flushNow();
          if (current.signal.aborted) {
            patchMessage(convId, assistant.id, () => ({ status: 'stopped' }));
          } else {
            const message = err instanceof Error ? err.message : '请求失败';
            patchMessage(convId, assistant.id, () => ({ status: 'error', error: message }));
          }
        } finally {
          if (controller === current) controller = null;
          set({ isStreaming: false });
        }
      };

      return {
        conversations: [],
        activeId: null,
        model: 'deepseek-chat',
        theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
        isStreaming: false,

        newConversation: (presetId = 'assistant') => {
          const { conversations, activeId, model } = get();
          const active = conversations.find((c) => c.id === activeId);
          // 当前会话还是空的，直接复用，避免产生一堆空会话
          if (active && active.messages.length === 0) {
            updateConversation(active.id, (c) => ({ ...c, presetId }));
            return active.id;
          }

          const now = Date.now();
          const conv: Conversation = {
            id: uid(),
            title: '新对话',
            presetId,
            model,
            messages: [],
            createdAt: now,
            updatedAt: now,
          };
          set({ conversations: [conv, ...conversations], activeId: conv.id });
          return conv.id;
        },

        selectConversation: (id) => {
          if (get().isStreaming) return;
          set({ activeId: id });
        },

        deleteConversation: (id) => {
          if (get().isStreaming && get().activeId === id) get().stop();
          set((s) => {
            const conversations = s.conversations.filter((c) => c.id !== id);
            const activeId = s.activeId === id ? (conversations[0]?.id ?? null) : s.activeId;
            return { conversations, activeId };
          });
        },

        setModel: (model) => {
          set({ model });
          const { activeId } = get();
          if (activeId) updateConversation(activeId, (c) => ({ ...c, model }));
        },

        toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

        send: async (text) => {
          const content = text.trim();
          if (!content || get().isStreaming) return;

          const convId = get().activeId ?? get().newConversation();
          const userMessage: Message = { id: uid(), role: 'user', content, createdAt: Date.now() };
          updateConversation(convId, (c) => ({
            ...c,
            title: c.messages.length === 0 ? content.slice(0, 24) : c.title,
            messages: [...c.messages, userMessage],
          }));

          await runAssistant(convId);
        },

        stop: () => controller?.abort(),

        regenerate: async () => {
          const { activeId, isStreaming, conversations } = get();
          const conv = conversations.find((c) => c.id === activeId);
          if (!conv || isStreaming) return;

          const lastUserIndex = conv.messages.findLastIndex((m) => m.role === 'user');
          if (lastUserIndex === -1) return;

          updateConversation(conv.id, (c) => ({ ...c, messages: c.messages.slice(0, lastUserIndex + 1) }));
          await runAssistant(conv.id);
        },
      };
    },
    {
      name: 'ai-chat-studio',
      version: 1,
      partialize: ({ conversations, activeId, model, theme }) => ({ conversations, activeId, model, theme }),
      // 刷新页面时中断的流式消息标记为已停止
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ChatState>;
        return {
          ...current,
          ...p,
          conversations: (p.conversations ?? []).map((c) => ({
            ...c,
            messages: c.messages.map((m) => (m.status === 'streaming' ? { ...m, status: 'stopped' as const } : m)),
          })),
        };
      },
    },
  ),
);

export const useActiveConversation = () =>
  useChatStore((s) => s.conversations.find((c) => c.id === s.activeId) ?? null);
