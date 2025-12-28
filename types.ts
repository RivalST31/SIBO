
export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
  images?: string[]; // Base64 strings
  videos?: string[]; // URIs
  isThinking?: boolean;
  groundingMetadata?: {
    search?: { uri: string; title: string }[];
    map?: { uri: string; title: string }[];
  };
  audioData?: ArrayBuffer; // For TTS playback
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

export enum AppMode {
  CHAT = 'CHAT',
  LIVE_VOICE = 'LIVE_VOICE'
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string; // stored locally for simulation
  avatar?: string;
  isGuest?: boolean;
}

export interface UserSettings {
  wakeWord: string;
  enableWakeWord: boolean;
  theme: 'dark' | 'light';
  voiceName: string;
  enableThinking: boolean;
  systemInstructions: string;
  responseStyle?: string;
  autoReadResponse: boolean;
}

export interface PromptTemplate {
  id: string;
  title: string;
  prompt: string;
  category: 'coding' | 'writing' | 'learning' | 'fun';
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
