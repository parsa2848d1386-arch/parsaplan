
import React, { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, CalendarClock, BookOpen, Settings, CheckCircle2, BarChart2, Timer, Trophy, Cloud, CloudOff, AlertTriangle, PanelLeftClose, PanelLeft, RotateCw } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import FocusTimer from './FocusTimer';
import { ToastContainer, ConfirmModal } from './Feedback';
import PrintableSchedule from './PrintableSchedule';

const Layout = () => {
    const {
        currentDay, darkMode, setIsTimerOpen, level, xp,
        syncData, isSyncing, cloudStatus, saveStatus,
        totalDays, sidebarCollapsed, setSidebarCollapsed
    } = useStore();

    const daysLeft = Math.max(0, totalDays - currentDay);

    const navItems = [
        { to: '/', icon: Home, label: 'داشبورد' },
        { to: '/routine', icon: CalendarClock, label: 'روتین' },
        { to: '/subjects', icon: BookOpen, label: 'دروس' },
        { to: '/analysis', icon: BarChart2, label: 'تحلیل' },
        { to: '/leaderboard', icon: Trophy, label: 'لیگ' },
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
            <div className="flex h-screen overflow-hidden no-print">
                {/* Overlays */}
                <FocusTimer />
                <ToastContainer />
                <ConfirmModal />

                <div className="flex w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 transition-colors duration-300">
                    {/* Desktop Sidebar */}
                    <aside className={`hidden md:flex flex-col glass dark:bg-gray-800/80 border-l border-gray-200/50 dark:border-gray-700/50 h-full transition-all duration-300 shadow-glass ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
                        <div className={`p-4 border-b border-gray-100 dark:border-gray-700 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                                    <CheckCircle2 size={24} />
                                </div>
                                {!sidebarCollapsed && <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">ParsaPlan</h1>}
                            </div>
                        </div>

                        <div className={`px-4 pt-4 space-y-3 ${sidebarCollapsed ? 'px-2' : ''}`}>
                            {/* Level Card */}
                            {!sidebarCollapsed && (
                                <div className="bg-amber-50 dark:bg-gray-700 p-3 rounded-xl border border-amber-100 dark:border-gray-600 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-500">
                                            <Trophy size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">سطح شما</p>
                                            <p className="text-sm font-black text-gray-800 dark:text-white">Level {level}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-400">{xp} XP</span>
                                </div>
                            )}

                            {sidebarCollapsed && (
                                <div className="flex justify-center">
                                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-500" title={`Level ${level} - ${xp} XP`}>
                                        <Trophy size={18} />
                                    </div>
                                </div>
                            )}

                            {/* Cloud Status Button */}
                            <button
                                onClick={syncData}
                                disabled={isSyncing}
                                className={`w-full p-2.5 rounded-xl border flex items-center gap-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-700 ${sidebarCollapsed ? 'justify-center' : 'justify-between'} bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600`}
                                title={isSyncing ? 'در حال ذخیره...' : cloudStatus === 'connected' ? 'ذخیره شده' : 'کلیک برای ذخیره'}
                            >
                                <div className="flex items-center gap-2">
                                    {isSyncing ? (
                                        <RotateCw size={18} className="animate-spin text-yellow-500" />
                                    ) : (
                                        <CloudIcon size={18} className={getCloudIconColor()} />
                                    )}
                                    {!sidebarCollapsed && (
                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                            {isSyncing ? 'ذخیره...' : cloudStatus === 'connected' ? 'ذخیره شده' : 'آفلاین'}
                                        </span>
                                    )}
                                </div>
                            </button>
                        </div>

                        <nav className={`flex-1 p-4 space-y-2 ${sidebarCollapsed ? 'p-2' : ''}`}>
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) => `flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${sidebarCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'}`}
                                    title={sidebarCollapsed ? item.label : undefined}
                                >
                                    <item.icon size={20} strokeWidth={2} />
                                    {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                                </NavLink>
                            ))}
                        </nav>

                        {/* Collapse Button */}
                        <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                className="w-full p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2"
                                title={sidebarCollapsed ? 'باز کردن' : 'جمع کردن'}
                            >
                                {sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
                                {!sidebarCollapsed && <span className="text-xs font-medium">جمع کردن</span>}
                            </button>
                        </div>

                        {!sidebarCollapsed && (
                            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white text-center shadow-lg transform transition-transform hover:scale-[1.02]">
                                    <p className="font-bold text-sm mb-1">روز {currentDay} از {totalDays}</p>
                                    <p className="text-xs opacity-90">{daysLeft > 0 ? `${daysLeft} روز مانده` : 'روز آخر!'}</p>
                                    <div className="w-full bg-white/20 h-1.5 rounded-full mt-3 overflow-hidden">
                                        <div className="bg-white h-full rounded-full" style={{ width: `${(currentDay / totalDays) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>

                    {/* Main Content Area */}
                    <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-900 dark:to-slate-950">
                        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 md:pb-5 scroll-smooth">
                            <div className="max-w-5xl mx-auto w-full h-full">
                                <Outlet />
                            </div>
                        </div>

                        {/* Timer Floating Button (Mobile) */}
                        <button
                            onClick={() => setIsTimerOpen(true)}
                            className="md:hidden absolute bottom-20 left-4 z-30 w-14 h-14 btn-premium text-white rounded-full shadow-premium flex items-center justify-center active:scale-90 transition-transform animate-float"
                        >
                            <Timer size={24} />
                        </button>

                        {/* Mobile Bottom Nav - Improved glassmorphism */}
                        <nav className="md:hidden absolute bottom-0 w-full bg-white/70 dark:bg-gray-800/80 backdrop-blur-xl border-t border-gray-200/30 dark:border-gray-700/50 px-2 py-2 flex justify-around items-center z-20 pb-safe shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)] rounded-t-3xl">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) => `flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${isActive ? 'text-indigo-600 dark:text-indigo-400 -translate-y-1' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <div className={`p-1.5 rounded-full ${isActive ? 'bg-indigo-50 dark:bg-gray-700' : 'bg-transparent'}`}>
                                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                            </div>
                                            <span className="text-[10px] font-medium">{item.label}</span>
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </nav>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Layout;
