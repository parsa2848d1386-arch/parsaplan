
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Subject, SubjectTask, getSubjectStyle, SUBJECT_ICONS, CustomSubject, SUBJECT_LISTS } from '../types';
import { ChevronDown, ChevronUp, Circle, CheckCircle2, Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import TaskModal from '../components/TaskModal';

// Modal for adding/editing custom subjects
const SubjectModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (subject: CustomSubject) => void;
    editingSubject?: CustomSubject | null;
    existingSubjectNames: string[];
}> = ({ isOpen, onClose, onSave, editingSubject, existingSubjectNames }) => {
    const [name, setName] = useState(editingSubject?.name || '');
    const [selectedIcon, setSelectedIcon] = useState(editingSubject?.icon || '📚');
    const [selectedColor, setSelectedColor] = useState(editingSubject?.color || 'gray');

    React.useEffect(() => {
        if (editingSubject) {
            setName(editingSubject.name);
            setSelectedIcon(editingSubject.icon);
            setSelectedColor(editingSubject.color);
        } else {
            setName('');
            setSelectedIcon('📚');
            setSelectedColor('gray');
        }
    }, [editingSubject, isOpen]);

    const suggestedSubjects = Object.entries(SUBJECT_ICONS).filter(
        ([key]) => !existingSubjectNames.includes(key) && key !== 'شخصی'
    );

    const colors = ['emerald', 'violet', 'orange', 'blue', 'amber', 'cyan', 'indigo', 'purple', 'pink', 'teal', 'red', 'rose', 'green', 'sky'];

    if (!isOpen) return null;

    const handleSave = () => {
        if (!name.trim()) return;
        onSave({
            id: editingSubject?.id || crypto.randomUUID(),
            name: name.trim(),
            icon: selectedIcon,
            color: selectedColor
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                        {editingSubject ? 'ویرایش درس' : 'افزودن درس جدید'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                    {/* Name Input */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">نام درس</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="مثال: زبان انگلیسی"
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition text-gray-800 dark:text-white"
                            dir="rtl"
                        />
                    </div>

                    {/* Suggested Subjects */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">دروس پیشنهادی</label>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                            {suggestedSubjects.map(([subjectName, style]) => (
                                <button
                                    key={subjectName}
                                    onClick={() => handleSelectSuggested(subjectName)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${name === subjectName
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    <span>{style.icon}</span>
                                    <span>{subjectName}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selected Icon Preview */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                        <div className={`w-16 h-16 rounded-2xl bg-${selectedColor}-100 dark:bg-${selectedColor}-900/30 text-${selectedColor}-600 dark:text-${selectedColor}-400 flex items-center justify-center text-2xl`}>
                            {selectedIcon}
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 dark:text-white">{name || 'درس جدید'}</p>
                            <p className="text-xs text-gray-500">پیش‌نمایش</p>
                        </div>
                    </div>

                    {/* Color Selector */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">انتخاب رنگ</label>
                        <div className="flex flex-wrap gap-2">
                            {colors.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    className={`w-8 h-8 rounded-lg bg-${color}-500 transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                        انصراف
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Check size={18} />
                        ذخیره
                    </button>
                </div>
            </div>
        </div>
    );
};

const Subjects = () => {
    const { toggleTask, tasks, updateTask, deleteTask, getDayDate, subjects, addSubject, updateSubject, deleteSubject, settings } = useStore();
    const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<SubjectTask | null>(null);
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<CustomSubject | null>(null);

    // Filter logic
    const currentStream = settings?.stream || 'general';
    const streamSubjects = SUBJECT_LISTS[currentStream] || [];

    const displayedSubjects = subjects.filter(s => {
        // Always show custom subjects
        if (s.name === 'شخصی') return true;

        // If it's a default subject (exists in SUBJECT_ICONS)
        const isDefault = Object.keys(SUBJECT_ICONS).includes(s.name);

        if (isDefault) {
            // Only show if it belongs to the current stream
            const isStandard = streamSubjects.includes(s.name);
            const isGeneral = SUBJECT_LISTS['general'].includes(s.name);
            return isStandard || isGeneral;
        }

        // It's a custom user added subject
        return true;
    });

    const getSubjectTasks = (subjectName: string) => {
        return tasks.filter(t => t.subject === subjectName).sort((a, b) => a.dayId - b.dayId);
    };

    const handleSaveTask = (taskData: Partial<SubjectTask>) => {
        if (editingTask) {
            updateTask({ ...editingTask, ...taskData } as SubjectTask);
        }
    };

    const openEdit = (e: React.MouseEvent, task: SubjectTask) => {
        e.stopPropagation();
        setEditingTask(task);
        setIsModalOpen(true);
    }

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteTask(id);
    }

    const handleSaveSubject = (subject: CustomSubject) => {
        if (editingSubject) {
            updateSubject(subject);
        } else {
            addSubject(subject);
        }
    };

    const handleEditSubject = (e: React.MouseEvent, subject: CustomSubject) => {
        e.stopPropagation();
        setEditingSubject(subject);
        setIsSubjectModalOpen(true);
    };

    const handleDeleteSubject = (e: React.MouseEvent, subjectId: string) => {
        e.stopPropagation();
        deleteSubject(subjectId);
    };

    const openAddSubject = () => {
        setEditingSubject(null);
        setIsSubjectModalOpen(true);
    };

    return (
        <div className="p-5 pb-32">
            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
                initialData={editingTask}
                currentDayId={1}
            />

            <SubjectModal
                isOpen={isSubjectModalOpen}
                onClose={() => setIsSubjectModalOpen(false)}
                onSave={handleSaveSubject}
                editingSubject={editingSubject}
                existingSubjectNames={subjects.map(s => s.name)}
            />

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">بودجه‌بندی دروس</h1>
                <button
                    onClick={openAddSubject}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition active:scale-95"
                >
                    <Plus size={16} />
                    درس جدید
                </button>
            </div>

            <div className="space-y-4">
                {displayedSubjects.map(subject => {
                    const subjectName = subject.name;
                    const subjectTasks = getSubjectTasks(subjectName);

                    // Style is now straightforward from the subject object
                    const style = {
                        icon: subject.icon,
                        color: subject.color,
                        bgColor: `bg-${subject.color}-50 dark:bg-${subject.color}-900/30`
                    };

                    const completedCount = subjectTasks.filter(t => t.isCompleted).length;
                    const progress = subjectTasks.length > 0 ? Math.round((completedCount / subjectTasks.length) * 100) : 0;
                    const isExpanded = expandedSubject === subjectName;

                    // We can check if it's one of the original defaults to know "isCustom" tag usage, 
                    // or just drop the tag since everything is dynamic now. 
                    // Letting user delete defaults means "Custom" distinction is less relevant.
                    // But maybe we keep badge for non-standard ones?
                    // For now, let's show badge if it's NOT in the original SUBJECT_ICONS list (excluding Custom)
                    const isOriginalDefault = Object.keys(SUBJECT_ICONS).includes(subjectName) && subjectName !== 'شخصی';
                    const showEditControls = true; // Always allow edit/delete now!

                    return (
                        <div key={subject.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                            <div
                                onClick={() => setExpandedSubject(isExpanded ? null : subjectName)}
                                className="p-4 flex items-center justify-between cursor-pointer active:bg-gray-50 dark:active:bg-gray-700 select-none"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl ${style.bgColor} flex items-center justify-center text-2xl`}>
                                        {style.icon}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-800 dark:text-white text-lg">{subjectName}</h3>
                                            {!isOriginalDefault && (
                                                <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">سفارشی</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{completedCount} از {subjectTasks.length} انجام شده</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1">
                                        <button
                                            onClick={(e) => handleEditSubject(e, subject)}
                                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteSubject(e, subject.id)}
                                            className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="text-xs font-bold text-gray-400">{progress}%</div>
                                    {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                </div>
                            </div>

                            {/* Progress Bar Line */}
                            <div className="h-1.5 w-full bg-gray-50 dark:bg-gray-700">
                                <div className={`h-full bg-${style.color}-500 transition-all duration-500`} style={{ width: `${progress}%` }}></div>
                            </div>

                            {isExpanded && (
                                <div className="bg-gray-50/50 dark:bg-gray-900/30 divide-y divide-gray-100 dark:divide-gray-700">
                                    {subjectTasks.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <p className="text-gray-400 text-sm">هیچ تسکی برای این درس ثبت نشده</p>
                                        </div>
                                    ) : (
                                        subjectTasks.map(task => {
                                            const isDone = task.isCompleted;
                                            return (
                                                <div
                                                    key={task.id}
                                                    onClick={() => toggleTask(task.id)}
                                                    className={`group p-4 flex items-start gap-3 transition-all duration-200 hover:bg-white dark:hover:bg-gray-800 cursor-pointer relative ${isDone ? 'bg-gray-50/80 dark:bg-gray-800/50' : ''}`}
                                                >
                                                    <div className={`mt-1 transition-all duration-300 ${isDone ? `text-${style.color}-500 scale-110` : 'text-gray-300 dark:text-gray-600 hover:text-gray-400'}`}>
                                                        {isDone ? <CheckCircle2 size={20} fill="currentColor" className="text-white dark:text-gray-800" /> : <Circle size={20} strokeWidth={2} />}
                                                    </div>
                                                    <div className={`flex-1 transition-all duration-500 pl-10 ${isDone ? 'opacity-50 grayscale' : ''}`}>
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[10px] font-bold text-gray-400">روز {task.dayId} ({getDayDate(task.dayId)})</span>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold bg-${style.color}-100 dark:bg-${style.color}-900/30 text-${style.color}-800 dark:text-${style.color}-300`}>{task.details}</span>
                                                        </div>
                                                        <p className={`text-sm text-gray-800 dark:text-gray-200 font-bold leading-5 transition-all ${isDone ? 'line-through' : ''}`}>{task.topic}</p>
                                                        {task.testRange && <p className="text-xs text-gray-500 mt-1 font-mono bg-white dark:bg-gray-700 inline-block px-1 rounded border border-gray-100 dark:border-gray-600">{task.testRange}</p>}
                                                    </div>

                                                    {/* Edit controls */}
                                                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity pl-1 absolute left-2 top-4">
                                                        <button
                                                            onClick={(e) => openEdit(e, task)}
                                                            className="text-blue-500 hover:text-blue-700 bg-white dark:bg-gray-700 p-1 rounded-md shadow-sm border border-gray-100 dark:border-gray-600"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(e, task.id)}
                                                            className="text-rose-500 hover:text-rose-700 bg-white dark:bg-gray-700 p-1 rounded-md shadow-sm border border-gray-100 dark:border-gray-600"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Subjects;
