'use client';

import React from 'react';
import { Conversation } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import { Image as ImageIcon, FileText, Timer, Users, Check, CheckCheck } from 'lucide-react';

interface Props {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  typingText?: string | null;
}

export const ConversationItem: React.FC<Props> = ({
  conversation,
  isSelected,
  onSelect,
  typingText,
}) => {
  const { user } = useAuth();

  // Format last message timestamp
  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  // Determine conversation avatar & name
  let name = conversation.name;
  let avatarUrl = conversation.avatar_url;
  let isOnline = false;

  if (conversation.type === 'direct') {
    const otherMember = conversation.members.find((m) => m.user_id !== user?.id);
    if (otherMember && otherMember.user) {
      name = otherMember.user.display_name;
      avatarUrl = otherMember.user.avatar_url;
      isOnline = otherMember.user.status === 'online';
    }
  }

  const renderLastMessagePreview = () => {
    if (typingText) {
      return <span className="text-[#2C6BED] font-medium animate-pulse">{typingText}</span>;
    }

    const lastMsg = conversation.last_message;
    if (!lastMsg) return <span className="italic text-[#8E8E93]">No messages yet</span>;

    const isMine = lastMsg.sender_id === user?.id;
    const senderPrefix = isMine ? 'You: ' : conversation.type === 'group' ? `${lastMsg.sender?.display_name.split(' ')[0]}: ` : '';

    let contentPreview = lastMsg.content;
    if (lastMsg.message_type === 'image') contentPreview = '📷 Photo';
    if (lastMsg.message_type === 'file') contentPreview = '📁 Document';
    if (lastMsg.message_type === 'audio') contentPreview = '🎵 Voice note';

    return (
      <div className="flex items-center gap-1.5 truncate">
        {isMine && (
          <span className="text-[#8E8E93] flex-shrink-0">
            {lastMsg.status === 'read' ? (
              <CheckCheck className="w-3.5 h-3.5 text-[#2C6BED]" />
            ) : lastMsg.status === 'delivered' ? (
              <CheckCheck className="w-3.5 h-3.5 text-[#8E8E93]" />
            ) : (
              <Check className="w-3.5 h-3.5 text-[#8E8E93]" />
            )}
          </span>
        )}
        <span className="truncate">{senderPrefix}{contentPreview}</span>
      </div>
    );
  };

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 p-3 mx-2 rounded-xl cursor-pointer transition-all ${
        isSelected
          ? 'bg-[#2C6BED]/20 border border-[#2C6BED]/40'
          : 'hover:bg-[#2C2C2E]/60 border border-transparent'
      }`}
    >
      {/* Avatar Container */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-[#2C6BED]/20 border border-[#2C2C2E] flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name || 'Chat'} className="w-full h-full object-cover" />
          ) : conversation.type === 'group' ? (
            <Users className="w-6 h-6 text-[#2C6BED]" />
          ) : (
            <span className="text-lg font-semibold text-[#2C6BED]">
              {name ? name.charAt(0).toUpperCase() : '?'}
            </span>
          )}
        </div>
        {conversation.type === 'direct' && isOnline && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#1E1E1E]" />
        )}
      </div>

      {/* Details Container */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
            <span className="truncate">{name}</span>
            {conversation.disappearing_timer > 0 && (
              <Timer className="w-3.5 h-3.5 text-[#2C6BED] flex-shrink-0" />
            )}
          </h3>
          <span className="text-[11px] text-[#8E8E93] flex-shrink-0">
            {formatTimestamp(conversation.last_message?.created_at || conversation.updated_at)}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-[#8E8E93]">
          <div className="truncate pr-2">{renderLastMessagePreview()}</div>
          {conversation.unread_count > 0 && (
            <span className="flex-shrink-0 bg-[#2C6BED] text-white font-bold text-[10px] min-w-[18px] h-[18px] px-1.5 rounded-full flex items-center justify-center">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
