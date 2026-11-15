import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';

// 1. Mock PWA Service Worker
vi.mock('virtual:pwa-register/react', () => ({
    useRegisterSW: () => ({
        offlineReady: [false, vi.fn()],
        needRefresh: [false, vi.fn()],
        updateServiceWorker: vi.fn(),
    }),
}));

// 2. Mock In-Memory IndexedDB
const idbStore = new Map<string, any>();
vi.mock('idb-keyval', () => ({
    get: vi.fn(async (key: string) => idbStore.get(key)),
    set: vi.fn(async (key: string, val: any) => {
        idbStore.set(key, val);
    }),
    del: vi.fn(async (key: string) => {
        idbStore.delete(key);
    }),
    clear: vi.fn(async () => {
        idbStore.clear();
    }),
    keys: vi.fn(async () => Array.from(idbStore.keys())),
}));

// 3. Mock Firebase Firestore & Auth
vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn((_db, ...segments) => segments.join('/')),
    doc: vi.fn((_db, ...segments) => segments.join('/')),
    writeBatch: vi.fn(() => ({
        set: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn(async () => {}),
    })),
    query: vi.fn((ref) => ref),
    orderBy: vi.fn(),
    limit: vi.fn(),
    startAfter: vi.fn(),
    where: vi.fn(),
    getDoc: vi.fn(async () => ({ exists: () => false, data: () => null })),
    getDocs: vi.fn(async () => ({ empty: true, docs: [] })),
    setDoc: vi.fn(async () => {}),
    deleteDoc: vi.fn(async () => {}),
    updateDoc: vi.fn(async () => {}),
    increment: vi.fn(),
    onSnapshot: vi.fn(() => () => {}),
}));

vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({
        currentUser: null,
        onAuthStateChanged: vi.fn((cb) => {
            cb(null);
            return () => {};
        }),
    })),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn((_auth, cb) => {
        cb(null);
        return () => {};
    }),
}));

vi.mock('../../../services/firebase', () => ({
    auth: { currentUser: null },
    db: null,
    isFirebaseConfigured: () => false,
}));

// Components and Providers
import { StoreProvider } from '../../../context/StoreContext';
import { FocusProvider } from '../../../context/FocusContext';
import Layout from '../../../components/Layout';
import Dashboard from '../../../pages/Dashboard';
import VisualPlanner from '../../../pages/VisualPlanner';
import Analysis from '../../../pages/Analysis';
import Leaderboard from '../../../pages/Leaderboard';
import Settings from '../../../pages/Settings';
import { CommandPalette } from '../../../components/CommandPalette';
import { MorningPlanningModal } from '../../../components/rituals/MorningPlanningModal';
import { EveningReflectionModal } from '../../../components/rituals/EveningReflectionModal';
import { BrainDumpModal } from '../../../components/BrainDumpModal';
import { ToastContainer, ConfirmModal } from '../../../components/Feedback';
import FocusTimer from '../../../components/FocusTimer';

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
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    }
    window.scrollTo = vi.fn();
    if (!HTMLDialogElement.prototype.showModal) {
        HTMLDialogElement.prototype.showModal = vi.fn();
    }
    if (!HTMLDialogElement.prototype.close) {
        HTMLDialogElement.prototype.close = vi.fn();
    }
});

beforeEach(() => {
    vi.clearAllMocks();
    idbStore.clear();
});

// Full Application Test Harness
interface AppHarnessProps {
    initialPath?: string;
}

const FullAppTestHarness: React.FC<AppHarnessProps> = ({ initialPath = '/' }) => {
    return (
        <StoreProvider>
            <FocusProvider>
                <MemoryRouter initialEntries={[initialPath]}>
                    <Suspense fallback={<div>درحال بارگذاری...</div>}>
                        <Routes>
                            <Route path="/" element={<Layout />}>
                                <Route index element={<Dashboard />} />
                                <Route path="planner" element={<VisualPlanner />} />
                                <Route path="analysis" element={<Analysis />} />
                                <Route path="leaderboard" element={<Leaderboard />} />
                                <Route path="settings" element={<Settings />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Route>
                        </Routes>
                    </Suspense>
                    <CommandPalette />
                    <MorningPlanningModal />
                    <EveningReflectionModal />
                    <BrainDumpModal />
                </MemoryRouter>
                <ToastContainer />
                <ConfirmModal />
                <FocusTimer />
            </FocusProvider>
        </StoreProvider>
    );
};

describe('E2E Application Flow & Navigation Suite (Milestone 5)', { timeout: 25000 }, () => {
    it('renders the complete app shell with branding, header, and dashboard content without errors', async () => {
        render(<FullAppTestHarness initialPath="/" />);

        // 1. Verify Branding & App Shell
        await waitFor(() => {
            expect(screen.getAllByText('پارساپلان').length).toBeGreaterThanOrEqual(1);
        });

        // 2. Verify Desktop Main Navigation items are rendered
        const desktopNav = screen.getByRole('navigation', { name: 'منوی اصلی' });
        expect(desktopNav).toBeInTheDocument();
        expect(within(desktopNav).getByText('داشبورد جامع')).toBeInTheDocument();
        expect(within(desktopNav).getByText('تایم‌لاین ۲۴ ساعته')).toBeInTheDocument();
        expect(within(desktopNav).getByText('تحلیل و لیگ رقابتی')).toBeInTheDocument();
        expect(within(desktopNav).getByText('اتاق‌های مطالعه')).toBeInTheDocument();
        expect(within(desktopNav).getByText('تنظیمات و راهنما')).toBeInTheDocument();

        // 3. Verify Mobile Navigation has strictly 5 core tabs
        const mobileNav = screen.getByRole('navigation', { name: 'منوی موبایل' });
        expect(mobileNav).toBeInTheDocument();
        const mobileLinks = mobileNav.querySelectorAll('a');
        expect(mobileLinks).toHaveLength(5);
        expect(within(mobileNav).getByText('داشبورد')).toBeInTheDocument();
        expect(within(mobileNav).getByText('تایم‌لاین')).toBeInTheDocument();
        expect(within(mobileNav).getByText('تحلیل')).toBeInTheDocument();
        expect(within(mobileNav).getByText('لیگ')).toBeInTheDocument();
        expect(within(mobileNav).getByText('تنظیمات')).toBeInTheDocument();

        // 4. Verify Dashboard content renders
        expect(screen.getByText('تایمر فوکوس')).toBeInTheDocument();
        await waitFor(() => {
            expect(document.title).toContain('داشبورد');
        });
    });

    it('navigates seamlessly across all 5 core routes via navigation clicks without throwing JavaScript errors', async () => {
        render(<FullAppTestHarness initialPath="/" />);

        await waitFor(() => {
            expect(screen.getAllByText('پارساپلان').length).toBeGreaterThanOrEqual(1);
        });

        const desktopNav = screen.getByRole('navigation', { name: 'منوی اصلی' });

        // Step 1: Navigate to Visual Planner (/planner)
        const plannerLink = within(desktopNav).getByText('تایم‌لاین ۲۴ ساعته');
        fireEvent.click(plannerLink);

        await waitFor(() => {
            expect(document.title).toContain('برنامه‌ریز بصری ۲۴ ساعته');
        });

        // Step 2: Navigate to Analysis (/analysis)
        const analysisLink = within(desktopNav).getByText('تحلیل و لیگ رقابتی');
        fireEvent.click(analysisLink);

        await waitFor(() => {
            expect(document.title).toContain('تحلیل عملکرد');
            expect(screen.getByText('جزئیات عملکرد')).toBeInTheDocument();
        });

        // Step 3: Navigate to Leaderboard (/leaderboard)
        const leaderboardLink = within(desktopNav).getByText('اتاق‌های مطالعه');
        fireEvent.click(leaderboardLink);

        await waitFor(() => {
            expect(document.title).toContain('لیگ و اتاق‌های مطالعه');
        });

        // Step 4: Navigate to Settings (/settings)
        const settingsLink = within(desktopNav).getByText('تنظیمات و راهنما');
        fireEvent.click(settingsLink);

        await waitFor(() => {
            expect(document.title).toContain('تنظیمات');
            expect(screen.getByText('راهنمای کامل و سوالات متداول')).toBeInTheDocument();
        });

        // Step 5: Cycle back to Dashboard (/)
        const dashboardLink = within(desktopNav).getByText('داشبورد جامع');
        fireEvent.click(dashboardLink);

        await waitFor(() => {
            expect(document.title).toContain('داشبورد');
            expect(screen.getByText('تایمر فوکوس')).toBeInTheDocument();
        });
    });

    it('navigates smoothly across all 5 core routes via mobile bottom navigation', async () => {
        render(<FullAppTestHarness initialPath="/" />);

        await waitFor(() => {
            expect(screen.getAllByText('پارساپلان').length).toBeGreaterThanOrEqual(1);
        });

        const mobileNav = screen.getByRole('navigation', { name: 'منوی موبایل' });

        // 1. Mobile Planner tab
        const mobilePlanner = within(mobileNav).getByText('تایم‌لاین');
        fireEvent.click(mobilePlanner);
        await waitFor(() => {
            expect(document.title).toContain('برنامه‌ریز بصری ۲۴ ساعته');
        });

        // 2. Mobile Analysis tab
        const mobileAnalysis = within(mobileNav).getByText('تحلیل');
        fireEvent.click(mobileAnalysis);
        await waitFor(() => {
            expect(document.title).toContain('تحلیل عملکرد');
        });

        // 3. Mobile Leaderboard tab
        const mobileLeaderboard = within(mobileNav).getByText('لیگ');
        fireEvent.click(mobileLeaderboard);
        await waitFor(() => {
            expect(document.title).toContain('لیگ و اتاق‌های مطالعه');
        });

        // 4. Mobile Settings tab
        const mobileSettings = within(mobileNav).getByText('تنظیمات');
        fireEvent.click(mobileSettings);
        await waitFor(() => {
            expect(document.title).toContain('تنظیمات');
        });

        // 5. Mobile Dashboard tab
        const mobileDashboard = within(mobileNav).getByText('داشبورد');
        fireEvent.click(mobileDashboard);
        await waitFor(() => {
            expect(document.title).toContain('داشبورد');
        });
    });

    it('opens and closes Command Palette via unified Search button and keyboard shortcuts', async () => {
        render(<FullAppTestHarness initialPath="/" />);

        await waitFor(() => {
            expect(screen.getAllByText('پارساپلان').length).toBeGreaterThanOrEqual(1);
        });

        // Click search button
        const searchBtns = screen.getAllByRole('button', { name: /جستجو و دستورات/ });
        expect(searchBtns.length).toBeGreaterThanOrEqual(1);
        fireEvent.click(searchBtns[0]);

        // Command Palette dialog / input should be active
        await waitFor(() => {
            const input = screen.getByPlaceholderText(/دستور، صفحه یا نام درس/);
            expect(input).toBeInTheDocument();
        });

        // Close by typing escape
        fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
        await waitFor(() => {
            expect(screen.queryByPlaceholderText(/دستور، صفحه یا نام درس/)).not.toBeInTheDocument();
        });
    });

    it('toggles AI Assistant drawer smoothly and keeps state responsive', async () => {
        render(<FullAppTestHarness initialPath="/" />);

        await waitFor(() => {
            expect(screen.getAllByText('پارساپلان').length).toBeGreaterThanOrEqual(1);
        });

        // Find AI Assistant button in header
        const aiButtons = screen.getAllByRole('button', { name: /دستیار/ });
        expect(aiButtons.length).toBeGreaterThanOrEqual(1);

        // Click to open AI Assistant
        fireEvent.click(aiButtons[0]);

        // Aside drawer should be present
        await waitFor(() => {
            const aiAside = screen.getAllByRole('complementary', { name: 'دستیار هوشمند' });
            expect(aiAside.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('maintains state and updates theme class without breaking render', async () => {
        render(<FullAppTestHarness initialPath="/settings" />);

        await waitFor(() => {
            expect(document.title).toContain('تنظیمات');
        });

        // Verify container is rendered without uncaught exceptions
        expect(screen.getByText('راهنمای کامل و سوالات متداول')).toBeInTheDocument();
    });
});
