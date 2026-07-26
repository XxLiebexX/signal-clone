'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { Phone, Video, ShieldCheck, MoreVertical, Users, Lock, ArrowLeft } from 'lucide-react';

interface Props {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (content: string, type?: string, mediaUrl?: string, replyToId?: string) => Promise<void>;
  onUpdateTimer: (seconds: number) => Promise<void>;
  onAddReaction: (msgId: string, emoji: string) => void;
  onBack: () => void;
  onOpenCall: (video: boolean) => void;
  onOpenSafetyNumber: () => void;
  onOpenGroupDetails: () => void;
  onOpenProfileModal?: (user: any) => void;
  typingText?: string | null;
}

export const ChatPane: React.FC<Props> = ({
  conversation,
  messages,
  onSendMessage,
  onUpdateTimer,
  onAddReaction,
  onBack,
  onOpenCall,
  onOpenSafetyNumber,
  onOpenGroupDetails,
  onOpenProfileModal,
  typingText,
}) => {
  const { user } = useAuth();
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingText]);

  // Determine avatar and title
  let title = conversation.name;
  let avatarUrl = conversation.avatar_url;
  let isOnline = false;
  let lastSeenText = 'Active on Signal';
  let otherUser: any = null;

  if (conversation.type === 'direct') {
    const otherMember = conversation.members.find((m) => m.user_id !== user?.id);
    if (otherMember && otherMember.user) {
      otherUser = otherMember.user;
      title = otherMember.user.display_name;
      avatarUrl = otherMember.user.avatar_url;
      isOnline = otherMember.user.status === 'online';
      lastSeenText = isOnline ? 'Online' : 'Last seen recently';
    }
  } else {
    lastSeenText = `${conversation.members.length} members`;
  }

  const handleAvatarClick = () => {
    if (conversation.type === 'group') {
      onOpenGroupDetails();
    } else if (otherUser && onOpenProfileModal) {
      onOpenProfileModal(otherUser);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121212] relative overflow-hidden select-none">
      
      {/* Header Bar */}
      <div className="p-3 bg-[#1E1E1E] border-b border-[#2C2C2E] flex items-center justify-between shadow-sm z-10">
        
        <div className="flex items-center gap-3">
          {/* Mobile Back Button */}
          <button
            onClick={onBack}
            className="md:hidden p-2 text-[#8E8E93] hover:text-white rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar */}
          <div
            onClick={handleAvatarClick}
            className="relative flex-shrink-0 cursor-pointer group/avatar"
            title="Click to view Status or Profile Photo"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-[#2C6BED]/20 border border-[#2C2C2E] flex items-center justify-center group-hover/avatar:ring-2 group-hover/avatar:ring-[#2C6BED] transition">
              {avatarUrl ? (
                <img src={avatarUrl} alt={title || 'Chat'} className="w-full h-full object-cover" />
              ) : conversation.type === 'group' ? (
                <Users className="w-5 h-5 text-[#2C6BED]" />
              ) : (
                <span className="text-sm font-semibold text-[#2C6BED]">
                  {title ? title.charAt(0).toUpperCase() : '?'}
                </span>
              )}
            </div>
            {conversation.type === 'direct' && isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#1E1E1E]" />
            )}
          </div>

          {/* Title & Status */}
          <div
            onClick={handleAvatarClick}
            className="cursor-pointer"
          >
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5 leading-tight">
              <span>{title}</span>
            </h2>
            <p className="text-xs text-[#8E8E93]">
              {typingText ? (
                <span className="text-[#2C6BED] font-medium animate-pulse">{typingText}</span>
              ) : (
                lastSeenText
              )}
            </p>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpenCall(false)}
            className="p-2.5 text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E] rounded-xl transition"
            title="Start Voice Call"
          >
            <Phone className="w-5 h-5" />
          </button>

          <button
            onClick={() => onOpenCall(true)}
            className="p-2.5 text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E] rounded-xl transition"
            title="Start Video Call"
          >
            <Video className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenSafetyNumber}
            className="p-2.5 text-[#8E8E93] hover:text-[#2C6BED] hover:bg-[#2C2C2E] rounded-xl transition"
            title="View Signal Safety Numbers"
          >
            <ShieldCheck className="w-5 h-5" />
          </button>

          {conversation.type === 'group' && (
            <button
              onClick={onOpenGroupDetails}
              className="p-2.5 text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E] rounded-xl transition"
              title="Group Information & Members"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        
        {/* End-to-End Encryption Banner */}
        <div className="flex flex-col items-center my-6 text-center max-w-sm mx-auto">
          <div className="w-10 h-10 rounded-full bg-[#242426] border border-[#2C2C2E] flex items-center justify-center mb-3">
            <Lock className="w-5 h-5 text-[#2C6BED]" />
          </div>
          <div className="text-xs text-[#8E8E93] leading-relaxed bg-[#1E1E1E]/80 border border-[#2C2C2E] p-3 rounded-2xl shadow">
            Messages and calls are end-to-end encrypted (Simulated). No one outside of this chat, not even Signal, can read or listen to them.
          </div>
        </div>

        {/* Message Bubbles */}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isGroup={conversation.type === 'group'}
            onReply={(m) => setReplyingToMessage(m)}
            onAddReaction={onAddReaction}
          />
        ))}

        {/* Typing Dots Bar */}
        {typingText && (
          <div className="flex items-center gap-2 text-xs text-[#8E8E93] my-2 px-3">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-[#2C6BED] rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-[#2C6BED] rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-[#2C6BED] rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            <span>{typingText}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <MessageComposer
        conversationId={conversation.id}
        disappearingTimer={conversation.disappearing_timer}
        onSendMessage={onSendMessage}
        onUpdateTimer={onUpdateTimer}
        replyingToMessage={replyingToMessage}
        onCancelReply={() => setReplyingToMessage(null)}
      />
    </div>
  );
};
