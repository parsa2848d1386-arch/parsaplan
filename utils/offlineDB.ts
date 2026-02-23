/**
 * IndexedDB helper for Offline-First data persistence (Phase 2).
 * Provides a fallback-safe wrapper around IndexedDB for storing app data
 * when localStorage is insufficient or unavailable.
 */

const DB_NAME = 'parsaplan_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

export const OfflineDB = {
    async save(key: string, data: any): Promise<boolean> {
        try {
            const db = await openDB();
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.put(data, key);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => {
                    console.error('IndexedDB save error', tx.error);
                    resolve(false);
                };
            });
        } catch (e) {
            console.warn('IndexedDB not available, falling back to localStorage');
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch { return false; }
        }
    },

    async load(key: string): Promise<any | null> {
        try {
            const db = await openDB();
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result ?? null);
                request.onerror = () => {
                    console.error('IndexedDB load error', request.error);
                    resolve(null);
                };
            });
        } catch (e) {
            console.warn('IndexedDB not available, falling back to localStorage');
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : null;
            } catch { return null; }
        }
    },

    async remove(key: string): Promise<boolean> {
        try {
            const db = await openDB();
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.delete(key);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            });
        } catch { return false; }
    },

    async getAll(): Promise<Record<string, any>> {
        try {
            const db = await openDB();
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const result: Record<string, any> = {};
                const cursorRequest = store.openCursor();
                cursorRequest.onsuccess = (event) => {
                    const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                    if (cursor) {
                        result[cursor.key as string] = cursor.value;
                        cursor.continue();
                    } else {
                        resolve(result);
                    }
                };
                cursorRequest.onerror = () => resolve({});
            });
        } catch { return {}; }
    }
};
