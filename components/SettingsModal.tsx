
import React, { useState, useRef } from 'react';
import { X, User, Volume2, Cpu, Save, Code, Download, Upload, Shield, Mic, Palette } from 'lucide-react';
import { UserSettings } from '../types';
import { CodenylLogo } from './CodenylLogo';
import { APP_VERSION } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  isGuest: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, settings, onSave, onExport, onImport, isGuest 
}) => {
  const [formData, setFormData] = useState<UserSettings>(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          onImport(e.target.files[0]);
          onClose();
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-sibo-surface w-full max-w-lg rounded-2xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Settings</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            
            {/* Backup & Restore Section */}
            {!isGuest && (
                <section className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                    <h3 className="flex items-center gap-2 text-blue-300 font-semibold mb-3 text-sm uppercase tracking-wider">
                        <Shield size={16} /> Data & Backup
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">
                        SIBO is serverless. To keep your data safe or move it to another device, use backups.
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={onExport}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                            <Download size={16} /> Backup Data
                        </button>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-gray-600"
                        >
                            <Upload size={16} /> Restore Backup
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept=".sibo" 
                            className="hidden" 
                            onChange={handleFileChange}
                        />
                    </div>
                </section>
            )}

            {/* Personalization Section */}
            <section>
                <h3 className="flex items-center gap-2 text-gray-300 font-semibold mb-4 text-sm uppercase tracking-wider">
                    <User size={16} /> Personalization
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">About You & Instructions</label>
                        <textarea 
                            value={formData.systemInstructions}
                            onChange={e => setFormData({...formData, systemInstructions: e.target.value})}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-20 resize-none"
                            placeholder="e.g. I am a student. Explain like I'm 5."
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Response Style</label>
                        <select 
                            value={formData.responseStyle || 'normal'}
                            onChange={e => setFormData({...formData, responseStyle: e.target.value})}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 outline-none"
                        >
                            <option value="normal">Normal (Balanced)</option>
                            <option value="concise">Concise (Short & Direct)</option>
                            <option value="detailed">Detailed (In-depth)</option>
                            <option value="witty">Witty (Fun & Casual)</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Voice & Assistant */}
            <section>
                <h3 className="flex items-center gap-2 text-purple-400 font-semibold mb-4 text-sm uppercase tracking-wider">
                    <Volume2 size={16} /> Voice & Assistant
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                         <div className="flex flex-col">
                             <span className="text-sm text-gray-300 font-medium">Wake Word Detection</span>
                             <span className="text-xs text-gray-500">Say "{formData.wakeWord || 'SIBO'}" to start Live Mode</span>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={formData.enableWakeWord}
                                onChange={e => setFormData({...formData, enableWakeWord: e.target.checked})}
                                className="sr-only peer" 
                            />
                            <div className="w-10 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                     </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm text-gray-300 mb-1">Voice</label>
                            <select 
                                value={formData.voiceName}
                                onChange={e => setFormData({...formData, voiceName: e.target.value})}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-purple-500 outline-none"
                            >
                                <option value="Kore">Kore (Relaxed)</option>
                                <option value="Fenrir">Fenrir (Deep)</option>
                                <option value="Puck">Puck (Energetic)</option>
                                <option value="Aoede">Aoede (Warm)</option>
                            </select>
                         </div>
                         <div>
                            <label className="block text-sm text-gray-300 mb-1">Wake Word</label>
                            <div className="relative">
                                <Mic size={14} className="absolute left-3 top-3 text-gray-500" />
                                <input 
                                    type="text"
                                    value={formData.wakeWord}
                                    onChange={e => setFormData({...formData, wakeWord: e.target.value})}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 pl-8 text-sm text-white focus:border-purple-500 outline-none"
                                />
                            </div>
                         </div>
                    </div>
                    <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                         <div className="flex flex-col">
                             <span className="text-sm text-gray-300 font-medium">Auto-Read Responses</span>
                             <span className="text-xs text-gray-500">Read new messages aloud automatically</span>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={formData.autoReadResponse}
                                onChange={e => setFormData({...formData, autoReadResponse: e.target.checked})}
                                className="sr-only peer" 
                            />
                            <div className="w-10 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                     </div>
                </div>
            </section>

            {/* About App */}
            <section className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 text-white font-semibold text-sm uppercase tracking-wider">
                        <Code size={16} /> About SIBO
                    </h3>
                    <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">v{APP_VERSION}</span>
                </div>
                <div className="flex items-start gap-4">
                    <div className="mt-1">
                        <CodenylLogo size={48} />
                    </div>
                    <div>
                        <h4 className="text-white font-medium">Codenyl</h4>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                            Built by <strong>Aaradhy Mishra</strong>. SIBO focuses on privacy, speed, and helpfulness without ads or tracking.
                        </p>
                    </div>
                </div>
            </section>

        </div>

        <div className="p-6 border-t border-gray-700">
            <button 
                onClick={() => { onSave(formData); onClose(); }}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
                <Save size={18} /> Save Changes
            </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
