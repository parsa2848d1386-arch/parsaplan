import React, { useState } from 'react';
import { SubjectTask, TaskStatus, getSubjectStyle } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useFocus } from '../../context/FocusContext';
import { Play, Plus, Clock, CheckCircle2, Circle, Pencil, ArrowLeftRight } from 'lucide-react';
import { formatToPersianDigits, getShamsiDate } from '../../utils';

interface KanbanViewProps {
    tasks: SubjectTask[];
    onEdit: (e: React.MouseEvent, task: SubjectTask) => void;
    onAddQuick: (status: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; title: string; shortTitle: string; color: string; bg: string }[] = [
    { id: 'todo', title: 'در صف مطالعه', shortTitle: 'در صف', color: 'text-on-surface', bg: 'bg-surface-container-low' },
    { id: 'in_progress', title: 'در حال انجام', shortTitle: 'در حال اجرا', color: 'text-primary', bg: 'bg-primary/6' },
    { id: 'completed', title: 'تکمیل شده', shortTitle: 'تکمیل‌شده', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/60 dark:bg-emerald-950/25' },
];

export const KanbanView: React.FC<KanbanViewProps> = ({ tasks, onEdit, onAddQuick }) => {
    const { updateTaskStatus } = useStore();
    const { startFocusForTask } = useFocus();
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [mobileColumn, setMobileColumn] = useState<TaskStatus>('todo');

    const getTaskStatus = (t: SubjectTask): TaskStatus => t.status || (t.isCompleted ? 'completed' : 'todo');

    const getNextStatusAction = (status: TaskStatus): { next: TaskStatus; label: string } => {
        if (status === 'todo') return { next: 'in_progress', label: 'شروع اجرا' };
        if (status === 'in_progress') return { next: 'completed', label: 'تکمیل' };
        return { next: 'todo', label: 'بازگشت به صف' };
    };

    return (
        <div className="space-y-3">
            {/* Mobile single-column segmented switcher (< md) */}
            <div
                role="tablist"
                aria-label="ستون‌های تخته کانبان"
                className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-surface-container border border-[var(--border-subtle)] md:hidden"
            >
                {COLUMNS.map((col) => {
                    const count = tasks.filter((t) => getTaskStatus(t) === col.id).length;
                    const isSelected = mobileColumn === col.id;
                    return (
                        <button
                            key={col.id}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            onClick={() => setMobileColumn(col.id)}
                            className={`min-h-[40px] px-2 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                isSelected
                                    ? 'bg-[var(--surface-elevated)] text-primary shadow-xs'
                                    : 'text-[var(--text-secondary)]'
                            }`}
                        >
                            <span className="truncate">{col.shortTitle}</span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-surface-container text-[var(--text-secondary)] tabular-nums">
                                {formatToPersianDigits(count)}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {COLUMNS.map((col) => {
                    const colTasks = tasks.filter((t) => getTaskStatus(t) === col.id);
                    const isVisibleOnMobile = mobileColumn === col.id;

                    return (
                        <div
                            key={col.id}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                                if (draggedId) {
                                    updateTaskStatus(draggedId, col.id);
                                    setDraggedId(null);
                                }
                            }}
                            className={`rounded-[24px] p-4 border border-[var(--border-subtle)] min-h-[360px] flex-col gap-3 ${col.bg} ${
                                isVisibleOnMobile ? 'flex' : 'hidden md:flex'
                            }`}
                        >
                            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)]">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-extrabold ${col.color}`}>{col.title}</span>
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] tabular-nums">
                                        {formatToPersianDigits(colTasks.length)}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onAddQuick(col.id)}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--surface-elevated)] hover:bg-primary/10 text-primary border border-[var(--border-subtle)] transition cursor-pointer"
                                    title="افزودن تسک به این ستون"
                                    aria-label={`افزودن تسک به ${col.title}`}
                                >
                                    <Plus size={15} />
                                </button>
                            </div>

                            <div className="space-y-2.5 flex-1">
                                {colTasks.length === 0 ? (
                                    <div className="h-32 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-secondary)] border border-dashed border-[var(--border-strong)] rounded-2xl p-4 text-center">
                                        <span>کارتی در این ستون نیست</span>
                                        <button
                                            type="button"
                                            onClick={() => onAddQuick(col.id)}
                                            className="min-h-[36px] px-3 py-1 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-primary font-bold text-[11px] cursor-pointer"
                                        >
                                            + افزودن کارت
                                        </button>
                                    </div>
                                ) : (
                                    colTasks.map((task) => {
                                        const style = getSubjectStyle(task.subject);
                                        const nextAction = getNextStatusAction(col.id);
                                        return (
                                            <div
                                                key={task.id}
                                                draggable
                                                onDragStart={() => setDraggedId(task.id)}
                                                className="bg-[var(--surface-elevated)] p-3.5 rounded-2xl border border-[var(--border-subtle)] shadow-xs hover:shadow-sm transition cursor-grab active:cursor-grabbing space-y-2.5"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span>{style.icon}</span>
                                                        <span className="text-xs font-extrabold text-on-surface truncate">
                                                            {task.subject}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => onEdit(e, task)}
                                                        aria-label={`ویرایش ${task.topic}`}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-primary hover:bg-surface-container cursor-pointer shrink-0"
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                </div>

                                                <p className="text-xs text-on-surface font-medium leading-relaxed">
                                                    {task.topic}
                                                </p>

                                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
                                                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] min-w-0">
                                                        <span className="truncate">{getShamsiDate(task.date)}</span>
                                                        {task.startTime && (
                                                            <span className="flex items-center gap-0.5 text-primary font-mono font-bold tabular-nums shrink-0" dir="ltr">
                                                                <Clock size={10} /> {task.startTime}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateTaskStatus(task.id, nextAction.next)}
                                                            className="min-h-[34px] px-2.5 py-1 rounded-lg bg-surface-container hover:bg-primary/10 text-on-surface hover:text-primary text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                                            title={`انتقال به ${nextAction.label}`}
                                                        >
                                                            <ArrowLeftRight size={11} />
                                                            <span>{nextAction.label}</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => startFocusForTask(task)}
                                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 cursor-pointer"
                                                            title="شروع تمرکز"
                                                            aria-label="شروع تمرکز"
                                                        >
                                                            <Play size={12} fill="currentColor" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateTaskStatus(
                                                                    task.id,
                                                                    col.id === 'completed' ? 'todo' : 'completed'
                                                                )
                                                            }
                                                            className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-emerald-500 hover:bg-surface-container cursor-pointer"
                                                            title="تغییر وضعیت"
                                                            aria-label="تغییر وضعیت تکمیل"
                                                        >
                                                            {col.id === 'completed' ? (
                                                                <CheckCircle2 size={16} className="text-emerald-500" />
                                                            ) : (
                                                                <Circle size={16} />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
