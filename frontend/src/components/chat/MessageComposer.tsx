'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Message } from '@/types';
import { wsClient } from '@/lib/websocket';
import { api } from '@/lib/api';
import { Send, Paperclip, Smile, Timer, X, Mic, Square } from 'lucide-react';

interface Props {
  conversationId: string;
  disappearingTimer: number;
  onSendMessage: (content: string, type?: string, mediaUrl?: string, replyToId?: string) => Promise<void>;
  onUpdateTimer: (seconds: number) => Promise<void>;
  replyingToMessage: Message | null;
  onCancelReply: () => void;
}

const EMOJI_PICKER = [
  '👍', '❤️', '😂', '🔥', '😮', '💩', '🎉', '🔒', '🛡️', '🚀', '✨', '🙌',
  '💯', '😍', '👏', '🙏', '🥳', '😎', '💡', '💬', '👀', '🤯', '🤝', '⭐',
  '💥', '🎯', '⚡', '🏆', '🍕', '☕', '❤️‍🔥', '✅', '❌', '😊', '😭', '😴'
];
const TIMER_OPTIONS = [
  { label: 'Off', seconds: 0 },
  { label: '5 seconds', seconds: 5 },
  { label: '10 seconds', seconds: 10 },
  { label: '30 seconds', seconds: 30 },
  { label: '1 minute', seconds: 60 },
  { label: '1 hour', seconds: 3600 },
  { label: '1 day', seconds: 86400 },
  { label: '1 week', seconds: 604800 },
];

export const MessageComposer: React.FC<Props> = ({
  conversationId,
  disappearingTimer,
  onSendMessage,
  onUpdateTimer,
  replyingToMessage,
  onCancelReply,
}) => {
  const [content, setContent] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (e.target.value.length > 0) {
      wsClient.sendTyping(conversationId, true);
    } else {
      wsClient.sendTyping(conversationId, false);
    }
  };

  const handleSend = async () => {
    if (!content.trim() && !uploading) return;
    const textToSend = content.trim();
    setContent('');
    wsClient.sendTyping(conversationId, false);
    setShowEmoji(false);
    
    await onSendMessage(textToSend, 'text', undefined, replyingToMessage?.id);
    if (replyingToMessage) onCancelReply();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await api.uploadFile(file);
      await onSendMessage(
        file.name,
        res.message_type,
        res.url,
        replyingToMessage?.id
      );
      if (replyingToMessage) onCancelReply();
    } catch (err) {
      console.error('File upload failed', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Voice Note Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });

        setUploading(true);
        try {
          const res = await api.uploadFile(audioFile);
          await onSendMessage('Voice Note', 'audio', res.url, replyingToMessage?.id);
          if (replyingToMessage) onCancelReply();
        } catch (err) {
          console.error('Failed to send voice note', err);
        } finally {
          setUploading(false);
        }
        
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access unavailable or denied', err);
      // Fallback voice note mock if browser mic blocked
      setUploading(true);
      try {
        await onSendMessage('Voice Note (0:05)', 'audio', '/static/uploads/sample_voice.mp3', replyingToMessage?.id);
        if (replyingToMessage) onCancelReply();
      } finally {
        setUploading(false);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  return (
    <div className="p-3 border-t border-[#2C2C2E] bg-[#1E1E1E] relative select-none">
      
      {/* Quoted Reply Banner */}
      {replyingToMessage && (
        <div className="flex items-center justify-between p-2 mb-2 bg-[#242426] border-l-4 border-[#2C6BED] rounded-r-xl text-xs">
          <div className="truncate">
            <span className="font-semibold text-[#2C6BED] block">
              Replying to {replyingToMessage.sender?.display_name || 'Message'}
            </span>
            <span className="text-[#8E8E93] truncate">{replyingToMessage.content}</span>
          </div>
          <button onClick={onCancelReply} className="text-[#8E8E93] hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmoji && (
        <div className="absolute bottom-16 left-3 bg-[#242426] border border-[#2C2C2E] rounded-2xl p-3 shadow-2xl z-30 grid grid-cols-6 gap-2">
          {EMOJI_PICKER.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setContent((prev) => prev + emoji);
                setShowEmoji(false);
              }}
              className="text-xl p-2 hover:bg-[#2C2C2E] rounded-xl transition"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Disappearing Timer Menu Popover */}
      {showTimerMenu && (
        <div className="absolute bottom-16 left-12 bg-[#242426] border border-[#2C2C2E] rounded-2xl p-2 shadow-2xl z-30 w-48 space-y-1">
          <div className="text-[11px] font-semibold text-[#8E8E93] uppercase px-3 py-1 border-b border-[#2C2C2E]">
            Disappearing Messages
          </div>
          {TIMER_OPTIONS.map((opt) => (
            <button
              key={opt.seconds}
              onClick={() => {
                onUpdateTimer(opt.seconds);
                setShowTimerMenu(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-left transition ${
                disappearingTimer === opt.seconds
                  ? 'bg-[#2C6BED] text-white font-semibold'
                  : 'hover:bg-[#2C2C2E] text-white'
              }`}
            >
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Composer Input Bar */}
      <div className="flex items-center gap-2">
        {/* Disappearing Timer Button */}
        <button
          type="button"
          onClick={() => setShowTimerMenu(!showTimerMenu)}
          className={`p-2.5 rounded-xl transition ${
            disappearingTimer > 0
              ? 'bg-[#2C6BED]/20 text-[#2C6BED] border border-[#2C6BED]/40'
              : 'text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E]'
          }`}
          title="Disappearing Messages Timer"
        >
          <Timer className="w-5 h-5" />
        </button>

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmoji(!showEmoji)}
          className="p-2.5 rounded-xl text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E] transition"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* File Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || isRecording}
          className="p-2.5 rounded-xl text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E] transition"
          title="Attach Image or Document"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Live Audio Recording Active State */}
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-2.5 text-sm text-red-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-semibold">Recording Voice Note...</span>
              <span className="font-mono text-xs text-white">00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white font-semibold text-xs rounded-xl flex items-center gap-1 transition"
            >
              <Square className="w-3 h-3 fill-current" /> Stop & Send
            </button>
          </div>
        ) : (
          /* Text Input */
          <textarea
            rows={1}
            placeholder="Signal message..."
            value={content}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-[#1C1C1E] border border-[#2C2C2E] focus:border-[#2C6BED] rounded-2xl px-4 py-2.5 text-sm text-white placeholder-[#8E8E93] focus:outline-none resize-none max-h-32 transition"
          />
        )}

        {/* Mic Voice Note Button / Send Button */}
        {!content.trim() && !uploading && !isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="p-3 bg-[#2C6BED] hover:bg-[#3B75EE] text-white rounded-2xl transition shadow-lg shadow-[#2C6BED]/20"
            title="Record Voice Note"
          >
            <Mic className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={(!content.trim() && !uploading) || isRecording}
            className="p-3 bg-[#2C6BED] hover:bg-[#3B75EE] disabled:opacity-40 text-white rounded-2xl transition shadow-lg shadow-[#2C6BED]/20"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
