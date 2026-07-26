'use client';

import React, { useState, useEffect } from 'react';
import { Contact } from '@/types';
import { api } from '@/lib/api';
import { Users, X, Check, Image as ImageIcon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, memberIds: string[], avatarUrl?: string, description?: string) => Promise<void>;
}

export const CreateGroupModal: React.FC<Props> = ({ isOpen, onClose, onCreateGroup }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getContacts().then(setContacts).catch(console.error);
    }
  }, [isOpen]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onCreateGroup(name, selectedUserIds, avatarUrl || undefined, description || undefined);
      setName('');
      setDescription('');
      setAvatarUrl('');
      setSelectedUserIds([]);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md bg-[#1E1E1E] border border-[#2C2C2E] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-[#2C2C2E] flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2C6BED]" /> Create Signal Group
          </h3>
          <button onClick={onClose} className="text-[#8E8E93] hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8E8E93] mb-1">Group Name *</label>
            <input
              type="text"
              placeholder="e.g. 🚀 Crypto & Security Guild"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#2C2C2E] focus:border-[#2C6BED] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#8E8E93] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8E8E93] mb-1">Group Description</label>
            <input
              type="text"
              placeholder="What is this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#2C2C2E] focus:border-[#2C6BED] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#8E8E93] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8E8E93] mb-1">Avatar Image URL (Optional)</label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#2C2C2E] focus:border-[#2C6BED] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#8E8E93] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8E8E93] mb-2">
              Select Group Members ({selectedUserIds.length} selected)
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto border border-[#2C2C2E] rounded-xl p-2 bg-[#1C1C1E]">
              {contacts.map((c) => {
                const isSelected = selectedUserIds.includes(c.contact_user.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleUser(c.contact_user.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                      isSelected ? 'bg-[#2C6BED]/20 border border-[#2C6BED]/40' : 'hover:bg-[#2C2C2E]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={c.contact_user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                        alt={c.contact_user.display_name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="text-xs font-medium text-white">{c.contact_user.display_name}</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-[#2C6BED] border-[#2C6BED] text-white'
                          : 'border-[#8E8E93] bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full bg-[#2C6BED] hover:bg-[#3B75EE] disabled:opacity-40 text-white font-medium py-2.5 rounded-xl transition shadow-lg shadow-[#2C6BED]/20 text-xs"
          >
            Create Group
          </button>
        </form>

      </div>
    </div>
  );
};
