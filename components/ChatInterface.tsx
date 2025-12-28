import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, Loader2, Sparkles, X, User, Copy, RefreshCw, Zap, BrainCircuit, BookOpen, Volume2, Play, Pause, Camera, Video, StopCircle, Plus, RefreshCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, MessageRole, UserProfile } from '../types';
import { CodenylLogo } from './CodenylLogo';
import { PROMPT_LIBRARY } from '../constants';
import { generateTTS } from '../services/geminiService';
import { decodeAudioData } from '../services/audioUtils';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  userProfile: UserProfile | null;
  onSendMessage: (text: string, images: string[], videos: string[], mode: 'text' | 'image-gen' | 'video-gen') => void;
  onStartVoiceMode: () => void;
  isProcessing: boolean;
  useProModel: boolean;
  onToggleModel: (val: boolean) => void;
  onRegenerate: () => void;
  voiceName?: string;
  autoReadResponse?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
    messages, userProfile, onSendMessage, onStartVoiceMode, isProcessing, 
    useProModel, onToggleModel, onRegenerate, voiceName = 'Kore', autoReadResponse = false
}) => {
  const [input, setInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]); // Base64 Data URIs
  const [showPrompts, setShowPrompts] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  
  // TTS State
  const [isPlayingId, setIsPlayingId] = useState<string | null>(null);
  const [isLoadingTTS, setIsLoadingTTS] = useState<string | null>(null);
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(null);

  // Camera/Video State
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user'); // Default to front for accessibility
  const [isRecording, setIsRecording] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Auto-Read Logic
  useEffect(() => {
      if (!autoReadResponse) return;
      
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === MessageRole.MODEL && !isProcessing && lastMsg.id !== lastReadMessageId) {
          // New model message derived, and we haven't read it yet
          setLastReadMessageId(lastMsg.id);
          playTTS(lastMsg.text, lastMsg.id);
      }
  }, [messages, isProcessing, autoReadResponse]);

  // Click Outside to Close Menu Logic
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
              setShowAttachMenu(false);
          }
      };

      if (showAttachMenu) {
          document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, [showAttachMenu]);

  // Cleanup audio on unmount
  useEffect(() => {
      return () => {
          stopAudio();
          stopCamera();
      };
  }, []);

  const handleSend = () => {
    if ((!input.trim() && selectedImages.length === 0 && selectedVideos.length === 0) || isProcessing) return;
    
    const lower = input.toLowerCase();
    let mode: 'text' | 'image-gen' | 'video-gen' = 'text';
    
    if ((lower.startsWith('generate image') || lower.startsWith('create an image')) && !selectedImages.length) {
        mode = 'image-gen';
    } else if ((lower.startsWith('generate video') || lower.startsWith('create a video')) && !selectedImages.length) {
        mode = 'video-gen';
    }

    onSendMessage(input, selectedImages, selectedVideos, mode);
    setInput('');
    setSelectedImages([]);
    setSelectedVideos([]);
    setShowPrompts(false);
  };

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
  };

  const stopAudio = () => {
      if (sourceNodeRef.current) {
          try { sourceNodeRef.current.stop(); } catch(e) {}
          sourceNodeRef.current = null;
      }
      setIsPlayingId(null);
      setIsLoadingTTS(null);
  };

  const playTTS = async (text: string, id: string) => {
      if (isPlayingId === id) {
          stopAudio();
          return;
      }
      if (isLoadingTTS) return; // Prevent double click while loading

      stopAudio();
      setIsLoadingTTS(id); // Show loading spinner

      if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      try {
          const pcmArrayBuffer = await generateTTS(text, voiceName);
          if (pcmArrayBuffer) {
              const ctx = audioContextRef.current;
              // Ensure ctx is running (mobile browsers suspend it)
              if (ctx.state === 'suspended') {
                await ctx.resume();
              }

              const buffer = await decodeAudioData(new Uint8Array(pcmArrayBuffer), ctx, 24000);
              
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.onended = () => {
                  setIsPlayingId(null);
              };
              source.start(0);
              sourceNodeRef.current = source;
              
              setIsLoadingTTS(null); // Stop loading, start playing
              setIsPlayingId(id);
          } else {
              setIsLoadingTTS(null);
              setIsPlayingId(null);
          }
      } catch (e) {
          console.error("TTS Playback failed", e);
          setIsLoadingTTS(null);
          setIsPlayingId(null);
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Check if it's an image or video based on MIME type in data URI
        if (result.startsWith('data:image')) {
             const base64Data = result.split(',')[1];
             setSelectedImages(prev => [...prev, base64Data]);
        } else if (result.startsWith('data:video')) {
             setSelectedVideos(prev => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Camera & Video Recording Logic ---
  const startCamera = async (mode: 'photo' | 'video', requestedFacingMode?: 'user' | 'environment') => {
      // Stop existing stream if any
      stopCamera(false); 

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          alert("Camera access is not supported in this browser context (requires HTTPS/Localhost).");
          return;
      }

      const targetFacingMode = requestedFacingMode || facingMode;

      try {
          setCameraMode(mode);
          setFacingMode(targetFacingMode);
          setShowCamera(true);
          
          let stream: MediaStream | null = null;
          
          const tryGetMedia = async (constraints: MediaStreamConstraints) => {
              try {
                  return await navigator.mediaDevices.getUserMedia(constraints);
              } catch (e) {
                  return null;
              }
          };

          // 1. Exact constraints
          stream = await tryGetMedia({ 
            video: { facingMode: targetFacingMode },
            audio: mode === 'video'
          });

          // 2. Fallback to any camera
          if (!stream) {
              stream = await tryGetMedia({ 
                  video: true,
                  audio: mode === 'video'
              });
          }

          if (!stream && mode === 'video') {
              stream = await tryGetMedia({ video: true }); // No audio fallback
          }

          if (!stream) {
              throw new Error("No camera device found.");
          }

          setCameraStream(stream);
          // Wait for ref to be active
          setTimeout(async () => {
              if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                  videoRef.current.muted = true; 
                  try {
                      await videoRef.current.play();
                  } catch (playError) {
                      console.error("Error playing video stream:", playError);
                  }
              }
          }, 100);
      } catch (e) {
          console.error("Camera failed", e);
          alert("Could not access camera. Please check device permissions.");
          setShowCamera(false);
      }
  };

  const switchCamera = () => {
      const newMode = facingMode === 'user' ? 'environment' : 'user';
      startCamera(cameraMode, newMode);
  };

  const stopCamera = (closeOverlay = true) => {
      if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
      }
      if (closeOverlay) {
        setShowCamera(false);
      }
      setIsRecording(false);
      mediaRecorderRef.current = null;
  };

  const captureImage = () => {
      if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              // Handle mirroring if user facing
              if (facingMode === 'user') {
                   // Optional: Can add canvas scaling to flip horizontally, but keeping it raw for now
              }
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              const base64Data = dataUrl.split(',')[1];
              setSelectedImages(prev => [...prev, base64Data]);
              stopCamera();
          }
      }
  };

  const startRecording = () => {
      if (!cameraStream) return;
      videoChunksRef.current = [];
      
      try {
          const mimeTypes = [
              'video/webm;codecs=vp8,opus',
              'video/webm',
              'video/mp4' // Safari support
          ];
          
          let selectedMimeType = '';
          for (const type of mimeTypes) {
              if (MediaRecorder.isTypeSupported(type)) {
                  selectedMimeType = type;
                  break;
              }
          }

          const recorder = new MediaRecorder(cameraStream, { 
              mimeType: selectedMimeType || undefined 
          }); 
          
          recorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                  videoChunksRef.current.push(event.data);
              }
          };
          
          recorder.onstop = () => {
              const blob = new Blob(videoChunksRef.current, { type: selectedMimeType || 'video/webm' });
              const reader = new FileReader();
              reader.onloadend = () => {
                  const result = reader.result as string;
                  setSelectedVideos(prev => [...prev, result]);
              };
              reader.readAsDataURL(blob);
              stopCamera();
          };
          
          mediaRecorderRef.current = recorder;
          recorder.start();
          setIsRecording(true);
      } catch (e) {
          console.error("MediaRecorder failed", e);
          alert("Video recording failed on this device.");
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-sibo-dark text-gray-100 font-sans relative">
      
      {/* Header with Model Switcher */}
      <div className="flex justify-center pt-2 pb-0 z-10 mt-16 md:mt-0">
          <div className="bg-gray-800/80 backdrop-blur-md rounded-full p-1 border border-gray-700 flex items-center shadow-xl">
             <button 
                onClick={() => onToggleModel(false)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${!useProModel ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
             >
                 <Zap size={12} /> Lightning
             </button>
             <button 
                onClick={() => onToggleModel(true)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${useProModel ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
             >
                 <BrainCircuit size={12} /> Deep Logic
             </button>
          </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-8">
        {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-80 -mt-10">
                <div className="relative mb-8">
                     <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full animate-pulse-slow"></div>
                     <CodenylLogo size={96} className="relative z-10 animate-blob" />
                </div>
                
                <h1 className="text-3xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">SIBO</h1>
                <div className="flex flex-col items-center gap-1 mb-8">
                    <p className="text-xs text-gray-500 font-bold tracking-widest uppercase">Powered by Codenyl</p>
                    <p className="text-[10px] text-gray-600 font-bold tracking-widest uppercase">Made by Aaradhy</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full px-4">
                   <SuggestionCard text="Who created you?" onClick={() => setInput("Who created you?")} />
                   <SuggestionCard text="Write python code for a snake game" onClick={() => setInput("Write python code for a snake game")} />
                   <SuggestionCard text="Generate a logo for a coffee shop" onClick={() => setInput("Generate a logo for a coffee shop")} />
                   <SuggestionCard text="Explain quantum physics simply" onClick={() => setInput("Explain quantum physics simply")} />
                </div>
            </div>
        )}
        
        {messages.map((msg, index) => (
          <div key={msg.id} className="group max-w-4xl mx-auto w-full flex gap-4 md:gap-6 animate-fade-in relative">
             {/* Avatar */}
             <div className="flex-shrink-0 mt-1">
                 {msg.role === MessageRole.USER ? (
                     <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-medium shadow-md">
                         {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : <User size={20}/>}
                     </div>
                 ) : (
                     <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                         <CodenylLogo size={20} />
                     </div>
                 )}
             </div>

             {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="prose prose-invert prose-lg max-w-none leading-relaxed">
                   {msg.role === MessageRole.USER ? (
                       <div className="text-gray-100 font-medium whitespace-pre-wrap">{msg.text}</div>
                   ) : (
                       <ReactMarkdown>{msg.text}</ReactMarkdown>
                   )}
                </div>

                {/* Media Attachments */}
                {(msg.images?.length || 0) > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                        {msg.images!.map((img, i) => (
                            <img key={i} src={`data:image/jpeg;base64,${img}`} className="h-48 rounded-xl border border-gray-700 shadow-md object-cover" />
                        ))}
                    </div>
                )}
                {(msg.videos?.length || 0) > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                        {msg.videos!.map((vid, i) => (
                            <video key={i} src={vid} controls className="max-w-full rounded-xl border border-gray-700 shadow-md max-h-80" />
                        ))}
                    </div>
                )}

                 {/* Message Actions */}
                 {msg.role === MessageRole.MODEL && !isProcessing && (
                     <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => playTTS(msg.text, msg.id)} className={`p-1.5 rounded-md transition-colors ${isPlayingId === msg.id || isLoadingTTS === msg.id ? 'text-blue-400 bg-blue-400/10' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`} title="Read Aloud">
                             {isLoadingTTS === msg.id ? <Loader2 size={14} className="animate-spin" /> : 
                               isPlayingId === msg.id ? <Pause size={14} /> : <Play size={14} />
                             }
                         </button>
                         <button onClick={() => handleCopy(msg.text)} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-md transition-colors" title="Copy">
                             <Copy size={14} />
                         </button>
                         {index === messages.length - 1 && (
                             <button onClick={onRegenerate} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-md transition-colors" title="Regenerate">
                                 <RefreshCw size={14} />
                             </button>
                         )}
                     </div>
                 )}

                 {/* Grounding */}
                {msg.groundingMetadata && (
                  <div className="mt-4 flex flex-wrap gap-2">
                      {msg.groundingMetadata.search?.map((link, idx) => (
                          <a key={idx} href={link.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-800/50 hover:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700 transition-colors flex items-center gap-2 text-blue-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              <span className="truncate max-w-[200px]">{link.title}</span>
                          </a>
                      ))}
                  </div>
                )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="max-w-4xl mx-auto w-full flex gap-6 animate-pulse">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                 <CodenylLogo size={20} />
             </div>
             <div className="flex items-center gap-1">
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Prompts Overlay */}
      {showPrompts && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20 animate-fade-in">
              <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700 rounded-2xl p-4 shadow-2xl">
                  <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-bold text-gray-300">Prompt Library</h3>
                      <button onClick={() => setShowPrompts(false)}><X size={16} className="text-gray-500 hover:text-white" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                      {PROMPT_LIBRARY.map(p => (
                          <button 
                            key={p.id} 
                            onClick={() => { setInput(p.prompt); setShowPrompts(false); }}
                            className="text-left p-2.5 rounded-lg bg-gray-700/50 hover:bg-blue-600 hover:text-white text-xs text-gray-300 transition-colors border border-transparent hover:border-blue-500/50"
                          >
                              <div className="font-bold mb-0.5">{p.title}</div>
                              <div className="truncate opacity-70">{p.prompt}</div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Camera/Video Overlay */}
      {showCamera && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center">
              <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Recording Indicator */}
              {isRecording && (
                  <div className="absolute top-8 flex items-center gap-2 bg-red-600/80 px-4 py-1 rounded-full animate-pulse z-10">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      <span className="text-white text-xs font-bold uppercase tracking-wider">Recording</span>
                  </div>
              )}

              {/* Controls */}
              <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-12 z-20">
                  {!isRecording && (
                     <>
                        <button 
                            onClick={() => stopCamera()}
                            className="p-4 rounded-full bg-gray-800/60 backdrop-blur text-white hover:bg-gray-700"
                        >
                            <X size={24} />
                        </button>

                         <button 
                            onClick={switchCamera}
                            className="p-4 rounded-full bg-gray-800/60 backdrop-blur text-white hover:bg-gray-700"
                        >
                            <RefreshCcw size={24} />
                        </button>
                    </>
                  )}
                  
                  {cameraMode === 'photo' ? (
                      <button 
                          onClick={captureImage}
                          className="p-1 rounded-full border-4 border-white"
                      >
                          <div className="w-16 h-16 bg-white rounded-full hover:bg-gray-200 transition-colors"></div>
                      </button>
                  ) : (
                      <button 
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`p-1 rounded-full border-4 transition-all duration-300 ${isRecording ? 'border-red-500 scale-110' : 'border-white'}`}
                      >
                          {isRecording ? (
                              <div className="w-16 h-16 bg-red-500 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center">
                                  <StopCircle size={36} fill="currentColor" className="text-white" />
                              </div>
                          ) : (
                              <div className="w-16 h-16 bg-red-500 rounded-full hover:bg-red-600 transition-colors"></div>
                          )}
                      </button>
                  )}
              </div>
          </div>
      )}

      {/* Input Area */}
      <div className="p-4 md:pb-6">
        <div className="max-w-3xl mx-auto relative">
           
           {/* Floating Media Preview */}
           {(selectedImages.length > 0 || selectedVideos.length > 0) && (
             <div className="absolute bottom-full left-0 mb-2 flex gap-2 overflow-x-auto max-w-full pb-1 no-scrollbar">
                {selectedImages.map((img, i) => (
                    <div key={`img-${i}`} className="relative group flex-shrink-0">
                        <img src={`data:image/jpeg;base64,${img}`} className="h-20 w-20 object-cover rounded-xl border border-gray-600 shadow-lg" />
                        <button onClick={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow-md border border-gray-600"><X size={12} /></button>
                    </div>
                ))}
                {selectedVideos.map((vid, i) => (
                    <div key={`vid-${i}`} className="relative group flex-shrink-0">
                        <video src={vid} className="h-20 w-20 object-cover rounded-xl border border-gray-600 shadow-lg" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Video size={24} className="text-white drop-shadow-md" /></div>
                        <button onClick={() => setSelectedVideos(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow-md border border-gray-600"><X size={12} /></button>
                    </div>
                ))}
            </div>
           )}

           <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-[2rem] p-2 flex items-end shadow-2xl transition-all focus-within:bg-gray-800/80 focus-within:border-gray-600 relative z-20">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,video/*" 
                    onChange={handleFileSelect}
                />
                
                {/* Unified Attachment Menu */}
                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                        className={`p-3 transition-colors rounded-full hover:bg-gray-700/50 ${showAttachMenu ? 'text-white bg-gray-700/50' : 'text-gray-400 hover:text-white'}`}
                        title="Add Attachment"
                    >
                        <Plus size={22} className={`transition-transform duration-300 ${showAttachMenu ? 'rotate-45' : 'rotate-0'}`} />
                    </button>

                    {showAttachMenu && (
                        <div className="absolute bottom-full left-0 mb-3 bg-gray-800/90 backdrop-blur-xl border border-gray-700 rounded-xl p-2 shadow-2xl flex flex-col gap-1 min-w-[160px] animate-fade-in origin-bottom-left z-50">
                             <button 
                                onClick={() => { setShowPrompts(!showPrompts); setShowAttachMenu(false); }}
                                className="flex items-center gap-3 w-full text-left p-2.5 rounded-lg hover:bg-gray-700/50 text-gray-300 hover:text-white transition-colors text-sm"
                            >
                                <BookOpen size={18} className="text-blue-400" />
                                <span>Prompt Library</span>
                            </button>
                            <button 
                                onClick={() => { startCamera('photo'); setShowAttachMenu(false); }}
                                className="flex items-center gap-3 w-full text-left p-2.5 rounded-lg hover:bg-gray-700/50 text-gray-300 hover:text-white transition-colors text-sm"
                            >
                                <Camera size={18} className="text-purple-400" />
                                <span>Take Photo</span>
                            </button>
                            <button 
                                onClick={() => { startCamera('video'); setShowAttachMenu(false); }}
                                className="flex items-center gap-3 w-full text-left p-2.5 rounded-lg hover:bg-gray-700/50 text-gray-300 hover:text-white transition-colors text-sm"
                            >
                                <Video size={18} className="text-red-400" />
                                <span>Record Video</span>
                            </button>
                            <button 
                                onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                                className="flex items-center gap-3 w-full text-left p-2.5 rounded-lg hover:bg-gray-700/50 text-gray-300 hover:text-white transition-colors text-sm"
                            >
                                <Paperclip size={18} className="text-green-400" />
                                <span>Upload File</span>
                            </button>
                        </div>
                    )}
                </div>

                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder={isProcessing ? "SIBO is thinking..." : `Message SIBO (${useProModel ? 'Pro' : 'Flash'})...`}
                    className="flex-1 bg-transparent border-0 focus:ring-0 text-white placeholder-gray-400 resize-none py-3.5 px-2 max-h-32 min-h-[52px]"
                    rows={1}
                />

                <div className="flex items-center gap-1 pb-1">
                     <button 
                        onClick={onStartVoiceMode}
                        className="p-3 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700/50"
                        title="Voice Mode"
                    >
                        <Mic size={22} />
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={(!input.trim() && selectedImages.length === 0 && selectedVideos.length === 0) || isProcessing}
                        className={`p-2.5 rounded-full m-1 transition-all duration-300 ${
                            (!input.trim() && selectedImages.length === 0 && selectedVideos.length === 0) || isProcessing 
                            ? 'bg-gray-700 text-gray-500' 
                            : 'bg-white text-black hover:scale-105'
                        }`}
                    >
                        <Send size={18} fill={(!input.trim() && selectedImages.length === 0 && selectedVideos.length === 0) ? "none" : "currentColor"} />
                    </button>
                </div>
           </div>
           <div className="text-center mt-2 text-xs text-gray-500 flex justify-center items-center gap-2">
               <span>Powered by</span> 
               <span className="font-bold text-gray-400 flex items-center gap-1">CODENYL</span>
           </div>
        </div>
      </div>
    </div>
  );
};

const SuggestionCard = ({ text, onClick }: { text: string, onClick: () => void }) => (
    <button onClick={onClick} className="text-left p-4 rounded-xl border border-gray-700/50 bg-gray-800/30 hover:bg-gray-800/80 hover:border-gray-600 transition-all text-sm text-gray-300">
        {text}
    </button>
);

export default ChatInterface;