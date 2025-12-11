export type Mode = 'explain' | 'debug' | 'optimize' | 'document';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  codeContext: string;
  language: string;
  mode: Mode;
  createdAt: number;
}

export interface Snippet {
  id: string;
  title: string;
  language: string;
  code: string;
  notes?: string;
  createdAt: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'html', label: 'HTML/CSS' },
  { value: 'sql', label: 'SQL' },
];