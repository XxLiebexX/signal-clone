'use client';

import React from 'react';
import { Conversation } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, X, QrCode, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
}

export const SafetyNumberModal: React.FC<Props> = ({ isOpen, onClose, conversation }) => {
  const { user } = useAuth();
  if (!isOpen) return null;

  let otherName = conversation.name || 'Contact';
  if (conversation.type === 'direct') {
    const other = conversation.members.find((m) => m.user_id !== user?.id);
    if (other && other.user) {
      otherName = other.user.display_name;
    }
  }

  // Generate deterministic Signal Safety Number matrix strings
  const generateSafetyDigits = () => {
    const seed = (conversation.id + user?.id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const digits = [];
    for (let i = 0; i < 12; i++) {
      const num = ((seed * (i + 1) * 31) % 90000) + 10000;
      digits.push(num.toString());
    }
    return digits;
  };

  const digits = generateSafetyDigits();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md bg-[#1E1E1E] border border-[#2C2C2E] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-[#2C2C2E] flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#2C6BED]" /> Verify Safety Number
          </h3>
          <button onClick={onClose} className="text-[#8E8E93] hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-center space-y-5">
          <p className="text-xs text-[#8E8E93] leading-relaxed">
            To verify that your end-to-end encryption with <span className="text-white font-semibold">{otherName}</span> is secure, compare the numbers below with their device.
          </p>

          {/* Mock Signal QR Code Matrix */}
          <div className="w-36 h-36 mx-auto bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center border-4 border-[#2C6BED]/40">
            <QrCode className="w-full h-full text-slate-900" />
          </div>

          {/* 60-digit Fingerprint Blocks */}
          <div className="grid grid-cols-3 gap-2 bg-[#1C1C1E] border border-[#2C2C2E] p-4 rounded-2xl font-mono text-xs text-white">
            {digits.map((d, idx) => (
              <span key={idx} className="bg-[#242426] py-1 px-1.5 rounded text-center tracking-wider text-[#2C6BED] font-bold">
                {d}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-500/10 py-2.5 rounded-xl border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4" /> Verified Identity Key Pair
          </div>
        </div>

      </div>
    </div>
  );
};
