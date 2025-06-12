import axios from 'axios';

const api = axios.create({
  baseURL: 'https://tb-backend-hh7d.onrender.com/api',
});

// Har request me JWT attach karo
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

export default api;
