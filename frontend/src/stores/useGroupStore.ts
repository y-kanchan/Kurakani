import { create } from 'zustand';
import type { Group } from '../services/groupService';

export interface GroupMessage {
  _id: string;
  sender: {
    _id: string;
    username: string;
    displayName: string;
    profilePic: string;
  };
  group: string;
  text: string;
  voiceUrl?: string;
  imageUrl?: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GroupState {
  groups: Group[];
  activeGroup: Group | null;
  groupMessages: Record<string, GroupMessage[]>;
  isLoadingGroups: boolean;
  isLoadingGroupMessages: boolean;
  groupTyping: Record<string, { senderId: string; senderName: string } | null>;

  // Actions
  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  updateGroup: (group: Group) => void;
  removeGroup: (groupId: string) => void;
  setActiveGroup: (group: Group | null) => void;
  setGroupMessages: (groupId: string, messages: GroupMessage[]) => void;
  addGroupMessage: (message: GroupMessage) => void;
  setLoadingGroups: (v: boolean) => void;
  setLoadingGroupMessages: (v: boolean) => void;
  setGroupTyping: (groupId: string, data: { senderId: string; senderName: string } | null) => void;
  updateGroupMember: (groupId: string, updatedGroup: Group) => void;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  activeGroup: null,
  groupMessages: {},
  isLoadingGroups: false,
  isLoadingGroupMessages: false,
  groupTyping: {},

  setGroups: (groups) => set({ groups }),

  addGroup: (group) =>
    set((state) => ({
      groups: [group, ...state.groups.filter((g) => g._id !== group._id)],
    })),

  updateGroup: (group) =>
    set((state) => ({
      groups: state.groups.map((g) => (g._id === group._id ? group : g)),
      activeGroup: state.activeGroup?._id === group._id ? group : state.activeGroup,
    })),

  removeGroup: (groupId) =>
    set((state) => ({
      groups: state.groups.filter((g) => g._id !== groupId),
      activeGroup: state.activeGroup?._id === groupId ? null : state.activeGroup,
    })),

  setActiveGroup: (group) =>
    set({
      activeGroup: group,
    }),

  setGroupMessages: (groupId, messages) =>
    set((state) => ({
      groupMessages: { ...state.groupMessages, [groupId]: messages },
    })),

  addGroupMessage: (message) => {
    const groupId = message.group;
    set((state) => {
      const existing = state.groupMessages[groupId] || [];
      // Deduplicate
      if (existing.find((m) => m._id === message._id)) return state;
      return {
        groupMessages: {
          ...state.groupMessages,
          [groupId]: [...existing, message],
        },
        // Update last message in groups list
        groups: state.groups.map((g) =>
          g._id === groupId
            ? {
                ...g,
                lastMessage: {
                  _id: message._id,
                  text: message.text,
                  sender: message.sender,
                  createdAt: message.createdAt,
                  imageUrl: message.imageUrl,
                  voiceUrl: message.voiceUrl,
                },
              }
            : g
        ),
      };
    });
  },

  setLoadingGroups: (v) => set({ isLoadingGroups: v }),
  setLoadingGroupMessages: (v) => set({ isLoadingGroupMessages: v }),

  setGroupTyping: (groupId, data) =>
    set((state) => ({
      groupTyping: { ...state.groupTyping, [groupId]: data },
    })),

  updateGroupMember: (groupId, updatedGroup) =>
    set((state) => ({
      groups: state.groups.map((g) => (g._id === groupId ? updatedGroup : g)),
      activeGroup: state.activeGroup?._id === groupId ? updatedGroup : state.activeGroup,
    })),
}));
