import api from './api';

export interface Group {
  _id: string;
  name: string;
  description: string;
  avatar: string;
  admin: { _id: string; username: string; displayName: string; profilePic: string };
  members: Array<{
    _id: string;
    username: string;
    displayName: string;
    profilePic: string;
    isOnline: boolean;
  }>;
  pinnedMessage?: string | null;
  lastMessage?: {
    _id: string;
    text: string;
    sender: { username: string; displayName: string };
    createdAt: string;
    imageUrl?: string;
    voiceUrl?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export const groupService = {
  createGroup: async (formData: FormData) => {
    const res = await api.post('/groups', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data as Group;
  },

  getMyGroups: async () => {
    const res = await api.get('/groups');
    return res.data as Group[];
  },

  getGroup: async (groupId: string) => {
    const res = await api.get(`/groups/${groupId}`);
    return res.data as Group;
  },

  updateGroup: async (groupId: string, formData: FormData) => {
    const res = await api.put(`/groups/${groupId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data as Group;
  },

  deleteGroup: async (groupId: string) => {
    const res = await api.delete(`/groups/${groupId}`);
    return res.data;
  },

  getGroupMessages: async (groupId: string, page = 1) => {
    const res = await api.get(`/groups/${groupId}/messages?page=${page}&limit=50`);
    return res.data;
  },

  sendGroupMessage: async (groupId: string, formData: FormData) => {
    const res = await api.post(`/groups/${groupId}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  addMember: async (groupId: string, userId: string) => {
    const res = await api.post(`/groups/${groupId}/add-member`, { userId });
    return res.data as Group;
  },

  removeMember: async (groupId: string, userId: string) => {
    const res = await api.delete(`/groups/${groupId}/member/${userId}`);
    return res.data as Group;
  },

  leaveGroup: async (groupId: string) => {
    const res = await api.post(`/groups/${groupId}/leave`);
    return res.data;
  },

  pinMessage: async (groupId: string, messageId: string) => {
    const res = await api.post(`/groups/${groupId}/pin`, { messageId });
    return res.data;
  },

  unpinMessage: async (groupId: string) => {
    const res = await api.post(`/groups/${groupId}/unpin`);
    return res.data;
  },
};
