
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { SubjectTask, LogEntry, MoodType, RoutineTemplate, DailyRoutineSlot, ToastMessage, ToastType, ConfirmDialogState, FirebaseConfig, CustomSubject, SUBJECT_ICONS, AppSettings, StreamType, ArchivedPlan, SUBJECT_LISTS } from '../types';
import { PLAN_DATA, TOTAL_DAYS, MOTIVATIONAL_QUOTES, DAILY_ROUTINE } from '../constants';
import { addDays, toIsoString, getDiffDays, findBahman11, getFullShamsiDate } from '../utils';
import { StorageManager } from '../utils/StorageManager';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { calculateLevelInfo, getXpReward, XP_REWARDS } from '../utils/xpSystem';

// Import Firebase (Dynamic import handling in browser environment logic)
import { initializeApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, Firestore } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User, Auth } from 'firebase/auth';
import { DEFAULT_FIREBASE_CONFIG, IS_DEFAULT_FIREBASE_ENABLED } from '../firebaseConfig';

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
    isCommandPaletteOpen: boolean;
    // Settings
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;
    // New Phase 1 states
    saveStatus: 'saved' | 'saving' | 'error';
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;
    setIsCommandPaletteOpen: (isOpen: boolean) => void;

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
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- STORAGE KEYS ---
    const KEY_PREFIX = 'parsa_plan_v4_';
    const KEY_USER_ID = KEY_PREFIX + 'user_id';
    const KEY_DATA_BLOB = KEY_PREFIX + 'full_data';
    const KEY_FB_CONFIG = KEY_PREFIX + 'firebase_config'; // Stores user provided config

    const detectedStart = findBahman11();

    // --- STATE ---
    const [userId, setUserId] = useState<string>('');
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

    // UI & Config State
    const [darkMode, setDarkMode] = useState(false);
    const [viewMode, setViewModeState] = useState<'normal' | 'compact'>('normal');
    const [xp, setXp] = useState(0);
    const [auditLog, setAuditLog] = useState<LogEntry[]>([]);
    const [moods, setMoods] = useState<Record<string, MoodType>>({});
    const [stream, setStream] = useState<StreamType>('general');

    // App State Control
    const [isInitialized, setIsInitialized] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

    // Firebase State
    const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig | null>(null);
    const [db, setDb] = useState<Firestore | null>(null);
    const [auth, setAuth] = useState<Auth | null>(null);
    const [user, setUser] = useState<User | null>(null); // Auth User
    const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');

    // UI Overlays
    const [isTimerOpen, setIsTimerOpen] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [dailyQuote, setDailyQuote] = useState('');
    // New Phase 1 states
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [confirmState, setConfirmState] = useState<ConfirmDialogState>({
        isOpen: false, message: '', title: '', onConfirm: () => { }, onCancel: () => { }, type: 'info'
    });

    const [showQuotes, setShowQuotes] = useState(true);
    const toggleShowQuotes = () => setShowQuotes(prev => !prev);

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


    // --- HELPERS ---
    const showToast = (message: string, type: ToastType = 'info') => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 3000);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    const askConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' = 'danger') => {
        setConfirmState({ isOpen: true, title, message, onConfirm, onCancel: () => setConfirmState(prev => ({ ...prev, isOpen: false })), type });
    };
    const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

    const logAction = (action: string, details: string) => {
        const newLog: LogEntry = { id: crypto.randomUUID(), timestamp: Date.now(), action, details };
        setAuditLog(prev => [newLog, ...prev].slice(0, 50));
    };

    // --- FIREBASE INITIALIZATION ---
    useEffect(() => {
        const initFirebase = async () => {
            const storedConfig = localStorage.getItem(KEY_FB_CONFIG);
            if (storedConfig) {
                // Use user's custom config
                try {
                    const config = JSON.parse(storedConfig);
                    setFirebaseConfig(config);
                    await initializeFirebaseApp(config);
                } catch (e) {
                    console.error("Error loading firebase config", e);
                }
            } else if (IS_DEFAULT_FIREBASE_ENABLED) {
                // Use default config if no custom config and default is enabled
                try {
                    setFirebaseConfig(DEFAULT_FIREBASE_CONFIG);
                    await initializeFirebaseApp(DEFAULT_FIREBASE_CONFIG);
                    console.log("Using default Firebase config");
                } catch (e) {
                    console.error("Error loading default firebase config", e);
                }
            }
        };
        initFirebase();
    }, []);

    const initializeFirebaseApp = async (config: FirebaseConfig) => {
        try {
            // Check if app already exists to avoid duplicate init errors
            const apps = getApps();
            let app: FirebaseApp;
            if (apps.length > 0) {
                app = apps[0];
                // In a complex app we might deleteApp(app) and re-init, but here we assume config is stable or page refreshes
            } else {
                app = initializeApp(config);
            }

            const firestore = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestore);
            setAuth(firebaseAuth);
            setCloudStatus('connected');
            console.log("Firebase initialized dynamically");

            // Listen for Auth Changes
            onAuthStateChanged(firebaseAuth, (currentUser) => {
                setUser(currentUser);
                if (currentUser) {
                    setUserId(currentUser.uid);
                    // Check if we need to migrate local data to cloud
                    checkAndMigrateData(currentUser.uid, firestore);
                } else {
                    // Fallback to shared/local ID if logged out
                    setUserId('parsaplan_local_user');
                }
            });

        } catch (error) {
            console.error("Firebase init failed:", error);
            setCloudStatus('error');
            showToast('خطا در اتصال به فایربیس. تنظیمات را چک کنید.', 'error');
        }
    };

    const updateFirebaseConfig = (config: FirebaseConfig) => {
        localStorage.setItem(KEY_FB_CONFIG, JSON.stringify(config));
        setFirebaseConfig(config);
        // Reload to ensure clean connection
        window.location.reload();
    };

    const removeFirebaseConfig = () => {
        localStorage.removeItem(KEY_FB_CONFIG);
        setFirebaseConfig(null);
        setDb(null);
        setCloudStatus('disconnected');
        showToast('تنظیمات فایربیس حذف شد.', 'warning');
        window.location.reload();
    };


    // --- APP DATA INITIALIZATION ---
    useEffect(() => {
        const initApp = async () => {
            console.log("App Initializing...");

            // Use a fixed shared ID so all devices sync to the same document
            // This ID is based on the app name - all devices will share data
            let storedUserId = localStorage.getItem(KEY_USER_ID);
            if (!storedUserId) {
                // Use a fixed ID - "parsaplan_main_user" - so all devices share data
                storedUserId = 'parsaplan_main_user';
                localStorage.setItem(KEY_USER_ID, storedUserId);
            }
            // Override with shared ID for sync purposes ONLY if not authenticated
            // If authenticated, onAuthStateChanged will set the correct ID
            if (!user) {
                storedUserId = 'parsaplan_local_user';
                setUserId(storedUserId);
            }

            // Create a safety backup before we potentially overwrite anything with new logic in future
            StorageManager.createBackup();

            // Load Data using Storage Manager
            const data = StorageManager.load(storedUserId);

            if (data) {
                // Restore State
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

                // DATA MIGRATION: Subjects
                if (data.subjects && data.subjects.length > 0) {
                    setSubjects(data.subjects);
                } else {
                    // Fallback/Migration: Load defaults + old custom subjects
                    const allowedDefaults = ['زیست‌شناسی', 'شیمی', 'فیزیک', 'ریاضیات'];
                    const defaultSubjects = Object.entries(SUBJECT_ICONS)
                        .filter(([name]) => allowedDefaults.includes(name))
                        .map(([name, style]) => ({
                            id: name,
                            name: name,
                            icon: style.icon,
                            color: style.color
                        }));

                    const oldCustoms = data.customSubjects || [];
                    const merged = [...defaultSubjects, ...oldCustoms];
                    setSubjects(merged);
                }

                if (data.startDate) {
                    setStartDateState(data.startDate);
                    recalcToday(data.startDate);
                } else {
                    recalcToday(detectedStart);
                }

                if (data.settings) {
                    setDarkMode(data.settings.darkMode);
                    setViewModeState(data.settings.viewMode);
                    if (data.settings.showQuotes !== undefined) setShowQuotes(data.settings.showQuotes);
                    if (data.settings.stream) setStream(data.settings.stream);
                }

                console.log(`Data loaded successfully for user: ${storedUserId}`);
            } else {
                console.log("No stored data found for user, loading default plan.");
                loadDefaultPlan();
            }

            setDailyQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
            setIsInitialized(true);
        };

        initApp();
    }, []);

    // --- RE-LOAD DATA ON AUTH CHANGE ---
    // When userId changes (Login/Logout), we must reload the matching local data
    useEffect(() => {
        if (!isInitialized) return;

        console.log(`Switching storage to user: ${userId}`);
        const data = StorageManager.load(userId);

        if (data) {
            // Load User Data
            setTasks(data.tasks || []);
            setUserNameState(data.userName || 'کاربر');
            setCompletedRoutine(data.routine || []);
            setRoutineTemplateState(data.routineTemplate || DAILY_ROUTINE);
            setDailyNotes(data.notes || {});
            setXp(data.xp || 0);
            setAuditLog(data.logs || []);
            setMoods(data.moods || {});
            if (data.subjects) setSubjects(data.subjects);
            if (data.settings) {
                setDarkMode(data.settings.darkMode);
                setViewModeState(data.settings.viewMode);
                if (data.settings.showQuotes !== undefined) setShowQuotes(data.settings.showQuotes);
                if (data.settings.stream) setStream(data.settings.stream);
            }
            if (data.startDate) {
                setStartDateState(data.startDate);
                recalcToday(data.startDate);
            }
        } else {
            // Fresh User: Clear State
            console.log("No data for this user. Starting fresh.");
            setTasks([]);
            setRoutineTemplateState(DAILY_ROUTINE);
            setCompletedRoutine([]);
            setDailyNotes({});
            setXp(0);
            setAuditLog([]);
            setMoods({});
            // Keep startDate/settings or reset? Resetting is safer for "Fresh" feel
            const freshStart = findBahman11();
            setStartDateState(freshStart);
            recalcToday(freshStart);
        }
    }, [userId]); // Removed isInitialized dependency loop, just trigger on userId change

    const loadDefaultPlan = () => {
        const start = detectedStart;
        setStartDateState(start);
        const hydratedPlan = PLAN_DATA.map(task => ({
            ...task,
            date: toIsoString(addDays(start, task.dayId - 1))
        }));
        setTasks(hydratedPlan);
        recalcToday(start);
    };

    // --- PERSISTENCE (AUTO-SAVE) ---
    useEffect(() => {
        if (!isInitialized) return;

        const fullData = {
            tasks, userName, routine: completedRoutine, routineTemplate,
            notes: dailyNotes, xp, logs: auditLog, moods, startDate,
            totalDays, subjects, archivedPlans,
            settings: {
                darkMode, viewMode, showQuotes, stream,
                notifications: true, soundEnabled: true, language: 'fa' as 'fa' | 'en'
            },
            lastUpdated: Date.now()
        };

        // Save to the SPECIFIC user bucket
        StorageManager.save(fullData, userId);

    }, [tasks, userName, completedRoutine, routineTemplate, dailyNotes, xp, auditLog, moods, startDate, darkMode, viewMode, showQuotes, stream, totalDays, subjects, isInitialized, userId]);

    // --- AUTO-SYNC TO CLOUD (Debounced) ---
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const ignoreSyncUntilRef = useRef(0);

    useEffect(() => {
        // ONLY sync when user is authenticated
        if (!isInitialized || !db || !userId || !user) return;

        // Skip if we are within the ignore window (triggered by incoming cloud data)
        if (Date.now() < ignoreSyncUntilRef.current) {
            return;
        }

        // Debounced auto-sync: wait 5 seconds after last change before syncing
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(async () => {
            try {
                const fullData = {
                    tasks, userName, routine: completedRoutine, routineTemplate,
                    notes: dailyNotes, xp, logs: auditLog, moods, startDate,
                    settings: {
                        darkMode, viewMode, showQuotes, stream,
                        notifications: true, soundEnabled: true, language: 'fa' as 'fa' | 'en'
                    },
                    lastUpdated: Date.now()
                };

                await setDoc(doc(db, "users", userId), fullData);
                setLastSyncTime(Date.now());
                console.log("Auto-synced to cloud");
            } catch (e) {
                console.error("Auto-sync failed:", e);
            }
        }, 5000); // 5 second debounce

        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, [tasks, userName, completedRoutine, routineTemplate, dailyNotes, xp, auditLog, moods, startDate, darkMode, viewMode, showQuotes, stream, isInitialized, db, userId, user]);

    // --- REAL-TIME LISTENER (Listen for changes from other devices) ---
    const listenerSetupRef = useRef(false);

    useEffect(() => {
        // ONLY listen when user is authenticated
        if (!db || !userId || !user || listenerSetupRef.current) return;

        listenerSetupRef.current = true;

        const unsubscribe = onSnapshot(doc(db, "users", userId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const remoteLastUpdated = data.lastUpdated || 0;
                const localLastUpdated = lastSyncTime || 0;

                // Check if remote is newer
                // We used to have +10000 buffer here, but it prevents quick syncs.
                // Now we just check if it's strictly newer.
                console.log(`Sync Check: Remote=${remoteLastUpdated}, Local=${localLastUpdated}, Diff=${remoteLastUpdated - localLastUpdated}`);

                if (remoteLastUpdated > localLastUpdated) {
                    console.log("Received update from cloud, applying...");

                    // Set ignore window to prevent auto-sync loop (2 seconds buffer)
                    ignoreSyncUntilRef.current = Date.now() + 2000;

                    if (data.tasks) setTasks(data.tasks);
                    if (data.userName) setUserNameState(data.userName);
                    if (data.routine) setCompletedRoutine(data.routine);
                    if (data.routineTemplate) setRoutineTemplateState(data.routineTemplate);
                    if (data.notes) setDailyNotes(data.notes);
                    if (data.xp) setXp(data.xp);
                    if (data.moods) setMoods(data.moods);
                    if (data.startDate) {
                        setStartDateState(data.startDate);
                        recalcToday(data.startDate);
                    }
                    if (data.settings) {
                        setDarkMode(data.settings.darkMode);
                        setViewModeState(data.settings.viewMode);
                        if (data.settings.showQuotes !== undefined) setShowQuotes(data.settings.showQuotes);
                        if (data.settings.stream) setStream(data.settings.stream);
                    }
                    setLastSyncTime(remoteLastUpdated);
                    // Removed toast to avoid annoying popup - user can see cloud icon status
                }
            }
        }, (error) => {
            console.error("Real-time listener error:", error);
        });

        return () => {
            unsubscribe();
            listenerSetupRef.current = false;
        };
    }, [db, userId, user]);


    // --- CLOUD SYNC ---
    const syncData = async () => {
        if (!db || !firebaseConfig) {
            showToast('تنظیمات فایربیس وارد نشده است.', 'warning');
            return;
        }

        setIsSyncing(true);
        try {
            const fullData = {
                tasks, userName, routine: completedRoutine, routineTemplate,
                notes: dailyNotes, xp, logs: auditLog, moods, startDate,
                settings: {
                    darkMode, viewMode, showQuotes, stream,
                    notifications: true, soundEnabled: true, language: 'fa' as 'fa' | 'en'
                },
                lastUpdated: Date.now()
            };

            await setDoc(doc(db, "users", userId), fullData);
            setLastSyncTime(Date.now());
            setCloudStatus('connected');
            showToast('اطلاعات با موفقیت در فضای ابری ذخیره شد', 'success');
            logAction('cloud_upload', 'آپلود موفق به سرور');
        } catch (e) {
            console.error("Sync Error", e);
            setCloudStatus('error');
            showToast('خطا در اتصال به سرور', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const loadFromCloud = async () => {
        if (!db || !firebaseConfig) return;

        setIsSyncing(true);
        try {
            const docRef = doc(db, "users", userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.tasks) setTasks(data.tasks);
                if (data.userName) setUserNameState(data.userName);
                if (data.routine) setCompletedRoutine(data.routine);
                if (data.routineTemplate) setRoutineTemplateState(data.routineTemplate);
                if (data.notes) setDailyNotes(data.notes);
                if (data.xp) setXp(data.xp);
                if (data.logs) setAuditLog(data.logs);
                if (data.moods) setMoods(data.moods);
                if (data.startDate) {
                    setStartDateState(data.startDate);
                    recalcToday(data.startDate);
                }
                if (data.settings) {
                    setDarkMode(data.settings.darkMode);
                    setViewModeState(data.settings.viewMode);
                }
                showToast('اطلاعات از سرور دریافت شد', 'success');
                logAction('cloud_download', 'دانلود موفق از سرور');
            } else {
                showToast('هیچ اطلاعاتی در سرور یافت نشد', 'warning');
            }
        } catch (e) {
            console.error("Load Error", e);
            showToast('خطا در دریافت اطلاعات', 'error');
        } finally {
            setIsSyncing(false);
        }
    };


    // --- AUTH METHODS ---
    const generateEmail = (username: string) => `${username.toLowerCase()}@parsaplan.user`;

    const login = async (u: string, p: string): Promise<boolean> => {
        if (!auth) { showToast('اتصال فایربیس برقرار نیست', 'error'); return false; }
        try {
            await signInWithEmailAndPassword(auth, generateEmail(u), p);
            showToast('خوش آمدید', 'success');
            return true;
        } catch (e: any) {
            console.error(e);
            let msg = 'خطا در ورود';
            if (e.code === 'auth/invalid-credential') msg = 'نام کاربری یا رمز عبور اشتباه است';
            showToast(msg, 'error');
            return false;
        }
    };

    const register = async (u: string, p: string, name: string): Promise<boolean> => {
        if (!auth) { showToast('اتصال فایربیس برقرار نیست', 'error'); return false; }
        try {
            const cred = await createUserWithEmailAndPassword(auth, generateEmail(u), p);
            // NEW: Start new users with empty/default data instead of migrating local data
            if (cred.user && db) {
                const emptyData = {
                    tasks: [], // Empty tasks for new user
                    userName: name, // Use registered display name
                    routine: [],
                    routineTemplate: DAILY_ROUTINE,
                    notes: {},
                    xp: 0,
                    logs: [],
                    moods: {},
                    startDate: detectedStart,
                    settings: {
                        darkMode: false, viewMode: 'normal', showQuotes: true, stream: 'general',
                        notifications: true, soundEnabled: true, language: 'fa' as 'fa' | 'en'
                    },
                    lastUpdated: Date.now()
                };
                await setDoc(doc(db, "users", cred.user.uid), emptyData);
                // Also update local state to be empty
                setTasks([]);
                setUserNameState(name);
                setCompletedRoutine([]);
                setDailyNotes({});
                setXp(0);
                setAuditLog([]);
                setMoods({});
                showToast(`حساب با موفقیت ساخته شد. خوش آمدید ${name}!`, 'success');
            }
            return true;
        } catch (e: any) {
            let msg = 'خطا در ثبت نام';
            if (e.code === 'auth/email-already-in-use') {
                msg = 'این نام کاربری قبلاً استفاده شده است';
                console.warn("Registration failed: Username taken");
            } else if (e.code === 'auth/weak-password') {
                msg = 'رمز عبور باید حداقل ۶ رقم باشد';
            } else {
                console.error("Registration Error:", e);
            }
            showToast(msg, 'error');
            return false;
        }
    };


    const logout = async () => {
        if (!auth) return;
        askConfirm('خروج از حساب', 'آیا مطمئن هستید؟ دیتای لوکال باقی می‌ماند.', async () => {
            await signOut(auth);
            showToast('خارج شدید', 'info');
            // Consider cleaning local state if you want "Clean Session" on logout.
            // Currently keeping it as user asked "Login with another device brings data", 
            // but usually logout clears sensitive data.
            // For now, allow local data to persist.
        }, 'info');
    };

    const checkAndMigrateData = async (uid: string, firestore: Firestore) => {
        // If we have valid local data, and the cloud data is empty, upload local data.
        const docRef = doc(firestore, "users", uid);
        try {
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                // Cloud is empty, user just registered or first time login.
                // Upload LOCAL data to CLOUD
                console.log("New account detected. Migrating local data to cloud...");
                const fullData = {
                    tasks, userName, routine: completedRoutine, routineTemplate,
                    notes: dailyNotes, xp, logs: auditLog, moods, startDate,
                    subjects, archivedPlans,
                    settings: {
                        darkMode, viewMode, showQuotes, stream,
                        notifications: true, soundEnabled: true, language: 'fa' as 'fa' | 'en'
                    },
                    lastUpdated: Date.now()
                };
                await setDoc(docRef, fullData);
                showToast('اطلاعات شما به حساب جدید منتقل شد', 'success');
            } else {
                // Cloud has data. We should probably LOAD it to be safe, 
                // OR ask user? For now, standard flow: Server Wins.
                // The real-time listener will pick this up and update state.
                console.log("Existing account detected. Waiting for sync...");
            }
        } catch (e) {
            console.error("Migration check failed", e);
        }
    };


    // --- LOGIC HELPERS ---
    const setUserName = (name: string) => { setUserNameState(name); showToast('نام ذخیره شد', 'success'); };
    const setViewMode = (mode: 'normal' | 'compact') => setViewModeState(mode);
    const toggleDarkMode = () => setDarkMode(prev => !prev);
    const setTotalDays = (days: number) => {
        if (days >= 7 && days <= 60) {
            setTotalDaysState(days);
        }
    };

    const setCurrentDay = (day: number) => { if (day >= 1 && day <= totalDays) setCurrentDayState(day); };
    const goToToday = () => { setCurrentDay(todayDayId); showToast('بازگشت به امروز', 'info'); };

    const setStartDate = (newStartDate: string) => {
        setStartDateState(newStartDate);
        setTasks(prev => prev.map(t => {
            if (t.dayId > 0 && !t.isCustom) {
                return { ...t, date: toIsoString(addDays(newStartDate, t.dayId - 1)) };
            }
            return t;
        }));
        recalcToday(newStartDate);
        showToast('تاریخ شروع تغییر کرد', 'success');
    };

    const autoFixDate = () => {
        const smartDate = findBahman11();
        setStartDate(smartDate);
    };

    const recalcToday = (start: string) => {
        const todayStr = toIsoString(new Date());
        const dayDiff = getDiffDays(start, todayStr);
        const detectedDay = dayDiff + 1;
        let targetDay = 1;
        if (detectedDay >= 1 && detectedDay <= totalDays) targetDay = detectedDay;
        else if (detectedDay > totalDays) targetDay = totalDays;
        setTodayDayId(targetDay);
        setCurrentDayState(targetDay);
    };

    const addXp = (amount: number) => setXp(prev => prev + amount);

    // --- SETTINGS ACTIONS ---
    const settings: AppSettings = {
        darkMode,
        viewMode,
        showQuotes,
        stream,
        notifications: true,
        soundEnabled: true,
        language: 'fa' as 'fa' | 'en'
    };
    const updateSettings = (newSettings: Partial<AppSettings>) => {
        if (newSettings.darkMode !== undefined) setDarkMode(newSettings.darkMode);
        if (newSettings.viewMode !== undefined) setViewModeState(newSettings.viewMode);
        if (newSettings.showQuotes !== undefined) setShowQuotes(newSettings.showQuotes);
        if (newSettings.stream !== undefined) setStream(newSettings.stream);
        showToast('تنظیمات بروز شد', 'success');
    };

    // --- ARCHIVE LOGIC ---
    const archiveCurrentPlan = (title: string) => {
        const endDate = toIsoString(addDays(startDate, totalDays - 1));
        const completedCount = tasks.filter(t => t.isCompleted).length;

        const newArchive: ArchivedPlan = {
            id: crypto.randomUUID(),
            title: title || `برنامه ${getFullShamsiDate(new Date(startDate))}`,
            startDate,
            endDate,
            totalTasks: tasks.length,
            completedTasks: completedCount,
            tasks: [...tasks],
            stream: stream
        };

        setArchivedPlans(prev => [newArchive, ...prev]);
        logAction('archive_plan', `آرشیو برنامه: ${newArchive.title}`);

        // Reset Current Plan but keep stats/XP
        setTasks([]);
        setCompletedRoutine([]);
        setDailyNotes({});
        setMoods({});
        showToast('برنامه با موفقیت آرشیو شد و برنامه جدید آماده است!', 'success');
    };

    const deleteArchivedPlan = (planId: string) => {
        setArchivedPlans(prev => prev.filter(p => p.id !== planId));
        showToast('برنامه از تاریخچه حذف شد', 'info');
    };

    // --- TASK ACTIONS ---
    const addTask = (task: SubjectTask) => {
        // BUG FIX: Ensure date is correctly calculated from dayId if it's a plan day
        let finalDate = task.date;
        if (task.dayId > 0) {
            finalDate = toIsoString(addDays(startDate, task.dayId - 1));
        }

        const newTask = { ...task, date: finalDate, id: task.id || crypto.randomUUID() };
        setTasks(prev => [...prev, newTask]);
        logAction('add_task', `افزودن تسک: ${task.subject}`);
        showToast('تسک با موفقیت اضافه شد', 'success');
    };

    const updateTask = (updatedTask: SubjectTask) => {
        // BUG FIX: Re-calculate date if dayId changed
        let finalDate = updatedTask.date;
        const oldTask = tasks.find(t => t.id === updatedTask.id);
        if (oldTask && oldTask.dayId !== updatedTask.dayId && updatedTask.dayId > 0) {
            finalDate = toIsoString(addDays(startDate, updatedTask.dayId - 1));
        }

        setTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...updatedTask, date: finalDate } : t));
        logAction('update_task', `ویرایش تسک: ${updatedTask.subject}`);
        showToast('تغییرات ذخیره شد', 'success');
    };

    const deleteTask = (taskId: string) => {
        const taskToDelete = tasks.find(t => t.id === taskId);
        if (!taskToDelete) return;

        const performDelete = () => {
            setTasks(prev => prev.filter(t => t.id !== taskId));
            logAction('delete_task', `حذف تسک: ${taskToDelete.subject} - ${taskToDelete.topic}`);
            showToast('تسک حذف شد', 'warning');
        };

        const isSpecial = taskToDelete.studyType === 'exam' || taskToDelete.studyType === 'analysis';
        const title = isSpecial ? 'حذف تسک ویژه' : 'حذف تسک';
        const message = isSpecial
            ? `آیا از حذف ${taskToDelete.studyType === 'exam' ? 'آزمون' : 'تحلیل'} "${taskToDelete.subject}" مطمئن هستید؟`
            : `آیا از حذف تسک "${taskToDelete.subject}: ${taskToDelete.topic}" مطمئن هستید؟`;

        askConfirm(title, message, performDelete, 'danger');
    };

    const toggleTask = (taskId: string) => {
        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                const newState = !t.isCompleted;
                let rewardType: keyof typeof XP_REWARDS = 'COMPLETE_TASK';
                if (t.studyType === 'exam') rewardType = 'COMPLETE_EXAM';
                else if (t.studyType === 'analysis' || t.studyType === 'review') rewardType = 'COMPLETE_ANALYSIS';

                const reward = getXpReward(rewardType, 0); // Streak could be added here if available
                newState ? addXp(reward) : addXp(-reward);

                if (newState) {
                    showToast(`+${reward} XP`, 'success');
                }

                return { ...t, isCompleted: newState };
            }
            return t;
        }));
    };

    const moveTaskToDate = (taskId: string, date: string) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, date } : t));
        showToast('منتقل شد', 'success');
    };

    const scheduleReview = (taskId: string, daysLater: number) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            const reviewDate = addDays(task.date, daysLater);
            addTask({
                ...task, id: crypto.randomUUID(), date: toIsoString(reviewDate),
                subject: task.subject, topic: `مرور: ${task.topic}`, details: 'مرور لایتنر', isCompleted: false, isCustom: true, dayId: 0
            });
        }
    };

    // --- CUSTOM SUBJECTS ---
    // --- SUBJECTS ACTIONS ---
    const addSubject = (subject: CustomSubject) => {
        setSubjects(prev => [...prev, subject]);
        logAction('add_subject', `افزودن درس ${subject.name}`);
        showToast(`درس "${subject.name}" اضافه شد`, 'success');
    };

    const updateSubject = (updated: CustomSubject) => {
        setSubjects(prev => prev.map(s => s.id === updated.id ? updated : s));
        logAction('edit_subject', `ویرایش درس ${updated.name}`);
        showToast('درس ویرایش شد', 'success');
    };

    const deleteSubject = (subjectId: string) => {
        askConfirm('حذف درس', 'آیا مطمئن هستید؟ تسک‌های این درس حذف نمی‌شوند ولی در لیست دروس نمایش داده نخواهد شد.', () => {
            const subjectName = subjects.find(s => s.id === subjectId)?.name || 'نامشخص';
            setSubjects(prev => prev.filter(s => s.id !== subjectId));
            logAction('delete_subject', `حذف درس ${subjectName}`);
            showToast('درس حذف شد', 'warning');
        });
    };

    const shiftIncompleteTasks = () => {
        askConfirm('شیفت هوشمند', 'تسک‌های انجام نشده به فردا منتقل شوند؟', () => {
            const targetDate = getDayDate(currentDay);
            setTasks(prev => prev.map(t => {
                if (!t.isCompleted && t.date >= targetDate) {
                    return { ...t, date: toIsoString(addDays(t.date, 1)) };
                }
                return t;
            }));
            showToast('برنامه شیفت داده شد', 'success');
        }, 'info');
    };

    // --- ROUTINE ACTIONS ---
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
        logAction('add_routine', `افزودن اسلات ${slot.title}`);
        showToast('اسلات جدید اضافه شد', 'success');
    };
    const updateRoutineSlot = (updated: DailyRoutineSlot) => {
        setRoutineTemplateState(prev => prev.map(s => s.id === updated.id ? updated : s));
        logAction('edit_routine', `ویرایش اسلات ${updated.title}`);
        showToast('اسلات ویرایش شد', 'success');
    };
    const deleteRoutineSlot = (slotId: number) => {
        askConfirm('حذف اسلات', 'آیا مطمئن هستید؟', () => {
            setRoutineTemplateState(prev => prev.filter(s => s.id !== slotId));
            logAction('delete_routine', 'حذف اسلات روتین');
            showToast('اسلات حذف شد', 'warning');
        });
    };

    // --- OTHER ACTIONS ---
    const setMood = (date: string, mood: MoodType) => setMoods(prev => ({ ...prev, [date]: mood }));
    const saveDailyNote = (date: string, note: string) => { setDailyNotes(prev => ({ ...prev, [date]: note })); showToast('یادداشت ذخیره شد', 'success'); };

    const getTasksForDay = (dayId: number) => tasks.filter(t => t.date === getDayDate(dayId));
    const getDayDate = (dayId: number) => toIsoString(addDays(startDate, dayId - 1));
    const getTasksByDate = (date: string) => tasks.filter(t => t.date === date);
    const getProgress = () => tasks.length > 0 ? Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100) : 0;
    const getDailyNote = (date: string) => dailyNotes[date] || '';

    // --- IMPORT/EXPORT ---
    const exportData = () => {
        const data = { tasks, userName, routine: completedRoutine, notes: dailyNotes, xp, logs: auditLog, moods, startDate, settings: { darkMode, viewMode } };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
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
                if (data.tasks) setTasks(data.tasks);
                if (data.userName) setUserNameState(data.userName);
                if (data.routine) setCompletedRoutine(data.routine);
                if (data.notes) setDailyNotes(data.notes);
                if (data.startDate) setStartDate(data.startDate);
                showToast('اطلاعات بازگردانی شد', 'success');
            }, 'danger');
            return true;
        } catch { showToast('فایل نامعتبر', 'error'); return false; }
    };

    const resetProgress = () => {
        askConfirm('ریست کامل', 'همه چیز پاک می‌شود!', () => {
            localStorage.clear();
            window.location.reload();
        }, 'danger');
    };

    if (!isInitialized) return <LoadingSpinner fullScreen message="در حال بارگذاری ParsaPlan..." />;

    return (
        <StoreContext.Provider value={{
            user, login, register, logout,
            userName, setUserName, userId, cloudStatus,
            currentDay, setCurrentDay,
            startDate, setStartDate,
            tasks, toggleTask, addTask, updateTask, deleteTask, moveTaskToDate, scheduleReview,
            toggleRoutineSlot, isRoutineSlotCompleted, routineTemplate, setRoutineTemplate, updateRoutineIcon, resetRoutineToDefault, addRoutineSlot, updateRoutineSlot, deleteRoutineSlot,
            getTasksForDay, getDayDate, getTasksByDate,
            getProgress, resetProgress, goToToday, todayDayId, autoFixDate,
            dailyNotes, saveDailyNote, getDailyNote,
            exportData, importData, syncData, loadFromCloud, isSyncing, lastSyncTime,
            firebaseConfig, updateFirebaseConfig, removeFirebaseConfig,
            darkMode, toggleDarkMode,
            viewMode, setViewMode,
            isTimerOpen, setIsTimerOpen,
            isCommandPaletteOpen, setIsCommandPaletteOpen,
            saveStatus, sidebarCollapsed, setSidebarCollapsed,
            xp, level, currentLevelXp, xpForNextLevel, progressPercent, dailyQuote, shiftIncompleteTasks,
            totalDays, setTotalDays,
            subjects, addSubject, updateSubject, deleteSubject,
            auditLog, moods, setMood,
            toasts, showToast, removeToast,
            confirmState, askConfirm, closeConfirm,
            showQuotes, toggleShowQuotes,
            settings, updateSettings,
            archivedPlans, archiveCurrentPlan, deleteArchivedPlan
        }}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error("useStore must be used within StoreProvider");
    return context;
};
