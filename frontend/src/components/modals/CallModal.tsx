'use client';

import React, { useState, useEffect } from 'react';
import { Conversation } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Shield, Volume2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  isVideo: boolean;
}

export const CallModal: React.FC<Props> = ({ isOpen, onClose, conversation, isVideo }) => {
  const { user } = useAuth();
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(!isVideo);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  let title = conversation.name;
  let avatarUrl = conversation.avatar_url;

  if (conversation.type === 'direct') {
    const other = conversation.members.find((m) => m.user_id !== user?.id);
    if (other && other.user) {
      title = other.user.display_name;
      avatarUrl = other.user.avatar_url;
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 select-none">
      <div className="w-full max-w-2xl bg-[#121212] border border-[#2C2C2E] rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[75vh] relative">
        
        {/* Top Header */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#2C6BED]" />
            <span className="text-xs font-semibold text-white">Signal Encrypted Call</span>
          </div>
          <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
            {formatDuration(callDuration)}
          </div>
        </div>

        {/* Call View Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-[#1C1C1E] to-[#121212]">
          {!videoOff ? (
            /* Simulated Video Stream */
            <div className="w-full h-full relative">
              <img
                src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800'}
                alt={title || 'Call'}
                className="w-full h-full object-cover filter brightness-75"
              />
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
              
              {/* Remote Participant Overlay */}
              <div className="absolute center inset-0 flex flex-col items-center justify-center text-center">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#2C6BED] shadow-2xl shadow-[#2C6BED]/40 mb-4 animate-pulse-glow">
                  <img src={avatarUrl || ''} alt={title || ''} className="w-full h-full object-cover" />
                </div>
                <h2 className="text-xl font-bold text-white shadow-sm">{title}</h2>
                <p className="text-xs text-white/80 mt-1 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-[#2C6BED] animate-pulse" /> Speaking...
                </p>
              </div>

              {/* Self Camera Preview PiP */}
              <div className="absolute bottom-4 right-4 w-32 h-44 rounded-2xl border-2 border-white/20 overflow-hidden bg-[#242426] shadow-2xl">
                <img
                  src={user?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300'}
                  alt="You"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded">You</span>
              </div>
            </div>
          ) : (
            /* Audio Mode Waveform Visualizer */
            <div className="flex flex-col items-center text-center p-8">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#2C6BED] shadow-2xl shadow-[#2C6BED]/30">
                  <img src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'} alt={title || ''} className="w-full h-full object-cover" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
              <p className="text-xs text-[#8E8E93] mb-8">Signal Audio Call</p>

              {/* Audio Wave Bars */}
              <div className="flex items-center gap-1.5 h-10 my-4">
                <div className="w-1.5 bg-[#2C6BED] rounded-full animate-wave-1" />
                <div className="w-1.5 bg-[#2C6BED] rounded-full animate-wave-2" />
                <div className="w-1.5 bg-[#2C6BED] rounded-full animate-wave-3" />
                <div className="w-1.5 bg-[#2C6BED] rounded-full animate-wave-4" />
                <div className="w-1.5 bg-[#2C6BED] rounded-full animate-wave-2" />
                <div className="w-1.5 bg-[#2C6BED] rounded-full animate-wave-1" />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Call Control Bar */}
        <div className="p-6 bg-[#1E1E1E] border-t border-[#2C2C2E] flex items-center justify-center gap-6">
          {/* Mute Mic */}
          <button
            onClick={() => setMicMuted(!micMuted)}
            className={`p-4 rounded-2xl transition shadow-lg ${
              micMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white'
            }`}
          >
            {micMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Toggle Video */}
          <button
            onClick={() => setVideoOff(!videoOff)}
            className={`p-4 rounded-2xl transition shadow-lg ${
              videoOff
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white'
            }`}
          >
            {videoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={onClose}
            className="p-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white transition shadow-xl shadow-red-600/30 scale-110"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>

      </div>
    </div>
  );
};
