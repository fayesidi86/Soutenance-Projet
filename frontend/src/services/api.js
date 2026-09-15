import axios from 'axios';

// Instance Axios configurée avec le proxy Vite
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur : ajout automatique du token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur : gestion des erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// === Auth API ===

export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  register: (email, password, full_name) =>
    api.post('/auth/register', { email, password, full_name }),

  getMe: () => api.get('/auth/me'),
};

// === Chat API ===

export const chatAPI = {
  ask: (question, conversationId = null) =>
    api.post('/chat/ask', { question, conversation_id: conversationId }),

  askStream: async (question, conversationId = null, { onMetadata, onToken, onError, onComplete }) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/chat/ask/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question, conversation_id: conversationId }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Erreur lors de la communication avec le serveur.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let completeCalled = false; // Garde pour éviter le double appel de onComplete

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.substring(6);
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === 'metadata') {
                if (onMetadata) onMetadata(parsed);
              } else if (parsed.type === 'token') {
                if (onToken) onToken(parsed.text);
              } else if (parsed.type === 'done') {
                if (onComplete && !completeCalled) {
                  completeCalled = true;
                  onComplete();
                }
              }
            } catch (e) {
              console.error('SSE parse error:', e);
            }
          }
        }
      }
      // Appel de secours si le serveur n'a pas envoyé l'événement 'done'
      if (onComplete && !completeCalled) {
        onComplete();
      }
    } catch (err) {
      if (onError) onError(err.message || 'Une erreur est survenue.');
    }
  },

  getConversations: () => api.get('/chat/conversations'),

  getConversationDetail: (conversationId) =>
    api.get(`/chat/conversations/${conversationId}`),

  deleteConversation: (conversationId) =>
    api.delete(`/chat/conversations/${conversationId}`),
};

// === Admin API ===

export const adminAPI = {
  uploadDocument: (file, title) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    return api.post('/admin/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getDocuments: () => api.get('/admin/documents'),

  deleteDocument: (documentId) =>
    api.delete(`/admin/documents/${documentId}`),

  // --- Gestion des utilisateurs ---
  getUsers: () => api.get('/admin/users'),

  toggleUserAdmin: (userId) =>
    api.patch(`/admin/users/${userId}/toggle-admin`),

  toggleUserActive: (userId) =>
    api.patch(`/admin/users/${userId}/toggle-active`),

  deleteUser: (userId) =>
    api.delete(`/admin/users/${userId}`),
};

export default api;
