
import React, { useState, useMemo } from 'react';
import { SubjectTask, Subject, StudyType, TaskPriority } from '../types';
import { formatToPersianDigits, toIsoString } from '../utils';
import { TaskCard } from './TaskCard';
import { Sparkles, Check, Plus } from 'lucide-react';
import TaskModal from './TaskModal';
import { ModalSheet } from './ui/ModalSheet';

export interface ParsedTask {
    title: string;
    subject: string;
    topic: string;
    details: string;
    testRange?: string;
    tags?: string[];
    date: string;
    startTime?: string;
    durationMinutes?: number;
    priority?: TaskPriority;
    studyType?: StudyType;
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
            const safeDate = t.date && !isNaN(Date.parse(t.date)) ? t.date : toIsoString(new Date());
            const safeSubject = t.subject || 'شخصی';

            return {
                id: `preview-${idx}`,
                dayId: 0,
                date: safeDate,
                subject: safeSubject,
                topic: t.topic || 'بدون عنوان',
                details: t.details || '',
                testRange: t.testRange || '',
                isCompleted: false, // Default for preview
                status: 'todo',
                isCustom: true,
                tags: t.tags && t.tags.length > 0 ? t.tags : ['AI'],
                startTime: t.startTime,
                durationMinutes: t.durationMinutes ?? 60,
                priority: t.priority || 'medium',
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
                date: updated.date || toIsoString(new Date()),
                startTime: updated.startTime,
                durationMinutes: updated.durationMinutes,
                priority: updated.priority,
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
                startTime: updated.startTime !== undefined ? updated.startTime : newTasks[editingIndex].startTime,
                durationMinutes: updated.durationMinutes !== undefined ? updated.durationMinutes : newTasks[editingIndex].durationMinutes,
                priority: updated.priority || newTasks[editingIndex].priority,
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

    const footerActions = (
        <div className="flex gap-3">
            <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[44px] bg-surface-container hover:bg-surface-container-high text-on-surface py-3 rounded-2xl text-xs font-extrabold transition cursor-pointer border border-[var(--border-subtle)]"
            >
                انصراف
            </button>
            <button
                type="button"
                onClick={onConfirm}
                className="flex-[2] min-h-[44px] bg-primary hover:bg-primary-container text-on-primary py-3 rounded-2xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
                <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                تایید و ثبت نهایی
            </button>
        </div>
    );

    return (
        <>
            <ModalSheet
                isOpen={true}
                onClose={onClose}
                title="بررسی و ویرایش هوشمند"
                subtitle="پیش‌نمایش و ویرایش تسک‌های پیشنهادی پیش از ثبت در برنامه"
                historyKey="ai-task-review"
                maxWidthClass="max-w-2xl"
                footerSlot={footerActions}
            >
                <div className="p-4 space-y-4">
                    <div className="text-xs text-center font-extrabold bg-primary/10 p-3.5 rounded-2xl border border-primary/20 text-primary tabular-nums">
                        {formatToPersianDigits(tasks.length)} تسک برای روز {formatToPersianDigits(currentDayId)} و روزهای آینده پیشنهاد شده است.
                    </div>

                    <div className="space-y-3 pb-2">
                        {previewTasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onToggle={() => {}}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                viewMode="normal"
                            />
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={handleAddNew}
                        className="w-full min-h-[44px] py-3.5 border-2 border-dashed border-[var(--border-strong)] rounded-2xl text-[var(--text-secondary)] hover:text-primary hover:border-primary/50 hover:bg-surface-container-low transition-all flex items-center justify-center gap-2 text-xs font-extrabold cursor-pointer"
                    >
                        <Plus size={16} aria-hidden="true" /> افزودن تسک جدید
                    </button>
                </div>
            </ModalSheet>

            {/* Nested Task Edit Modal */}
            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSave={handleSaveTask}
                initialData={editingIndex !== null ? previewTasks[editingIndex] : null}
                currentDayId={1}
                defaultDateStr={editingIndex !== null ? previewTasks[editingIndex].date : toIsoString(new Date())}
            />
        </>
    );
};

export default AITaskReviewWindow;
