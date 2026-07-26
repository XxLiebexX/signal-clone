'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Plus, Image as ImageIcon, Send, Clock, Trash2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface StoryItem {
  id: string;
  user_id: string;
  user: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  content?: string;
  media_url?: string;
  bg_color: string;
  expires_at: string;
  created_at: string;
}

const formatStoryDate = (dateStr: string) => {
  if (!dateStr) return 'Just now';
  const isoStr = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`;
  const date = new Date(isoStr);
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return 'Just now';
  return formatDistanceToNow(date, { addSuffix: true });
};

const BG_COLORS = [
  { label: 'Indigo', value: 'from-indigo-600 to-purple-900' },
  { label: 'Rose', value: 'from-pink-600 to-rose-900' },
  { label: 'Teal', value: 'from-[#2C6BED] to-teal-800' },
  { label: 'Emerald', value: 'from-emerald-600 to-green-900' },
  { label: 'Amber', value: 'from-amber-600 to-orange-900' },
  { label: 'Dark', value: 'from-zinc-800 to-black' },
];

export const StoriesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [selectedBg, setSelectedBg] = useState(BG_COLORS[0].value);
  const [expireHours, setExpireHours] = useState(24);
  const [mediaUrl, setMediaUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Fullscreen Viewer State
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  // Load Stories from Backend API
  const loadStories = async () => {
    try {
      const data = await api.getStories();
      setStories(data);
    } catch (err) {
      console.error('Failed to load stories', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStories();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Image Upload for Status
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await api.uploadFile(file);
      setMediaUrl(res.url);
    } catch (err) {
      console.error('Failed to upload status image', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Submit New Status
  const handleCreateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusText.trim() && !mediaUrl) return;

    try {
      await api.createStory({
        content: statusText.trim(),
        media_url: mediaUrl || undefined,
        bg_color: selectedBg,
        expire_hours: expireHours,
      });
      setStatusText('');
      setMediaUrl('');
      setShowCreator(false);
      loadStories();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete My Status
  const handleDeleteStatus = async (id: string) => {
    try {
      await api.deleteStory(id);
      loadStories();
    } catch (err) {
      console.error(err);
    }
  };

  const currentActiveStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-xl bg-[#1E1E1E] border border-[#2C2C2E] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-[#2C2C2E] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#2C6BED]" />
            <h3 className="text-base font-bold text-white">Signal Status & Stories</h3>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
              Live & Expiring
            </span>
          </div>
          <button onClick={onClose} className="text-[#8E8E93] hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Area */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Create Status Form / Button Card */}
          {showCreator ? (
            <form onSubmit={handleCreateStatus} className="bg-[#242426] border border-[#2C2C2E] rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[#2C2C2E] pb-2">
                <span className="text-xs font-bold text-white">Post New Status Update</span>
                <button type="button" onClick={() => setShowCreator(false)} className="text-xs text-[#8E8E93] hover:text-white">
                  Cancel
                </button>
              </div>

              {/* Background Color Palette Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1.5">Background Gradient</label>
                <div className="flex items-center gap-2">
                  {BG_COLORS.map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => setSelectedBg(c.value)}
                      className={`w-7 h-7 rounded-full bg-gradient-to-br ${c.value} border-2 transition ${
                        selectedBg === c.value ? 'border-white scale-110' : 'border-transparent opacity-80'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Status Duration Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#2C6BED]" /> Status Expiry Duration
                </label>
                <div className="flex gap-2">
                  {[
                    { hours: 1, label: '1 Hour' },
                    { hours: 12, label: '12 Hours' },
                    { hours: 24, label: '24 Hours' },
                  ].map((opt) => (
                    <button
                      key={opt.hours}
                      type="button"
                      onClick={() => setExpireHours(opt.hours)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                        expireHours === opt.hours
                          ? 'bg-[#2C6BED] text-white border-[#2C6BED]'
                          : 'bg-[#1C1C1E] text-[#8E8E93] border-[#2C2C2E] hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input */}
              <div>
                <textarea
                  rows={3}
                  placeholder="What's on your mind? Type a status update..."
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-[#2C2C2E] focus:border-[#2C6BED] rounded-xl p-3 text-xs text-white placeholder-[#8E8E93] focus:outline-none resize-none"
                />
              </div>

              {/* Image Preview / Attachment Button */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-[#8E8E93] hover:text-[#2C6BED] cursor-pointer">
                  <ImageIcon className="w-4 h-4 text-[#2C6BED]" />
                  <span>{mediaUrl ? 'Image Attached ✅' : 'Attach Status Image'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>

                <button
                  type="submit"
                  disabled={!statusText.trim() && !mediaUrl}
                  className="px-4 py-2 bg-[#2C6BED] hover:bg-[#3B75EE] disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-md transition"
                >
                  Post Status Update
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between p-3.5 bg-[#242426] border border-[#2C2C2E] rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={user?.display_name || 'Me'}
                    className="w-11 h-11 rounded-full object-cover border-2 border-[#2C6BED]"
                  />
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#2C6BED] rounded-full flex items-center justify-center text-white">
                    <Plus className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">My Status</div>
                  <div className="text-xs text-[#8E8E93]">Tap to upload an expiring story update</div>
                </div>
              </div>
              <button
                onClick={() => setShowCreator(true)}
                className="px-3.5 py-1.5 bg-[#2C6BED] hover:bg-[#3B75EE] text-white text-xs font-semibold rounded-xl transition shadow"
              >
                + Add Status
              </button>
            </div>
          )}

          {/* Active Stories List */}
          <div>
            <h4 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-3">
              Active Contact Status Updates ({stories.length})
            </h4>

            {stories.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {stories.map((story, idx) => {
                  const isMine = story.user_id === user?.id;

                  return (
                    <div
                      key={story.id}
                      onClick={() => setActiveStoryIndex(idx)}
                      className={`relative h-44 rounded-2xl p-3 flex flex-col justify-between bg-gradient-to-br ${story.bg_color} border border-white/10 shadow-lg cursor-pointer hover:scale-105 transition overflow-hidden group`}
                    >
                      {story.media_url && (
                        <img
                          src={story.media_url.startsWith('/') ? `http://127.0.0.1:8000${story.media_url}` : story.media_url}
                          alt="Status Attachment"
                          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition duration-500"
                        />
                      )}

                      <div className="flex items-center justify-between z-10">
                        <div className="flex items-center gap-2">
                          <img
                            src={story.user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                            alt={story.user?.display_name || 'User'}
                            className="w-7 h-7 rounded-full object-cover border-2 border-white"
                          />
                          <div className="truncate">
                            <div className="text-xs font-bold text-white leading-tight truncate">
                              {isMine ? 'You' : story.user?.display_name}
                            </div>
                            <div className="text-[10px] text-white/80">
                              {formatStoryDate(story.created_at)}
                            </div>
                          </div>
                        </div>

                        {isMine && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStatus(story.id);
                            }}
                            className="p-1 rounded-full bg-black/40 hover:bg-red-500 text-white transition"
                            title="Delete Status"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {story.content && (
                        <p className="text-xs font-semibold text-white drop-shadow-md z-10 leading-snug line-clamp-3">
                          {story.content}
                        </p>
                      )}

                      <div className="absolute inset-0 bg-black/20 rounded-2xl" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-[#8E8E93] text-xs bg-[#242426] border border-[#2C2C2E] rounded-2xl">
                No active status updates. Be the first to share a story!
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[#2C2C2E] bg-[#161618] text-center text-[11px] text-[#8E8E93]">
          🔒 Signal Status updates are end-to-end encrypted and expire automatically.
        </div>

      </div>

      {/* WhatsApp Fullscreen Story Viewer Modal */}
      {currentActiveStory && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-300">
          
          {/* Top Header Controls & Progress Bar */}
          <div className="w-full max-w-md mx-auto space-y-3 z-30">
            {/* Story Progress Bar */}
            <div className="flex gap-1 h-1 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full animate-[progress_5s_linear]" />
            </div>

            {/* Author Bar */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <img
                  src={currentActiveStory.user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                  alt={currentActiveStory.user?.display_name || 'User'}
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#2C6BED]"
                />
                <div>
                  <div className="text-sm font-bold">{currentActiveStory.user?.display_name}</div>
                  <div className="text-xs text-white/70">
                    {formatStoryDate(currentActiveStory.created_at)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveStoryIndex(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Center Story Content Card */}
          <div className="w-full max-w-md mx-auto flex-1 flex flex-col items-center justify-center relative my-4 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <div className={`w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br ${currentActiveStory.bg_color} relative`}>
              
              {currentActiveStory.media_url && (
                <img
                  src={currentActiveStory.media_url.startsWith('/') ? `http://127.0.0.1:8000${currentActiveStory.media_url}` : currentActiveStory.media_url}
                  alt="Story Content"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {currentActiveStory.content && (
                <div className="relative z-10 bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 max-w-xs">
                  <p className="text-lg font-bold text-white leading-relaxed whitespace-pre-wrap">
                    {currentActiveStory.content}
                  </p>
                </div>
              )}

              {/* Navigation Left / Right Buttons */}
              <button
                onClick={() => setActiveStoryIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : 0))}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition z-20"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={() => setActiveStoryIndex((prev) => (prev !== null && prev < stories.length - 1 ? prev + 1 : prev))}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition z-20"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Bottom Reply Bar */}
          <div className="w-full max-w-md mx-auto z-30">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2">
              <input
                type="text"
                placeholder={`Reply to ${currentActiveStory.user?.display_name}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/60 focus:outline-none"
              />
              <button
                onClick={() => {
                  setReplyText('');
                  setActiveStoryIndex(null);
                }}
                className="p-2 bg-[#2C6BED] text-white rounded-full hover:bg-[#3B75EE] transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
