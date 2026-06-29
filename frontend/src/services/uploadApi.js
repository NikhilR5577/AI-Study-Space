import api from './api'; // 👈 FIXED: Importing your central API config

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // 👈 FIXED: Using api instance
  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  
  return response.data;
};

export const processFile = async (filename) => {
  // 👈 FIXED: Using api instance
  const response = await api.post(`/process/file/${filename}`);
  
  return response.data;
};

export const processUrl = async (url) => {
  // 👈 FIXED: Using api instance
  const response = await api.post('/process/url', { url: url });
  
  return response.data;
};

export const transcribeAudio = async (audioBlob) => {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.wav');
  
  // 👈 FIXED: Using api instance
  const response = await api.post('/voice/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  
  return response.data;
};