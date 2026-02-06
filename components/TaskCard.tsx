import React from 'react';
import { SubjectTask, getSubjectStyle } from '../types';
import { getShamsiDate } from '../utils';
import { CheckCircle2, Circle, Trash2, Pencil, Calendar, ArrowDownToLine, Target } from 'lucide-react';
import { ExamTaskCard } from './ExamTaskCard';
import { useStore } from '../context/StoreContext';

interface TaskCardProps {
    task: SubjectTask;
    isOverdue?: boolean;
    viewMode?: 'compact' | 'normal';
    onToggle: (id: string) => void;
    onEdit: (e: React.MouseEvent, task: SubjectTask) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onMoveToToday?: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
    task,
    isOverdue = false,
    viewMode = 'normal',
    onToggle,
    onEdit,
    onDelete,
    onMoveToToday
}) => {

    // 1. Check for Exam/Analysis Type
    if (task.studyType === 'exam' || task.studyType === 'analysis') {
        const handleExamEdit = (e: React.MouseEvent, t: SubjectTask) => onEdit(e, t);
        const handleExamDelete = (e: React.MouseEvent, id: string) => onDelete(e, id);
        const handleExamToggle = (t: SubjectTask) => onToggle(t.id!);

        return (
            <ExamTaskCard
                task={task}
                onEdit={handleExamEdit}
                onDelete={handleExamDelete}
                onToggleComplete={handleExamToggle}
            />
        );
    }

    // 2. Standard Task Display
    const isDone = task.isCompleted;
    const taskDateShamsi = getShamsiDate(task.date);

    let subColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    if (task.isCustom) {
        subColor = 'bg-gray-800 text-white dark:bg-gray-700';
    } else {
        const style = getSubjectStyle(task.subject);
        subColor = `${style.bgColor} ${style.color === 'gray' ? 'text-gray-700 dark:text-gray-300' : `text-${style.color}-800 dark:text-${style.color}-300`}`;
    }

    const hasTestStats = task.testStats && task.testStats.total > 0;
    const accuracy = hasTestStats ? Math.round(((task.testStats!.correct * 3 - task.testStats!.wrong) / (task.testStats!.total * 3)) * 100) : 0;

    if (viewMode === 'compact') {
        return (
            <div
                onClick={() => onToggle(task.id!)}
                className={`group relative bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 transition-all duration-300 active:scale-[0.99] cursor-pointer hover:shadow-md ${isDone ? 'bg-gray-50/80 dark:bg-gray-800/50' : ''} ${isOverdue ? 'border-amber-200 dark:border-amber-800' : ''}`}
            >
                <div className={`flex-shrink-0 transition-all ${isDone ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`}>
                    {isDone ? <CheckCircle2 size={20} fill="currentColor" className="text-white dark:text-gray-800" /> : <Circle size={20} strokeWidth={2} />}
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between">
                    <div className={`truncate ${isDone ? 'opacity-50 line-through' : ''}`}>
                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{task.subject}</span>
                        <span className="mx-2 text-xs text-gray-400 dark:text-gray-500">|</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{task.topic}</span>
                    </div>
                    <div className="flex gap-1 items-center">
                        {hasTestStats && (
                            <div className="hidden sm:flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                <span className="text-emerald-600 dark:text-emerald-400">{task.testStats?.correct}✅</span>
                                <span className="text-rose-500">{task.testStats?.wrong}❌</span>
                                <span className="text-gray-400">|</span>
                                <span className={`${accuracy >= 50 ? 'text-emerald-600' : 'text-amber-500'}`}>{accuracy}%</span>
                            </div>
                        )}
                        {task.tags && task.tags.length > 0 && <span className="text-[9px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1 rounded flex items-center">#{task.tags[0]}</span>}
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold whitespace-nowrap ml-1 ${subColor}`}>
                            {task.details}
                        </span>
                    </div>
                </div>
                <div className="flex gap-1 pl-1">
                    <button onClick={(e) => onEdit(e, task)} className="text-gray-400 hover:text-blue-500"><Pencil size={14} /></button>
                    <button onClick={(e) => onDelete(e, task.id!)} className="text-gray-400 hover:text-rose-500"><Trash2 size={14} /></button>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={() => onToggle(task.id!)}
            className={`group relative bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-3 transition-all duration-300 active:scale-[0.99] cursor-pointer hover:shadow-md ${isDone ? 'bg-gray-50/80 dark:bg-gray-800/50' : ''} ${isOverdue ? 'border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-900/10' : ''}`}
        >
            {/* Top Section: Icon + Content (Row Layout) */}
            <div className="flex items-start gap-3 w-full">
                <div className={`mt-1 transition-all duration-300 transform ${isDone ? 'text-emerald-500 scale-110' : 'text-gray-300 dark:text-gray-600 group-hover:text-indigo-400'}`}>
                    {isDone ? <CheckCircle2 size={24} fill="currentColor" className="text-white dark:text-gray-800" /> : <Circle size={24} strokeWidth={2} />}
                </div>
                <div className={`flex-1 transition-all duration-500 ${isDone ? 'opacity-40 grayscale blur-[0.5px]' : ''}`}>
                    <div className="flex justify-between items-start">
                        <h3 className={`font-bold text-gray-800 dark:text-gray-200 transition-all ${isDone ? 'line-through decoration-2 decoration-gray-300 dark:decoration-gray-600' : ''}`}>{task.subject}</h3>
                        <div className="flex flex-col items-end gap-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${subColor}`}>
                                {task.details}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                <Calendar size={10} />
                                {taskDateShamsi}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed font-medium">
                        <span className="font-bold text-gray-800 dark:text-gray-300">مبحث:</span> {task.topic}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        {hasTestStats && (
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-lg px-2 py-1 text-[10px] font-bold">
                                <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400" title="تعداد درست"><Target size={10} /> {task.testStats?.correct}</span>
                                <span className="text-gray-300 dark:text-gray-600">|</span>
                                <span className="text-rose-500 dark:text-rose-400" title="تعداد غلط">{task.testStats?.wrong} غلط</span>
                                <span className="text-gray-300 dark:text-gray-600">|</span>
                                <span className={`${accuracy >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'}`}>{accuracy}%</span>
                            </div>
                        )}

                        {task.tags && task.tags.length > 0 && (
                            <div className="flex gap-1">
                                {task.tags.map(t => (
                                    <span key={t} className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 transition">#{t}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Footer Actions (Row Layout) */}
            <div className="w-full flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700/50 mt-1">
                <button onClick={(e) => onEdit(e, task)} className="flex items-center gap-1 text-[10px] items-center px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition">
                    <Pencil size={14} /> ویرایش
                </button>
                <button onClick={(e) => onDelete(e, task.id!)} className="flex items-center gap-1 text-[10px] px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition">
                    <Trash2 size={14} /> حذف
                </button>
                {isOverdue && onMoveToToday && (
                    <button onClick={(e) => { e.stopPropagation(); onMoveToToday(task.id!); }} className="flex items-center gap-1 text-[10px] px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition">
                        <ArrowDownToLine size={14} /> انتقال به امروز
                    </button>
                )}
            </div>
        </div>
    );
};
