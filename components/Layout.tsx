
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home, CalendarClock, BookOpen, Settings, BarChart2, Trophy,
    Menu, Bell, Search, X, LogOut, Moon, Sun,
    Cloud, CloudOff, AlertTriangle, MessageSquare, Sparkles, ChevronLeft, ChevronRight,
    Zap, Star, TrendingUp, Flame, CheckCircle2
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
const AIChat = React.lazy(() => import('../pages/AIChat'));
import { useProactiveAI } from './AIChat/useProactiveAI';
import { useAuth } from '../context/AuthContext';
const AuthModal = React.lazy(() => import('./AuthModal').then(m => ({ default: m.AuthModal })));
const PrintableSchedule = React.lazy(() => import('./PrintableSchedule'));
import { NotificationBell } from './NotificationBell';
import { getShamsiDate, getFullShamsiDate } from '../utils';
import { useBioperformance } from '../hooks/useBioperformance';

const PAGE_TITLES: Record<string, { title: string; breadcrumb: string }> = {
    '/': { title: 'داشبورد', breadcrumb: 'داشبورد' },
    '/planner': { title: 'برنامه‌ریز بصری ۲۴ ساعته', breadcrumb: 'تایم‌لاین' },
    '/subjects': { title: 'حوزه‌ها و اهداف', breadcrumb: 'حوزه‌ها' },
    '/analysis': { title: 'تحلیل عملکرد', breadcrumb: 'تحلیل' },
    '/leaderboard': { title: 'لیگ و اتاق‌های مطالعه', breadcrumb: 'لیگ' },
    '/settings': { title: 'تنظیمات', breadcrumb: 'تنظیمات' },
    '/history': { title: 'تاریخچه', breadcrumb: 'تاریخچه' },
    '/ai-chat': { title: 'دستیار هوشمند', breadcrumb: 'AI' },
};

/* ===== XP Progress Ring ===== */
const XpRing = ({ percent, size = 36, stroke = 3 }: { percent: number; size?: number; stroke?: number }) => {
    const r = (size - stroke * 2) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (percent / 100) * circ;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="xp-ring -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-indigo-100 dark:text-indigo-900/50" />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="url(#xpGrad)" strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out"
            />
            <defs>
                <linearGradient id="xpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
            </defs>
        </svg>
    );
};

const Layout = () => {
    useProactiveAI();
    useBioperformance();

    const location = useLocation();
    const navigate = useNavigate();
    const isAIChatPage = location.pathname === '/ai-chat';

    const {
        currentDay, darkMode, setIsTimerOpen, level, xp, tasks, streakStats,
        syncData, isSyncing, cloudStatus, saveStatus, syncQueueCount,
        totalDays, sidebarCollapsed, setSidebarCollapsed,
        user, login, register, currentLevelXp, xpForNextLevel, progressPercent,
        userName, showToast, isAiPanelOpen, setIsAiPanelOpen, settings, updateSettings, userId,
        setIsCommandPaletteOpen
    } = useStore();

    const [currentTime, setCurrentTime] = useState(() => {
        const d = new Date();
        return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    });

    useEffect(() => {
        const timer = setInterval(() => {
            const d = new Date();
            setCurrentTime(d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }));
        }, 10000);
        return () => clearInterval(timer);
    }, []);

    const currentDateStr = useMemo(() => {
        return getFullShamsiDate(new Date().toISOString());
    }, []);

    const streakCount = streakStats?.currentStreak ?? 14;

    const [aiPanelWidth, setAiPanelWidth] = useState(360);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const isResizingRef = useRef(false);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizingRef.current = true;
    }, []);

    const stopResizing = useCallback(() => { isResizingRef.current = false; }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizingRef.current) {
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 280 && newWidth < 620) setAiPanelWidth(newWidth);
        }
    }, []);

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    const daysLeft = Math.max(0, totalDays - currentDay);
    const currentPage = PAGE_TITLES[location.pathname] || PAGE_TITLES['/'];

    useEffect(() => {
        document.title = `${currentPage.title} | ParsaPlan`;
    }, [currentPage.title]);

    const mainNavItems = [
        { to: '/', icon: Home, label: 'داشبورد جامع', iconName: 'grid_view' },
        { to: '/planner', icon: CalendarClock, label: 'تایم‌لاین ۲۴ ساعته', iconName: 'view_timeline' },
        { to: '/leaderboard', icon: Trophy, label: 'اتاق‌های مطالعه', iconName: 'groups' },
        { to: '/analysis', icon: BarChart2, label: 'تحلیل و لیگ رقابتی', iconName: 'leaderboard' },
        { to: '/subjects', icon: BookOpen, label: 'حوزه‌ها و دروس', iconName: 'menu_book' },
        { to: '/settings', icon: Settings, label: 'تنظیمات و راهنما', iconName: 'settings_suggest' },
    ];
    const secondaryNavItems = [
        { to: '/ai-chat', icon: Sparkles, label: 'دستیار AI', iconName: 'auto_awesome' },
    ];
    const mobileNavItems = [
        { to: '/', icon: Home, label: 'داشبورد', iconName: 'space_dashboard' },
        { to: '/planner', icon: CalendarClock, label: 'تایم‌لاین', iconName: 'schedule' },
        { to: '/analysis', icon: BarChart2, label: 'تحلیل', iconName: 'insights' },
        { to: '/leaderboard', icon: Trophy, label: 'لیگ', iconName: 'groups' },
        { to: '/settings', icon: Settings, label: 'تنظیمات', iconName: 'settings' },
    ];

    const getCloudIconColor = () => {
        if (isSyncing) return 'text-yellow-500 animate-pulse';
        if (cloudStatus === 'error' || saveStatus === 'error') return 'text-red-500';
        if (cloudStatus === 'connected' && saveStatus === 'saved') return 'text-emerald-500';
        if (saveStatus === 'saving') return 'text-yellow-500';
        return 'text-gray-400';
    };

    const getCloudIcon = () => {
        if (cloudStatus === 'error') return AlertTriangle;
        if (cloudStatus === 'disconnected') return CloudOff;
        return Cloud;
    };
    const CloudIcon = getCloudIcon();

    // Mobile sidebar removed

    const getDisplayName = () => userName || user?.displayName || user?.email?.split('@')[0] || 'کاربر مهمان';
    const userInitial = (userName || user?.displayName || user?.email || 'U').charAt(0).toUpperCase();
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <div className={`${darkMode ? 'dark' : ''}`}>
            <Suspense fallback={null}>
                <PrintableSchedule />
            </Suspense>

            <div className="flex h-[100dvh] overflow-hidden no-print bg-slate-50 dark:bg-gray-950 text-right" dir="rtl">
                <Suspense fallback={null}>
                    <AuthModal isOpen={!user} onClose={() => { }} onLogin={login} onRegister={register} isLoading={false} />
                </Suspense>

                {/* ====================================================
                    SIDEBAR — DESKTOP
                   ==================================================== */}
                <aside className={`
                    hidden md:flex flex-col h-full z-30 flex-shrink-0 relative
                    bg-surface-container-low dark:bg-slate-900
                    border-l border-outline-variant/20 dark:border-slate-800
                    shadow-[0_1px_8px_rgba(0,0,0,0.04)]
                    transition-all duration-300 py-space-md px-space-sm justify-between
                    ${sidebarCollapsed ? 'w-[76px]' : 'w-72'}
                `}>
                    <div className="flex flex-col gap-space-md">
                        {/* Logo & Brand Header */}
                        <div className="flex items-center justify-between px-space-xs">
                            <div className="flex items-center gap-space-sm">
                                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm flex-shrink-0">
                                    <Sparkles size={22} className="animate-pulse" />
                                </div>
                                {!sidebarCollapsed && (
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-headline-md text-base text-on-surface dark:text-white tracking-tight font-bold">پارساپلان</span>
                                        <span className="font-label-sm text-[11px] text-on-surface-variant dark:text-gray-400">مدیریت عمیق زیست و مطالعه</span>
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                aria-label={sidebarCollapsed ? 'باز کردن منو' : 'جمع کردن منو'}
                                className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container dark:hover:bg-slate-800 transition"
                            >
                                {sidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                            </button>
                        </div>

                        {/* Focus Goal Pill */}
                        {!sidebarCollapsed && (
                            <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-space-sm shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex items-center justify-between">
                                <div className="flex items-center gap-space-xs text-on-surface-variant dark:text-gray-300">
                                    <CalendarClock size={16} className="text-secondary" />
                                    <span className="font-label-sm text-xs">هدف فوکوس امروز</span>
                                </div>
                                <span className="font-label-sm text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold">
                                    ۵.۵ ساعت
                                </span>
                            </div>
                        )}

                        {/* Navigation Links */}
                        <nav aria-label="منوی اصلی" className="flex flex-col gap-1.5 custom-scrollbar">
                            {mainNavItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    title={sidebarCollapsed ? item.label : undefined}
                                    className={({ isActive }) =>
                                        `flex items-center gap-space-sm px-3.5 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium ${
                                            isActive
                                                ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                                                : 'text-on-surface-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-slate-800 hover:text-on-surface dark:hover:text-white'
                                        }`
                                    }
                                >
                                    <item.icon
                                        size={20}
                                        className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                                    />
                                    {!sidebarCollapsed && <span>{item.label}</span>}
                                </NavLink>
                            ))}
                        </nav>
                    </div>

                    {/* Streak & User Level Footer */}
                    <div className="flex flex-col gap-space-sm pt-space-sm border-t border-outline-variant/20 dark:border-slate-800">
                        {!sidebarCollapsed ? (
                            <>
                                <div className="bg-surface-container dark:bg-slate-800/80 rounded-xl p-space-sm flex items-center justify-between shadow-xs">
                                    <div className="flex items-center gap-space-sm">
                                        <div className="w-8 h-8 rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed flex items-center justify-center flex-shrink-0 shadow-inner">
                                            <Flame size={18} className="fill-current text-tertiary" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-label-sm text-xs text-on-surface dark:text-white font-bold">استریک {streakCount} روزه</span>
                                            <span className="font-body-sm text-[10px] text-on-surface-variant dark:text-gray-400">رکورد حفظ استمرار</span>
                                        </div>
                                    </div>
                                    <span className="font-label-sm text-xs text-tertiary font-extrabold bg-tertiary-fixed/30 px-1.5 py-0.5 rounded-full">+{level}</span>
                                </div>

                                <div className="flex items-center justify-between px-space-xs py-1 text-on-surface-variant dark:text-gray-400 text-xs">
                                    <span className="font-label-sm text-[11px]">نسخه ۲.۴ پلاس</span>
                                    <span className="flex items-center gap-1 text-[11px] text-secondary font-bold">
                                        <CheckCircle2 size={13} className="text-secondary" />
                                        پایدار
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed flex items-center justify-center shadow-inner" title={`استریک ${streakCount} روزه`}>
                                    <Flame size={16} className="text-tertiary" />
                                </div>
                                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
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
                    {/* Desktop Header */}
                    <header className="hidden md:flex items-center justify-between h-16 px-space-lg border-b border-outline-variant/30 dark:border-slate-800 bg-surface/85 dark:bg-slate-900/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex-shrink-0 z-20">
                        {/* Search & Clock */}
                        <div className="flex items-center gap-space-md">
                            <button
                                type="button"
                                onClick={() => setIsCommandPaletteOpen(true)}
                                className="relative flex items-center group cursor-pointer text-right"
                                title="جستجو و دستورات (Ctrl+K)"
                                aria-label="جستجو و دستورات (Ctrl+K)"
                            >
                                <Search size={18} className="absolute right-3 text-on-surface-variant group-hover:text-primary transition-colors" />
                                <div className="w-80 h-10 pr-10 pl-16 bg-surface-container-low dark:bg-slate-800 rounded-lg text-on-surface dark:text-gray-200 font-body-sm flex items-center text-xs text-on-surface-variant/70 border border-outline-variant/20 hover:border-primary/40 transition-all shadow-inner">
                                    جستجوی سریع هوشمند، دروس، تگ‌ها...
                                </div>
                                <kbd className="absolute left-2.5 px-space-xs py-0.5 rounded bg-surface-container-highest dark:bg-slate-700 text-on-surface-variant dark:text-gray-300 font-label-sm text-[11px] border border-outline-variant/40">
                                    Ctrl+K
                                </kbd>
                            </button>

                            <div className="hidden xl:flex items-center gap-space-xs bg-surface-container-low dark:bg-slate-800 px-space-md py-1.5 rounded-lg text-on-surface-variant dark:text-gray-300 border border-outline-variant/20 text-xs font-semibold">
                                <CalendarClock size={16} className="text-primary" />
                                <span className="font-bold text-on-surface dark:text-white">{currentTime}</span>
                                <span className="text-outline">|</span>
                                <span>{currentDateStr}</span>
                            </div>

                            {isSyncing && (
                                <span className="text-xs text-secondary flex items-center gap-1 bg-secondary-container/40 px-2.5 py-1 rounded-full font-bold animate-pulse">
                                    <Cloud size={12} /> سینک ابری...
                                </span>
                            )}
                        </div>

                        {/* Right Actions: Streak Chip, AI Assistant, Notifications, User Profile */}
                        <div className="flex items-center gap-space-sm">
                            {/* Fire Streak Ribbon */}
                            <div className="flex items-center gap-space-xs bg-tertiary-fixed/40 px-space-sm py-1 rounded-full text-tertiary font-bold text-xs border border-tertiary-fixed/60 shadow-xs">
                                <Flame size={16} className="text-tertiary fill-tertiary" />
                                <span>{streakCount} روز زنجیره</span>
                            </div>

                            {/* AI Assistant Button */}
                            <button
                                onClick={() => {
                                    setIsAiPanelOpen(!isAiPanelOpen);
                                    if (!isAiPanelOpen && settings?.hasUnreadAiMessage) {
                                        updateSettings({ hasUnreadAiMessage: false });
                                    }
                                }}
                                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 shadow-sm ${
                                    isAiPanelOpen
                                        ? 'bg-primary text-on-primary'
                                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                                }`}
                            >
                                <Sparkles size={15} />
                                <span className="hidden lg:inline">{isAiPanelOpen ? 'بستن دستیار' : 'دستیار هوشمند'}</span>
                            </button>

                            <NotificationBell />

                            <div className="h-6 w-[1px] bg-outline-variant/50 mx-1" />

                            {/* User Profile */}
                            <div className="flex items-center gap-space-sm">
                                <div className="flex flex-col text-left items-end">
                                    <span className="font-label-md text-xs font-bold text-on-surface dark:text-white truncate max-w-[120px]">{getDisplayName()}</span>
                                    <span className="font-label-sm text-[10px] text-secondary font-semibold">سطح {level} • لیگ کشوری</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-primary/20">
                                    {userInitial}
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Mobile Header */}
                    <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-outline-variant/30 bg-surface/90 dark:bg-slate-900/90 backdrop-blur-lg flex-shrink-0 z-20 relative">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
                                P
                            </div>
                            <span className="font-bold text-sm text-on-surface dark:text-white">{currentPage.title}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="flex items-center gap-1 bg-tertiary-fixed/40 px-2 py-0.5 rounded-full text-tertiary text-xs font-bold">
                                <Flame size={13} className="fill-tertiary" />
                                <span>{streakCount}</span>
                            </div>
                            <NotificationBell />
                            <button
                                type="button"
                                onClick={() => setIsCommandPaletteOpen(true)}
                                className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container"
                                title="جستجو و دستورات"
                                aria-label="جستجو و دستورات"
                            >
                                <Search size={17} />
                            </button>
                        </div>
                    </header>

                    {/* Page Content */}
                    <div id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto relative custom-scrollbar overflow-x-hidden outline-none bg-surface dark:bg-slate-950">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className={`min-h-full max-app-container w-full ${isAiPanelOpen && window.innerWidth < 768 ? 'hidden' : 'block'}`}
                        >
                            <Outlet />
                            <div className="h-24 md:h-0" />
                        </motion.div>
                    </div>

                    {/* Mobile Floating Action Button for AI Assistant */}
                    <div className="fixed bottom-20 left-4 z-40 md:hidden">
                        <button
                            type="button"
                            onClick={() => {
                                setIsAiPanelOpen(!isAiPanelOpen);
                            }}
                            className="flex items-center justify-center w-13 h-13 rounded-full bg-primary text-on-primary shadow-[0_6px_20px_rgba(70,72,212,0.35)] active:scale-90 transition-transform cursor-pointer"
                            aria-label="دستیار هوشمند"
                            title="دستیار هوشمند"
                        >
                            <Sparkles size={24} />
                        </button>
                    </div>

                    {/* Bottom Nav — Mobile (Strict 5 core tabs) */}
                    <nav aria-label="منوی موبایل" className="fixed bottom-0 w-full z-40 pb-safe bg-surface/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(11,28,48,0.04)] border-t border-outline-variant/20 md:hidden">
                        <div className="flex justify-around items-center h-16 px-1 max-w-md mx-auto">
                            <NavLink
                                to="/"
                                end
                                className={({ isActive }) =>
                                    `touch-target flex flex-col items-center justify-center gap-1 w-14 h-12 transition-all active:scale-90 ${
                                        isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
                                    }`
                                }
                            >
                                <Home size={20} />
                                <span className="font-label-sm text-[10px] sm:text-[11px]">داشبورد</span>
                            </NavLink>

                            <NavLink
                                to="/planner"
                                className={({ isActive }) =>
                                    `touch-target flex flex-col items-center justify-center gap-1 w-14 h-12 transition-all active:scale-90 ${
                                        isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
                                    }`
                                }
                            >
                                <CalendarClock size={20} />
                                <span className="font-label-sm text-[10px] sm:text-[11px]">تایم‌لاین</span>
                            </NavLink>

                            <NavLink
                                to="/analysis"
                                className={({ isActive }) =>
                                    `touch-target flex flex-col items-center justify-center gap-1 w-14 h-12 transition-all active:scale-90 ${
                                        isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
                                    }`
                                }
                            >
                                <BarChart2 size={20} />
                                <span className="font-label-sm text-[10px] sm:text-[11px]">تحلیل</span>
                            </NavLink>

                            <NavLink
                                to="/leaderboard"
                                className={({ isActive }) =>
                                    `touch-target flex flex-col items-center justify-center gap-1 w-14 h-12 transition-all active:scale-90 ${
                                        isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
                                    }`
                                }
                            >
                                <Trophy size={20} />
                                <span className="font-label-sm text-[10px] sm:text-[11px]">لیگ</span>
                            </NavLink>

                            <NavLink
                                to="/settings"
                                className={({ isActive }) =>
                                    `touch-target flex flex-col items-center justify-center gap-1 w-14 h-12 transition-all active:scale-90 ${
                                        isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
                                    }`
                                }
                            >
                                <Settings size={20} />
                                <span className="font-label-sm text-[10px] sm:text-[11px]">تنظیمات</span>
                            </NavLink>
                        </div>
                    </nav>
                </main>

                {/* ====================================================
                    AI PANEL (Right side on desktop)
                   ==================================================== */}
                <AnimatePresence>
                    {isAiPanelOpen && (
                        <>
                            {/* Resizer */}
                            <div
                                className="hidden md:flex w-1 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-400/50 cursor-col-resize z-40 transition-colors items-center justify-center group"
                                onMouseDown={startResizing}
                            >
                                <div className="h-8 w-0.5 bg-gray-300 dark:bg-gray-700 group-hover:bg-indigo-500 rounded-full" />
                            </div>

                            <motion.aside
                                ref={sidebarRef}
                                aria-label="دستیار هوشمند"
                                initial={{ opacity: 0, x: 50, scale: 0.99 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 50, scale: 0.99 }}
                                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                                className="flex-shrink-0 h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-100 dark:border-gray-800 z-30 flex flex-col glass-premium shadow-[-10px_0_30px_rgba(0,0,0,0.02)] dark:shadow-[-10px_0_40px_rgba(0,0,0,0.3)]"
                                style={{ width: window.innerWidth < 768 ? '100%' : `${aiPanelWidth}px`, position: window.innerWidth < 768 ? 'fixed' : 'relative', inset: window.innerWidth < 768 ? '0' : 'auto' }}
                            >
                                <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={16} className="text-indigo-500" />
                                        <h3 className="font-bold text-sm text-gray-800 dark:text-white">دستیار هوشمند</h3>
                                    </div>
                                    <button type="button" onClick={() => setIsAiPanelOpen(false)} aria-label="بستن دستیار هوشمند" className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
                                        <X size={18} />
                                    </button>
                                </div>
                                <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400 text-sm font-bold">درحال بارگذاری...</div>}>
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
