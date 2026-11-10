import React, { useState } from 'react';
import { SubjectTask, TaskStatus, getSubjectStyle } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useFocus } from '../../context/FocusContext';
import { Play, Plus, Clock, CheckCircle2, Circle, Pencil } from 'lucide-react';
import { getShamsiDate } from '../../utils';

interface KanbanViewProps {
    tasks: SubjectTask[];
    onEdit: (e: React.MouseEvent, task: SubjectTask) => void;
    onAddQuick: (status: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; title: string; color: string; bg: string }[] = [
    { id: 'todo', title: 'در صف مطالعه', color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100/70 dark:bg-gray-800/70' },
    { id: 'in_progress', title: 'در حال انجام', color: 'text-indigo-600 dark:text-indigo-300', bg: 'bg-indigo-50/70 dark:bg-indigo-950/30' },
    { id: 'completed', title: 'تکمیل شده', color: 'text-emerald-600 dark:text-emerald-300', bg: 'bg-emerald-50/70 dark:bg-emerald-950/30' },
];

export const KanbanView: React.FC<KanbanViewProps> = ({ tasks, onEdit, onAddQuick }) => {
    const { updateTaskStatus } = useStore();
    const { startFocusForTask } = useFocus();
    const [draggedId, setDraggedId] = useState<string | null>(null);

    const getTaskStatus = (t: SubjectTask): TaskStatus => t.status || (t.isCompleted ? 'completed' : 'todo');

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map((col) => {
                const colTasks = tasks.filter((t) => getTaskStatus(t) === col.id);

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
                        className={`rounded-3xl p-4 border border-gray-200/60 dark:border-gray-700/60 min-h-[380px] flex flex-col gap-3 ${col.bg}`}
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200/50 dark:border-gray-700/50">
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-black ${col.color}`}>{col.title}</span>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300">
                                    {colTasks.length}
                                </span>
                            </div>
                            <button
                                onClick={() => onAddQuick(col.id)}
                                className="p-1.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-indigo-50 text-indigo-500 shadow-sm transition"
                                title="افزودن تسک به این ستون"
                            >
                                <Plus size={14} />
                            </button>
                        </div>

                        <div className="space-y-2.5 flex-1">
                            {colTasks.length === 0 ? (
                                <div className="h-32 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-300/60 dark:border-gray-700 rounded-2xl">
                                    کارتی در این ستون نیست
                                </div>
                            ) : (
                                colTasks.map((task) => {
                                    const style = getSubjectStyle(task.subject);
                                    return (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={() => setDraggedId(task.id)}
                                            className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing space-y-2"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span>{style.icon}</span>
                                                    <span className="text-xs font-black text-gray-800 dark:text-white truncate">
                                                        {task.subject}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={(e) => onEdit(e, task)}
                                                    className="p-1 text-gray-400 hover:text-indigo-500"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                                                {task.topic}
                                            </p>
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/50">
                                                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                    <span>{getShamsiDate(task.date)}</span>
                                                    {task.startTime && (
                                                        <span className="flex items-center gap-0.5 text-sky-500 font-mono font-bold">
                                                            <Clock size={10} /> {task.startTime}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => startFocusForTask(task)}
                                                        className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                                                        title="شروع تمرکز"
                                                    >
                                                        <Play size={11} fill="currentColor" />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            updateTaskStatus(
                                                                task.id,
                                                                col.id === 'completed' ? 'todo' : 'completed'
                                                            )
                                                        }
                                                        className="p-1 text-gray-400 hover:text-emerald-500"
                                                        title="تغییر وضعیت"
                                                    >
                                                        {col.id === 'completed' ? (
                                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                                        ) : (
                                                            <Circle size={14} />
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
    );
};
