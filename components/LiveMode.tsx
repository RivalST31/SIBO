import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Mic, MicOff, Video, VideoOff, RefreshCcw } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { MODEL_LIVE_AUDIO, CODENYL_CONTEXT } from '../constants';
import { createPcmBlob, decodeAudioData, INPUT_SAMPLE_RATE } from '../services/audioUtils';

interface LiveModeProps {
  onClose: () => void;
  voiceName: string;
}

const LiveMode: React.FC<LiveModeProps> = ({ onClose, voiceName }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);
  
  // Audio Contexts
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  
  // Video / Streaming
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoIntervalRef = useRef<number | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const cleanup = useCallback(() => {
    // Stop intervals
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);

    // Stop sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    // Close contexts
    inputContextRef.current?.close();
    outputContextRef.current?.close();

    // Stop streams
    streamRef.current?.getTracks().forEach(track => track.stop());

    // Close session
    setIsConnected(false);
  }, []);

  const initLiveSession = async (currentFacingMode: 'user' | 'environment') => {
    try {
      setError(null);
      // NOTE: Live API (WebSockets) requires direct connection or a dedicated WebSocket proxy.
      // Netlify Functions (stateless) cannot easily proxy this. 
      // We connect client-side but use the API key securely injected via env vars during build.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // 1. Get User Media
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: { facingMode: currentFacingMode }
        });
      } catch (e) {
        console.warn("Video+Audio access failed. Trying Audio only.", e);
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsVideoOn(false); 
        } catch (audioErr) {
            console.error("Audio access failed", audioErr);
            throw new Error("Could not access microphone.");
        }
      }
      
      streamRef.current = stream;

      // Setup Video Preview
      if (videoRef.current && stream.getVideoTracks().length > 0) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn("Video play failed", e));
      }
      
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: INPUT_SAMPLE_RATE });
      inputContextRef.current = inputCtx;
      
      const source = inputCtx.createMediaStreamSource(stream);
      const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
      
      // 2. Setup Audio Output
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      outputContextRef.current = outputCtx;
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);

      // 3. Connect to Live API
      const sessionPromise = ai.live.connect({
        model: MODEL_LIVE_AUDIO,
        callbacks: {
          onopen: () => {
            console.log("Live Session Opened");
            setIsConnected(true);
            
            // Start processing audio input
            scriptProcessor.onaudioprocess = (e) => {
               if (!isMicOn) return; 
               const inputData = e.inputBuffer.getChannelData(0);
               const pcmBlob = createPcmBlob(inputData);
               
               sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
               });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            // Start processing video frames
            if (stream.getVideoTracks().length > 0) {
                startVideoStreaming(sessionPromise);
            }
          },
          onmessage: async (msg: LiveServerMessage) => {
             // Handle Audio Output
             const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio && outputCtx) {
                 const buffer = await decodeAudioData(
                     base64ToUint8Array(base64Audio),
                     outputCtx
                 );
                 
                 const audioSource = outputCtx.createBufferSource();
                 audioSource.buffer = buffer;
                 audioSource.connect(outputNode);
                 
                 const startTime = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                 audioSource.start(startTime);
                 nextStartTimeRef.current = startTime + buffer.duration;
                 
                 sourcesRef.current.add(audioSource);
                 audioSource.addEventListener('ended', () => {
                     sourcesRef.current.delete(audioSource);
                 });
             }
             
             // Handle Interruption
             if (msg.serverContent?.interrupted) {
                 sourcesRef.current.forEach(s => {
                     try { s.stop(); } catch(e){}
                 });
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = 0;
             }
          },
          onclose: () => {
             console.log("Session closed");
             setIsConnected(false);
          },
          onerror: (err) => {
             console.error("Live API Error", err);
             setError("Connection lost.");
          }
        },
        config: {
           responseModalities: [Modality.AUDIO],
           speechConfig: {
               voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } }
           },
           // Inject SIBO Persona + Context
           systemInstruction: `${CODENYL_CONTEXT}\n\nYou are currently in 'Live Voice Mode'. You can see what the user shows you via their camera. Be helpful, concise, and friendly.`
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Could not access camera/microphone.");
    }
  };

  const startVideoStreaming = (sessionPromise: Promise<any>) => {
      // Send frames at 1 FPS
      videoIntervalRef.current = window.setInterval(() => {
          if (!isVideoOn || !videoRef.current || !canvasRef.current) return;
          if (streamRef.current?.getVideoTracks().length === 0) return;

          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          
          if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
              canvas.width = video.videoWidth * 0.5; // Scale down for performance
              canvas.height = video.videoHeight * 0.5;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
              
              sessionPromise.then(session => {
                  session.sendRealtimeInput({
                      media: {
                          mimeType: 'image/jpeg',
                          data: base64Data
                      }
                  });
              });
          }
      }, 1000); 
  };

  const switchCamera = () => {
      const newMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newMode);
      
      // Re-init session with new camera constraint
      // (Live API sessions handle reconnections reasonably well, or we just restart)
      cleanup();
      setTimeout(() => initLiveSession(newMode), 500);
  };

  useEffect(() => {
    initLiveSession(facingMode);
    return cleanup;
  }, []);

  const base64ToUint8Array = (base64: string) => {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
  };

  const toggleVideo = () => {
      if (streamRef.current && streamRef.current.getVideoTracks().length === 0) {
          alert("No camera detected.");
          return;
      }

      const newState = !isVideoOn;
      setIsVideoOn(newState);
      if (streamRef.current) {
          streamRef.current.getVideoTracks().forEach(t => t.enabled = newState);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white overflow-hidden">
        {/* Fullscreen Video Background */}
        <div className="absolute inset-0 z-0">
             <video 
                ref={videoRef} 
                muted 
                playsInline 
                className={`w-full h-full object-cover transition-opacity duration-500 ${isVideoOn ? 'opacity-50' : 'opacity-0'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} 
             />
             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80"></div>
        </div>
        
        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        <button 
            onClick={onClose}
            className="absolute top-8 left-8 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white z-20 backdrop-blur-md border border-white/10"
        >
            <X size={28} />
        </button>

        <button 
            onClick={switchCamera}
            className="absolute top-8 right-8 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white z-20 backdrop-blur-md border border-white/10"
        >
            <RefreshCcw size={28} />
        </button>

        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md px-6 text-center z-10 relative">
            <h2 className="text-3xl font-bold mb-8 tracking-wider opacity-90 drop-shadow-lg">SIBO LIVE</h2>
            
            <div className="relative mb-8">
                {/* Visualizer */}
                <div className={`w-32 h-32 rounded-full bg-gradient-to-tr from-blue-500/80 to-purple-600/80 backdrop-blur-md shadow-2xl flex items-center justify-center transition-all duration-300 ${isConnected ? 'animate-pulse' : 'grayscale'}`}>
                   {isConnected ? (
                       <div className="flex gap-1.5 items-center h-12">
                           {[1,2,3,4].map(i => (
                               <div key={i} className="w-1.5 bg-white rounded-full animate-bounce" style={{height: `${Math.random() * 30 + 10}px`, animationDuration: `${0.4 + Math.random()}s`}}></div>
                           ))}
                       </div>
                   ) : (
                       <span className="text-xs font-bold">{error ? 'ERR' : '...'}</span>
                   )}
                </div>
            </div>

            <p className="text-xl font-light text-white drop-shadow-md">
                {isConnected ? (isVideoOn ? "I can see and hear you." : "I'm listening...") : (error || "Initializing...")}
            </p>
        </div>

        <div className="pb-12 z-20 flex gap-6">
            <button 
                onClick={toggleVideo}
                className={`p-5 rounded-full transition-all border border-white/10 backdrop-blur-md shadow-xl ${isVideoOn ? 'bg-white/20 text-white' : 'bg-red-500/80 text-white'}`}
            >
                {isVideoOn ? <Video size={28} /> : <VideoOff size={28} />}
            </button>
            
            <button 
                onClick={() => setIsMicOn(!isMicOn)}
                className={`p-5 rounded-full transition-all border border-white/10 backdrop-blur-md shadow-xl ${isMicOn ? 'bg-white/20 text-white' : 'bg-red-500/80 text-white'}`}
            >
                {isMicOn ? <Mic size={28} /> : <MicOff size={28} />}
            </button>
        </div>
    </div>
  );
};

export default LiveMode;