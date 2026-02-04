
export enum Subject {
    Biology = 'زیست‌شناسی',
    Physics = 'فیزیک',
    Chemistry = 'شیمی',
    Math = 'ریاضیات',
    Custom = 'شخصی',
}

// Subject icons mapping for experimental and math fields
export const SUBJECT_ICONS: Record<string, { icon: string; color: string; bgColor: string }> = {
    // Experimental Sciences (تجربی)
    'زیست‌شناسی': { icon: '🧬', color: 'emerald', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30' },
    'فیزیک': { icon: '⚛️', color: 'violet', bgColor: 'bg-violet-50 dark:bg-violet-900/30' },
    'شیمی': { icon: '🧪', color: 'orange', bgColor: 'bg-orange-50 dark:bg-orange-900/30' },
    'ریاضیات': { icon: '📐', color: 'blue', bgColor: 'bg-blue-50 dark:bg-blue-900/30' },
    'زمین‌شناسی': { icon: '🌍', color: 'amber', bgColor: 'bg-amber-50 dark:bg-amber-900/30' },

    // Math field (ریاضی)
    'هندسه': { icon: '📏', color: 'cyan', bgColor: 'bg-cyan-50 dark:bg-cyan-900/30' },
    'جبر': { icon: '➗', color: 'indigo', bgColor: 'bg-indigo-50 dark:bg-indigo-900/30' },
    'حسابان': { icon: '∫', color: 'purple', bgColor: 'bg-purple-50 dark:bg-purple-900/30' },
    'آمار': { icon: '📊', color: 'pink', bgColor: 'bg-pink-50 dark:bg-pink-900/30' },
    'گسسته': { icon: '🔢', color: 'teal', bgColor: 'bg-teal-50 dark:bg-teal-900/30' },

    // Common subjects (عمومی)
    'زبان انگلیسی': { icon: '🇬🇧', color: 'red', bgColor: 'bg-red-50 dark:bg-red-900/30' },
    'ادبیات فارسی': { icon: '📜', color: 'rose', bgColor: 'bg-rose-50 dark:bg-rose-900/30' },
    'عربی': { icon: '🕌', color: 'lime', bgColor: 'bg-lime-50 dark:bg-lime-900/30' },
    'دین و زندگی': { icon: '☪️', color: 'green', bgColor: 'bg-green-50 dark:bg-green-900/30' },
    'اقتصاد': { icon: '💰', color: 'yellow', bgColor: 'bg-yellow-50 dark:bg-yellow-900/30' },
    'جامعه‌شناسی': { icon: '👥', color: 'sky', bgColor: 'bg-sky-50 dark:bg-sky-900/30' },
    'تاریخ': { icon: '🏛️', color: 'stone', bgColor: 'bg-stone-50 dark:bg-stone-900/30' },
    'جغرافیا': { icon: '🗺️', color: 'emerald', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30' },
    'روان‌شناسی': { icon: '🧠', color: 'fuchsia', bgColor: 'bg-fuchsia-50 dark:bg-fuchsia-900/30' },
    'فلسفه': { icon: '💭', color: 'slate', bgColor: 'bg-slate-50 dark:bg-slate-900/30' },
    'منطق': { icon: '🔗', color: 'zinc', bgColor: 'bg-zinc-50 dark:bg-zinc-900/30' },

    // Default for custom
    'شخصی': { icon: '📌', color: 'gray', bgColor: 'bg-gray-50 dark:bg-gray-900/30' },
};

// Get subject styling
export const getSubjectStyle = (subjectName: string) => {
    return SUBJECT_ICONS[subjectName] || { icon: '📚', color: 'gray', bgColor: 'bg-gray-50 dark:bg-gray-900/30' };
};

// Custom Subject interface for user-defined subjects
export interface CustomSubject {
    id: string;
    name: string;
    icon: string;
    color: string;
}

export interface DailyRoutineSlot {
    id: number;
    time: string;
    title: string;
    description: string;
    icon: string;
    type: 'test' | 'review' | 'rest' | 'class';
}

export interface TestStats {
    correct: number;
    wrong: number;
    total: number;
}

export interface SubjectTask {
    id: string;
    dayId: number;
    date: string;
    subject: string;
    topic: string;
    details: string;
    testRange?: string;
    isCompleted: boolean;
    note?: string;
    isCustom?: boolean;

    // New Analysis Metrics
    actualDuration?: number;
    qualityRating?: number;
    testStats?: TestStats;

    // New Feature: Tags
    tags?: string[];
}

// New Feature: Audit Log
export interface LogEntry {
    id: string;
    timestamp: number;
    action: string;
    details: string;
}

// New Feature: Mood Tracking
export type MoodType = 'happy' | 'neutral' | 'sad' | 'tired' | 'energetic';
export interface MoodEntry {
    date: string;
    mood: MoodType;
}

// New Feature: Routine Templates
export interface RoutineTemplate {
    id: string;
    name: string;
    slots: DailyRoutineSlot[];
}

// New Feature: Smart Notifications
export type ToastType = 'success' | 'error' | 'info' | 'warning';
export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
}

export interface ConfirmDialogState {
    isOpen: boolean;
    message: string;
    title: string;
    onConfirm: () => void;
    onCancel: () => void;
    type: 'danger' | 'info';
}

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
}

export interface AppState {
    userName: string;
    tasks: SubjectTask[];
    completedRoutineIds: string[];
    currentDayIndex: number;
}
