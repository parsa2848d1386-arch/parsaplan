import React, { useState, useEffect, useRef } from 'react';
import { Bell, RefreshCw, Info, DownloadCloud } from 'lucide-react';
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useUI } from '../context/UIContext';

export const NotificationBell: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { showToast } = useUI();

    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: any) {
            console.log('SW Registered');
        },
        onRegisterError(error: any) {
            console.log('SW registration error', error);
        },
    });

    const notifications = [];
    if (needRefresh) {
        notifications.push({
            id: 'pwa-update',
            type: 'system',
            title: 'نسخه جدید آماده نصب است!',
            message: 'برای اجرای نسخه جدید برنامه، باید حافظه پنهان پاک و آپدیت اعمال شود.',
            icon: DownloadCloud,
            color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/20'
        });
    }

    const unreadCount = notifications.length;

    // Handle Click Outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleUpdate = async () => {
        setIsOpen(false);
        showToast('در حال پاکسازی کش و نصب آپدیت...', 'info');

        // Ensure old caches are cleared forcefully to fix "ghost" updates
        if ('caches' in window) {
            try {
                const names = await caches.keys();
                await Promise.all(names.map(name => caches.delete(name)));
                console.log('Caches cleared for update.');
            } catch (e) {
                console.error('Failed to clear caches', e);
            }
        }

        await updateServiceWorker(true);
        window.location.reload();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 md:w-8 md:h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 md:text-gray-400 transition flex items-center justify-center relative"
            >
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 md:top-1.5 md:right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border-2 border-white dark:border-gray-900 md:border-none"></span>
                    </span>
                )}
                <Bell size={18} className="md:w-4 md:h-4 lg:w-4 lg:h-4 w-5 h-5" />
            </button>

            {isOpen && (
                <div className="fixed top-14 left-4 right-4 z-[100] md:absolute md:top-12 md:right-0 md:left-auto md:w-80 bg-white dark:bg-gray-800 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-gray-700 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                        <h3 className="font-bold text-gray-800 dark:text-white">اعلان‌ها</h3>
                        {unreadCount > 0 && (
                            <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {unreadCount} اعلان جدید
                            </span>
                        )}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                                <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center mb-1">
                                    <Bell size={20} className="text-gray-300 dark:text-gray-600" />
                                </div>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">هیچ اعلان جدیدی ندارید!</p>
                            </div>
                        ) : (
                            <div className="p-2 space-y-1">
                                {notifications.map(n => (
                                    <div key={n.id} className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition">
                                        <div className="flex gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.color}`}>
                                                <n.icon size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-bold text-gray-800 dark:text-white mb-1 leading-relaxed">{n.title}</h4>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{n.message}</p>

                                                {n.id === 'pwa-update' && (
                                                    <button
                                                        onClick={handleUpdate}
                                                        className="w-full bg-indigo-600 text-white rounded-xl py-2 text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                                    >
                                                        <RefreshCw size={14} className="animate-spin-slow" />
                                                        دریافت و نصب فایل‌های جدید
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
