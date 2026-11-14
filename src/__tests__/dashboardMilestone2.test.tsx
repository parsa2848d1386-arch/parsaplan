import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '../../pages/Dashboard';
import { UIProvider } from '../../context/UIContext';

const mockSetIsTimerOpen = vi.fn();
const mockToggleTask = vi.fn();
const mockAddTask = vi.fn();
const mockUpdateTask = vi.fn();
const mockDeleteTask = vi.fn();
const mockSetMood = vi.fn();

const mockStore = {
    userName: 'کاربر تست',
    currentDay: 1,
    totalDays: 12,
    startDate: '2026-11-14',
    tasks: [
        {
            id: 'task-1',
            dayId: 1,
            date: '2026-11-14',
            subject: 'ریاضی مهندسی',
            topic: 'معادلات دیفرانسیل',
            details: 'حل ۲۰ تست زمان‌دار',
            isCompleted: true,
            status: 'completed',
            priority: 'high',
            durationMinutes: 90,
        },
        {
            id: 'task-2',
            dayId: 1,
            date: '2026-11-14',
            subject: 'معماری کامپیوتر',
            topic: 'پایپ‌لاین',
            details: 'حل تمرین',
            isCompleted: false,
            status: 'todo',
            priority: 'medium',
            durationMinutes: 60,
        },
    ],
    subjects: [{ id: 's1', name: 'ریاضی مهندسی', icon: '📐', color: 'indigo' }],
    sessions: [],
    moods: { '2026-11-14': 'high-energy' },
    routineTemplate: [],
    studyHoursLog: {},
    studyMinutesByDate: { '2026-11-14': 330 },
    streakStats: { currentStreak: 14, longestStreak: 20 },
    level: 3,
    xp: 500,
    progressPercent: 50,
    isNewUser: false,
    viewMode: 'normal',
    settings: { stream: 'riazi', dayCutoffHour: 5, dailyCapacityMinutes: 360 },
    getProgress: () => 50,
    getTasksByDate: () => mockStore.tasks,
    getDayDate: () => '2026-11-14',
    setCurrentDay: vi.fn(),
    toggleTask: mockToggleTask,
    updateTask: mockUpdateTask,
    deleteTask: mockDeleteTask,
    moveTaskToDate: vi.fn(),
    rebalancePlan: vi.fn(),
    addTask: mockAddTask,
    setIsTimerOpen: mockSetIsTimerOpen,
    setIsNewUser: vi.fn(),
    setShowConfetti: vi.fn(),
    setMood: mockSetMood,
    scheduleReview: vi.fn(),
    addFlashcard: vi.fn(),
};

vi.mock('../../context/StoreContext', () => ({
    useStore: () => mockStore,
    StoreProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../context/FocusContext', () => ({
    useFocus: () => ({
        isFocusActive: false,
        activeTaskId: null,
        elapsedSeconds: 0,
        startFocus: vi.fn(),
        stopFocus: vi.fn(),
    }),
    FocusProvider: ({ children }: any) => <div>{children}</div>,
}));

describe('Milestone 2 - Dashboard Restructuring Acceptance Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderDashboard = () => {
        return render(
            <UIProvider>
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            </UIProvider>
        );
    };

    it('R2.1: Merges deep focus card with greeting into Hero Bento Banner', () => {
        renderDashboard();

        // Greeting and active mindset
        expect(screen.getByText(/صبح بخیر، کاربر تست/)).toBeInTheDocument();
        expect(screen.getByText('سیستم آمادگی ذهنی فعال')).toBeInTheDocument();

        // Mini focus progress ring details
        expect(screen.getByText('تمرکز عمیق')).toBeInTheDocument();

        // CTA buttons inside Hero Banner
        const timerBtn = screen.getByText('تایمر فوکوس');
        expect(timerBtn).toBeInTheDocument();
        fireEvent.click(timerBtn);
        expect(mockSetIsTimerOpen).toHaveBeenCalledWith(true);

        const newTaskBtns = screen.getAllByRole('button', { name: /تسک جدید/ });
        expect(newTaskBtns.length).toBeGreaterThanOrEqual(1);
    });

    it('R2.2: Liquid Fill week calendar renders Saturday-to-Friday with percentage fills', () => {
        const { container } = renderDashboard();

        expect(screen.getByText(/تقویم هفته جاری/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'هفته قبل' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'هفته بعد' })).toBeInTheDocument();

        // Check for 7 weekday badges
        ['ش', '۱ش', '۲ش', '۳ش', '۴ش', '۵ش', 'ج'].forEach((wd) => {
            expect(screen.getByText(wd)).toBeInTheDocument();
        });

        // Check for liquid fill elements
        const liquidLayers = container.querySelectorAll('[style*="height:"]');
        expect(liquidLayers.length).toBeGreaterThanOrEqual(7);
    });

    it('R2.3: Attention depth metric block is completely removed without trace', () => {
        renderDashboard();

        expect(screen.queryByText(/شاخص کیفیت و عمق توجه/)).not.toBeInTheDocument();
        expect(screen.queryByText(/شاخص کیفیت/)).not.toBeInTheDocument();
        expect(screen.queryByText(/عمق توجه/)).not.toBeInTheDocument();
        expect(screen.queryByText(/۹۲٪ نمره بازدهی/)).not.toBeInTheDocument();
    });

    it('R2.4: Today\'s Mood widget has 5 strict levels with vector SVGs and zero text emojis', () => {
        renderDashboard();

        // Mood header
        expect(screen.getByText('مود امروز')).toBeInTheDocument();

        // 5 exact levels
        expect(screen.getByText('عالی')).toBeInTheDocument();
        expect(screen.getByText('خوب/پرانرژی')).toBeInTheDocument();
        expect(screen.getByText('معمولی')).toBeInTheDocument();
        expect(screen.getByText('خسته/کم‌انرژی')).toBeInTheDocument();
        expect(screen.getByText('فرسوده/بی‌انرژی')).toBeInTheDocument();

        // Absolute prohibition of old text emojis
        ['🌟', '🎯', '⚡', '🥱', '🌧️'].forEach((emoji) => {
            expect(screen.queryByText(emoji)).not.toBeInTheDocument();
        });

        // Interacting with a mood button calls setMood
        fireEvent.click(screen.getByText('عالی'));
        expect(mockSetMood).toHaveBeenCalledWith('2026-11-14', 'excellent');
    });

    it('R2.5: Timeblocks preview is integrated directly inside Today\'s Tasks section', () => {
        renderDashboard();

        // Timeblocks preview header exists
        expect(screen.getByText('بلوک‌های زمانی پیش‌رو')).toBeInTheDocument();
        expect(screen.getByText('بلوک جاری')).toBeInTheDocument();
        expect(screen.getByText('استراحت هوشمند')).toBeInTheDocument();
        expect(screen.getByText('بلوک عصر')).toBeInTheDocument();
    });

    it('R2.6: Clicking New Task opens the TaskModal dialog', () => {
        renderDashboard();

        // Click on the hero banner's new task button
        const newTaskBtns = screen.getAllByRole('button', { name: /تسک جدید/ });
        fireEvent.click(newTaskBtns[0]);

        // Dialog / Modal should now be open
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
});
