export type Role = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
}

/** 服务端推给前端的统一事件格式，屏蔽不同模型厂商的差异 */
export type StreamEvent =
  | { type: 'reasoning'; content: string }
  | { type: 'content'; content: string }
  | { type: 'usage'; usage: { prompt: number; completion: number } }
  | { type: 'done' }
  | { type: 'error'; message: string };
