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
  // dY`^ FIXED: Using api instance and URL encoding the filename for safe path parameters
  const response = await api.post(`/process/file/${encodeURIComponent(filename)}`);
  
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