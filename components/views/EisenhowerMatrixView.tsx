import React from 'react';
import { SubjectTask, TaskPriority, getSubjectStyle } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useFocus } from '../../context/FocusContext';
import { Play, CheckCircle2, Circle, Flame, CalendarClock, Layers, Coffee } from 'lucide-react';

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
        border: 'border-rose-200 dark:border-rose-800/40',
    },
    {
        id: 'high',
        title: '۲. مهم ولی غیرفوری (برنامه‌ریزی)',
        subtitle: 'پیشروی اصلی دروس تخصصی',
        icon: CalendarClock,
        accent: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30',
        border: 'border-indigo-200 dark:border-indigo-800/40',
    },
    {
        id: 'medium',
        title: '۳. فوری یا روتین (متوسط)',
        subtitle: 'مرورها و تکالیف جاری',
        icon: Layers,
        accent: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200 dark:border-amber-800/40',
    },
    {
        id: 'low',
        title: '۴. سبک و اختیاری (پایین)',
        subtitle: 'مطالعه تکمیلی در وقت اضافه',
        icon: Coffee,
        accent: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/60',
        border: 'border-gray-200 dark:border-gray-700',
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
                        className={`bg-white dark:bg-gray-800 rounded-3xl p-4 border ${q.border} shadow-sm flex flex-col gap-3 min-h-[260px]`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${q.accent}`}>
                                    <Icon size={18} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-gray-800 dark:text-white">{q.title}</h3>
                                    <p className="text-[10px] text-gray-400">{q.subtitle}</p>
                                </div>
                            </div>
                            <span className="text-xs font-black text-gray-400">{qTasks.length}</span>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                            {qTasks.length === 0 ? (
                                <p className="text-center text-xs text-gray-400 py-8">تسکی در این ربع وجود ندارد (می‌توانید بکشید و رها کنید)</p>
                            ) : (
                                qTasks.map((task) => {
                                    const style = getSubjectStyle(task.subject);
                                    return (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
                                            className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-2 cursor-grab"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <button onClick={() => toggleTask(task.id)} className={task.isCompleted ? 'text-emerald-500' : 'text-gray-300'}>
                                                    {task.isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                                </button>
                                                <span className="text-sm">{style.icon}</span>
                                                <div
                                                    onClick={(e) => onEdit(e, task)}
                                                    className="min-w-0 cursor-pointer"
                                                >
                                                    <div className={`text-xs font-bold truncate ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                                                        {task.subject}: {task.topic}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => startFocusForTask(task)}
                                                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0"
                                                title="شروع تمرکز"
                                            >
                                                <Play size={11} fill="currentColor" />
                                            </button>
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
