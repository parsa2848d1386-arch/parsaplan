
export type StreamType = 'riazi' | 'tajrobi' | 'ensani' | 'general';
export type StudyType = 'exam' | 'analysis' | 'test_educational' | 'test_speed' | 'review' | 'study';

export interface SubTask {
    id: string;
    subject: string;
    topic: string;
    testStats?: TestStats;
}

// Updated Subjects based on User Request
export const SUBJECT_LISTS: Record<StreamType, string[]> = {
    riazi: [
        'ریاضیات', 'هندسه', 'آمار و احتمال', 'ریاضیات گسسته', 'فیزیک', 'شیمی',
        'ادبیات فارسی', 'نگارش', 'دین و زندگی', 'عربی', 'زبان انگلیسی', 'سلامت و بهداشت', 'مدیریت خانواده', 'آمادگی دفاعی', 'هویت اجتماعی', 'تفکر و سواد رسانه‌ای',
        'آزمایشگاه علوم تجربی'
    ],
    tajrobi: [
        'زیست‌شناسی', 'ریاضیات', 'فیزیک', 'شیمی', 'زمین‌شناسی',
        'ادبیات فارسی', 'نگارش', 'دین و زندگی', 'عربی', 'زبان انگلیسی', 'سلامت و بهداشت', 'مدیریت خانواده', 'آمادگی دفاعی', 'هویت اجتماعی', 'تفکر و سواد رسانه‌ای',
        'آزمایشگاه علوم تجربی'
    ],
    ensani: [
        'ریاضی و آمار', 'علوم و فنون ادبی', 'عربی اختصاصی', 'تاریخ', 'جغرافیا', 'جامعه‌شناسی', 'فلسفه', 'منطق', 'اقتصاد', 'روان‌شناسی',
        'ادبیات فارسی', 'نگارش', 'دین و زندگی', 'عربی', 'زبان انگلیسی', 'سلامت و بهداشت', 'مدیریت خانواده', 'آمادگی دفاعی', 'هویت اجتماعی', 'تفکر و سواد رسانه‌ای'
    ],
    general: [
        'ادبیات فارسی', 'نگارش', 'دین و زندگی', 'عربی', 'زبان انگلیسی', 'سلامت و بهداشت', 'مدیریت خانواده', 'آمادگی دفاعی', 'هویت اجتماعی', 'تفکر و سواد رسانه‌ای'
    ]
};

export enum Subject {
    Biology = 'زیست‌شناسی',
    Physics = 'فیزیک',
    Chemistry = 'شیمی',
    Math = 'ریاضیات',
    Custom = 'شخصی',
}

// Subject icons mapping
const COLORS = ['rose', 'lime', 'green', 'red', 'emerald', 'orange', 'stone', 'sky', 'cyan', 'violet', 'blue', 'amber', 'teal', 'purple', 'pink', 'indigo', 'slate', 'zinc', 'yellow', 'fuchsia', 'gray'];

// Safelist for Tailwind Scanner
// bg-rose-50 bg-rose-100 bg-rose-500 text-rose-500 text-rose-600 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 dark:text-rose-400 border-rose-200 border-rose-300 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/30
// bg-lime-50 bg-lime-100 bg-lime-500 text-lime-500 text-lime-600 text-lime-800 dark:bg-lime-500/20 dark:text-lime-300 dark:text-lime-400 border-lime-200 border-lime-300 dark:border-lime-700 hover:bg-lime-100 dark:hover:bg-lime-900/30
// bg-green-50 bg-green-100 bg-green-500 text-green-500 text-green-600 text-green-800 dark:bg-green-500/20 dark:text-green-300 dark:text-green-400 border-green-200 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30
// bg-red-50 bg-red-100 bg-red-500 text-red-500 text-red-600 text-red-800 dark:bg-red-500/20 dark:text-red-300 dark:text-red-400 border-red-200 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30
// bg-emerald-50 bg-emerald-100 bg-emerald-500 text-emerald-500 text-emerald-600 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 dark:text-emerald-400 border-emerald-200 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30
// bg-orange-50 bg-orange-100 bg-orange-500 text-orange-500 text-orange-600 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 dark:text-orange-400 border-orange-200 border-orange-300 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30
// bg-stone-50 bg-stone-100 bg-stone-500 text-stone-500 text-stone-600 text-stone-800 dark:bg-stone-500/20 dark:text-stone-300 dark:text-stone-400 border-stone-200 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-900/30
// bg-sky-50 bg-sky-100 bg-sky-500 text-sky-500 text-sky-600 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 dark:text-sky-400 border-sky-200 border-sky-300 dark:border-sky-700 hover:bg-sky-100 dark:hover:bg-sky-900/30
// bg-cyan-50 bg-cyan-100 bg-cyan-500 text-cyan-500 text-cyan-600 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300 dark:text-cyan-400 border-cyan-200 border-cyan-300 dark:border-cyan-700 hover:bg-cyan-100 dark:hover:bg-cyan-900/30
// bg-violet-50 bg-violet-100 bg-violet-500 text-violet-500 text-violet-600 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300 dark:text-violet-400 border-violet-200 border-violet-300 dark:border-violet-700 hover:bg-violet-100 dark:hover:bg-violet-900/30
// bg-blue-50 bg-blue-100 bg-blue-500 text-blue-500 text-blue-600 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 dark:text-blue-400 border-blue-200 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30
// bg-amber-50 bg-amber-100 bg-amber-500 text-amber-500 text-amber-600 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 dark:text-amber-400 border-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30
// bg-teal-50 bg-teal-100 bg-teal-500 text-teal-500 text-teal-600 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300 dark:text-teal-400 border-teal-200 border-teal-300 dark:border-teal-700 hover:bg-teal-100 dark:hover:bg-teal-900/30
// bg-purple-50 bg-purple-100 bg-purple-500 text-purple-500 text-purple-600 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 dark:text-purple-400 border-purple-200 border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30
// bg-pink-50 bg-pink-100 bg-pink-500 text-pink-500 text-pink-600 text-pink-800 dark:bg-pink-500/20 dark:text-pink-300 dark:text-pink-400 border-pink-200 border-pink-300 dark:border-pink-700 hover:bg-pink-100 dark:hover:bg-pink-900/30
// bg-indigo-50 bg-indigo-100 bg-indigo-500 text-indigo-500 text-indigo-600 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 dark:text-indigo-400 border-indigo-200 border-indigo-300 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/30
// bg-slate-50 bg-slate-100 bg-slate-500 text-slate-500 text-slate-600 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300 dark:text-slate-400 border-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900/30
// bg-zinc-50 bg-zinc-100 bg-zinc-500 text-zinc-500 text-zinc-600 text-zinc-800 dark:bg-zinc-500/20 dark:text-zinc-300 dark:text-zinc-400 border-zinc-200 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900/30
// bg-yellow-50 bg-yellow-100 bg-yellow-500 text-yellow-500 text-yellow-600 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300 dark:text-yellow-400 border-yellow-200 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30
// bg-fuchsia-50 bg-fuchsia-100 bg-fuchsia-500 text-fuchsia-500 text-fuchsia-600 text-fuchsia-800 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 dark:text-fuchsia-400 border-fuchsia-200 border-fuchsia-300 dark:border-fuchsia-700 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/30
// bg-gray-50 bg-gray-100 bg-gray-500 text-gray-500 text-gray-600 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300 dark:text-gray-400 border-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900/30

export const SUBJECT_ICONS: Record<string, { icon: string; color: string; bgColor: string }> = {
    // Common (عمومی)
    'ادبیات فارسی': { icon: '📜', color: 'rose', bgColor: 'bg-rose-50 dark:bg-rose-500/20' },
    'نگارش': { icon: '✍️', color: 'rose', bgColor: 'bg-rose-50 dark:bg-rose-500/20' },
    'عربی': { icon: '🕌', color: 'lime', bgColor: 'bg-lime-50 dark:bg-lime-500/20' },
    'دین و زندگی': { icon: '☪️', color: 'green', bgColor: 'bg-green-50 dark:bg-green-500/20' },
    'زبان انگلیسی': { icon: '🇬🇧', color: 'red', bgColor: 'bg-red-50 dark:bg-red-500/20' },
    'سلامت و بهداشت': { icon: '🏥', color: 'emerald', bgColor: 'bg-emerald-50 dark:bg-emerald-500/20' },
    'مدیریت خانواده': { icon: '👨‍👩‍👧‍👦', color: 'orange', bgColor: 'bg-orange-50 dark:bg-orange-500/20' },
    'آمادگی دفاعی': { icon: '🛡️', color: 'stone', bgColor: 'bg-stone-50 dark:bg-stone-500/20' },
    'هویت اجتماعی': { icon: '🆔', color: 'sky', bgColor: 'bg-sky-50 dark:bg-sky-500/20' },
    'تفکر و سواد رسانه‌ای': { icon: '📺', color: 'cyan', bgColor: 'bg-cyan-50 dark:bg-cyan-500/20' },

    // Experimental Sciences (تجربی)
    'زیست‌شناسی': { icon: '🧬', color: 'emerald', bgColor: 'bg-emerald-50 dark:bg-emerald-500/20' },
    'فیزیک': { icon: '⚛️', color: 'violet', bgColor: 'bg-violet-50 dark:bg-violet-500/20' },
    'شیمی': { icon: '🧪', color: 'orange', bgColor: 'bg-orange-50 dark:bg-orange-500/20' },
    'ریاضیات': { icon: '📐', color: 'blue', bgColor: 'bg-blue-50 dark:bg-blue-500/20' },
    'زمین‌شناسی': { icon: '🌍', color: 'amber', bgColor: 'bg-amber-50 dark:bg-amber-500/20' },
    'آزمایشگاه علوم تجربی': { icon: '🔬', color: 'teal', bgColor: 'bg-teal-50 dark:bg-teal-500/20' },

    // Math field (ریاضی)
    'هندسه': { icon: '📏', color: 'cyan', bgColor: 'bg-cyan-50 dark:bg-cyan-500/20' },
    'حسابان': { icon: '∫', color: 'purple', bgColor: 'bg-purple-50 dark:bg-purple-500/20' },
    'آمار و احتمال': { icon: '📊', color: 'pink', bgColor: 'bg-pink-50 dark:bg-pink-500/20' },
    'گسسته': { icon: '🔢', color: 'indigo', bgColor: 'bg-indigo-50 dark:bg-indigo-500/20' },

    // Humanities (انسانی)
    'ریاضی و آمار': { icon: '📈', color: 'blue', bgColor: 'bg-blue-50 dark:bg-blue-500/20' },
    'علوم و فنون ادبی': { icon: '📖', color: 'rose', bgColor: 'bg-rose-50 dark:bg-rose-500/20' },
    'عربی اختصاصی': { icon: '🕌', color: 'lime', bgColor: 'bg-lime-50 dark:bg-lime-500/20' },
    'جامعه‌شناسی': { icon: '👥', color: 'sky', bgColor: 'bg-sky-50 dark:bg-sky-500/20' },
    'تاریخ': { icon: '🏛️', color: 'stone', bgColor: 'bg-stone-50 dark:bg-stone-500/20' },
    'جغرافیا': { icon: '🗺️', color: 'emerald', bgColor: 'bg-emerald-50 dark:bg-emerald-500/20' },
    'روان‌شناسی': { icon: '🧠', color: 'fuchsia', bgColor: 'bg-fuchsia-50 dark:bg-fuchsia-500/20' },
    'فلسفه': { icon: '💭', color: 'slate', bgColor: 'bg-slate-50 dark:bg-slate-500/20' },
    'منطق': { icon: '🔗', color: 'zinc', bgColor: 'bg-zinc-50 dark:bg-zinc-500/20' },
    'اقتصاد': { icon: '💰', color: 'yellow', bgColor: 'bg-yellow-50 dark:bg-yellow-500/20' },

    // Default for custom
    'شخصی': { icon: '📌', color: 'gray', bgColor: 'bg-gray-50 dark:bg-gray-500/20' },
};

// Get subject styling
export const getSubjectStyle = (subjectName: string) => {
    return SUBJECT_ICONS[subjectName] || { icon: '📚', color: 'gray', bgColor: 'bg-gray-50 dark:bg-gray-500/20' };
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

    // New Fields for Exam/Study Types
    studyType?: StudyType;
    subTasks?: SubTask[];

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

// System Archive (سیستم خفن!)
export interface ArchivedPlan {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    totalTasks: number;
    completedTasks: number;
    averageQuality?: number;
    tasks: SubjectTask[];
    stream: StreamType;
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

export interface AppSettings {
    darkMode: boolean;
    viewMode: 'normal' | 'compact';
    showQuotes: boolean;
    stream: StreamType;
    notifications: boolean;
    soundEnabled: boolean;
    language: 'fa' | 'en';
    geminiModel: string;
}

export interface AppState {
    userName: string;
    tasks: SubjectTask[];
    completedRoutineIds: string[];
    currentDayIndex: number;
    archivedPlans: ArchivedPlan[];
}
