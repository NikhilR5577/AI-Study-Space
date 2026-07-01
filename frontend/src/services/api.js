import axios from 'axios';

// 👈 CHANGED: Pointing to your live production backend or local dev
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ai-study-space-backend.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;