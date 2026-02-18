import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    Home, CalendarClock, BookOpen, Settings, BarChart2, Trophy,
    Cloud, CloudOff, AlertTriangle, PanelLeftClose, PanelLeft,
    RotateCw, Sparkles, Bell, Search, User, ChevronLeft, X,
    Menu, MessageSquare, Plus
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import FocusTimer from './FocusTimer';
import { ToastContainer, ConfirmModal } from './Feedback';
import { AuthModal } from './AuthModal';
import PrintableSchedule from './PrintableSchedule';
import AIChatPanel from './AIChatPanel';

/* ===== تنظیمات عنوان و Breadcrumb هر صفحه ===== */
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

/* ===== داده‌های نمونه تب‌های کاربر (Profile Tabs) ===== */
const USER_TABS = [
    { id: 'amir', name: 'Amir Baghian', avatar: '🧑‍🎓', active: true },
    { id: 'leila', name: 'Leila Baghian', avatar: '👩‍🎓', badge: 2 },
    { id: 'nick', name: 'Nick Baghian', avatar: '👨‍🎓' },
];

const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const isAIChat = location.pathname === '/ai-chat';

    const {
        currentDay, darkMode, setIsTimerOpen, level, xp,
        syncData, isSyncing, cloudStatus, saveStatus,
        totalDays, sidebarCollapsed, setSidebarCollapsed,
        user, login, register, currentLevelXp, xpForNextLevel, progressPercent,
        userName, showToast
    } = useStore();

    /* ===== state موبایل: نمایش sidebar و پنل AI ===== */
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [showSearchOverlay, setShowSearchOverlay] = useState(false);
    const [activeTab, setActiveTab] = useState('amir');

    const daysLeft = Math.max(0, totalDays - currentDay);
    const currentPage = PAGE_TITLES[location.pathname] || PAGE_TITLES['/'];

    /* ===== آیتم‌های ناوبری اصلی ===== */
    const mainNavItems = [
        { to: '/', icon: Home, label: 'داشبورد' },
        { to: '/routine', icon: CalendarClock, label: 'روتین' },
        { to: '/subjects', icon: BookOpen, label: 'دروس' },
        { to: '/analysis', icon: BarChart2, label: 'تحلیل' },
        { to: '/leaderboard', icon: Trophy, label: 'لیگ' },
    ];

    /* ===== آیتم‌های ناوبری ثانویه ===== */
    const secondaryNavItems = [
        { to: '/ai-chat', icon: Sparkles, label: 'دستیار AI' },
        { to: '/settings', icon: Settings, label: 'تنظیمات' },
    ];

    /* ===== تعیین رنگ آیکون ابر (وضعیت ذخیره‌سازی) ===== */
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

    /* ===== بستن sidebar موبایل هنگام تغییر صفحه ===== */
    useEffect(() => {
        setShowMobileSidebar(false);
    }, [location.pathname]);

    return (
        <div className={`${darkMode ? 'dark' : ''}`}>
            {/* نمای چاپ */}
            <PrintableSchedule />

            {/* نمای صفحه */}
            <div className="flex h-[100dvh] overflow-hidden no-print">
                {/* مدال‌ها و Overlay‌ها */}
                <AuthModal
                    isOpen={!user}
                    onClose={() => { }}
                    onLogin={login}
                    onRegister={register}
                    isLoading={false}
                />
                <FocusTimer />
                <ToastContainer />
                <ConfirmModal />

                <div className="flex w-full h-full bg-slate-50 dark:bg-gray-950 transition-colors duration-300">

                    {/* ============================================================
                        ستون ۱: SIDEBAR (دسکتاپ — ثابت)
                    ============================================================ */}
                    <aside className={`hidden md:flex flex-col bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 h-full transition-all duration-300 flex-shrink-0 ${sidebarCollapsed ? 'w-[76px]' : 'w-64'}`}>

                        {/* لوگو */}
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

                        {/* کارت سطح + وضعیت ابر */}
                        <div className={`px-3 pb-3 space-y-2 ${sidebarCollapsed ? 'px-2' : ''}`}>
                            {/* کارت سطح (Level) */}
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

                            {/* دکمه وضعیت ابری (Cloud) */}
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

                        {/* خط جداکننده */}
                        <div className="mx-3 border-t border-gray-100 dark:border-gray-800"></div>

                        {/* ناوبری اصلی */}
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

                            {/* خط جداکننده */}
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

                        {/* کارت روز‌های باقیمانده */}
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

                        {/* پروفایل کاربر + دکمه جمع کردن */}
                        <div className="border-t border-gray-100 dark:border-gray-800">
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

                    {/* ============================================================
                        SIDEBAR موبایل (Overlay — فقط در صفحه‌های کوچک)
                    ============================================================ */}
                    {showMobileSidebar && (
                        <div className="md:hidden fixed inset-0 z-50 flex">
                            {/* پس‌زمینه تاریک */}
                            <div
                                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                                onClick={() => setShowMobileSidebar(false)}
                            />
                            {/* پنل sidebar */}
                            <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-gray-900 h-full shadow-2xl animate-slide-in-right flex flex-col">
                                {/* هدر با دکمه بستن */}
                                <div className="p-4 flex items-center justify-between h-16 border-b border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center p-1.5 shadow-lg shadow-indigo-200/50 dark:shadow-none">
                                            <svg viewBox="0 0 512 512" className="w-full h-full text-white fill-none stroke-current" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
                                                <g transform="translate(256, 256) scale(0.85) translate(-256, -256)">
                                                    <path d="M140 280 L210 350 C230 310 230 220 230 220 C230 140 380 140 380 230 C380 320 250 320 250 440" strokeWidth="45" />
                                                </g>
                                            </svg>
                                        </div>
                                        <h1 className="text-lg font-extrabold text-gray-800 dark:text-white">ParsaPlan</h1>
                                    </div>
                                    <button
                                        onClick={() => setShowMobileSidebar(false)}
                                        className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* ناوبری */}
                                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 px-3 mb-2 tracking-wider">منو اصلی</p>
                                    {mainNavItems.map((item) => (
                                        <NavLink
                                            key={item.to}
                                            to={item.to}
                                            className={({ isActive }) => `flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                        >
                                            {({ isActive }) => (
                                                <>
                                                    <item.icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
                                                    <span className="text-[13px]">{item.label}</span>
                                                </>
                                            )}
                                        </NavLink>
                                    ))}

                                    <div className="my-3 mx-2 border-t border-gray-100 dark:border-gray-800"></div>
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 px-3 mb-2 tracking-wider">ابزارها</p>

                                    {secondaryNavItems.map((item) => (
                                        <NavLink
                                            key={item.to}
                                            to={item.to}
                                            className={({ isActive }) => `flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                        >
                                            {({ isActive }) => (
                                                <>
                                                    <item.icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
                                                    <span className="text-[13px]">{item.label}</span>
                                                </>
                                            )}
                                        </NavLink>
                                    ))}
                                </nav>

                                {/* پروفایل */}
                                <div className="border-t border-gray-100 dark:border-gray-800 p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-300">
                                            <User size={17} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{userName || 'کاربر'}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500">سطح {level}</p>
                                        </div>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    )}

                    {/* ============================================================
                        ستون ۲: محتوای اصلی (MAIN CONTENT)
                    ============================================================ */}
                    <main className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">

                        {/* هدر بالا — دسکتاپ */}
                        {!isAIChat && (
                            <header className="hidden md:flex items-center h-14 px-6 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg flex-shrink-0 z-20">
                                {/* سمت راست: Breadcrumb */}
                                <div className="flex items-center gap-2 text-sm flex-1">
                                    <span className="text-gray-400 dark:text-gray-500">ParsaPlan</span>
                                    <ChevronLeft size={14} className="text-gray-300 dark:text-gray-600" />
                                    <span className="text-gray-700 dark:text-gray-200 font-bold">{currentPage.breadcrumb}</span>
                                </div>

                                {/* وسط: تب‌های کاربر (Profile Tabs) */}
                                <div className="flex items-center gap-1">
                                    {USER_TABS.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${activeTab === tab.id
                                                    ? 'bg-white dark:bg-gray-800 shadow-md border border-gray-200/80 dark:border-gray-700 text-gray-800 dark:text-white'
                                                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                                }`}
                                        >
                                            <span className="text-sm">{tab.avatar}</span>
                                            <span>{tab.name}</span>
                                            {tab.badge && (
                                                <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center font-bold">
                                                    {tab.badge}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                    <button className="w-7 h-7 rounded-full border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 flex items-center justify-center hover:border-gray-400 hover:text-gray-500 transition ml-1">
                                        <Plus size={13} />
                                    </button>
                                </div>

                                {/* سمت چپ: دکمه‌های عملیات */}
                                <div className="flex items-center gap-2 flex-1 justify-end">
                                    <button
                                        onClick={() => setShowSearchOverlay(!showSearchOverlay)}
                                        className={`w-9 h-9 rounded-xl transition flex items-center justify-center ${showSearchOverlay ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                        title="جستجو"
                                    >
                                        {showSearchOverlay ? <X size={17} /> : <Search size={17} />}
                                    </button>
                                    <button
                                        onClick={() => showToast('اعلان جدیدی وجود ندارد', 'info')}
                                        className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center justify-center relative"
                                        title="اعلان‌ها"
                                    >
                                        <Bell size={17} />
                                    </button>
                                </div>
                            </header>
                        )}

                        {/* هدر بالا — موبایل */}
                        {!isAIChat && (
                            <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg flex-shrink-0 z-20">
                                <button
                                    onClick={() => setShowMobileSidebar(true)}
                                    className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                >
                                    <Menu size={20} />
                                </button>
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center">
                                        <svg viewBox="0 0 512 512" className="w-4 h-4 text-white fill-none stroke-current" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round">
                                            <g transform="translate(256, 256) scale(0.85) translate(-256, -256)">
                                                <path d="M140 280 L210 350 C230 310 230 220 230 220 C230 140 380 140 380 230 C380 320 250 320 250 440" strokeWidth="45" />
                                            </g>
                                        </svg>
                                    </div>
                                    <span className="text-sm font-extrabold text-gray-800 dark:text-white">{currentPage.breadcrumb}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => showToast('اعلان جدیدی وجود ندارد', 'info')}
                                        className="p-2 rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                    >
                                        <Bell size={18} />
                                    </button>
                                </div>
                            </header>
                        )}

                        {/* نوار جستجو (دسکتاپ) */}
                        {showSearchOverlay && (
                            <div className="hidden md:flex items-center h-12 px-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 z-20 gap-3 animate-in slide-in-from-top-2 duration-200">
                                <Search size={16} className="text-gray-400 flex-shrink-0" />
                                <input
                                    type="text"
                                    placeholder="جستجو در صفحات، تسک‌ها..."
                                    className="flex-1 bg-transparent text-sm outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') setShowSearchOverlay(false);
                                    }}
                                />
                                <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">ESC</span>
                            </div>
                        )}

                        {/* المان‌های تزئینی پس‌زمینه */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/30 dark:bg-indigo-900/10 rounded-full blur-[120px]"></div>
                            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-100/30 dark:bg-purple-900/10 rounded-full blur-[120px]"></div>
                        </div>

                        {/* محتوای صفحه */}
                        <div className={`flex-1 ${isAIChat ? 'overflow-hidden pb-0' : 'overflow-y-auto no-scrollbar pb-24 md:pb-5'} scroll-smooth relative z-10 h-full`}>
                            <div className={`mx-auto w-full ${isAIChat ? 'h-full max-w-full' : 'max-w-5xl min-h-full'}`}>
                                <Outlet />
                            </div>
                        </div>

                        {/* ناوبری پایین — موبایل */}
                        {!isAIChat && (
                            <nav className="md:hidden fixed bottom-5 left-4 right-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-1.5 flex justify-between items-center pb-safe shadow-2xl dark:shadow-[0_0_20px_rgba(0,0,0,0.5)] rounded-full z-50 mx-auto max-w-md transition-all duration-300 h-14">
                                {[...mainNavItems, ...secondaryNavItems].map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) => `flex items-center justify-center rounded-full transition-all duration-500 ease-out h-10 my-auto ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-3 flex-[2]' : 'bg-transparent text-gray-400 dark:text-gray-500 flex-1 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        {({ isActive }) => (
                                            <div className="flex items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap h-full">
                                                <item.icon size={19} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                                                <span className={`text-[10px] font-bold transition-all duration-500 ${isActive ? 'max-w-[80px] opacity-100 translate-x-0' : 'max-w-0 opacity-0 -translate-x-2 hidden'}`}>
                                                    {item.label}
                                                </span>
                                            </div>
                                        )}
                                    </NavLink>
                                ))}
                            </nav>
                        )}
                    </main>

                    {/* ============================================================
                        ستون ۳: پنل دستیار AI (فقط دسکتاپ بزرگ — xl و بالاتر)
                    ============================================================ */}
                    {!isAIChat && (
                        <aside className="hidden xl:flex flex-col w-[320px] h-full flex-shrink-0 p-3 pl-0">
                            <AIChatPanel />
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Layout;
