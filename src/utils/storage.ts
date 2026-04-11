import * as SecureStore from 'expo-secure-store';

const memoryStorage = new Map<string, string>();

type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

// Use Expo Secure Store as primary storage (works in both Expo Go and Development builds)
const storage: StorageLike = {
  async getItem(key: string): Promise<string | null> {
    // Try memory storage first for development speed
    if (memoryStorage.has(key)) {
      return memoryStorage.get(key) as string;
    }
    
    // Try Secure Store
    try {
      const result = await SecureStore.getItemAsync(key);
      if (result !== null) {
        // Cache in memory for faster access
        memoryStorage.set(key, result);
        return result;
      }
    } catch (error) {
      console.warn('[storage] SecureStore getItem failed, using memory fallback:', error);
    }
    
    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    // Always set in memory for immediate access
    memoryStorage.set(key, value);
    
    // Try Secure Store
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn('[storage] SecureStore setItem failed, using memory fallback:', error);
    }
  },

  async removeItem(key: string): Promise<void> {
    // Remove from memory
    memoryStorage.delete(key);
    
    // Try Secure Store
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn('[storage] SecureStore removeItem failed, using memory fallback:', error);
    }
  },
};

export default storage;
