import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Search, X, UserPlus, MessageSquare } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
}

export const NewChatModal: React.FC<Props> = ({ isOpen, onClose, onSelectUser }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getAllUsers().then(setAllUsers).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      api.searchUsers(query)
        .then(setSearchResults)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md bg-[#1E1E1E] border border-[#2C2C2E] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-[#2C2C2E] flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#2C6BED]" /> New Conversation
          </h3>
          <button onClick={onClose} className="text-[#8E8E93] hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#2C2C2E]">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-[#8E8E93]" />
            <input
              type="text"
              placeholder="Search by name, phone or @username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#2C2C2E] focus:border-[#2C6BED] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#8E8E93] focus:outline-none"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {query.trim() ? (
            searchResults.length > 0 ? (
              searchResults.map((u) => (
                <div
                  key={u.id}
                  onClick={() => {
                    onSelectUser(u.id);
                    onClose();
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-[#2C2C2E] rounded-xl cursor-pointer transition"
                >
                  <img
                    src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={u.display_name}
                    className="w-10 h-10 rounded-full object-cover border border-[#2C2C2E]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">{u.display_name}</div>
                    <div className="text-xs text-[#8E8E93] truncate">{u.about || u.phone}</div>
                  </div>
                  <span className="text-xs bg-[#2C6BED] text-white px-2.5 py-1 rounded-lg font-semibold">
                    Start Chat
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-[#8E8E93]">No matching users found</div>
            )
          ) : (
            <>
              <div className="text-[11px] font-bold text-[#8E8E93] uppercase px-3 py-1">
                Select Contact to Chat
              </div>
              {allUsers.filter((u) => u.id !== user?.id).map((u) => (
                <div
                  key={u.id}
                  onClick={() => {
                    onSelectUser(u.id);
                    onClose();
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-[#2C2C2E] rounded-xl cursor-pointer transition group"
                >
                  <img
                    src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={u.display_name}
                    className="w-10 h-10 rounded-full object-cover border border-[#2C2C2E]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white group-hover:text-[#2C6BED] transition">
                      {u.display_name}
                    </div>
                    <div className="text-xs text-[#8E8E93] truncate">{u.phone}</div>
                  </div>
                  <span className="text-xs bg-[#2C6BED]/20 border border-[#2C6BED]/40 group-hover:bg-[#2C6BED] group-hover:text-white text-[#2C6BED] px-2.5 py-1 rounded-lg font-semibold transition">
                    Start Chat
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
