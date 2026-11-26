import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bell, RefreshCw, DownloadCloud } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { forceUpdatePwa } from '../services/pwaManager';
import { formatToPersianDigits } from '../utils';
import { popoverVariants, SPRING_SNAPPY } from '../utils/motionPresets';
import { haptics } from '../utils/haptics';

interface NotificationBellProps {
    buttonClassName?: string;
    /** When true, expands the trigger button into an inline Dynamic-Island style tab pill when open */
    morphMode?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
    buttonClassName = '',
    morphMode = false,
    onOpenChange,
}) => {
    const [isOpen, setIsOpenState] = useState(false);
    const setIsOpen = (val: boolean | ((prev: boolean) => boolean)) => {
        setIsOpenState((prev) => {
            const next = typeof val === 'function' ? val(prev) : val;
            if (next !== prev) onOpenChange?.(next);
            return next;
        });
    };
    const [hasUpdate, setHasUpdate] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const prefersReducedMotion = useReducedMotion();
    const { showToast } = useUI();

    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
        navigator.serviceWorker
            .getRegistration()
            .then((reg) => {
                if (reg && reg.waiting) {
                    setHasUpdate(true);
                }
            })
            .catch(() => {});
    }, []);

    const notifications = [];
    if (hasUpdate) {
        notifications.push({
            id: 'pwa-update',
            type: 'system',
            title: 'نسخه جدید آماده نصب است!',
            message: 'برای اجرای نسخه جدید برنامه، باید حافظه پنهان پاک و آپدیت اعمال شود.',
            icon: DownloadCloud,
            color: 'text-primary bg-primary/10',
        });
    }

    const unreadCount = notifications.length;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleUpdate = async () => {
        haptics.medium();
        setIsOpen(false);
        showToast('در حال پاکسازی کش و نصب آپدیت...', 'info');
        await forceUpdatePwa();
    };

    if (morphMode) {
        return (
            <div className="relative" ref={dropdownRef}>
                <motion.button
                    type="button"
                    onClick={() => {
                        haptics.selection();
                        setIsOpen((prev) => !prev);
                    }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                    transition={SPRING_SNAPPY}
                    aria-expanded={isOpen}
                    className={`w-11 h-11 rounded-full flex items-center justify-center relative cursor-pointer transition-colors duration-150 ${
                        isOpen
                            ? 'bg-primary text-on-primary shadow-sm'
                            : 'hover:bg-surface-container text-[var(--text-secondary)] hover:text-on-surface'
                    } ${buttonClassName}`}
                    aria-label="اعلان‌ها"
                    title="اعلان‌ها"
                >
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                            <span className="inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-[var(--surface-elevated)]" />
                        </span>
                    )}
                    <Bell size={18} className="shrink-0" />
                </motion.button>

                {typeof document !== 'undefined' &&
                    createPortal(
                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    initial={prefersReducedMotion ? false : { opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.16, ease: 'easeOut' }}
                                    onClick={() => setIsOpen(false)}
                                    className="fixed inset-0 z-[60] bg-slate-950/35 dark:bg-black/50 backdrop-blur-[3px] flex items-start justify-center pt-[max(0.625rem,env(safe-area-inset-top,0px))] px-3"
                                    dir="rtl"
                                >
                                    <motion.div
                                        initial={
                                            prefersReducedMotion
                                                ? false
                                                : { opacity: 0, scale: 0.88, y: -8 }
                                        }
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={
                                            prefersReducedMotion
                                                ? { opacity: 0 }
                                                : { opacity: 0, scale: 0.92, y: -6 }
                                        }
                                        transition={{ type: 'spring', stiffness: 440, damping: 32, mass: 0.75 }}
                                        style={{ transformOrigin: 'top left', willChange: 'transform, opacity' }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full max-w-[430px] rounded-[26px] bg-[var(--surface-elevated)] border border-[var(--glass-nav-border)] shadow-2xl overflow-hidden"
                                    >
                                        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex justify-between items-center bg-surface-container-low/90">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary/12 text-primary flex items-center justify-center">
                                                    <Bell size={16} />
                                                </div>
                                                <h3 className="font-extrabold text-sm text-on-surface">اعلان‌ها</h3>
                                                {unreadCount > 0 && (
                                                    <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums">
                                                        {formatToPersianDigits(unreadCount)} جدید
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    haptics.selection();
                                                    setIsOpen(false);
                                                }}
                                                aria-label="بستن اعلان‌ها"
                                                className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-surface-container transition cursor-pointer"
                                            >
                                                <span className="text-base font-bold leading-none">×</span>
                                            </button>
                                        </div>

                                        <div className="max-h-[58vh] overflow-y-auto custom-scrollbar">
                                            {notifications.length === 0 ? (
                                                <div className="p-6 text-center flex flex-col items-center justify-center gap-2">
                                                    <div className="w-11 h-11 squircle-sm bg-surface-container flex items-center justify-center mb-1">
                                                        <Bell size={19} className="text-[var(--text-tertiary)]" />
                                                    </div>
                                                    <p className="text-xs font-bold text-[var(--text-secondary)]">هیچ اعلان جدیدی ندارید!</p>
                                                    <button
                                                        type="button"
                                                        onClick={handleUpdate}
                                                        className="mt-1 min-h-[40px] text-xs text-primary flex items-center gap-1.5 font-bold py-2 px-3 squircle-sm hover:bg-primary/10 transition cursor-pointer"
                                                    >
                                                        <RefreshCw size={13} />
                                                        بروزرسانی و تازه‌سازی کش برنامه
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="p-2.5 space-y-1.5">
                                                    {notifications.map((n) => (
                                                        <div key={n.id} className="p-3 bg-surface-container-low squircle-md border border-[var(--border-subtle)]">
                                                            <div className="flex gap-3">
                                                                <div className={`w-10 h-10 squircle-sm flex items-center justify-center shrink-0 ${n.color}`}>
                                                                    <n.icon size={18} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="text-xs font-extrabold text-on-surface mb-1 leading-relaxed">{n.title}</h4>
                                                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-3">{n.message}</p>

                                                                    {n.id === 'pwa-update' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleUpdate}
                                                                            className="w-full min-h-[42px] bg-primary text-on-primary squircle-sm py-2 text-xs font-bold hover:opacity-95 active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer"
                                                                        >
                                                                            <RefreshCw size={14} />
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
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>,
                        document.body
                    )}
            </div>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <motion.button
                layout={morphMode}
                type="button"
                onClick={() => {
                    haptics.selection();
                    setIsOpen((prev) => !prev);
                }}
                animate={prefersReducedMotion ? undefined : { scale: isOpen && !morphMode ? 1.16 : 1 }}
                whileHover={prefersReducedMotion ? undefined : { scale: isOpen && !morphMode ? 1.16 : 1.05 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                transition={SPRING_SNAPPY}
                aria-expanded={isOpen}
                className={`${
                    morphMode && isOpen
                        ? 'h-11 px-3.5 rounded-full gap-2'
                        : 'w-11 h-11 md:w-9 md:h-9 rounded-full'
                } flex items-center justify-center relative cursor-pointer transition-colors ${
                    isOpen
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'hover:bg-surface-container text-[var(--text-secondary)] hover:text-on-surface'
                } ${buttonClassName}`}
                aria-label="اعلان‌ها"
                title="اعلان‌ها"
            >
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 md:top-1.5 md:right-1.5 flex h-2.5 w-2.5">
                        <span className="inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-[var(--surface-elevated)]" />
                    </span>
                )}
                <Bell size={18} className="shrink-0" />
                {morphMode && isOpen && (
                    <motion.span
                        initial={prefersReducedMotion ? false : { opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={SPRING_SNAPPY}
                        className="text-xs font-bold whitespace-nowrap overflow-hidden"
                    >
                        اعلان‌ها
                    </motion.span>
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        variants={popoverVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        style={{ transformOrigin: 'top left' }}
                        className="absolute top-[calc(100%+0.75rem)] -left-1 right-auto w-[min(calc(100vw-1.5rem),21.5rem)] z-[100] md:top-12 md:left-0 md:w-80 bg-[var(--surface-elevated)] squircle-lg shadow-xl border border-[var(--border-subtle)] overflow-hidden"
                    >
                        <div className="px-4 py-3.5 border-b border-[var(--border-subtle)] flex justify-between items-center bg-surface-container-low">
                            <h3 className="font-extrabold text-sm text-on-surface">اعلان‌ها</h3>
                            {unreadCount > 0 && (
                                <span className="bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-0.5 rounded-full tabular-nums">
                                    {formatToPersianDigits(unreadCount)} اعلان جدید
                                </span>
                            )}
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-7 text-center flex flex-col items-center justify-center gap-2">
                                    <div className="w-12 h-12 squircle-sm bg-surface-container flex items-center justify-center mb-1">
                                        <Bell size={20} className="text-[var(--text-tertiary)]" />
                                    </div>
                                    <p className="text-xs font-bold text-[var(--text-secondary)]">هیچ اعلان جدیدی ندارید!</p>
                                    <button
                                        type="button"
                                        onClick={handleUpdate}
                                        className="mt-2 min-h-[40px] text-xs text-primary flex items-center gap-1.5 font-bold py-2 px-3 squircle-sm hover:bg-primary/10 transition cursor-pointer"
                                    >
                                        <RefreshCw size={13} />
                                        بروزرسانی و تازه‌سازی کش برنامه
                                    </button>
                                </div>
                            ) : (
                                <div className="p-2.5 space-y-1.5">
                                    {notifications.map((n) => (
                                        <div key={n.id} className="p-3 bg-surface-container-low squircle-md border border-[var(--border-subtle)]">
                                            <div className="flex gap-3">
                                                <div className={`w-10 h-10 squircle-sm flex items-center justify-center shrink-0 ${n.color}`}>
                                                    <n.icon size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-extrabold text-on-surface mb-1 leading-relaxed">{n.title}</h4>
                                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-3">{n.message}</p>

                                                    {n.id === 'pwa-update' && (
                                                        <button
                                                            type="button"
                                                            onClick={handleUpdate}
                                                            className="w-full min-h-[42px] bg-primary text-on-primary squircle-sm py-2 text-xs font-bold hover:opacity-95 active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer"
                                                        >
                                                            <RefreshCw size={14} />
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
