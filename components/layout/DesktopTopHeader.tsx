import React, { useState, useEffect } from 'react';
import { CalendarClock, Search, Flame, Sparkles, LogIn } from 'lucide-react';
import { formatToPersianDigits, getFullShamsiDate } from '../../utils';
import { haptics } from '../../utils/haptics';

const formatMinuteTime = () =>
    new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

const useMinuteClock = () => {
    const [clock, setClock] = useState(() => ({
        time: formatMinuteTime(),
        date: getFullShamsiDate(new Date().toISOString()),
    }));

    useEffect(() => {
        const timer = setInterval(() => {
            const nextTime = formatMinuteTime();
            setClock((prev) => {
                if (prev.time === nextTime) return prev;
                const nextDate = getFullShamsiDate(new Date().toISOString());
                return { time: nextTime, date: nextDate };
            });
        }, 10000);
        return () => clearInterval(timer);
    }, []);

    return clock;
};

const DesktopClockChip = React.memo(() => {
    const { time, date } = useMinuteClock();
    return (
        <div className="hidden xl:flex items-center gap-2 bg-white/45 dark:bg-white/8 px-3 py-1.5 squircle-sm text-on-surface-variant dark:text-slate-200 border border-[var(--glass-nav-border)] text-xs font-medium tabular-nums whitespace-nowrap shrink-0">
            <CalendarClock size={15} className="text-primary shrink-0" aria-hidden="true" />
            <span className="font-bold text-on-surface dark:text-white">{time}</span>
            <span className="opacity-40">|</span>
            <span>{date}</span>
        </div>
    );
});
DesktopClockChip.displayName = 'DesktopClockChip';

interface DesktopTopHeaderProps {
    onOpenCommandPalette: () => void;
    syncStatusSlot: React.ReactNode;
    notificationSlot: React.ReactNode;
    streakCount: number;
    isAiPanelOpen: boolean;
    onToggleAiPanel: () => void;
    isAuthenticated: boolean;
    displayName: string;
    level: number;
    userInitial: string;
    avatarSlot?: React.ReactNode;
    onProfileClick: () => void;
}

/**
 * Desktop top bar separated from Layout using slot-based composition to keep header state isolated.
 */
export const DesktopTopHeader: React.FC<DesktopTopHeaderProps> = React.memo(
    ({
        onOpenCommandPalette,
        syncStatusSlot,
        notificationSlot,
        streakCount,
        isAiPanelOpen,
        onToggleAiPanel,
        isAuthenticated,
        displayName,
        level,
        userInitial,
        avatarSlot,
        onProfileClick,
    }) => {
        return (
            <header className="hidden md:flex md:absolute md:top-0 md:inset-x-0 items-center justify-between h-16 px-6 border-b border-[var(--glass-nav-border)] liquid-glass-nav glass-header-shadow z-40">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            haptics.selection();
                            onOpenCommandPalette();
                        }}
                        className="w-56 xl:w-64 h-10 px-3 gap-2 flex items-center justify-between bg-white/45 dark:bg-white/8 squircle-sm text-on-surface-variant dark:text-slate-200 text-xs border border-[var(--glass-nav-border)] hover:border-primary/40 transition-colors group cursor-pointer text-start shrink-0"
                        title="جستجو و دستورات (Ctrl+K)"
                        aria-label="جستجو و دستورات (Ctrl+K)"
                    >
                        <span className="flex items-center gap-2 min-w-0 flex-1">
                            <Search
                                size={16}
                                className="shrink-0 text-on-surface-variant group-hover:text-primary transition-colors"
                                aria-hidden="true"
                            />
                            <span className="truncate">جستجو در برنامه...</span>
                        </span>
                        <kbd className="shrink-0 px-1.5 py-0.5 rounded-md bg-white/60 dark:bg-slate-700/80 text-on-surface-variant dark:text-slate-200 text-[11px] font-mono border border-[var(--border-subtle)]">
                            Ctrl+K
                        </kbd>
                    </button>

                    <DesktopClockChip />

                    {syncStatusSlot}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <div
                        data-arc-target="xp-badge"
                        className="flex items-center gap-1.5 bg-tertiary-fixed/70 px-3 py-1.5 squircle-sm text-on-tertiary-fixed font-bold text-xs tabular-nums border border-tertiary/15 whitespace-nowrap shrink-0"
                    >
                        <Flame size={15} className="fill-current text-tertiary shrink-0" aria-hidden="true" />
                        <span>{formatToPersianDigits(streakCount)} روز زنجیره</span>
                    </div>

                    <button
                        type="button"
                        onClick={onToggleAiPanel}
                        aria-label={isAiPanelOpen ? 'بستن دستیار هوشمند' : 'دستیار هوشمند'}
                        className={`relative flex items-center gap-1.5 px-3 min-h-[40px] squircle-sm text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            isAiPanelOpen
                                ? 'bg-primary text-on-primary shadow-xs'
                                : 'bg-primary/14 text-primary hover:bg-primary/20'
                        }`}
                    >
                        <Sparkles size={15} className="shrink-0" aria-hidden="true" />
                        <span className="hidden lg:inline">{isAiPanelOpen ? 'بستن دستیار' : 'دستیار هوشمند'}</span>
                    </button>

                    {notificationSlot}

                    <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5" />

                    <button
                        type="button"
                        onClick={() => {
                            haptics.selection();
                            onProfileClick();
                        }}
                        className="flex items-center gap-2 px-2 py-1 squircle-sm hover:bg-white/40 dark:hover:bg-white/10 transition text-end cursor-pointer shrink-0 whitespace-nowrap"
                        title={isAuthenticated ? 'تنظیمات حساب' : 'ورود یا همگام‌سازی ابری'}
                    >
                        <div className="flex flex-col text-end items-end">
                            <span className="text-xs font-bold text-on-surface dark:text-white truncate max-w-[120px]">
                                {displayName}
                            </span>
                            <span className="text-[11px] text-secondary font-semibold flex items-center gap-1 whitespace-nowrap">
                                {isAuthenticated ? (
                                    `سطح ${formatToPersianDigits(level)} • ابری`
                                ) : (
                                    <>
                                        <LogIn size={11} aria-hidden="true" />
                                        ورود ابری / آفلاین
                                    </>
                                )}
                            </span>
                        </div>
                        {avatarSlot ?? (
                            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                                {userInitial}
                            </div>
                        )}
                    </button>
                </div>
            </header>
        );
    }
);
DesktopTopHeader.displayName = 'DesktopTopHeader';
