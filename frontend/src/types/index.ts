/** Shared TypeScript types for Kurakani frontend */

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

export interface FriendRequestType {
  _id: string;
  sender: User;
  receiver: User;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export type FriendshipStatus = 'accepted' | 'pending' | 'incoming' | 'none' | 'self';

export interface FriendshipStatusResponse {
  status: FriendshipStatus;
  requestId?: string;
}

export interface UnreadCount {
  userId: string;
  count: number;
}
