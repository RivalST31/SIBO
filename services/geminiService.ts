import { ChatMessage, MessageRole } from '../types';
import { DAILY_GEN_LIMIT, STORAGE_KEY_LIMITS } from '../constants';

const isPreviewMode = (): boolean => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.includes("run.app") || host === "localhost" || host === "127.0.0.1";
};

// Limit Logic
const checkUsageLimit = (): boolean => {
  const today = new Date().toDateString();
  const storageStr = localStorage.getItem(STORAGE_KEY_LIMITS);
  let data;
  try {
    data = storageStr ? JSON.parse(storageStr) : { date: today, count: 0 };
  } catch (e) {
    data = { date: today, count: 0 };
  }

  if (data.date !== today) {
    data = { date: today, count: 0 };
  }

  if (data.count >= DAILY_GEN_LIMIT) {
    return false;
  }

  data.count++;
  localStorage.setItem(STORAGE_KEY_LIMITS, JSON.stringify(data));
  return true;
};

export const generateTextResponse = async (
  history: ChatMessage[], 
  prompt: string, 
  images: string[] = [],
  videos: string[] = [],
  useThinking: boolean = false,
  useGrounding: boolean = true,
  systemInstruction: string = ''
): Promise<ChatMessage> => {
  if (!checkUsageLimit()) {
    return {
      id: Date.now().toString(),
      role: MessageRole.MODEL,
      text: "Daily generation limit reached (10/day). Come back tomorrow!",
      timestamp: Date.now()
    };
  }

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: prompt,
        history: history.map(msg => ({
          role: msg.role,
          text: msg.text
        })),
        mode: useThinking ? "thinking" : "lightning",
        systemInstruction
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error || "Could not contact Gemini. Please try again later.";
      throw new Error(message);
    }

    const data = await response.json();
    return {
      id: Date.now().toString(),
      role: MessageRole.MODEL,
      text: data.text || "No response generated.",
      timestamp: Date.now()
    };
  } catch (error: any) {
    console.error("GenAI Error:", error);
    const userMessage = error.message || "Could not contact Gemini. Please try again later.";
    return {
      id: Date.now().toString(),
      role: MessageRole.MODEL,
      text: userMessage,
      timestamp: Date.now()
    };
  }
};

export const generateImage = async (prompt: string, size: '1K' | '2K' | '4K' = '1K'): Promise<string | null> => {
  throw new Error("AI preview is unavailable in AI Studio. Test on the deployed Cloudflare Pages site.");
};

export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16' = '16:9'): Promise<string | null> => {
  throw new Error("AI preview is unavailable in AI Studio. Test on the deployed Cloudflare Pages site.");
};

export const generateTTS = async (text: string, voiceName: string = 'Kore'): Promise<ArrayBuffer | null> => {
  return null;
};
