import React, { useState, useMemo } from 'react';
import { SubjectTask, TaskPriority, TaskStatus, getSubjectStyle } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useFocus } from '../../context/FocusContext';
import { calculateExamPercentage, formatToPersianDigits, getShamsiDate } from '../../utils';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Play, Pencil, Trash2, Search, Star, CheckCircle2, Circle, Clock } from 'lucide-react';

interface TableViewProps {
    tasks: SubjectTask[];
    onEdit: (e: React.MouseEvent, task: SubjectTask) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
}

export const TableView: React.FC<TableViewProps> = ({ tasks, onEdit, onDelete }) => {
    const { updateTask, toggleTask, updateTaskStatus } = useStore();
    const { startFocusForTask } = useFocus();
    const isMobile = useMediaQuery('(max-width: 767px)');

    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
    const [editingCell, setEditingCell] = useState<{ id: string; field: 'topic' | 'startTime' | 'durationMinutes' | 'actualDuration' } | null>(null);
    const [draftVal, setDraftVal] = useState('');

    const filtered = useMemo(() => {
        return tasks.filter((t) => {
            const st = t.status || (t.isCompleted ? 'completed' : 'todo');
            if (statusFilter !== 'all' && st !== statusFilter) return false;
            if (query.trim()) {
                const q = query.trim().toLowerCase();
                return (
                    t.subject.toLowerCase().includes(q) ||
                    t.topic.toLowerCase().includes(q) ||
                    t.details.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [tasks, query, statusFilter]);

    // Footer Rollup Aggregations
    const totals = useMemo(() => {
        const plannedMins = filtered.reduce((acc, t) => acc + (t.durationMinutes ?? 60), 0);
        const actualMins = filtered.reduce((acc, t) => acc + (t.actualDuration || 0), 0);
        const rated = filtered.filter((t) => (t.qualityRating || 0) > 0);
        const avgQuality = rated.length > 0 ? rated.reduce((acc, t) => acc + (t.qualityRating || 0), 0) / rated.length : 0;
        const tested = filtered.filter((t) => t.testStats && t.testStats.total > 0);
        const avgAccuracy =
            tested.length > 0
                ? Math.round(
                      tested.reduce(
                          (acc, t) =>
                              acc +
                              calculateExamPercentage(
                                  t.testStats!.correct,
                                  t.testStats!.wrong,
                                  t.testStats!.total
                              ),
                          0
                      ) / tested.length
                  )
                : 0;
        return {
            plannedMins,
            actualMins,
            avgQuality,
            avgAccuracy,
            completedCount: filtered.filter((t) => t.isCompleted).length,
        };
    }, [filtered]);

    const startEdit = (task: SubjectTask, field: 'topic' | 'startTime' | 'durationMinutes' | 'actualDuration') => {
        setEditingCell({ id: task.id, field });
        setDraftVal(String(task[field] ?? ''));
    };

    const commitEdit = (task: SubjectTask) => {
        if (!editingCell) return;
        const { field } = editingCell;
        if (field === 'topic') {
            if (draftVal.trim()) updateTask({ ...task, topic: draftVal.trim() });
        } else if (field === 'startTime') {
            updateTask({ ...task, startTime: draftVal.trim() || undefined });
        } else if (field === 'durationMinutes') {
            updateTask({ ...task, durationMinutes: Math.max(5, parseInt(draftVal, 10) || 60) });
        } else if (field === 'actualDuration') {
            updateTask({ ...task, actualDuration: Math.max(0, parseInt(draftVal, 10) || 0) });
        }
        setEditingCell(null);
    };

    return (
        <div className="bg-[var(--surface-elevated)] rounded-[24px] border border-[var(--border-subtle)] shadow-xs overflow-hidden">
            {/* Toolbar */}
            <div className="p-3.5 sm:p-4 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="جستجو در جدول..."
                        aria-label="جستجو در جدول"
                        className="w-full bg-surface-container-low border border-[var(--border-subtle)] rounded-xl ps-9 pe-3 py-2 text-base sm:text-sm outline-none focus:border-primary text-on-surface"
                    />
                </div>
                <div
                    role="tablist"
                    aria-label="فیلتر وضعیت تسک‌ها"
                    className="flex gap-1 bg-surface-container p-1 rounded-xl text-xs font-bold overflow-x-auto no-scrollbar max-w-full"
                >
                    {(
                        [
                            { id: 'all', label: 'همه' },
                            { id: 'todo', label: 'در صف' },
                            { id: 'in_progress', label: 'در حال اجرا' },
                            { id: 'completed', label: 'تکمیل' },
                        ] as const
                    ).map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            role="tab"
                            aria-selected={statusFilter === f.id}
                            onClick={() => setStatusFilter(f.id)}
                            className={`min-h-[34px] px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
                                statusFilter === f.id
                                    ? 'bg-[var(--surface-elevated)] text-primary shadow-xs'
                                    : 'text-[var(--text-secondary)]'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {isMobile ? (
                /* Mobile Compact Editable Card List (< 768px — zero horizontal scroll) */
                <div className="divide-y divide-[var(--border-subtle)]">
                    {filtered.length === 0 ? (
                        <div className="py-10 px-4 text-center text-sm text-[var(--text-secondary)] font-bold">
                            تسکی برای نمایش در جدول وجود ندارد
                        </div>
                    ) : (
                        filtered.map((task) => {
                            const style = getSubjectStyle(task.subject);
                            const status = task.status || (task.isCompleted ? 'completed' : 'todo');
                            const priority = task.priority || 'medium';
                            const hasTests = task.testStats && task.testStats.total > 0;
                            const formulaPct = hasTests
                                ? calculateExamPercentage(
                                      task.testStats!.correct,
                                      task.testStats!.wrong,
                                      task.testStats!.total
                                  )
                                : null;

                            return (
                                <div key={task.id} className="p-3.5 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2 min-w-0 flex-1">
                                            <button
                                                type="button"
                                                onClick={() => toggleTask(task.id)}
                                                aria-label={task.isCompleted ? `لغو انجام ${task.topic}` : `تکمیل ${task.topic}`}
                                                className={`w-9 h-9 flex items-center justify-center rounded-xl shrink-0 cursor-pointer ${
                                                    task.isCompleted ? 'text-emerald-500' : 'text-[var(--text-tertiary)]'
                                                }`}
                                            >
                                                {task.isCompleted ? <CheckCircle2 size={19} /> : <Circle size={19} />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => onEdit(e, task)}
                                                className="min-w-0 flex-1 text-right cursor-pointer"
                                            >
                                                <div className="flex items-center gap-1.5 text-xs font-extrabold text-on-surface">
                                                    <span>{style.icon}</span>
                                                    <span className="truncate">{task.subject}</span>
                                                    {task.isMIT && <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />}
                                                </div>
                                                <p className={`text-sm font-bold mt-0.5 ${task.isCompleted ? 'line-through text-[var(--text-secondary)]' : 'text-on-surface'}`}>
                                                    {task.topic}
                                                </p>
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => startFocusForTask(task)}
                                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 cursor-pointer"
                                                title="شروع تمرکز"
                                                aria-label="شروع تمرکز"
                                            >
                                                <Play size={13} fill="currentColor" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => onEdit(e, task)}
                                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container text-[var(--text-secondary)] hover:text-primary cursor-pointer"
                                                title="ویرایش"
                                                aria-label="ویرایش"
                                            >
                                                <Pencil size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => onDelete(e, task.id)}
                                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container text-rose-500 cursor-pointer"
                                                title="حذف"
                                                aria-label="حذف"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-secondary)] tabular-nums">
                                        <span>{getShamsiDate(task.date)}</span>
                                        {task.startTime && (
                                            <span className="inline-flex items-center gap-1 text-primary font-mono font-bold" dir="ltr">
                                                <Clock size={11} /> {task.startTime}
                                            </span>
                                        )}
                                        <span>هدف: {formatToPersianDigits(task.durationMinutes ?? 60)} دقیقه</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                            واقعی: {formatToPersianDigits(task.actualDuration || 0)} دقیقه
                                        </span>
                                        {formulaPct !== null && (
                                            <span className={`font-bold ${formulaPct >= 60 ? 'text-emerald-600' : formulaPct >= 30 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                تست: {formatToPersianDigits(formulaPct)}٪
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <select
                                            aria-label={`وضعیت ${task.topic}`}
                                            value={status}
                                            onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                                            className="min-h-[38px] bg-surface-container-low border border-[var(--border-subtle)] text-on-surface rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
                                        >
                                            <option value="todo">در صف</option>
                                            <option value="in_progress">در حال مطالعه</option>
                                            <option value="completed">تکمیل</option>
                                        </select>
                                        <select
                                            aria-label={`اولویت ${task.topic}`}
                                            value={priority}
                                            onChange={(e) => updateTask({ ...task, priority: e.target.value as TaskPriority })}
                                            className="min-h-[38px] bg-surface-container-low border border-[var(--border-subtle)] text-on-surface rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
                                        >
                                            <option value="urgent">اولویت: فوری</option>
                                            <option value="high">اولویت: بالا</option>
                                            <option value="medium">اولویت: متوسط</option>
                                            <option value="low">اولویت: پایین</option>
                                        </select>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Mobile Rollup Footer */}
                    <div className="p-3.5 bg-primary/6 text-xs font-bold text-primary flex flex-wrap items-center justify-between gap-2 tabular-nums">
                        <span>
                            تکمیل‌شده: {formatToPersianDigits(totals.completedCount)}/{formatToPersianDigits(filtered.length)}
                        </span>
                        <span dir="ltr">
                            {Math.round((totals.actualMins / 60) * 10) / 10}h / {Math.round((totals.plannedMins / 60) * 10) / 10}h
                        </span>
                        {totals.avgAccuracy > 0 && <span>دقت تست: {formatToPersianDigits(totals.avgAccuracy)}٪</span>}
                    </div>
                </div>
            ) : (
                /* Desktop Table (>= 768px) */
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-right border-collapse min-w-[820px]">
                        <thead>
                            <tr className="bg-surface-container-low text-[11px] font-black text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                                <th className="p-3 w-10 text-center">✓</th>
                                <th className="p-3">درس</th>
                                <th className="p-3">مبحث (کلیک برای ویرایش)</th>
                                <th className="p-3">تاریخ</th>
                                <th className="p-3">ساعت</th>
                                <th className="p-3">هدف</th>
                                <th className="p-3">مطالعه واقعی</th>
                                <th className="p-3">وضعیت</th>
                                <th className="p-3">اولویت</th>
                                <th className="p-3">درصد تست (فرمول)</th>
                                <th className="p-3 text-center">عملیات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="py-10 text-center text-[var(--text-secondary)] font-bold">
                                        تسکی برای نمایش در جدول وجود ندارد
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((task) => {
                                    const style = getSubjectStyle(task.subject);
                                    const status = task.status || (task.isCompleted ? 'completed' : 'todo');
                                    const priority = task.priority || 'medium';
                                    const hasTests = task.testStats && task.testStats.total > 0;
                                    const formulaPct = hasTests
                                        ? calculateExamPercentage(
                                              task.testStats!.correct,
                                              task.testStats!.wrong,
                                              task.testStats!.total
                                          )
                                        : null;

                                    return (
                                        <tr key={task.id} className="hover:bg-surface-container-low/70 transition">
                                            <td className="p-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleTask(task.id)}
                                                    aria-label={task.isCompleted ? `لغو انجام ${task.topic}` : `تکمیل ${task.topic}`}
                                                    className={`cursor-pointer ${task.isCompleted ? 'text-emerald-500' : 'text-[var(--text-tertiary)]'}`}
                                                >
                                                    {task.isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                                </button>
                                            </td>
                                            <td className="p-3 font-bold text-on-surface whitespace-nowrap">
                                                <span className="ms-1">{style.icon}</span>
                                                {task.subject}
                                                {task.isMIT && <Star size={11} className="inline me-1 text-amber-500 fill-amber-500" />}
                                            </td>
                                            <td className="p-3 max-w-[200px]">
                                                {editingCell?.id === task.id && editingCell.field === 'topic' ? (
                                                    <input
                                                        autoFocus
                                                        value={draftVal}
                                                        onChange={(e) => setDraftVal(e.target.value)}
                                                        onBlur={() => commitEdit(task)}
                                                        onKeyDown={(e) => e.key === 'Enter' && commitEdit(task)}
                                                        className="w-full bg-[var(--surface-elevated)] border border-primary rounded-lg px-2 py-1 text-xs outline-none text-on-surface"
                                                    />
                                                ) : (
                                                    <span
                                                        onClick={() => startEdit(task, 'topic')}
                                                        className={`cursor-pointer hover:text-primary block truncate ${
                                                            task.isCompleted ? 'line-through text-[var(--text-secondary)]' : 'text-on-surface'
                                                        }`}
                                                    >
                                                        {task.topic}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-[11px] text-[var(--text-secondary)] whitespace-nowrap">
                                                {getShamsiDate(task.date)}
                                            </td>
                                            <td className="p-3 font-mono text-[11px] tabular-nums" dir="ltr">
                                                {editingCell?.id === task.id && editingCell.field === 'startTime' ? (
                                                    <input
                                                        type="time"
                                                        autoFocus
                                                        value={draftVal}
                                                        onChange={(e) => setDraftVal(e.target.value)}
                                                        onBlur={() => commitEdit(task)}
                                                        className="bg-[var(--surface-elevated)] border border-primary rounded px-1 py-0.5 text-xs text-on-surface"
                                                    />
                                                ) : (
                                                    <span
                                                        onClick={() => startEdit(task, 'startTime')}
                                                        className="cursor-pointer text-on-surface hover:text-primary"
                                                    >
                                                        {task.startTime || '—'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 font-mono text-[11px] tabular-nums" dir="ltr">
                                                {editingCell?.id === task.id && editingCell.field === 'durationMinutes' ? (
                                                    <input
                                                        type="number"
                                                        autoFocus
                                                        value={draftVal}
                                                        onChange={(e) => setDraftVal(e.target.value)}
                                                        onBlur={() => commitEdit(task)}
                                                        onKeyDown={(e) => e.key === 'Enter' && commitEdit(task)}
                                                        className="w-16 bg-[var(--surface-elevated)] border border-primary rounded px-1.5 py-0.5 text-xs text-on-surface"
                                                    />
                                                ) : (
                                                    <span
                                                        onClick={() => startEdit(task, 'durationMinutes')}
                                                        className="cursor-pointer text-on-surface"
                                                    >
                                                        {task.durationMinutes ?? 60}&apos;
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums" dir="ltr">
                                                {editingCell?.id === task.id && editingCell.field === 'actualDuration' ? (
                                                    <input
                                                        type="number"
                                                        autoFocus
                                                        value={draftVal}
                                                        onChange={(e) => setDraftVal(e.target.value)}
                                                        onBlur={() => commitEdit(task)}
                                                        onKeyDown={(e) => e.key === 'Enter' && commitEdit(task)}
                                                        className="w-16 bg-[var(--surface-elevated)] border border-primary rounded px-1.5 py-0.5 text-xs text-on-surface"
                                                    />
                                                ) : (
                                                    <span
                                                        onClick={() => startEdit(task, 'actualDuration')}
                                                        className="cursor-pointer"
                                                    >
                                                        {task.actualDuration || 0}&apos;
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <select
                                                    aria-label={`وضعیت ${task.topic}`}
                                                    value={status}
                                                    onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                                                    className="bg-surface-container text-on-surface rounded-lg px-2 py-1 text-[11px] font-bold outline-none cursor-pointer"
                                                >
                                                    <option value="todo">در صف</option>
                                                    <option value="in_progress">در حال مطالعه</option>
                                                    <option value="completed">تکمیل</option>
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                <select
                                                    aria-label={`اولویت ${task.topic}`}
                                                    value={priority}
                                                    onChange={(e) => updateTask({ ...task, priority: e.target.value as TaskPriority })}
                                                    className="bg-surface-container text-on-surface rounded-lg px-2 py-1 text-[11px] font-bold outline-none cursor-pointer"
                                                >
                                                    <option value="urgent">فوری</option>
                                                    <option value="high">بالا</option>
                                                    <option value="medium">متوسط</option>
                                                    <option value="low">پایین</option>
                                                </select>
                                            </td>
                                            <td className="p-3 font-mono font-bold tabular-nums">
                                                {formulaPct !== null ? (
                                                    <span className={formulaPct >= 60 ? 'text-emerald-500' : formulaPct >= 30 ? 'text-amber-500' : 'text-rose-500'}>
                                                        {formulaPct}%
                                                    </span>
                                                ) : (
                                                    <span className="text-[var(--text-tertiary)]">—</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => startFocusForTask(task)}
                                                        className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 cursor-pointer"
                                                        title="شروع تمرکز"
                                                        aria-label="شروع تمرکز"
                                                    >
                                                        <Play size={12} fill="currentColor" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => onEdit(e, task)}
                                                        className="p-1.5 rounded-lg hover:bg-surface-container text-[var(--text-secondary)] hover:text-primary cursor-pointer"
                                                        title="ویرایش"
                                                        aria-label="ویرایش"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => onDelete(e, task.id)}
                                                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[var(--text-secondary)] hover:text-rose-500 cursor-pointer"
                                                        title="حذف"
                                                        aria-label="حذف"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        {/* Rollup Footer */}
                        <tfoot>
                            <tr className="bg-primary/6 border-t border-[var(--border-subtle)] text-[11px] font-black text-primary">
                                <td className="p-3 text-center tabular-nums">
                                    {totals.completedCount}/{filtered.length}
                                </td>
                                <td className="p-3" colSpan={4}>
                                    جمع‌بندی خودکار (Rollup):
                                </td>
                                <td className="p-3 font-mono tabular-nums" dir="ltr">
                                    {Math.round((totals.plannedMins / 60) * 10) / 10}h
                                </td>
                                <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 tabular-nums" dir="ltr">
                                    {Math.round((totals.actualMins / 60) * 10) / 10}h
                                </td>
                                <td className="p-3" colSpan={2}>
                                    میانگین کیفیت: {totals.avgQuality > 0 ? totals.avgQuality.toFixed(1) : '—'} ★
                                </td>
                                <td className="p-3 font-mono tabular-nums">
                                    {totals.avgAccuracy > 0 ? `${totals.avgAccuracy}%` : '—'}
                                </td>
                                <td className="p-3" />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
};
