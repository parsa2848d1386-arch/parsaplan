
import { SubjectTask, DailyRoutineSlot, LogEntry, MoodType, CustomSubject, StreamType, AppSettings, ArchivedPlan } from '../types';

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
    settings: AppSettings;
    lastUpdated: number;
    schemaVersion?: number;
}

// Current Schema Version
const CURRENT_SCHEMA_VERSION = 1;

// --- CONSTANTS ---
const KEY_PREFIX = 'parsaplan_v4_'; // Retained for backward compatibility with user-scoped keys
const STORAGE_KEY = 'parsaplan_data_v4';
const KEY_BACKUP = 'parsaplan_backup_v4';
const KEY_DATA_DEFAULT = KEY_PREFIX + 'full_data'; // Legacy/Default

// --- STORAGE MANAGER CLASS ---

export class StorageManager {

    private static getScopedKey(userId: string | undefined): string {
        if (!userId || userId === 'parsaplan_local_user' || userId === 'parsaplan_main_user') {
            return KEY_DATA_DEFAULT;
        }
        return `${KEY_PREFIX}user_${userId}_data`;
    }

    /**
     * Saves data to LocalStorage with user scoping.
     */
    static save(data: Partial<AppDataV1>, userId?: string): boolean {
        try {
            // Ensure schema version is attached
            const dataToSave = {
                ...data,
                schemaVersion: CURRENT_SCHEMA_VERSION,
                lastUpdated: Date.now()
            };

            const key = this.getScopedKey(userId);
            const serialized = JSON.stringify(dataToSave);
            localStorage.setItem(key, serialized);
            return true;
        } catch (e) {
            console.error("Storage Save Failed:", e);
            return false;
        }
    }

    /**
     * Creates a secondary backup of the current valid data.
     * Should be called before major operations.
     */
    static createBackup(userId?: string): boolean {
        try {
            const key = this.getScopedKey(userId);
            const currentData = localStorage.getItem(key);
            if (currentData) {
                // Backup key also needs to be essentially safe, but for simplicity we keep one main backup slot
                // or specific backups? Let's use a specific backup for safety.
                const backupKey = key + '_backup';
                localStorage.setItem(backupKey, currentData);
                // Also update global backup for emergency recovery
                localStorage.setItem(KEY_BACKUP, currentData);
                console.log("Local backup created successfully.");
                return true;
            }
            return false;
        } catch (e) {
            console.error("Backup Failed:", e);
            return false;
        }
    }

    /**
     * Loads data from LocalStorage for the specific user.
     */
    static load(userId?: string): AppDataV1 | null {
        try {
            const key = this.getScopedKey(userId);
            const rawData = localStorage.getItem(key);

            if (rawData) {
                try {
                    const parsed = JSON.parse(rawData);
                    return this.migrateDataIfNeeded(parsed);
                } catch (parseError) {
                    console.error("Main data corrupt, attempting to load backup...", parseError);
                    return this.loadBackup(userId);
                }
            }
            return null; // No data found (fresh user slot)
        } catch (e) {
            console.error("Storage Load Failed:", e);
            return null;
        }
    }

    /**
     * Internal: Loads from the backup slot.
     */
    private static loadBackup(userId?: string): AppDataV1 | null {
        try {
            const key = this.getScopedKey(userId);
            const backupKey = key + '_backup';
            const backupRaw = localStorage.getItem(backupKey) || localStorage.getItem(KEY_BACKUP);

            if (backupRaw) {
                const parsed = JSON.parse(backupRaw);
                console.warn("Restored from Backup!");
                return this.migrateDataIfNeeded(parsed);
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
    static clearAll(userId?: string) {
        if (userId) {
            const key = this.getScopedKey(userId);
            localStorage.removeItem(key);
            localStorage.removeItem(key + '_backup');
        } else {
            localStorage.removeItem(KEY_DATA_DEFAULT);
            localStorage.removeItem(KEY_BACKUP);
        }
    }
}
