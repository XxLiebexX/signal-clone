'use client';

import React, { useState, useEffect } from 'react';
import { Message } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { Check, CheckCheck, Reply, Smile, Timer, FileText, Download, Play, Mic, Volume2 } from 'lucide-react';

interface Props {
  message: Message;
  isGroup?: boolean;
  onReply: (msg: Message) => void;
  onAddReaction: (msgId: string, emoji: string) => void;
}

const QUICK_EMOJI_LIST = ['❤️', '👍', '👎', '😂', '😮', '🔥', '💩'];
const FULL_EMOJI_CATALOG = [
  '❤️', '👍', '👎', '😂', '😮', '🔥', '💩', '🎉', '🔒', '🛡️', '🚀', '✨',
  '🙌', '💯', '😍', '👏', '🙏', '🥳', '😎', '💡', '💬', '👀', '🤯', '🤝',
  '⭐', '💥', '🎯', '⚡', '🏆', '🍕', '☕', '❤️‍🔥', '✅', '❌'
];

export const MessageBubble: React.FC<Props> = ({ message, isGroup, onReply, onAddReaction }) => {
  const { user } = useAuth();
  const isMine = message.sender_id === user?.id;
  const isSystem = message.message_type === 'system';
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Disappearing timer countdown animation
  useEffect(() => {
    if (!message.expires_at) return;

    const updateTimer = () => {
      const expiry = new Date(message.expires_at!).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [message.expires_at]);

  if (isSystem) {
    return (
      <div className="flex justify-center my-3 px-4">
        <div className="bg-[#242426] border border-[#2C2C2E] text-[#8E8E93] text-xs px-3 py-1.5 rounded-full text-center max-w-md shadow-sm">
          🔒 {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex flex-col my-1.5 ${
        isMine ? 'items-end' : 'items-start'
      }`}
    >
      {/* Expanded Emoji Popover */}
      {showFullPicker && (
        <div
          className={`absolute -top-36 ${
            isMine ? 'right-2' : 'left-2'
          } bg-[#242426] border border-[#2C2C2E] rounded-2xl p-2.5 shadow-2xl z-30 grid grid-cols-7 gap-1 max-w-[280px]`}
        >
          {FULL_EMOJI_CATALOG.map((e) => (
            <button
              key={e}
              onClick={() => {
                onAddReaction(message.id, e);
                setShowFullPicker(false);
              }}
              className="text-base p-1.5 hover:bg-[#2C2C2E] hover:scale-125 rounded-xl transition text-center"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Quick Reaction Toolbar on Hover */}
      <div
        className={`absolute -top-7 ${
          isMine ? 'right-2' : 'left-2'
        } hidden group-hover:flex items-center gap-1 bg-[#1E1E1E] border border-[#2C2C2E] rounded-full px-2 py-1 shadow-xl z-20 transition-all`}
      >
        {QUICK_EMOJI_LIST.map((e) => (
          <button
            key={e}
            onClick={() => onAddReaction(message.id, e)}
            className="hover:scale-125 transition-transform text-sm p-0.5"
          >
            {e}
          </button>
        ))}
        
        {/* Plus Button to open full 30+ emoji picker */}
        <button
          type="button"
          onClick={() => setShowFullPicker(!showFullPicker)}
          className="hover:scale-125 text-xs text-[#8E8E93] hover:text-[#2C6BED] font-bold p-0.5 px-1 bg-[#242426] rounded-full transition"
          title="More Emojis"
        >
          +
        </button>

        <button
          onClick={() => onReply(message)}
          className="text-[#8E8E93] hover:text-white p-1 ml-1 border-l border-[#2C2C2E]"
          title="Reply"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Message Bubble */}
      <div
        className={`relative max-w-[80%] sm:max-w-[70%] rounded-2xl p-3 shadow-md transition-all ${
          isMine
            ? 'bg-[#2C6BED] text-white rounded-tr-none'
            : 'bg-[#262628] text-white rounded-tl-none border border-[#2C2C2E]'
        }`}
      >
        {/* Sender Name in Group Chat ONLY */}
        {isGroup && !isMine && message.sender && (
          <div className="text-[11px] font-semibold text-[#2C6BED] mb-1">
            {message.sender.display_name}
          </div>
        )}

        {/* Quoted Message Card */}
        {message.reply_to_id && message.reply_to_content && (
          <div
            className={`mb-2 p-2 rounded-lg text-xs border-l-4 ${
              isMine
                ? 'bg-black/20 border-white/60 text-white/90'
                : 'bg-[#1C1C1E] border-[#2C6BED] text-[#8E8E93]'
            }`}
          >
            <div className="font-semibold text-[10px] mb-0.5">
              {message.reply_to_sender_name || 'Replied Message'}
            </div>
            <div className="truncate">{message.reply_to_content}</div>
          </div>
        )}

        {/* Media Attachments */}
        {message.message_type === 'image' && message.media_url && (
          <div className="mb-2 rounded-xl overflow-hidden max-h-60 border border-black/10">
            <img
              src={message.media_url.startsWith('/') ? `http://localhost:8000${message.media_url}` : message.media_url}
              alt="Media"
              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
            />
          </div>
        )}

        {message.message_type === 'file' && message.media_url && (
          <a
            href={
              message.media_url.startsWith('/')
                ? `http://127.0.0.1:8000${message.media_url}`
                : message.media_url
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2.5 bg-black/30 hover:bg-black/40 rounded-xl mb-2 border border-white/10 transition group/file cursor-pointer"
            title="Click to Open PDF / Document"
          >
            <div className="w-9 h-9 rounded-xl bg-[#2C6BED]/20 border border-[#2C6BED]/40 flex items-center justify-center text-[#2C6BED] flex-shrink-0 group-hover/file:scale-110 transition">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <div className="font-semibold text-white truncate underline-offset-2 group-hover/file:underline">
                {message.content || 'Document.pdf'}
              </div>
              <div className="text-[10px] text-white/70 flex items-center gap-1 mt-0.5">
                <span>PDF Document</span>
                <span>• Click to View</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex-shrink-0">
              <Download className="w-4 h-4" />
            </div>
          </a>
        )}

        {/* Audio / Voice Note Message */}
        {message.message_type === 'audio' && (
          <div className="flex flex-col gap-1.5 p-1 mb-1">
            <div className="flex items-center gap-3 bg-black/20 p-2.5 rounded-2xl border border-white/10">
              <div className="w-9 h-9 rounded-full bg-[#2C6BED] flex items-center justify-center text-white flex-shrink-0 shadow">
                <Mic className="w-4 h-4" />
              </div>
              
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  {[40, 70, 30, 90, 60, 100, 50, 80, 40, 60, 90, 50, 70, 30].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className={`w-1 rounded-full ${isMine ? 'bg-white/80' : 'bg-[#2C6BED]'} min-h-[6px] max-h-5`}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-mono opacity-80 flex items-center gap-1">
                  <Volume2 className="w-3 h-3" /> Voice Note
                </span>
              </div>
            </div>

            {message.media_url && (
              <audio
                controls
                src={message.media_url.startsWith('/') ? `http://127.0.0.1:8000${message.media_url}` : message.media_url}
                className="w-full h-8 rounded-xl opacity-90 filter invert"
              />
            )}
          </div>
        )}

        {/* Message Text Content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>

        {/* Footer: Timestamp, Disappearing Timer, Ticks */}
        <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] opacity-80 select-none">
          {timeLeft !== null && (
            <span className="flex items-center gap-0.5 text-amber-300 font-mono">
              <Timer className="w-3 h-3 animate-spin" />
              {timeLeft}s
            </span>
          )}
          <span>{format(new Date(message.created_at), 'h:mm a')}</span>

          {isMine && (
            <span className="ml-0.5">
              {message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-white" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="w-3.5 h-3.5 text-white/70" />
              ) : (
                <Check className="w-3.5 h-3.5 text-white/70" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Grouped Reactions Bar with Names Tooltip */}
      {message.reactions && message.reactions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1 z-10">
          {Object.entries(
            message.reactions.reduce((acc, r) => {
              if (!acc[r.emoji]) acc[r.emoji] = [];
              acc[r.emoji].push(r);
              return acc;
            }, {} as Record<string, typeof message.reactions>)
          ).map(([emoji, rList]) => {
            const hasMyReaction = rList.some((r) => r.user_id === user?.id);
            const userNames = rList.map((r) => (r.user_id === user?.id ? 'You' : r.user_name || 'User')).join(', ');

            return (
              <div key={emoji} className="relative group/reaction">
                <button
                  type="button"
                  onClick={() => onAddReaction(message.id, emoji)}
                  className={`rounded-full px-2.5 py-0.5 text-xs flex items-center gap-1.5 transition shadow-md border ${
                    hasMyReaction
                      ? 'bg-[#2C6BED]/20 border-[#2C6BED] text-white font-semibold'
                      : 'bg-[#242426] border-[#2C2C2E] text-[#8E8E93] hover:bg-[#2C2C2E] hover:text-white'
                  }`}
                  title={`Reacted by: ${userNames}`}
                >
                  <span>{emoji}</span>
                  <span className="text-[11px] font-bold">{rList.length}</span>
                </button>

                {/* Reaction Users Names Tooltip on Hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/reaction:flex flex-col items-center z-30 pointer-events-none min-w-max">
                  <div className="bg-[#1C1C1E] border border-[#2C2C2E] text-white text-[11px] px-2.5 py-1 rounded-xl shadow-2xl flex items-center gap-1.5">
                    <span className="font-semibold text-[#2C6BED]">{emoji}</span>
                    <span>{userNames}</span>
                  </div>
                  <div className="w-2 h-2 bg-[#1C1C1E] border-r border-b border-[#2C2C2E] rotate-45 -mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
