export type Role = 'system' | 'user' | 'assistant';

export type MessageStatus = 'streaming' | 'done' | 'stopped' | 'error';

export interface Usage {
  prompt: number;
  completion: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  reasoning?: string;
  status?: MessageStatus;
  error?: string;
  usage?: Usage;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  presetId: string;
  model: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export type StreamEvent =
  | { type: 'reasoning'; content: string }
  | { type: 'content'; content: string }
  | { type: 'usage'; usage: Usage }
  | { type: 'done' }
  | { type: 'error'; message: string };
