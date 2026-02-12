import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // Verify token format before sending
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('Invalid token format detected - token not sent');
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.warn('Error processing token - token not sent');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
  return config;
});

// Handle token expiration - but don't redirect on optional auth endpoints
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't auto-logout on like/unlike endpoints or recipe suggestions - let the component handle it
    const isLikeEndpoint = error.config?.url?.includes('/like');
    const isRecipeSuggestions = error.config?.url?.includes('/recipes/suggestions');

    // Only auto-logout on 401/403 for endpoints that require authentication
    // Recipe suggestions uses optionalAuth, so don't logout on that
    if ((error.response?.status === 401 || error.response?.status === 403) && !isLikeEndpoint && !isRecipeSuggestions) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const getUserProfile = async (userId: string) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const updateUserPreferences = async (
  userId: string,
  dietaryPreferences: string[],
  allergies: string[]
) => {
  const response = await api.put(`/users/${userId}/preferences`, {
    dietaryPreferences,
    allergies,
  });
  return response.data;
};

export const getPantry = async (userId: string) => {
  const response = await api.get(`/pantry/${userId}`);
  return response.data;
};

export const addToPantry = async (userId: string, items: string[]) => {
  const response = await api.post(`/pantry/${userId}/items`, { items });
  return response.data;
};

export const removeFromPantry = async (userId: string, items: string[]) => {
  const response = await api.delete(`/pantry/${userId}/items`, { data: { items } });
  return response.data;
};

export const getAllIngredients = async () => {
  const response = await api.get('/pantry/ingredients/all');
  return response.data;
};

export const getRecipeSuggestions = async (userId: string, pantryItems: string[]) => {
  // Token is automatically added by the interceptor
  // Note: userId parameter is not sent - it's extracted from the token on the server
  const token = localStorage.getItem('token');
  console.log('getRecipeSuggestions called with userId:', userId, 'Token exists:', !!token);

  const response = await api.post('/recipes/suggestions', {
    pantryItems,
  });
  return response.data;
};

export const getAllRecipes = async () => {
  const response = await api.get('/recipes');
  return response.data;
};

export const getRecipeDetails = async (recipeId: string) => {
  const response = await api.get(`/recipes/${recipeId}`);
  return response.data;
};

// Create a new recipe
export const createRecipe = async (recipeData: {
  name: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: string;
  dietaryTags?: string[];
  ingredients: string[];
}) => {
  const response = await api.post('/recipes', recipeData);
  return response.data;
};

// Fetch recipes from web API
export const fetchWebRecipes = async (options: {
  searchTerm?: string;
  category?: string;
}) => {
  const response = await api.post('/recipes/fetch-web', options);
  return response.data;
};

// Get web recipe categories
export const getWebCategories = async () => {
  const response = await api.get('/recipes/web/categories');
  return response.data;
};

// Debug endpoint to check user data
export const getUserDebugInfo = async (userId: string) => {
  const response = await api.get(`/users/${userId}/debug`);
  return response.data;
};

// Auth endpoints
export const signup = async (email: string, password: string, name?: string) => {
  const response = await api.post('/auth/signup', { email, password, name });
  return response.data;
};

export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const forgotPassword = async (email: string) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token: string, newPassword: string) => {
  const response = await api.post('/auth/reset-password', { token, newPassword });
  return response.data;
};

// Debug endpoint to check password (development only)
export const debugCheckPassword = async (email: string, password: string) => {
  const response = await api.post('/auth/debug/check-password', { email, password });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Like endpoints
export const likeRecipe = async (recipeId: string) => {
  // Token is automatically added by the interceptor, but we verify it exists
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found. Please log in.');
  }

  // Verify token is not expired by checking if it's a valid JWT structure
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
  } catch (error) {
    throw new Error('Invalid token. Please log in again.');
  }

  const response = await api.post(`/recipes/${recipeId}/like`);
  return response.data;
};

export const unlikeRecipe = async (recipeId: string) => {
  // Token is automatically added by the interceptor, but we verify it exists
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found. Please log in.');
  }

  // Verify token is not expired by checking if it's a valid JWT structure
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
  } catch (error) {
    throw new Error('Invalid token. Please log in again.');
  }

  const response = await api.delete(`/recipes/${recipeId}/like`);
  return response.data;
};

export const getLikedRecipes = async () => {
  const response = await api.get('/recipes/liked');
  return response.data;
};

// User profile endpoints
export const updateUserProfile = async (data: { name?: string; age?: number }) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated');

  // Get userId from token (you might want to decode JWT or get from context)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const response = await api.put(`/users/${user.id}/profile`, data);
  return response.data;
};

export const uploadProfilePicture = async (profilePicture: string) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const response = await api.put(`/users/${user.id}/profile-picture`, { profilePicture });

  // Update user in localStorage
  if (response.data.user) {
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }

  return response.data;
};