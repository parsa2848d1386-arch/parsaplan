import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../context/StoreContext';
import { useUI } from '../../context/UIContext';
import { getLogicalDateKey } from '../../utils/streakEngine';
import { getFullShamsiDate, formatToPersianDigits } from '../../utils';
import { MoodType } from '../../types';
import { MoonStar, X, Flame, CheckCircle2, Clock, ArrowRightLeft, Sparkles, Zap, Smile, Coffee, BatteryLow } from 'lucide-react';

const MOODS: { id: MoodType; Icon: React.ElementType; label: string; color: string }[] = [
    { id: 'excellent', Icon: Sparkles, label: 'عالی', color: 'text-amber-500' },
    { id: 'high-energy', Icon: Zap, label: 'پرانرژی', color: 'text-emerald-500' },
    { id: 'normal', Icon: Smile, label: 'معمولی', color: 'text-sky-500' },
    { id: 'tired', Icon: Coffee, label: 'خسته', color: 'text-orange-500' },
    { id: 'exhausted', Icon: BatteryLow, label: 'فرسوده', color: 'text-rose-500' },
];

export const EveningReflectionModal: React.FC = () => {
    const {
        tasks,
        sessions,
        settings,
        streakStats,
        moods,
        setMood,
        saveDailyNote,
        getDailyNote,
        shiftIncompleteTasks,
        rebalancePlan,
    } = useStore();
    const { isEveningModalOpen, setEveningModalOpen, showToast } = useUI();

    const cutoffHour = settings.dayCutoffHour ?? 5;
    const todayLogical = useMemo(() => getLogicalDateKey(new Date(), cutoffHour), [cutoffHour]);

    const [note, setNote] = useState('');

    useEffect(() => {
        if (isEveningModalOpen) {
            setNote(getDailyNote(todayLogical) || '');
        }
    }, [isEveningModalOpen, todayLogical, getDailyNote]);

    useEffect(() => {
        if (!isEveningModalOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setEveningModalOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isEveningModalOpen, setEveningModalOpen]);

    const stats = useMemo(() => {
        const dayTasks = tasks.filter((t) => t.date === todayLogical);
        const completed = dayTasks.filter((t) => t.isCompleted);
        const pending = dayTasks.filter((t) => !t.isCompleted);
        const todaySeconds = sessions
            .filter((s) => getLogicalDateKey(s.startedAt, cutoffHour) === todayLogical)
            .reduce((sum, s) => sum + s.durationSeconds, 0);

        return {
            total: dayTasks.length,
            completedCount: completed.length,
            pendingCount: pending.length,
            focusMinutes: Math.round(todaySeconds / 60),
        };
    }, [tasks, sessions, todayLogical, cutoffHour]);

    if (!isEveningModalOpen) return null;

    const currentMood = moods[todayLogical];

    const handleSaveAndClose = () => {
        if (note.trim()) {
            saveDailyNote(todayLogical, note.trim());
        }
        showToast('گزارش شبانه ثبت شد. خسته نباشید!', 'success');
        setEveningModalOpen(false);
    };

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 dark:bg-black/80 backdrop-blur-[8px] p-4"
            onClick={() => setEveningModalOpen(false)}
            dir="rtl"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="بازبینی شبانه و جمع‌بندی روز"
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--surface-elevated)] squircle-lg max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden border border-[var(--border-subtle)] shadow-2xl"
            >
                {/* Calm Native Header (Banner Blindness fix) */}
                <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 squircle-sm bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <MoonStar size={22} />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">
                                بازبینی شبانه و جمع‌بندی روز
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{getFullShamsiDate(todayLogical)}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setEveningModalOpen(false)}
                        aria-label="بستن"
                        className="w-11 h-11 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-on-surface hover:bg-surface-container transition cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto space-y-5 flex-1">
                    {/* Metrics Row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-800/40 text-center">
                            <CheckCircle2 size={18} className="mx-auto text-emerald-500 mb-1" />
                            <div className="text-lg font-black text-emerald-800 dark:text-white">
                                {formatToPersianDigits(stats.completedCount)} / {formatToPersianDigits(stats.total)}
                            </div>
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-300">تسک تکمیل‌شده</div>
                        </div>

                        <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl p-3 border border-indigo-100 dark:border-indigo-800/40 text-center">
                            <Clock size={18} className="mx-auto text-indigo-500 mb-1" />
                            <div className="text-lg font-black text-indigo-800 dark:text-white">
                                {formatToPersianDigits(stats.focusMinutes)} دقیقه
                            </div>
                            <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300">تمرکز ثبت‌شده</div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-3 border border-amber-100 dark:border-amber-800/40 text-center">
                            <Flame size={18} className="mx-auto text-amber-500 mb-1" />
                            <div className="text-lg font-black text-amber-800 dark:text-white">
                                {formatToPersianDigits(streakStats.currentStreak)} روز
                            </div>
                            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-300">زنجیره مطالعه (Streak)</div>
                        </div>
                    </div>

                    {/* Mood Check-in */}
                    <div className="bg-gray-50 dark:bg-gray-800/70 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-black text-gray-700 dark:text-gray-200 mb-3">حس‌وحال پایان روز شما چطور بود؟</p>
                        <div className="grid grid-cols-5 gap-2">
                            {MOODS.map((m) => {
                                const MoodIcon = m.Icon;
                                const active = currentMood === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setMood(todayLogical, m.id)}
                                        className={`py-2.5 min-h-[54px] rounded-xl flex flex-col items-center justify-center gap-1 transition border cursor-pointer ${
                                            active
                                                ? 'bg-primary text-on-primary border-primary shadow-sm scale-[1.03]'
                                                : 'bg-[var(--surface-elevated)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-primary/40'
                                        }`}
                                    >
                                        <MoodIcon size={18} className={active ? 'text-on-primary' : m.color} aria-hidden="true" />
                                        <span className="text-[10px] font-bold">{m.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Daily Note / Retrospective */}
                    <div>
                        <label className="block text-xs font-black text-gray-700 dark:text-gray-200 mb-2">
                            یادداشت کوتاه بازبینی (نکات مثبت، حواس‌پرتی‌ها، تصمیم برای فردا)
                        </label>
                        <textarea
                            rows={3}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="مثلاً: تست زیست فصل ۴ عالی پیش رفت، فردا مرور واکنش‌های شیمی رو اول صبح می‌ذارم..."
                            className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 text-xs font-medium text-gray-800 dark:text-white outline-none focus:border-indigo-500"
                        />
                    </div>

                    {/* Rollover incomplete */}
                    {stats.pendingCount > 0 && (
                        <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <div className="text-xs font-black text-amber-800 dark:text-amber-300">
                                    {formatToPersianDigits(stats.pendingCount)} تسک از امروز باقی مانده است
                                </div>
                                <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                                    می‌توانید کارهای معلق را به صورت خودکار به فردا یا روزهای کم‌بار منتقل کنید.
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => shiftIncompleteTasks()}
                                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black flex items-center gap-1 transition"
                                >
                                    <ArrowRightLeft size={13} /> انتقال به فردا
                                </button>
                                <button
                                    type="button"
                                    onClick={() => rebalancePlan()}
                                    className="px-3 py-2 rounded-xl bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[11px] font-black transition"
                                >
                                    بازچینی هوشمند
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--border-subtle)] bg-surface-container-low flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={handleSaveAndClose}
                        className="px-6 min-h-[44px] py-2.5 rounded-xl bg-primary text-on-primary text-xs font-black shadow-sm hover:opacity-95 transition cursor-pointer"
                    >
                        ثبت گزارش و پایان روز
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
