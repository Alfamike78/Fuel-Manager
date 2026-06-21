import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach Authorization header from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fuel_manager_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — redirect to /login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fuel_manager_token');
      localStorage.removeItem('fuel_manager_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
