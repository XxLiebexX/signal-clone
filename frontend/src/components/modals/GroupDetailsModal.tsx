'use client';

import React, { useState, useEffect } from 'react';
import { Conversation, Contact } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Users, X, Shield, UserPlus, UserMinus, LogOut } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  onRefreshConversation: () => void;
}

export const GroupDetailsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  conversation,
  onRefreshConversation,
}) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedAddUser, setSelectedAddUser] = useState<string>('');

  const currentMember = conversation.members.find((m) => m.user_id === user?.id);
  const isAdmin = currentMember?.role === 'admin';

  useEffect(() => {
    if (isOpen) {
      api.getContacts().then(setContacts).catch(console.error);
    }
  }, [isOpen]);

  const handleAddMember = async () => {
    if (!selectedAddUser) return;
    try {
      await api.addGroupMember(conversation.id, selectedAddUser);
      setSelectedAddUser('');
      onRefreshConversation();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    try {
      await api.removeGroupMember(conversation.id, targetUserId);
      onRefreshConversation();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const nonMembers = contacts.filter(
    (c) => !conversation.members.some((m) => m.user_id === c.contact_user.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md bg-[#1E1E1E] border border-[#2C2C2E] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-[#2C2C2E] flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2C6BED]" /> Group Info
          </h3>
          <button onClick={onClose} className="text-[#8E8E93] hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Avatar & Title */}
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-[#2C6BED]/20 border-2 border-[#2C6BED] flex items-center justify-center mb-3">
              {conversation.avatar_url ? (
                <img src={conversation.avatar_url} alt={conversation.name || 'Group'} className="w-full h-full object-cover" />
              ) : (
                <Users className="w-10 h-10 text-[#2C6BED]" />
              )}
            </div>
            <h2 className="text-lg font-bold text-white">{conversation.name}</h2>
            <p className="text-xs text-[#8E8E93] mt-1">{conversation.description || 'No description provided'}</p>
          </div>

          {/* Add Member Section (Admin) */}
          {isAdmin && nonMembers.length > 0 && (
            <div className="p-3 bg-[#242426] border border-[#2C2C2E] rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-[#2C6BED] flex items-center gap-1">
                <UserPlus className="w-4 h-4" /> Add Member to Group
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedAddUser}
                  onChange={(e) => setSelectedAddUser(e.target.value)}
                  className="flex-1 bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="">Select a contact...</option>
                  {nonMembers.map((c) => (
                    <option key={c.id} value={c.contact_user.id}>
                      {c.contact_user.display_name} ({c.contact_user.phone})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedAddUser}
                  className="bg-[#2C6BED] hover:bg-[#3B75EE] disabled:opacity-40 text-white font-medium px-3 py-1.5 rounded-xl text-xs transition"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Member List */}
          <div>
            <div className="text-xs font-bold text-[#8E8E93] uppercase mb-2">
              Group Members ({conversation.members.length})
            </div>
            <div className="space-y-1">
              {conversation.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#242426]/60 border border-[#2C2C2E]"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={m.user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt={m.user?.display_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <span>{m.user?.display_name}</span>
                        {m.user_id === user?.id && <span className="text-[10px] text-[#8E8E93]">(You)</span>}
                      </div>
                      <div className="text-[10px] text-[#8E8E93]">{m.user?.phone}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {m.role === 'admin' ? (
                      <span className="text-[10px] bg-[#2C6BED]/20 border border-[#2C6BED]/40 text-[#2C6BED] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Admin
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#8E8E93]">Member</span>
                    )}

                    {(isAdmin || m.user_id === user?.id) && m.user_id !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leave Group Action */}
          <button
            onClick={() => {
              if (user) handleRemoveMember(user.id);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-semibold py-2.5 rounded-xl transition text-xs"
          >
            <LogOut className="w-4 h-4" /> Leave Group
          </button>
        </div>

      </div>
    </div>
  );
};
