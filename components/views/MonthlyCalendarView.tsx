import React, { useState, useMemo } from 'react';
import { SubjectTask, getSubjectStyle } from '../../types';
import { useStore } from '../../context/StoreContext';
import { formatToPersianDigits, getShamsiDate, toJalaali, toGregorian, toIsoString } from '../../utils';
import { ChevronRight, ChevronLeft, Plus, Clock, CheckCircle2, Circle } from 'lucide-react';
import WeeklyView from '../WeeklyView';

interface MonthlyCalendarViewProps {
    tasks: SubjectTask[];
    onEdit: (e: React.MouseEvent, task: SubjectTask) => void;
    onAddOnDate: (isoDate: string) => void;
}

const JALALI_MONTHS = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];
const WEEKDAYS = [
    { full: 'شنبه', short: 'ش' },
    { full: 'یکشنبه', short: '۱ش' },
    { full: 'دوشنبه', short: '۲ش' },
    { full: 'سه‌شنبه', short: '۳ش' },
    { full: 'چهارشنبه', short: '۴ش' },
    { full: 'پنج‌شنبه', short: '۵ش' },
    { full: 'جمعه', short: 'ج' },
];

export const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({ tasks, onEdit, onAddOnDate }) => {
    const { moveTaskToDate, toggleTask } = useStore();
    const nowJ = toJalaali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    const todayIso = toIsoString(new Date());

    const [jy, setJy] = useState(nowJ.jy);
    const [jm, setJm] = useState(nowJ.jm);
    const [selectedIso, setSelectedIso] = useState<string>(todayIso);
    const [dragTaskId, setDragTaskId] = useState<string | null>(null);

    const daysInMonth = jm <= 6 ? 31 : jm <= 11 ? 30 : jy % 4 === 3 ? 30 : 29;
    const firstGDate = toGregorian(jy, jm, 1);
    const startOffset = (firstGDate.getDay() + 1) % 7; // Saturday = 0
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const selectedDayTasks = useMemo(
        () => tasks.filter((t) => t.date === selectedIso),
        [tasks, selectedIso]
    );

    const prevMonth = () => {
        if (jm === 1) {
            setJy(jy - 1);
            setJm(12);
        } else {
            setJm(jm - 1);
        }
    };

    const nextMonth = () => {
        if (jm === 12) {
            setJy(jy + 1);
            setJm(1);
        } else {
            setJm(jm + 1);
        }
    };

    return (
        <div className="space-y-5">
            <WeeklyView />

            <div className="bg-[var(--surface-elevated)] rounded-[24px] p-4 sm:p-5 border border-[var(--border-subtle)] shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2 className="font-black text-sm sm:text-base text-on-surface tabular-nums">
                        تقویم ماهانه شمسی — {JALALI_MONTHS[jm - 1]} {formatToPersianDigits(jy)}
                    </h2>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={prevMonth}
                            aria-label="ماه قبل"
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition cursor-pointer"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setJy(nowJ.jy);
                                setJm(nowJ.jm);
                                setSelectedIso(todayIso);
                            }}
                            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold cursor-pointer"
                        >
                            امروز
                        </button>
                        <button
                            type="button"
                            onClick={nextMonth}
                            aria-label="ماه بعد"
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition cursor-pointer"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2 text-center text-[11px] font-bold text-[var(--text-secondary)]">
                    {WEEKDAYS.map((d) => (
                        <div key={d.full} className="py-1">
                            <span className="sm:hidden">{d.short}</span>
                            <span className="hidden sm:inline">{d.full}</span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                    {Array.from({ length: totalCells }, (_, idx) => {
                        const dayNum = idx - startOffset + 1;
                        if (dayNum < 1 || dayNum > daysInMonth) {
                            return (
                                <div
                                    key={idx}
                                    className="min-h-[54px] sm:min-h-[90px] rounded-xl sm:rounded-2xl bg-surface-container-low/40"
                                />
                            );
                        }

                        const gDate = toGregorian(jy, jm, dayNum);
                        const iso = toIsoString(gDate);
                        const dayTasks = tasks.filter((t) => t.date === iso);
                        const isToday = iso === todayIso;
                        const isSelected = iso === selectedIso;

                        return (
                            <div
                                key={iso}
                                onClick={() => setSelectedIso(iso)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                    if (dragTaskId) {
                                        moveTaskToDate(dragTaskId, iso);
                                        setDragTaskId(null);
                                    }
                                }}
                                className={`group min-h-[54px] sm:min-h-[90px] rounded-xl sm:rounded-2xl p-1.5 border flex flex-col gap-1 transition cursor-pointer ${
                                    isSelected
                                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                        : isToday
                                          ? 'border-primary/45 bg-primary/5'
                                          : 'border-[var(--border-subtle)] bg-surface-container-low/50 hover:border-primary/30'
                                }`}
                            >
                                <div className="flex items-center justify-between px-0.5">
                                    <span
                                        className={`text-[11px] font-extrabold tabular-nums ${
                                            isSelected || isToday ? 'text-primary' : 'text-on-surface'
                                        }`}
                                    >
                                        {formatToPersianDigits(dayNum)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAddOnDate(iso);
                                        }}
                                        aria-label={`افزودن تسک در روز ${formatToPersianDigits(dayNum)}`}
                                        className="hidden sm:flex opacity-0 group-hover:opacity-100 focus:opacity-100 w-5 h-5 items-center justify-center rounded-md bg-primary/15 text-primary transition cursor-pointer"
                                        title="افزودن تسک در این روز"
                                    >
                                        <Plus size={11} />
                                    </button>
                                </div>

                                {/* Compact mobile dot indicators */}
                                {dayTasks.length > 0 && (
                                    <div className="flex sm:hidden flex-wrap items-center justify-center gap-1 mt-auto pb-0.5">
                                        {dayTasks.slice(0, 3).map((t) => (
                                            <span
                                                key={t.id}
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                    t.isCompleted ? 'bg-emerald-500' : 'bg-primary'
                                                }`}
                                            />
                                        ))}
                                        {dayTasks.length > 3 && (
                                            <span className="text-[11px] font-bold text-[var(--text-secondary)] tabular-nums">
                                                +{formatToPersianDigits(dayTasks.length - 3)}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Desktop task chips */}
                                <div className="hidden sm:block space-y-1 overflow-y-auto max-h-16 no-scrollbar">
                                    {dayTasks.map((t) => {
                                        const st = getSubjectStyle(t.subject);
                                        return (
                                            <div
                                                key={t.id}
                                                draggable
                                                onDragStart={() => setDragTaskId(t.id)}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEdit(e, t);
                                                }}
                                                className={`text-[11px] px-1.5 py-0.5 rounded-md truncate cursor-pointer font-bold ${
                                                    t.isCompleted
                                                        ? 'bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 line-through'
                                                        : 'bg-[var(--surface-elevated)] text-on-surface border border-[var(--border-subtle)]'
                                                }`}
                                                title={`${t.subject}: ${t.topic}`}
                                            >
                                                {st.icon} {t.topic}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Selected Day Agenda Panel (always visible & touch-first) */}
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h3 className="text-sm font-extrabold text-on-surface">
                                برنامه {selectedIso === todayIso ? 'امروز' : getShamsiDate(selectedIso)}
                            </h3>
                            <p className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                                {formatToPersianDigits(selectedDayTasks.length)} تسک ثبت‌شده
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onAddOnDate(selectedIso)}
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 hover:opacity-95 transition active:scale-95 cursor-pointer"
                        >
                            <Plus size={15} />
                            افزودن تسک در این روز
                        </button>
                    </div>

                    {selectedDayTasks.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-surface-container-low border border-dashed border-[var(--border-strong)] text-center text-xs text-[var(--text-secondary)]">
                            برای این روز تسکی ثبت نشده است.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {selectedDayTasks.map((t) => {
                                const st = getSubjectStyle(t.subject);
                                return (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-surface-container-low border border-[var(--border-subtle)]"
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <button
                                                type="button"
                                                onClick={() => toggleTask(t.id)}
                                                aria-label={t.isCompleted ? `لغو انجام ${t.topic}` : `تکمیل ${t.topic}`}
                                                className={`w-9 h-9 flex items-center justify-center rounded-xl shrink-0 cursor-pointer ${
                                                    t.isCompleted ? 'text-emerald-500' : 'text-[var(--text-tertiary)]'
                                                }`}
                                            >
                                                {t.isCompleted ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => onEdit(e, t)}
                                                className="min-w-0 flex-1 text-start cursor-pointer"
                                            >
                                                <div className="text-xs font-bold text-on-surface truncate">
                                                    {st.icon} {t.subject} — {t.topic}
                                                </div>
                                                {t.startTime && (
                                                    <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 mt-0.5 tabular-nums">
                                                        <Clock size={11} />
                                                        <span dir="ltr">{t.startTime}</span>
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
