import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('quizlive_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('quizlive_token');
      localStorage.removeItem('quizlive_user');
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
};

// ─── Quizzes ─────────────────────────────────────────────
export const quizAPI = {
  getAll: (params) => api.get('/quizzes', { params }),
  getById: (id) => api.get(`/quizzes/${id}`),
  create: (data) => api.post('/quizzes', data),
  update: (id, data) => api.put(`/quizzes/${id}`, data),
  delete: (id) => api.delete(`/quizzes/${id}`),
  getHistory: (id) => api.get(`/quizzes/${id}/history`),
};

// ─── Rooms ───────────────────────────────────────────────
export const roomAPI = {
  create: (data) => api.post('/rooms', data),
  join: (roomCode) => api.post('/rooms/join', { roomCode }),
  getById: (id) => api.get(`/rooms/${id}`),
  getByCode: (code) => api.get(`/rooms/code/${code}`),
  getResults: (id) => api.get(`/rooms/${id}/results`),
};

// ─── Analytics ───────────────────────────────────────────
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getQuizAnalytics: (quizId) => api.get(`/analytics/${quizId}`),
};

// ─── Users ───────────────────────────────────────────────
export const userAPI = {
  getStats: () => api.get('/users/me/stats'),
};

export default api;
