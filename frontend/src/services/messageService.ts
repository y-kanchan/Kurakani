import api from './api';

export const messageService = {
  send: async (formData: FormData) => {
    const res = await api.post('/messages', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getConversation: async (userId: string, page = 1) => {
    const res = await api.get(`/messages/${userId}?page=${page}&limit=50`);
    return res.data;
  },

  markRead: async (senderId: string) => {
    const res = await api.put(`/messages/read/${senderId}`);
    return res.data;
  },

  deleteMessage: async (messageId: string) => {
    const res = await api.delete(`/messages/${messageId}`);
    return res.data;
  },

  getUnreadCounts: async () => {
    const res = await api.get('/messages/unread');
    return res.data;
  },
};
