'use client';

import React, { useState } from 'react';
import { Conversation, User } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { ConversationItem } from './ConversationItem';
import { Search, Plus, Users, Settings, Shield, UserCircle, LogOut, X, Sparkles } from 'lucide-react';

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  onSelectConversation: (id: string) => void;
  onOpenNewChat: () => void;
  onOpenCreateGroup: () => void;
  onOpenSettings: () => void;
  onOpenStories: () => void;
  typingState: Record<string, string>; // conversation_id -> typing user name
}

export const Sidebar: React.FC<Props> = ({
  conversations,
  selectedId,
  onSelectConversation,
  onOpenNewChat,
  onOpenCreateGroup,
  onOpenSettings,
  onOpenStories,
  typingState,
}) => {
  const { user, logout, switchUser, allDemoUsers } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'groups'>('all');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  // Filter conversations based on search & active tab
  const filteredConversations = conversations.filter((c) => {
    let name = c.name || '';
    if (c.type === 'direct') {
      const other = c.members.find((m) => m.user_id !== user?.id);
      if (other && other.user) {
        name = other.user.display_name;
      }
    }

    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.last_message?.content || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === 'unread') return c.unread_count > 0;
    if (filterTab === 'groups') return c.type === 'group';
    return true;
  });

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col h-full bg-[#1E1E1E] border-r border-[#2C2C2E] flex-shrink-0 select-none">
      
      {/* Top Header */}
      <div className="p-4 border-b border-[#2C2C2E] flex items-center justify-between">
        {/* User Profile / Quick Account Switcher Menu */}
        <div className="relative">
          <button
            onClick={() => setShowAccountDropdown(!showAccountDropdown)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[#2C2C2E] transition-all text-left"
          >
            <div className="relative">
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt={user?.display_name || 'Me'}
                className="w-9 h-9 rounded-full object-cover border border-[#2C6BED]"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#1E1E1E]" />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-white leading-tight truncate max-w-[120px]">
                {user?.display_name}
              </div>
              <div className="text-[11px] text-[#8E8E93] truncate">{user?.phone}</div>
            </div>
          </button>

          {/* Account Switcher Dropdown */}
          {showAccountDropdown && (
            <div className="absolute left-0 mt-2 w-64 bg-[#242426] border border-[#2C2C2E] rounded-xl shadow-2xl z-50 p-2">
              <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider px-3 py-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#2C6BED]" /> Switch Demo User
              </div>
              <div className="space-y-1 my-1">
                {allDemoUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      switchUser(u);
                      setShowAccountDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left text-xs transition ${
                      u.id === user?.id
                        ? 'bg-[#2C6BED]/20 text-[#2C6BED] font-semibold'
                        : 'hover:bg-[#2C2C2E] text-white'
                    }`}
                  >
                    <img src={u.avatar_url || ''} alt={u.display_name} className="w-6 h-6 rounded-full object-cover" />
                    <span className="truncate flex-1">{u.display_name}</span>
                    {u.id === user?.id && <span className="text-[10px] bg-[#2C6BED] text-white px-1.5 py-0.5 rounded">Active</span>}
                  </button>
                ))}
              </div>
              <div className="border-t border-[#2C2C2E] mt-2 pt-2">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenStories}
            title="Signal Stories"
            className="p-2 rounded-xl text-[#8E8E93] hover:text-[#2C6BED] hover:bg-[#2C6BED]/10 transition"
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenNewChat}
            title="New Direct Message"
            className="p-2 rounded-xl text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E] transition"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenCreateGroup}
            title="New Group"
            className="p-2 rounded-xl text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E] transition"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenSettings}
            title="Signal Settings"
            className="p-2 rounded-xl text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E] transition"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={logout}
            title="Logout"
            className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-[#8E8E93]" />
          <input
            type="text"
            placeholder="Search Signal chats & contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1C1C1E] border border-[#2C2C2E] focus:border-[#2C6BED] rounded-xl pl-10 pr-8 py-2 text-xs text-white placeholder-[#8E8E93] focus:outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-[#8E8E93] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3">
          {(['all', 'unread', 'groups'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${
                filterTab === tab
                  ? 'bg-[#2C6BED] text-white shadow-md shadow-[#2C6BED]/20'
                  : 'bg-[#242426] text-[#8E8E93] hover:bg-[#2C2C2E] hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto space-y-1 py-1">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((c) => (
            <ConversationItem
              key={c.id}
              conversation={c}
              isSelected={c.id === selectedId}
              onSelect={() => onSelectConversation(c.id)}
              typingText={typingState[c.id]}
            />
          ))
        ) : (
          <div className="p-8 text-center text-[#8E8E93] text-xs">
            No conversations found. Click <span className="text-[#2C6BED] font-semibold">+</span> to start a new chat!
          </div>
        )}
      </div>

      {/* Footer Privacy Badge */}
      <div className="p-3 border-t border-[#2C2C2E] bg-[#1C1C1E]/50 flex items-center justify-center gap-2 text-[11px] text-[#8E8E93]">
        <Shield className="w-3.5 h-3.5 text-[#2C6BED]" />
        <span>Signal Encrypted Messaging</span>
      </div>
    </div>
  );
};
