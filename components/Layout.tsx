
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Home, CalendarClock, BookOpen, Settings, BarChart2, Trophy,
    Menu, Bell, Search, X, LogOut, Moon, Sun,
    Cloud, CloudOff, AlertTriangle, MessageSquare, Sparkles, ChevronLeft, ChevronRight,
    Zap, Star, TrendingUp
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
const AIChat = React.lazy(() => import('../pages/AIChat'));
import { useAuth } from '../context/AuthContext';
const AuthModal = React.lazy(() => import('./AuthModal').then(m => ({ default: m.AuthModal })));
const PrintableSchedule = React.lazy(() => import('./PrintableSchedule'));
import { getShamsiDate } from '../utils';

const PAGE_TITLES: Record<string, { title: string; breadcrumb: string }> = {
    '/': { title: 'داشبورد', breadcrumb: 'داشبورد' },
    '/routine': { title: 'برنامه روزانه', breadcrumb: 'روتین' },
    '/subjects': { title: 'مدیریت دروس', breadcrumb: 'دروس' },
    '/analysis': { title: 'تحلیل عملکرد', breadcrumb: 'تحلیل' },
    '/leaderboard': { title: 'لیدربورد', breadcrumb: 'لیگ' },
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
    const location = useLocation();
    const navigate = useNavigate();
    const isAIChatPage = location.pathname === '/ai-chat';

    const {
        currentDay, darkMode, setIsTimerOpen, level, xp,
        syncData, isSyncing, cloudStatus, saveStatus,
        totalDays, sidebarCollapsed, setSidebarCollapsed,
        user, login, register, currentLevelXp, xpForNextLevel, progressPercent,
        userName, showToast, isAiPanelOpen, setIsAiPanelOpen
    } = useStore();

    const [showSearchOverlay, setShowSearchOverlay] = useState(false);
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

    const mainNavItems = [
        { to: '/', icon: Home, label: 'داشبورد', color: 'text-indigo-500' },
        { to: '/routine', icon: CalendarClock, label: 'روتین', color: 'text-blue-500' },
        { to: '/subjects', icon: BookOpen, label: 'دروس', color: 'text-violet-500' },
        { to: '/analysis', icon: BarChart2, label: 'تحلیل', color: 'text-cyan-500' },
        { to: '/leaderboard', icon: Trophy, label: 'لیگ', color: 'text-amber-500' },
    ];
    const secondaryNavItems = [
        { to: '/settings', icon: Settings, label: 'تنظیمات', color: 'text-gray-400' },
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

    const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U';
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
                    bg-white dark:bg-gray-900
                    border-l border-gray-100/80 dark:border-gray-800/80
                    transition-all duration-300
                    ${sidebarCollapsed ? 'w-[72px]' : 'w-64'}
                `}>
                    {/* Logo */}
                    <div className="h-16 flex items-center px-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 flex-shrink-0">
                            <span className="text-white font-black text-sm">P</span>
                        </div>
                        {!sidebarCollapsed && (
                            <div className="flex-1 min-w-0">
                                <span className="font-black text-lg text-gray-800 dark:text-white tracking-tight">ParsaPlan</span>
                            </div>
                        )}
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition ml-auto"
                        >
                            {sidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        </button>
                    </div>

                    {/* Nav Items */}
                    <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 custom-scrollbar">
                        {mainNavItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                title={sidebarCollapsed ? item.label : undefined}
                                className={({ isActive }) =>
                                    `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group font-medium text-sm
                                    ${isActive
                                        ? 'bg-indigo-50 dark:bg-indigo-900/25 text-indigo-600 dark:text-indigo-400 font-bold'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/70 hover:text-gray-800 dark:hover:text-gray-200'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <span className="absolute right-0 top-1/4 bottom-1/4 w-0.5 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-l-full" />
                                        )}
                                        <item.icon
                                            size={19}
                                            className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-indigo-500' : item.color}`}
                                        />
                                        {!sidebarCollapsed && <span>{item.label}</span>}
                                    </>
                                )}
                            </NavLink>
                        ))}

                        <div className="my-3 mx-2 border-t border-gray-100 dark:border-gray-800" />

                        {secondaryNavItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                title={sidebarCollapsed ? item.label : undefined}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm
                                    ${isActive
                                        ? 'bg-indigo-50 dark:bg-indigo-900/25 text-indigo-600 dark:text-indigo-400 font-bold'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/70 hover:text-gray-800 dark:hover:text-gray-200'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon size={19} className={`flex-shrink-0 ${isActive ? 'text-indigo-500' : item.color}`} />
                                        {!sidebarCollapsed && <span>{item.label}</span>}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    {/* XP + User Footer */}
                    <div className={`flex-shrink-0 border-t border-gray-100 dark:border-gray-800 ${sidebarCollapsed ? 'p-2' : 'p-3'}`}>
                        {!sidebarCollapsed ? (
                            <div className="space-y-3">
                                {/* XP Bar */}
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-2.5">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <Zap size={13} className="text-indigo-500" />
                                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">سطح {level}</span>
                                        </div>
                                        <span className="text-[10px] text-indigo-400 font-bold">{currentLevelXp}/{xpForNextLevel} XP</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-l from-indigo-500 to-violet-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </div>

                                {/* User Info */}
                                <div className="flex items-center gap-2.5">
                                    <div className="relative flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-indigo-200 dark:shadow-none">
                                            {userInitial}
                                        </div>
                                        <span className={`absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${cloudStatus === 'connected' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-800 dark:text-white truncate">{userName || 'کاربر مهمان'}</p>
                                        <p className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                                            <Star size={9} className="text-amber-400 fill-amber-400" />
                                            {xp} امتیاز کل
                                        </p>
                                    </div>
                                    <CloudIcon size={15} className={`flex-shrink-0 ${getCloudIconColor()}`} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative">
                                    <XpRing percent={progressPercent} size={38} stroke={3} />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400">{level}</span>
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xs">
                                    {userInitial}
                                </div>
                                <CloudIcon size={14} className={getCloudIconColor()} />
                            </div>
                        )}
                    </div>
                </aside>

                {/* Mobile sidebar removed */}
                {/* ====================================================
                    MAIN CONTENT
                   ==================================================== */}
                <main className="flex-1 flex flex-col min-w-0 relative h-full">
                    {/* Desktop Header */}
                    <header className="hidden md:flex items-center justify-between h-16 px-6 border-b border-gray-100/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex-shrink-0 z-20">
                        <div className="flex items-center gap-3">
                            <h2 className="text-base font-black text-gray-800 dark:text-white">{currentPage.title}</h2>
                            {isSyncing && (
                                <span className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full animate-pulse">
                                    <Cloud size={11} /> در حال سینک...
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold">
                                <span>{getShamsiDate(new Date().toISOString())}</span>
                            </div>

                            {/* XP chip */}
                            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                                <Zap size={12} />
                                <span>{xp} XP</span>
                            </div>

                            <button
                                onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${isAiPanelOpen
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/30'
                                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                                    }`}
                            >
                                <Sparkles size={13} className={isAiPanelOpen ? 'text-white' : 'text-indigo-500'} />
                                <span className="hidden lg:inline">{isAiPanelOpen ? 'بستن دستیار' : 'دستیار AI'}</span>
                            </button>

                            <button
                                onClick={() => setShowSearchOverlay(!showSearchOverlay)}
                                className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition flex items-center justify-center"
                            >
                                <Search size={16} />
                            </button>
                            <button
                                onClick={() => showToast('اعلان جدیدی وجود ندارد', 'info')}
                                className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition flex items-center justify-center"
                            >
                                <Bell size={16} />
                            </button>
                        </div>
                    </header>

                    {/* Mobile Header */}
                    <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg flex-shrink-0 z-20 relative">
                        <div className="w-8 h-8"></div>
                        <span className="font-bold text-sm text-gray-800 dark:text-white absolute left-1/2 -translate-x-1/2">{currentPage.title}</span>
                        <button
                            onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                            className={`p-2 rounded-xl transition ${isAiPanelOpen ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                            <Sparkles size={18} />
                        </button>
                    </header>

                    {/* Search Overlay */}
                    {showSearchOverlay && (
                        <div className="flex items-center h-12 px-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 gap-3 animate-fade-in-down">
                            <Search size={15} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="جستجو در تسک‌ها..."
                                className="flex-1 bg-transparent text-sm outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Escape') setShowSearchOverlay(false); }}
                            />
                            <button onClick={() => setShowSearchOverlay(false)}><X size={15} className="text-gray-400" /></button>
                        </div>
                    )}

                    {/* Page Content */}
                    <div className="flex-1 overflow-y-auto relative custom-scrollbar overflow-x-hidden">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className={`min-h-full ${isAiPanelOpen && window.innerWidth < 768 ? 'hidden' : 'block'}`}
                        >
                            <Outlet />
                            <div className="h-20 md:h-0" />
                        </motion.div>
                    </div>

                    {/* Bottom Nav — Mobile Pill */}
                    <nav className="mobile-bottom-nav flex md:hidden">
                        {[...mainNavItems, ...secondaryNavItems].map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `nav-pill-item relative z-10 ${isActive ? 'active' : ''}`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <motion.div
                                                layoutId="mobileNavBubble"
                                                className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/40 rounded-[1.25rem] -z-10"
                                                initial={false}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 500,
                                                    damping: 35,
                                                    mass: 0.8
                                                }}
                                            />
                                        )}
                                        <item.icon
                                            size={17}
                                            strokeWidth={isActive ? 2.5 : 1.8}
                                            className="transition-transform duration-200"
                                            style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)' }}
                                        />
                                        <span className="leading-none">{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>
                </main>

                {/* ====================================================
                    AI PANEL (Right side on desktop)
                   ==================================================== */}
                {isAiPanelOpen && (
                    <>
                        {/* Resizer */}
                        <div
                            className="hidden md:flex w-1 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-400 cursor-col-resize z-40 transition-colors items-center justify-center group"
                            onMouseDown={startResizing}
                        >
                            <div className="h-8 w-0.5 bg-gray-300 group-hover:bg-white rounded-full" />
                        </div>

                        <aside
                            ref={sidebarRef}
                            className={`flex-shrink-0 h-full bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 z-30 flex flex-col
                                ${window.innerWidth < 768 ? 'w-full fixed inset-0 z-50 animate-slide-in-bottom' : 'transition-none'}
                            `}
                            style={{ width: window.innerWidth < 768 ? '100%' : `${aiPanelWidth}px` }}
                        >
                            <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={16} className="text-indigo-500" />
                                    <h3 className="font-bold text-sm text-gray-800 dark:text-white">دستیار هوشمند</h3>
                                </div>
                                <button onClick={() => setIsAiPanelOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
                                    <X size={18} />
                                </button>
                            </div>
                            <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400 text-sm">درحال بارگذاری...</div>}>
                                <AIChat isWidget={true} onClose={() => setIsAiPanelOpen(false)} />
                            </Suspense>
                        </aside>
                    </>
                )}
            </div>
        </div>
    );
};

export default Layout;
