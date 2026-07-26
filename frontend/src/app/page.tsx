'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Conversation, Message } from '@/types';
import { api } from '@/lib/api';
import { wsClient } from '@/lib/websocket';

import { AuthModal } from '@/components/auth/AuthModal';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatPane } from '@/components/chat/ChatPane';
import { NewChatModal } from '@/components/modals/NewChatModal';
import { CreateGroupModal } from '@/components/modals/CreateGroupModal';
import { GroupDetailsModal } from '@/components/modals/GroupDetailsModal';
import { CallModal } from '@/components/modals/CallModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { SafetyNumberModal } from '@/components/modals/SafetyNumberModal';
import { StoriesModal } from '@/components/modals/StoriesModal';
import { ProfilePhotoModal } from '@/components/modals/ProfilePhotoModal';

import { Shield, MessageSquare } from 'lucide-react';

export default function Home() {
  const { user, token, loading } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Modals state
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [isCallVideo, setIsCallVideo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSafetyNumber, setShowSafetyNumber] = useState(false);
  const [showStories, setShowStories] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any | null>(null);

  // Live Typing Indicators state: convId -> string (e.g. "Sarah is typing...")
  const [typingState, setTypingState] = useState<Record<string, string>>({});

  // Fetch conversation list
  const loadConversations = useCallback(async (targetSelectId?: string) => {
    if (!token) return;
    try {
      const list = await api.getConversations();
      setConversations(list);
      
      if (targetSelectId) {
        setSelectedConvId(targetSelectId);
      } else {
        setSelectedConvId((curr) => curr || (list.length > 0 ? list[0].id : null));
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    }
  }, [token]);

  // Fetch messages for selected conversation
  const loadMessages = useCallback(async (convId: string) => {
    try {
      const msgs = await api.getMessages(convId);
      setMessages(msgs);

      // Instantly clear unread receipts in database & backend
      api.markConversationRead(convId).catch(() => {});

      // Reset unread count locally in conversation list state
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
      );
    } catch (err) {
      console.warn('Could not load messages for conversation:', convId);
      setMessages([]);
    }
  }, []);

  // Reset selected conversation when active user switches
  useEffect(() => {
    setSelectedConvId(null);
  }, [user?.id]);

  useEffect(() => {
    if (token) {
      loadConversations();
    }
  }, [token, loadConversations]);

  useEffect(() => {
    if (selectedConvId) {
      loadMessages(selectedConvId);
    }
  }, [selectedConvId, loadMessages]);

  // Keep ref to latest selectedConvId to prevent closure staleness in WebSocket handlers
  const selectedConvIdRef = useRef<string | null>(selectedConvId);
  useEffect(() => {
    selectedConvIdRef.current = selectedConvId;
  }, [selectedConvId]);

  // Real-time WebSocket Event Subscription
  useEffect(() => {
    if (!token) return;

    const handleNewMessage = (data: any) => {
      const newMsg: Message = data.message;
      const currentConvId = selectedConvIdRef.current;

      // Immediately append to active chat message list if matching
      if (newMsg.conversation_id === currentConvId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        if (newMsg.sender_id !== user?.id) {
          api.markRead(newMsg.id).catch(console.error);
        }
      }

      // Update sidebar conversations list
      setConversations((prev) =>
        prev
          .map((c) => {
            if (c.id === newMsg.conversation_id) {
              const isCurrent = c.id === currentConvId;
              return {
                ...c,
                last_message: newMsg,
                updated_at: newMsg.created_at,
                unread_count: isCurrent || newMsg.sender_id === user?.id ? 0 : c.unread_count + 1,
              };
            }
            return c;
          })
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      );
    };

    const handleMessageRead = (data: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.message_id ? { ...m, status: 'read' } : m))
      );
    };

    const handleUserTyping = (data: any) => {
      if (data.user_id === user?.id) return;
      const convId = data.conversation_id;
      const isTyping = data.is_typing;
      
      if (isTyping) {
        setTypingState((prev) => ({ ...prev, [convId]: `${data.user_name} is typing...` }));
        setTimeout(() => {
          setTypingState((prev) => {
            const copy = { ...prev };
            delete copy[convId];
            return copy;
          });
        }, 3000);
      } else {
        setTypingState((prev) => {
          const copy = { ...prev };
          delete copy[convId];
          return copy;
        });
      }
    };

    const handleReactionAdded = (data: any) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === data.message_id) {
            const existing = m.reactions.find((r) => r.id === data.reaction.id);
            if (existing) return m;
            return { ...m, reactions: [...m.reactions, data.reaction] };
          }
          return m;
        })
      );
    };

    const handleReactionRemoved = (data: any) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === data.message_id) {
            return { ...m, reactions: m.reactions.filter((r) => r.id !== data.reaction_id) };
          }
          return m;
        })
      );
    };

    const handleDisappearingTimerUpdated = (data: any) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === data.conversation_id ? { ...c, disappearing_timer: data.timer } : c))
      );
    };

    wsClient.on('new_message', handleNewMessage);
    wsClient.on('message_read', handleMessageRead);
    wsClient.on('user_typing', handleUserTyping);
    wsClient.on('reaction_added', handleReactionAdded);
    wsClient.on('reaction_removed', handleReactionRemoved);
    wsClient.on('disappearing_timer_updated', handleDisappearingTimerUpdated);

    return () => {
      wsClient.off('new_message', handleNewMessage);
      wsClient.off('message_read', handleMessageRead);
      wsClient.off('user_typing', handleUserTyping);
      wsClient.off('reaction_added', handleReactionAdded);
      wsClient.off('reaction_removed', handleReactionRemoved);
      wsClient.off('disappearing_timer_updated', handleDisappearingTimerUpdated);
    };
  }, [token, user]);

  // Handle Send Message action
  const handleSendMessage = async (content: string, type?: string, mediaUrl?: string, replyToId?: string) => {
    if (!selectedConvId) return;
    try {
      const newMsg = await api.sendMessage({
        conversation_id: selectedConvId,
        content,
        message_type: type,
        media_url: mediaUrl,
        reply_to_id: replyToId,
      });

      // Instant optimistic UI update: append message immediately to state
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Update sidebar conversation item immediately
      setConversations((prev) =>
        prev
          .map((c) => (c.id === selectedConvId ? { ...c, last_message: newMsg, updated_at: newMsg.created_at } : c))
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      );
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  // Handle Update Disappearing Timer action
  const handleUpdateTimer = async (seconds: number) => {
    if (!selectedConvId) return;
    try {
      const updated = await api.updateDisappearingTimer(selectedConvId, seconds);
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedConvId ? { ...c, disappearing_timer: seconds } : c))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Add / Remove Reaction action
  const handleAddReaction = async (msgId: string, emoji: string) => {
    // Instant Optimistic UI Update: At most 1 active reaction per user per message
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const myExistingReaction = m.reactions.find((r) => r.user_id === user?.id);
          let updatedReactions = [...m.reactions];

          if (myExistingReaction) {
            if (myExistingReaction.emoji === emoji) {
              // Clicked same emoji -> remove reaction
              updatedReactions = updatedReactions.filter((r) => r.id !== myExistingReaction.id);
            } else {
              // Clicked different emoji -> replace existing reaction with new emoji
              updatedReactions = updatedReactions.map((r) =>
                r.id === myExistingReaction.id ? { ...r, emoji } : r
              );
            }
          } else {
            // New reaction
            updatedReactions.push({
              id: `temp_${Date.now()}`,
              message_id: msgId,
              user_id: user?.id || 'me',
              emoji,
              created_at: new Date().toISOString(),
              user_name: user?.display_name || 'You',
            });
          }
          return { ...m, reactions: updatedReactions };
        }
        return m;
      })
    );

    try {
      await api.addReaction(msgId, emoji);
    } catch (err) {
      console.error('Failed to toggle reaction', err);
    }
  };

  // Handle Start Direct Chat from contact select
  const handleStartDirectChat = async (recipientId: string) => {
    try {
      const conv = await api.createConversation({ type: 'direct', recipient_id: recipientId });
      await loadConversations(conv.id);
    } catch (err) {
      console.error('Failed to start direct chat', err);
    }
  };

  // Handle Create Group Chat
  const handleCreateGroup = async (name: string, memberIds: string[], avatarUrl?: string, description?: string) => {
    try {
      const conv = await api.createConversation({
        type: 'group',
        name,
        member_ids: memberIds,
        avatar_url: avatarUrl,
        description,
      });
      await loadConversations(conv.id);
    } catch (err) {
      console.error('Failed to create group', err);
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConvId);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#121212] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#2C6BED] flex items-center justify-center animate-pulse">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <span className="text-xs text-[#8E8E93] font-medium">Loading Signal Messenger...</span>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return <AuthModal />;
  }

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-[#121212]">
      {/* Sidebar Navigation */}
      <div className={`${selectedConvId ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full`}>
        <Sidebar
          conversations={conversations}
          selectedId={selectedConvId}
          onSelectConversation={(id) => setSelectedConvId(id)}
          onOpenNewChat={() => setShowNewChat(true)}
          onOpenCreateGroup={() => setShowCreateGroup(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenStories={() => setShowStories(true)}
          typingState={typingState}
        />
      </div>

      {/* Main Chat View Area */}
      <div className={`${!selectedConvId ? 'hidden md:flex' : 'flex'} flex-1 h-full`}>
        {selectedConversation ? (
          <ChatPane
            conversation={selectedConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
            onUpdateTimer={handleUpdateTimer}
            onAddReaction={handleAddReaction}
            onBack={() => setSelectedConvId(null)}
            onOpenCall={(video) => {
              setIsCallVideo(video);
              setShowCallModal(true);
            }}
            onOpenSafetyNumber={() => setShowSafetyNumber(true)}
            onOpenGroupDetails={() => setShowGroupDetails(true)}
            onOpenProfileModal={(u) => setSelectedProfileUser(u)}
            typingText={typingState[selectedConversation.id]}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#121212] text-[#8E8E93]">
            <div className="w-20 h-20 rounded-3xl bg-[#1E1E1E] border border-[#2C2C2E] flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-[#2C6BED]" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Signal Desktop</h2>
            <p className="text-xs max-w-sm leading-relaxed">
              Select a conversation or start a new chat to begin secure real-time messaging.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewChatModal
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
        onSelectUser={handleStartDirectChat}
      />

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreateGroup={handleCreateGroup}
      />

      <StoriesModal
        isOpen={showStories}
        onClose={() => setShowStories(false)}
      />

      <ProfilePhotoModal
        user={selectedProfileUser}
        isOpen={!!selectedProfileUser}
        onClose={() => setSelectedProfileUser(null)}
        onOpenStatus={() => setShowStories(true)}
      />

      {selectedConversation && (
        <>
          <GroupDetailsModal
            isOpen={showGroupDetails}
            onClose={() => setShowGroupDetails(false)}
            conversation={selectedConversation}
            onRefreshConversation={loadConversations}
          />

          <CallModal
            isOpen={showCallModal}
            onClose={() => setShowCallModal(false)}
            conversation={selectedConversation}
            isVideo={isCallVideo}
          />

          <SafetyNumberModal
            isOpen={showSafetyNumber}
            onClose={() => setShowSafetyNumber(false)}
            conversation={selectedConversation}
          />
        </>
      )}

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </main>
  );
}
