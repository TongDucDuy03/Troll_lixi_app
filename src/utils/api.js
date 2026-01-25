const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper function to get auth token
const getToken = () => {
  return localStorage.getItem('auth_token');
};

// Helper function to set auth token
export const setToken = (token) => {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

// API request helper
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

// Auth API
export const authAPI = {
  register: async (email, password, displayName) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
  },

  login: async (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getMe: async () => {
    return apiRequest('/auth/me');
  },

  updateProfile: async (displayName) => {
    return apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ displayName }),
    });
  },
};

// Game API
export const gameAPI = {
  getState: async () => {
    return apiRequest('/game/state');
  },

  updateState: async (roleInventories, riggingConfig) => {
    return apiRequest('/game/state', {
      method: 'PUT',
      body: JSON.stringify({ roleInventories, riggingConfig }),
    });
  },

  addSpinHistory: async (spinData) => {
    return apiRequest('/game/spin-history', {
      method: 'POST',
      body: JSON.stringify(spinData),
    });
  },

  getSpinHistory: async (limit = 50) => {
    return apiRequest(`/game/spin-history?limit=${limit}`);
  },
};
