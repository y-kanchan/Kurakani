import { create } from 'zustand';

export interface User {
  _id: string;
  username: string;
  displayName: string;
  profilePic: string;
  status: string;
  bio: string;
  isOnline: boolean;
  lastSeen: string;
  friends: User[];
  profileSetupComplete: boolean;
  phone?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: User) => void;
  setToken: (token: string) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  updateFriendStatus: (userId: string, isOnline: boolean, lastSeen?: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('kurakani_user') || 'null'),
  token: localStorage.getItem('kurakani_token'),
  isAuthenticated: !!localStorage.getItem('kurakani_token'),
  isLoading: false,

  setUser: (user) => {
    localStorage.setItem('kurakani_user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  setToken: (token) => {
    localStorage.setItem('kurakani_token', token);
    set({ token });
  },

  login: (token, user) => {
    localStorage.setItem('kurakani_token', token);
    localStorage.setItem('kurakani_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('kurakani_token');
    localStorage.removeItem('kurakani_user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  updateUser: (updates) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    localStorage.setItem('kurakani_user', JSON.stringify(updated));
    set({ user: updated });
  },

  updateFriendStatus: (userId, isOnline, lastSeen) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updatedFriends = currentUser.friends.map((f) =>
      f._id === userId ? { ...f, isOnline, lastSeen: lastSeen || f.lastSeen } : f
    );
    const updated = { ...currentUser, friends: updatedFriends };
    localStorage.setItem('kurakani_user', JSON.stringify(updated));
    set({ user: updated });
  },
}));
