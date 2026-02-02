
import React, { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, CalendarClock, BookOpen, Settings, CheckCircle2, BarChart2, Timer, Trophy, Cloud, RotateCw, Command, Save } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { TOTAL_DAYS } from '../constants';
import FocusTimer from './FocusTimer';
import CommandPalette from './CommandPalette';
import { ToastContainer, ConfirmModal } from './Feedback';
import PrintableSchedule from './PrintableSchedule';

const Layout = () => {
    const { currentDay, darkMode, setIsTimerOpen, level, xp, syncData, isSyncing, setIsCommandPaletteOpen } = useStore();
    const daysLeft = Math.max(0, TOTAL_DAYS - currentDay);

    // Keyboard Shortcut for Command Palette
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsCommandPaletteOpen(true);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [setIsCommandPaletteOpen]);

    const navItems = [
        { to: '/', icon: Home, label: 'داشبورد' },
        { to: '/routine', icon: CalendarClock, label: 'روتین' },
        { to: '/subjects', icon: BookOpen, label: 'دروس' },
        { to: '/analysis', icon: BarChart2, label: 'تحلیل' },
        { to: '/settings', icon: Settings, label: 'تنظیمات' },
    ];

    return (
        <div className={`${darkMode ? 'dark' : ''}`}>
            {/* Print View (Visible only on print) */}
            <PrintableSchedule />

            {/* Screen View (Hidden on print) */}
            <div className="flex h-screen overflow-hidden no-print">
                {/* Overlays */}
                <FocusTimer />
                <CommandPalette />
                <ToastContainer />
                <ConfirmModal />

                <div className="flex w-full h-full bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
                    {/* Desktop Sidebar */}
                    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full transition-all duration-300">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                 <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                                    <CheckCircle2 size={24} />
                                </div>
                                <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">ParsaPlan</h1>
                            </div>
                        </div>
                        
                        <div className="px-6 pt-4 space-y-3">
                            {/* Level Card */}
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

                             {/* Actions */}
                             <div className="flex gap-2">
                                 <button 
                                    onClick={() => setIsCommandPaletteOpen(true)}
                                    className="flex-1 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg p-2 text-gray-500 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-500 transition flex items-center justify-center gap-2"
                                    title="Cmd+K"
                                >
                                    <Command size={14} />
                                    فرمان
                                </button>
                                 <button 
                                    onClick={syncData}
                                    className={`flex-1 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg p-2 text-indigo-500 dark:text-indigo-400 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-500 transition flex items-center justify-center gap-2 ${isSyncing ? 'animate-pulse' : ''}`}
                                >
                                    {isSyncing ? <RotateCw size={14} className="animate-spin" /> : <Save size={14} />}
                                    {isSyncing ? '...' : 'ذخیره'}
                                </button>
                             </div>
                        </div>

                        <nav className="flex-1 p-4 space-y-2">
                            {navItems.map((item) => (
                                <NavLink 
                                    key={item.to} 
                                    to={item.to}
                                    className={({ isActive }) => `flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm translate-x-1' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'}`}
                                >
                                    <item.icon size={20} strokeWidth={2} />
                                    <span className="font-medium">{item.label}</span>
                                </NavLink>
                            ))}
                        </nav>

                        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white text-center shadow-lg transform transition-transform hover:scale-[1.02]">
                                <p className="font-bold text-sm mb-1">روز {currentDay} از {TOTAL_DAYS}</p>
                                <p className="text-xs opacity-90">{daysLeft > 0 ? `${daysLeft} روز مانده` : 'روز آخر!'}</p>
                                <div className="w-full bg-white/20 h-1.5 rounded-full mt-3 overflow-hidden">
                                     <div className="bg-white h-full rounded-full" style={{ width: `${(currentDay / TOTAL_DAYS) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#f3f4f6] dark:bg-[#111827]">
                        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 md:pb-5 scroll-smooth">
                            <div className="max-w-5xl mx-auto w-full h-full">
                                <Outlet />
                            </div>
                        </div>

                        {/* Timer Floating Button (Mobile) */}
                        <button 
                            onClick={() => setIsTimerOpen(true)}
                            className="md:hidden absolute bottom-20 left-4 z-30 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-600/30 flex items-center justify-center active:scale-90 transition-transform"
                        >
                            <Timer size={24} />
                        </button>
                        
                        {/* Command Palette Trigger (Mobile) */}
                         <button 
                            onClick={() => setIsCommandPaletteOpen(true)}
                            className="md:hidden absolute bottom-36 left-4 z-30 w-10 h-10 bg-gray-800 text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
                        >
                            <Command size={18} />
                        </button>

                        {/* Mobile Bottom Nav */}
                        <nav className="md:hidden absolute bottom-0 w-full bg-white/90 dark:bg-gray-800/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 px-2 py-2 flex justify-around items-center z-20 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            {navItems.map((item) => (
                                <NavLink 
                                    key={item.to} 
                                    to={item.to}
                                    className={({ isActive }) => `flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${isActive ? 'text-indigo-600 dark:text-indigo-400 -translate-y-1' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <div className={`p-1 rounded-full ${isActive ? 'bg-indigo-50 dark:bg-gray-700' : 'bg-transparent'}`}>
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
