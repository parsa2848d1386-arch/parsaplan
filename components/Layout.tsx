
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    Home, CalendarClock, BookOpen, Settings, BarChart2, Trophy,
    Menu, Bell, Search, X, LogOut, Moon, Sun, Monitor,
    Cloud, CloudOff, AlertTriangle, MessageSquare, Sparkles, ChevronLeft, ChevronRight, GripVertical
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import AIChatPanel from './AIChatPanel';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';
import PrintableSchedule from './PrintableSchedule';
import { getShamsiDate } from '../utils';

/* ===== ثابت‌ها ===== */
const PAGE_TITLES: Record<string, { title: string; breadcrumb: string }> = {
    '/': { title: 'داشبورد', breadcrumb: 'داشبورد' },
    '/routine': { title: 'برنامه روزانه', breadcrumb: 'روتین' },
    '/subjects': { title: 'مدیریت دروس', breadcrumb: 'دروس' },
    '/analysis': { title: 'تحلیل عملکرد', breadcrumb: 'تحلیل' },
    '/leaderboard': { title: 'لیدر بورد', breadcrumb: 'لیگ' },
    '/settings': { title: 'تنظیمات', breadcrumb: 'تنظیمات' },
    '/history': { title: 'تاریخچه', breadcrumb: 'تاریخچه' },
    '/ai-chat': { title: 'دستیار هوشمند', breadcrumb: 'دستیار AI' },
};

const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    // اگر در روت اصلی ai-chat هستیم، این true می‌شود. اما طبق درخواست کاربر می‌خواهیم یکپارچه باشد.
    // شاید منظور کاربر این است که حتی در صفحه ai-chat هم همان پنل بماند، یا اینکه کلاً ai-chat page حذف شود و فقط پنل باشد.
    // اما فعلا فرض ما این است که پنل کناری (Sidebar) در همه صفحات بجز login/etc باز می‌شود.
    const isAIChatPage = location.pathname === '/ai-chat';

    const {
        currentDay, darkMode, setIsTimerOpen, level, xp,
        syncData, isSyncing, cloudStatus, saveStatus,
        totalDays, sidebarCollapsed, setSidebarCollapsed,
        user, login, register, currentLevelXp, xpForNextLevel, progressPercent,
        userName, showToast
    } = useStore();

    /* ===== state موبایل: نمایش sidebar ===== */
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [showSearchOverlay, setShowSearchOverlay] = useState(false);

    /* ===== AI Panel State ===== */
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);
    const [aiPanelWidth, setAiPanelWidth] = useState(350); // عرض پیش‌فرض
    const sidebarRef = useRef<HTMLDivElement>(null);
    const isResizingRef = useRef(false);

    const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
        mouseDownEvent.preventDefault();
        isResizingRef.current = true;
    }, []);

    const stopResizing = useCallback(() => {
        isResizingRef.current = false;
    }, []);

    const resize = useCallback((mouseMoveEvent: MouseEvent) => {
        if (isResizingRef.current) {
            // محاسبه عرض جدید (از سمت چپ صفحه تا محل موس، ولی ما سمت راست هستیم پس: window.innerWidth - mouseX)
            // اما چون در RTL هستیم ممکن است برعکس باشد؟ 
            // در حالت LTR، پنل سمت راست است. در RTL پنل سمت چپ است؟ 
            // در کد قبلی: flex-row بود. ستون ۱ (nav)، ستون ۲ (main)، ستون ۳ (AI Panel).
            // پس AI Panel سمت راست (یا چپ بسته به جهت) است. 
            // در HTML direction: rtl نیست مگر در body تنظیم شده باشد. 
            // اگر جهت LTR باشد، پنل سمت راست است. 
            // بیایید فرض کنیم پنل سمت راست است (flex-row items order).
            // عرض جدید = window.innerWidth - mouseMoveEvent.clientX
            // بیایید لاگین کنیم که بفهمیم.
            const newWidth = window.innerWidth - mouseMoveEvent.clientX;
            if (newWidth > 250 && newWidth < 600) {
                setAiPanelWidth(newWidth);
            }
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
        // { to: '/ai-chat', icon: Sparkles, label: 'دستیار AI' }, // حذف لینک جداگانه اگر پنل یکپارچه است
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

    const toggleAiPanel = () => {
        setIsAiPanelOpen(!isAiPanelOpen);
    };

    return (
        <div className={`${darkMode ? 'dark' : ''}`}>
            {/* نمای چاپ */}
            <PrintableSchedule />

            {/* نمای صفحه */}
            <div className="flex h-[100dvh] overflow-hidden no-print bg-gray-50 dark:bg-gray-950 text-right" dir="rtl">
                {/* مدال‌ها و Overlay‌ها */}
                <AuthModal
                    isOpen={!user}
                    onClose={() => { }}
                    onLogin={login}
                    onRegister={register}
                    isLoading={false}
                />

                {/* ============================================================
                    ستون ۱: ناوبری کناری (Sidebar) - دسکتاپ
                   ============================================================ */}
                <aside
                    className={`hidden md:flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 transition-all duration-300 z-30 flex-shrink-0 relative ${sidebarCollapsed ? 'w-20' : 'w-64'}`}
                >
                    {/* لوگو و نام برنامه */}
                    <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                        <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none flex-shrink-0">
                            <span className="text-white font-black text-sm">P</span>
                        </div>
                        {!sidebarCollapsed && (
                            <span className="mr-3 font-black text-xl text-gray-800 dark:text-white tracking-tight">ParsaPlan</span>
                        )}
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="mr-auto p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition md:hidden lg:block"
                        >
                            {sidebarCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                        </button>
                    </div>

                    {/* لیست منو */}
                    <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
                        {mainNavItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 font-medium'
                                    }`}
                            >
                                <item.icon size={20} className="flex-shrink-0" />
                                {!sidebarCollapsed && <span>{item.label}</span>}
                                {sidebarCollapsed && (
                                    <div className="absolute right-16 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-50 whitespace-nowrap">
                                        {item.label}
                                    </div>
                                )}
                            </NavLink>
                        ))}

                        <div className="my-4 border-t border-gray-100 dark:border-gray-800"></div>

                        {secondaryNavItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 font-medium'
                                    }`}
                            >
                                <item.icon size={20} className="flex-shrink-0" />
                                {!sidebarCollapsed && <span>{item.label}</span>}
                            </NavLink>
                        ))}
                    </nav>

                    {/* فوتر سایدبار (کاربر و سینک) */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                        {!sidebarCollapsed ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                                        <CloudIcon size={14} className={getCloudIconColor()} />
                                        <span>وضعیت ابری</span>
                                    </div>
                                    <span className={`w-2 h-2 rounded-full ${cloudStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm">
                                        {userName ? userName.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{userName || 'کاربر مهمان'}</p>
                                        <p className="text-[10px] text-gray-400 truncate">سطح {level}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <CloudIcon size={18} className={getCloudIconColor()} />
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xs">
                                    {userName ? userName.charAt(0).toUpperCase() : 'U'}
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                {/* سایه موبایل برای بستن سایدبار */}
                {showMobileSidebar && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                        onClick={() => setShowMobileSidebar(false)}
                    ></div>
                )}

                {/* سایدبار موبایل */}
                <div className={`fixed inset-y-0 right-0 w-64 bg-white dark:bg-gray-900 z-50 transform transition-transform duration-300 md:hidden shadow-2xl ${showMobileSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-gray-800">
                        <span className="font-black text-xl text-gray-800 dark:text-white">ParsaPlan</span>
                        <button onClick={() => setShowMobileSidebar(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                            <X size={20} />
                        </button>
                    </div>
                    <nav className="p-4 space-y-1">
                        {[...mainNavItems, ...secondaryNavItems].map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setShowMobileSidebar(false)}
                                className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </div>

                {/* ============================================================
                    ستون ۲: محتوای اصلی (Main Content)
                   ============================================================ */}
                <main className="flex-1 flex flex-col min-w-0 relative h-full transition-all">
                    {/* هدر بالا — دسکتاپ */}
                    <header className="hidden md:flex items-center justify-between h-16 px-6 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex-shrink-0 z-20">
                        {/* سمت راست: عنوان صفحه یا مسیر */}
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-black text-gray-800 dark:text-white">{currentPage.title}</h2>
                            {isSyncing && (
                                <span className="text-xs text-yellow-500 flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full">
                                    <Cloud size={12} /> در حال همگام‌سازی...
                                </span>
                            )}
                        </div>

                        {/* وسط: نام کاربر و دکمه AI Panel */}
                        <div className="flex items-center gap-3">
                            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold">
                                <span>{getShamsiDate(new Date().toISOString())}</span>
                            </div>

                            <button
                                onClick={toggleAiPanel}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${isAiPanelOpen
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                                    : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <Sparkles size={14} />
                                <span className="hidden lg:inline">{isAiPanelOpen ? 'بستن دستیار' : 'دستیار هوشمند'}</span>
                            </button>
                        </div>

                        {/* سمت چپ: دکمه‌های عملیات */}
                        <div className="flex items-center gap-2 justify-end">
                            <button
                                onClick={() => setShowSearchOverlay(!showSearchOverlay)}
                                className="w-9 h-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition flex items-center justify-center"
                                title="جستجو"
                            >
                                <Search size={18} />
                            </button>
                            <button
                                onClick={() => showToast('اعلان جدیدی وجود ندارد', 'info')}
                                className="w-9 h-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition flex items-center justify-center"
                                title="اعلان‌ها"
                            >
                                <Bell size={18} />
                            </button>
                        </div>
                    </header>

                    {/* هدر بالا — موبایل */}
                    <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg flex-shrink-0 z-20">
                        <button onClick={() => setShowMobileSidebar(true)} className="p-2 text-gray-500">
                            <Menu size={20} />
                        </button>
                        <span className="font-bold text-gray-800 dark:text-white">{currentPage.title}</span>
                        <div className="flex gap-1">
                            <button onClick={toggleAiPanel} className={`p-2 rounded-lg ${isAiPanelOpen ? 'text-indigo-500 bg-indigo-50' : 'text-gray-400'}`}>
                                <Sparkles size={18} />
                            </button>
                        </div>
                    </header>

                    {/* نوار جستجو */}
                    {showSearchOverlay && (
                        <div className="flex items-center h-12 px-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 z-20 gap-3 animate-in slide-in-from-top-2">
                            <Search size={16} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="جستجو..."
                                className="flex-1 bg-transparent text-sm outline-none text-gray-700 dark:text-gray-200"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Escape') setShowSearchOverlay(false); }}
                            />
                            <button onClick={() => setShowSearchOverlay(false)}><X size={16} className="text-gray-400" /></button>
                        </div>
                    )}

                    {/* محتوای صفحه */}
                    <div className="flex-1 overflow-y-auto relative scroll-smooth p-0">
                        {/* در موبایل اگر پنل AI باز باشد، روی کل صفحه بیاید یا زیر باشد؟ 
                             معمولاً در موبایل پنل AI تمام صفحه یا مودال است. 
                             در دسکتاپ کنار صفحه است. */}
                        <div className={`h-full ${isAiPanelOpen && window.innerWidth < 768 ? 'hidden' : 'block'}`}>
                            <Outlet />
                            {/* فضای خالی پایین برای موبایل نویگیشن */}
                            <div className="h-20 md:h-0"></div>
                        </div>
                    </div>

                    {/* ناوبری پایین — موبایل */}
                    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-2 flex justify-between items-center z-30 pb-safe">
                        {mainNavItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) => `flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-600'}`}
                            >
                                <item.icon size={20} strokeWidth={2} />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </main>

                {/* ============================================================
                    ستون ۳: پنل دستیار AI (Resizable)
                   ============================================================ */}
                {isAiPanelOpen && (
                    <>
                        {/* Resizer Handle (فقط دسکتاپ) */}
                        <div
                            className="hidden md:flex w-1 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-400 cursor-col-resize z-40 transition-colors items-center justify-center group"
                            onMouseDown={startResizing}
                        >
                            <div className="h-8 w-1 bg-gray-300 group-hover:bg-white rounded-full"></div>
                        </div>

                        {/* پنل */}
                        <aside
                            ref={sidebarRef}
                            className={`flex-shrink-0 h-full bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 z-30 flex flex-col transition-all duration-0
                                ${window.innerWidth < 768 ? 'w-full fixed inset-0 z-50' : ''}
                            `}
                            style={{ width: window.innerWidth < 768 ? '100%' : `${aiPanelWidth}px` }}
                        >
                            {/* دکمه بستن در موبایل */}
                            <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100">
                                <h3 className="font-bold">دستیار هوشمند</h3>
                                <button onClick={() => setIsAiPanelOpen(false)} className="p-2"><X size={20} /></button>
                            </div>

                            <AIChatPanel />
                        </aside>
                    </>
                )}
            </div>
        </div>
    );
};

export default Layout;
