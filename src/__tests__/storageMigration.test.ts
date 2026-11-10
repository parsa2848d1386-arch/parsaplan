import { describe, it, expect, vi, beforeEach } from 'vitest';

const idbStore = new Map<string, any>();

vi.mock('idb-keyval', () => ({
    get: vi.fn(async (key: string) => idbStore.get(key)),
    set: vi.fn(async (key: string, val: any) => {
        idbStore.set(key, val);
    }),
    del: vi.fn(async (key: string) => {
        idbStore.delete(key);
    }),
}));

import { StorageManager } from '../../utils/StorageManager';
import { sanitizeSnapshotForCloud, isCloudSyncAllowed, syncEngine } from '../../services/syncEngine';

describe('StorageManager v3 migration & Cloud Sync privacy guards', () => {
    beforeEach(() => {
        idbStore.clear();
        localStorage.clear();
    });

    it('migrates v1 legacy data into schema v3 and extracts geminiApiKey locally', async () => {
        idbStore.set('parsaplan_v4_full_data', {
            userName: 'پارسا',
            tasks: [
                {
                    id: 'legacy-1',
                    dayId: 1,
                    date: '2026-05-10',
                    subject: 'ریاضیات',
                    topic: 'حد',
                    details: 'تست',
                    isCompleted: false,
                },
            ],
            routine: [],
            routineTemplate: [],
            notes: {},
            xp: 120,
            logs: [],
            moods: {},
            startDate: '2026-05-01',
            settings: {
                darkMode: false,
                viewMode: 'normal',
                showQuotes: true,
                stream: 'riazi',
                notifications: true,
                soundEnabled: true,
                language: 'fa',
                geminiModel: 'gemini-2.0-flash',
                geminiApiKey: 'AIza-secret-client-key',
            },
            lastUpdated: 1000,
        });

        const migrated = await StorageManager.load('parsaplan_local_user');
        expect(migrated).not.toBeNull();
        expect(migrated?.schemaVersion).toBe(3);
        expect(migrated?.tasks[0].status).toBe('todo');
        expect(migrated?.tasks[0].durationMinutes).toBe(60);
        expect(migrated?.sessions).toEqual([]);
        expect(migrated?.notebookPages).toEqual([]);
        expect(migrated?.settings.dayCutoffHour).toBe(5);
        expect(StorageManager.loadLocalGeminiKey()).toBe('AIza-secret-client-key');
    });

    it('strips geminiApiKey before Firestore cloud upload', () => {
        const sanitized = sanitizeSnapshotForCloud({
            userName: 'پارسا',
            settings: {
                darkMode: true,
                viewMode: 'normal',
                showQuotes: true,
                stream: 'tajrobi',
                notifications: true,
                soundEnabled: true,
                language: 'fa',
                geminiModel: 'gemini-2.0-flash',
                geminiApiKey: 'SENSITIVE_KEY_MUST_NOT_LEAK',
            },
        });

        expect((sanitized as any).settings.geminiApiKey).toBeUndefined();
        expect((sanitized as any).settings.stream).toBe('tajrobi');
    });

    it('blocks cloud sync for guest parsaplan_local_user and queues offline edits for authenticated uid', async () => {
        expect(isCloudSyncAllowed({} as any, 'parsaplan_local_user', null)).toBe(false);
        expect(isCloudSyncAllowed({} as any, 'user_123', { uid: 'user_123' })).toBe(true);

        const guestQueueCount = await syncEngine.enqueue('parsaplan_local_user', {
            type: 'upsert_task',
            entityId: 't1',
        });
        expect(guestQueueCount).toBe(0);

        const realCount = await syncEngine.enqueue('user_123', {
            type: 'upsert_task',
            entityId: 't1',
            payload: { id: 't1' },
        });
        expect(realCount).toBe(1);
    });
});
