import { create } from 'zustand';
import type { User } from './useAuthStore';

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

  setFriends: (friends: User[]) => void;
  addFriend: (friend: User) => void;
  removeFriend: (friendId: string) => void;
  updateFriendStatus: (userId: string, isOnline: boolean, lastSeen?: string) => void;
  setReceivedRequests: (requests: FriendRequest[]) => void;
  setSentRequests: (requests: FriendRequest[]) => void;
  addReceivedRequest: (request: FriendRequest) => void;
  removeRequest: (requestId: string) => void;
}

export const useFriendStore = create<FriendState>((set) => ({
  friends: [],
  receivedRequests: [],
  sentRequests: [],

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
}));
