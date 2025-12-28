import React, { useState } from 'react';
import { X, Mail, Lock, User, ArrowRight, Check, Ghost } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (profile: UserProfile) => void;
  onGuest: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onGuest }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
        setError("Please fill in all fields.");
        return;
    }
    
    if (!isLogin && !name) {
        setError("Please provide a name.");
        return;
    }

    // SIMULATED AUTH
    const profile: UserProfile = {
        id: email.replace(/[^a-zA-Z0-9]/g, ''),
        email: email,
        name: isLogin ? email.split('@')[0] : name, 
        isGuest: false
    };

    onLogin(profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
       <div className="bg-sibo-surface w-full max-w-md rounded-2xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden relative">
          
          {!isLogin && <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>}
          
          <div className="p-8 text-center">
             <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg rotate-3">
                <span className="text-2xl font-bold text-white">S</span>
             </div>
             <h2 className="text-2xl font-bold text-white mb-2">{isLogin ? 'Welcome to SIBO' : 'Create Account'}</h2>
             <p className="text-gray-400 text-sm">
                {isLogin ? 'Sign in to sync your chats and memory.' : 'Join Codenyl\'s secure AI platform.'}
             </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 pb-4 space-y-4">
             {!isLogin && (
                 <div className="relative">
                     <User className="absolute left-3 top-3 text-gray-500" size={18} />
                     <input 
                        type="text" 
                        placeholder="Full Name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-600"
                     />
                 </div>
             )}
             <div className="relative">
                 <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
                 <input 
                    type="email" 
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-600"
                 />
             </div>
             <div className="relative">
                 <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
                 <input 
                    type="password" 
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-600"
                 />
             </div>

             {error && <div className="text-red-400 text-xs text-center">{error}</div>}

             <button type="submit" className="w-full bg-white hover:bg-gray-100 text-black font-bold py-3 rounded-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-white/10">
                 {isLogin ? 'Log In' : 'Sign Up'} <ArrowRight size={18} />
             </button>
          </form>

          <div className="px-8 pb-8 space-y-4">
              <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-700"></div>
                  <span className="flex-shrink mx-4 text-gray-500 text-xs">OR</span>
                  <div className="flex-grow border-t border-gray-700"></div>
              </div>
              
              <button 
                type="button" 
                onClick={() => { onGuest(); onClose(); }}
                className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 border border-gray-700"
              >
                  <Ghost size={18} /> Continue as Guest
              </button>
          </div>

          <div className="bg-gray-800/50 p-4 text-center text-sm text-gray-400 border-t border-gray-700">
             {isLogin ? "Don't have an account? " : "Already have an account? "}
             <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-blue-400 hover:text-blue-300 font-medium">
                 {isLogin ? 'Sign up' : 'Log in'}
             </button>
          </div>
       </div>
    </div>
  );
};

export default AuthModal;