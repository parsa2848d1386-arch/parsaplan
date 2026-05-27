import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { SubjectTask, LogEntry, MoodType, RoutineTemplate, DailyRoutineSlot, ToastMessage, ToastType, ConfirmDialogState, FirebaseConfig, CustomSubject, AppSettings, StreamType, ArchivedPlan, SUBJECT_LISTS, getSubjectStyle, Flashcard } from '../types';
import { PLAN_DATA, TOTAL_DAYS, MOTIVATIONAL_QUOTES, DAILY_ROUTINE } from '../constants';
import { addDays, toIsoString, getDiffDays, findBahman11, getFullShamsiDate, soundFX } from '../utils';
import { StorageManager } from '../utils/StorageManager';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { calculateLevelInfo, getXpReward, XP_REWARDS } from '../utils/xpSystem';

import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import { UIProvider, useUI } from './UIContext';
import { User, Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';

// Keep the huge interface for backward compatibility
interface StoreContextType {
    user: User | null;
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

    // API Key
    geminiApiKey: string;
    setGeminiApiKey: (key: string) => void;

    // Gamification
    xp: number;
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
    // --- CONTEXT CONSUMPTION ---
    const { user, userId, db, firebaseConfig, cloudStatus, login, register, logout, updateFirebaseConfig, removeFirebaseConfig } = useAuth();
    const { darkMode, viewMode, showQuotes, toggleDarkMode, setDarkMode, setViewMode, toggleShowQuotes } = useTheme();
    const { toasts, showToast, removeToast, confirmState, askConfirm, closeConfirm } = useUI();

    // --- STORAGE KEYS ---
    const KEY_PREFIX = 'parsa_plan_v4_';
    const KEY_USER_ID = KEY_PREFIX + 'user_id';

    const detectedStart = findBahman11();

    // --- STATE ---
    // Note: userId is now coming from AuthContext
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

    const [xp, setXp] = useState(0);
    const [auditLog, setAuditLog] = useState<LogEntry[]>([]);
    const [moods, setMoods] = useState<Record<string, MoodType>>({});
    const [studyHoursLog, setStudyHoursLog] = useState<Record<string, number>>({});
    const [stream, setStream] = useState<StreamType>('general');
    const [geminiModel, setGeminiModel] = useState<string>('gemini-2.0-flash');
    const [geminiApiKey, setGeminiApiKeyState] = useState<string>('');
    const [bioTheme, setBioTheme] = useState<boolean>(false);

    const [isInitialized, setIsInitialized] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

    // UI Overlays (local to Data or Global? Timer/CommandPalette are likely global UI but let's keep here for now)
    const [isTimerOpen, setIsTimerOpen] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
    const [dailyQuote, setDailyQuote] = useState('');
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Calculate Level Info dynamically from XP
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
        setAuditLog(prev => [newLog, ...prev].slice(0, 50));
    };

    // --- APP DATA INITIALIZATION ---
    useEffect(() => {
        const initApp = async () => {
            console.log("App Initializing for user:", userId);
            setIsInitialized(false); // SUSPEND AUTO-SAVE IMMEDIATELY TO PREVENT RACING OVERWRITES

            try {
                // Create a safety backup
                const backupUserId = userId || 'parsaplan_local_user';
                await StorageManager.createBackup(backupUserId);

                // Load Data
                let data = await StorageManager.load(backupUserId);

                // Auto-migration: If logging in, and account has no data, migrate offline data!
                if (!data && backupUserId !== 'parsaplan_local_user') {
                    const guestData = await StorageManager.load('parsaplan_local_user');
                    if (guestData && ((guestData.tasks && guestData.tasks.length > 0) || guestData.xp > 0)) {
                        console.log("Auto-migrating offline guest data to account:", backupUserId);
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
                    if (data.xp) setXp(data.xp);
                    if (data.logs) setAuditLog(data.logs);
                    if (data.moods) setMoods(data.moods);
                    if (data.totalDays) setTotalDaysState(data.totalDays);
                    if (data.archivedPlans) setArchivedPlans(data.archivedPlans);
                    if (data.flashcards) setFlashcards(data.flashcards);
                    if (data.studyHoursLog) setStudyHoursLog(data.studyHoursLog);

                    if (data.subjects && data.subjects.length > 0) {
                        setSubjects(data.subjects);
                    } else {
                        const stream = data.settings?.stream || 'general';
                        const defaultList = SUBJECT_LISTS[stream] || SUBJECT_LISTS['general'];
                        const defaultSubjects = defaultList.map(name => {
                            const style = getSubjectStyle(name);
                            return { id: name, name: name, icon: style.icon, color: style.color };
                        });
                        const oldCustoms = data.customSubjects || [];
                        const merged = [...defaultSubjects, ...oldCustoms];
                        setSubjects(merged);
                    }

                    if (data.startDate) {
                        setStartDateState(data.startDate);
                        recalcToday(data.startDate, data.totalDays || TOTAL_DAYS);
                    } else {
                        recalcToday(detectedStart, data.totalDays || TOTAL_DAYS);
                    }

                    if (data.settings) {
                        if (data.settings.darkMode !== undefined && data.settings.darkMode !== darkMode) toggleDarkMode();
                        if (data.settings.viewMode !== undefined && data.settings.viewMode !== viewMode) setViewMode(data.settings.viewMode);
                        if (data.settings.showQuotes !== undefined && data.settings.showQuotes !== showQuotes) toggleShowQuotes();

                        if (data.settings.stream) setStream(data.settings.stream);
                        if (data.settings.geminiModel) setGeminiModel(data.settings.geminiModel);
                        if (data.settings.geminiApiKey) setGeminiApiKeyState(data.settings.geminiApiKey);
                        if (data.settings.bioTheme !== undefined) setBioTheme(data.settings.bioTheme);
                    }
                } else {
                    loadDefaultPlan();
                }
            } catch (error) {
                console.error("Error during app initialization, loading defaults:", error);
                loadDefaultPlan();
            }

            setDailyQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
            setIsInitialized(true);
        };

        if (userId) initApp();
    }, [userId]); // React to userId changes

    const loadDefaultPlan = () => {
        const start = detectedStart;
        setStartDateState(start);
        // New users start with a completely blank slate
        setTasks([]);
        setRoutineTemplateState([]);
        setIsNewUser(true);
        recalcToday(start, TOTAL_DAYS);
    };

    // --- DATA SNAPSHOT HELPER (DRY) ---
    const buildDataSnapshot = () => ({
        tasks, userName, routine: completedRoutine, routineTemplate,
        notes: dailyNotes, xp, logs: auditLog, moods, studyHoursLog, startDate,
        totalDays, subjects, archivedPlans, flashcards,
        settings: {
            darkMode, viewMode, showQuotes, stream,
            notifications: true, soundEnabled: true, language: 'fa' as 'fa' | 'en',
            geminiModel, geminiApiKey, bioTheme
        },
        lastUpdated: Date.now()
    });

    // --- PERSISTENCE (AUTO-SAVE) ---
    useEffect(() => {
        if (!isInitialized) return;
        StorageManager.save(buildDataSnapshot(), userId || 'parsaplan_local_user');
    }, [tasks, userName, completedRoutine, routineTemplate, dailyNotes, xp, auditLog, moods, studyHoursLog, startDate, darkMode, viewMode, showQuotes, stream, geminiModel, totalDays, subjects, archivedPlans, flashcards, isInitialized, userId, bioTheme]);

    // --- AUTO-SYNC TO CLOUD (Debounced) ---
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const ignoreSyncUntilRef = useRef(0);

    useEffect(() => {
        if (!isInitialized || !db || !userId || !user) return;
        if (Date.now() < ignoreSyncUntilRef.current) return;

        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

        syncTimeoutRef.current = setTimeout(async () => {
            try {
                const snapshot = buildDataSnapshot();
                const fullData = JSON.parse(JSON.stringify(snapshot));
                await setDoc(doc(db, "users", userId), fullData);
                setLastSyncTime(snapshot.lastUpdated);
            } catch (e) {
                console.error("Auto-sync failed:", e);
            }
        }, 5000);

        return () => {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
    }, [tasks, userName, completedRoutine, routineTemplate, dailyNotes, xp, auditLog, moods, studyHoursLog, startDate, darkMode, viewMode, showQuotes, stream, flashcards, isInitialized, db, userId, user]);

    // --- REAL-TIME LISTENER ---
    const listenerSetupRef = useRef(false);
    useEffect(() => {
        if (!db || !userId || !user || listenerSetupRef.current) return;
        listenerSetupRef.current = true;
        const unsubscribe = onSnapshot(doc(db, "users", userId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const remoteLastUpdated = data.lastUpdated || 0;
                const localLastUpdated = lastSyncTime || 0;
                if (remoteLastUpdated > localLastUpdated) {
                    ignoreSyncUntilRef.current = Date.now() + 2000;
                    if (data.tasks) setTasks(data.tasks);
                    if (data.userName) setUserNameState(data.userName);
                    if (data.routine) setCompletedRoutine(data.routine);
                    if (data.routineTemplate) setRoutineTemplateState(data.routineTemplate);
                    if (data.notes) setDailyNotes(data.notes);
                    if (data.xp) setXp(data.xp);
                    if (data.moods) setMoods(data.moods);
                    if (data.studyHoursLog) setStudyHoursLog(data.studyHoursLog);
                    if (data.totalDays) setTotalDaysState(data.totalDays);
                    if (data.subjects) setSubjects(data.subjects);
                    if (data.archivedPlans) setArchivedPlans(data.archivedPlans);
                    if (data.flashcards) setFlashcards(data.flashcards);
                    if (data.startDate) {
                        setStartDateState(data.startDate);
                        recalcToday(data.startDate, data.totalDays || totalDays);
                    }
                    if (data.settings) {
                        if (data.settings.darkMode !== undefined && data.settings.darkMode !== darkMode) toggleDarkMode();
                        if (data.settings.viewMode !== undefined && data.settings.viewMode !== viewMode) setViewMode(data.settings.viewMode);
                        if (data.settings.showQuotes !== undefined && data.settings.showQuotes !== showQuotes) toggleShowQuotes();
                        if (data.settings.stream) setStream(data.settings.stream);
                        if (data.settings.geminiModel) setGeminiModel(data.settings.geminiModel);
                    }
                    setLastSyncTime(remoteLastUpdated);
                }
            }
        }, (error) => console.error(error));
        return () => {
            unsubscribe();
            listenerSetupRef.current = false;
        };
    }, [db, userId, user, darkMode, viewMode, showQuotes]); // Added theme deps so toggles work correctly? No, closure.

    // --- CLOUD SYNC & LOAD ---
    const syncData = async () => {
        if (!db || !firebaseConfig) { showToast('تنظیمات فایربیس وارد نشده است.', 'warning'); return; }
        setIsSyncing(true);
        try {
            const snapshot = buildDataSnapshot();
            const fullData = JSON.parse(JSON.stringify(snapshot));
            await setDoc(doc(db, "users", userId), fullData);
            setLastSyncTime(snapshot.lastUpdated);
            showToast('اطلاعات با موفقیت در فضای ابری ذخیره شد', 'success');
        } catch (e) {
            console.error(e);
            showToast('خطا در اتصال به سرور', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const applyCloudData = (data: any) => {
        if (data.tasks) setTasks(data.tasks);
        if (data.userName) setUserNameState(data.userName);
        if (data.routine) setCompletedRoutine(data.routine);
        if (data.routineTemplate) setRoutineTemplateState(data.routineTemplate);
        if (data.notes) setDailyNotes(data.notes);
        if (data.xp) setXp(data.xp);
        if (data.moods) setMoods(data.moods);
        if (data.totalDays) setTotalDaysState(data.totalDays);
        if (data.subjects) setSubjects(data.subjects);
        if (data.archivedPlans) setArchivedPlans(data.archivedPlans);
        if (data.flashcards) setFlashcards(data.flashcards);
        if (data.studyHoursLog) setStudyHoursLog(data.studyHoursLog);
        if (data.startDate) {
            setStartDateState(data.startDate);
            recalcToday(data.startDate, data.totalDays || totalDays);
        }
        if (data.settings) {
            if (data.settings.darkMode !== undefined && data.settings.darkMode !== darkMode) toggleDarkMode();
            if (data.settings.viewMode !== undefined && data.settings.viewMode !== viewMode) setViewMode(data.settings.viewMode);
            if (data.settings.showQuotes !== undefined && data.settings.showQuotes !== showQuotes) toggleShowQuotes();
            if (data.settings.stream) setStream(data.settings.stream);
            if (data.settings.geminiModel) setGeminiModel(data.settings.geminiModel);
            if (data.settings.geminiApiKey) setGeminiApiKeyState(data.settings.geminiApiKey);
            if (data.settings.bioTheme !== undefined) setBioTheme(data.settings.bioTheme);
        }
    };

    const loadFromCloud = async () => {
        if (!db || !firebaseConfig) return;
        setIsSyncing(true);
        try {
            const docSnap = await getDoc(doc(db, "users", userId));
            if (docSnap.exists()) {
                const data = docSnap.data();
                applyCloudData(data);
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
    const setUserName = (name: string) => { setUserNameState(name); showToast('نام ذخیره شد', 'success'); };
    const setTotalDays = (days: number) => { if (days >= 7 && days <= 60) setTotalDaysState(days); };
    const setCurrentDay = (day: number) => { if (day >= 1 && day <= totalDays) setCurrentDayState(day); };
    const goToToday = () => { setCurrentDay(todayDayId); showToast('بازگشت به امروز', 'info'); };

    const setStartDate = (newStartDate: string) => {
        setStartDateState(newStartDate);
        setTasks(prev => prev.map(t => {
            if (t.dayId > 0 && !t.isCustom) return { ...t, date: toIsoString(addDays(newStartDate, t.dayId - 1)) };
            return t;
        }));
        recalcToday(newStartDate);
        showToast('تاریخ شروع تغییر کرد', 'success');
    };

    const autoFixDate = () => setStartDate(findBahman11());

    const recalcToday = (start: string, days?: number) => {
        const effectiveTotalDays = days ?? totalDays;
        const todayStr = toIsoString(new Date());
        const dayDiff = getDiffDays(start, todayStr);
        const detectedDay = dayDiff + 1;
        let targetDay = 1;
        if (detectedDay >= 1 && detectedDay <= effectiveTotalDays) targetDay = detectedDay;
        else if (detectedDay > effectiveTotalDays) targetDay = effectiveTotalDays;
        setTodayDayId(targetDay);
        setCurrentDayState(targetDay);
    };

    const addXp = (amount: number) => setXp(prev => prev + amount);

    // --- OTHER ACTIONS (Archive, Tasks, Routine, etc) ---
    // (Pasting the remaining functions...)
    const archiveCurrentPlan = (title: string) => {
        const endDate = toIsoString(addDays(startDate, totalDays - 1));
        const completedCount = tasks.filter(t => t.isCompleted).length;
        const newArchive: ArchivedPlan = {
            id: crypto.randomUUID(),
            title: title || `برنامه ${getFullShamsiDate(new Date(startDate))}`,
            startDate, endDate, totalTasks: tasks.length, completedTasks: completedCount,
            tasks: [...tasks], stream: stream
        };
        setArchivedPlans(prev => [newArchive, ...prev]);
        logAction('archive_plan', `آرشیو برنامه: ${newArchive.title}`);
        setTasks([]); setCompletedRoutine([]); setDailyNotes({}); setMoods({});
        showToast('برنامه با موفقیت آرشیو شد', 'success');
    };
    const deleteArchivedPlan = (planId: string) => { setArchivedPlans(prev => prev.filter(p => p.id !== planId)); showToast('حذف شد', 'info'); };

    // --- FLASHCARDS (Leitner System) ---
    const addFlashcard = (cardData: Omit<Flashcard, 'id' | 'boxId' | 'nextReviewDate' | 'createdAt'>) => {
        const newCard: Flashcard = {
            ...cardData,
            id: crypto.randomUUID(),
            boxId: 1, // Start in box 1
            createdAt: toIsoString(new Date()),
            nextReviewDate: toIsoString(addDays(new Date().toISOString(), 1)) // Review next day
        };
        setFlashcards(prev => [...prev, newCard]);
        showToast('به جعبه لایتنر اضافه شد (جعبه ۱)', 'success');
        addXp(10); // Reward for adding a mistake to learn
    };

    const reviewFlashcard = (id: string, success: boolean) => {
        setFlashcards(prev => prev.map(c => {
            if (c.id === id) {
                let newBox = c.boxId;
                let daysToNext = 1;

                if (success) {
                    newBox = c.boxId < 5 ? c.boxId + 1 : 5;
                    // Leitner intervals: Box 1: 1 day, Box 2: 2 days, Box 3: 4 days, Box 4: 8 days, Box 5: 15 days
                    const intervals = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 15 };
                    daysToNext = intervals[newBox as keyof typeof intervals] || 1;
                    addXp(15);
                    showToast(`کارت به جعبه ${newBox} منتقل شد`, 'success');
                } else {
                    newBox = 1; // Back to box 1
                    daysToNext = 1;
                    showToast('کارت به جعبه ۱ برگشت', 'warning');
                }

                return {
                    ...c,
                    boxId: newBox,
                    lastReviewedDate: toIsoString(new Date()),
                    nextReviewDate: toIsoString(addDays(new Date().toISOString(), daysToNext))
                };
            }
            return c;
        }));
    };

    const deleteFlashcard = (id: string) => {
        setFlashcards(prev => prev.filter(c => c.id !== id));
        showToast('کارت مرور حذف شد', 'info');
    };

    const addTask = (task: SubjectTask) => {
        let finalDate = task.date;
        if (task.dayId > 0) finalDate = toIsoString(addDays(startDate, task.dayId - 1));
        const newTask = { ...task, date: finalDate, id: task.id || crypto.randomUUID() };
        setTasks(prev => [...prev, newTask]);
        logAction('add_task', `افزودن تسک: ${task.subject}`);
        showToast('تسک اضافه شد', 'success');
    };

    const updateTask = (updatedTask: SubjectTask) => {
        let finalDate = updatedTask.date;
        const oldTask = tasks.find(t => t.id === updatedTask.id);
        if (oldTask && oldTask.dayId !== updatedTask.dayId && updatedTask.dayId > 0) {
            finalDate = toIsoString(addDays(startDate, updatedTask.dayId - 1));
        }
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...updatedTask, date: finalDate } : t));
        logAction('update_task', `ویرایش: ${updatedTask.subject}`);
        showToast('ذخیره شد', 'success');
    };

    const deleteTask = (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        askConfirm('حذف تسک', 'آیا مطمئن هستید؟', () => {
            setTasks(prev => prev.filter(t => t.id !== taskId));
            logAction('delete_task', `حذف: ${task.subject}`);
            showToast('حذف شد', 'warning');
        }, 'danger');
    };

    const toggleTask = (taskId: string) => {
        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                const newState = !t.isCompleted;
                let rewardType: keyof typeof XP_REWARDS = 'COMPLETE_TASK';
                if (t.studyType === 'exam') rewardType = 'COMPLETE_EXAM';
                else if (t.studyType === 'analysis' || t.studyType === 'review') rewardType = 'COMPLETE_ANALYSIS';
                const reward = getXpReward(rewardType, 0);
                newState ? addXp(reward) : addXp(-reward);
                if (newState) {
                    showToast(`+${reward} XP`, 'success');
                    soundFX.playSuccess();
                } else {
                    soundFX.playClick();
                }
                return { ...t, isCompleted: newState };
            }
            return t;
        }));
    };

    const moveTaskToDate = (taskId: string, newIsoDate: string) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, date: newIsoDate, dayId: 0, isCustom: true } : t));
        showToast('تسک منتقل شد', 'success');
    };

    const scheduleReview = (taskId: string, daysLater: number) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const reviewDate = addDays(task.date, daysLater);
        const reviewTask: SubjectTask = {
            ...task, id: crypto.randomUUID(), date: toIsoString(reviewDate), dayId: 0, isCustom: true,
            isCompleted: false, studyType: 'review', topic: `مرور: ${task.topic}`
        };
        addTask(reviewTask);
        showToast(`مرور برای ${daysLater} روز دیگر تنظیم شد`, 'success');
    };

    const shiftIncompleteTasks = () => {
        askConfirm('انتقال به فردا', 'تسک‌های انجام نشده امروز به فردا منتقل شوند؟', () => {
            const todayStr = getDayDate(currentDay);
            const tomorrowStr = toIsoString(addDays(todayStr, 1));
            setTasks(prev => prev.map(t => {
                if (t.date === todayStr && !t.isCompleted) return { ...t, date: tomorrowStr, dayId: 0, isCustom: true };
                return t;
            }));
            showToast('تسک‌ها منتقل شدند', 'success');
        });
    };

    const rebalancePlan = () => {
        const todayStr = toIsoString(new Date());
        const overdueTasks = tasks.filter(t => !t.isCompleted && t.date < todayStr);
        if (overdueTasks.length === 0) {
            showToast('شما هیچ تسک عقب‌افتاده‌ای ندارید!', 'info');
            return;
        }

        const remainingDays = Math.max(1, totalDays - todayDayId);

        askConfirm('تعادل دوباره (Rebalance)', `${overdueTasks.length} تسک عقب‌افتاده پیدا شد. آیا می‌خواهید آنها را روی ${remainingDays} روز آینده پخش کنید؟`, () => {
            let currentModifyDateStr = getDayDate(todayDayId);

            setTasks(prev => {
                const newTasks = [...prev];
                overdueTasks.forEach((overdueT, idx) => {
                    // Spread over remaining days starting from today modulo the rest of days
                    const offset = idx % remainingDays;
                    const newDateStr = toIsoString(addDays(todayStr, offset));

                    const taskIndex = newTasks.findIndex(t => t.id === overdueT.id);
                    if (taskIndex !== -1) {
                        newTasks[taskIndex] = { ...newTasks[taskIndex], date: newDateStr, dayId: 0, isCustom: true };
                    }
                });
                return newTasks;
            });
            showToast('تسک‌های عقب‌افتاده با موفقیت پخش شدند', 'success');
            logAction('rebalance', 'پخش دوباره تسک‌های عقب‌افتاده');
        });
    };

    const toggleRoutineSlot = (dayId: number, slotId: number) => {
        const key = `${dayId}-${slotId}`;
        setCompletedRoutine(prev => {
            const exists = prev.includes(key);
            const reward = getXpReward('COMPLETE_ROUTINE');
            exists ? addXp(-reward) : addXp(reward);
            return exists ? prev.filter(k => k !== key) : [...prev, key];
        });
    };
    const isRoutineSlotCompleted = (d: number, s: number) => completedRoutine.includes(`${d}-${s}`);
    const setRoutineTemplate = (slots: DailyRoutineSlot[]) => { setRoutineTemplateState(slots); };
    const updateRoutineIcon = (id: number, icon: string) => setRoutineTemplateState(prev => prev.map(s => s.id === id ? { ...s, icon } : s));
    const resetRoutineToDefault = () => setRoutineTemplate(DAILY_ROUTINE);
    const addRoutineSlot = (slot: DailyRoutineSlot) => {
        setRoutineTemplateState(prev => [...prev, slot]);
        showToast('اسلات اضافه شد', 'success');
    };
    const updateRoutineSlot = (updated: DailyRoutineSlot) => {
        setRoutineTemplateState(prev => prev.map(s => s.id === updated.id ? updated : s));
        showToast('ویرایش شد', 'success');
    };
    const deleteRoutineSlot = (slotId: number) => {
        askConfirm('حذف اسلات', 'مطمئنید؟', () => {
            setRoutineTemplateState(prev => prev.filter(s => s.id !== slotId));
            showToast('حذف شد', 'warning');
        });
    };

    const setMood = (date: string, mood: MoodType) => setMoods(prev => ({ ...prev, [date]: mood }));
    const logStudyHours = (date: string, hours: number) => setStudyHoursLog(prev => ({ ...prev, [date]: hours }));
    const getStudyHoursForDate = (date: string) => studyHoursLog[date] ?? -1; // -1 = not logged
    const saveDailyNote = (date: string, note: string) => { setDailyNotes(prev => ({ ...prev, [date]: note })); showToast('یادداشت ذخیره شد', 'success'); };
    const getTasksForDay = (dayId: number) => tasks.filter(t => t.date === getDayDate(dayId));
    const getDayDate = (dayId: number) => toIsoString(addDays(startDate, dayId - 1));
    const getTasksByDate = (date: string) => tasks.filter(t => t.date === date);
    const getProgress = () => tasks.length > 0 ? Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100) : 0;
    const getDailyNote = (date: string) => dailyNotes[date] || '';

    const exportData = () => {
        const blob = new Blob([JSON.stringify(buildDataSnapshot())], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${toIsoString(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const importData = (json: string) => {
        try {
            const data = JSON.parse(json);
            if (!data.tasks) throw new Error();
            askConfirm('بازگردانی', 'اطلاعات فعلی حذف می‌شود. ادامه می‌دهید؟', () => {
                // بازگردانی کامل تمام فیلدها
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
                if (data.startDate) {
                    setStartDateState(data.startDate);
                    setTasks(prev => prev.map(t => {
                        if (t.dayId > 0 && !t.isCustom) return { ...t, date: toIsoString(addDays(data.startDate, t.dayId - 1)) };
                        return t;
                    }));
                    recalcToday(data.startDate, data.totalDays || totalDays);
                }
                if (data.settings) {
                    if (data.settings.darkMode !== undefined && data.settings.darkMode !== darkMode) toggleDarkMode();
                    if (data.settings.viewMode !== undefined && data.settings.viewMode !== viewMode) setViewMode(data.settings.viewMode);
                    if (data.settings.showQuotes !== undefined && data.settings.showQuotes !== showQuotes) toggleShowQuotes();
                    if (data.settings.stream) setStream(data.settings.stream);
                    if (data.settings.geminiModel) setGeminiModel(data.settings.geminiModel);
                    if (data.settings.geminiApiKey) setGeminiApiKeyState(data.settings.geminiApiKey);
                    if (data.settings.bioTheme !== undefined) setBioTheme(data.settings.bioTheme);
                }
                showToast('اطلاعات بازگردانی شد', 'success');
            }, 'danger');
            return true;
        } catch { showToast('فایل نامعتبر', 'error'); return false; }
    };

    const resetProgress = () => {
        askConfirm('ریست کامل', 'همه چیز پاک می‌شود!', async () => {
            await StorageManager.clearAll(userId || 'parsaplan_local_user');
            localStorage.clear();
            window.location.reload();
        }, 'danger');
    };

    // --- SUBJECT MANAGEMENT ---
    const addSubject = (subject: CustomSubject) => {
        setSubjects(prev => [...prev, subject]);
        showToast('درس اضافه شد', 'success');
    };
    const updateSubject = (subject: CustomSubject) => {
        setSubjects(prev => prev.map(s => s.id === subject.id ? subject : s));
        showToast('درس ویرایش شد', 'success');
    };
    const deleteSubject = (id: string) => {
        setSubjects(prev => prev.filter(s => s.id !== id));
        showToast('درس حذف شد', 'warning');
    };
    const reorderSubjects = (newOrder: CustomSubject[]) => { setSubjects(newOrder); };

    // Settings Update Helper
    const updateSettings = (newSettings: Partial<AppSettings>) => {
        if (newSettings.darkMode !== undefined) setDarkMode(newSettings.darkMode);

        if (newSettings.stream && newSettings.stream !== stream) {
            setStream(newSettings.stream);
            // آپدیت لیست دروس بر اساس رشته جدید
            const newStreamList = SUBJECT_LISTS[newSettings.stream] || SUBJECT_LISTS['general'];
            const newDefaultSubjects = newStreamList.map(name => {
                const style = getSubjectStyle(name);
                return { id: name, name: name, icon: style.icon, color: style.color };
            });
            // حفظ دروس سفارشی کاربر و جایگزینی فقط دروس پیش‌فرض
            const customSubjects = subjects.filter(s => !SUBJECT_LISTS[stream]?.includes(s.name));
            setSubjects([...newDefaultSubjects, ...customSubjects]);
        } else if (newSettings.stream) {
            setStream(newSettings.stream);
        }

        if (newSettings.geminiModel) setGeminiModel(newSettings.geminiModel);
        if (newSettings.bioTheme !== undefined) setBioTheme(newSettings.bioTheme);
        if (newSettings.hasUnreadAiMessage !== undefined) { /* handled in contextValue directly */ }

        // فقط برای تنظیماتی که نیاز به toast دارند
        if (!newSettings.hasUnreadAiMessage) {
            showToast('تنظیمات ذخیره شد', 'success');
        }
    };

    const setGeminiApiKey = (key: string) => {
        setGeminiApiKeyState(key);
        showToast(key ? 'API Key ذخیره شد ✓' : 'API Key حذف شد', key ? 'success' : 'info');
    };

    // Construct the settings object for export/sync
    const currentSettings: AppSettings = {
        darkMode, viewMode, showQuotes, stream,
        notifications: true, soundEnabled: true, language: 'fa', geminiModel, geminiApiKey, bioTheme
    };

    // Composite Value
    const contextValue: any = {
        user, login, register, logout, userName, setUserName, userId, cloudStatus,
        firebaseConfig, updateFirebaseConfig, removeFirebaseConfig,
        darkMode, toggleDarkMode, viewMode, setViewMode, showQuotes, toggleShowQuotes,
        toasts, showToast, removeToast, confirmState, askConfirm, closeConfirm,

        // Data
        tasks, toggleTask, addTask, updateTask, deleteTask, moveTaskToDate, scheduleReview,
        currentDay, setCurrentDay, startDate, setStartDate,
        routineTemplate, setRoutineTemplate, toggleRoutineSlot, isRoutineSlotCompleted, updateRoutineIcon, resetRoutineToDefault, addRoutineSlot, updateRoutineSlot, deleteRoutineSlot,
        getTasksForDay, getDayDate, getTasksByDate, getProgress, resetProgress, goToToday, todayDayId, autoFixDate, shiftIncompleteTasks, rebalancePlan,
        totalDays, setTotalDays,
        dailyNotes, saveDailyNote, getDailyNote,
        exportData, importData, syncData, loadFromCloud, isSyncing, lastSyncTime,
        xp, level, currentLevelXp, xpForNextLevel, progressPercent, dailyQuote,
        subjects, addSubject, updateSubject, deleteSubject, reorderSubjects,
        auditLog, moods, setMood, studyHoursLog, logStudyHours, getStudyHoursForDate,
        isTimerOpen, setIsTimerOpen, showConfetti, setShowConfetti, isCommandPaletteOpen, setIsCommandPaletteOpen,
        isAiPanelOpen, setIsAiPanelOpen,
        saveStatus, sidebarCollapsed, setSidebarCollapsed,
        settings: currentSettings, updateSettings,
        geminiApiKey, setGeminiApiKey,
        archivedPlans, archiveCurrentPlan, deleteArchivedPlan,
        flashcards, addFlashcard, reviewFlashcard, deleteFlashcard,
        isNewUser, setIsNewUser: (v: boolean) => setIsNewUser(v)
    };

    if (!isInitialized) return <LoadingSpinner fullScreen message="درحال بارگذاری..." />;

    return (
        <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider>
    );
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <UIProvider>
            <AuthProvider>
                <ThemeProvider>
                    <DataProvider>
                        {children}
                    </DataProvider>
                </ThemeProvider>
            </AuthProvider>
        </UIProvider>
    );
};

export const useStore = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("useStore must be used within StoreProvider");
    return context as StoreContextType;
};
