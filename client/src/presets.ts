export interface Preset {
  id: string;
  name: string;
  icon: string;
  description: string;
  systemPrompt: string;
  examples: string[];
}

export const PRESETS: Preset[] = [
  {
    id: 'assistant',
    name: '通用助手',
    icon: '✨',
    description: '回答问题、写作、头脑风暴',
    systemPrompt: '你是一个乐于助人的 AI 助手，回答准确、简洁，必要时使用 Markdown 组织内容。',
    examples: ['用三句话解释什么是 SSE', '帮我写一封周报邮件的开头'],
  },
  {
    id: 'interviewer',
    name: '前端面试官',
    icon: '🎯',
    description: '模拟高级前端技术面试',
    systemPrompt:
      '你是一名资深前端技术面试官。每次只问一个问题，等候选人回答后给出点评（优点、不足、参考答案要点），再追问或进入下一题。覆盖 JavaScript、React/Vue 原理、工程化、性能优化、浏览器与网络。',
    examples: ['开始一场 React 方向的面试', '考我几道性能优化的题'],
  },
  {
    id: 'reviewer',
    name: '代码审查',
    icon: '🔍',
    description: '找 Bug、提建议、给出改进代码',
    systemPrompt:
      '你是一名严格的代码审查专家。按「问题严重程度」列出代码中的 Bug、性能问题、可维护性问题和安全隐患，并给出修改后的代码。',
    examples: ['帮我审查一段 useEffect 代码', '这段防抖函数有什么问题？'],
  },
  {
    id: 'translator',
    name: '技术翻译',
    icon: '🌐',
    description: '中英互译，保留技术术语',
    systemPrompt:
      '你是一名技术文档翻译。中文输入翻译为英文，英文输入翻译为中文，保留代码与专有名词，译文自然流畅，只输出译文。',
    examples: ['React Server Components allow you to render on the server.', '把「首屏渲染优化」翻译成英文'],
  },
];

export const getPreset = (id: string) => PRESETS.find((p) => p.id === id) ?? PRESETS[0];
