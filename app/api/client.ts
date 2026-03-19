// app/api/client.ts
import AsyncStorage from '@/utils/storage';
import axios from 'axios';

// Create axios instance with default URL
const apiClient = axios.create({
  baseURL: "https://inmate-project-global-server.onrender.com/", // Default fallback URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to set the baseURL before each request
apiClient.interceptors.request.use(async (config) => {
  try {
    // Get the stored location
    const locationString = await AsyncStorage.getItem('@selectedLocation');
    if (locationString) {
      const location = JSON.parse(locationString);
      if (location?.baseUrl) {
        // Update the baseURL for this request
        config.baseURL = location.baseUrl;
      }
    }
  } catch (error) {
    console.log('Error setting baseURL:', error);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Rest of your interceptors...
apiClient.interceptors.request.use(
  async (config) => {
    const authData = await AsyncStorage.getItem('@authData');
    if (authData) {
      const { user } = JSON.parse(authData);
      if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
