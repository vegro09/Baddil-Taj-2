/**
 * Asynchronous, non-blocking IndexedDB storage client for Badal.
 * Helps reduce Total Blocking Time (TBT) by avoiding synchronous localStorage operations
 * and deferring heavy initialization tasks post-FCP.
 */

const DB_NAME = 'BadalOfflineDB';
const STORE_NAME = 'mock_store';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not supported in this environment'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[Badal IndexedDB] Open Error:', request.error);
        reject(request.error);
      };
    } catch (err) {
      console.error('[Badal IndexedDB] Exception opening DB:', err);
      reject(err);
    }
  });

  return dbPromise;
}

// In-memory cache for ultra-fast, non-blocking synchronous access
const memoryCache: Record<string, any> = {};
let isLoaded = false;
let resolveInit: (() => void) | null = null;
const initPromise = new Promise<void>((resolve) => {
  resolveInit = resolve;
});

/**
 * Returns a promise that resolves when the IndexedDB data has been loaded into memory.
 */
export function storageReady(): Promise<void> {
  return initPromise;
}

/**
 * Asynchronously loads all data from IndexedDB into memory, deferring to post-FCP.
 */
export async function asyncInitializeStorage(defaultInitializers: Record<string, any>): Promise<void> {
  if (isLoaded) return;

  // Let's defer execution to post-FCP / next idle frame to avoid blocking initial render
  const deferTimer = new Promise<void>((resolve) => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => resolve(), { timeout: 1500 });
    } else {
      setTimeout(() => resolve(), 800);
    }
  });

  await deferTimer;

  try {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    // Read all keys that exist in our default initializers
    const keys = Object.keys(defaultInitializers);
    
    await Promise.all(
      keys.map((key) => {
        return new Promise<void>((resolveKey) => {
          const request = store.get(key);
          request.onsuccess = () => {
            const val = request.result;
            if (val !== undefined && val !== null) {
              memoryCache[key] = val;
            } else {
              // Try falling back to localStorage if old data exists
              try {
                const lsVal = localStorage.getItem(key);
                if (lsVal) {
                  const parsed = JSON.parse(lsVal);
                  memoryCache[key] = parsed;
                  // Persist to IndexedDB in background
                  asyncSetItem(key, parsed);
                } else {
                  // Use default initializer
                  memoryCache[key] = defaultInitializers[key];
                  asyncSetItem(key, defaultInitializers[key]);
                }
              } catch {
                memoryCache[key] = defaultInitializers[key];
                asyncSetItem(key, defaultInitializers[key]);
              }
            }
            resolveKey();
          };
          request.onerror = () => {
            memoryCache[key] = defaultInitializers[key];
            resolveKey();
          };
        });
      })
    );

    // Also copy CURRENT_MOCK_USER_ID_KEY from localStorage if present
    const mockUserKey = 'badal_current_mock_user_id';
    try {
      const storedUid = localStorage.getItem(mockUserKey);
      memoryCache[mockUserKey] = storedUid !== null ? storedUid : '';
    } catch {
      memoryCache[mockUserKey] = '';
    }

  } catch (err) {
    console.warn('[Badal IndexedDB] Error loading IndexedDB, falling back to localStorage / memory', err);
    // Fallback fully to synchronous/memory defaults
    for (const key of Object.keys(defaultInitializers)) {
      try {
        const lsVal = localStorage.getItem(key);
        memoryCache[key] = lsVal ? JSON.parse(lsVal) : defaultInitializers[key];
      } catch {
        memoryCache[key] = defaultInitializers[key];
      }
    }
  } finally {
    isLoaded = true;
    if (resolveInit) {
      resolveInit();
    }
    console.log('[Badal IndexedDB] Storage asynchronously initialized. Main thread completely unblocked!');
  }
}

export function getMemoryItem<T>(key: string, defaultValue: T): T {
  if (memoryCache[key] !== undefined) {
    return memoryCache[key] as T;
  }
  return defaultValue;
}

export function setMemoryItem<T>(key: string, value: T): void {
  memoryCache[key] = value;
  // Queue writing to IndexedDB asynchronously in background without blocking the caller
  asyncSetItem(key, value);
}

export async function asyncGetItem<T>(key: string): Promise<T | null> {
  if (memoryCache[key] !== undefined) {
    return memoryCache[key] as T;
  }

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const value = request.result;
        memoryCache[key] = value !== undefined ? value : null;
        resolve(memoryCache[key]);
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function asyncSetItem<T>(key: string, value: T): Promise<void> {
  memoryCache[key] = value;

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {
    // Keep in memory
  }
}

export async function asyncRemoveItem(key: string): Promise<void> {
  delete memoryCache[key];

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {
    // Keep in memory
  }
}
