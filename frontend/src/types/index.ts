export interface User {
  id: string;
  phone: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  about?: string | null;
  status: 'online' | 'offline' | 'away';
  last_seen: string;
  created_at: string;
}

export interface Contact {
  id: string;
  nickname?: string | null;
  contact_user: User;
}

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user_name?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender: User;
  reply_to_id?: string | null;
  reply_to_content?: string | null;
  reply_to_sender_name?: string | null;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'audio' | 'system';
  media_url?: string | null;
  status: 'sent' | 'delivered' | 'read';
  expires_at?: string | null;
  created_at: string;
  reactions: Reaction[];
}

export interface ConversationMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  user: User;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string | null;
  avatar_url?: string | null;
  description?: string | null;
  disappearing_timer: number; // 0 = off, seconds
  created_at: string;
  updated_at: string;
  members: ConversationMember[];
  last_message?: Message | null;
  unread_count: number;
}
