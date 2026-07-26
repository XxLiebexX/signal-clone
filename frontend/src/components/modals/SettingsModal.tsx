'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Settings, X, User, Sun, Moon, Shield, Bell, Smartphone, Check, LogOut } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'privacy' | 'notifications' | 'devices'>('profile');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [about, setAbout] = useState(user?.about || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateProfile({
        display_name: displayName,
        about,
        avatar_url: avatarUrl,
      });
      updateUser(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl bg-[#1E1E1E] border border-[#2C2C2E] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[75vh]">
        
        {/* Left Settings Sidebar Tabs */}
        <div className="w-full md:w-56 bg-[#161618] border-b md:border-b-0 md:border-r border-[#2C2C2E] p-3 space-y-1">
          <div className="text-xs font-bold text-[#2C6BED] uppercase px-3 py-2 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Signal Settings
          </div>

          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'appearance', label: 'Appearance', icon: Sun },
            { id: 'privacy', label: 'Privacy', icon: Shield },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'devices', label: 'Linked Devices', icon: Smartphone },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition ${
                  activeTab === tab.id
                    ? 'bg-[#2C6BED] text-white shadow-md shadow-[#2C6BED]/20'
                    : 'text-[#8E8E93] hover:bg-[#242426] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Settings Content Area */}
        <div className="flex-1 flex flex-col bg-[#1E1E1E] overflow-hidden relative">
          
          <div className="p-4 border-b border-[#2C2C2E] flex items-center justify-between">
            <h3 className="text-sm font-bold text-white capitalize">{activeTab} Settings</h3>
            <button onClick={onClose} className="text-[#8E8E93] hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={avatarUrl || user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt="Profile Avatar"
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#2C6BED]"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white">{user?.display_name}</h4>
                    <p className="text-xs text-[#8E8E93]">{user?.phone}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8E8E93] mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-[#2C2C2E] focus:border-[#2C6BED] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8E8E93] mb-1">About / Bio</label>
                  <input
                    type="text"
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-[#2C2C2E] focus:border-[#2C6BED] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8E8E93] mb-1">Avatar Image URL</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-[#2C2C2E] focus:border-[#2C6BED] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#2C6BED] hover:bg-[#3B75EE] text-white font-semibold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#2C6BED]/20"
                >
                  {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : null}
                  <span>{savedSuccess ? 'Profile Saved!' : 'Save Profile Changes'}</span>
                </button>

                <div className="pt-2 border-t border-[#2C2C2E]">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      logout();
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-semibold py-2.5 rounded-xl transition text-xs"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout Account</span>
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#242426] border border-[#2C2C2E] rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? <Moon className="w-5 h-5 text-[#2C6BED]" /> : <Sun className="w-5 h-5 text-amber-400" />}
                    <div>
                      <div className="text-xs font-semibold text-white">Theme Mode</div>
                      <div className="text-[11px] text-[#8E8E93]">Switch between Signal Dark and Light mode</div>
                    </div>
                  </div>

                  <button
                    onClick={toggleTheme}
                    className="px-4 py-1.5 bg-[#2C6BED] hover:bg-[#3B75EE] text-white font-semibold rounded-xl text-xs transition"
                  >
                    {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-4 text-xs text-[#8E8E93]">
                <div className="p-4 bg-[#242426] border border-[#2C2C2E] rounded-2xl space-y-2">
                  <div className="text-white font-semibold text-xs flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#2C6BED]" /> Sealed Sender & Cryptographic Security
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Signal technology protects message metadata. Sealed Sender prevents servers from knowing who is messaging whom.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="p-4 bg-[#242426] border border-[#2C2C2E] rounded-2xl text-xs text-white">
                <div className="font-semibold mb-1">Message Sounds & Toasts</div>
                <p className="text-[11px] text-[#8E8E93]">In-app notification sounds and visual receipts enabled.</p>
              </div>
            )}

            {activeTab === 'devices' && (
              <div className="space-y-3">
                <div className="p-4 bg-[#242426] border border-[#2C2C2E] rounded-2xl text-xs">
                  <div className="font-semibold text-white mb-1">Current Active Session</div>
                  <div className="text-[11px] text-[#8E8E93]">Signal Web App (Windows • Chrome 126)</div>
                </div>
                <button
                  type="button"
                  className="w-full bg-[#2C6BED]/20 border border-[#2C6BED]/40 text-[#2C6BED] font-semibold py-2 rounded-xl text-xs hover:bg-[#2C6BED]/30 transition"
                >
                  + Link New Device (Desktop / iPad)
                </button>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
