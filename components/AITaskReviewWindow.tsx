
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
        return tasks.map((t, idx) => ({
            id: `preview-${idx}`,
            dayId: 0,
            date: t.date,
            subject: t.subject,
            topic: t.topic || '',
            details: t.details || '',
            testRange: t.testRange || '',
            isCompleted: false, // Default for preview
            isCustom: true,
            tags: [],
            // Store original title in notes or somewhere if needed, but SubjectTask strictly uses subject/topic
            // We might map 'title' to topic if topic is empty?
            // Dashboard.tsx says: task.subject is "Physics", task.topic is "Waves".
            // ParsedTask has title. Let's assume title isn't used much in standard card or map it to details?
        }));
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
                title: '', // SubjectTask doesn't have title field usually used this way, but we keep structure
                subject: updated.subject || Subject.Custom,
                topic: updated.topic || '',
                details: updated.details || '',
                testRange: updated.testRange || '',
                date: updated.date || new Date().toISOString().split('T')[0]
            };
            onUpdateTasks([...tasks, newToken]);
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-200 dark:border-gray-800">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                        <Sparkles size={20} />
                        پیش‌نمایش و ویرایش تسک‌ها
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
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
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex gap-3">
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
