import api from './api';

export interface RegisterData {
  username: string;
  phone?: string;
  password: string;
}

export interface LoginData {
  identifier: string;
  password: string;
}

export const authService = {
  register: async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  login: async (data: LoginData) => {
    const res = await api.post('/auth/login', data);
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },
};
