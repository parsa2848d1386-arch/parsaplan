
import React, { useState, useMemo } from 'react';
import { SubjectTask, Subject } from '../types';
import { TaskCard } from './TaskCard';
import { Sparkles, X, Check, Plus } from 'lucide-react';
import TaskModal from './TaskModal';

export interface ParsedTask {
    title: string;
    subject: string;
    topic: string;
    details: string;
    testRange: string;
    date: string;
    studyType?: 'exam' | 'analysis' | 'test_educational' | 'test_speed' | 'review' | 'study';
    subTasks?: { subject: string; topic: string; }[];
}

interface AITaskReviewWindowProps {
    tasks: ParsedTask[];
    onClose: () => void;
    onConfirm: () => void;
    onUpdateTasks: (tasks: ParsedTask[]) => void;
}

const AITaskReviewWindow: React.FC<AITaskReviewWindowProps> = ({
    tasks,
    onClose,
    onConfirm,
    onUpdateTasks
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

    return (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center pointer-events-none" style={{ zIndex: 99999 }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
                onClick={onClose}
            />

            {/* Modal Container */}
            {/* Modal Container */}
            <div className="relative pointer-events-auto w-full max-w-2xl mx-4 sm:mx-auto mb-20 sm:mb-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 dark:border-gray-700/50 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-10 fade-in duration-300">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                        <Sparkles size={20} />
                        پیش‌نمایش و ویرایش تسک‌ها
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar h-full">
                    <div className="text-xs text-center text-gray-500 mb-4 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-800">
                        {tasks.length} تسک آماده افزودن است. می‌توانید آنها را ویرایش یا حذف کنید.
                    </div>

                    <div className="space-y-3">
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
                        className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition flex items-center justify-center gap-2 text-sm font-bold mt-4"
                    >
                        <Plus size={18} /> افزودن تسک دستی
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md flex gap-3 z-10">
                    <button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                        انصراف
                    </button>
                    <button onClick={onConfirm} className="flex-[2] bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-indigo-500/30 transition flex items-center justify-center gap-2">
                        <Check size={18} />
                        تایید و افزودن به برنامه
                    </button>
                </div>
            </div>

            {/* Task Edit Modal */}
            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSave={handleSaveTask}
                initialData={editingIndex !== null ? previewTasks[editingIndex] : null}
                currentDayId={1} // Dummy, relies on date mostly
                defaultDateStr={editingIndex !== null ? previewTasks[editingIndex].date : new Date().toISOString().split('T')[0]}
            />
        </div>
    );
};

export default AITaskReviewWindow;
