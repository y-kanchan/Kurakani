import api from './api';

export const userService = {
  search: async (q: string) => {
    const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
    return res.data;
  },

  updateProfile: async (formData: FormData) => {
    const res = await api.put('/users/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getUserById: async (id: string) => {
    const res = await api.get(`/users/${id}`);
    return res.data;
  },
};
