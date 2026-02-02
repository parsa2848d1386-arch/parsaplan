
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { SubjectTask, LogEntry, MoodType, RoutineTemplate, DailyRoutineSlot, ToastMessage, ToastType, ConfirmDialogState, FirebaseConfig } from '../types';
import { PLAN_DATA, TOTAL_DAYS, MOTIVATIONAL_QUOTES, DAILY_ROUTINE } from '../constants';
import { addDays, toIsoString, getDiffDays, findBahman11 } from '../utils';

// Import Firebase (Dynamic import handling in browser environment logic)
import { initializeApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, Firestore } from 'firebase/firestore';
import { DEFAULT_FIREBASE_CONFIG, IS_DEFAULT_FIREBASE_ENABLED } from '../firebaseConfig';

interface StoreContextType {
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

    // Firebase Config Management
    firebaseConfig: FirebaseConfig | null;
    updateFirebaseConfig: (config: FirebaseConfig) => void;
    removeFirebaseConfig: () => void;

    // UI State
    darkMode: boolean;
    toggleDarkMode: () => void;
    viewMode: 'normal' | 'compact';
    setViewMode: (mode: 'normal' | 'compact') => void;
    isTimerOpen: boolean;
    setIsTimerOpen: (isOpen: boolean) => void;
    isCommandPaletteOpen: boolean;
    setIsCommandPaletteOpen: (isOpen: boolean) => void;

    // Gamification
    xp: number;
    level: number;
    dailyQuote: string;

    // Data
    auditLog: LogEntry[];
    moods: Record<string, MoodType>;
    setMood: (date: string, mood: MoodType) => void;
    routineTemplate: DailyRoutineSlot[];
    setRoutineTemplate: (slots: DailyRoutineSlot[]) => void;
    updateRoutineIcon: (slotId: number, newIcon: string) => void;
    resetRoutineToDefault: () => void;

    // Feedback System
    toasts: ToastMessage[];
    showToast: (message: string, type?: ToastType) => void;
    removeToast: (id: string) => void;
    confirmState: ConfirmDialogState;
    askConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'info') => void;
    closeConfirm: () => void;
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
    const [userName, setUserNameState] = useState('پارسا');
    const [currentDay, setCurrentDayState] = useState(1);
    const [todayDayId, setTodayDayId] = useState(1);
    const [startDate, setStartDateState] = useState(detectedStart);
    const [tasks, setTasks] = useState<SubjectTask[]>([]);
    const [completedRoutine, setCompletedRoutine] = useState<string[]>([]);
    const [routineTemplate, setRoutineTemplateState] = useState<DailyRoutineSlot[]>(DAILY_ROUTINE);
    const [dailyNotes, setDailyNotes] = useState<Record<string, string>>({});

    // UI & Config State
    const [darkMode, setDarkMode] = useState(false);
    const [viewMode, setViewModeState] = useState<'normal' | 'compact'>('normal');
    const [xp, setXp] = useState(0);
    const [auditLog, setAuditLog] = useState<LogEntry[]>([]);
    const [moods, setMoods] = useState<Record<string, MoodType>>({});

    // App State Control
    const [isInitialized, setIsInitialized] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

    // Firebase State
    const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig | null>(null);
    const [db, setDb] = useState<Firestore | null>(null);
    const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');

    // UI Overlays
    const [isTimerOpen, setIsTimerOpen] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [dailyQuote, setDailyQuote] = useState('');
    const [confirmState, setConfirmState] = useState<ConfirmDialogState>({
        isOpen: false, message: '', title: '', onConfirm: () => { }, onCancel: () => { }, type: 'info'
    });

    const level = Math.floor(Math.sqrt(xp / 100)) + 1;

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
            setDb(firestore);
            setCloudStatus('connected');
            console.log("Firebase initialized dynamically");
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
            // Override with shared ID for sync purposes
            storedUserId = 'parsaplan_main_user';
            setUserId(storedUserId);

            const storedBlob = localStorage.getItem(KEY_DATA_BLOB);

            if (storedBlob) {
                try {
                    const data = JSON.parse(storedBlob);
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
                    } else {
                        recalcToday(detectedStart);
                    }
                    if (data.settings) {
                        setDarkMode(data.settings.darkMode);
                        setViewModeState(data.settings.viewMode);
                    }
                } catch (e) {
                    console.error("Local Data Corrupt", e);
                    loadDefaultPlan();
                }
            } else {
                loadDefaultPlan();
            }

            setDailyQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
            setIsInitialized(true);
        };

        initApp();
    }, []);

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
            settings: { darkMode, viewMode }, lastUpdated: Date.now()
        };

        localStorage.setItem(KEY_DATA_BLOB, JSON.stringify(fullData));
    }, [tasks, userName, completedRoutine, routineTemplate, dailyNotes, xp, auditLog, moods, startDate, darkMode, viewMode, isInitialized]);

    // --- AUTO-SYNC TO CLOUD (Debounced) ---
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isListeningRef = useRef(false);

    useEffect(() => {
        if (!isInitialized || !db || !userId) return;

        // Debounced auto-sync: wait 3 seconds after last change before syncing
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(async () => {
            try {
                const fullData = {
                    tasks, userName, routine: completedRoutine, routineTemplate,
                    notes: dailyNotes, xp, logs: auditLog, moods, startDate,
                    settings: { darkMode, viewMode }, lastUpdated: Date.now()
                };

                await setDoc(doc(db, "users", userId), fullData);
                setLastSyncTime(Date.now());
                console.log("Auto-synced to cloud");
            } catch (e) {
                console.error("Auto-sync failed:", e);
            }
        }, 3000);

        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, [tasks, userName, completedRoutine, routineTemplate, dailyNotes, xp, moods, startDate, darkMode, viewMode, isInitialized, db, userId]);

    // --- REAL-TIME LISTENER (Listen for changes from other devices) ---
    useEffect(() => {
        if (!db || !userId || isListeningRef.current) return;

        isListeningRef.current = true;

        const unsubscribe = onSnapshot(doc(db, "users", userId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const remoteLastUpdated = data.lastUpdated || 0;
                const localLastUpdated = lastSyncTime || 0;

                if (remoteLastUpdated > localLastUpdated + 5000) {
                    console.log("Received update from cloud, applying...");
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
                    }
                    setLastSyncTime(remoteLastUpdated);
                    showToast('داده‌ها از دستگاه دیگر دریافت شد', 'info');
                }
            }
        }, (error) => {
            console.error("Real-time listener error:", error);
        });

        return () => {
            unsubscribe();
            isListeningRef.current = false;
        };
    }, [db, userId]);


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
                settings: { darkMode, viewMode }, lastUpdated: Date.now()
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


    // --- LOGIC HELPERS ---
    const setUserName = (name: string) => { setUserNameState(name); showToast('نام ذخیره شد', 'success'); };
    const setViewMode = (mode: 'normal' | 'compact') => setViewModeState(mode);
    const toggleDarkMode = () => setDarkMode(prev => !prev);

    const setCurrentDay = (day: number) => { if (day >= 1 && day <= TOTAL_DAYS) setCurrentDayState(day); };
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
        if (detectedDay >= 1 && detectedDay <= TOTAL_DAYS) targetDay = detectedDay;
        else if (detectedDay > TOTAL_DAYS) targetDay = TOTAL_DAYS;
        setTodayDayId(targetDay);
        setCurrentDayState(targetDay);
    };

    const addXp = (amount: number) => setXp(prev => prev + amount);

    // --- TASK ACTIONS ---
    const toggleTask = (taskId: string) => {
        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                const newState = !t.isCompleted;
                newState ? addXp(50) : addXp(-50);
                return { ...t, isCompleted: newState };
            }
            return t;
        }));
    };

    const addTask = (task: SubjectTask) => { setTasks(prev => [...prev, task]); showToast('تسک اضافه شد', 'success'); };
    const updateTask = (updated: SubjectTask) => { setTasks(prev => prev.map(t => t.id === updated.id ? updated : t)); showToast('ویرایش شد', 'success'); };
    const deleteTask = (taskId: string) => {
        askConfirm('حذف تسک', 'آیا مطمئن هستید؟', () => {
            setTasks(prev => prev.filter(t => t.id !== taskId));
            showToast('حذف شد', 'warning');
        });
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
            exists ? addXp(-20) : addXp(20);
            return exists ? prev.filter(k => k !== key) : [...prev, key];
        });
    };
    const isRoutineSlotCompleted = (d: number, s: number) => completedRoutine.includes(`${d}-${s}`);
    const setRoutineTemplate = (slots: DailyRoutineSlot[]) => { setRoutineTemplateState(slots); showToast('روتین آپدیت شد', 'success'); };
    const updateRoutineIcon = (id: number, icon: string) => setRoutineTemplateState(prev => prev.map(s => s.id === id ? { ...s, icon } : s));
    const resetRoutineToDefault = () => setRoutineTemplate(DAILY_ROUTINE);

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

    if (!isInitialized) return null;

    return (
        <StoreContext.Provider value={{
            userName, setUserName, userId, cloudStatus,
            currentDay, setCurrentDay,
            startDate, setStartDate,
            tasks, toggleTask, addTask, updateTask, deleteTask, moveTaskToDate, scheduleReview,
            toggleRoutineSlot, isRoutineSlotCompleted, routineTemplate, setRoutineTemplate, updateRoutineIcon, resetRoutineToDefault,
            getTasksForDay, getDayDate, getTasksByDate,
            getProgress, resetProgress, goToToday, todayDayId, autoFixDate,
            dailyNotes, saveDailyNote, getDailyNote,
            exportData, importData, syncData, loadFromCloud, isSyncing, lastSyncTime,
            firebaseConfig, updateFirebaseConfig, removeFirebaseConfig,
            darkMode, toggleDarkMode,
            viewMode, setViewMode,
            isTimerOpen, setIsTimerOpen,
            isCommandPaletteOpen, setIsCommandPaletteOpen,
            xp, level, dailyQuote, shiftIncompleteTasks,
            auditLog, moods, setMood,
            toasts, showToast, removeToast, confirmState, askConfirm, closeConfirm
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
