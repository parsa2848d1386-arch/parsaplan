import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '../../components/AIChat/ChatInput';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';

const mockCloseConfirm = vi.fn();
const mockRemoveToast = vi.fn();
const mockOnConfirm = vi.fn();

let mockStoreValue: any = {
    toasts: [{ id: 't-1', message: 'تغییرات ذخیره شد', type: 'success' }],
    removeToast: mockRemoveToast,
    confirmState: {
        isOpen: true,
        title: 'حذف تسک',
        message: 'آیا از حذف این مورد مطمئن هستید؟',
        type: 'danger',
        onConfirm: mockOnConfirm,
    },
    closeConfirm: mockCloseConfirm,
    level: 1,
};

vi.mock('../../context/StoreContext', () => ({
    useStore: () => mockStoreValue,
}));

import { ToastContainer, ConfirmModal } from '../../components/Feedback';

describe('Modern Web Guidance compliance', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        document.documentElement.className = '';
        document.documentElement.style.colorScheme = '';
    });

    it('protects ChatInput Enter submission during IME composition (isComposing & keyCode 229)', () => {
        const onSend = vi.fn();
        render(
            <ChatInput
                input="سلام دنیا"
                setInput={vi.fn()}
                onSend={onSend}
                isTyping={false}
            />
        );

        const textarea = screen.getByLabelText('متن پیام برای دستیار هوشمند');
        expect(screen.getByLabelText('افزودن فایل')).toBeInTheDocument();
        expect(screen.getByLabelText('ارسال پیام')).toBeInTheDocument();

        // Active IME composition (standard)
        const composingEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            isComposing: true,
            bubbles: true,
            cancelable: true,
        });
        fireEvent(textarea, composingEvent);
        expect(onSend).not.toHaveBeenCalled();

        // Safari keyCode 229 quirk
        const safariImeEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            keyCode: 229,
            bubbles: true,
            cancelable: true,
        });
        fireEvent(textarea, safariImeEvent);
        expect(onSend).not.toHaveBeenCalled();

        // Confirmed Enter outside composition
        fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 13, isComposing: false });
        expect(onSend).toHaveBeenCalledTimes(1);
    });

    it('renders ConfirmModal as a native <dialog> with ARIA labels and ToastContainer live region', () => {
        mockStoreValue = {
            ...mockStoreValue,
            confirmState: {
                isOpen: true,
                title: 'حذف تسک',
                message: 'آیا از حذف این مورد مطمئن هستید؟',
                type: 'danger',
                onConfirm: mockOnConfirm,
            },
        };

        const { rerender } = render(
            <>
                <ToastContainer />
                <ConfirmModal />
            </>
        );

        const liveRegion = screen.getByRole('region', { name: 'اعلان‌های سیستم' });
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');

        fireEvent.click(screen.getByLabelText('بستن اعلان'));
        expect(mockRemoveToast).toHaveBeenCalledWith('t-1');

        const dialog = document.querySelector('dialog');
        expect(dialog).not.toBeNull();
        expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-modal-title');
        expect(dialog).toHaveAttribute('aria-describedby', 'confirm-modal-message');
        expect(dialog).toHaveAttribute('closedby', 'any');

        fireEvent.click(screen.getByText('تایید می‌کنم'));
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
        expect(mockCloseConfirm).toHaveBeenCalledTimes(1);

        // Closed state cleans up open state & returnValue
        mockStoreValue = {
            ...mockStoreValue,
            confirmState: { ...mockStoreValue.confirmState, isOpen: false },
        };
        rerender(
            <>
                <ToastContainer />
                <ConfirmModal />
            </>
        );
        expect(dialog?.hasAttribute('open')).toBe(false);
        expect(dialog?.returnValue).toBe('');
    });

    it('synchronizes documentElement color-scheme when toggling dark mode', () => {
        const ThemeProbe = () => {
            const { darkMode, toggleDarkMode } = useTheme();
            return (
                <button type="button" onClick={toggleDarkMode}>
                    {darkMode ? 'dark-on' : 'light-on'}
                </button>
            );
        };

        render(
            <ThemeProvider>
                <ThemeProbe />
            </ThemeProvider>
        );

        expect(document.documentElement.style.colorScheme).toBe('light');
        fireEvent.click(screen.getByText('light-on'));
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.documentElement.style.colorScheme).toBe('dark');
    });
});
