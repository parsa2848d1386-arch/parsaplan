import React, { useState } from 'react';
import { SubjectTask, SUBJECT_ICONS, getSubjectStyle } from '../types';
import { Clock, Star, Target, ChevronDown, ChevronUp, MoreVertical, Edit2, Trash2, CheckCircle2 } from 'lucide-react';

interface Props {
    task: SubjectTask;
    onEdit: (e: React.MouseEvent, task: SubjectTask) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onToggleComplete: (task: SubjectTask) => void;
}

export const ExamTaskCard: React.FC<Props> = ({ task, onEdit, onDelete, onToggleComplete }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const totalQuestions = task.testStats?.total || 0;
    const correctAnswers = task.testStats?.correct || 0;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    // Determine card color based on completion and type
    const isExam = task.studyType === 'exam';
    const borderColor = isExam ? 'border-purple-200 dark:border-purple-800' : 'border-blue-200 dark:border-blue-800';
    const bgGradient = isExam
        ? 'bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20'
        : 'bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20';

    return (
        <div className={`relative group rounded-3xl p-4 border transition-all duration-300 hover:shadow-lg ${borderColor} ${bgGradient} ${task.isCompleted ? 'opacity-90 grayscale-[0.3]' : ''}`}>

            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm bg-white dark:bg-gray-800`}>
                        {isExam ? '🎓' : '📊'}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg flex items-center gap-2">
                            {task.details || (isExam ? 'آزمون' : 'تحلیل آزمون')}
                            {task.isCompleted && <CheckCircle2 size={16} className="text-emerald-500" />}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">
                            {task.subTasks?.length || 0} درس • {task.topic}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={(e) => onEdit(e, task)} className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-xl text-gray-400 hover:text-indigo-500 transition">
                        <Edit2 size={16} />
                    </button>
                    <button onClick={(e) => onDelete(e, task.id!)} className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-xl text-gray-400 hover:text-rose-500 transition">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-2 text-center">
                    <span className="block text-[10px] text-gray-400 font-bold">زمان</span>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{task.actualDuration || 0}'</span>
                </div>
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-2 text-center">
                    <span className="block text-[10px] text-gray-400 font-bold">تست</span>
                    <span className="text-sm font-black text-gray-700 dark:text-gray-300">{totalQuestions}</span>
                </div>
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-2 text-center">
                    <span className="block text-[10px] text-gray-400 font-bold">درصد کل</span>
                    <span className={`text-sm font-black ${accuracy >= 70 ? 'text-emerald-500' : accuracy >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                        {accuracy}%
                    </span>
                </div>
            </div>

            {/* Expandable Details */}
            <div className="overflow-hidden transition-all duration-300">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-center py-1 text-xs font-bold text-gray-400 hover:text-indigo-500 transition gap-1"
                >
                    {isExpanded ? 'بستن جزئیات' : 'مشاهده ریز نمرات'}
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {isExpanded && task.subTasks && (
                    <div className="mt-3 space-y-2 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                        {task.subTasks.map(sub => {
                            const subTotal = sub.testStats?.total || 0;
                            const subCorrect = sub.testStats?.correct || 0;
                            const subAcc = subTotal > 0 ? Math.round((subCorrect / subTotal) * 100) : 0;
                            const style = getSubjectStyle(sub.subject);

                            return (
                                <div key={sub.id} className="flex items-center justify-between bg-white/50 dark:bg-gray-800/50 p-2 rounded-lg text-xs">
                                    <div className="flex items-center gap-2">
                                        <span>{style.icon}</span>
                                        <span className="font-bold text-gray-700 dark:text-gray-300">{sub.subject}</span>
                                        <span className="text-gray-400">({sub.topic})</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-500">{subCorrect}/{subTotal}</span>
                                        <span className={`font-bold w-8 text-end ${subAcc >= 70 ? 'text-emerald-500' : subAcc >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                                            {subAcc}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                    {task.tags.map(tag => (
                        <span key={tag} className="text-[9px] bg-white/50 dark:bg-gray-800/50 px-2 py-0.5 rounded-md text-gray-500 border border-gray-100 dark:border-gray-700">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};
