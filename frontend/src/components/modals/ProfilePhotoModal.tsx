'use client';

import React, { useState } from 'react';
import { X, Sparkles, User, Phone, Shield, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { User as UserType } from '@/types';

interface Props {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenStatus?: () => void;
}

export const ProfilePhotoModal: React.FC<Props> = ({ user, isOpen, onClose, onOpenStatus }) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#1E1E1E] border border-[#2C2C2E] rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center p-6 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-white transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Large Profile Avatar Frame */}
        <div className="relative mb-4 group cursor-pointer">
          <div className="w-40 h-40 rounded-full p-1 bg-gradient-to-tr from-[#2C6BED] via-purple-500 to-emerald-400 shadow-2xl">
            <img
              src={user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400'}
              alt={user.display_name}
              className="w-full h-full rounded-full object-cover border-4 border-[#1E1E1E]"
            />
          </div>
          <div className="absolute bottom-2 right-2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#1E1E1E]" title="Online" />
        </div>

        {/* User Details */}
        <h3 className="text-xl font-bold text-white mb-0.5">{user.display_name}</h3>
        <p className="text-xs text-[#2C6BED] font-mono mb-2">{user.phone}</p>
        <p className="text-xs text-[#8E8E93] text-center max-w-xs mb-6 italic">
          "{user.about || 'Hey there! I am using Signal.'}"
        </p>

        {/* Action Buttons: View Status & View Profile Photo */}
        <div className="w-full space-y-2.5">
          {onOpenStatus && (
            <button
              onClick={() => {
                onClose();
                onOpenStatus();
              }}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-[#2C6BED] hover:bg-[#3B75EE] text-white font-semibold text-xs rounded-2xl transition shadow-lg shadow-[#2C6BED]/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>View Status Update</span>
            </button>
          )}

          <a
            href={user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800'}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-[#242426] border border-[#2C2C2E] hover:bg-[#2C2C2E] text-white font-semibold text-xs rounded-2xl transition"
          >
            <ImageIcon className="w-4 h-4 text-[#2C6BED]" />
            <span>Open Full HD Profile Photo</span>
          </a>
        </div>

        {/* Footer E2EE Security Badge */}
        <div className="mt-5 pt-3 border-t border-[#2C2C2E] w-full flex items-center justify-center gap-1.5 text-[10px] text-[#8E8E93]">
          <Shield className="w-3.5 h-3.5 text-[#2C6BED]" />
          <span>Verified End-to-End Encrypted Contact</span>
        </div>

      </div>
    </div>
  );
};
