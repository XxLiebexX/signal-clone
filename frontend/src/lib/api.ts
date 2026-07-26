import { User, Contact, Conversation, Message, Reaction } from '@/types';

const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const cleanBase = rawBase ? rawBase.replace(/\/+$/, '') : '';
const API_BASE = cleanBase
  ? (cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`)
  : '/api';

async function fetchWithAuth(url: string, options: RequestInit = {}, token?: string) {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('signal_token') : null);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('signal_token');
        }
      }
      const err = await res.json().catch(() => ({ detail: 'API Error' }));
      throw new Error(err.detail || `Request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    console.error(`[API Error] ${url}:`, err);
    throw err;
  }
}

export const api = {
  // Auth
  phoneLogin: async (phone: string, code: string = '123456') => {
    const res = await fetch(`${API_BASE}/auth/phone-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },

  firebaseLogin: async (phone: string, idToken: string) => {
    const res = await fetch(`${API_BASE}/auth/firebase-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, firebase_id_token: idToken }),
    });
    if (!res.ok) throw new Error('Backend session creation failed');
    return res.json();
  },

  register: async (data: { phone: string; username: string; display_name: string; avatar_url?: string; about?: string }) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Registration failed');
    return res.json();
  },

  getMe: async (token?: string): Promise<User> => {
    return fetchWithAuth('/auth/me', {}, token);
  },

  // Users & Contacts
  getAllUsers: async (): Promise<User[]> => {
    const res = await fetch(`${API_BASE}/users/all`);
    if (!res.ok) return [];
    return res.json();
  },

  searchUsers: async (q: string): Promise<User[]> => {
    return fetchWithAuth(`/users/search?q=${encodeURIComponent(q)}`);
  },

  getContacts: async (): Promise<Contact[]> => {
    return fetchWithAuth('/users/contacts');
  },

  addContact: async (phone_or_username: string, nickname?: string): Promise<Contact> => {
    return fetchWithAuth('/users/contacts', {
      method: 'POST',
      body: JSON.stringify({ phone_or_username, nickname }),
    });
  },

  updateProfile: async (data: { display_name?: string; avatar_url?: string; about?: string; status?: string }): Promise<User> => {
    return fetchWithAuth('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Conversations
  getConversations: async (): Promise<Conversation[]> => {
    return fetchWithAuth('/conversations');
  },

  createConversation: async (data: { type: 'direct' | 'group'; recipient_id?: string; member_ids?: string[]; name?: string; avatar_url?: string; description?: string }): Promise<Conversation> => {
    return fetchWithAuth('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getConversationDetails: async (id: string): Promise<Conversation> => {
    return fetchWithAuth(`/conversations/${id}`);
  },

  markConversationRead: async (id: string): Promise<void> => {
    return fetchWithAuth(`/conversations/${id}/read`, { method: 'POST' });
  },

  updateDisappearingTimer: async (id: string, seconds: number): Promise<Conversation> => {
    return fetchWithAuth(`/conversations/${id}/disappearing`, {
      method: 'PUT',
      body: JSON.stringify({ disappearing_timer: seconds }),
    });
  },

  addGroupMember: async (conversationId: string, userId: string): Promise<Conversation> => {
    return fetchWithAuth(`/conversations/${conversationId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  },

  removeGroupMember: async (conversationId: string, userId: string): Promise<Conversation> => {
    return fetchWithAuth(`/conversations/${conversationId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  // Messages
  getMessages: async (conversationId: string): Promise<Message[]> => {
    return fetchWithAuth(`/conversations/${conversationId}/messages`);
  },

  sendMessage: async (data: { conversation_id: string; content: string; message_type?: string; media_url?: string; reply_to_id?: string }): Promise<Message> => {
    return fetchWithAuth('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  markRead: async (messageId: string): Promise<void> => {
    return fetchWithAuth(`/messages/${messageId}/read`, { method: 'POST' });
  },

  addReaction: async (messageId: string, emoji: string): Promise<Reaction> => {
    return fetchWithAuth(`/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  },

  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('signal_token') : null;
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error('Upload failed');
    }

    return await res.json();
  },

  // Stories / Status
  getStories: async () => {
    return fetchWithAuth('/stories');
  },

  createStory: async (data: { content?: string; media_url?: string; bg_color?: string; expire_hours?: number }) => {
    return fetchWithAuth('/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteStory: async (id: string) => {
    return fetchWithAuth(`/stories/${id}`, {
      method: 'DELETE',
    });
  },
};
