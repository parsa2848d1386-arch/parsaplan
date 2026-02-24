import { SubjectTask, DailyRoutineSlot, LogEntry, MoodType, CustomSubject, StreamType, AppSettings, ArchivedPlan, Flashcard } from '../types';
import { get, set, del } from 'idb-keyval';

// --- TYPES ---
export interface AppDataV1 {
    tasks: SubjectTask[];
    userName: string;
    routine: string[];
    routineTemplate: DailyRoutineSlot[];
    notes: Record<string, string>;
    xp: number;
    logs: LogEntry[];
    moods: Record<string, MoodType>;
    startDate: string;
    totalDays?: number;
    subjects?: CustomSubject[];
    customSubjects?: CustomSubject[];
    archivedPlans?: ArchivedPlan[];
    flashcards?: Flashcard[];
    settings: AppSettings;
    lastUpdated: number;
    schemaVersion?: number;
}

// Current Schema Version
const CURRENT_SCHEMA_VERSION = 2;

// --- CONSTANTS ---
const KEY_PREFIX = 'parsaplan_v4_';
const KEY_BACKUP = 'parsaplan_backup_v4';
const KEY_DATA_DEFAULT = KEY_PREFIX + 'full_data';

// --- STORAGE MANAGER CLASS ---

export class StorageManager {

    private static getScopedKey(userId: string | undefined): string {
        if (!userId || userId === 'parsaplan_local_user' || userId === 'parsaplan_main_user') {
            return KEY_DATA_DEFAULT;
        }
        return `${KEY_PREFIX}user_${userId}_data`;
    }

    /**
     * Saves data to IndexedDB with user scoping.
     */
    static async save(data: Partial<AppDataV1>, userId?: string): Promise<boolean> {
        try {
            const dataToSave = {
                ...data,
                schemaVersion: CURRENT_SCHEMA_VERSION,
                lastUpdated: Date.now()
            };

            const key = this.getScopedKey(userId);
            await set(key, dataToSave);
            return true;
        } catch (e) {
            console.error("Storage Save Failed:", e);
            return false;
        }
    }

    /**
     * Creates a secondary backup of the current valid data.
     */
    static async createBackup(userId?: string): Promise<boolean> {
        try {
            const key = this.getScopedKey(userId);
            const currentData = await get(key);
            if (currentData) {
                const backupKey = key + '_backup';
                await set(backupKey, currentData);
                await set(KEY_BACKUP, currentData);
                console.log("Local backup created successfully via IDB.");
                return true;
            }
            return false;
        } catch (e) {
            console.error("Backup Failed:", e);
            return false;
        }
    }

    /**
     * Loads data from IndexedDB for the specific user. Includes migration from localStorage.
     */
    static async load(userId?: string): Promise<AppDataV1 | null> {
        try {
            const key = this.getScopedKey(userId);

            // 1. First attempt to load from IndexedDB
            let parsedData = await get(key);

            // 2. Migration from localStorage if not found in IDB
            if (!parsedData) {
                const localRaw = localStorage.getItem(key);
                if (localRaw) {
                    try {
                        parsedData = JSON.parse(localRaw);
                        console.log("Migrated user data from localStorage to IndexedDB");
                        await set(key, parsedData);
                        // We do not delete from localStorage immediately to be safe, but we've migrated it.
                    } catch (e) {
                        console.error("Failed to migrate localStorage data", e);
                    }
                }
            }

            if (parsedData) {
                return this.migrateDataIfNeeded(parsedData);
            }

            // 3. If still not found, try backup
            return await this.loadBackup(userId);

        } catch (e) {
            console.error("Storage Load Failed:", e);
            return null;
        }
    }

    /**
     * Internal: Loads from the backup slot.
     */
    private static async loadBackup(userId?: string): Promise<AppDataV1 | null> {
        try {
            const key = this.getScopedKey(userId);
            const backupKey = key + '_backup';

            let parsedBackup = await get(backupKey) || await get(KEY_BACKUP);

            // Migrate from local storage backup if needed
            if (!parsedBackup) {
                const localBackupRaw = localStorage.getItem(backupKey) || localStorage.getItem(KEY_BACKUP);
                if (localBackupRaw) {
                    parsedBackup = JSON.parse(localBackupRaw);
                    await set(KEY_BACKUP, parsedBackup);
                }
            }

            if (parsedBackup) {
                console.warn("Restored from Backup!");
                return this.migrateDataIfNeeded(parsedBackup);
            }
        } catch (e) {
            console.error("Backup load failed:", e);
        }
        return null;
    }

    /**
     * Handles schema migrations logic.
     */
    private static migrateDataIfNeeded(data: any): AppDataV1 {
        const version = data.schemaVersion || 1;

        if (version < CURRENT_SCHEMA_VERSION) {
            console.log(`Migrating data from v${version} to v${CURRENT_SCHEMA_VERSION}...`);
            data.schemaVersion = CURRENT_SCHEMA_VERSION;
        }

        return data as AppDataV1;
    }

    /**
     * Clears all app data for specific user or everything
     */
    static async clearAll(userId?: string) {
        if (userId) {
            const key = this.getScopedKey(userId);
            await del(key);
            await del(key + '_backup');
            localStorage.removeItem(key);
            localStorage.removeItem(key + '_backup');
        } else {
            await del(KEY_DATA_DEFAULT);
            await del(KEY_BACKUP);
            localStorage.removeItem(KEY_DATA_DEFAULT);
            localStorage.removeItem(KEY_BACKUP);
        }
    }
}

