
import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import LiveMode from './components/LiveMode';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import { generateTextResponse, generateImage, generateVideo, generateTTS } from './services/geminiService';
import { ChatMessage, ChatSession, MessageRole, AppMode, UserSettings, UserProfile } from './types';
import { CodenylLogo } from './components/CodenylLogo';
import { useWakeWord } from './hooks/useWakeWord';
import { 
    PREFIX_CHATS, 
    PREFIX_SETTINGS, 
    STORAGE_KEY_CURRENT_USER, 
    DEFAULT_USER_SETTINGS,
    STORAGE_KEY_ACCOUNTS
} from './constants';

const App: React.FC = () => {
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(true); // Open auth by default
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Model State (Flash vs Pro)
  const [useProModel, setUseProModel] = useState(false);

  // Data State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);

  // --- Wake Word ---
  // Only enable if settings say so AND we are in CHAT mode (to avoid double activation in Live mode)
  const wakeEnabled = settings.enableWakeWord && mode === AppMode.CHAT && !authOpen;
  
  const { isListening: isWakeListening } = useWakeWord(
      wakeEnabled, 
      settings.wakeWord, 
      () => {
          // Triggered!
          setMode(AppMode.LIVE_VOICE);
      }
  );

  // --- Persistence Logic ---

  useEffect(() => {
    // Try to restore previous user
    const savedUserId = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (savedUserId) {
        const accountsStr = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
        if (accountsStr) {
            const accounts = JSON.parse(accountsStr);
            if (accounts[savedUserId]) {
                setCurrentUser(accounts[savedUserId]);
                setAuthOpen(false);
            }
        }
    }
  }, []);

  useEffect(() => {
      // Load Data based on user status
      if (currentUser && !currentUser.isGuest) {
          const savedChats = localStorage.getItem(PREFIX_CHATS + currentUser.id);
          if (savedChats) {
              setSessions(JSON.parse(savedChats));
          } else {
              setSessions([]);
          }
          const savedSettings = localStorage.getItem(PREFIX_SETTINGS + currentUser.id);
          if (savedSettings) {
              setSettings({ ...DEFAULT_USER_SETTINGS, ...JSON.parse(savedSettings) });
          } else {
              setSettings(DEFAULT_USER_SETTINGS);
          }
          localStorage.setItem(STORAGE_KEY_CURRENT_USER, currentUser.id);
      } else {
          // Guest or Logout state: Do NOT load persistent data
          if (!currentUser) {
              // Reset if logged out
              setSessions([]);
              setSettings(DEFAULT_USER_SETTINGS);
              setCurrentSessionId(null);
          }
      }
  }, [currentUser]);

  // Persist Data only if NOT Guest
  useEffect(() => {
      if (currentUser && !currentUser.isGuest) {
          localStorage.setItem(PREFIX_CHATS + currentUser.id, JSON.stringify(sessions));
      }
  }, [sessions, currentUser]);

  useEffect(() => {
      if (currentUser && !currentUser.isGuest) {
          localStorage.setItem(PREFIX_SETTINGS + currentUser.id, JSON.stringify(settings));
      }
  }, [settings, currentUser]);


  // --- Handlers ---

  const handleLogin = (profile: UserProfile) => {
      // Create/Update Account in "Simulated DB"
      const accountsStr = localStorage.getItem(STORAGE_KEY_ACCOUNTS) || '{}';
      const accounts = JSON.parse(accountsStr);
      accounts[profile.id] = { ...profile, isGuest: false };
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
      
      setCurrentUser(profile);
      setAuthOpen(false);
  };

  const handleGuestAccess = () => {
      setCurrentUser({
          id: 'guest',
          name: 'Guest',
          email: '',
          isGuest: true
      });
      setAuthOpen(false);
      setSessions([]);
      setCurrentSessionId(null);
  };

  const handleLogout = () => {
      setCurrentUser(null);
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      setSidebarOpen(false);
      setAuthOpen(true);
  };

  // --- Backup / Restore ---
  const handleExportData = () => {
      if (!currentUser || currentUser.isGuest) return;
      
      const backupData = {
          user: currentUser,
          settings: settings,
          sessions: sessions,
          timestamp: Date.now(),
          version: '1.0'
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sibo_backup_${currentUser.name}_${new Date().toISOString().slice(0,10)}.sibo`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleImportData = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const content = e.target?.result as string;
              const backup = JSON.parse(content);
              
              if (backup.user && backup.sessions) {
                  // Restore Logic
                  handleLogin(backup.user);
                  setSessions(backup.sessions);
                  setSettings(backup.settings || DEFAULT_USER_SETTINGS);
                  
                  // Persist immediately
                  localStorage.setItem(PREFIX_CHATS + backup.user.id, JSON.stringify(backup.sessions));
                  localStorage.setItem(PREFIX_SETTINGS + backup.user.id, JSON.stringify(backup.settings));
                  
                  alert("Backup restored successfully!");
              } else {
                  alert("Invalid backup file.");
              }
          } catch (err) {
              console.error(err);
              alert("Failed to parse backup file.");
          }
      };
      reader.readAsText(file);
  };


  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession.id;
  };

  const deleteSession = (id: string) => {
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
          setCurrentSessionId(null);
      }
  };

  const updateSession = (sessionId: string, newMessage: ChatMessage) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const title = s.messages.length === 0 && newMessage.role === MessageRole.USER 
          ? newMessage.text.slice(0, 30) + (newMessage.text.length > 30 ? '...' : '')
          : s.title;
        return { ...s, title, messages: [...s.messages, newMessage] };
      }
      return s;
    }));
  };

  const handleRegenerate = async () => {
      const session = sessions.find(s => s.id === currentSessionId);
      if (!session || session.messages.length === 0) return;

      const lastMsg = session.messages[session.messages.length - 1];
      let messagesToKeep = session.messages;
      let lastUserText = '';
      
      if (lastMsg.role === MessageRole.MODEL) {
          messagesToKeep = session.messages.slice(0, -1);
          const previousUserMsg = messagesToKeep[messagesToKeep.length - 1];
          if (previousUserMsg && previousUserMsg.role === MessageRole.USER) {
              lastUserText = previousUserMsg.text;
          }
      } else {
          lastUserText = lastMsg.text;
      }

      if (!lastUserText) return;

      setSessions(prev => prev.map(s => {
          if (s.id === currentSessionId) {
              return { ...s, messages: messagesToKeep };
          }
          return s;
      }));

      setIsProcessing(true);
      try {
           const history = [...messagesToKeep];
           const historyForApi = history.slice(0, -1); 
           
           const response = await generateTextResponse(
              historyForApi, 
              lastUserText, 
              [], 
              [], 
              useProModel || settings.enableThinking,
              true,
              `${settings.systemInstructions}\nResponse Style: ${settings.responseStyle || 'normal'}`
          );
          updateSession(currentSessionId!, response);

      } catch (e) {
          console.error(e);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleSendMessage = async (text: string, images: string[], videos: string[], type: 'text' | 'image-gen' | 'video-gen') => {
    let activeId = currentSessionId;
    if (!activeId) {
      activeId = createNewChat();
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      text: text || (type === 'image-gen' ? 'Generate image...' : type === 'video-gen' ? 'Generate video...' : 'Sent media'),
      timestamp: Date.now(),
      images: images,
      videos: videos
    };

    updateSession(activeId!, userMsg);
    setIsProcessing(true);

    try {
      if (type === 'image-gen') {
          const base64Image = await generateImage(text);
          const modelMsg: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: MessageRole.MODEL,
              text: `Here is your image for "${text}"`,
              timestamp: Date.now(),
              images: base64Image ? [base64Image] : []
          };
          updateSession(activeId!, modelMsg);

      } else if (type === 'video-gen') {
          const videoUri = await generateVideo(text);
          const modelMsg: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: MessageRole.MODEL,
              text: `Here is your video for "${text}"`,
              timestamp: Date.now(),
              videos: videoUri ? [videoUri] : []
          };
          updateSession(activeId!, modelMsg);

      } else {
          const session = sessions.find(s => s.id === activeId);
          const history = session ? [...session.messages] : [];
          
          const response = await generateTextResponse(
              history, 
              text, 
              images, 
              videos,
              useProModel || settings.enableThinking, 
              true,
              `${settings.systemInstructions}\nResponse Style: ${settings.responseStyle || 'normal'}`
          );
          updateSession(activeId!, response);
      }
    } catch (e) {
      console.error(e);
      updateSession(activeId!, {
        id: Date.now().toString(),
        role: MessageRole.MODEL,
        text: "I encountered an error processing your request.",
        timestamp: Date.now()
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentMessages = () => {
    const session = sessions.find(s => s.id === currentSessionId);
    return session ? session.messages : [];
  };

  return (
    // Use h-[100dvh] for mobile viewport fix
    <div className="flex h-[100dvh] w-full overflow-hidden bg-sibo-dark font-sans relative">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        userProfile={currentUser}
        onSelectSession={setCurrentSessionId}
        onNewChat={createNewChat}
        onDeleteSession={deleteSession}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        onLogout={handleLogout}
      />
      
      {sidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/60 z-50 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col relative w-full h-full">
        {/* Header - Fixed z-index and positioning */}
        <header className="absolute top-0 left-0 right-0 z-40 h-16 flex items-center justify-between px-4 pointer-events-none">
           {/* Gradient background separate from interactions */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent pointer-events-none"></div>

          <button 
            onClick={() => setSidebarOpen(true)}
            className="pointer-events-auto text-gray-200 hover:text-white p-3 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-colors border border-white/5"
            aria-label="Open Menu"
          >
            <Menu size={24} />
          </button>
          
          {/* Mobile centered branding */}
          <div className="pointer-events-auto flex items-center gap-2 md:hidden">
               <CodenylLogo size={24} />
               <span className="font-bold text-white tracking-wide text-sm">SIBO</span>
          </div>
          
          <div className="w-10"></div>
        </header>

        {/* Main Content */}
        <div className="flex-1 relative overflow-hidden h-full">
            <ChatInterface 
                messages={getCurrentMessages()}
                userProfile={currentUser}
                onSendMessage={handleSendMessage}
                onStartVoiceMode={() => setMode(AppMode.LIVE_VOICE)}
                isProcessing={isProcessing}
                useProModel={useProModel}
                onToggleModel={setUseProModel}
                onRegenerate={handleRegenerate}
                voiceName={settings.voiceName}
                autoReadResponse={settings.autoReadResponse}
            />
        </div>
      </div>

      {mode === AppMode.LIVE_VOICE && (
          <LiveMode 
            onClose={() => setMode(AppMode.CHAT)}
            voiceName={settings.voiceName}
          />
      )}

      <SettingsModal 
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={(newSettings) => setSettings(newSettings)}
        onExport={handleExportData}
        onImport={handleImportData}
        isGuest={currentUser?.isGuest || false}
      />

      <AuthModal 
        isOpen={authOpen}
        onClose={() => { if(currentUser) setAuthOpen(false); }} 
        onLogin={handleLogin}
        onGuest={handleGuestAccess}
      />
    </div>
  );
};

export default App;
