import api from './api';

export const friendService = {
  sendRequest: async (receiverId: string) => {
    const res = await api.post('/friends/request', { receiverId });
    return res.data;
  },

  getRequests: async () => {
    const res = await api.get('/friends/requests');
    return res.data;
  },

  acceptRequest: async (requestId: string) => {
    const res = await api.put(`/friends/accept/${requestId}`);
    return res.data;
  },

  rejectRequest: async (requestId: string) => {
    const res = await api.put(`/friends/reject/${requestId}`);
    return res.data;
  },

  getFriends: async () => {
    const res = await api.get('/friends');
    return res.data;
  },

  removeFriend: async (friendId: string) => {
    const res = await api.delete(`/friends/${friendId}`);
    return res.data;
  },

  /** Get friendship status between current user and a target user */
  getFriendshipStatus: async (userId: string) => {
    const res = await api.get(`/friends/status/${userId}`);
    return res.data;
  },
};
