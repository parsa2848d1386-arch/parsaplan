import React, { useState } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
    normalizePersianDigits,
    parseLocalizedInt,
    validateTaskDraft,
    saveSessionDraft,
    loadSessionDraft,
    clearSessionDraft,
} from '../../utils/formHelpers';
import { ModalSheet } from '../../components/ui/ModalSheet';

describe('formHelpers — Persian Digit Normalization, Validation & Session Drafts', () => {
    beforeEach(() => {
        window.sessionStorage.clear();
    });

    it('normalizes Persian and Arabic-Indic numerals to ASCII digits', () => {
        expect(normalizePersianDigits('۱۲۳۴۵۶۷۸۹۰')).toBe('1234567890');
        expect(normalizePersianDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
        expect(normalizePersianDigits('فصل ۳ - ۴۵٫۵ دقیقه')).toBe('فصل 3 - 45.5 دقیقه');
    });

    it('parses localized integers cleanly with safe fallback', () => {
        expect(parseLocalizedInt('۴۵')).toBe(45);
        expect(parseLocalizedInt('١٢٠ دقیقه')).toBe(120);
        expect(parseLocalizedInt('90')).toBe(90);
        expect(parseLocalizedInt('بدون عدد', 60)).toBe(60);
        expect(parseLocalizedInt('', 30)).toBe(30);
    });

    it('validates standard task drafts and targets info tab on missing topic', () => {
        const invalid = validateTaskDraft({
            formData: { topic: '   ', subject: 'فیزیک', durationMinutes: 60 },
            isExamMode: false,
            selectedExamSubjects: [],
        });
        expect(invalid.valid).toBe(false);
        expect(invalid.targetTab).toBe('info');
        expect(invalid.errors.topic).toBeTruthy();

        const valid = validateTaskDraft({
            formData: { topic: 'حل تست‌های حرکت‌شناسی', subject: 'فیزیک', durationMinutes: 45 },
            isExamMode: false,
            selectedExamSubjects: [],
        });
        expect(valid.valid).toBe(true);
        expect(Object.keys(valid.errors)).toHaveLength(0);
    });

    it('validates exam mode requires at least one subject and enforces duration bounds', () => {
        const missingExamSubj = validateTaskDraft({
            formData: { durationMinutes: 90 },
            isExamMode: true,
            selectedExamSubjects: [],
        });
        expect(missingExamSubj.valid).toBe(false);
        expect(missingExamSubj.errors.examSubjects).toBeTruthy();

        const badDuration = validateTaskDraft({
            formData: { topic: 'مرور سریع', subject: 'شیمی', durationMinutes: 2 },
            isExamMode: false,
            selectedExamSubjects: [],
        });
        expect(badDuration.valid).toBe(false);
        expect(badDuration.errors.durationMinutes).toBeTruthy();
    });

    it('saves, loads, and clears sessionStorage drafts safely', () => {
        const key = 'test_draft_key';
        expect(loadSessionDraft(key)).toBeNull();

        saveSessionDraft(key, { topic: 'فیزیک دهم', durationMinutes: 45 });
        expect(loadSessionDraft<{ topic: string; durationMinutes: number }>(key)).toEqual({
            topic: 'فیزیک دهم',
            durationMinutes: 45,
        });

        clearSessionDraft(key);
        expect(loadSessionDraft(key)).toBeNull();
    });
});

describe('ModalSheet & useFocusTrap — WCAG 2.2 AA Dialog Semantics', () => {
    it('renders accessible dialog semantics, traps Tab focus, and closes on Escape with focus restore', async () => {
        const onCloseSpy = vi.fn();

        const Harness = () => {
            const [open, setOpen] = useState(false);
            return (
                <div>
                    <button type="button" onClick={() => setOpen(true)}>
                        باز کردن شیت
                    </button>
                    <ModalSheet
                        isOpen={open}
                        onClose={() => {
                            onCloseSpy();
                            setOpen(false);
                        }}
                        title="تست شیت دسترس‌پذیر"
                        historyKey="test-sheet"
                    >
                        <div className="p-4 space-y-2">
                            <input aria-label="فیلد اول" data-autofocus="true" />
                            <button type="button">دکمه دوم</button>
                        </div>
                    </ModalSheet>
                </div>
            );
        };

        render(<Harness />);

        const trigger = screen.getByRole('button', { name: 'باز کردن شیت' });
        trigger.focus();
        fireEvent.click(trigger);

        const dialog = screen.getByRole('dialog', { name: 'تست شیت دسترس‌پذیر' });
        expect(dialog).toBeTruthy();
        expect(dialog.getAttribute('aria-modal')).toBe('true');

        // Tab cycling from last focusable wraps to first focusable inside dialog
        const secondBtn = screen.getByRole('button', { name: 'دکمه دوم' });
        const closeBtn = screen.getByRole('button', { name: 'بستن' });
        secondBtn.focus();
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(document.activeElement).toBe(closeBtn);

        // Shift+Tab from first focusable wraps to last focusable inside dialog
        closeBtn.focus();
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(secondBtn);

        // Escape dismisses dialog cleanly and restores focus to trigger
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onCloseSpy).toHaveBeenCalledTimes(1);
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBeNull();
        });
        expect(document.activeElement).toBe(trigger);
    });
});
