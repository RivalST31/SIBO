import { GoogleGenAI, Type, Modality } from "@google/genai";
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

// Helper to ensure API Key logic
const getAIClient = async (requiresPaidKey: boolean = false) => {
  // If a paid key is strictly required (Veo, Imagen 3 Pro), try to trigger the selector
  if (requiresPaidKey) {
    const win = window as any;
    if (win.aistudio && typeof win.aistudio.hasSelectedApiKey === 'function') {
      try {
          const hasKey = await win.aistudio.hasSelectedApiKey();
          if (!hasKey) {
              await win.aistudio.openSelectKey();
          }
      } catch (e) {
          console.warn("AI Studio key selection failed or cancelled", e);
      }
    }
  }
  
  // Use the environment variable injected by Vite/Netlify
  const apiKey = process.env.API_KEY || "";
  
  if (!apiKey) {
      console.error("API Key is missing. Ensure 'API_KEY' is set in your Netlify Site Configuration.");
      throw new Error("System Configuration Error: API Key is missing.");
  }
  
  return new GoogleGenAI({ apiKey: apiKey });
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
    const ai = await getAIClient();

    // Choose model based on complexity and features
    let modelName = useThinking ? MODEL_TEXT_COMPLEX : MODEL_TEXT_BASIC;
    
    const tools: any[] = [];
    if (useGrounding && !useThinking) {
        // Basic grounding
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
      systemInstruction: combinedInstructions
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

    // Call API Directly Client-Side
    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: config
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
    
    let userMessage = "";
    
    if (error.message && (error.message.includes('403') || error.message.includes('API key'))) {
        userMessage = "Access denied (403). The API Key is invalid or expired. Please check your Netlify environment variables.";
    } else if (error.message && error.message.includes('503')) {
        userMessage = "The AI service is currently overloaded (503). Please try again in a moment.";
    } else if (error.message && error.message.includes('429')) {
        userMessage = "You have exceeded the rate limit (429). Please wait a while before sending more messages.";
    } else if (error.message && error.message.includes('fetch')) {
        userMessage = "Network error. Please check your internet connection.";
    } else {
        // Show the actual error to help debugging
        userMessage = `Connection Error: ${error.message || "Unknown error"}.`;
    }

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

  const ai = await getAIClient(true); 
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE_GEN_PRO,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          imageSize: size,
          aspectRatio: '1:1'
        }
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
    throw new Error(`Image generation failed: ${e.message}`);
  }
};

export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16' = '16:9'): Promise<string | null> => {
  if (!checkUsageLimit()) {
      throw new Error("Daily generation limit reached (10/day). Come back tomorrow!");
  }

  const ai = await getAIClient(true);

  try {
    let operation = await ai.models.generateVideos({
      model: MODEL_VIDEO_GEN,
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    });

    // Wait loop with better error handling for operation state
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    // Check if operation was successful before accessing
    if (operation.response?.generatedVideos?.[0]?.video?.uri) {
      const uri = operation.response.generatedVideos[0].video.uri;
      const key = process.env.API_KEY || "";
      return `${uri}&key=${key}`;
    }
    return null;
  } catch (e: any) {
    console.error("Video Gen Error", e);
    throw new Error(`Video generation failed: ${e.message}`);
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

    const ai = await getAIClient();
    try {
        const response = await ai.models.generateContent({
            model: MODEL_TTS,
            contents: [{ parts: [{ text: processedText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName }
                    }
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