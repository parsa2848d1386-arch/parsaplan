import React, { useState, useMemo, useTransition } from 'react';
import { motion, LayoutGroup, useReducedMotion } from 'framer-motion';
import { ModalSheet } from '../components/ui/ModalSheet';
import { useStore } from '../context/StoreContext';
import {
    SubjectTask,
    getSubjectStyle,
    SUBJECT_ICONS,
    CustomSubject,
    SUBJECT_LISTS,
    isSpecializedSubject,
    TaskStatus as SubjectTaskStatus,
} from '../types';
import {
    ChevronDown,
    ChevronUp,
    Circle,
    CheckCircle2,
    Pencil,
    Trash2,
    Plus,
    X,
    Check,
    LayoutGrid,
    List,
    Calendar,
    GripVertical,
    ArrowUp,
    ArrowDown,
    Table2 as TableIcon,
    Columns3 as KanbanIcon,
    Grid2X2 as MatrixIcon,
    Play as FocusPlayIcon,
} from 'lucide-react';
import TaskModal from '../components/TaskModal';
import { formatToPersianDigits, getShamsiDate, toIsoString } from '../utils';
import { useOverlayHistory } from '../hooks/useOverlayHistory';
import { TableView } from '../components/views/TableView';
import { KanbanView } from '../components/views/KanbanView';
import { EisenhowerMatrixView } from '../components/views/EisenhowerMatrixView';
import { MonthlyCalendarView } from '../components/views/MonthlyCalendarView';
import { SPRING_SNAPPY } from '../utils/motionPresets';
import { haptics } from '../utils/haptics';
import { useFocus } from '../context/FocusContext';

// Static Tailwind color map (required so Tailwind v4 JIT extracts all utility classes cleanly)
const SUBJECT_COLOR_MAP: Record<string, { softBg: string; softBadge: string; text: string; bar: string; swatch: string }> = {
    emerald: { softBg: 'bg-emerald-50 dark:bg-emerald-500/20', softBadge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300', text: 'text-emerald-500', bar: 'bg-emerald-500', swatch: 'bg-emerald-500' },
    violet: { softBg: 'bg-violet-50 dark:bg-violet-500/20', softBadge: 'bg-violet-100 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300', text: 'text-violet-500', bar: 'bg-violet-500', swatch: 'bg-violet-500' },
    orange: { softBg: 'bg-orange-50 dark:bg-orange-500/20', softBadge: 'bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300', text: 'text-orange-500', bar: 'bg-orange-500', swatch: 'bg-orange-500' },
    blue: { softBg: 'bg-blue-50 dark:bg-blue-500/20', softBadge: 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300', text: 'text-blue-500', bar: 'bg-blue-500', swatch: 'bg-blue-500' },
    amber: { softBg: 'bg-amber-50 dark:bg-amber-500/20', softBadge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300', text: 'text-amber-500', bar: 'bg-amber-500', swatch: 'bg-amber-500' },
    cyan: { softBg: 'bg-cyan-50 dark:bg-cyan-500/20', softBadge: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300', text: 'text-cyan-500', bar: 'bg-cyan-500', swatch: 'bg-cyan-500' },
    indigo: { softBg: 'bg-indigo-50 dark:bg-indigo-500/20', softBadge: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300', text: 'text-indigo-500', bar: 'bg-indigo-500', swatch: 'bg-indigo-500' },
    purple: { softBg: 'bg-purple-50 dark:bg-purple-500/20', softBadge: 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300', text: 'text-purple-500', bar: 'bg-purple-500', swatch: 'bg-purple-500' },
    pink: { softBg: 'bg-pink-50 dark:bg-pink-500/20', softBadge: 'bg-pink-100 dark:bg-pink-500/20 text-pink-800 dark:text-pink-300', text: 'text-pink-500', bar: 'bg-pink-500', swatch: 'bg-pink-500' },
    teal: { softBg: 'bg-teal-50 dark:bg-teal-500/20', softBadge: 'bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300', text: 'text-teal-500', bar: 'bg-teal-500', swatch: 'bg-teal-500' },
    red: { softBg: 'bg-red-50 dark:bg-red-500/20', softBadge: 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300', text: 'text-red-500', bar: 'bg-red-500', swatch: 'bg-red-500' },
    rose: { softBg: 'bg-rose-50 dark:bg-rose-500/20', softBadge: 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300', text: 'text-rose-500', bar: 'bg-rose-500', swatch: 'bg-rose-500' },
    green: { softBg: 'bg-green-50 dark:bg-green-500/20', softBadge: 'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300', text: 'text-green-500', bar: 'bg-green-500', swatch: 'bg-green-500' },
    sky: { softBg: 'bg-sky-50 dark:bg-sky-500/20', softBadge: 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300', text: 'text-sky-500', bar: 'bg-sky-500', swatch: 'bg-sky-500' },
    lime: { softBg: 'bg-lime-50 dark:bg-lime-500/20', softBadge: 'bg-lime-100 dark:bg-lime-500/20 text-lime-800 dark:text-lime-300', text: 'text-lime-500', bar: 'bg-lime-500', swatch: 'bg-lime-500' },
    stone: { softBg: 'bg-stone-50 dark:bg-stone-500/20', softBadge: 'bg-stone-100 dark:bg-stone-500/20 text-stone-800 dark:text-stone-300', text: 'text-stone-500', bar: 'bg-stone-500', swatch: 'bg-stone-500' },
    fuchsia: { softBg: 'bg-fuchsia-50 dark:bg-fuchsia-500/20', softBadge: 'bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-800 dark:text-fuchsia-300', text: 'text-fuchsia-500', bar: 'bg-fuchsia-500', swatch: 'bg-fuchsia-500' },
    slate: { softBg: 'bg-slate-50 dark:bg-slate-500/20', softBadge: 'bg-slate-100 dark:bg-slate-500/20 text-slate-800 dark:text-slate-300', text: 'text-slate-500', bar: 'bg-slate-500', swatch: 'bg-slate-500' },
    zinc: { softBg: 'bg-zinc-50 dark:bg-zinc-500/20', softBadge: 'bg-zinc-100 dark:bg-zinc-500/20 text-zinc-800 dark:text-zinc-300', text: 'text-zinc-500', bar: 'bg-zinc-500', swatch: 'bg-zinc-500' },
    yellow: { softBg: 'bg-yellow-50 dark:bg-yellow-500/20', softBadge: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300', text: 'text-yellow-500', bar: 'bg-yellow-500', swatch: 'bg-yellow-500' },
    gray: { softBg: 'bg-gray-100 dark:bg-gray-500/20', softBadge: 'bg-gray-100 dark:bg-gray-500/20 text-gray-800 dark:text-gray-300', text: 'text-gray-500', bar: 'bg-gray-500', swatch: 'bg-gray-500' },
};

const getColorTokens = (color: string) => SUBJECT_COLOR_MAP[color] || SUBJECT_COLOR_MAP.indigo;

// Modal for adding/editing custom subjects
const SubjectModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (subject: CustomSubject) => void;
    editingSubject?: CustomSubject | null;
    existingSubjectNames: string[];
}> = ({ isOpen, onClose, onSave, editingSubject, existingSubjectNames }) => {
    const [name, setName] = useState(editingSubject?.name || '');
    const [selectedIcon, setSelectedIcon] = useState(editingSubject?.icon || '📌');
    const [selectedColor, setSelectedColor] = useState(editingSubject?.color || 'indigo');

    React.useEffect(() => {
        if (editingSubject) {
            setName(editingSubject.name);
            setSelectedIcon(editingSubject.icon);
            setSelectedColor(editingSubject.color);
        } else {
            setName('');
            setSelectedIcon('📌');
            setSelectedColor('indigo');
        }
    }, [editingSubject, isOpen]);

    const suggestedSubjects = Object.entries(SUBJECT_ICONS).filter(
        ([key]) => !existingSubjectNames.includes(key) && key !== 'شخصی'
    );

    const LIFE_ICONS = ['💼', '🌱', '🏋️', '💳', '🏡', '💻', '🤝', '🎨', '🛒', '☕', '📖', '🎯', '⚡', '🎵', '✈️', '📌'];
    const colors = ['emerald', 'violet', 'orange', 'blue', 'amber', 'cyan', 'indigo', 'purple', 'pink', 'teal', 'red', 'rose', 'green', 'sky'];

    if (!isOpen) return null;

    const previewTokens = getColorTokens(selectedColor);

    const handleSave = () => {
        if (!name.trim()) return;
        onSave({
            id: editingSubject?.id || crypto.randomUUID(),
            name: name.trim(),
            icon: selectedIcon,
            color: selectedColor,
        });
        onClose();
    };

    const handleSelectSuggested = (subjectName: string) => {
        const style = getSubjectStyle(subjectName);
        setName(subjectName);
        setSelectedIcon(style.icon);
        setSelectedColor(style.color);
    };

    return (
        <ModalSheet
            isOpen={isOpen}
            onClose={onClose}
            title={editingSubject ? 'ویرایش دسته‌بندی / حوزه' : 'افزودن دسته‌بندی جدید'}
            historyKey="subject-modal"
            maxWidthClass="max-w-md"
            footerSlot={
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-[var(--border-subtle)] text-on-surface font-bold text-sm hover:bg-surface-container transition cursor-pointer"
                    >
                        انصراف
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Check size={18} aria-hidden="true" />
                        ذخیره
                    </button>
                </div>
            }
        >
            <div className="p-5 space-y-5">
                    <div>
                        <label htmlFor="subject-name-input" className="text-xs font-bold text-[var(--text-secondary)] mb-2 block">
                            نام دسته‌بندی یا هدف
                        </label>
                        <input
                            id="subject-name-input"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="مثال: پروژه‌های کاری، ورزش، زبان انگلیسی، مالی..."
                            className="w-full bg-surface-container-low border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-base sm:text-sm outline-none focus:border-primary transition text-on-surface"
                            dir="rtl"
                        />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-[var(--text-secondary)] mb-2 block">آیکون</span>
                        <div className="flex flex-wrap gap-1.5">
                            {LIFE_ICONS.map((ic) => (
                                <button
                                    key={ic}
                                    type="button"
                                    onClick={() => setSelectedIcon(ic)}
                                    aria-label={`انتخاب آیکون ${ic}`}
                                    aria-pressed={selectedIcon === ic}
                                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border transition cursor-pointer ${
                                        selectedIcon === ic
                                            ? 'bg-primary/15 border-primary scale-105'
                                            : 'bg-surface-container-low border-[var(--border-subtle)] hover:bg-surface-container'
                                    }`}
                                >
                                    {ic}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-[var(--text-secondary)] mb-2 block">حوزه‌های پیشنهادی</span>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 custom-scrollbar">
                            {suggestedSubjects.map(([subjectName, style]) => (
                                <button
                                    key={subjectName}
                                    type="button"
                                    onClick={() => handleSelectSuggested(subjectName)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                        name === subjectName
                                            ? 'bg-primary/12 border-primary/40 text-primary'
                                            : 'bg-surface-container-low border-[var(--border-subtle)] text-on-surface hover:bg-surface-container'
                                    }`}
                                >
                                    <span>{style.icon}</span>
                                    <span>{subjectName}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl border border-[var(--border-subtle)]">
                        <div className={`w-14 h-14 rounded-2xl ${previewTokens.softBg} ${previewTokens.text} flex items-center justify-center text-2xl shrink-0`}>
                            {selectedIcon}
                        </div>
                        <div className="min-w-0">
                            <p className="font-extrabold text-on-surface truncate">{name || 'دسته جدید'}</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">پیش‌نمایش کارت دسته‌بندی</p>
                        </div>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-[var(--text-secondary)] mb-2 block">انتخاب رنگ</span>
                        <div className="flex flex-wrap gap-2">
                            {colors.map((color) => {
                                const swatchToken = getColorTokens(color);
                                return (
                                    <button
                                        key={color}
                                        type="button"
                                        aria-label={`رنگ ${color}`}
                                        aria-pressed={selectedColor === color}
                                        onClick={() => setSelectedColor(color)}
                                        className={`w-9 h-9 rounded-xl ${swatchToken.swatch} transition-all cursor-pointer ${
                                            selectedColor === color ? 'ring-2 ring-offset-2 ring-primary scale-105' : 'hover:scale-105'
                                        }`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
        </ModalSheet>
    );
};

// === نمای تب‌ها ===
type ViewMode = 'subjects' | 'daily' | 'table' | 'kanban' | 'eisenhower' | 'monthly';

const Subjects = () => {
    const {
        toggleTask,
        tasks,
        addTask,
        updateTask,
        deleteTask,
        askConfirm,
        getDayDate,
        subjects,
        addSubject,
        updateSubject,
        deleteSubject,
        reorderSubjects,
        settings,
        todayDayId,
        currentDay,
    } = useStore();
    const prefersReducedMotion = useReducedMotion();
    const { startFocusForTask } = useFocus();
    const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<SubjectTask | null>(null);
    const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>(undefined);
    const [modalDefaultStatus, setModalDefaultStatus] = useState<SubjectTaskStatus>('todo');
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<CustomSubject | null>(null);
    const [activeView, setActiveView] = useState<ViewMode>('subjects');
    const [pendingView, setPendingView] = useState<ViewMode>('subjects');
    const [, startTransition] = useTransition();

    const handleSwitchView = (nextView: ViewMode) => {
        setPendingView(nextView);
        startTransition(() => setActiveView(nextView));
    };

    // === Drag & Drop State ===
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [draggedSubjectId, setDraggedSubjectId] = useState<string | null>(null);

    const currentStream = settings?.stream || 'life';
    const isAcademicStream = currentStream === 'riazi' || currentStream === 'tajrobi' || currentStream === 'ensani';
    const streamSubjects = SUBJECT_LISTS[currentStream] || [];
    const [onlySpecialized, setOnlySpecialized] = useState(true);

    const displayedSubjects = useMemo(() => subjects.filter((s) => {
        if (!isAcademicStream) return true;
        if (s.name === 'شخصی') return true;
        const isDefault = Object.keys(SUBJECT_ICONS).includes(s.name);
        if (isDefault) {
            const inStream = streamSubjects.includes(s.name) || SUBJECT_LISTS['general'].includes(s.name);
            if (!inStream) return false;

            if (onlySpecialized) {
                const isSpecial = isSpecializedSubject(currentStream, s.name);
                if (!isSpecial) return false;
            }
            return true;
        }
        return true;
    }), [subjects, isAcademicStream, streamSubjects, onlySpecialized, currentStream]);

    const tasksBySubjectMap = useMemo(() => {
        const map = new Map<string, SubjectTask[]>();
        for (const t of tasks) {
            const list = map.get(t.subject);
            if (list) list.push(t);
            else map.set(t.subject, [t]);
        }
        map.forEach((list) => list.sort((a, b) => a.dayId - b.dayId));
        return map;
    }, [tasks]);

    const getSubjectTasks = (subjectName: string) => tasksBySubjectMap.get(subjectName) || [];

    const handleSaveTask = (taskData: Partial<SubjectTask>) => {
        if (editingTask) {
            updateTask({ ...editingTask, ...taskData } as SubjectTask);
        } else {
            const newTask: SubjectTask = {
                id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                dayId: taskData.dayId || currentDay || 1,
                date: taskData.date || modalDefaultDate || toIsoString(new Date()),
                subject: taskData.subject || subjects[0]?.name || 'عمومی',
                topic: taskData.topic || 'مطالعه جدید',
                details: taskData.details || 'مطالعه',
                isCompleted: modalDefaultStatus === 'completed' || !!taskData.isCompleted,
                status: taskData.status || modalDefaultStatus || 'todo',
                studyType: taskData.studyType || 'study',
                priority: taskData.priority || 'medium',
                durationMinutes: taskData.durationMinutes ?? 60,
                startTime: taskData.startTime,
                isMIT: taskData.isMIT,
                blocks: taskData.blocks,
                testRange: taskData.testRange,
                subTasks: taskData.subTasks,
                tags: taskData.tags,
                qualityRating: taskData.qualityRating,
                actualDuration: taskData.actualDuration,
                isCustom: true,
            };
            addTask(newTask);
        }
        setModalDefaultDate(undefined);
        setModalDefaultStatus('todo');
    };

    const openEdit = (e: React.MouseEvent, task: SubjectTask) => {
        e.stopPropagation();
        setModalDefaultDate(undefined);
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const openQuickAdd = (status: SubjectTaskStatus = 'todo', isoDate?: string) => {
        setEditingTask(null);
        setModalDefaultStatus(status);
        setModalDefaultDate(isoDate);
        setIsModalOpen(true);
    };

    // WWDC26 Agency & Forgiveness: Immediate delete with non-blocking Undo Toast handled by StoreContext.deleteTask
    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteTask(id);
    };

    const handleSaveSubject = (subject: CustomSubject) => {
        if (editingSubject) updateSubject(subject);
        else addSubject(subject);
    };

    const handleEditSubject = (e: React.MouseEvent, subject: CustomSubject) => {
        e.stopPropagation();
        setEditingSubject(subject);
        setIsSubjectModalOpen(true);
    };

    const handleDeleteSubject = (e: React.MouseEvent, subject: CustomSubject) => {
        e.stopPropagation();
        askConfirm(
            'حذف دسته‌بندی',
            `آیا از حذف «${subject.name}» اطمینان دارید؟`,
            () => {
                deleteSubject(subject.id);
            },
            'danger'
        );
    };

    const moveSubjectByOffset = (e: React.MouseEvent, subjectId: string, direction: -1 | 1) => {
        e.stopPropagation();
        const currentDisplayedIdx = displayedSubjects.findIndex((s) => s.id === subjectId);
        const targetDisplayedIdx = currentDisplayedIdx + direction;
        if (currentDisplayedIdx < 0 || targetDisplayedIdx < 0 || targetDisplayedIdx >= displayedSubjects.length) return;

        const targetSubjectId = displayedSubjects[targetDisplayedIdx].id;
        const sourceIndex = subjects.findIndex((s) => s.id === subjectId);
        const targetIndex = subjects.findIndex((s) => s.id === targetSubjectId);
        if (sourceIndex === -1 || targetIndex === -1) return;

        const next = [...subjects];
        const [removed] = next.splice(sourceIndex, 1);
        next.splice(targetIndex, 0, removed);
        reorderSubjects(next);
    };

    const openAddSubject = () => {
        setEditingSubject(null);
        setIsSubjectModalOpen(true);
    };

    // === Drag & Drop Handlers ===
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
        e.preventDefault();
        if (!draggedTaskId || draggedTaskId === targetTaskId) return;

        const draggedTask = tasks.find((t) => t.id === draggedTaskId);
        const targetTask = tasks.find((t) => t.id === targetTaskId);
        if (!draggedTask || !targetTask) return;

        updateTask({ ...draggedTask, dayId: targetTask.dayId, date: targetTask.date });
        setDraggedTaskId(null);
    };

    const handleDragEnd = () => {
        setDraggedTaskId(null);
    };

    // === Subject Drag & Drop ===
    const handleSubjectDragStart = (e: React.DragEvent, subjectId: string) => {
        setDraggedSubjectId(subjectId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', subjectId);
    };

    const handleSubjectDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleSubjectDrop = (e: React.DragEvent, targetSubjectId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedSubjectId || draggedSubjectId === targetSubjectId) return;

        const sourceIndex = subjects.findIndex((s) => s.id === draggedSubjectId);
        const targetIndex = subjects.findIndex((s) => s.id === targetSubjectId);

        if (sourceIndex === -1 || targetIndex === -1) return;

        const newSubjects = [...subjects];
        const [removed] = newSubjects.splice(sourceIndex, 1);
        newSubjects.splice(targetIndex, 0, removed);

        reorderSubjects(newSubjects);
        setDraggedSubjectId(null);
    };

    const handleSubjectDragEnd = () => {
        setDraggedSubjectId(null);
    };

    // === نمای روزانه: گروه‌بندی تسک‌ها بر اساس تاریخ ===
    const tasksByDate = useMemo(() => {
        const groups: Record<string, SubjectTask[]> = {};
        tasks.forEach((t) => {
            const key = t.date || 'بدون تاریخ';
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });
        return Object.entries(groups)
            .sort(([a], [b]) => a.localeCompare(b))
            .filter(([date]) => {
                const today = new Date();
                const d = new Date(date);
                const diffDays = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays >= -3 && diffDays <= 7;
            });
    }, [tasks]);

    const VIEW_TABS: { id: ViewMode; label: string; icon: React.ElementType }[] = [
        { id: 'subjects', label: isAcademicStream ? 'دروس' : 'حوزه‌ها', icon: LayoutGrid },
        { id: 'daily', label: 'روزانه', icon: List },
        { id: 'table', label: 'جدول', icon: TableIcon },
        { id: 'kanban', label: 'کانبان', icon: KanbanIcon },
        { id: 'eisenhower', label: 'آیزنهاور', icon: MatrixIcon },
        { id: 'monthly', label: 'تقویم', icon: Calendar },
    ];

    // ===== رندر تسک =====
    const renderTask = (task: SubjectTask, subjectStyle: { color: string; icon: string }) => {
        const isDone = task.isCompleted;
        const tokens = getColorTokens(subjectStyle.color);
        return (
            <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, task.id)}
                onDragEnd={handleDragEnd}
                className={`group px-3.5 py-3 flex items-start gap-2.5 transition-colors border-b border-[var(--border-subtle)] last:border-0 hover:bg-surface-container-low relative ${
                    isDone ? 'bg-surface-container-low/60' : 'bg-transparent'
                } ${draggedTaskId === task.id ? 'opacity-50 scale-[0.99]' : ''}`}
            >
                <div className="hidden sm:flex mt-2 text-[var(--text-tertiary)] cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                    <GripVertical size={14} />
                </div>

                <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    aria-label={isDone ? `لغو انجام ${task.topic}` : `تکمیل ${task.topic}`}
                    className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl transition cursor-pointer shrink-0 ${
                        isDone ? tokens.text : 'text-[var(--text-tertiary)] hover:text-primary'
                    }`}
                >
                    {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} strokeWidth={2} />}
                </button>

                <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    className={`flex-1 min-w-0 text-right py-0.5 cursor-pointer transition-opacity ${isDone ? 'opacity-60' : ''}`}
                >
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-bold text-[var(--text-secondary)] tabular-nums">
                                روز {formatToPersianDigits(task.dayId)} ({getDayDate(task.dayId)})
                            </span>
                            {task.dayId === todayDayId && (
                                <span className="text-[10px] bg-primary text-on-primary px-1.5 py-0.5 rounded-md font-bold">
                                    امروز
                                </span>
                            )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${tokens.softBadge}`}>
                            {task.details}
                        </span>
                    </div>
                    <p className={`text-sm text-on-surface font-bold leading-5 ${isDone ? 'line-through' : ''}`}>
                        {task.topic}
                    </p>
                    {task.testRange && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono bg-surface-container-low inline-block px-1.5 py-0.5 rounded-md border border-[var(--border-subtle)]">
                            {task.testRange}
                        </p>
                    )}
                </button>

                {task.dayId === todayDayId && (
                    <div className="absolute right-0 top-2.5 bottom-2.5 w-1 bg-primary rounded-l-full" aria-hidden="true" />
                )}

                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {!isDone && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                startFocusForTask(task);
                            }}
                            title="شروع تمرکز"
                            aria-label="شروع تمرکز"
                            className="w-9 h-9 flex items-center justify-center text-primary hover:bg-primary/10 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] cursor-pointer transition"
                        >
                            <FocusPlayIcon size={14} fill="currentColor" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={(e) => openEdit(e, task)}
                        aria-label="ویرایش تسک"
                        className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-primary hover:bg-surface-container bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] cursor-pointer transition"
                    >
                        <Pencil size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleDelete(e, task.id)}
                        aria-label="حذف تسک"
                        className="w-9 h-9 flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] cursor-pointer transition"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 max-app-container pb-32">
            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
                initialData={editingTask}
                currentDayId={currentDay || 1}
                defaultDateStr={modalDefaultDate}
            />
            <SubjectModal
                isOpen={isSubjectModalOpen}
                onClose={() => setIsSubjectModalOpen(false)}
                onSave={handleSaveSubject}
                editingSubject={editingSubject}
                existingSubjectNames={subjects.map((s) => s.name)}
            />

            {/* هدر + تب‌ها */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-primary text-on-primary rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                        <LayoutGrid size={21} />
                    </div>
                    <div>
                        <h1 className="text-lg xs:text-xl md:text-2xl font-black text-on-surface">
                            {isAcademicStream ? 'مدیریت دروس و برنامه‌ها' : 'حوزه‌های زندگی، کار و پروژه‌ها'}
                        </h1>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">
                            {isAcademicStream
                                ? 'وضعیت مطالعه و تست‌ها به تفکیک درس'
                                : 'سازمان‌دهی همه اهداف، کارها و پروژه‌ها در ۶ نمای یکپارچه'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                    {/* تب‌های نمایش */}
                    <LayoutGroup id="subjects-view-tabs">
                        <div
                            role="tablist"
                            aria-label="نمای مدیریت تسک‌ها"
                            className="flex items-center bg-surface-container squircle-sm p-1 gap-1 max-w-full overflow-x-auto no-scrollbar border border-[var(--border-subtle)]"
                        >
                            {VIEW_TABS.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = pendingView === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => {
                                            haptics.selection();
                                            handleSwitchView(tab.id);
                                        }}
                                        className={`relative min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 whitespace-nowrap active:scale-95 shrink-0 cursor-pointer ${
                                            isActive
                                                ? 'text-primary'
                                                : 'text-[var(--text-secondary)] hover:text-on-surface'
                                        }`}
                                    >
                                        {isActive && (
                                            <motion.span
                                                layoutId="subjectsViewActivePill"
                                                transition={prefersReducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                                                aria-hidden="true"
                                                className="absolute inset-0 rounded-xl bg-[var(--surface-elevated)] shadow-sm"
                                            />
                                        )}
                                        <Icon size={14} className="relative z-10" />
                                        <span className="relative z-10">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </LayoutGroup>

                    {isAcademicStream && activeView === 'subjects' && (
                        <button
                            type="button"
                            aria-pressed={onlySpecialized}
                            onClick={() => setOnlySpecialized(!onlySpecialized)}
                            className={`min-h-[40px] text-xs px-3.5 py-2 rounded-xl font-bold transition-all border shrink-0 active:scale-95 cursor-pointer ${
                                onlySpecialized
                                    ? 'bg-primary/10 text-primary border-primary/25'
                                    : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                            }`}
                        >
                            {onlySpecialized ? 'فقط دروس تخصصی' : 'همه دسته‌ها'}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={openAddSubject}
                        className="min-h-[44px] flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-xl font-bold text-xs shadow-sm hover:opacity-95 transition-all active:scale-95 shrink-0 cursor-pointer"
                    >
                        <Plus size={16} />
                        {isAcademicStream ? 'درس جدید' : 'دسته جدید'}
                    </button>
                </div>
            </div>

            {/* ===== نمای ۱: دروس / حوزه‌ها ===== */}
            {activeView === 'subjects' && (
                <div className="space-y-3.5">
                    {displayedSubjects.map((subject, idx) => {
                        const subjectName = subject.name;
                        const subjectTasks = getSubjectTasks(subjectName);
                        const tokens = getColorTokens(subject.color);
                        const style = { icon: subject.icon, color: subject.color, bgColor: tokens.softBg };
                        const completedCount = subjectTasks.filter((t) => t.isCompleted).length;
                        const progress = subjectTasks.length > 0 ? Math.round((completedCount / subjectTasks.length) * 100) : 0;
                        const isExpanded = expandedSubject === subjectName;
                        const isOriginalDefault = Object.keys(SUBJECT_ICONS).includes(subjectName) && subjectName !== 'شخصی';

                        return (
                            <div
                                key={subject.id}
                                draggable
                                onDragStart={(e) => handleSubjectDragStart(e, subject.id)}
                                onDragOver={handleSubjectDragOver}
                                onDrop={(e) => handleSubjectDrop(e, subject.id)}
                                onDragEnd={handleSubjectDragEnd}
                                className={`bg-[var(--surface-elevated)] squircle-card border border-[var(--border-subtle)] shadow-xs overflow-hidden transition-all duration-200 ${
                                    draggedSubjectId === subject.id ? 'opacity-50 scale-[0.99] border-primary border-dashed' : ''
                                }`}
                            >
                                <div className="p-3.5 sm:p-4 flex items-center justify-between gap-2 hover:bg-surface-container-low transition-colors">
                                    <button
                                        type="button"
                                        aria-expanded={isExpanded}
                                        onClick={() => setExpandedSubject(isExpanded ? null : subjectName)}
                                        className="flex-1 min-w-0 flex items-center justify-between gap-3 text-right cursor-pointer min-h-[44px] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={`w-11 h-11 squircle-sm ${style.bgColor} flex items-center justify-center text-xl shrink-0`}
                                                aria-hidden="true"
                                            >
                                                {style.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-extrabold text-on-surface text-base sm:text-lg truncate">
                                                        {subjectName}
                                                    </h3>
                                                    {!isOriginalDefault && (
                                                        <span className="text-[10px] bg-surface-container text-[var(--text-secondary)] px-1.5 py-0.5 rounded-md font-bold shrink-0">
                                                            سفارشی
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-[var(--text-secondary)] font-medium tabular-nums">
                                                    {formatToPersianDigits(completedCount)} از {formatToPersianDigits(subjectTasks.length)} انجام شده
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="text-xs font-extrabold text-[var(--text-secondary)] tabular-nums min-w-[32px] text-left">
                                                {formatToPersianDigits(progress)}٪
                                            </span>
                                            {isExpanded ? (
                                                <ChevronUp size={18} className="text-[var(--text-secondary)]" aria-hidden="true" />
                                            ) : (
                                                <ChevronDown size={18} className="text-[var(--text-secondary)]" aria-hidden="true" />
                                            )}
                                        </div>
                                    </button>

                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <button
                                            type="button"
                                            disabled={idx === 0}
                                            aria-label={`انتقال ${subjectName} به بالا`}
                                            onClick={(e) => moveSubjectByOffset(e, subject.id, -1)}
                                            className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-primary hover:bg-surface-container rounded-lg transition disabled:opacity-25 cursor-pointer"
                                        >
                                            <ArrowUp size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={idx === displayedSubjects.length - 1}
                                            aria-label={`انتقال ${subjectName} به پایین`}
                                            onClick={(e) => moveSubjectByOffset(e, subject.id, 1)}
                                            className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-primary hover:bg-surface-container rounded-lg transition disabled:opacity-25 cursor-pointer"
                                        >
                                            <ArrowDown size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`ویرایش ${subjectName}`}
                                            onClick={(e) => handleEditSubject(e, subject)}
                                            className="w-10 h-10 flex items-center justify-center text-[var(--text-secondary)] hover:text-primary hover:bg-surface-container rounded-xl transition cursor-pointer"
                                        >
                                            <Pencil size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`حذف ${subjectName}`}
                                            onClick={(e) => handleDeleteSubject(e, subject)}
                                            className="w-10 h-10 flex items-center justify-center text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition cursor-pointer"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>

                                <div className="h-1.5 w-full bg-surface-container">
                                    <div
                                        className={`h-full ${tokens.bar} transition-all duration-500`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>

                                {isExpanded && (
                                    <div className="bg-surface-container-low/40 divide-y divide-[var(--border-subtle)]">
                                        {subjectTasks.length === 0 ? (
                                            <div className="p-6 text-center space-y-3">
                                                <p className="text-[var(--text-secondary)] text-sm font-medium">
                                                    هنوز تسکی برای «{subjectName}» ثبت نشده است.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => openQuickAdd('todo')}
                                                    className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-95 transition cursor-pointer"
                                                >
                                                    <Plus size={14} />
                                                    افزودن تسک جدید
                                                </button>
                                            </div>
                                        ) : (
                                            subjectTasks.map((task) => renderTask(task, style))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ===== نمای ۲: روزانه ===== */}
            {activeView === 'daily' && (
                <div className="space-y-5">
                    {tasksByDate.length === 0 ? (
                        <div className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-[22px] text-center py-12 px-5 space-y-3">
                            <p className="text-[var(--text-secondary)] text-sm font-medium">
                                تسکی در بازه روزهای اخیر و پیش‌رو ثبت نشده است.
                            </p>
                            <button
                                type="button"
                                onClick={() => openQuickAdd('todo', toIsoString(new Date()))}
                                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-95 transition cursor-pointer"
                            >
                                <Plus size={15} />
                                افزودن تسک برای امروز
                            </button>
                        </div>
                    ) : (
                        tasksByDate.map(([date, dateTasks]) => {
                            const isToday = date === toIsoString(new Date());
                            const completedCount = dateTasks.filter((t) => t.isCompleted).length;
                            return (
                                <div
                                    key={date}
                                    className={`bg-[var(--surface-elevated)] rounded-[22px] border overflow-hidden transition-all ${
                                        isToday ? 'border-primary/40 shadow-sm' : 'border-[var(--border-subtle)] shadow-xs'
                                    }`}
                                >
                                    <div
                                        className={`px-4 py-3 flex items-center justify-between ${
                                            isToday ? 'bg-primary/8' : 'bg-surface-container-low'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isToday && <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />}
                                            <h3 className={`text-sm font-extrabold ${isToday ? 'text-primary' : 'text-on-surface'}`}>
                                                {isToday ? 'امروز' : getShamsiDate(date)}
                                            </h3>
                                            <span className="text-[11px] text-[var(--text-secondary)] font-mono tabular-nums" dir="ltr">
                                                {date}
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold text-[var(--text-secondary)] tabular-nums">
                                            {formatToPersianDigits(completedCount)}/{formatToPersianDigits(dateTasks.length)}
                                        </span>
                                    </div>
                                    <div className="divide-y divide-[var(--border-subtle)]">
                                        {dateTasks.map((task) => {
                                            const st = getSubjectStyle(task.subject);
                                            return renderTask(task, st);
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ===== نمای ۳: جدول جامع ===== */}
            {activeView === 'table' && (
                <TableView tasks={tasks} onEdit={openEdit} onDelete={handleDelete} />
            )}

            {/* ===== نمای ۴: تخته کانبان ===== */}
            {activeView === 'kanban' && (
                <KanbanView
                    tasks={tasks}
                    onEdit={openEdit}
                    onAddQuick={(status) => openQuickAdd(status)}
                />
            )}

            {/* ===== نمای ۵: ماتریس اولویت آیزنهاور ===== */}
            {activeView === 'eisenhower' && (
                <EisenhowerMatrixView tasks={tasks} onEdit={openEdit} />
            )}

            {/* ===== نمای ۶: تقویم هفتگی و ماهانه شمسی ===== */}
            {activeView === 'monthly' && (
                <MonthlyCalendarView
                    tasks={tasks}
                    onEdit={openEdit}
                    onAddOnDate={(iso) => openQuickAdd('todo', iso)}
                />
            )}
        </div>
    );
};

export default Subjects;
