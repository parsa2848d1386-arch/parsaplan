import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useMemo, useCallback } from 'react';
import {
    SubjectTask,
    LogEntry,
    MoodType,
    DailyRoutineSlot,
    ToastMessage,
    ToastType,
    ConfirmDialogState,
    FirebaseConfig,
    CustomSubject,
    AppSettings,
    StreamType,
    ArchivedPlan,
    SUBJECT_LISTS,
    getSubjectStyle,
    Flashcard,
    StudySession,
    NotebookPage,
    StylusStroke,
    StreakResult,
    BlockNote,
    TaskStatus,
} from '../types';
import { TOTAL_DAYS, MOTIVATIONAL_QUOTES, DAILY_ROUTINE } from '../constants';
import { addDays, toIsoString, getDiffDays, getFullShamsiDate, soundFX } from '../utils';
import { StorageManager, AppDataV1 } from '../utils/StorageManager';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { calculateLevelInfo, getXpReward, XP_REWARDS } from '../utils/xpSystem';
import { buildStudyMinutesByDate, calculateStreak, getLogicalDateKey } from '../utils/streakEngine';
import { isCloudSyncAllowed, syncEngine } from '../services/syncEngine';
import { SynergyCompletionResult } from '../services/synergyBridge';

import { doc, onSnapshot, Firestore } from 'firebase/firestore';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import { UIProvider, useUI } from './UIContext';
import { User } from 'firebase/auth';

interface StoreContextType {
    user: User | null;
    db: Firestore | null;
    userName: string;
    setUserName: (name: string) => void;
    currentDay: number;
    setCurrentDay: (day: number) => void;
    startDate: string;
    setStartDate: (date: string) => void;
    tasks: SubjectTask[];
    toggleTask: (taskId: string) => void;
    addTask: (task: SubjectTask) => void;
    updateTask: (task: SubjectTask) => void;
    deleteTask: (taskId: string) => void;
    moveTaskToDate: (taskId: string, newIsoDate: string) => void;
    scheduleReview: (taskId: string, daysLater: number) => void;
    updateTaskBlocks: (taskId: string, blocks: BlockNote[]) => void;
    toggleTaskMIT: (taskId: string) => void;
    updateTaskStatus: (taskId: string, status: TaskStatus) => void;
    toggleRoutineSlot: (dayId: number, slotId: number) => void;
    isRoutineSlotCompleted: (dayId: number, slotId: number) => boolean;
    getTasksForDay: (dayId: number) => SubjectTask[];
    getDayDate: (dayId: number) => string;
    getTasksByDate: (isoDate: string) => SubjectTask[];
    getProgress: () => number;
    resetProgress: () => void;
    goToToday: () => void;
    todayDayId: number;
    autoFixDate: () => void;
    shiftIncompleteTasks: () => void;
    rebalancePlan: () => void;
    totalDays: number;
    setTotalDays: (days: number) => void;

    // Sessions & Synergy Bridge
    sessions: StudySession[];
    addStudySession: (session: StudySession) => void;
    deleteStudySession: (sessionId: string) => void;
    completeFocusSynergy: (result: SynergyCompletionResult) => void;
    streakStats: StreakResult;
    studyMinutesByDate: Record<string, number>;

    // Notebook Pages & Stylus
    notebookPages: NotebookPage[];
    createNotebookPage: (page: Omit<NotebookPage, 'id' | 'createdAt' | 'updatedAt'>) => NotebookPage;
    updateNotebookPage: (id: string, updates: Partial<NotebookPage>) => void;
    deleteNotebookPage: (id: string) => void;
    stylusStrokes: StylusStroke[];
    setStylusStrokes: (strokes: StylusStroke[]) => void;

    // Notes
    dailyNotes: Record<string, string>;
    saveDailyNote: (isoDate: string, note: string) => void;
    getDailyNote: (isoDate: string) => string;

    // Backup & Sync
    exportData: () => void;
    importData: (jsonData: string) => boolean;
    syncData: () => Promise<void>;
    loadFromCloud: () => Promise<void>;
    isSyncing: boolean;
    lastSyncTime: number | null;
    syncQueueCount: number;
    cloudStatus: 'disconnected' | 'connected' | 'error';
    userId: string;

    // Auth Methods
    login: (u: string, p: string) => Promise<boolean>;
    register: (u: string, p: string, name: string) => Promise<boolean>;
    logout: () => Promise<void>;

    // Firebase Config Management
    firebaseConfig: FirebaseConfig | null;
    updateFirebaseConfig: (config: FirebaseConfig) => void;
    removeFirebaseConfig: () => void;

    // UI State
    darkMode: boolean;
    toggleDarkMode: () => void;
    viewMode: 'normal' | 'compact';
    setViewMode: (mode: 'normal' | 'compact') => void;
    showQuotes: boolean;
    toggleShowQuotes: () => void;
    isTimerOpen: boolean;
    setIsTimerOpen: (isOpen: boolean) => void;
    showConfetti: boolean;
    setShowConfetti: (show: boolean) => void;
    isCommandPaletteOpen: boolean;
    setIsCommandPaletteOpen: (isOpen: boolean) => void;
    isAiPanelOpen: boolean;
    setIsAiPanelOpen: (isOpen: boolean) => void;
    saveStatus: 'saved' | 'saving' | 'error';
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;

    // Settings
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;

    // API Key (local-only)
    geminiApiKey: string;
    setGeminiApiKey: (key: string) => void;

    // Gamification
    xp: number;
    addXp: (amount: number) => void;
    level: number;
    currentLevelXp: number;
    xpForNextLevel: number;
    progressPercent: number;
    dailyQuote: string;

    // Data
    auditLog: LogEntry[];
    moods: Record<string, MoodType>;
    setMood: (date: string, mood: MoodType) => void;
    studyHoursLog: Record<string, number>;
    logStudyHours: (date: string, hours: number) => void;
    getStudyHoursForDate: (date: string) => number;
    routineTemplate: DailyRoutineSlot[];
    setRoutineTemplate: (slots: DailyRoutineSlot[]) => void;
    updateRoutineIcon: (slotId: number, newIcon: string) => void;
    resetRoutineToDefault: () => void;
    addRoutineSlot: (slot: DailyRoutineSlot) => void;
    updateRoutineSlot: (slot: DailyRoutineSlot) => void;
    deleteRoutineSlot: (slotId: number) => void;

    // Subjects Management
    subjects: CustomSubject[];
    addSubject: (subject: CustomSubject) => void;
    updateSubject: (subject: CustomSubject) => void;
    deleteSubject: (subjectId: string) => void;
    reorderSubjects: (newOrder: CustomSubject[]) => void;

    // Feedback System
    toasts: ToastMessage[];
    showToast: (message: string, type?: ToastType) => void;
    removeToast: (id: string) => void;
    confirmState: ConfirmDialogState;
    askConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'info') => void;
    closeConfirm: () => void;

    // Archive System
    archivedPlans: ArchivedPlan[];
    archiveCurrentPlan: (title: string) => void;
    deleteArchivedPlan: (planId: string) => void;

    // New user onboarding
    isNewUser: boolean;
    setIsNewUser: (v: boolean) => void;

    // Flashcards (Leitner)
    flashcards: Flashcard[];
    addFlashcard: (card: Omit<Flashcard, 'id' | 'boxId' | 'nextReviewDate' | 'createdAt'>) => void;
    reviewFlashcard: (id: string, success: boolean) => void;
    deleteFlashcard: (id: string) => void;
}

const DataContext = createContext<Partial<StoreContextType> | undefined>(undefined);

const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const {
        user,
        userId,
        db,
        firebaseConfig,
        cloudStatus,
        login,
        register,
        logout,
        updateFirebaseConfig,
        removeFirebaseConfig,
    } = useAuth();
    const { darkMode, viewMode, showQuotes, toggleDarkMode, setDarkMode, setViewMode, toggleShowQuotes } = useTheme();
    const { toasts, showToast, removeToast, confirmState, askConfirm, closeConfirm } = useUI();

    const detectedStart = toIsoString(new Date());

    // --- CORE STATE ---
    const [userName, setUserNameState] = useState('');
    const [currentDay, setCurrentDayState] = useState(1);
    const [todayDayId, setTodayDayId] = useState(1);
    const [startDate, setStartDateState] = useState(detectedStart);
    const [tasks, setTasks] = useState<SubjectTask[]>([]);
    const [completedRoutine, setCompletedRoutine] = useState<string[]>([]);
    const [routineTemplate, setRoutineTemplateState] = useState<DailyRoutineSlot[]>(DAILY_ROUTINE);
    const [dailyNotes, setDailyNotes] = useState<Record<string, string>>({});
    const [subjects, setSubjects] = useState<CustomSubject[]>([]);
    const [totalDays, setTotalDaysState] = useState(TOTAL_DAYS);
    const [archivedPlans, setArchivedPlans] = useState<ArchivedPlan[]>([]);
    const [isNewUser, setIsNewUser] = useState(false);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [sessions, setSessions] = useState<StudySession[]>([]);
    const [notebookPages, setNotebookPages] = useState<NotebookPage[]>([]);
    const [stylusStrokes, setStylusStrokes] = useState<StylusStroke[]>([]);

    const [xp, setXp] = useState(0);
    const [auditLog, setAuditLog] = useState<LogEntry[]>([]);
    const [moods, setMoods] = useState<Record<string, MoodType>>({});
    const [studyHoursLog, setStudyHoursLog] = useState<Record<string, number>>({});
    const [perfectDates, setPerfectDates] = useState<Record<string, boolean>>({});

    // --- SETTINGS ---
    const [stream, setStream] = useState<StreamType>('life');
    const [geminiModel, setGeminiModel] = useState<string>('gemini-2.0-flash');
    const [geminiApiKey, setGeminiApiKeyState] = useState<string>(() => StorageManager.loadLocalGeminiKey());
    const [bioTheme, setBioTheme] = useState<boolean>(false);
    const [hasUnreadAiMessage, setHasUnreadAiMessage] = useState<boolean>(false);
    const [dayCutoffHour, setDayCutoffHour] = useState<number>(5);
    const [pomodoroWorkMinutes, setPomodoroWorkMinutes] = useState<number>(25);
    const [pomodoroBreakMinutes, setPomodoroBreakMinutes] = useState<number>(5);
    const [dailyCapacityMinutes, setDailyCapacityMinutes] = useState<number>(360);
    const [strictLockEnabled, setStrictLockEnabled] = useState<boolean>(false);
    const [anonymizedLeaderboard, setAnonymizedLeaderboard] = useState<boolean>(false);
    const [targetExamTitle, setTargetExamTitle] = useState<string>('');
    const [targetExamDate, setTargetExamDate] = useState<string>('');

    // --- SYNC & UI STATE ---
    const [isInitialized, setIsInitialized] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
    const lastSyncTimeRef = useRef<number>(0);
    const [syncQueueCount, setSyncQueueCount] = useState<number>(0);

    const [isTimerOpen, setIsTimerOpen] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
    const [dailyQuote, setDailyQuote] = useState('');
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Derived Streak, Heatmap Minutes, Level
    const studyMinutesByDate = useMemo(
        () => buildStudyMinutesByDate(sessions, studyHoursLog, tasks, dayCutoffHour),
        [sessions, studyHoursLog, tasks, dayCutoffHour]
    );

    const streakStats = useMemo(() => {
        const activeDates = Object.entries(studyMinutesByDate)
            .filter(([, mins]) => mins > 0)
            .map(([dateKey]) => dateKey);
        return calculateStreak(activeDates, new Date(), dayCutoffHour);
    }, [studyMinutesByDate, dayCutoffHour]);

    const { level, currentLevelXp, xpForNextLevel, progressPercent } = calculateLevelInfo(xp);

    const prevLevelRef = useRef(level);
    useEffect(() => {
        if (isInitialized && level > prevLevelRef.current && prevLevelRef.current > 0) {
            showToast(`تبریک! به سطح ${level} رسیدید! 🎉`, 'success');
            logAction('level_up', `ارتقا به سطح ${level}`);
        }
        prevLevelRef.current = level;
    }, [level, isInitialized]);

    const logAction = (action: string, details: string) => {
        const newLog: LogEntry = { id: crypto.randomUUID(), timestamp: Date.now(), action, details };
        setAuditLog((prev) => [newLog, ...prev].slice(0, 50));
    };

    const seedDefaultSubjectsForStream = (targetStream: StreamType): CustomSubject[] => {
        const defaultList = SUBJECT_LISTS[targetStream] || SUBJECT_LISTS['life'];
        return defaultList.map((name) => {
            const style = getSubjectStyle(name);
            return { id: name, name, icon: style.icon, color: style.color };
        });
    };

    const buildSettingsObject = useCallback(
        (includeLocalKey: boolean): AppSettings => ({
            darkMode,
            viewMode,
            showQuotes,
            stream,
            notifications: true,
            soundEnabled: true,
            language: 'fa',
            geminiModel,
            ...(includeLocalKey ? { geminiApiKey } : {}),
            bioTheme,
            hasUnreadAiMessage,
            dayCutoffHour,
            pomodoroWorkMinutes,
            pomodoroBreakMinutes,
            dailyCapacityMinutes,
            strictLockEnabled,
            anonymizedLeaderboard,
            targetExamTitle,
            targetExamDate,
        }),
        [
            darkMode,
            viewMode,
            showQuotes,
            stream,
            geminiModel,
            geminiApiKey,
            bioTheme,
            hasUnreadAiMessage,
            dayCutoffHour,
            pomodoroWorkMinutes,
            pomodoroBreakMinutes,
            dailyCapacityMinutes,
            strictLockEnabled,
            anonymizedLeaderboard,
            targetExamTitle,
            targetExamDate,
        ]
    );

    const applySettingsPayload = useCallback(
        (s: Partial<AppSettings> | undefined) => {
            if (!s) return;
            if (s.darkMode !== undefined && s.darkMode !== darkMode) toggleDarkMode();
            if (s.viewMode !== undefined && s.viewMode !== viewMode) setViewMode(s.viewMode);
            if (s.showQuotes !== undefined && s.showQuotes !== showQuotes) toggleShowQuotes();
            if (s.stream) setStream(s.stream);
            if (s.geminiModel) setGeminiModel(s.geminiModel);
            if (s.geminiApiKey && !StorageManager.loadLocalGeminiKey()) {
                StorageManager.saveLocalGeminiKey(s.geminiApiKey);
                setGeminiApiKeyState(s.geminiApiKey);
            }
            if (s.bioTheme !== undefined) setBioTheme(s.bioTheme);
            if (s.dayCutoffHour !== undefined) setDayCutoffHour(s.dayCutoffHour);
            if (s.pomodoroWorkMinutes !== undefined) setPomodoroWorkMinutes(s.pomodoroWorkMinutes);
            if (s.pomodoroBreakMinutes !== undefined) setPomodoroBreakMinutes(s.pomodoroBreakMinutes);
            if (s.dailyCapacityMinutes !== undefined) setDailyCapacityMinutes(s.dailyCapacityMinutes);
            if (s.strictLockEnabled !== undefined) setStrictLockEnabled(s.strictLockEnabled);
            if (s.anonymizedLeaderboard !== undefined) setAnonymizedLeaderboard(s.anonymizedLeaderboard);
            if (s.targetExamTitle !== undefined) setTargetExamTitle(s.targetExamTitle);
            if (s.targetExamDate !== undefined) setTargetExamDate(s.targetExamDate);
        },
        [darkMode, viewMode, showQuotes, toggleDarkMode, setViewMode, toggleShowQuotes]
    );

    // --- APP DATA INITIALIZATION ---
    useEffect(() => {
        const initApp = async () => {
            setIsInitialized(false);
            try {
                const backupUserId = userId || 'parsaplan_local_user';
                await StorageManager.createBackup(backupUserId);

                let data = await StorageManager.load(backupUserId);

                if (!data && backupUserId !== 'parsaplan_local_user') {
                    const guestData = await StorageManager.load('parsaplan_local_user');
                    if (
                        guestData &&
                        ((guestData.tasks && guestData.tasks.length > 0) ||
                            guestData.xp > 0 ||
                            (guestData.sessions && guestData.sessions.length > 0))
                    ) {
                        data = guestData;
                        await StorageManager.save(guestData, backupUserId);
                        showToast('اطلاعات محلی شما با موفقیت به حساب کاربری منتقل شد', 'success');
                    }
                }

                if (data) {
                    if (data.tasks) setTasks(data.tasks);
                    if (data.userName) setUserNameState(data.userName);
                    if (data.routine) setCompletedRoutine(data.routine);
                    if (data.routineTemplate) setRoutineTemplateState(data.routineTemplate);
                    if (data.notes) setDailyNotes(data.notes);
                    if (data.xp !== undefined) setXp(data.xp);
                    if (data.logs) setAuditLog(data.logs);
                    if (data.moods) setMoods(data.moods);
                    if (data.totalDays) setTotalDaysState(data.totalDays);
                    if (data.archivedPlans) setArchivedPlans(data.archivedPlans);
                    if (data.flashcards) setFlashcards(data.flashcards);
                    if (data.studyHoursLog) setStudyHoursLog(data.studyHoursLog);
                    if (data.sessions) setSessions(data.sessions);
                    if (data.notebookPages) setNotebookPages(data.notebookPages);
                    if (data.stylusStrokes) setStylusStrokes(data.stylusStrokes);

                    if (data.subjects && data.subjects.length > 0) {
                        setSubjects(data.subjects);
                    } else {
                        const targetStream = data.settings?.stream || 'life';
                        const defaultSubjects = seedDefaultSubjectsForStream(targetStream);
                        const oldCustoms = data.customSubjects || [];
                        setSubjects([...defaultSubjects, ...oldCustoms]);
                    }

                    if (data.startDate) {
                        setStartDateState(data.startDate);
                        recalcToday(data.startDate, data.totalDays || TOTAL_DAYS);
                    } else {
                        recalcToday(detectedStart, data.totalDays || TOTAL_DAYS);
                    }

                    applySettingsPayload(data.settings);
                } else {
                    loadDefaultPlan();
                }

                const pending = await syncEngine.getQueue(backupUserId);
                setSyncQueueCount(pending.length);
            } catch (error) {
                console.error('Error during app initialization, loading defaults:', error);
                loadDefaultPlan();
            }

            setDailyQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
            setIsInitialized(true);
        };

        if (userId) initApp();
    }, [userId]);

    const loadDefaultPlan = () => {
        const start = toIsoString(new Date());
        setStartDateState(start);
        setTasks([]);
        setSessions([]);
        setNotebookPages([]);
        setStylusStrokes([]);
        setRoutineTemplateState([]);
        setSubjects(seedDefaultSubjectsForStream('life'));
        setIsNewUser(true);
        recalcToday(start, TOTAL_DAYS);
    };

    const buildDataSnapshot = useCallback(
        (includeLocalKey = false) => ({
            tasks,
            userName,
            routine: completedRoutine,
            routineTemplate,
            notes: dailyNotes,
            xp,
            logs: auditLog,
            moods,
            studyHoursLog,
            startDate,
            totalDays,
            subjects,
            archivedPlans,
            flashcards,
            sessions,
            notebookPages,
            stylusStrokes,
            settings: buildSettingsObject(includeLocalKey),
            lastUpdated: Date.now(),
        }),
        [
            tasks,
            userName,
            completedRoutine,
            routineTemplate,
            dailyNotes,
            xp,
            auditLog,
            moods,
            studyHoursLog,
            startDate,
            totalDays,
            subjects,
            archivedPlans,
            flashcards,
            sessions,
            notebookPages,
            stylusStrokes,
            buildSettingsObject,
        ]
    );

    // --- LOCAL PERSISTENCE (AUTO-SAVE TO INDEXEDDB) ---
    useEffect(() => {
        if (!isInitialized) return;
        let cancelled = false;
        setSaveStatus('saving');
        StorageManager.save(buildDataSnapshot(false), userId || 'parsaplan_local_user').then((ok) => {
            if (!cancelled) setSaveStatus(ok ? 'saved' : 'error');
        });
        return () => {
            cancelled = true;
        };
    }, [buildDataSnapshot, isInitialized, userId]);

    // --- AUTO-SYNC TO CLOUD (Debounced, Offline Outbox-Safe, No Local-User Sync) ---
    const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ignoreSyncUntilRef = useRef(0);

    useEffect(() => {
        if (!isInitialized || !isCloudSyncAllowed(db, userId, user) || !db) return;
        if (Date.now() < ignoreSyncUntilRef.current) return;

        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

        syncTimeoutRef.current = setTimeout(async () => {
            const snapshot = buildDataSnapshot(false);
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                const count = await syncEngine.enqueue(userId, {
                    type: 'save_profile',
                    entityId: userId,
                    payload: snapshot,
                });
                setSyncQueueCount(count);
                return;
            }
            try {
                const syncedTs = await syncEngine.syncFullState(db, userId, snapshot);
                lastSyncTimeRef.current = syncedTs;
                setLastSyncTime(syncedTs);
                setSyncQueueCount(0);
            } catch (e) {
                console.error('Auto-sync failed, queuing offline:', e);
                const count = await syncEngine.enqueue(userId, {
                    type: 'save_profile',
                    entityId: userId,
                    payload: snapshot,
                });
                setSyncQueueCount(count);
            }
        }, 4000);

        return () => {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
    }, [buildDataSnapshot, isInitialized, db, userId, user]);

    // --- ONLINE RECONNECT FLUSH ---
    useEffect(() => {
        const handleOnline = async () => {
            if (!isCloudSyncAllowed(db, userId, user) || !db) return;
            const res = await syncEngine.flushOutbox(db, userId, user);
            setSyncQueueCount(res.remaining);
            if (res.flushed > 0) {
                showToast(`${res.flushed} تغییر آفلاین با ابر همگام‌سازی شد ☁️`, 'success');
            }
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [db, userId, user, showToast]);

    // --- REAL-TIME FIRESTORE LISTENER (Using Ref to avoid Stale Closure) ---
    useEffect(() => {
        if (!isCloudSyncAllowed(db, userId, user) || !db) return;

        const unsubscribe = onSnapshot(
            doc(db, 'users', userId),
            async (docSnap) => {
                if (!docSnap.exists()) return;
                const data = docSnap.data();
                const remoteLastUpdated = Number(data.lastUpdated || 0);
                const localLastUpdated = lastSyncTimeRef.current || 0;
                if (remoteLastUpdated > localLastUpdated) {
                    ignoreSyncUntilRef.current = Date.now() + 2500;
                    const fullCloud = await syncEngine.loadFullState(db, userId).catch(() => null);
                    const merged = fullCloud || data;
                    applyCloudData(merged);
                    lastSyncTimeRef.current = remoteLastUpdated;
                    setLastSyncTime(remoteLastUpdated);
                }
            },
            (error) => console.error('[Firestore Listener]:', error)
        );
        return () => unsubscribe();
    }, [db, userId, user]);

    const applyCloudData = (data: Partial<AppDataV1>) => {
        if (data.tasks) setTasks(data.tasks);
        if (data.userName) setUserNameState(data.userName);
        if (data.routine) setCompletedRoutine(data.routine);
        if (data.routineTemplate) setRoutineTemplateState(data.routineTemplate);
        if (data.notes) setDailyNotes(data.notes);
        if (data.xp !== undefined) setXp(data.xp);
        if (data.moods) setMoods(data.moods);
        if (data.totalDays) setTotalDaysState(data.totalDays);
        if (data.subjects) setSubjects(data.subjects);
        if (data.archivedPlans) setArchivedPlans(data.archivedPlans);
        if (data.flashcards) setFlashcards(data.flashcards);
        if (data.studyHoursLog) setStudyHoursLog(data.studyHoursLog);
        if (data.sessions) setSessions(data.sessions);
        if (data.notebookPages) setNotebookPages(data.notebookPages);
        if (data.startDate) {
            setStartDateState(data.startDate);
            recalcToday(data.startDate, data.totalDays || totalDays);
        }
        applySettingsPayload(data.settings);
    };

    const syncData = async () => {
        if (!isCloudSyncAllowed(db, userId, user) || !db) {
            showToast('برای همگام‌سازی ابری وارد حساب آنلاین خود شوید (حالت فعلی: محلی)', 'warning');
            return;
        }
        setIsSyncing(true);
        try {
            await syncEngine.flushOutbox(db, userId, user);
            const snapshot = buildDataSnapshot(false);
            const syncedTs = await syncEngine.syncFullState(db, userId, snapshot);
            lastSyncTimeRef.current = syncedTs;
            setLastSyncTime(syncedTs);
            setSyncQueueCount(0);
            showToast('اطلاعات با موفقیت در فضای ابری ذخیره شد ☁️', 'success');
        } catch (e) {
            console.error(e);
            showToast('خطا در اتصال به سرور — تغییرات در صف آفلاین ذخیره ماندند', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const loadFromCloud = async () => {
        if (!isCloudSyncAllowed(db, userId, user) || !db) {
            showToast('ابتدا وارد حساب آنلاین خود شوید', 'warning');
            return;
        }
        setIsSyncing(true);
        try {
            const data = await syncEngine.loadFullState(db, userId);
            if (data) {
                ignoreSyncUntilRef.current = Date.now() + 2500;
                applyCloudData(data);
                const ts = Number(data.lastUpdated || Date.now());
                lastSyncTimeRef.current = ts;
                setLastSyncTime(ts);
                showToast('اطلاعات از سرور دریافت شد', 'success');
            } else {
                showToast('هیچ اطلاعاتی در سرور یافت نشد', 'warning');
            }
        } catch (e) {
            console.error(e);
            showToast('خطا در دریافت اطلاعات', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    // --- LOGIC HELPERS ---
    const setUserName = (name: string) => {
        setUserNameState(name);
        showToast('نام ذخیره شد', 'success');
    };
    const setTotalDays = (days: number) => {
        if (days >= 7 && days <= 60) setTotalDaysState(days);
    };
    const setCurrentDay = (day: number) => {
        if (day >= 1 && day <= totalDays) setCurrentDayState(day);
    };
    const goToToday = () => {
        setCurrentDay(todayDayId);
        showToast('بازگشت به امروز', 'info');
    };

    const setStartDate = (newStartDate: string) => {
        setStartDateState(newStartDate);
        setTasks((prev) =>
            prev.map((t) => {
                if (t.dayId > 0 && !t.isCustom) return { ...t, date: toIsoString(addDays(newStartDate, t.dayId - 1)) };
                return t;
            })
        );
        recalcToday(newStartDate);
        showToast('تاریخ شروع تغییر کرد', 'success');
    };

    const autoFixDate = () => setStartDate(toIsoString(new Date()));

    const recalcToday = (start: string, days?: number) => {
        const effectiveTotalDays = days ?? totalDays;
        const todayStr = getLogicalDateKey(new Date(), dayCutoffHour);
        const dayDiff = getDiffDays(start, todayStr);
        const detectedDay = dayDiff + 1;
        let targetDay = 1;
        if (detectedDay >= 1 && detectedDay <= effectiveTotalDays) targetDay = detectedDay;
        else if (detectedDay > effectiveTotalDays) targetDay = effectiveTotalDays;
        setTodayDayId(targetDay);
        setCurrentDayState(targetDay);
    };

    const addXp = useCallback((amount: number) => setXp((prev) => Math.max(0, prev + amount)), []);

    // --- SESSIONS & SYNERGY BRIDGE ---
    const addStudySession = (session: StudySession) => {
        setSessions((prev) => [session, ...prev]);
        if (isCloudSyncAllowed(db, userId, user)) {
            syncEngine.enqueue(userId, { type: 'upsert_session', entityId: session.id, payload: session }).then(setSyncQueueCount);
        }
    };

    const deleteStudySession = (sessionId: string) => {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    };

    const completeFocusSynergy = useCallback(
        (result: SynergyCompletionResult) => {
            setSessions((prev) => [result.session, ...prev]);

            const dateKey = result.session.logicalDate;
            setStudyHoursLog((prev) => {
                const currentHours = prev[dateKey] || 0;
                return {
                    ...prev,
                    [dateKey]: Math.round((currentHours + result.addedMinutes / 60) * 100) / 100,
                };
            });

            if (result.updatedTask) {
                const uTask = result.updatedTask;
                setTasks((prev) => prev.map((t) => (t.id === uTask.id ? uTask : t)));
                if (isCloudSyncAllowed(db, userId, user)) {
                    syncEngine.enqueue(userId, { type: 'upsert_task', entityId: uTask.id, payload: uTask }).then(setSyncQueueCount);
                }
            }

            if (result.xpEarned > 0) {
                addXp(result.xpEarned);
            }

            if (isCloudSyncAllowed(db, userId, user)) {
                syncEngine
                    .enqueue(userId, {
                        type: 'upsert_session',
                        entityId: result.session.id,
                        payload: result.session,
                    })
                    .then(setSyncQueueCount);
            }

            logAction('focus_session', `${result.session.subjectName}: ${result.addedMinutes} دقیقه تمرکز`);
        },
        [db, userId, user, addXp]
    );

    // --- NOTEBOOK PAGES ---
    const createNotebookPage = (pageInput: Omit<NotebookPage, 'id' | 'createdAt' | 'updatedAt'>): NotebookPage => {
        const now = new Date().toISOString();
        const page: NotebookPage = {
            ...pageInput,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        };
        setNotebookPages((prev) => [...prev, page]);
        return page;
    };

    const updateNotebookPage = (id: string, updates: Partial<NotebookPage>) => {
        setNotebookPages((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
        );
    };

    const deleteNotebookPage = (id: string) => {
        setNotebookPages((prev) => {
            const toRemove = new Set<string>([id]);
            let changed = true;
            while (changed) {
                changed = false;
                for (const p of prev) {
                    if (p.parentId && toRemove.has(p.parentId) && !toRemove.has(p.id)) {
                        toRemove.add(p.id);
                        changed = true;
                    }
                }
            }
            return prev.filter((p) => !toRemove.has(p.id));
        });
    };

    // --- ARCHIVE ---
    const archiveCurrentPlan = (title: string) => {
        const endDate = toIsoString(addDays(startDate, totalDays - 1));
        const completedCount = tasks.filter((t) => t.isCompleted).length;
        const newArchive: ArchivedPlan = {
            id: crypto.randomUUID(),
            title: title || `برنامه ${getFullShamsiDate(new Date(startDate))}`,
            startDate,
            endDate,
            totalTasks: tasks.length,
            completedTasks: completedCount,
            tasks: [...tasks],
            stream,
        };
        setArchivedPlans((prev) => [newArchive, ...prev]);
        logAction('archive_plan', `آرشیو برنامه: ${newArchive.title}`);
        setTasks([]);
        setCompletedRoutine([]);
        setDailyNotes({});
        setMoods({});
        showToast('برنامه با موفقیت آرشیو شد', 'success');
    };
    const deleteArchivedPlan = (planId: string) => {
        setArchivedPlans((prev) => prev.filter((p) => p.id !== planId));
        showToast('حذف شد', 'info');
    };

    // --- FLASHCARDS (Leitner System) ---
    const addFlashcard = (cardData: Omit<Flashcard, 'id' | 'boxId' | 'nextReviewDate' | 'createdAt'>) => {
        const newCard: Flashcard = {
            ...cardData,
            id: crypto.randomUUID(),
            boxId: 1,
            createdAt: toIsoString(new Date()),
            nextReviewDate: toIsoString(addDays(new Date(), 1)),
        };
        setFlashcards((prev) => [...prev, newCard]);
        showToast('به جعبه لایتنر اضافه شد (جعبه ۱)', 'success');
        addXp(10);
    };

    const reviewFlashcard = (id: string, success: boolean) => {
        setFlashcards((prev) =>
            prev.map((c) => {
                if (c.id === id) {
                    let newBox = c.boxId;
                    let daysToNext = 1;

                    if (success) {
                        newBox = c.boxId < 5 ? c.boxId + 1 : 5;
                        const intervals: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 15 };
                        daysToNext = intervals[newBox] || 1;
                        addXp(15);
                        showToast(`کارت به جعبه ${newBox} منتقل شد`, 'success');
                    } else {
                        newBox = 1;
                        daysToNext = 1;
                        showToast('کارت به جعبه ۱ برگشت', 'warning');
                    }

                    return {
                        ...c,
                        boxId: newBox,
                        lastReviewedDate: toIsoString(new Date()),
                        nextReviewDate: toIsoString(addDays(new Date(), daysToNext)),
                    };
                }
                return c;
            })
        );
    };

    const deleteFlashcard = (id: string) => {
        setFlashcards((prev) => prev.filter((c) => c.id !== id));
        showToast('کارت مرور حذف شد', 'info');
    };

    // --- TASKS ---
    const addTask = (task: SubjectTask) => {
        let finalDate = task.date;
        if (task.dayId > 0 && !task.date) finalDate = toIsoString(addDays(startDate, task.dayId - 1));
        const newTask: SubjectTask = {
            ...task,
            date: finalDate || getDayDate(currentDay),
            id: task.id || crypto.randomUUID(),
            status: task.status || (task.isCompleted ? 'completed' : 'todo'),
            priority: task.priority || 'medium',
            durationMinutes: task.durationMinutes ?? 60,
            blocks: task.blocks || [],
        };
        setTasks((prev) => [...prev, newTask]);
        logAction('add_task', `افزودن تسک: ${newTask.subject}`);
        showToast('تسک اضافه شد', 'success');
    };

    const updateTask = (updatedTask: SubjectTask) => {
        let finalDate = updatedTask.date;
        const oldTask = tasks.find((t) => t.id === updatedTask.id);
        if (oldTask && oldTask.dayId !== updatedTask.dayId && updatedTask.dayId > 0) {
            finalDate = toIsoString(addDays(startDate, updatedTask.dayId - 1));
        }
        const normalized: SubjectTask = {
            ...updatedTask,
            date: finalDate,
            status: updatedTask.isCompleted ? 'completed' : updatedTask.status === 'completed' ? 'todo' : updatedTask.status || 'todo',
        };
        setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? normalized : t)));
        logAction('update_task', `ویرایش: ${updatedTask.subject}`);
        showToast('ذخیره شد', 'success');
    };

    const deleteTask = (taskId: string) => {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;
        askConfirm(
            'حذف تسک',
            'آیا مطمئن هستید؟',
            () => {
                setTasks((prev) => prev.filter((t) => t.id !== taskId));
                if (isCloudSyncAllowed(db, userId, user)) {
                    syncEngine.enqueue(userId, { type: 'delete_task', entityId: taskId }).then(setSyncQueueCount);
                }
                logAction('delete_task', `حذف: ${task.subject}`);
                showToast('حذف شد', 'warning');
            },
            'danger'
        );
    };

    const toggleTask = (taskId: string) => {
        let completedDateToCheck: string | null = null;
        let wasCompleted = false;

        const nextTasks = tasks.map((t) => {
            if (t.id === taskId) {
                const newState = !t.isCompleted;
                wasCompleted = newState;
                completedDateToCheck = t.date;
                let rewardType: keyof typeof XP_REWARDS = 'COMPLETE_TASK';
                if (t.studyType === 'exam') rewardType = 'COMPLETE_EXAM';
                else if (t.studyType === 'analysis' || t.studyType === 'review') rewardType = 'COMPLETE_ANALYSIS';

                const reward = getXpReward(rewardType, streakStats.currentStreak);
                newState ? addXp(reward) : addXp(-reward);
                if (newState) {
                    showToast(`+${reward} XP`, 'success');
                    soundFX.playSuccess();
                } else {
                    soundFX.playClick();
                }
                return {
                    ...t,
                    isCompleted: newState,
                    status: newState ? ('completed' as TaskStatus) : ('todo' as TaskStatus),
                };
            }
            return t;
        });

        setTasks(nextTasks);

        // Award PERFECT_DAY_BONUS once per date when all tasks on that date become completed
        if (wasCompleted && completedDateToCheck && !perfectDates[completedDateToCheck]) {
            const dayTasks = nextTasks.filter((t) => t.date === completedDateToCheck);
            if (dayTasks.length >= 2 && dayTasks.every((t) => t.isCompleted)) {
                setPerfectDates((prev) => ({ ...prev, [completedDateToCheck!]: true }));
                addXp(XP_REWARDS.PERFECT_DAY_BONUS);
                showToast(`پاداش روز کامل! +${XP_REWARDS.PERFECT_DAY_BONUS} XP 🏆`, 'success');
                setShowConfetti(true);
            }
        }
    };

    const updateTaskBlocks = (taskId: string, blocks: BlockNote[]) => {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, blocks } : t)));
    };

    const toggleTaskMIT = (taskId: string) => {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, isMIT: !t.isMIT } : t)));
    };

    const updateTaskStatus = (taskId: string, status: TaskStatus) => {
        setTasks((prev) =>
            prev.map((t) => {
                if (t.id !== taskId) return t;
                const isCompleted = status === 'completed';
                if (isCompleted !== t.isCompleted) {
                    const reward = getXpReward('COMPLETE_TASK', streakStats.currentStreak);
                    isCompleted ? addXp(reward) : addXp(-reward);
                    if (isCompleted) soundFX.playSuccess();
                }
                return { ...t, status, isCompleted };
            })
        );
    };

    const moveTaskToDate = (taskId: string, newIsoDate: string) => {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, date: newIsoDate, dayId: 0, isCustom: true } : t)));
        showToast('تسک منتقل شد', 'success');
    };

    const scheduleReview = (taskId: string, daysLater: number) => {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;
        const reviewDate = addDays(task.date, daysLater);
        const reviewTask: SubjectTask = {
            ...task,
            id: crypto.randomUUID(),
            date: toIsoString(reviewDate),
            dayId: 0,
            isCustom: true,
            isCompleted: false,
            status: 'todo',
            studyType: 'review',
            topic: `مرور: ${task.topic}`,
        };
        addTask(reviewTask);
        showToast(`مرور برای ${daysLater} روز دیگر تنظیم شد`, 'success');
    };

    const shiftIncompleteTasks = () => {
        askConfirm('انتقال به فردا', 'تسک‌های انجام نشده امروز به فردا منتقل شوند؟', () => {
            const todayStr = getDayDate(currentDay);
            const tomorrowStr = toIsoString(addDays(todayStr, 1));
            setTasks((prev) =>
                prev.map((t) => {
                    if (t.date === todayStr && !t.isCompleted) return { ...t, date: tomorrowStr, dayId: 0, isCustom: true };
                    return t;
                })
            );
            showToast('تسک‌ها منتقل شدند', 'success');
        });
    };

    const rebalancePlan = () => {
        const todayStr = getLogicalDateKey(new Date(), dayCutoffHour);
        const overdueTasks = tasks.filter((t) => !t.isCompleted && t.date < todayStr);
        if (overdueTasks.length === 0) {
            showToast('شما هیچ تسک عقب‌افتاده‌ای ندارید!', 'info');
            return;
        }

        const remainingDays = Math.max(1, totalDays - todayDayId);
        askConfirm(
            'تعادل دوباره (Rebalance)',
            `${overdueTasks.length} تسک عقب‌افتاده پیدا شد. آیا می‌خواهید آنها را روی ${remainingDays} روز آینده پخش کنید؟`,
            () => {
                setTasks((prev) => {
                    const newTasks = [...prev];
                    overdueTasks.forEach((overdueT, idx) => {
                        const offset = idx % remainingDays;
                        const newDateStr = toIsoString(addDays(todayStr, offset));
                        const taskIndex = newTasks.findIndex((t) => t.id === overdueT.id);
                        if (taskIndex !== -1) {
                            newTasks[taskIndex] = { ...newTasks[taskIndex], date: newDateStr, dayId: 0, isCustom: true };
                        }
                    });
                    return newTasks;
                });
                showToast('تسک‌های عقب‌افتاده با موفقیت پخش شدند', 'success');
                logAction('rebalance', 'پخش دوباره تسک‌های عقب‌افتاده');
            }
        );
    };

    // --- ROUTINE ---
    const toggleRoutineSlot = (dayId: number, slotId: number) => {
        const key = `${dayId}-${slotId}`;
        setCompletedRoutine((prev) => {
            const exists = prev.includes(key);
            const reward = getXpReward('COMPLETE_ROUTINE');
            exists ? addXp(-reward) : addXp(reward);
            return exists ? prev.filter((k) => k !== key) : [...prev, key];
        });
    };
    const isRoutineSlotCompleted = (d: number, s: number) => completedRoutine.includes(`${d}-${s}`);
    const setRoutineTemplate = (slots: DailyRoutineSlot[]) => setRoutineTemplateState(slots);
    const updateRoutineIcon = (id: number, icon: string) =>
        setRoutineTemplateState((prev) => prev.map((s) => (s.id === id ? { ...s, icon } : s)));
    const resetRoutineToDefault = () => setRoutineTemplate([]);
    const addRoutineSlot = (slot: DailyRoutineSlot) => {
        setRoutineTemplateState((prev) => [...prev, slot]);
        showToast('اسلات اضافه شد', 'success');
    };
    const updateRoutineSlot = (updated: DailyRoutineSlot) => {
        setRoutineTemplateState((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        showToast('ویرایش شد', 'success');
    };
    const deleteRoutineSlot = (slotId: number) => {
        askConfirm('حذف اسلات', 'مطمئنید؟', () => {
            setRoutineTemplateState((prev) => prev.filter((s) => s.id !== slotId));
            showToast('حذف شد', 'warning');
        });
    };

    const setMood = (date: string, mood: MoodType) => setMoods((prev) => ({ ...prev, [date]: mood }));
    const logStudyHours = (date: string, hours: number) => setStudyHoursLog((prev) => ({ ...prev, [date]: hours }));
    const getStudyHoursForDate = (date: string) => studyHoursLog[date] ?? -1;
    const saveDailyNote = (date: string, note: string) => {
        setDailyNotes((prev) => ({ ...prev, [date]: note }));
        showToast('یادداشت ذخیره شد', 'success');
    };
    const getDayDate = (dayId: number) => toIsoString(addDays(startDate, dayId - 1));
    const getTasksForDay = (dayId: number) => tasks.filter((t) => t.date === getDayDate(dayId));
    const getTasksByDate = (date: string) => tasks.filter((t) => t.date === date);
    const getProgress = () => (tasks.length > 0 ? Math.round((tasks.filter((t) => t.isCompleted).length / tasks.length) * 100) : 0);
    const getDailyNote = (date: string) => dailyNotes[date] || '';

    const exportData = () => {
        const blob = new Blob([JSON.stringify(buildDataSnapshot(false), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `parsaplan_backup_${toIsoString(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importData = (json: string) => {
        try {
            const data = JSON.parse(json);
            if (!data.tasks) throw new Error();
            askConfirm(
                'بازگردانی',
                'اطلاعات فعلی حذف می‌شود. ادامه می‌دهید؟',
                () => {
                    if (data.tasks) setTasks(data.tasks);
                    if (data.userName) setUserNameState(data.userName);
                    if (data.routine) setCompletedRoutine(data.routine);
                    if (data.routineTemplate) setRoutineTemplateState(data.routineTemplate);
                    if (data.notes) setDailyNotes(data.notes);
                    if (data.xp !== undefined) setXp(data.xp);
                    if (data.moods) setMoods(data.moods);
                    if (data.subjects && data.subjects.length > 0) setSubjects(data.subjects);
                    if (data.totalDays) setTotalDaysState(data.totalDays);
                    if (data.archivedPlans) setArchivedPlans(data.archivedPlans);
                    if (data.flashcards) setFlashcards(data.flashcards);
                    if (data.logs) setAuditLog(data.logs);
                    if (data.studyHoursLog) setStudyHoursLog(data.studyHoursLog);
                    if (data.sessions) setSessions(data.sessions);
                    if (data.notebookPages) setNotebookPages(data.notebookPages);
                    if (data.stylusStrokes) setStylusStrokes(data.stylusStrokes);
                    if (data.startDate) {
                        setStartDateState(data.startDate);
                        recalcToday(data.startDate, data.totalDays || totalDays);
                    }
                    applySettingsPayload(data.settings);
                    showToast('اطلاعات بازگردانی شد', 'success');
                },
                'danger'
            );
            return true;
        } catch {
            showToast('فایل نامعتبر', 'error');
            return false;
        }
    };

    const resetProgress = () => {
        askConfirm(
            'ریست کامل',
            'همه چیز پاک می‌شود!',
            async () => {
                await StorageManager.clearAll(userId || 'parsaplan_local_user');
                localStorage.clear();
                window.location.reload();
            },
            'danger'
        );
    };

    // --- SUBJECT MANAGEMENT ---
    const addSubject = (subject: CustomSubject) => {
        setSubjects((prev) => [...prev, subject]);
        showToast('دسته‌بندی جدید اضافه شد', 'success');
    };
    const updateSubject = (subject: CustomSubject) => {
        setSubjects((prev) => prev.map((s) => (s.id === subject.id ? subject : s)));
        showToast('دسته‌بندی ویرایش شد', 'success');
    };
    const deleteSubject = (id: string) => {
        setSubjects((prev) => prev.filter((s) => s.id !== id));
        showToast('دسته‌بندی حذف شد', 'warning');
    };
    const reorderSubjects = (newOrder: CustomSubject[]) => setSubjects(newOrder);

    // --- SETTINGS UPDATE ---
    const updateSettings = (newSettings: Partial<AppSettings>) => {
        if (newSettings.darkMode !== undefined) setDarkMode(newSettings.darkMode);

        if (newSettings.stream && newSettings.stream !== stream) {
            setStream(newSettings.stream);
            const newDefaultSubjects = seedDefaultSubjectsForStream(newSettings.stream);
            const customSubs = subjects.filter((s) => !SUBJECT_LISTS[stream]?.includes(s.name));
            setSubjects([...newDefaultSubjects, ...customSubs]);
        } else if (newSettings.stream) {
            setStream(newSettings.stream);
        }

        if (newSettings.geminiModel) setGeminiModel(newSettings.geminiModel);
        if (newSettings.bioTheme !== undefined) setBioTheme(newSettings.bioTheme);
        if (newSettings.hasUnreadAiMessage !== undefined) setHasUnreadAiMessage(newSettings.hasUnreadAiMessage);
        if (newSettings.dayCutoffHour !== undefined) setDayCutoffHour(newSettings.dayCutoffHour);
        if (newSettings.pomodoroWorkMinutes !== undefined) setPomodoroWorkMinutes(newSettings.pomodoroWorkMinutes);
        if (newSettings.pomodoroBreakMinutes !== undefined) setPomodoroBreakMinutes(newSettings.pomodoroBreakMinutes);
        if (newSettings.dailyCapacityMinutes !== undefined) setDailyCapacityMinutes(newSettings.dailyCapacityMinutes);
        if (newSettings.strictLockEnabled !== undefined) setStrictLockEnabled(newSettings.strictLockEnabled);
        if (newSettings.anonymizedLeaderboard !== undefined) setAnonymizedLeaderboard(newSettings.anonymizedLeaderboard);
        if (newSettings.targetExamTitle !== undefined) setTargetExamTitle(newSettings.targetExamTitle);
        if (newSettings.targetExamDate !== undefined) setTargetExamDate(newSettings.targetExamDate);

        if (Object.keys(newSettings).some((k) => k !== 'hasUnreadAiMessage' && k !== 'darkMode')) {
            showToast('تنظیمات ذخیره شد', 'success');
        }
    };

    const setGeminiApiKey = (key: string) => {
        StorageManager.saveLocalGeminiKey(key);
        setGeminiApiKeyState(key);
        showToast(key ? 'API Key به‌صورت محلی در دستگاه ذخیره شد ✓' : 'API Key حذف شد', key ? 'success' : 'info');
    };

    const currentSettings = buildSettingsObject(true);

    const contextValue: StoreContextType = {
        user,
        db,
        login,
        register,
        logout,
        userName,
        setUserName,
        userId,
        cloudStatus,
        firebaseConfig,
        updateFirebaseConfig,
        removeFirebaseConfig,
        darkMode,
        toggleDarkMode,
        viewMode,
        setViewMode,
        showQuotes,
        toggleShowQuotes,
        toasts,
        showToast,
        removeToast,
        confirmState,
        askConfirm,
        closeConfirm,

        tasks,
        toggleTask,
        addTask,
        updateTask,
        deleteTask,
        moveTaskToDate,
        scheduleReview,
        updateTaskBlocks,
        toggleTaskMIT,
        updateTaskStatus,
        currentDay,
        setCurrentDay,
        startDate,
        setStartDate,
        routineTemplate,
        setRoutineTemplate,
        toggleRoutineSlot,
        isRoutineSlotCompleted,
        updateRoutineIcon,
        resetRoutineToDefault,
        addRoutineSlot,
        updateRoutineSlot,
        deleteRoutineSlot,
        getTasksForDay,
        getDayDate,
        getTasksByDate,
        getProgress,
        resetProgress,
        goToToday,
        todayDayId,
        autoFixDate,
        shiftIncompleteTasks,
        rebalancePlan,
        totalDays,
        setTotalDays,

        sessions,
        addStudySession,
        deleteStudySession,
        completeFocusSynergy,
        streakStats,
        studyMinutesByDate,

        notebookPages,
        createNotebookPage,
        updateNotebookPage,
        deleteNotebookPage,
        stylusStrokes,
        setStylusStrokes,

        dailyNotes,
        saveDailyNote,
        getDailyNote,
        exportData,
        importData,
        syncData,
        loadFromCloud,
        isSyncing,
        lastSyncTime,
        syncQueueCount,
        xp,
        addXp,
        level,
        currentLevelXp,
        xpForNextLevel,
        progressPercent,
        dailyQuote,
        subjects,
        addSubject,
        updateSubject,
        deleteSubject,
        reorderSubjects,
        auditLog,
        moods,
        setMood,
        studyHoursLog,
        logStudyHours,
        getStudyHoursForDate,
        isTimerOpen,
        setIsTimerOpen,
        showConfetti,
        setShowConfetti,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isAiPanelOpen,
        setIsAiPanelOpen,
        saveStatus,
        sidebarCollapsed,
        setSidebarCollapsed,
        settings: currentSettings,
        updateSettings,
        geminiApiKey,
        setGeminiApiKey,
        archivedPlans,
        archiveCurrentPlan,
        deleteArchivedPlan,
        flashcards,
        addFlashcard,
        reviewFlashcard,
        deleteFlashcard,
        isNewUser,
        setIsNewUser,
    };

    if (!isInitialized) return <LoadingSpinner fullScreen message="درحال بارگذاری..." />;

    return <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>;
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <UIProvider>
            <AuthProvider>
                <ThemeProvider>
                    <DataProvider>{children}</DataProvider>
                </ThemeProvider>
            </AuthProvider>
        </UIProvider>
    );
};

export const useStore = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useStore must be used within StoreProvider');
    return context as StoreContextType;
};
