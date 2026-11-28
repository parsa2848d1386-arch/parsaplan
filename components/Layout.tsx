
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup, useReducedMotion, useDragControls, PanInfo } from 'framer-motion';
import {
    Home, CalendarClock, BookOpen, Settings, BarChart2, Trophy,
    Search, X, LogIn, LogOut, Sparkles,
    ChevronLeft, ChevronRight, History as HistoryIcon
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
const AIChat = React.lazy(() => import('../pages/AIChat'));
import { useProactiveAI } from './AIChat/useProactiveAI';
const AuthModal = React.lazy(() => import('./AuthModal').then(m => ({ default: m.AuthModal })));
const PrintableSchedule = React.lazy(() => import('./PrintableSchedule'));
import { NotificationBell } from './NotificationBell';
import { DynamicIsland } from './DynamicIsland';
import { BrandLogo } from './BrandLogo';
import { DesktopTopHeader } from './layout/DesktopTopHeader';
import { BlobatarBot } from './ui/BlobatarBot';
import { useOptionalFocus } from '../context/FocusContext';
import { ErrorBoundary } from './ErrorBoundary';
import { RouteSkeleton, AIChatSkeleton } from './Skeleton';
import { ArcFlightOverlay, RubberBandScrollContainer } from './ui/MotionPrimitives';
import { formatToPersianDigits } from '../utils';
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
    '/analysis': { title: 'تحلیل و پیشرفت', breadcrumb: 'تحلیل' },
    '/leaderboard': { title: 'لیگ و اتاق مطالعه', shortTitle: 'لیگ و اتاق مطالعه', breadcrumb: 'لیگ' },
    '/settings': { title: 'تنظیمات', breadcrumb: 'تنظیمات' },
    '/history': { title: 'تاریخچه', breadcrumb: 'تاریخچه', isSubRoute: true },
    '/ai-chat': { title: 'دستیار هوشمند', breadcrumb: 'AI', isSubRoute: true },
};

const Layout = () => {
    const prefersReducedMotion = useReducedMotion();
    const aiDragControls = useDragControls();
    useProactiveAI();
    useBioperformance();

    const location = useLocation();
    const navigate = useNavigate();
    const isMobile = useMediaQuery('(max-width: 767px)');

    const {
        darkMode, level, xp, currentLevelXp, xpForNextLevel, streakStats,
        cloudStatus,
        sidebarCollapsed, setSidebarCollapsed,
        user, login, register, logout,
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
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsProfileChipExpanded(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
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
        { to: '/leaderboard', icon: Trophy, label: 'لیگ و اتاق مطالعه' },
        { to: '/analysis', icon: BarChart2, label: 'تحلیل و پیشرفت' },
        { to: '/subjects', icon: BookOpen, label: 'حوزه‌ها و دروس' },
        { to: '/history', icon: HistoryIcon, label: 'تاریخچه' },
        { to: '/settings', icon: Settings, label: 'تنظیمات و راهنما' },
    ];

    const getDisplayName = () => userName || user?.displayName || user?.email?.split('@')[0] || 'کاربر مهمان';
    const botSeed = userName || user?.displayName || user?.email?.split('@')[0] || 'Parsashz';
    const focusCtx = useOptionalFocus();
    const isFocusRunning = focusCtx?.status === 'running';

    const profileBotAvatar = (
        <BlobatarBot
            seed={botSeed}
            config={settings?.blobatar}
            level={level ?? 1}
            streak={streakCount}
            isFocusRunning={isFocusRunning}
            size="sm"
        />
    );

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
        <div data-color-scheme={darkMode ? 'dark' : 'light'} data-dynamic-island-host="true">
            <a
                href="#main-content"
                className="visually-hidden focus:fixed focus:top-3 focus:start-3 focus:z-[var(--z-toast)] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-primary focus:text-on-primary focus:font-bold focus:text-sm focus:shadow-lg"
            >
                پرش به محتوای اصلی
            </a>
            <ArcFlightOverlay />
            <Suspense fallback={null}>
                <PrintableSchedule />
            </Suspense>

            <div className="flex h-[100dvh] overflow-hidden no-print bg-[var(--surface-canvas)] text-[var(--text-primary)] text-start" dir="rtl">
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
                    SIDEBAR — CENTERED, COMPACT DESKTOP FLOATING LIQUID GLASS DOCK
                    (Overlays cleanly over middle sections when expanded; zero content shift)
                   ==================================================== */}
                <aside
                    className={`
                        hidden md:flex md:fixed md:inset-y-0 md:right-0 md:z-[45] flex-col items-start justify-center h-full
                        py-3 ps-3 pe-1 gap-2.5 select-none pointer-events-none transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                        ${sidebarCollapsed ? 'w-[66px]' : 'w-[212px]'}
                    `}
                >
                    {/* Main Vertical Liquid Glass Navigation Capsule — Invariant height & right-edge anchor so BrandLogo never moves */}
                    <div className="pointer-events-auto w-full flex flex-col liquid-glass-nav glass-pill-shadow border border-[var(--glass-nav-border)] rounded-[25px] p-1">
                        {/* Stationary ParsaPlan Expand/Collapse Toggle Row */}
                        <div className="flex items-center h-[42px] gap-2 shrink-0">
                            <motion.button
                                type="button"
                                data-testid="sidebar-brand-toggle"
                                onClick={() => {
                                    haptics.selection();
                                    setSidebarCollapsed(!sidebarCollapsed);
                                }}
                                whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                                whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                                title={sidebarCollapsed ? 'باز کردن منو' : 'جمع کردن منو'}
                                aria-label={sidebarCollapsed ? 'باز کردن منو' : 'جمع کردن منو'}
                                aria-expanded={!sidebarCollapsed}
                                className="w-[42px] h-[42px] rounded-full bg-primary flex items-center justify-center text-on-primary shadow-sm flex-shrink-0 cursor-pointer"
                            >
                                <BrandLogo size={20} />
                            </motion.button>
                            {!sidebarCollapsed && (
                                <div className="flex flex-col min-w-0 pe-2 leading-tight overflow-hidden">
                                    <span className="font-headline-md text-[14px] text-on-surface dark:text-white font-extrabold truncate">
                                        پارساپلان
                                    </span>
                                    <span className="text-[10.5px] text-[var(--text-secondary)] font-semibold tabular-nums truncate">
                                        هدف امروز · {dailyGoalLabel}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div
                            className="h-px bg-[var(--border-subtle)] shrink-0 my-1.5 mx-1.5"
                            aria-hidden="true"
                        />

                        {/* Vertical Navigation Links — Fixed icon column keeps every icon stationary during expand/collapse */}
                        <LayoutGroup id="desktop-sidebar-nav">
                            <nav
                                aria-label="منوی اصلی"
                                className="flex flex-col gap-0.5 overflow-visible"
                            >
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
                                            `group relative flex items-center w-full h-[38px] rounded-full transition-colors duration-150 active:scale-[0.97] text-[12.5px] ${
                                                isActive
                                                    ? 'text-on-primary-fixed font-extrabold'
                                                    : 'text-on-surface/75 dark:text-slate-300 hover:bg-white/45 dark:hover:bg-white/8 hover:text-on-surface dark:hover:text-white font-medium'
                                            }`
                                        }
                                    >
                                        {({ isActive }) => (
                                            <>
                                                {isActive && (
                                                    <motion.span
                                                        layoutId="desktopSidebarActivePill"
                                                        transition={
                                                            prefersReducedMotion
                                                                ? { duration: 0 }
                                                                : { type: 'spring', stiffness: 360, damping: 24, mass: 0.85 }
                                                        }
                                                        aria-hidden="true"
                                                        className="absolute inset-0 rounded-full bg-primary-fixed/85 dark:bg-[#2a2f6c]/90 shadow-xs ring-1 ring-primary/20 dark:ring-primary/40"
                                                    />
                                                )}
                                                <span className="relative z-10 w-[42px] h-[38px] flex items-center justify-center shrink-0">
                                                    <item.icon
                                                        size={isActive ? 18 : 17}
                                                        strokeWidth={isActive ? 2.3 : 1.85}
                                                        className="transition-transform duration-200 group-hover:scale-105"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                                {!sidebarCollapsed && (
                                                    <span className="relative z-10 truncate pe-3">{item.label}</span>
                                                )}
                                                {/* Desktop Collapsed Hover Glass Tooltip */}
                                                {sidebarCollapsed && (
                                                    <span
                                                        role="tooltip"
                                                        className="pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-all duration-150 absolute end-[calc(100%+0.65rem)] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full liquid-glass-nav glass-pill-shadow border border-[var(--glass-nav-border)] text-xs font-bold text-on-surface dark:text-white whitespace-nowrap z-50 shadow-lg"
                                                    >
                                                        {item.label}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </NavLink>
                                ))}
                            </nav>
                        </LayoutGroup>
                    </div>

                    {/* Separate Floating AI Assistant Orb / Pill — Fixed 50px height in both states to keep vertical center invariant */}
                    <motion.button
                        type="button"
                        onClick={handleToggleAiPanel}
                        onPointerEnter={() => prefetchRoute('/ai-chat')}
                        animate={prefersReducedMotion ? undefined : { scale: isAiPanelOpen ? 1.03 : 1 }}
                        whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
                        transition={SPRING_SNAPPY}
                        aria-label={isAiPanelOpen ? 'بستن دستیار هوشمند' : 'دستیار هوشمند'}
                        title={isAiPanelOpen ? 'بستن دستیار هوشمند' : 'دستیار هوشمند'}
                        className={`pointer-events-auto group relative shrink-0 h-[50px] rounded-full border flex items-center cursor-pointer transition-[width,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            sidebarCollapsed ? 'w-[50px] justify-center' : 'w-full pe-3'
                        } ${
                            isAiPanelOpen
                                ? 'bg-primary text-on-primary border-primary/60 shadow-[0_12px_30px_-6px_rgba(70,72,212,0.58)]'
                                : 'bg-gradient-to-br from-indigo-500 via-primary to-violet-600 text-white border-white/40 dark:border-indigo-300/35 shadow-[0_12px_28px_-6px_rgba(79,70,229,0.5)] dark:shadow-[0_12px_30px_-6px_rgba(129,140,248,0.42)]'
                        }`}
                    >
                        <span className="w-[50px] h-[50px] flex items-center justify-center shrink-0">
                            <Sparkles size={19} aria-hidden="true" />
                        </span>
                        {!sidebarCollapsed && (
                            <span className="flex-1 flex items-center justify-between gap-2 min-w-0 overflow-hidden">
                                <span className="text-[12.5px] font-extrabold whitespace-nowrap truncate">
                                    {isAiPanelOpen ? 'بستن دستیار' : 'دستیار هوشمند'}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/18 text-white/95 whitespace-nowrap shrink-0">
                                    {isAiPanelOpen ? 'فعال' : 'AI'}
                                </span>
                            </span>
                        )}
                        {!isAiPanelOpen && settings?.hasUnreadAiMessage && (
                            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                        )}
                        {sidebarCollapsed && (
                            <span
                                role="tooltip"
                                className="pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-all duration-150 absolute end-[calc(100%+0.65rem)] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full liquid-glass-nav glass-pill-shadow border border-[var(--glass-nav-border)] text-xs font-bold text-on-surface dark:text-white whitespace-nowrap z-50 shadow-lg"
                            >
                                {isAiPanelOpen ? 'بستن دستیار هوشمند' : 'دستیار هوشمند'}
                            </span>
                        )}
                    </motion.button>
                </aside>

                {/* ====================================================
                    MAIN CONTENT
                   ==================================================== */}
                <main className="flex-1 flex flex-col min-w-0 relative h-full">
                    <DesktopTopHeader
                        onOpenCommandPalette={handleTriggerSearch}
                        isCommandPaletteOpen={isCommandPaletteOpen}
                        isNotificationOpen={!isMobile && isNotificationOpen}
                        isProfileOpen={isProfileChipExpanded}
                        onToggleProfile={() => setIsProfileChipExpanded((prev) => !prev)}
                        isAuthenticated={Boolean(user)}
                        avatarSlot={profileBotAvatar}
                        dynamicIslandSlot={
                            !isMobile ? (
                                <DynamicIsland isOnline={isOnline} cloudStatus={cloudStatus} desktopMode />
                            ) : null
                        }
                        notificationSlot={
                            <NotificationBell
                                morphMode
                                isOpenExternal={!isMobile ? isNotificationOpen : false}
                                onOpenChange={setIsNotificationOpen}
                            />
                        }
                    />

                    {/* Mobile Top Floating Capsules — Right: Profile Bubble Trigger, Start-Offset: Dynamic Island (camera-safe), Left: Search + Notifications */}
                    <header className="md:hidden fixed top-[max(0.625rem,env(safe-area-inset-top,0px))] inset-x-3 z-40 pointer-events-none flex items-center justify-between gap-2">
                        {/* Top-Right Floating Capsule: Profile Button Only (Opens Unified Liquid Glass Bubble) */}
                        <motion.div
                            ref={profileCapsuleRef}
                            animate={
                                prefersReducedMotion
                                    ? undefined
                                    : {
                                          scale: isProfileChipExpanded ? 0.86 : 1,
                                          opacity: isProfileChipExpanded ? 0 : 1,
                                      }
                            }
                            transition={{ type: 'spring', stiffness: 400, damping: 18, mass: 0.75, restDelta: 0.01 }}
                            style={{ transformOrigin: 'top right', willChange: 'transform, opacity' }}
                            className="pointer-events-auto flex items-center gap-0.5 p-1 rounded-full liquid-glass-nav glass-pill-shadow border border-[var(--glass-nav-border)] shrink-0"
                        >
                            {currentPage.isSubRoute && (
                                <motion.button
                                    type="button"
                                    onClick={() => {
                                        haptics.selection();
                                        handleMobileBack();
                                    }}
                                    whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
                                    transition={SPRING_SNAPPY}
                                    aria-label="بازگشت"
                                    className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface dark:text-white hover:bg-surface-container/80 transition cursor-pointer shrink-0"
                                >
                                    <ChevronRight size={19} />
                                </motion.button>
                            )}

                            <motion.button
                                type="button"
                                data-arc-target="xp-badge"
                                onClick={() => {
                                    haptics.selection();
                                    setIsProfileChipExpanded((prev) => !prev);
                                }}
                                whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                                whileTap={prefersReducedMotion ? undefined : { scale: 0.88 }}
                                transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                                aria-expanded={isProfileChipExpanded}
                                aria-label={user ? `پروفایل ${getDisplayName()}` : 'پروفایل کاربر و ورود'}
                                title={user ? 'حساب کاربری' : 'ورود یا همگام‌سازی ابری'}
                                className="w-11 h-11 rounded-full bg-white/60 dark:bg-white/10 border border-[var(--glass-nav-border)] flex items-center justify-center shadow-xs cursor-pointer shrink-0"
                            >
                                {profileBotAvatar}
                            </motion.button>
                        </motion.div>

                        {/* Top-Right Profile Liquid Glass Bubble Portal — Morphed seamlessly out of Profile icon; Close X lands directly over the icon */}
                        {typeof document !== 'undefined' &&
                            createPortal(
                                <AnimatePresence>
                                    {isProfileChipExpanded && (
                                        <motion.div
                                            initial={prefersReducedMotion ? false : { opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.18 }}
                                            onClick={() => setIsProfileChipExpanded(false)}
                                            className="fixed inset-0 z-[60] bg-slate-950/30 dark:bg-black/45"
                                            dir="rtl"
                                        >
                                            <motion.div
                                                initial={
                                                    prefersReducedMotion
                                                        ? false
                                                        : { opacity: 0, scale: 0.14, y: 0, borderRadius: 48 }
                                                }
                                                animate={{ opacity: 1, scale: 1, y: 0, borderRadius: 24 }}
                                                exit={
                                                    prefersReducedMotion
                                                        ? { opacity: 0 }
                                                        : {
                                                              opacity: 0,
                                                              scale: 0.14,
                                                              y: 0,
                                                              borderRadius: 48,
                                                              transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] },
                                                          }
                                                }
                                                transition={{
                                                    type: 'spring',
                                                    stiffness: 350,
                                                    damping: 20,
                                                    mass: 0.82,
                                                    restDelta: 0.015,
                                                    restSpeed: 0.5,
                                                }}
                                                style={{ transformOrigin: 'calc(100% - 26px) 26px', willChange: 'transform, opacity' }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="fixed top-[max(0.625rem,env(safe-area-inset-top,0px))] md:top-3 right-3 w-[min(calc(100vw-1.5rem),296px)] rounded-[24px] liquid-glass-nav glass-pill-shadow border border-[var(--glass-nav-border)] shadow-2xl overflow-hidden pt-1 ps-1 pe-3 pb-3 space-y-2.5"
                                            >
                                                {/* Account Header — Close X sits first on top-right directly aligned over the closed Profile circle */}
                                                <div className="flex items-center gap-2.5">
                                                    <motion.button
                                                        type="button"
                                                        whileTap={prefersReducedMotion ? undefined : { scale: 0.88 }}
                                                        onClick={() => {
                                                            haptics.selection();
                                                            setIsProfileChipExpanded(false);
                                                        }}
                                                        aria-label="بستن منوی حساب"
                                                        className="w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-xs hover:brightness-110 transition cursor-pointer shrink-0"
                                                    >
                                                        <X size={17} />
                                                    </motion.button>
                                                    <BlobatarBot
                                                        seed={botSeed}
                                                        config={settings?.blobatar}
                                                        level={level ?? 1}
                                                        streak={streakCount}
                                                        isFocusRunning={isFocusRunning}
                                                        size="sm"
                                                    />
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className="text-sm font-extrabold text-on-surface dark:text-white truncate">
                                                            {getDisplayName()}
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-[var(--text-secondary)] truncate">
                                                            {user ? (user.email || 'حساب ابری متصل') : 'حالت مهمان (ذخیره محلی)'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Level & XP Progress Pill */}
                                                <div className="ms-2 rounded-2xl bg-white/60 dark:bg-white/8 border border-[var(--border-subtle)] p-2.5 space-y-1.5">
                                                    <div className="flex items-center justify-between text-xs font-bold">
                                                        <span className="text-primary dark:text-indigo-300 flex items-center gap-1">
                                                            <Sparkles size={13} aria-hidden="true" />
                                                            سطح {formatToPersianDigits(level ?? 1)}
                                                        </span>
                                                        <span className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                                                            {formatToPersianDigits(xp ?? 0)} XP
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-l from-primary to-violet-500 transition-all duration-300"
                                                            style={{
                                                                width: `${Math.min(
                                                                    100,
                                                                    Math.round(
                                                                        ((currentLevelXp ?? 0) / Math.max(1, xpForNextLevel ?? 100)) * 100
                                                                    )
                                                                )}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Bubble Actions: Settings + Login/Logout */}
                                                <div className="ms-2 flex flex-col gap-1.5">
                                                    <NavLink
                                                        to="/settings"
                                                        onClick={() => {
                                                            haptics.selection();
                                                            setIsProfileChipExpanded(false);
                                                        }}
                                                        onPointerEnter={() => prefetchRoute('/settings')}
                                                        className="w-full min-h-[40px] px-3 rounded-2xl bg-white/55 dark:bg-white/10 hover:bg-white/75 dark:hover:bg-white/15 text-on-surface dark:text-white text-xs font-bold flex items-center justify-between transition cursor-pointer"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <Settings size={15} className="text-primary" />
                                                            تنظیمات
                                                        </span>
                                                        <ChevronLeft size={14} className="opacity-60" />
                                                    </NavLink>

                                                    {user ? (
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                haptics.medium();
                                                                setIsProfileChipExpanded(false);
                                                                await logout?.();
                                                            }}
                                                            className="w-full min-h-[40px] px-3 rounded-2xl bg-rose-500/12 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                                                        >
                                                            <LogOut size={15} />
                                                            <span>خروج از حساب کاربری</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                haptics.selection();
                                                                setIsProfileChipExpanded(false);
                                                                setIsAuthModalOpen(true);
                                                            }}
                                                            className="w-full min-h-[40px] px-3 rounded-2xl bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer hover:brightness-110"
                                                        >
                                                            <LogIn size={15} />
                                                            <span>ورود / همگام‌سازی ابری</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>,
                                document.body
                            )}

                        {/* Top Dynamic Island Hub — Offset beside Profile pill so dead-center camera/punch-hole stays clear */}
                        <div className="flex-1 flex items-center justify-start ps-1 min-w-0">
                            {isMobile && <DynamicIsland isOnline={isOnline} cloudStatus={cloudStatus} />}
                        </div>

                        {/* Top-Left Floating Capsule: Slightly trimmer Search + Notifications for visual harmony */}
                        <motion.div
                            data-top-left-capsule="mobile"
                            animate={
                                prefersReducedMotion
                                    ? undefined
                                    : {
                                          scale: (isMobile && isNotificationOpen) || (isMobile && isCommandPaletteOpen) ? 0.86 : 1,
                                          opacity: (isMobile && isNotificationOpen) || (isMobile && isCommandPaletteOpen) ? 0 : 1,
                                      }
                            }
                            transition={{ type: 'spring', stiffness: 400, damping: 18, mass: 0.75, restDelta: 0.01 }}
                            style={{ transformOrigin: 'top left', willChange: 'transform, opacity' }}
                            className="pointer-events-auto flex items-center gap-0.5 p-1 rounded-full liquid-glass-nav glass-pill-shadow border border-[var(--glass-nav-border)] shrink-0"
                        >
                            <motion.button
                                type="button"
                                onClick={handleTriggerSearch}
                                whileHover={prefersReducedMotion ? undefined : { scale: 1.06 }}
                                whileTap={prefersReducedMotion ? undefined : { scale: 0.88 }}
                                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                                aria-label="جستجو و دستورات"
                                title="جستجو و دستورات"
                                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0 ${
                                    isSearchExpanded || isCommandPaletteOpen
                                        ? 'bg-primary text-on-primary shadow-sm'
                                        : 'text-on-surface-variant dark:text-slate-300 hover:bg-surface-container/70 dark:hover:bg-white/10 hover:text-on-surface dark:hover:text-white'
                                }`}
                            >
                                <Search size={17} className="shrink-0" />
                            </motion.button>

                            <NotificationBell
                                morphMode
                                isOpenExternal={isMobile ? isNotificationOpen : false}
                                onOpenChange={setIsNotificationOpen}
                            />
                        </motion.div>
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
                            className="min-h-[calc(100%-4.25rem)] md:min-h-[calc(100%-4rem)] w-full md:px-12"
                        >
                            <motion.div
                                key={location.pathname}
                                initial={prefersReducedMotion ? false : { opacity: 0.85 }}
                                animate={{ opacity: 1 }}
                                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.12, ease: 'easeOut' }}
                                className="max-app-container mx-auto w-full"
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

                    {/* Bottom Nav — Smooth GPU-Fluid Auto-Compacting Liquid Glass Capsule + Edge-Hugged AI Button (Tablet & Mobile) */}
                    <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] inset-x-3 z-40 flex items-center justify-between gap-2.5 pointer-events-none md:hidden">
                        <nav
                            onClick={expandBottomNav}
                            aria-label="منوی موبایل"
                            style={{ willChange: 'max-width' }}
                            className={`pointer-events-auto flex-1 min-w-0 rounded-full liquid-glass-nav glass-pill-shadow border border-[var(--glass-nav-border)] p-1 transition-[max-width] duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                isBottomNavCompact ? 'max-w-[184px]' : 'max-w-[calc(100%-4.5rem)] sm:max-w-[344px]'
                            }`}
                        >
                            <LayoutGroup id="mobile-bottom-nav">
                                <div className="flex justify-between items-center gap-0.5 min-w-0">
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
                                                    `relative min-w-0 flex flex-col items-center justify-center h-[50px] rounded-full transition-[flex,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.95] overflow-hidden ${
                                                        isActive
                                                            ? isBottomNavCompact
                                                                ? 'flex-[0.82] px-1 text-on-primary-fixed font-extrabold'
                                                                : 'flex-[1.05] px-1.5 text-on-primary-fixed font-extrabold'
                                                            : isBottomNavCompact
                                                              ? 'flex-[0.36] px-0 text-on-surface/70 dark:text-slate-300'
                                                              : 'flex-[0.88] px-0.5 text-on-surface/75 dark:text-slate-300 hover:text-on-surface dark:hover:text-white font-medium'
                                                    }`
                                                }
                                            >
                                                {({ isActive }) => (
                                                    <>
                                                        {isActive && (
                                                            <motion.span
                                                                layoutId="mobileBottomNavActivePill"
                                                                transition={
                                                                    prefersReducedMotion
                                                                        ? { duration: 0 }
                                                                        : { type: 'spring', stiffness: 360, damping: 24, mass: 0.85 }
                                                                }
                                                                aria-hidden="true"
                                                                className="absolute inset-y-[3px] inset-x-1 rounded-full bg-primary-fixed/85 dark:bg-[#2a2f6c]/90 shadow-xs ring-1 ring-primary/20 dark:ring-primary/40"
                                                            />
                                                        )}
                                                        <span className="relative z-10 flex flex-col items-center justify-center gap-0.5 max-w-full">
                                                            <Icon
                                                                size={isActive ? 19 : 17}
                                                                strokeWidth={isActive ? 2.3 : 1.85}
                                                                aria-hidden="true"
                                                                className="shrink-0 transition-transform duration-200"
                                                            />
                                                            <span
                                                                className={`leading-none truncate max-w-full transition-[opacity,max-height] duration-250 ease-out ${
                                                                    isBottomNavCompact && !isActive
                                                                        ? 'max-h-0 opacity-0 pointer-events-none'
                                                                        : isActive
                                                                          ? 'max-h-4 opacity-100 text-[11px] font-extrabold'
                                                                          : 'max-h-4 opacity-85 text-[11px]'
                                                                }`}
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
                            className={`pointer-events-auto relative w-[58px] h-[58px] rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                                isAiPanelOpen
                                    ? 'bg-primary text-on-primary border-primary/60 shadow-[0_12px_30px_-6px_rgba(70,72,212,0.6)]'
                                    : 'bg-gradient-to-br from-indigo-500 via-primary to-violet-600 text-white border-white/40 dark:border-indigo-300/35 shadow-[0_12px_28px_-6px_rgba(79,70,229,0.52)] dark:shadow-[0_12px_30px_-6px_rgba(129,140,248,0.45)]'
                            }`}
                        >
                            <Sparkles size={22} aria-hidden="true" />
                            {!isAiPanelOpen && settings?.hasUnreadAiMessage && (
                                <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
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
                                        : 'flex-shrink-0 my-3 me-3 h-[calc(100%-1.5rem)] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] squircle-lg shadow-xl overflow-hidden z-30 flex flex-col'
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
                                    className="md:hidden flex justify-center pt-2 pb-1 bg-[var(--surface-elevated)] shrink-0 touch-none cursor-grab active:cursor-grabbing"
                                >
                                    <span className="w-10 h-1 rounded-full bg-[var(--border-strong)]" aria-hidden="true" />
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
