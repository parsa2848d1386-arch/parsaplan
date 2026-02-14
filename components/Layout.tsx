import React, { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, CalendarClock, BookOpen, Settings, BarChart2, Trophy, Cloud, CloudOff, AlertTriangle, PanelLeftClose, PanelLeft, RotateCw, Sparkles, Bell, Search, User, ChevronLeft } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import FocusTimer from './FocusTimer';
import { ToastContainer, ConfirmModal } from './Feedback';
import { AuthModal } from './AuthModal';
import PrintableSchedule from './PrintableSchedule';

const PAGE_TITLES: Record<string, { title: string; breadcrumb: string }> = {
    '/': { title: 'داشبورد', breadcrumb: 'خانه' },
    '/routine': { title: 'روتین روزانه', breadcrumb: 'روتین' },
    '/subjects': { title: 'مدیریت دروس', breadcrumb: 'دروس' },
    '/analysis': { title: 'تحلیل عملکرد', breadcrumb: 'تحلیل' },
    '/leaderboard': { title: 'جدول رتبه‌بندی', breadcrumb: 'لیگ' },
    '/settings': { title: 'تنظیمات', breadcrumb: 'تنظیمات' },
    '/history': { title: 'تاریخچه', breadcrumb: 'تاریخچه' },
    '/ai-chat': { title: 'دستیار هوشمند', breadcrumb: 'دستیار AI' },
};

const Layout = () => {
    const location = useLocation();
    const isAIChat = location.pathname === '/ai-chat';

    const {
        currentDay, darkMode, setIsTimerOpen, level, xp,
        syncData, isSyncing, cloudStatus, saveStatus,
        totalDays, sidebarCollapsed, setSidebarCollapsed,
        user, login, register, currentLevelXp, xpForNextLevel, progressPercent,
        userName
    } = useStore();

    const daysLeft = Math.max(0, totalDays - currentDay);
    const currentPage = PAGE_TITLES[location.pathname] || PAGE_TITLES['/'];

    const mainNavItems = [
        { to: '/', icon: Home, label: 'داشبورد' },
        { to: '/routine', icon: CalendarClock, label: 'روتین' },
        { to: '/subjects', icon: BookOpen, label: 'دروس' },
        { to: '/analysis', icon: BarChart2, label: 'تحلیل' },
        { to: '/leaderboard', icon: Trophy, label: 'لیگ' },
    ];

    const secondaryNavItems = [
        { to: '/ai-chat', icon: Sparkles, label: 'دستیار AI' },
        { to: '/settings', icon: Settings, label: 'تنظیمات' },
    ];

    // Determine cloud icon color based on status
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

    return (
        <div className={`${darkMode ? 'dark' : ''}`}>
            {/* Print View (Visible only on print) */}
            <PrintableSchedule />

            {/* Screen View (Hidden on print) */}
            <div className="flex h-[100dvh] overflow-hidden no-print">
                {/* Overlays */}
                <AuthModal
                    isOpen={!user}
                    onClose={() => { }} // Cannot close unique auth modal
                    onLogin={login}
                    onRegister={register}
                    isLoading={false}
                />
                <FocusTimer />
                <ToastContainer />
                <ConfirmModal />

                <div className="flex w-full h-full bg-slate-50 dark:bg-gray-950 transition-colors duration-300">
                    {/* ===== SIDEBAR (DESKTOP) ===== */}
                    <aside className={`hidden md:flex flex-col bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 h-full transition-all duration-300 ${sidebarCollapsed ? 'w-[76px]' : 'w-64'}`}>

                        {/* Logo */}
                        <div className={`p-4 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} h-16`}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center p-1.5 shadow-lg shadow-indigo-200/50 dark:shadow-none flex-shrink-0">
                                    <svg viewBox="0 0 512 512" className="w-full h-full text-white fill-none stroke-current" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
                                        <g transform="translate(256, 256) scale(0.85) translate(-256, -256)">
                                            <path d="M140 280 L210 350 C230 310 230 220 230 220 C230 140 380 140 380 230 C380 320 250 320 250 440" strokeWidth="45" />
                                            <g transform="translate(305, 230)">
                                                <line x1="0" y1="0" x2="0" y2="-35" strokeWidth="12" />
                                                <line x1="0" y1="0" x2="25" y2="25" strokeWidth="12" />
                                            </g>
                                        </g>
                                    </svg>
                                </div>
                                {!sidebarCollapsed && <h1 className="text-lg font-extrabold text-gray-800 dark:text-white tracking-tight">ParsaPlan</h1>}
                            </div>
                        </div>

                        {/* Level + Cloud in compact row */}
                        <div className={`px-3 pb-3 space-y-2 ${sidebarCollapsed ? 'px-2' : ''}`}>
                            {/* Level Card */}
                            {!sidebarCollapsed ? (
                                <div className="bg-gradient-to-l from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 p-3 rounded-xl relative overflow-hidden">
                                    <div
                                        className="absolute bottom-0 right-0 h-1 bg-gradient-to-l from-indigo-400 to-purple-400 transition-all duration-1000 ease-out rounded-full"
                                        style={{ width: `${progressPercent}%` }}
                                    ></div>
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-sm">
                                                <Trophy size={15} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">سطح {level}</p>
                                                <p className="text-xs font-black text-gray-800 dark:text-white mt-0.5">
                                                    {Math.floor(currentLevelXp)} <span className="text-[10px] font-normal text-gray-400">/ {xpForNextLevel} XP</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-center relative group">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white relative overflow-hidden shadow-sm" title={`Level ${level} - ${Math.floor(currentLevelXp)}/${xpForNextLevel} XP`}>
                                        <div
                                            className="absolute bottom-0 left-0 right-0 bg-white/20 transition-all duration-1000"
                                            style={{ height: `${progressPercent}%` }}
                                        ></div>
                                        <Trophy size={17} className="relative z-10" />
                                    </div>
                                    <div className="absolute left-full top-2 mr-2 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                                        سطح {level} — {Math.floor(currentLevelXp)} / {xpForNextLevel} XP
                                    </div>
                                </div>
                            )}

                            {/* Cloud Status */}
                            <button
                                onClick={syncData}
                                disabled={isSyncing}
                                className={`w-full p-2 rounded-xl flex items-center gap-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${sidebarCollapsed ? 'justify-center' : 'justify-between'} bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800`}
                                title={isSyncing ? 'در حال ذخیره...' : cloudStatus === 'connected' ? 'ذخیره شده' : 'کلیک برای ذخیره'}
                            >
                                <div className="flex items-center gap-2">
                                    {isSyncing ? (
                                        <RotateCw size={16} className="animate-spin text-yellow-500" />
                                    ) : (
                                        <CloudIcon size={16} className={getCloudIconColor()} />
                                    )}
                                    {!sidebarCollapsed && (
                                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                            {isSyncing ? 'ذخیره...' : cloudStatus === 'connected' ? 'ذخیره شده' : 'آفلاین'}
                                        </span>
                                    )}
                                </div>
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="mx-3 border-t border-gray-100 dark:border-gray-800"></div>

                        {/* Main Navigation */}
                        <nav className={`flex-1 py-3 space-y-0.5 overflow-y-auto ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
                            {!sidebarCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 px-3 mb-2 tracking-wider">منو اصلی</p>}
                            {mainNavItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) => `sidebar-nav-item flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 relative ${sidebarCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                    title={sidebarCollapsed ? item.label : undefined}
                                >
                                    {({ isActive }) => (
                                        <>
                                            {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-full"></div>}
                                            <item.icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
                                            {!sidebarCollapsed && <span className="text-[13px]">{item.label}</span>}
                                        </>
                                    )}
                                </NavLink>
                            ))}

                            {/* Separator */}
                            <div className={`my-3 ${sidebarCollapsed ? 'mx-1' : 'mx-2'} border-t border-gray-100 dark:border-gray-800`}></div>
                            {!sidebarCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 px-3 mb-2 tracking-wider">ابزارها</p>}

                            {secondaryNavItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) => `sidebar-nav-item flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 relative ${sidebarCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                    title={sidebarCollapsed ? item.label : undefined}
                                >
                                    {({ isActive }) => (
                                        <>
                                            {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-full"></div>}
                                            <item.icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
                                            {!sidebarCollapsed && <span className="text-[13px]">{item.label}</span>}
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </nav>

                        {/* Day Progress Card */}
                        {!sidebarCollapsed && (
                            <div className="px-3 pb-2">
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-3.5 text-white shadow-lg shadow-indigo-200/40 dark:shadow-none">
                                    <p className="font-bold text-sm mb-0.5">روز {currentDay} از {totalDays}</p>
                                    <p className="text-[11px] opacity-80">{daysLeft > 0 ? `${daysLeft} روز مانده` : 'روز آخر!'}</p>
                                    <div className="w-full bg-white/20 h-1.5 rounded-full mt-2.5 overflow-hidden">
                                        <div className="bg-white h-full rounded-full transition-all duration-700" style={{ width: `${(currentDay / totalDays) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Collapse + User */}
                        <div className="border-t border-gray-100 dark:border-gray-800">
                            {/* User Profile Section */}
                            <div className={`p-3 flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-300 flex-shrink-0">
                                    <User size={17} />
                                </div>
                                {!sidebarCollapsed && (
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{userName || 'کاربر'}</p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500">سطح {level}</p>
                                    </div>
                                )}
                                <button
                                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                    className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
                                    title={sidebarCollapsed ? 'باز کردن' : 'جمع کردن'}
                                >
                                    {sidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* ===== MAIN CONTENT ===== */}
                    <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                        {/* Top Header Bar (Desktop) */}
                        {!isAIChat && (
                            <header className="hidden md:flex items-center justify-between h-14 px-6 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg flex-shrink-0 z-20">
                                {/* Breadcrumb */}
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-400 dark:text-gray-500">ParsaPlan</span>
                                    <ChevronLeft size={14} className="text-gray-300 dark:text-gray-600" />
                                    <span className="text-gray-700 dark:text-gray-200 font-bold">{currentPage.breadcrumb}</span>
                                </div>

                                {/* Header Actions */}
                                <div className="flex items-center gap-2">
                                    <button className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center justify-center" title="جستجو">
                                        <Search size={17} />
                                    </button>
                                    <button className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center justify-center relative" title="اعلان‌ها">
                                        <Bell size={17} />
                                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                                    </button>
                                </div>
                            </header>
                        )}

                        {/* Background Decorative Elements */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/30 dark:bg-indigo-900/10 rounded-full blur-[120px]"></div>
                            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-100/30 dark:bg-purple-900/10 rounded-full blur-[120px]"></div>
                        </div>

                        <div className={`flex-1 ${isAIChat ? 'overflow-hidden pb-0' : 'overflow-y-auto no-scrollbar pb-24 md:pb-5'} scroll-smooth relative z-10 h-full`}>
                            <div className={`mx-auto w-full ${isAIChat ? 'h-full max-w-full' : 'max-w-5xl min-h-full'}`}>
                                <Outlet />
                            </div>
                        </div>

                        {/* Mobile Bottom Nav */}
                        {!isAIChat && (
                            <nav className="md:hidden fixed bottom-5 left-6 right-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-2 flex justify-between items-center pb-safe shadow-2xl dark:shadow-[0_0_20px_rgba(0,0,0,0.5)] rounded-full z-50 mx-auto max-w-sm transition-all duration-300 h-14">
                                {mainNavItems.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) => `flex items-center justify-center rounded-full transition-all duration-500 ease-out h-10 my-auto ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-5 flex-[2]' : 'bg-transparent text-gray-400 dark:text-gray-500 flex-1 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        {({ isActive }) => (
                                            <div className="flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap h-full">
                                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                                                <span className={`text-[11px] font-bold transition-all duration-500 ${isActive ? 'max-w-[100px] opacity-100 translate-x-0 ml-1' : 'max-w-0 opacity-0 -translate-x-2 hidden'}`}>
                                                    {item.label}
                                                </span>
                                            </div>
                                        )}
                                    </NavLink>
                                ))}
                            </nav>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Layout;
