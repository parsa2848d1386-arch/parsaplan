
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup, useReducedMotion, useDragControls, PanInfo } from 'framer-motion';
import {
    Home, CalendarClock, BookOpen, Settings, BarChart2, Trophy,
    Search, X, LogIn, Cloud, CloudOff, AlertTriangle, Sparkles,
    ChevronLeft, ChevronRight, Flame, CheckCircle2, History as HistoryIcon
} from 'lucide-react';
import { useStore, useStoreSyncStatus } from '../context/StoreContext';
const AIChat = React.lazy(() => import('../pages/AIChat'));
import { useProactiveAI } from './AIChat/useProactiveAI';
const AuthModal = React.lazy(() => import('./AuthModal').then(m => ({ default: m.AuthModal })));
const PrintableSchedule = React.lazy(() => import('./PrintableSchedule'));
import { NotificationBell } from './NotificationBell';
import { BrandLogo } from './BrandLogo';
import { ErrorBoundary } from './ErrorBoundary';
import { RouteSkeleton, AIChatSkeleton } from './Skeleton';
import { ArcFlightOverlay, RubberBandScrollContainer } from './ui/MotionPrimitives';
import { getFullShamsiDate, formatToPersianDigits } from '../utils';
import { useBioperformance } from '../hooks/useBioperformance';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useOverlayHistory } from '../hooks/useOverlayHistory';
import { haptics } from '../utils/haptics';
import { SPRING_SHEET, SPRING_SNAPPY } from '../utils/motionPresets';
import { prefetchRoute, prefetchCoreRoutesOnIdle } from '../utils/routePrefetch';

const PAGE_TITLES: Record<string, { title: string; shortTitle?: string; breadcrumb: string; isSubRoute?: boolean }> = {
    '/': { title: 'داشبورد', breadcrumb: 'داشبورد' },
    '/planner': { title: 'برنامه‌ریز بصری ۲۴ ساعته', shortTitle: 'تایم‌لاین ۲۴ ساعته', breadcrumb: 'تایم‌لاین' },
    '/subjects': { title: 'حوزه‌ها و اهداف', shortTitle: 'حوزه‌ها و نماها', breadcrumb: 'حوزه‌ها', isSubRoute: true },
    '/analysis': { title: 'تحلیل عملکرد', breadcrumb: 'تحلیل' },
    '/leaderboard': { title: 'لیگ و اتاق‌های مطالعه', shortTitle: 'لیگ و اتاق مطالعه', breadcrumb: 'لیگ' },
    '/settings': { title: 'تنظیمات', breadcrumb: 'تنظیمات' },
    '/history': { title: 'تاریخچه', breadcrumb: 'تاریخچه', isSubRoute: true },
    '/ai-chat': { title: 'دستیار هوشمند', breadcrumb: 'AI', isSubRoute: true },
};

const formatMinuteTime = () =>
    new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

const useMinuteClock = () => {
    const [clock, setClock] = useState(() => ({
        time: formatMinuteTime(),
        date: getFullShamsiDate(new Date().toISOString()),
    }));

    useEffect(() => {
        const timer = setInterval(() => {
            const nextTime = formatMinuteTime();
            setClock((prev) => {
                if (prev.time === nextTime) return prev;
                const nextDate = getFullShamsiDate(new Date().toISOString());
                return { time: nextTime, date: nextDate };
            });
        }, 10000);
        return () => clearInterval(timer);
    }, []);

    return clock;
};

const DesktopClockChip = React.memo(() => {
    const { time, date } = useMinuteClock();
    return (
        <div className="hidden xl:flex items-center gap-2 bg-white/45 dark:bg-white/8 px-3 py-1.5 squircle-sm text-on-surface-variant dark:text-slate-200 border border-[var(--glass-nav-border)] text-xs font-medium tabular-nums whitespace-nowrap shrink-0">
            <CalendarClock size={15} className="text-primary shrink-0" aria-hidden="true" />
            <span className="font-bold text-on-surface dark:text-white">{time}</span>
            <span className="opacity-40">|</span>
            <span>{date}</span>
        </div>
    );
});
DesktopClockChip.displayName = 'DesktopClockChip';

const SyncStatusChip = React.memo<{
    isOnline: boolean;
    cloudStatus: 'disconnected' | 'connected' | 'error';
    variant: 'desktop' | 'mobile';
}>(({ isOnline, cloudStatus, variant }) => {
    const { isSyncing, syncQueueCount } = useStoreSyncStatus();
    const shouldShow = !isOnline || isSyncing || (syncQueueCount ?? 0) > 0 || cloudStatus === 'error';
    if (!shouldShow) return null;

    if (variant === 'mobile') {
        return (
            <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-surface-container text-on-surface-variant shrink-0"
                title={!isOnline ? 'حالت آفلاین' : 'در حال همگام‌سازی'}
            >
                {!isOnline ? (
                    <CloudOff size={12} className="text-amber-500" />
                ) : cloudStatus === 'error' ? (
                    <AlertTriangle size={12} className="text-rose-500" />
                ) : (
                    <Cloud size={12} className="text-secondary" />
                )}
                {syncQueueCount > 0 && (
                    <span className="tabular-nums">{formatToPersianDigits(syncQueueCount)}</span>
                )}
            </span>
        );
    }

    return (
        <span className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold border border-[var(--border-subtle)] bg-surface-container-low dark:bg-slate-800 text-on-surface-variant">
            {!isOnline ? (
                <>
                    <CloudOff size={13} className="text-amber-500" aria-hidden="true" />
                    <span>آفلاین</span>
                </>
            ) : cloudStatus === 'error' ? (
                <>
                    <AlertTriangle size={13} className="text-rose-500" aria-hidden="true" />
                    <span>خطای همگام‌سازی</span>
                </>
            ) : (
                <>
                    <Cloud size={13} className="text-secondary" aria-hidden="true" />
                    <span>
                        {isSyncing
                            ? 'در حال همگام‌سازی...'
                            : `${formatToPersianDigits(syncQueueCount)} تغییر در صف`}
                    </span>
                </>
            )}
        </span>
    );
});
SyncStatusChip.displayName = 'SyncStatusChip';

const Layout = () => {
    const prefersReducedMotion = useReducedMotion();
    const aiDragControls = useDragControls();
    useProactiveAI();
    useBioperformance();

    const location = useLocation();
    const navigate = useNavigate();
    const isMobile = useMediaQuery('(max-width: 767px)');

    const {
        darkMode, level, streakStats,
        cloudStatus,
        sidebarCollapsed, setSidebarCollapsed,
        user, login, register,
        userName, isAiPanelOpen, setIsAiPanelOpen, settings, updateSettings,
        isCommandPaletteOpen, setIsCommandPaletteOpen
    } = useStore();

    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [isProfileChipExpanded, setIsProfileChipExpanded] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isBottomNavCompact, setIsBottomNavCompact] = useState(false);
    const profileCapsuleRef = useRef<HTMLDivElement>(null);
    const bottomNavIdleTimerRef = useRef<number | null>(null);
    const lastScrollTopRef = useRef(0);

    const scheduleBottomNavCompact = useCallback(() => {
        if (bottomNavIdleTimerRef.current) {
            window.clearTimeout(bottomNavIdleTimerRef.current);
        }
        bottomNavIdleTimerRef.current = window.setTimeout(() => {
            setIsBottomNavCompact(true);
        }, 3200);
    }, []);

    const expandBottomNav = useCallback(() => {
        setIsBottomNavCompact(false);
        scheduleBottomNavCompact();
    }, [scheduleBottomNavCompact]);

    useEffect(() => {
        if (!isMobile) {
            setIsBottomNavCompact(false);
            return;
        }
        scheduleBottomNavCompact();
        return () => {
            if (bottomNavIdleTimerRef.current) {
                window.clearTimeout(bottomNavIdleTimerRef.current);
            }
        };
    }, [isMobile, scheduleBottomNavCompact]);

    useEffect(() => {
        if (!isProfileChipExpanded) return;
        const handleOutside = (e: MouseEvent) => {
            if (profileCapsuleRef.current && !profileCapsuleRef.current.contains(e.target as Node)) {
                setIsProfileChipExpanded(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [isProfileChipExpanded]);

    // Preload core route bundles during browser idle so tab switches have zero JS-fetch lag
    useEffect(() => prefetchCoreRoutesOnIdle(), []);

    const [isOnline, setIsOnline] = useState<boolean>(() =>
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onOnline = () => setIsOnline(true);
        const onOffline = () => setIsOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    // Connect full-screen mobile AI drawer to browser Back button (Baymard 2026)
    const closeAiDrawer = useCallback(() => setIsAiPanelOpen(false), [setIsAiPanelOpen]);
    useOverlayHistory(isMobile && isAiPanelOpen, closeAiDrawer, 'ai-drawer');

    const streakCount = streakStats?.currentStreak ?? 0;
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const handleTriggerSearch = useCallback(() => {
        haptics.selection();
        setIsSearchExpanded(true);
        setIsCommandPaletteOpen(true);
        window.setTimeout(() => setIsSearchExpanded(false), 260);
    }, [setIsCommandPaletteOpen]);

    const dailyGoalLabel = useMemo(() => {
        const mins = settings?.dailyCapacityMinutes ?? 360;
        const hrs = Math.round((mins / 60) * 10) / 10;
        return `${formatToPersianDigits(hrs)} ساعت`;
    }, [settings?.dailyCapacityMinutes]);

    const [aiPanelWidth, setAiPanelWidth] = useState(360);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const isResizingRef = useRef(false);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizingRef.current = true;
    }, []);

    const stopResizing = useCallback(() => {
        isResizingRef.current = false;
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizingRef.current) {
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 280 && newWidth < 620) setAiPanelWidth(newWidth);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    const currentPage = PAGE_TITLES[location.pathname] || PAGE_TITLES['/'];

    useEffect(() => {
        document.title = `${currentPage.title} | ParsaPlan`;
    }, [currentPage.title]);

    const mainNavItems = [
        { to: '/', icon: Home, label: 'داشبورد جامع' },
        { to: '/planner', icon: CalendarClock, label: 'تایم‌لاین ۲۴ ساعته' },
        { to: '/leaderboard', icon: Trophy, label: 'اتاق‌های مطالعه' },
        { to: '/analysis', icon: BarChart2, label: 'تحلیل و لیگ رقابتی' },
        { to: '/subjects', icon: BookOpen, label: 'حوزه‌ها و دروس' },
        { to: '/history', icon: HistoryIcon, label: 'تاریخچه' },
        { to: '/settings', icon: Settings, label: 'تنظیمات و راهنما' },
    ];

    const getDisplayName = () => userName || user?.displayName || user?.email?.split('@')[0] || 'کاربر مهمان';
    const userInitial = (userName || user?.displayName || user?.email || 'کاربر').charAt(0).toUpperCase();

    const handleToggleAiPanel = () => {
        haptics.selection();
        const nextOpen = !isAiPanelOpen;
        setIsAiPanelOpen(nextOpen);
        if (nextOpen && settings?.hasUnreadAiMessage) {
            updateSettings({ hasUnreadAiMessage: false });
        }
    };

    const handleMobileBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <div data-color-scheme={darkMode ? 'dark' : 'light'}>
            <ArcFlightOverlay />
            <Suspense fallback={null}>
                <PrintableSchedule />
            </Suspense>

            <div className="flex h-[100dvh] overflow-hidden no-print bg-[var(--surface-canvas)] text-[var(--text-primary)] text-right" dir="rtl">
                {isAuthModalOpen && (
                    <Suspense fallback={null}>
                        <AuthModal
                            isOpen={isAuthModalOpen}
                            onClose={() => setIsAuthModalOpen(false)}
                            onLogin={async (u, p) => (login ? login(u, p) : false)}
                            onRegister={async (u, p, n) => (register ? register(u, p, n) : false)}
                            isLoading={false}
                        />
                    </Suspense>
                )}

                {/* ====================================================
                    SIDEBAR — DESKTOP
                   ==================================================== */}
                <aside
                    className={`
                        hidden md:flex flex-col h-full z-30 flex-shrink-0 relative
                        bg-surface-container-low dark:bg-slate-900
                        border-l border-[var(--border-subtle)]
                        transition-all duration-300 py-space-md px-space-sm justify-between
                        ${sidebarCollapsed ? 'w-[76px]' : 'w-72'}
                    `}
                >
                    <div className="flex flex-col gap-space-md">
                        {/* Logo & Brand Header */}
                        <div className="flex items-center justify-between px-space-xs">
                            <div className="flex items-center gap-space-sm">
                                <div className="w-10 h-10 squircle-sm bg-primary flex items-center justify-center text-on-primary shadow-sm flex-shrink-0">
                                    <BrandLogo size={22} />
                                </div>
                                {!sidebarCollapsed && (
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-headline-md text-base text-on-surface dark:text-white font-bold">پارساپلان</span>
                                        <span className="font-label-sm text-xs text-on-surface-variant dark:text-slate-400">مدیریت عمیق زیست و مطالعه</span>
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    haptics.selection();
                                    setSidebarCollapsed(!sidebarCollapsed);
                                }}
                                aria-label={sidebarCollapsed ? 'باز کردن منو' : 'جمع کردن منو'}
                                className="w-9 h-9 flex items-center justify-center squircle-sm text-on-surface-variant hover:bg-surface-container dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                                {sidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                            </button>
                        </div>

                        {/* Focus Goal Badge */}
                        {!sidebarCollapsed && (
                            <div className="bg-surface-container-lowest dark:bg-slate-800/90 squircle-card p-3 border border-[var(--border-subtle)] flex items-center justify-between">
                                <div className="flex items-center gap-2 text-on-surface-variant dark:text-slate-300">
                                    <CalendarClock size={16} className="text-secondary" aria-hidden="true" />
                                    <span className="text-xs font-medium">هدف فوکوس امروز</span>
                                </div>
                                <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-0.5 squircle-sm font-bold tabular-nums">
                                    {dailyGoalLabel}
                                </span>
                            </div>
                        )}

                        {/* Navigation Links (Desktop Sliding Pill + Apple G2 Squircle) */}
                        <LayoutGroup id="desktop-sidebar-nav">
                            <nav aria-label="منوی اصلی" className="flex flex-col gap-1 custom-scrollbar">
                                {mainNavItems.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        end={item.to === '/'}
                                        onClick={() => haptics.selection()}
                                        onMouseEnter={() => prefetchRoute(item.to)}
                                        onFocus={() => prefetchRoute(item.to)}
                                        title={sidebarCollapsed ? item.label : undefined}
                                        className={({ isActive }) =>
                                            `relative flex items-center gap-3 px-3.5 min-h-[44px] squircle-sm transition-colors duration-150 text-sm font-medium ${
                                                isActive
                                                    ? 'text-on-primary-fixed font-bold'
                                                    : 'text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high dark:hover:bg-slate-800 hover:text-on-surface dark:hover:text-white'
                                            }`
                                        }
                                    >
                                        {({ isActive }) => (
                                            <>
                                                {isActive && (
                                                    <motion.span
                                                        layoutId="desktopSidebarActivePill"
                                                        transition={prefersReducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                                                        aria-hidden="true"
                                                        className="absolute inset-0 squircle-sm bg-primary-fixed dark:bg-[#2a2f6c] shadow-xs ring-1 ring-primary/15 dark:ring-primary/35"
                                                    />
                                                )}
                                                <item.icon size={19} strokeWidth={isActive ? 2.3 : 1.9} className="relative z-10 flex-shrink-0" aria-hidden="true" />
                                                {!sidebarCollapsed && <span className="relative z-10">{item.label}</span>}
                                            </>
                                        )}
                                    </NavLink>
                                ))}
                            </nav>
                        </LayoutGroup>
                    </div>

                    {/* Version & Status Footer (no duplicate streak) */}
                    <div className="flex flex-col gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
                        {!sidebarCollapsed ? (
                            <div className="flex items-center justify-between px-1 py-0.5 text-[var(--text-secondary)] text-xs">
                                <span>نسخه ۲.۴ پلاس</span>
                                <span className="flex items-center gap-1 text-secondary font-bold">
                                    <CheckCircle2 size={13} className="text-secondary" aria-hidden="true" />
                                    پایدار
                                </span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
                                    {userInitial}
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                {/* ====================================================
                    MAIN CONTENT
                   ==================================================== */}
                <main className="flex-1 flex flex-col min-w-0 relative h-full">
                    {/* Desktop Header (Soft Liquid Glass Control Layer — Content Glides Underneath) */}
                    <header className="hidden md:flex md:absolute md:top-0 md:inset-x-0 items-center justify-between h-16 px-6 border-b border-[var(--glass-nav-border)] liquid-glass-nav glass-header-shadow z-40">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    haptics.selection();
                                    setIsCommandPaletteOpen(true);
                                }}
                                className="w-56 xl:w-64 h-10 px-3 gap-2 flex items-center justify-between bg-white/45 dark:bg-white/8 squircle-sm text-on-surface-variant dark:text-slate-200 text-xs border border-[var(--glass-nav-border)] hover:border-primary/40 transition-colors group cursor-pointer text-right shrink-0"
                                title="جستجو و دستورات (Ctrl+K)"
                                aria-label="جستجو و دستورات (Ctrl+K)"
                            >
                                <span className="flex items-center gap-2 min-w-0 flex-1">
                                    <Search size={16} className="shrink-0 text-on-surface-variant group-hover:text-primary transition-colors" aria-hidden="true" />
                                    <span className="truncate">جستجو در برنامه...</span>
                                </span>
                                <kbd className="shrink-0 px-1.5 py-0.5 rounded-md bg-white/60 dark:bg-slate-700/80 text-on-surface-variant dark:text-slate-200 text-[11px] font-mono border border-[var(--border-subtle)]">
                                    Ctrl+K
                                </kbd>
                            </button>

                            <DesktopClockChip />

                            <SyncStatusChip isOnline={isOnline} cloudStatus={cloudStatus} variant="desktop" />
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            <div
                                data-arc-target="xp-badge"
                                className="flex items-center gap-1.5 bg-tertiary-fixed/70 px-3 py-1.5 squircle-sm text-on-tertiary-fixed font-bold text-xs tabular-nums border border-tertiary/15 whitespace-nowrap shrink-0"
                            >
                                <Flame size={15} className="fill-current text-tertiary shrink-0" aria-hidden="true" />
                                <span>{formatToPersianDigits(streakCount)} روز زنجیره</span>
                            </div>

                            <button
                                type="button"
                                onClick={handleToggleAiPanel}
                                aria-label={isAiPanelOpen ? 'بستن دستیار هوشمند' : 'دستیار هوشمند'}
                                className={`relative flex items-center gap-1.5 px-3 min-h-[40px] squircle-sm text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                    isAiPanelOpen
                                        ? 'bg-primary text-on-primary shadow-xs'
                                        : 'bg-primary/14 text-primary hover:bg-primary/20'
                                }`}
                            >
                                <Sparkles size={15} className="shrink-0" aria-hidden="true" />
                                <span className="hidden lg:inline">{isAiPanelOpen ? 'بستن دستیار' : 'دستیار هوشمند'}</span>
                            </button>

                            <NotificationBell />

                            <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5" />

                            <button
                                type="button"
                                onClick={() => {
                                    haptics.selection();
                                    if (!user) setIsAuthModalOpen(true);
                                    else navigate('/settings');
                                }}
                                className="flex items-center gap-2 px-2 py-1 squircle-sm hover:bg-white/40 dark:hover:bg-white/10 transition text-left cursor-pointer shrink-0 whitespace-nowrap"
                                title={user ? 'تنظیمات حساب' : 'ورود یا همگام‌سازی ابری'}
                            >
                                <div className="flex flex-col text-left items-end">
                                    <span className="text-xs font-bold text-on-surface dark:text-white truncate max-w-[120px]">
                                        {getDisplayName()}
                                    </span>
                                    <span className="text-[11px] text-secondary font-semibold flex items-center gap-1 whitespace-nowrap">
                                        {user ? (
                                            `سطح ${formatToPersianDigits(level)} • ابری`
                                        ) : (
                                            <>
                                                <LogIn size={11} aria-hidden="true" />
                                                ورود ابری / آفلاین
                                            </>
                                        )}
                                    </span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                                    {userInitial}
                                </div>
                            </button>
                        </div>
                    </header>

                    {/* Mobile Top Floating Capsules — Two Morphing Liquid Glass Pills (Right: Profile + Settings, Left: Search + Notifications) */}
                    <header className="md:hidden fixed top-[max(0.625rem,env(safe-area-inset-top,0px))] inset-x-3 z-40 pointer-events-none flex items-start justify-between gap-2">
                        {/* Top-Right Floating Capsule: Morphs & expands when Profile or Settings is active */}
                        <motion.div
                            ref={profileCapsuleRef}
                            layout
                            transition={prefersReducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                            className="pointer-events-auto flex items-center gap-1 p-1 rounded-full liquid-glass-nav glass-pill-shadow border border-[var(--glass-nav-border)] max-w-[calc(100vw-8.5rem)]"
                        >
                            {currentPage.isSubRoute && (
                                <motion.button
                                    layout="position"
                                    type="button"
                                    onClick={() => {
                                        haptics.selection();
                                        handleMobileBack();
                                    }}
                                    whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                                    transition={SPRING_SNAPPY}
                                    aria-label="بازگشت"
                                    className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface dark:text-white hover:bg-surface-container/80 transition cursor-pointer shrink-0"
                                >
                                    <ChevronRight size={20} />
                                </motion.button>
                            )}

                            <motion.button
                                layout
                                type="button"
                                data-arc-target="xp-badge"
                                onClick={() => {
                                    haptics.selection();
                                    setIsProfileChipExpanded((prev) => !prev);
                                }}
                                whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
                                whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
                                transition={SPRING_SNAPPY}
                                aria-expanded={isProfileChipExpanded}
                                aria-label={user ? `پروفایل ${getDisplayName()}` : 'پروفایل کاربر و ورود'}
                                title={user ? 'حساب کاربری' : 'ورود یا همگام‌سازی ابری'}
                                className={`h-11 rounded-full flex items-center justify-center font-extrabold text-xs shadow-xs cursor-pointer transition-colors shrink-0 ${
                                    isProfileChipExpanded
                                        ? 'bg-primary text-on-primary pl-3 pr-1.5 gap-2'
                                        : 'w-11 bg-primary text-on-primary'
                                }`}
                            >
                                <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                                    {userInitial}
                                </span>
                                <AnimatePresence initial={false}>
                                    {isProfileChipExpanded && (
                                        <motion.span
                                            initial={prefersReducedMotion ? false : { opacity: 0, width: 0 }}
                                            animate={{ opacity: 1, width: 'auto' }}
                                            exit={{ opacity: 0, width: 0 }}
                                            transition={SPRING_SNAPPY}
                                            className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden"
                                        >
                                            <span className="max-w-[90px] truncate font-bold">{getDisplayName()}</span>
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    haptics.selection();
                                                    setIsProfileChipExpanded(false);
                                                    if (!user) setIsAuthModalOpen(true);
                                                    else navigate('/settings');
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setIsProfileChipExpanded(false);
                                                        if (!user) setIsAuthModalOpen(true);
                                                        else navigate('/settings');
                                                    }
                                                }}
                                                className="px-2 py-0.5 rounded-full bg-white/22 text-[11px] font-bold hover:bg-white/30"
                                            >
                                                {user ? 'پروفایل' : 'ورود'}
                                            </span>
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.button>

                            <NavLink
                                to="/settings"
                                onClick={() => {
                                    haptics.selection();
                                    setIsProfileChipExpanded(false);
                                }}
                                onPointerEnter={() => prefetchRoute('/settings')}
                                onTouchStart={() => prefetchRoute('/settings')}
                                onFocus={() => prefetchRoute('/settings')}
                                aria-label="تنظیمات"
                                title="تنظیمات"
                                className={({ isActive }) =>
                                    `h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shrink-0 ${
                                        isActive
                                            ? 'bg-primary-fixed text-on-primary-fixed shadow-xs px-3.5 gap-1.5'
                                            : 'w-11 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container/70 dark:hover:bg-white/10 hover:text-on-surface dark:hover:text-white'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <Settings size={18} strokeWidth={isActive ? 2.3 : 1.95} className="shrink-0" />
                                        {isActive && (
                                            <motion.span
                                                initial={prefersReducedMotion ? false : { opacity: 0, width: 0 }}
                                                animate={{ opacity: 1, width: 'auto' }}
                                                transition={SPRING_SNAPPY}
                                                className="text-xs font-extrabold whitespace-nowrap overflow-hidden"
                                            >
                                                تنظیمات
                                            </motion.span>
                                        )}
                                    </>
                                )}
                            </NavLink>

                            <SyncStatusChip isOnline={isOnline} cloudStatus={cloudStatus} variant="mobile" />
                        </motion.div>

                        {/* Top-Left Floating Capsule: The outer capsule itself morphs into Search or Notification panel */}
                        {!(isNotificationOpen || (isMobile && isCommandPaletteOpen)) ? (
                            <motion.div
                                layoutId={isMobile ? 'morph-top-left-capsule' : undefined}
                                transition={{ type: 'spring', stiffness: 250, damping: 27, mass: 0.95 }}
                                style={{ willChange: 'transform, border-radius' }}
                                className="pointer-events-auto flex items-center gap-1 p-1 rounded-full liquid-glass-nav glass-pill-shadow border border-[var(--glass-nav-border)]"
                            >
                                <motion.button
                                    type="button"
                                    onClick={handleTriggerSearch}
                                    whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                                    whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                                    transition={SPRING_SNAPPY}
                                    aria-label="جستجو و دستورات"
                                    title="جستجو و دستورات"
                                    className="w-11 h-11 rounded-full flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container/70 dark:hover:bg-white/10 hover:text-on-surface dark:hover:text-white"
                                >
                                    <Search size={18} className="shrink-0" />
                                </motion.button>

                                <NotificationBell morphMode isOpenExternal={isNotificationOpen} onOpenChange={setIsNotificationOpen} />
                            </motion.div>
                        ) : (
                            <>
                                <div className="w-[100px] h-[54px] pointer-events-none" aria-hidden="true" />
                                <NotificationBell morphMode isOpenExternal={isNotificationOpen} onOpenChange={setIsNotificationOpen} renderTrigger={false} />
                            </>
                        )}
                    </header>

                    {/* Page Content — Never hidden when mobile AI drawer opens so scroll position is preserved */}
                    <div
                        id="main-content"
                        tabIndex={-1}
                        onScroll={(e) => {
                            if (!isMobile) return;
                            const st = e.currentTarget.scrollTop;
                            if (st > lastScrollTopRef.current + 18 && st > 40) {
                                setIsBottomNavCompact(true);
                            } else if (st < lastScrollTopRef.current - 20 || st < 20) {
                                expandBottomNav();
                            }
                            lastScrollTopRef.current = st;
                        }}
                        className="flex-1 overflow-y-auto relative custom-scrollbar overflow-x-hidden outline-none bg-[var(--surface-canvas)] scroll-pt-24 scroll-pb-28 md:scroll-pt-20 md:scroll-pb-6"
                    >
                        <div className="top-nav-spacer" />
                        <RubberBandScrollContainer
                            scrollContainerId="main-content"
                            className="min-h-[calc(100%-4.25rem)] md:min-h-[calc(100%-4rem)] max-app-container w-full"
                        >
                            <motion.div
                                key={location.pathname}
                                initial={prefersReducedMotion ? false : { opacity: 0.85 }}
                                animate={{ opacity: 1 }}
                                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.12, ease: 'easeOut' }}
                            >
                                <ErrorBoundary>
                                    <Suspense fallback={<RouteSkeleton pathname={location.pathname} />}>
                                        <Outlet />
                                    </Suspense>
                                </ErrorBoundary>
                                <div className="bottom-nav-spacer md:h-0" />
                            </motion.div>
                        </RubberBandScrollContainer>
                    </div>

                    {/* Progressive Top & Bottom Scroll Fade Veils (underneath z-40 floating bars) */}
                    <div aria-hidden="true" className="scroll-edge-fade-top" />
                    <div aria-hidden="true" className="scroll-edge-fade-bottom" />

                    {/* Bottom Nav — Smooth Auto-Compacting Liquid Glass Capsule + Inviting AI Button */}
                    <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] inset-x-3 z-40 max-w-[430px] mx-auto flex items-center justify-between gap-2.5 pointer-events-none md:hidden">
                        <nav
                            onClick={expandBottomNav}
                            aria-label="منوی موبایل"
                            className={`pointer-events-auto rounded-full liquid-glass-nav glass-pill-shadow border border-[var(--glass-nav-border)] p-1.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                isBottomNavCompact ? 'w-auto' : 'flex-1 min-w-0'
                            }`}
                        >
                            <LayoutGroup id="mobile-bottom-nav">
                                <div className="flex justify-between items-center gap-1">
                                    {[
                                        { to: '/', end: true, icon: Home, label: 'داشبورد' },
                                        { to: '/planner', end: false, icon: CalendarClock, label: 'تایم‌لاین' },
                                        { to: '/analysis', end: false, icon: BarChart2, label: 'تحلیل' },
                                        { to: '/leaderboard', end: false, icon: Trophy, label: 'لیگ' },
                                    ].map((tab) => {
                                        const Icon = tab.icon;
                                        return (
                                            <NavLink
                                                key={tab.to}
                                                to={tab.to}
                                                end={tab.end}
                                                onClick={() => {
                                                    haptics.selection();
                                                    expandBottomNav();
                                                }}
                                                onPointerEnter={() => prefetchRoute(tab.to)}
                                                onTouchStart={() => prefetchRoute(tab.to)}
                                                onFocus={() => prefetchRoute(tab.to)}
                                                className={({ isActive }) =>
                                                    `relative flex items-center justify-center rounded-full transition-all duration-200 active:scale-[0.95] ${
                                                        isBottomNavCompact
                                                            ? isActive
                                                                ? 'min-h-[46px] h-[48px] px-3.5 text-on-primary-fixed font-extrabold'
                                                                : 'w-9 h-[46px] px-0 text-on-surface/70 dark:text-slate-300'
                                                            : isActive
                                                                ? 'flex-[1.45] flex-col min-h-[48px] h-[52px] px-2 text-on-primary-fixed font-extrabold'
                                                                : 'flex-[0.85] flex-col min-h-[48px] h-[50px] px-1 text-on-surface/75 dark:text-slate-300 hover:text-on-surface dark:hover:text-white font-medium'
                                                    }`
                                                }
                                            >
                                                {({ isActive }) => (
                                                    <>
                                                        {isActive && (
                                                            <motion.span
                                                                layoutId="mobileBottomNavActivePill"
                                                                transition={prefersReducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                                                                aria-hidden="true"
                                                                className="absolute inset-0 rounded-full bg-primary-fixed/85 dark:bg-[#2a2f6c]/90 shadow-xs ring-1 ring-primary/20 dark:ring-primary/40"
                                                            />
                                                        )}
                                                        <span
                                                            className={`relative z-10 flex items-center justify-center max-w-full ${
                                                                isBottomNavCompact && isActive
                                                                    ? 'flex-row gap-1.5'
                                                                    : 'flex-col gap-0.5'
                                                            }`}
                                                        >
                                                            <Icon
                                                                size={isActive ? 20 : 16}
                                                                strokeWidth={isActive ? 2.4 : 1.85}
                                                                aria-hidden="true"
                                                                className="shrink-0 transition-transform duration-200"
                                                            />
                                                            <span
                                                                className={
                                                                    isBottomNavCompact && !isActive
                                                                        ? 'sr-only'
                                                                        : `leading-tight truncate max-w-full ${
                                                                              isActive
                                                                                  ? 'text-[12px] font-extrabold'
                                                                                  : 'text-[10.5px] opacity-80'
                                                                          }`
                                                                }
                                                            >
                                                                {tab.label}
                                                            </span>
                                                        </span>
                                                    </>
                                                )}
                                            </NavLink>
                                        );
                                    })}
                                </div>
                            </LayoutGroup>
                        </nav>

                        {/* Separate Circular AI Assistant Button — Distinct inviting accent tint */}
                        <motion.button
                            layout
                            type="button"
                            onClick={handleToggleAiPanel}
                            onPointerEnter={() => prefetchRoute('/ai-chat')}
                            onTouchStart={() => prefetchRoute('/ai-chat')}
                            animate={prefersReducedMotion ? undefined : { scale: isAiPanelOpen ? 1.06 : 1 }}
                            whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                            whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                            transition={SPRING_SNAPPY}
                            aria-label={isAiPanelOpen ? 'بستن دستیار هوشمند' : 'دستیار هوشمند'}
                            title="دستیار هوشمند"
                            className={`pointer-events-auto relative w-[62px] h-[62px] rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                                isAiPanelOpen
                                    ? 'bg-primary text-on-primary border-primary/60 shadow-[0_12px_30px_-6px_rgba(70,72,212,0.6)]'
                                    : 'bg-gradient-to-br from-indigo-500 via-primary to-violet-600 text-white border-white/40 dark:border-indigo-300/35 shadow-[0_12px_28px_-6px_rgba(79,70,229,0.52)] dark:shadow-[0_12px_30px_-6px_rgba(129,140,248,0.45)]'
                            }`}
                        >
                            <Sparkles size={23} aria-hidden="true" />
                            {!isAiPanelOpen && settings?.hasUnreadAiMessage && (
                                <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                            )}
                        </motion.button>
                    </div>
                </main>

                {/* ====================================================
                    AI PANEL (Docked side panel on desktop, full sheet on mobile)
                   ==================================================== */}
                <AnimatePresence>
                    {isAiPanelOpen && (
                        <>
                            {/* Resizer */}
                            <div
                                className="hidden md:flex w-1.5 bg-transparent hover:bg-primary/20 cursor-col-resize z-40 transition-colors items-center justify-center group"
                                onMouseDown={startResizing}
                            >
                                <div className="h-10 w-0.5 bg-[var(--border-strong)] group-hover:bg-primary rounded-full" />
                            </div>

                            <motion.aside
                                ref={sidebarRef}
                                aria-label="دستیار هوشمند"
                                initial={
                                    prefersReducedMotion
                                        ? false
                                        : { opacity: 0, x: isMobile ? 0 : 40, y: isMobile ? 28 : 0, scale: isMobile ? 0.94 : 1 }
                                }
                                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                                exit={
                                    prefersReducedMotion
                                        ? { opacity: 0 }
                                        : { opacity: 0, x: isMobile ? 0 : 40, y: isMobile ? 28 : 0, scale: isMobile ? 0.95 : 1 }
                                }
                                transition={prefersReducedMotion ? { duration: 0 } : SPRING_SHEET}
                                drag={isMobile && !prefersReducedMotion ? 'y' : false}
                                dragControls={aiDragControls}
                                dragListener={false}
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0, bottom: 0.45 }}
                                onDragEnd={(_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
                                    if (isMobile && (info.offset.y > 90 || info.velocity.y > 480)) {
                                        haptics.selection();
                                        setIsAiPanelOpen(false);
                                    }
                                }}
                                className={
                                    isMobile
                                        ? 'fixed inset-0 z-[55] flex flex-col bg-[var(--surface-elevated)] pt-safe pb-safe'
                                        : 'flex-shrink-0 h-full bg-[var(--surface-elevated)] border-r border-[var(--border-subtle)] z-30 flex flex-col'
                                }
                                style={{
                                    transformOrigin: isMobile ? 'bottom left' : 'center left',
                                    ...(isMobile ? {} : { width: `${aiPanelWidth}px` }),
                                }}
                            >
                                <div
                                    onPointerDown={(e) => {
                                        if (isMobile && !prefersReducedMotion) {
                                            aiDragControls.start(e);
                                        }
                                    }}
                                    className="md:hidden flex flex-col border-b border-[var(--border-subtle)] shrink-0 touch-none cursor-grab active:cursor-grabbing"
                                >
                                    <div className="flex justify-center pt-2 pb-0.5" aria-hidden="true">
                                        <span className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
                                    </div>
                                    <div className="flex items-center justify-between px-4 h-12">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={17} className="text-primary" aria-hidden="true" />
                                            <h3 className="font-extrabold text-sm text-[var(--text-primary)]">دستیار هوشمند</h3>
                                        </div>
                                        <button
                                            type="button"
                                            onPointerDownCapture={(e) => e.stopPropagation()}
                                            onClick={() => setIsAiPanelOpen(false)}
                                            aria-label="بستن دستیار هوشمند"
                                            className="w-11 h-11 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-xl transition cursor-pointer"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                                <Suspense fallback={<AIChatSkeleton />}>
                                    <AIChat isWidget={true} onClose={() => setIsAiPanelOpen(false)} />
                                </Suspense>
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Layout;
