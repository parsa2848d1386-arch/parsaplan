import React from 'react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('virtual:pwa-register/react', () => ({
    useRegisterSW: () => ({
        offlineReady: [false, vi.fn()],
        needRefresh: [false, vi.fn()],
        updateServiceWorker: vi.fn(),
    }),
}));

const idbMap = new Map<string, any>();
const batchOps: any[] = [];
const mockBatchCommit = vi.fn(async () => {});

vi.mock('idb-keyval', () => ({
    get: vi.fn(async (k: string) => idbMap.get(k)),
    set: vi.fn(async (k: string, v: any) => {
        idbMap.set(k, v);
    }),
    del: vi.fn(async (k: string) => {
        idbMap.delete(k);
    }),
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn((_db, ...segments) => segments.join('/')),
    doc: vi.fn((_db, ...segments) => segments.join('/')),
    writeBatch: vi.fn(() => ({
        set: vi.fn((ref, data) => batchOps.push({ op: 'set', ref, data })),
        delete: vi.fn((ref) => batchOps.push({ op: 'delete', ref })),
        commit: mockBatchCommit,
    })),
    query: vi.fn((ref) => ref),
    orderBy: vi.fn(),
    limit: vi.fn(),
    startAfter: vi.fn(),
    where: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    updateDoc: vi.fn(),
    increment: vi.fn(),
    onSnapshot: vi.fn(() => () => {}),
}));

const mockSetCommandPalette = vi.fn();
const mockSetIsTimerOpen = vi.fn();
const mockToggleTask = vi.fn();

const mockStore = {
    user: null,
    userId: 'parsaplan_local_user',
    db: null,
    userName: 'کاربر تست',
    currentDay: 1,
    totalDays: 12,
    startDate: '2026-11-11',
    tasks: [
        {
            id: 'ai-t1',
            dayId: 1,
            date: '2026-11-11',
            subject: 'کار و پروژه',
            topic: 'تحویل اسپرینت',
            details: 'تسک افزوده‌شده با AI',
            isCompleted: true,
            actualDuration: 90,
            qualityRating: 5,
            status: 'completed',
            priority: 'high',
            durationMinutes: 90,
            tags: ['AI'],
        },
    ],
    subjects: [{ id: 's1', name: 'کار و پروژه', icon: '💼', color: 'indigo' }],
    sessions: [],
    moods: {},
    routineTemplate: [],
    studyHoursLog: {},
    studyMinutesByDate: {},
    streakStats: { currentStreak: 3, longestStreak: 5 },
    level: 2,
    xp: 250,
    currentLevelXp: 50,
    xpForNextLevel: 150,
    progressPercent: 33,
    dailyQuote: 'جمله انگیزشی نباید نمایش داده شود',
    showQuotes: true,
    isNewUser: false,
    viewMode: 'normal',
    darkMode: false,
    sidebarCollapsed: false,
    isAiPanelOpen: false,
    isCommandPaletteOpen: false,
    syncQueueCount: 0,
    cloudStatus: 'disconnected',
    saveStatus: 'saved',
    settings: { stream: 'life', dayCutoffHour: 5, dailyCapacityMinutes: 360 },
    getProgress: () => 100,
    getTasksByDate: () => mockStore.tasks,
    getDayDate: (d: number) => `2026-11-${String(10 + d).padStart(2, '0')}`,
    isRoutineSlotCompleted: () => false,
    getDailyNote: () => '',
    setCurrentDay: vi.fn(),
    toggleTask: mockToggleTask,
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    addTask: vi.fn(),
    moveTaskToDate: vi.fn(),
    rebalancePlan: vi.fn(),
    setIsNewUser: vi.fn(),
    setIsTimerOpen: mockSetIsTimerOpen,
    setShowConfetti: vi.fn(),
    setIsCommandPaletteOpen: mockSetCommandPalette,
    setIsAiPanelOpen: vi.fn(),
    setSidebarCollapsed: vi.fn(),
    updateSettings: vi.fn(),
    syncData: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    showToast: vi.fn(),
    setMood: vi.fn(),
    setStudyHoursLog: vi.fn(),
};

vi.mock('../../context/StoreContext', () => ({
    useStore: () => mockStore,
}));

vi.mock('../../context/FocusContext', () => ({
    useFocus: () => ({
        status: 'idle',
        selectedSubject: 'کار و پروژه',
        elapsedSeconds: 0,
        activeRoomCode: null,
        setActiveRoomCode: vi.fn(),
        setIsTimerOpen: mockSetIsTimerOpen,
        startTimer: vi.fn(),
        startFocusForTask: vi.fn(),
    }),
}));

vi.mock('../../hooks/useBioperformance', () => ({
    useBioperformance: vi.fn(),
}));

import { backendCache, normalizeBackendError } from '../../services/backendApi';
import { liveRoomService } from '../../services/liveRoomService';
import { syncEngine } from '../../services/syncEngine';
import Analysis from '../../pages/Analysis';
import Dashboard from '../../pages/Dashboard';
import Layout from '../../components/Layout';
import WeeklyView from '../../components/WeeklyView';
import { UIProvider } from '../../context/UIContext';

beforeAll(() => {
    if (!globalThis.ResizeObserver) {
        globalThis.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        } as any;
    }
    if (!window.matchMedia) {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation((q: string) => ({
                matches: false,
                media: q,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    }
});

describe('Backend standardization, scaling, UI cleanup & mobile nav', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        idbMap.clear();
        batchOps.length = 0;
        backendCache.clear();
    });

    it('standardizes errors, deduplicates concurrent cache reads, and enforces rate limits', async () => {
        const permErr = normalizeBackendError({ code: 'permission-denied' });
        expect(permErr.code).toBe('permission-denied');
        expect(permErr.retryable).toBe(false);

        const fetcher = vi.fn(async () => ({ count: 42 }));
        const results = await Promise.all([
            backendCache.getOrFetch('test_key', 10_000, fetcher),
            backendCache.getOrFetch('test_key', 10_000, fetcher),
            backendCache.getOrFetch('test_key', 10_000, fetcher),
        ]);
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(results.every((r) => r.data.count === 42)).toBe(true);

        // Rate limit test
        expect(backendCache.canProceed('cheer_u1', 5000)).toBe(true);
        expect(backendCache.canProceed('cheer_u1', 5000)).toBe(false);
    });

    it('coalesces delta mutations and flushes outbox in a single writeBatch', async () => {
        await syncEngine.enqueueMany('u_scaled', [
            { type: 'upsert_task', entityId: 't1', payload: { id: 't1', topic: 'A' } },
            { type: 'upsert_task', entityId: 't2', payload: { id: 't2', topic: 'B' } },
        ]);
        await syncEngine.enqueue('u_scaled', { type: 'delete_task', entityId: 't1' });

        const queue = await syncEngine.getQueue('u_scaled');
        expect(queue.map((q) => q.type)).toEqual(['upsert_task', 'delete_task']);

        const res = await syncEngine.flushOutbox({} as any, 'u_scaled', { uid: 'u_scaled' });
        expect(res).toEqual({ flushed: 2, remaining: 0 });
        expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it('renders جزئیات عملکرد above تعادل مطالعاتی in Analysis', () => {
        render(
            <MemoryRouter>
                <Analysis />
            </MemoryRouter>
        );
        const perfHeading = screen.getByText('جزئیات عملکرد');
        const balanceHeading = screen.getByText('تعادل مطالعاتی');
        expect(perfHeading.compareDocumentPosition(balanceHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('removes marked Dashboard cards, fixes 7-day mini bars, and keeps تایمر فوکوس', () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );
        expect(screen.queryByText('جمله انگیزشی نباید نمایش داده شود')).not.toBeInTheDocument();
        expect(screen.queryByText(/شمارش معکوس هدف/)).not.toBeInTheDocument();
        expect(screen.queryByText(/۳ اولویت طلایی امروز/)).not.toBeInTheDocument();
        expect(screen.queryByText(/ریتم آمادگی زیستی هوشمند/)).not.toBeInTheDocument();
        expect(screen.queryByText(/تخلیه ذهن سریع/)).not.toBeInTheDocument();
        expect(screen.queryByText(/دفترچه و تخته قلم/)).not.toBeInTheDocument();
        expect(screen.queryByText(/جمع‌بندی شبانه/)).not.toBeInTheDocument();

        expect(screen.getByText('تایمر فوکوس')).toBeInTheDocument();
        expect(screen.getByText(/زنجیره پیوستگی/)).toBeInTheDocument();

        // WeekMini Saturday-to-Friday distinct weekdays & navigation
        ['ش', '۱ش', '۲ش', '۳ش', '۴ش', '۵ش', 'ج'].forEach((wd) => {
            expect(screen.getByText(wd)).toBeInTheDocument();
        });
        expect(screen.getByRole('button', { name: 'هفته قبل' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'هفته بعد' })).toBeInTheDocument();

        render(<WeeklyView />);
        ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'].forEach((fullWd) => {
            expect(screen.getByText(fullWd)).toBeInTheDocument();
        });
    });

    it('unifies Search+Ctrl+K and restricts mobile bottom nav strictly to 5 core tabs without دفترچه/روتین/لایتنر', () => {
        render(
            <UIProvider>
                <MemoryRouter>
                    <Layout />
                </MemoryRouter>
            </UIProvider>
        );

        const mobileNav = screen.getByRole('navigation', { name: 'منوی موبایل' });
        expect(mobileNav.querySelectorAll('a')).toHaveLength(5);
        expect(mobileNav).toHaveTextContent('داشبورد');
        expect(mobileNav).toHaveTextContent('تایم‌لاین');
        expect(mobileNav).toHaveTextContent('تحلیل');
        expect(mobileNav).toHaveTextContent('لیگ');
        expect(mobileNav).toHaveTextContent('تنظیمات');

        expect(screen.queryByText('دفترچه')).not.toBeInTheDocument();
        expect(screen.queryByText('روتین')).not.toBeInTheDocument();
        expect(screen.queryByText('لایتنر')).not.toBeInTheDocument();
        expect(screen.queryByText('بیشتر')).not.toBeInTheDocument();

        // Unified Search + Ctrl+K button opens CommandPalette
        const unifiedSearchBtns = screen.getAllByRole('button', { name: /جستجو و دستورات/ });
        fireEvent.click(unifiedSearchBtns[0]);
        expect(mockSetCommandPalette).toHaveBeenCalledWith(true);
    });

    it('creates standardized YPT study room metadata via liveRoomService.createRoomSafe', async () => {
        const res = await liveRoomService.createRoomSafe({} as any, {
            creatorId: 'user_1',
            creatorName: 'پارسا',
            name: 'تیم کار عمیق',
            category: 'برنامه‌نویسی',
            targetHours: 6,
            maxMembers: 50,
            isPublic: true,
        });
        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.data.code).toHaveLength(6);
            expect(res.data.category).toBe('برنامه‌نویسی');
            expect(res.data.targetHours).toBe(6);
            expect(res.data.maxMembers).toBe(50);
            expect(res.data.isPublic).toBe(true);
        }
    });
});
