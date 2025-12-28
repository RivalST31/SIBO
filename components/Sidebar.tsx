import React, { useEffect, useState } from 'react';
import { Settings, Plus, X, LogIn, Trash2, LogOut, Download, Smartphone } from 'lucide-react';
import { ChatSession, UserProfile } from '../types';
import { CodenylLogo } from './CodenylLogo';
import { APP_VERSION } from '../constants';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  userProfile: UserProfile | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, onClose, sessions, currentSessionId, userProfile,
  onSelectSession, onNewChat, onDeleteSession, onOpenSettings, onOpenAuth, onLogout
}) => {
  const [isApp, setIsApp] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Check if running in standalone mode (Installed)
    const checkStandalone = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
      setIsApp(isStandalone);
    };
    checkStandalone();

    // 2. Listen for the 'beforeinstallprompt' event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: any) => {
      console.log('beforeinstallprompt fired');
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstallPrompt(null);
        }
    } else {
        // Fallback instructions
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('iphone') || ua.includes('ipad')) {
             alert("To install SIBO on iOS:\n\n1. Tap the Share button in Safari\n2. Scroll down and select 'Add to Home Screen'");
        } else {
             alert("Installation is not directly supported in this browser context.\n\nPlease open this site in Chrome or Edge and look for the 'Install SIBO' icon in the address bar.");
        }
    }
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-sibo-dark/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 flex justify-between items-center gap-2">
             <div className="flex items-center gap-2 text-white font-bold tracking-wider">
                 <CodenylLogo size={24} />
                 SIBO
             </div>
            <button onClick={onClose} className="md:hidden ml-auto text-gray-400 hover:text-white">
                <X size={24} />
            </button>
        </div>

        <div className="px-3 pb-2">
            <button 
                onClick={() => { onNewChat(); onClose(); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all text-sm font-medium shadow-lg shadow-blue-900/20"
            >
                <Plus size={16} /> New Chat
            </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 no-scrollbar">
            <div>
                <div className="px-3 text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">History</div>
                {sessions.length === 0 ? (
                    <div className="px-3 text-sm text-gray-600 italic">No recent chats.</div>
                ) : (
                    <div className="space-y-1">
                        {sessions.map(session => (
                        <div key={session.id} className="group relative flex items-center">
                            <button
                                onClick={() => { onSelectSession(session.id); onClose(); }}
                                className={`flex-1 text-left px-3 py-2 rounded-lg text-sm truncate transition-colors flex items-center gap-3 ${
                                currentSessionId === session.id 
                                    ? 'bg-white/10 text-white' 
                                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                }`}
                            >
                                <span className="truncate flex-1">{session.title || 'New Conversation'}</span>
                            </button>
                            {currentSessionId === session.id && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                                    className="absolute right-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Footer / Account */}
        <div className="p-4 border-t border-white/10 space-y-1">
          
          {/* Download App Button - Always visible if not installed */}
          {!isApp && (
            <div className="mb-4">
                 <button 
                    onClick={handleInstallClick}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-gray-700 hover:bg-gray-800 text-gray-300 hover:text-white transition-all text-sm font-medium group"
                >
                    {installPrompt ? <Smartphone size={16} className="group-hover:animate-bounce" /> : <Download size={16} />} 
                    <span>{installPrompt ? 'Install App' : 'Download App'}</span>
                </button>
            </div>
          )}

          {userProfile ? (
              <div className="bg-white/5 rounded-xl p-3 mb-2">
                  <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                          {userProfile.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{userProfile.name}</div>
                          <div className="text-xs text-gray-500 truncate">{userProfile.email}</div>
                      </div>
                  </div>
                  <button 
                    onClick={onOpenSettings}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <Settings size={14} /> Settings & Personalization
                  </button>
                  <button 
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors mt-1"
                  >
                    <LogOut size={14} /> Log out
                  </button>
              </div>
          ) : (
             <div className="space-y-2">
                 <button 
                    onClick={onOpenAuth}
                    className="w-full flex items-center gap-3 px-3 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                 >
                    <LogIn size={18} />
                    <span>Log In / Sign Up</span>
                </button>
                 <button 
                    onClick={onOpenSettings}
                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-white/5 rounded-lg text-sm transition-colors"
                >
                    <Settings size={18} />
                    <span>Settings</span>
                </button>
             </div>
          )}
          
          <div className="mt-4 pt-2 border-t border-white/5 text-xs text-gray-600 flex justify-between">
              <span>© Codenyl</span>
              <span>v{APP_VERSION}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;