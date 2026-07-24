import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000'
});

export const mintTokens = (payload) => api.post('/mint', payload);
export const burnTokens = (payload) => api.post('/burn', payload);
export const getBalance = (address) => api.get(`/balance/${address}`);
