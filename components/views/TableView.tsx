import React, { useState, useMemo } from 'react';
import { SubjectTask, TaskPriority, TaskStatus, getSubjectStyle } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useFocus } from '../../context/FocusContext';
import { calculateExamPercentage, getShamsiDate } from '../../utils';
import { Play, Pencil, Trash2, Search, Star, CheckCircle2, Circle } from 'lucide-react';

interface TableViewProps {
    tasks: SubjectTask[];
    onEdit: (e: React.MouseEvent, task: SubjectTask) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
}

export const TableView: React.FC<TableViewProps> = ({ tasks, onEdit, onDelete }) => {
    const { updateTask, toggleTask, updateTaskStatus } = useStore();
    const { startFocusForTask } = useFocus();

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
        return { plannedMins, actualMins, avgQuality, avgAccuracy, completedCount: filtered.filter((t) => t.isCompleted).length };
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
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="جستجو در جدول..."
                        className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl pr-9 pl-3 py-2 text-xs outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                    />
                </div>
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-900/60 p-1 rounded-xl text-[11px] font-bold">
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
                            onClick={() => setStatusFilter(f.id)}
                            className={`px-2.5 py-1 rounded-lg transition ${
                                statusFilter === f.id
                                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                                    : 'text-gray-500'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right border-collapse min-w-[820px]">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/40 text-[11px] font-black text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
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
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-xs">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="py-10 text-center text-gray-400 font-bold">
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
                                    <tr key={task.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition">
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => toggleTask(task.id)}
                                                className={task.isCompleted ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}
                                            >
                                                {task.isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                            </button>
                                        </td>
                                        <td className="p-3 font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                                            <span className="ml-1">{style.icon}</span>
                                            {task.subject}
                                            {task.isMIT && <Star size={11} className="inline mr-1 text-amber-500 fill-amber-500" />}
                                        </td>
                                        <td className="p-3 max-w-[200px]">
                                            {editingCell?.id === task.id && editingCell.field === 'topic' ? (
                                                <input
                                                    autoFocus
                                                    value={draftVal}
                                                    onChange={(e) => setDraftVal(e.target.value)}
                                                    onBlur={() => commitEdit(task)}
                                                    onKeyDown={(e) => e.key === 'Enter' && commitEdit(task)}
                                                    className="w-full bg-white dark:bg-gray-900 border border-indigo-400 rounded-lg px-2 py-1 text-xs outline-none"
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => startEdit(task, 'topic')}
                                                    className={`cursor-pointer hover:text-indigo-500 block truncate ${
                                                        task.isCompleted ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'
                                                    }`}
                                                >
                                                    {task.topic}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-[11px] text-gray-500 whitespace-nowrap">
                                            {getShamsiDate(task.date)}
                                        </td>
                                        <td className="p-3 font-mono text-[11px]">
                                            {editingCell?.id === task.id && editingCell.field === 'startTime' ? (
                                                <input
                                                    type="time"
                                                    autoFocus
                                                    value={draftVal}
                                                    onChange={(e) => setDraftVal(e.target.value)}
                                                    onBlur={() => commitEdit(task)}
                                                    className="bg-white dark:bg-gray-900 border border-indigo-400 rounded px-1 py-0.5 text-xs"
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => startEdit(task, 'startTime')}
                                                    className="cursor-pointer text-gray-600 dark:text-gray-300 hover:text-indigo-500"
                                                >
                                                    {task.startTime || '—'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 font-mono text-[11px]">
                                            {editingCell?.id === task.id && editingCell.field === 'durationMinutes' ? (
                                                <input
                                                    type="number"
                                                    autoFocus
                                                    value={draftVal}
                                                    onChange={(e) => setDraftVal(e.target.value)}
                                                    onBlur={() => commitEdit(task)}
                                                    onKeyDown={(e) => e.key === 'Enter' && commitEdit(task)}
                                                    className="w-16 bg-white dark:bg-gray-900 border border-indigo-400 rounded px-1.5 py-0.5 text-xs"
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => startEdit(task, 'durationMinutes')}
                                                    className="cursor-pointer text-gray-600 dark:text-gray-300"
                                                >
                                                    {task.durationMinutes ?? 60}&apos;
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                            {editingCell?.id === task.id && editingCell.field === 'actualDuration' ? (
                                                <input
                                                    type="number"
                                                    autoFocus
                                                    value={draftVal}
                                                    onChange={(e) => setDraftVal(e.target.value)}
                                                    onBlur={() => commitEdit(task)}
                                                    onKeyDown={(e) => e.key === 'Enter' && commitEdit(task)}
                                                    className="w-16 bg-white dark:bg-gray-900 border border-indigo-400 rounded px-1.5 py-0.5 text-xs"
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
                                                value={status}
                                                onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                                                className="bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1 text-[10px] font-bold outline-none cursor-pointer"
                                            >
                                                <option value="todo">در صف</option>
                                                <option value="in_progress">در حال مطالعه</option>
                                                <option value="completed">تکمیل</option>
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            <select
                                                value={priority}
                                                onChange={(e) => updateTask({ ...task, priority: e.target.value as TaskPriority })}
                                                className="bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1 text-[10px] font-bold outline-none cursor-pointer"
                                            >
                                                <option value="urgent">فوری</option>
                                                <option value="high">بالا</option>
                                                <option value="medium">متوسط</option>
                                                <option value="low">پایین</option>
                                            </select>
                                        </td>
                                        <td className="p-3 font-mono font-bold">
                                            {formulaPct !== null ? (
                                                <span className={formulaPct >= 60 ? 'text-emerald-500' : formulaPct >= 30 ? 'text-amber-500' : 'text-rose-500'}>
                                                    {formulaPct}%
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 dark:text-gray-600">—</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => startFocusForTask(task)}
                                                    className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                                                    title="شروع تمرکز"
                                                >
                                                    <Play size={12} fill="currentColor" />
                                                </button>
                                                <button
                                                    onClick={(e) => onEdit(e, task)}
                                                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-gray-400 hover:text-blue-500"
                                                    title="ویرایش"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                                <button
                                                    onClick={(e) => onDelete(e, task.id)}
                                                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-gray-400 hover:text-rose-500"
                                                    title="حذف"
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
                        <tr className="bg-indigo-50/50 dark:bg-indigo-950/20 border-t border-indigo-100 dark:border-indigo-900/40 text-[11px] font-black text-indigo-700 dark:text-indigo-300">
                            <td className="p-3 text-center">{totals.completedCount}/{filtered.length}</td>
                            <td className="p-3" colSpan={4}>جمع‌بندی خودکار (Rollup):</td>
                            <td className="p-3 font-mono">{Math.round((totals.plannedMins / 60) * 10) / 10}h</td>
                            <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400">
                                {Math.round((totals.actualMins / 60) * 10) / 10}h
                            </td>
                            <td className="p-3" colSpan={2}>
                                میانگین کیفیت: {totals.avgQuality > 0 ? totals.avgQuality.toFixed(1) : '—'} ★
                            </td>
                            <td className="p-3 font-mono">
                                {totals.avgAccuracy > 0 ? `${totals.avgAccuracy}%` : '—'}
                            </td>
                            <td className="p-3" />
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};
