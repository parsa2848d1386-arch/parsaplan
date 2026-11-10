import {
    SubjectTask,
    DailyRoutineSlot,
    LogEntry,
    MoodType,
    CustomSubject,
    AppSettings,
    ArchivedPlan,
    Flashcard,
    StudySession,
    NotebookPage,
    StylusStroke,
} from '../types';
import { get, set, del } from 'idb-keyval';

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
    studyHoursLog?: Record<string, number>;
    sessions?: StudySession[];
    notebookPages?: NotebookPage[];
    stylusStrokes?: StylusStroke[];
    settings: AppSettings;
    lastUpdated: number;
    schemaVersion?: number;
}

const CURRENT_SCHEMA_VERSION = 3;
const KEY_PREFIX = 'parsaplan_v4_';
const KEY_BACKUP = 'parsaplan_backup_v4';
const KEY_DATA_DEFAULT = KEY_PREFIX + 'full_data';
const KEY_LOCAL_GEMINI = 'parsaplan_local_gemini_key';

export class StorageManager {
    private static getScopedKey(userId: string | undefined): string {
        if (!userId || userId === 'parsaplan_local_user' || userId === 'parsaplan_main_user') {
            return KEY_DATA_DEFAULT;
        }
        return `${KEY_PREFIX}user_${userId}_data`;
    }

    /**
     * Stores Gemini API key strictly locally (never sent to Firestore cloud doc).
     */
    static saveLocalGeminiKey(key: string): void {
        try {
            if (key) {
                localStorage.setItem(KEY_LOCAL_GEMINI, key);
                localStorage.setItem('gemini_api_key', key);
            } else {
                localStorage.removeItem(KEY_LOCAL_GEMINI);
                localStorage.removeItem('gemini_api_key');
            }
        } catch {
            // Ignore private mode restrictions
        }
    }

    static loadLocalGeminiKey(): string {
        try {
            return localStorage.getItem(KEY_LOCAL_GEMINI) || localStorage.getItem('gemini_api_key') || '';
        } catch {
            return '';
        }
    }

    static async save(data: Partial<AppDataV1>, userId?: string): Promise<boolean> {
        try {
            const dataToSave = {
                ...data,
                schemaVersion: CURRENT_SCHEMA_VERSION,
                lastUpdated: Date.now(),
            };
            const key = this.getScopedKey(userId);
            await set(key, dataToSave);
            return true;
        } catch (e) {
            console.error('Storage Save Failed:', e);
            return false;
        }
    }

    static async createBackup(userId?: string): Promise<boolean> {
        try {
            const key = this.getScopedKey(userId);
            const currentData = await get(key);
            if (currentData) {
                await set(key + '_backup', currentData);
                await set(KEY_BACKUP, currentData);
                return true;
            }
            return false;
        } catch (e) {
            console.error('Backup Failed:', e);
            return false;
        }
    }

    static async load(userId?: string): Promise<AppDataV1 | null> {
        try {
            const key = this.getScopedKey(userId);
            let parsedData = await get(key);

            if (!parsedData) {
                const localRaw = localStorage.getItem(key);
                if (localRaw) {
                    try {
                        parsedData = JSON.parse(localRaw);
                        await set(key, parsedData);
                    } catch (e) {
                        console.error('Failed to migrate localStorage data', e);
                    }
                }
            }

            if (parsedData) {
                return this.migrateDataIfNeeded(parsedData);
            }

            return await this.loadBackup(userId);
        } catch (e) {
            console.error('Storage Load Failed:', e);
            return null;
        }
    }

    private static async loadBackup(userId?: string): Promise<AppDataV1 | null> {
        try {
            const key = this.getScopedKey(userId);
            const backupKey = key + '_backup';
            let parsedBackup = (await get(backupKey)) || (await get(KEY_BACKUP));

            if (!parsedBackup) {
                const localBackupRaw = localStorage.getItem(backupKey) || localStorage.getItem(KEY_BACKUP);
                if (localBackupRaw) {
                    parsedBackup = JSON.parse(localBackupRaw);
                    await set(KEY_BACKUP, parsedBackup);
                }
            }

            if (parsedBackup) {
                return this.migrateDataIfNeeded(parsedBackup);
            }
        } catch (e) {
            console.error('Backup load failed:', e);
        }
        return null;
    }

    private static migrateDataIfNeeded(data: any): AppDataV1 {
        const version = data.schemaVersion || 1;
        if (version < 2) {
            data.schemaVersion = 2;
        }
        if (version < 3) {
            // Normalize tasks for Phase 2+ multi-view & Notion block fields
            if (Array.isArray(data.tasks)) {
                data.tasks = data.tasks.map((t: SubjectTask) => ({
                    ...t,
                    status: t.status || (t.isCompleted ? 'completed' : 'todo'),
                    priority: t.priority || 'medium',
                    durationMinutes: t.durationMinutes ?? 60,
                    blocks: Array.isArray(t.blocks) ? t.blocks : [],
                }));
            }
            if (!Array.isArray(data.sessions)) data.sessions = [];
            if (!Array.isArray(data.notebookPages)) data.notebookPages = [];
            if (!Array.isArray(data.stylusStrokes)) data.stylusStrokes = [];
            if (data.settings) {
                data.settings.dayCutoffHour = data.settings.dayCutoffHour ?? 5;
                data.settings.pomodoroWorkMinutes = data.settings.pomodoroWorkMinutes ?? 25;
                data.settings.pomodoroBreakMinutes = data.settings.pomodoroBreakMinutes ?? 5;
                data.settings.dailyCapacityMinutes = data.settings.dailyCapacityMinutes ?? 360;
                // Extract legacy geminiApiKey to local storage if present
                if (data.settings.geminiApiKey && !this.loadLocalGeminiKey()) {
                    this.saveLocalGeminiKey(data.settings.geminiApiKey);
                }
            }
            data.schemaVersion = CURRENT_SCHEMA_VERSION;
        }
        return data as AppDataV1;
    }

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
