const memoryStorage = new Map<string, string>();

type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

let nativeStorage: StorageLike | null | undefined;
let warned = false;

function getNativeStorage(): StorageLike | null {
  if (nativeStorage !== undefined) {
    return nativeStorage;
  }

  try {
    const mod = require('@react-native-async-storage/async-storage');
    const candidate = mod?.default ?? mod;

    if (
      candidate &&
      typeof candidate.getItem === 'function' &&
      typeof candidate.setItem === 'function' &&
      typeof candidate.removeItem === 'function'
    ) {
      nativeStorage = candidate as StorageLike;
      return nativeStorage;
    }
  } catch (error) {
    if (!warned) {
      warned = true;
      console.warn('[storage] AsyncStorage native module unavailable. Using in-memory fallback.');
    }
  }

  nativeStorage = null;
  return null;
}

const storage: StorageLike = {
  async getItem(key: string): Promise<string | null> {
    const native = getNativeStorage();

    if (native) {
      try {
        return await native.getItem(key);
      } catch {
        // Fallback below.
      }
    }

    return memoryStorage.has(key) ? (memoryStorage.get(key) as string) : null;
  },

  async setItem(key: string, value: string): Promise<void> {
    const native = getNativeStorage();

    if (native) {
      try {
        await native.setItem(key, value);
        return;
      } catch {
        // Fallback below.
      }
    }

    memoryStorage.set(key, value);
  },

  async removeItem(key: string): Promise<void> {
    const native = getNativeStorage();

    if (native) {
      try {
        await native.removeItem(key);
        return;
      } catch {
        // Fallback below.
      }
    }

    memoryStorage.delete(key);
  },
};

export default storage;
