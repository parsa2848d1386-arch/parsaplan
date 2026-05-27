
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { SubjectTask, Subject } from '../types';
import { TaskCard } from './TaskCard';
import { Sparkles, X, Check, Plus } from 'lucide-react';
import TaskModal from './TaskModal';

export interface ParsedTask {
    title: string;
    subject: string;
    topic: string;
    details: string;
    testRange?: string;
    date: string;
    studyType?: 'exam' | 'analysis' | 'test_educational' | 'test_speed' | 'review' | 'study';
    subTasks?: { subject: string; topic: string; }[];
    id?: string;
    isCompleted?: boolean;
}

interface AITaskReviewWindowProps {
    tasks: ParsedTask[];
    onClose: () => void;
    onConfirm: () => void;
    onUpdateTasks: (tasks: ParsedTask[]) => void;
    currentDayId: number;
}

const AITaskReviewWindow: React.FC<AITaskReviewWindowProps> = ({
    tasks,
    onClose,
    onConfirm,
    onUpdateTasks,
    currentDayId // We need to know current day to show relative days
}) => {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    // Convert ParsedTask to SubjectTask for checking/rendering
    const previewTasks: SubjectTask[] = useMemo(() => {
        return tasks.map((t, idx) => {
            // Safety checks / defaults
            const safeDate = t.date && !isNaN(Date.parse(t.date)) ? t.date : new Date().toISOString().split('T')[0];
            const safeSubject = t.subject || 'شخصی'; // Default subject

            return {
                id: `preview-${idx}`,
                dayId: 0,
                date: safeDate,
                subject: safeSubject,
                topic: t.topic || 'بدون عنوان',
                details: t.details || '',
                testRange: t.testRange || '',
                isCompleted: false, // Default for preview
                isCustom: true,
                tags: [],
                studyType: t.studyType,
                subTasks: t.subTasks ? t.subTasks.map((st, i) => ({ id: `sub-${idx}-${i}`, subject: st.subject, topic: st.topic })) : undefined
            };
        });
    }, [tasks]);

    const handleEditClick = (e: React.MouseEvent, task: SubjectTask) => {
        e.stopPropagation();
        const index = parseInt(task.id.replace('preview-', ''));
        setEditingIndex(index);
        setIsTaskModalOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const index = parseInt(id.replace('preview-', ''));
        const newTasks = [...tasks];
        newTasks.splice(index, 1);
        onUpdateTasks(newTasks);
    };

    const handleSaveTask = (updated: Partial<SubjectTask>) => {
        if (editingIndex === null && updated) {
            // New Task
            const newToken: ParsedTask = {
                title: updated.subject || '', // Fallback title
                subject: updated.subject || Subject.Custom,
                topic: updated.topic || 'بدون عنوان',
                details: updated.details || '',
                testRange: updated.testRange || '',
                date: updated.date || new Date().toISOString().split('T')[0],
                studyType: updated.studyType,
                subTasks: updated.subTasks ? updated.subTasks.map(st => ({ subject: st.subject, topic: st.topic })) : undefined
            };
            onUpdateTasks([...tasks, newToken]); // Append to end
        } else if (editingIndex !== null && updated) {
            // Update Existing
            const newTasks = [...tasks];
            newTasks[editingIndex] = {
                ...newTasks[editingIndex],
                subject: updated.subject || newTasks[editingIndex].subject,
                topic: updated.topic || newTasks[editingIndex].topic,
                details: updated.details || newTasks[editingIndex].details,
                testRange: updated.testRange || newTasks[editingIndex].testRange,
                date: updated.date || newTasks[editingIndex].date,
                studyType: updated.studyType || newTasks[editingIndex].studyType,
                subTasks: updated.subTasks || newTasks[editingIndex].subTasks,
            };
            onUpdateTasks(newTasks);
        }
        setIsTaskModalOpen(false);
        setEditingIndex(null);
    };

    const handleAddNew = () => {
        setEditingIndex(null); // Null means new
        setIsTaskModalOpen(true);
    };

    return createPortal(
        <div className="fixed inset-0 z-[50] flex items-center justify-center pointer-events-none" style={{ zIndex: 50 }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 pointer-events-auto"
                onClick={onClose}
            ></div>

            {/* Modal Container */}
            <div className="relative pointer-events-auto w-full max-w-2xl bg-white/95 dark:bg-gray-900/95 shadow-2xl overflow-hidden flex flex-col 
                h-[100dvh] rounded-none glass-premium-thick border-l border-gray-200/50 dark:border-gray-800/50
                sm:h-auto sm:max-h-[85vh] sm:rounded-3xl sm:m-4 sm:border sm:border-white/20 sm:dark:border-gray-700/50 
                animate-in zoom-in-95 fade-in duration-300">

                {/* Header */}
                <div className="p-4 border-b border-gray-150/40 dark:border-gray-800/40 flex justify-between items-center bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl z-10 sticky top-0 select-none">
                    <h3 className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-2.5 tracking-tight">
                        <Sparkles size={18} className="animate-pulse" />
                        بررسی و ویرایش هوشمند
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-100/50 dark:bg-gray-800/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500 rounded-full transition text-gray-500 dark:text-gray-400 btn-micro-interactive"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/20 dark:bg-gray-950/20">
                    <div className="text-xs text-center font-extrabold mb-2 bg-indigo-50/60 dark:bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-100/20 dark:border-indigo-900/20 text-indigo-650 dark:text-indigo-400 shadow-inner">
                        {tasks.length} تسک برای روز {currentDayId} و روزهای آینده پیشنهاد شده است.
                    </div>

                    <div className="space-y-3 pb-4">
                        {previewTasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onToggle={() => { }} // No-op in review mode
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                viewMode="normal"
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleAddNew}
                        className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-700/80 rounded-2xl text-gray-400 hover:text-indigo-600 hover:border-indigo-400/50 hover:bg-white dark:hover:bg-gray-850/60 transition-all flex items-center justify-center gap-2 text-xs font-extrabold shadow-sm btn-micro-interactive"
                    >
                        <Plus size={16} /> افزودن تسک جدید
                    </button>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-gray-150/40 dark:border-gray-800/40 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md flex gap-3 z-10 pb-8 sm:pb-4 shadow-[0_-4px_25px_rgba(0,0,0,0.03)] dark:shadow-none">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-150/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-350 py-3 rounded-2xl text-xs font-extrabold hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition btn-micro-interactive border border-gray-250/20 dark:border-gray-700/20"
                    >
                        انصراف
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-[2] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-2xl text-xs font-extrabold shadow-lg shadow-indigo-500/25 transition btn-micro-interactive flex items-center justify-center gap-2"
                    >
                        <Check size={16} strokeWidth={2.5} />
                        تایید و ثبت نهایی
                    </button>
                </div>
            </div>

            {/* Nested Task Edit Modal */}
            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSave={handleSaveTask}
                initialData={editingIndex !== null ? previewTasks[editingIndex] : null}
                currentDayId={1}
                defaultDateStr={editingIndex !== null ? previewTasks[editingIndex].date : new Date().toISOString().split('T')[0]}
            />
        </div>,
        document.body
    );
};

export default AITaskReviewWindow;
