import { create } from 'zustand';
import type { User } from './useAuthStore';

export interface Message {
  _id: string;
  sender: User | string;
  receiver: User | string;
  text: string;
  voiceUrl?: string;
  imageUrl?: string;
  read: boolean;
  readAt?: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  activeChat: User | null;
  messages: Message[];
  isTyping: boolean;
  typingUserId: string | null;
  isLoadingMessages: boolean;
  isSelfChat: boolean;

  setActiveChat: (user: User | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  markMessagesRead: (senderId: string) => void;
  setTyping: (isTyping: boolean, userId?: string) => void;
  setLoadingMessages: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeChat: null,
  messages: [],
  isTyping: false,
  typingUserId: null,
  isLoadingMessages: false,
  isSelfChat: false,

  setActiveChat: (user) =>
    set({
      activeChat: user,
      messages: [],
      isSelfChat: false, // Will be set by Dashboard when opening self-chat
    }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) => {
    const exists = get().messages.find((m) => m._id === message._id);
    if (exists) return;
    set((state) => ({ messages: [...state.messages, message] }));
  },

  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, ...updates } : m
      ),
    })),

  markMessagesRead: (senderId) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        const sId = typeof m.sender === 'string' ? m.sender : m.sender._id;
        return sId === senderId ? { ...m, read: true } : m;
      }),
    })),

  setTyping: (isTyping, userId) =>
    set({ isTyping, typingUserId: userId || null }),

  setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),
}));
