import { create } from 'zustand';
import type { User } from './useAuthStore';
import { friendService } from '../services/friendService';
import type { FriendshipStatus } from '../types';

interface FriendRequest {
  _id: string;
  sender: User;
  receiver: User;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface FriendState {
  friends: User[];
  receivedRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  friendshipStatusCache: Record<string, { status: FriendshipStatus; requestId?: string }>;

  setFriends: (friends: User[]) => void;
  addFriend: (friend: User) => void;
  removeFriend: (friendId: string) => void;
  updateFriendStatus: (userId: string, isOnline: boolean, lastSeen?: string) => void;
  setReceivedRequests: (requests: FriendRequest[]) => void;
  setSentRequests: (requests: FriendRequest[]) => void;
  addReceivedRequest: (request: FriendRequest) => void;
  removeRequest: (requestId: string) => void;
  fetchFriendshipStatus: (userId: string) => Promise<{ status: FriendshipStatus; requestId?: string }>;
  setFriendshipStatus: (userId: string, status: FriendshipStatus, requestId?: string) => void;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  receivedRequests: [],
  sentRequests: [],
  friendshipStatusCache: {},

  setFriends: (friends) => set({ friends }),

  addFriend: (friend) =>
    set((state) => ({
      friends: state.friends.some((f) => f._id === friend._id)
        ? state.friends
        : [...state.friends, friend],
    })),

  removeFriend: (friendId) =>
    set((state) => ({
      friends: state.friends.filter((f) => f._id !== friendId),
    })),

  updateFriendStatus: (userId, isOnline, lastSeen) =>
    set((state) => ({
      friends: state.friends.map((f) =>
        f._id === userId ? { ...f, isOnline, lastSeen: lastSeen || f.lastSeen } : f
      ),
    })),

  setReceivedRequests: (requests) => set({ receivedRequests: requests }),

  setSentRequests: (requests) => set({ sentRequests: requests }),

  addReceivedRequest: (request) =>
    set((state) => ({
      receivedRequests: state.receivedRequests.some((r) => r._id === request._id)
        ? state.receivedRequests
        : [request, ...state.receivedRequests],
    })),

  removeRequest: (requestId) =>
    set((state) => ({
      receivedRequests: state.receivedRequests.filter((r) => r._id !== requestId),
      sentRequests: state.sentRequests.filter((r) => r._id !== requestId),
    })),

  fetchFriendshipStatus: async (userId) => {
    try {
      const data = await friendService.getFriendshipStatus(userId);
      set((state) => ({
        friendshipStatusCache: {
          ...state.friendshipStatusCache,
          [userId]: { status: data.status, requestId: data.requestId },
        },
      }));
      return data;
    } catch {
      return { status: 'none' as FriendshipStatus };
    }
  },

  setFriendshipStatus: (userId, status, requestId) =>
    set((state) => ({
      friendshipStatusCache: {
        ...state.friendshipStatusCache,
        [userId]: { status, requestId },
      },
    })),
}));
