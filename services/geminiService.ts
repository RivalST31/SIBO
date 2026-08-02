import { Type, Modality } from "@google/genai";
import { 
  MODEL_TEXT_COMPLEX, 
  MODEL_TEXT_BASIC, 
  MODEL_IMAGE_GEN_PRO, 
  MODEL_VIDEO_GEN, 
  MODEL_MAPS, 
  MODEL_TTS, 
  CODENYL_CONTEXT, 
  DAILY_GEN_LIMIT, 
  STORAGE_KEY_LIMITS 
} from '../constants';
import { ChatMessage, MessageRole } from '../types';

// Helper to make fetch calls to our Cloudflare Pages Function endpoint
const callAnalyzeApi = async (data: any): Promise<any> => {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || "Could not contact Gemini. Please try again later.";
    throw new Error(message);
  }

  return response.json();
};

// Limit Logic
const checkUsageLimit = (): boolean => {
    const today = new Date().toDateString();
    const storageStr = localStorage.getItem(STORAGE_KEY_LIMITS);
    let data;
    try {
        data = storageStr ? JSON.parse(storageStr) : { date: today, count: 0 };
    } catch(e) {
        // Reset if corrupt
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
  
  try {
    // Choose model based on complexity and features
    let modelName = useThinking ? MODEL_TEXT_COMPLEX : MODEL_TEXT_BASIC;
    
    const tools: any[] = [];
    if (useGrounding && !useThinking) {
        tools.push({ googleSearch: {} });
    }

    // Maps intent check (very basic heuristic for this demo)
    const isMapsQuery = prompt.toLowerCase().includes('where is') || prompt.toLowerCase().includes('directions to') || prompt.toLowerCase().includes('nearby');
    if (isMapsQuery) {
      modelName = MODEL_MAPS;
      tools.length = 0; // Reset tools for maps
      tools.push({ googleMaps: {} });
    }

    // 1. Construct Content History
    const contents: any[] = [];

    // Add previous messages to context
    history.forEach(msg => {
      if (msg.role !== MessageRole.SYSTEM) {
          const parts: any[] = [];
          if (msg.text) parts.push({ text: msg.text });
          contents.push({
              role: msg.role === MessageRole.USER ? 'user' : 'model',
              parts: parts
          });
      }
    });

    // 2. Add Current Turn
    const currentParts: any[] = [];
    
    // Add Images
    images.forEach(img => {
      currentParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: img
        }
      });
    });

    // Add Videos
    videos.forEach(vid => {
      const matches = vid.match(/^data:(.+);base64,(.+)$/);
      if (matches && matches.length === 3) {
          currentParts.push({
              inlineData: {
                  mimeType: matches[1],
                  data: matches[2]
              }
          });
      }
    });

    currentParts.push({ text: prompt });
    
    contents.push({
        role: 'user',
        parts: currentParts
    });

    // Combine User Custom Instructions with Codenyl Context
    const combinedInstructions = `${CODENYL_CONTEXT}\n\nUser Preferences:\n${systemInstruction}`;

    const config: any = {
      tools: tools.length > 0 ? tools : undefined,
      systemInstruction: {
        parts: [{ text: combinedInstructions }]
      }
    };

    if (isMapsQuery) {
       try {
         const pos: GeolocationPosition = await new Promise((resolve, reject) => {
           navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
         });
         config.toolConfig = {
           retrievalConfig: {
             latLng: {
               latitude: pos.coords.latitude,
               longitude: pos.coords.longitude
             }
           }
         };
       } catch (e) {
         console.warn("Could not get location for maps", e);
       }
    }

    if (useThinking) {
        config.thinkingConfig = { thinkingBudget: 8192 };
    }

    // Call API via Cloudflare Pages Function proxy
    const response = await callAnalyzeApi({
      model: modelName,
      contents: contents,
      ...config
    });

    // Parse response
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || 
                 "I'm sorry, I couldn't generate a response this time.";
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const searchLinks = chunks
      .filter((c: any) => c.web)
      .map((c: any) => ({ uri: c.web.uri, title: c.web.title }));
    
    return {
      id: Date.now().toString(),
      role: MessageRole.MODEL,
      text,
      timestamp: Date.now(),
      groundingMetadata: {
        search: searchLinks,
        map: []
      }
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
  if (!checkUsageLimit()) {
      throw new Error("Daily generation limit reached (10/day). Come back tomorrow!");
  }

  try {
    const response = await callAnalyzeApi({
      model: MODEL_IMAGE_GEN_PRO,
      contents: { parts: [{ text: prompt }] },
      imageConfig: {
        imageSize: size,
        aspectRatio: '1:1'
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return part.inlineData.data;
      }
    }
    return null;
  } catch (e: any) {
    console.error("Image Gen Error", e);
    throw new Error(e.message || "Could not contact Gemini. Please try again later.");
  }
};

export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16' = '16:9'): Promise<string | null> => {
  if (!checkUsageLimit()) {
      throw new Error("Daily generation limit reached (10/day). Come back tomorrow!");
  }

  try {
    let operation = await callAnalyzeApi({
      model: MODEL_VIDEO_GEN,
      endpoint: "generateVideos",
      prompt: prompt,
      videoConfig: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    });

    // Wait loop with better error handling for operation state
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await callAnalyzeApi({
        operationName: operation.name
      });
    }

    // Check if operation was successful before accessing
    if (operation.response?.generatedVideos?.[0]?.video?.uri) {
      return operation.response.generatedVideos[0].video.uri;
    }
    return null;
  } catch (e: any) {
    console.error("Video Gen Error", e);
    throw new Error(e.message || "Could not contact Gemini. Please try again later.");
  }
};

export const generateTTS = async (text: string, voiceName: string = 'Kore'): Promise<ArrayBuffer | null> => {
    if (!text || !text.trim()) return null;
    
    // Fun pronunciation fixes for the "SIBO" brand
    let processedText = text
        .replace(/Codenyl/gi, "Code-nile")
        .replace(/SIBO/g, "See-bo")
        .replace(/SIBO's/g, "See-bo's")
        .replace(/sibo/g, "see-bo")
        .replace(/Aaradhy/gi, "Ah-rad-hee");

    try {
        const response = await callAnalyzeApi({
            model: MODEL_TTS,
            contents: [{ parts: [{ text: processedText }] }],
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName }
                }
            }
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        }
        return null;
    } catch (e) {
        console.error("TTS Error", JSON.stringify(e));
        return null;
    }
}
