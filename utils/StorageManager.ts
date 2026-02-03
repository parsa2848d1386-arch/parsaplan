
import { SubjectTask, DailyRoutineSlot, LogEntry, MoodType } from '../types';

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
    settings: {
        darkMode: boolean;
        viewMode: 'normal' | 'compact';
    };
    lastUpdated: number;
    schemaVersion?: number;
}

// Current Schema Version
const CURRENT_SCHEMA_VERSION = 1;

// Storage Keys
const KEY_PREFIX = 'parsaplan_v4_';
const KEY_DATA_BLOB = KEY_PREFIX + 'full_data';
const KEY_BACKUP = KEY_PREFIX + 'backup_safe';

// --- STORAGE MANAGER CLASS ---

export class StorageManager {

    /**
     * Saves data to LocalStorage with a safety backup.
     */
    static save(data: Partial<AppDataV1>): boolean {
        try {
            // Ensure schema version is attached
            const dataToSave = {
                ...data,
                schemaVersion: CURRENT_SCHEMA_VERSION,
                lastUpdated: Date.now()
            };

            const serialized = JSON.stringify(dataToSave);
            localStorage.setItem(KEY_DATA_BLOB, serialized);
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
    static createBackup(): boolean {
        try {
            const currentData = localStorage.getItem(KEY_DATA_BLOB);
            if (currentData) {
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
     * Loads data from LocalStorage with fallback to backup if main data is corrupt.
     * Also handles schema migration if needed.
     */
    static load(): AppDataV1 | null {
        try {
            const rawData = localStorage.getItem(KEY_DATA_BLOB);

            if (rawData) {
                try {
                    const parsed = JSON.parse(rawData);
                    return this.migrateDataIfNeeded(parsed);
                } catch (parseError) {
                    console.error("Main data corrupt, attempting to load backup...", parseError);
                    return this.loadBackup();
                }
            }
            return null; // No data found (fresh user)
        } catch (e) {
            console.error("Storage Load Failed:", e);
            return null;
        }
    }

    /**
     * Internal: Loads from the backup slot.
     */
    private static loadBackup(): AppDataV1 | null {
        try {
            const backupRaw = localStorage.getItem(KEY_BACKUP);
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
     * Currently simply checks version, but designed to expand.
     */
    private static migrateDataIfNeeded(data: any): AppDataV1 {
        // If data has no version, assume it is Version 0 or 1 (Current)
        const version = data.schemaVersion || 1;

        if (version < CURRENT_SCHEMA_VERSION) {
            console.log(`Migrating data from v${version} to v${CURRENT_SCHEMA_VERSION}...`);
            // Implement migration logic here when we up the version
            // e.g. if (version === 1) { data = migrateV1toV2(data); }

            // For now, just update the version
            data.schemaVersion = CURRENT_SCHEMA_VERSION;
        }

        return data as AppDataV1;
    }

    /**
     * Clears all app data (Destructive)
     */
    static clearAll() {
        localStorage.removeItem(KEY_DATA_BLOB);
        // We might want to keep the backup or config?
        // For hard reset:
        // localStorage.removeItem(KEY_BACKUP); 
    }
}
