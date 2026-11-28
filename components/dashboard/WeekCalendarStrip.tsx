import React from 'react';
import { m } from 'framer-motion';
import { Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import { formatToPersianDigits } from '../../utils';

export interface WeekDayItem {
    iso: string;
    weekday: string;
    shortWeekday: string;
    shamsiDayNum: string;
    done: number;
    total: number;
    isToday: boolean;
    isSelected: boolean;
    isCompleted: boolean;
    pct: number;
}

interface WeekCalendarStripProps {
    weekDays: WeekDayItem[];
    prefersReducedMotion: boolean | null;
    onPrevWeek: () => void;
    onToday: () => void;
    onNextWeek: () => void;
    onSelectDate: (iso: string) => void;
}

const TAP_SCALE = { scale: 0.94 };
const SPRING_TAP = { type: 'spring' as const, stiffness: 380, damping: 20 };
const LIQUID_FILL_SPRING = { type: 'spring' as const, stiffness: 165, damping: 22, mass: 0.85 };
const LIQUID_NO_TRANSITION = { duration: 0 };

/**
 * Isolated 7-day Persian week calendar strip with liquid fill progress.
 */
export const WeekCalendarStrip: React.FC<WeekCalendarStripProps> = React.memo(
    ({ weekDays, prefersReducedMotion, onPrevWeek, onToday, onNextWeek, onSelectDate }) => {
        return (
            <section className="bento-card-interactive bg-[var(--surface-elevated)] p-3.5 sm:p-5 squircle-lg shadow-sm border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[var(--border-subtle)] gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <Calendar size={18} className="text-primary shrink-0" aria-hidden="true" />
                        <h2 className="font-headline-md text-xs sm:text-base font-bold text-on-surface truncate">
                            تقویم هفته جاری
                        </h2>
                    </div>

                    <div className="flex items-center gap-0.5 bg-surface-container-low p-0.5 rounded-xl border border-[var(--border-subtle)] shrink-0">
                        <button
                            type="button"
                            aria-label="هفته قبل"
                            onClick={onPrevWeek}
                            className="touch-target p-1.5 rounded-lg hover:bg-surface-container text-[var(--text-secondary)] transition-colors cursor-pointer"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={onToday}
                            className="min-h-[34px] px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                        >
                            امروز
                        </button>
                        <button
                            type="button"
                            aria-label="هفته بعد"
                            onClick={onNextWeek}
                            className="touch-target p-1.5 rounded-lg hover:bg-surface-container text-[var(--text-secondary)] transition-colors cursor-pointer"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    </div>
                </div>

                {/* 7 Days Liquid Fill Strip — Fits 7 equal columns across all mobile & desktop screens */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 py-1">
                    {weekDays.map((d) => (
                        <m.button
                            key={d.iso}
                            type="button"
                            whileTap={prefersReducedMotion ? undefined : TAP_SCALE}
                            transition={SPRING_TAP}
                            onClick={() => onSelectDate(d.iso)}
                            aria-label={`${d.weekday} ${d.shamsiDayNum} — ${formatToPersianDigits(d.done)} از ${formatToPersianDigits(d.total)} کار`}
                            className={`relative overflow-hidden flex flex-col items-center justify-between w-full min-w-0 p-1 sm:p-2.5 squircle-sm border transition-colors duration-150 min-h-[68px] sm:min-h-[84px] cursor-pointer group ${
                                d.isSelected
                                    ? 'border-primary ring-2 ring-primary/30 bg-[var(--surface-elevated)] shadow-xs'
                                    : d.isToday
                                        ? 'border-primary/55 bg-surface-container-low/80'
                                        : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:border-[var(--border-strong)]'
                            }`}
                        >
                            {/* Animated Bottom-to-Top Liquid Fill Layer */}
                            <m.div
                                initial={prefersReducedMotion ? false : { height: '0%' }}
                                animate={{ height: `${d.pct}%` }}
                                transition={prefersReducedMotion ? LIQUID_NO_TRANSITION : LIQUID_FILL_SPRING}
                                className={`absolute inset-x-0 bottom-0 pointer-events-none ${
                                    d.isCompleted
                                        ? 'bg-gradient-to-t from-emerald-500/45 via-emerald-500/25 to-emerald-400/12 dark:from-emerald-600/50 dark:via-emerald-500/30 dark:to-emerald-400/15'
                                        : 'bg-gradient-to-t from-primary/40 via-primary/20 to-secondary/12 dark:from-indigo-500/45 dark:via-indigo-500/25 dark:to-cyan-400/12'
                                }`}
                            >
                                {d.pct > 0 && d.pct < 100 && (
                                    <div className="absolute top-0 inset-x-0 h-[2px] bg-primary/70 dark:bg-white/65 shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
                                )}
                                {d.isCompleted && (
                                    <div className="absolute top-0 inset-x-0 h-[2px] bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                                )}
                            </m.div>

                            {/* Date Number Only */}
                            <div className="relative z-10 flex-1 flex items-center justify-center">
                                <span
                                    title={d.weekday}
                                    className="text-base sm:text-xl font-display-md font-black text-on-surface dark:text-white tabular-nums"
                                >
                                    {d.shamsiDayNum}
                                </span>
                            </div>

                            {/* Bottom Task Count Metric Only */}
                            <div className="relative z-10 w-full flex items-center justify-center text-[11px] pt-1 border-t border-[var(--border-subtle)]">
                                <span className="text-[var(--text-secondary)] font-bold tabular-nums">
                                    {formatToPersianDigits(d.done)}/{formatToPersianDigits(d.total)}
                                </span>
                            </div>
                        </m.button>
                    ))}
                </div>
            </section>
        );
    }
);
WeekCalendarStrip.displayName = 'WeekCalendarStrip';
