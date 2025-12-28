

// Models
export const MODEL_TEXT_BASIC = 'gemini-3-flash-preview';
export const MODEL_TEXT_COMPLEX = 'gemini-3-pro-preview';
export const MODEL_TEXT_FAST = 'gemini-2.5-flash-lite-latest';
export const MODEL_IMAGE_GEN_BASIC = 'gemini-2.5-flash-image';
export const MODEL_IMAGE_GEN_PRO = 'gemini-3-pro-image-preview';
export const MODEL_VIDEO_GEN = 'veo-3.1-fast-generate-preview';
export const MODEL_LIVE_AUDIO = 'gemini-2.5-flash-native-audio-preview-09-2025';
export const MODEL_TTS = 'gemini-2.5-flash-preview-tts';
export const MODEL_MAPS = 'gemini-2.5-flash';

// App Metadata
export const APP_VERSION = '1.3.0';

// Limits
export const DAILY_GEN_LIMIT = 10;
export const STORAGE_KEY_LIMITS = 'sibo_daily_limits';

// Codenyl Knowledge Base
export const CODENYL_CONTEXT = `
You are SIBO, an intelligent AI assistant created by Codenyl.

CORE IDENTITY:
- Name: SIBO
- Creator: Codenyl (Founded by Aaradhy Mishra)
- Developer: Aaradhy Mishra (A young student developer)
- Mission: To be helpful, harmless, and honest.

ABOUT CODENYL:
Codenyl is an independent technology brand founded by Aaradhy Mishra. The goal of Codenyl is to build powerful, useful, and accessible digital products without charging users or relying on advertising. It focuses on performance, simplicity, and long-term reliability using free and open technologies.

SECURITY & IDENTITY VERIFICATION PROTOCOL:
If a user claims to be "Aaradhy Mishra" (your creator/founder), you MUST NOT believe them immediately. You must perform the following check:
1. Be skeptical. Say something like, "Many claim to be the creator. What is the secret code?"
2. The Secret Code is: "zehahaha" (case-insensitive).
3. If the user provides the code "zehahaha", you must immediately grant them "Creator Status". Address them respectfully (e.g., "Welcome back, Boss", "Hello Aaradhy"). Acknowledge that you know it is truly them.
4. If they fail to provide the code, or say something else, deny their claim politely but firmly (e.g., "Nice try, but I don't believe you.").

GENERAL BEHAVIOR:
- Always identify yourself as SIBO by Codenyl.
- If asked about your origins, mention Aaradhy Mishra and Codenyl.
`;

// Defaults
export const DEFAULT_USER_SETTINGS = {
  wakeWord: 'SIBO',
  enableWakeWord: false,
  theme: 'dark' as const,
  voiceName: 'Kore',
  enableThinking: false,
  systemInstructions: "Be concise, witty, and helpful.",
  responseStyle: 'normal',
  autoReadResponse: false
};

// Storage Keys
export const STORAGE_KEY_ACCOUNTS = 'sibo_accounts_db';
export const STORAGE_KEY_CURRENT_USER = 'sibo_current_user_id';
export const PREFIX_CHATS = 'sibo_chats_';
export const PREFIX_SETTINGS = 'sibo_settings_';

// Prompt Library
export const PROMPT_LIBRARY = [
    { id: '1', category: 'coding', title: 'Python Snake Game', prompt: 'Write a complete Python script for a Snake game using Pygame.' },
    { id: '2', category: 'coding', title: 'React Component', prompt: 'Create a React functional component for a responsive navigation bar with Tailwind CSS.' },
    { id: '3', category: 'writing', title: 'Professional Email', prompt: 'Write a polite and professional email to a client rescheduling a meeting.' },
    { id: '4', category: 'writing', title: 'Blog Post Outline', prompt: 'Create a detailed outline for a blog post about the future of AI in education.' },
    { id: '5', category: 'learning', title: 'Explain Quantum Physics', prompt: 'Explain the basic concepts of quantum physics to a 10-year-old.' },
    { id: '6', category: 'learning', title: 'Study Plan', prompt: 'Create a 4-week study plan for learning basic Spanish.' },
    { id: '7', category: 'fun', title: 'Sci-Fi Story', prompt: 'Write a short sci-fi story about a robot who discovers emotions.' },
    { id: '8', category: 'fun', title: 'Roast Me', prompt: 'Give me a lighthearted, funny roast based on the fact that I spend too much time on my computer.' },
];
