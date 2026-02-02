
export enum Subject {
    Biology = 'زیست‌شناسی',
    Physics = 'فیزیک',
    Chemistry = 'شیمی',
    Math = 'ریاضیات',
    Custom = 'شخصی',
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
    subject: Subject;
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
