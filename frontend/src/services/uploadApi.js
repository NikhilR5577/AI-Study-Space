export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('http://localhost:8000/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) throw new Error('Failed to upload file');
  return response.json();
};

export const processFile = async (filename) => {
  const response = await fetch(`http://localhost:8000/process/file/${filename}`, {
    method: 'POST',
  });
  
  if (!response.ok) throw new Error('Failed to process file');
  return response.json();
};

export const processUrl = async (url) => {
  const response = await fetch('http://localhost:8000/process/url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url }) 
  });
  
  if (!response.ok) throw new Error('Failed to process URL');
  return response.json();
};

export const transcribeAudio = async (audioBlob) => {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.wav');
  
  const response = await fetch('http://localhost:8000/voice/transcribe', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) throw new Error('Audio transcription failed');
  return response.json();
};