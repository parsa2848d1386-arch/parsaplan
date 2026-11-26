import React from 'react';
import { SubjectTask, TaskPriority, getSubjectStyle } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useFocus } from '../../context/FocusContext';
import { Play, CheckCircle2, Circle, Flame, CalendarClock, Layers, Coffee } from 'lucide-react';
import { formatToPersianDigits } from '../../utils';

interface EisenhowerMatrixViewProps {
    tasks: SubjectTask[];
    onEdit: (e: React.MouseEvent, task: SubjectTask) => void;
}

const QUADRANTS: {
    id: TaskPriority;
    title: string;
    subtitle: string;
    icon: React.ElementType;
    accent: string;
    border: string;
}[] = [
    {
        id: 'urgent',
        title: '۱. فوری و مهم (انجام فوری)',
        subtitle: 'تست‌ها و مباحث حیاتی امروز',
        icon: Flame,
        accent: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30',
        border: 'border-rose-200/80 dark:border-rose-800/40',
    },
    {
        id: 'high',
        title: '۲. مهم ولی غیرفوری (برنامه‌ریزی)',
        subtitle: 'پیشروی اصلی دروس تخصصی',
        icon: CalendarClock,
        accent: 'text-primary bg-primary/10',
        border: 'border-primary/25',
    },
    {
        id: 'medium',
        title: '۳. فوری یا روتین (متوسط)',
        subtitle: 'مرورها و تکالیف جاری',
        icon: Layers,
        accent: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200/80 dark:border-amber-800/40',
    },
    {
        id: 'low',
        title: '۴. سبک و اختیاری (پایین)',
        subtitle: 'مطالعه تکمیلی در وقت اضافه',
        icon: Coffee,
        accent: 'text-[var(--text-secondary)] bg-surface-container',
        border: 'border-[var(--border-subtle)]',
    },
];

export const EisenhowerMatrixView: React.FC<EisenhowerMatrixViewProps> = ({ tasks, onEdit }) => {
    const { toggleTask, updateTask } = useStore();
    const { startFocusForTask } = useFocus();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUADRANTS.map((q) => {
                const Icon = q.icon;
                const qTasks = tasks.filter((t) => (t.priority || 'medium') === q.id);

                return (
                    <div
                        key={q.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            const taskId = e.dataTransfer.getData('text/plain');
                            const found = tasks.find((t) => t.id === taskId);
                            if (found) updateTask({ ...found, priority: q.id });
                        }}
                        className={`bg-[var(--surface-elevated)] rounded-[24px] p-4 border ${q.border} shadow-xs flex flex-col gap-3 min-h-[240px]`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${q.accent}`}>
                                    <Icon size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xs sm:text-sm font-extrabold text-on-surface truncate">{q.title}</h3>
                                    <p className="text-[11px] text-[var(--text-secondary)] truncate">{q.subtitle}</p>
                                </div>
                            </div>
                            <span className="text-xs font-extrabold text-[var(--text-secondary)] bg-surface-container px-2 py-0.5 rounded-lg tabular-nums shrink-0">
                                {formatToPersianDigits(qTasks.length)}
                            </span>
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pe-0.5">
                            {qTasks.length === 0 ? (
                                <p className="text-center text-xs text-[var(--text-secondary)] py-8">
                                    تسکی در این ربع نیست — اولویت تسک‌ها را از منوی هر ردیف تغییر دهید یا بکشید.
                                </p>
                            ) : (
                                qTasks.map((task) => {
                                    const style = getSubjectStyle(task.subject);
                                    const currentPriority = task.priority || 'medium';
                                    return (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
                                            className="p-2.5 rounded-2xl bg-surface-container-low border border-[var(--border-subtle)] flex items-center justify-between gap-2"
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleTask(task.id)}
                                                    aria-label={task.isCompleted ? `لغو انجام ${task.topic}` : `تکمیل ${task.topic}`}
                                                    className={`w-9 h-9 flex items-center justify-center rounded-xl shrink-0 cursor-pointer ${
                                                        task.isCompleted ? 'text-emerald-500' : 'text-[var(--text-tertiary)] hover:text-primary'
                                                    }`}
                                                >
                                                    {task.isCompleted ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                                                </button>
                                                <span className="text-sm shrink-0">{style.icon}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => onEdit(e, task)}
                                                    className="min-w-0 flex-1 text-right cursor-pointer"
                                                >
                                                    <div
                                                        className={`text-xs font-bold truncate ${
                                                            task.isCompleted ? 'line-through text-[var(--text-secondary)]' : 'text-on-surface'
                                                        }`}
                                                    >
                                                        {task.subject}: {task.topic}
                                                    </div>
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <select
                                                    aria-label={`تغییر اولویت ${task.topic}`}
                                                    value={currentPriority}
                                                    onChange={(e) =>
                                                        updateTask({ ...task, priority: e.target.value as TaskPriority })
                                                    }
                                                    className="min-h-[34px] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-on-surface rounded-lg px-1.5 py-1 text-[11px] font-bold outline-none cursor-pointer"
                                                >
                                                    <option value="urgent">فوری</option>
                                                    <option value="high">بالا</option>
                                                    <option value="medium">متوسط</option>
                                                    <option value="low">پایین</option>
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => startFocusForTask(task)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0 cursor-pointer"
                                                    title="شروع تمرکز"
                                                    aria-label="شروع تمرکز"
                                                >
                                                    <Play size={12} fill="currentColor" />
                                                </button>
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
    );
};
