import type { SubjectTask } from '../types';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/**
 * Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to standard ASCII 0-9.
 * Also normalizes Arabic/Persian decimal separators (٫) to '.'.
 */
export function normalizePersianDigits(raw: string): string {
    if (!raw) return '';
    let result = '';
    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        const faIdx = PERSIAN_DIGITS.indexOf(ch);
        if (faIdx !== -1) {
            result += String(faIdx);
            continue;
        }
        const arIdx = ARABIC_DIGITS.indexOf(ch);
        if (arIdx !== -1) {
            result += String(arIdx);
            continue;
        }
        if (ch === '٫') {
            result += '.';
            continue;
        }
        result += ch;
    }
    return result;
}

/**
 * Safely parses an integer from Persian, Arabic, or Latin digits.
 * Returns `fallback` when the normalized value has no valid integer digits.
 */
export function parseLocalizedInt(raw: string | number | undefined | null, fallback = 0): number {
    if (typeof raw === 'number') {
        return Number.isFinite(raw) ? Math.trunc(raw) : fallback;
    }
    if (!raw) return fallback;
    const normalized = normalizePersianDigits(String(raw)).replace(/[^\d-]/g, '');
    if (!normalized || normalized === '-') return fallback;
    const parsed = parseInt(normalized, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export interface TaskValidationResult {
    valid: boolean;
    errors: {
        topic?: string;
        subject?: string;
        examSubjects?: string;
        durationMinutes?: string;
    };
    targetTab: 'info' | 'report';
}

/**
 * Validates TaskModal data without relying on hidden HTML `required` attributes
 * across inactive tabs. Returns field-specific inline errors and the tab to focus.
 */
export function validateTaskDraft(params: {
    formData: Partial<SubjectTask>;
    isExamMode: boolean;
    selectedExamSubjects: string[];
}): TaskValidationResult {
    const { formData, isExamMode, selectedExamSubjects } = params;
    const errors: TaskValidationResult['errors'] = {};

    if (isExamMode) {
        if (selectedExamSubjects.length === 0) {
            errors.examSubjects = 'لطفاً حداقل یک بخش یا درس برای آزمون انتخاب کنید.';
        }
    } else {
        if (!formData.topic || formData.topic.trim().length === 0) {
            errors.topic = 'وارد کردن عنوان کار یا موضوع الزامی است.';
        }
        if (!formData.subject || formData.subject.trim().length === 0) {
            errors.subject = 'لطفاً یک دسته‌بندی برای فعالیت انتخاب کنید.';
        }
    }

    if (formData.durationMinutes !== undefined) {
        const dur = Number(formData.durationMinutes);
        if (!Number.isFinite(dur) || dur < 5 || dur > 480) {
            errors.durationMinutes = 'مدت هدف باید بین ۵ تا ۴۸۰ دقیقه باشد.';
        }
    }

    const valid = Object.keys(errors).length === 0;
    return {
        valid,
        errors,
        targetTab: 'info',
    };
}

/**
 * Safe sessionStorage draft persistence helpers for multi-step/rich mobile forms.
 */
export function saveSessionDraft<T>(key: string, value: T): void {
    try {
        if (typeof window === 'undefined' || !window.sessionStorage) return;
        window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore private browsing / storage quota failures
    }
}

export function loadSessionDraft<T>(key: string): T | null {
    try {
        if (typeof window === 'undefined' || !window.sessionStorage) return null;
        const raw = window.sessionStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function clearSessionDraft(key: string): void {
    try {
        if (typeof window === 'undefined' || !window.sessionStorage) return;
        window.sessionStorage.removeItem(key);
    } catch {
        // Ignore storage errors
    }
}
