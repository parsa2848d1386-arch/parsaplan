import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Subject, SubjectTask, SUBJECT_ICONS, StudyType, SubTask, SUBJECT_LISTS } from '../types';
import { useStore } from '../context/StoreContext';
import { useUI } from '../context/UIContext';
import { X, Clock, Star, Target, Calendar, CheckCircle2, Tag, CalendarClock, ChevronRight, ChevronLeft, LayoutGrid, List, Beaker, BookOpen, Search, GraduationCap } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Partial<SubjectTask>) => void;
    initialData?: SubjectTask | null;
    currentDayId: number;
    defaultDateStr?: string;
}

const STUDY_TYPES: { id: StudyType; label: string; icon: any }[] = [
    { id: 'study', label: 'مطالعه', icon: BookOpen },
    { id: 'test_educational', label: 'تست آموزشی', icon: Beaker },
    { id: 'test_speed', label: 'تست سرعتی', icon: Clock },
    { id: 'review', label: 'مرور', icon: CalendarClock },
    { id: 'exam', label: 'آزمون', icon: GraduationCap },
    { id: 'analysis', label: 'تحلیل آزمون', icon: Search },
];

const TaskModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData, currentDayId, defaultDateStr }) => {
    const { scheduleReview, totalDays, subjects: customSubjects, settings, startDate } = useStore();
    const navigate = useNavigate();
    const { showToast } = useUI();
    const [formData, setFormData] = useState<Partial<SubjectTask>>({});
    const [tab, setTab] = useState<'info' | 'report'>('info');
    const [tagInput, setTagInput] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Exam Mode State
    const [selectedExamSubjects, setSelectedExamSubjects] = useState<string[]>([]);
    const [subTaskInputs, setSubTaskInputs] = useState<Record<string, { topic: string, details?: string }>>({});

    useEffect(() => {
        if (isOpen) {
            setTab('info');
            if (initialData) {
                setFormData(initialData);
                if (initialData.isCompleted) setTab('report');

                // Restore Exam State
                if ((initialData.studyType === 'exam' || initialData.studyType === 'analysis') && initialData.subTasks) {
                    setSelectedExamSubjects(initialData.subTasks.map(s => s.subject));
                    const inputs: any = {};
                    initialData.subTasks.forEach(s => {
                        inputs[s.subject] = { topic: s.topic };
                    });
                    setSubTaskInputs(inputs);
                }
            } else {
                setFormData({
                    dayId: currentDayId,
                    date: defaultDateStr,
                    subject: Subject.Custom,
                    topic: '',
                    details: '',
                    testRange: '',
                    isCompleted: false,
                    isCustom: true,
                    qualityRating: 3,
                    actualDuration: 0,
                    testStats: { correct: 0, wrong: 0, total: 0 },
                    tags: [],
                    studyType: 'study'
                });
                setSelectedExamSubjects([]);
                setSubTaskInputs({});
            }
        }
    }, [isOpen, initialData, currentDayId, defaultDateStr]);

    if (!isOpen) return null;

    const isExamMode = formData.studyType === 'exam' || formData.studyType === 'analysis';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation & Error Categorization
        if (isExamMode) {
            if (selectedExamSubjects.length === 0) {
                showToast('لطفاً حداقل یک درس برای آزمون انتخاب کنید!', 'error');
                return;
            }
        } else {
            if (!formData.topic || formData.topic.trim() === '') {
                showToast('لطفاً مبحث (Topic) را وارد کنید!', 'error');
                return;
            }
            if (!formData.details || formData.details.trim() === '') {
                showToast('لطفاً جزئیات (مثلاً تعداد تست) را وارد کنید!', 'warning');
                return;
            }
            if (!formData.subject) {
                showToast('لطفاً یک درس انتخاب کنید!', 'error');
                return;
            }
        }

        if (isExamMode) {
            // Build subTasks
            const subTasks: SubTask[] = selectedExamSubjects.map(subj => ({
                id: crypto.randomUUID(),
                subject: subj,
                topic: subTaskInputs[subj]?.topic || 'جامع',
                testStats: { correct: 0, wrong: 0, total: 0 } // Default stats
            }));

            // For main task display, use first subject or generic
            const mainSubject = selectedExamSubjects.length === 1 ? selectedExamSubjects[0] : (formData.studyType === 'exam' ? 'آزمون جامع' : 'تحلیل آزمون');
            const mainTopic = selectedExamSubjects.length > 1 ? `${selectedExamSubjects.length} درس` : (subTaskInputs[selectedExamSubjects[0]]?.topic || '');

            onSave({
                ...formData,
                subject: mainSubject,
                topic: mainTopic,
                subTasks: subTasks
            });
        } else {
            onSave(formData);
        }
        onClose();
    };

    const toggleStar = (rating: number) => {
        setFormData({ ...formData, qualityRating: rating });
    }

    const addTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            const currentTags = formData.tags || [];
            if (!currentTags.includes(tagInput.trim())) {
                setFormData({ ...formData, tags: [...currentTags, tagInput.trim()] });
            }
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setFormData({ ...formData, tags: (formData.tags || []).filter(t => t !== tag) });
    };

    const handleScheduleReview = (days: number) => {
        if (initialData?.id) {
            scheduleReview(initialData.id, days);
            onClose();
        }
    };

    const handleExamSubjectToggle = (subjectName: string) => {
        setSelectedExamSubjects(prev =>
            prev.includes(subjectName)
                ? prev.filter(s => s !== subjectName)
                : [...prev, subjectName]
        );
    };

    const handleSubTaskInput = (subject: string, field: 'topic', value: string) => {
        setSubTaskInputs(prev => ({
            ...prev,
            [subject]: { ...prev[subject], [field]: value }
        }));
    };

    // SubTask scoring update
    const handleSubTaskScore = (subjectIdx: number, field: keyof import('../types').TestStats, value: number) => {
        const newSubTasks = [...(formData.subTasks || [])];
        const targetTask = newSubTasks[subjectIdx];

        if (!targetTask.testStats) {
            targetTask.testStats = { correct: 0, wrong: 0, total: 0 };
        }

        if (targetTask.testStats) {
            targetTask.testStats[field] = value;
        }

        // Recalculate total for main task
        const totalCorrect = newSubTasks.reduce((acc, t) => acc + (t.testStats?.correct || 0), 0);
        const totalWrong = newSubTasks.reduce((acc, t) => acc + (t.testStats?.wrong || 0), 0);
        const totalTotal = newSubTasks.reduce((acc, t) => acc + (t.testStats?.total || 0), 0);

        setFormData({
            ...formData,
            subTasks: newSubTasks,
            testStats: { correct: totalCorrect, wrong: totalWrong, total: totalTotal }
        });
    };

    return createPortal(
        <div className="fixed inset-0 flex items-end sm:items-center justify-center z-[99999]">

            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-xl m-4 rounded-2xl md:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 dark:border-gray-700/50 max-h-[85vh] animate-in zoom-in-95 fade-in duration-300 pointer-events-auto flex flex-col overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">

                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl sticky top-0 z-10">
                    <div className="flex bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-xl shadow-inner">
                        <button
                            onClick={() => setTab('info')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${tab === 'info' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        >
                            اطلاعات پایه
                        </button>
                        <button
                            onClick={() => setTab('report')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${tab === 'report' ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        >
                            ثبت عملکرد
                        </button>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">

                    {tab === 'info' && (
                        <div className="p-5 space-y-5 animate-in slide-in-from-left-2 duration-300">

                            {/* Type Selection */}
                            <div className="grid grid-cols-3 gap-2">
                                {STUDY_TYPES.map(type => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, studyType: type.id })}
                                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-200 ${formData.studyType === type.id
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                                            : 'bg-transparent border-gray-100 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                            }`}
                                    >
                                        <type.icon size={18} className="mb-1" />
                                        <span className="text-[10px] font-bold">{type.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Date Selection */}
                            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                                <label className="block text-xs font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-1">
                                    <Calendar size={13} />
                                    زمان‌بندی
                                </label>
                                <select
                                    value={formData.dayId || 1}
                                    onChange={(e) => setFormData({ ...formData, dayId: parseInt(e.target.value) })}
                                    className="w-full bg-transparent border-none py-1 text-sm font-bold text-gray-800 dark:text-white outline-none focus:ring-0 cursor-pointer"
                                    style={{ backgroundImage: 'none' }}
                                >
                                    {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
                                        <option key={day} value={day} className="dark:bg-gray-900">روز {day}</option>
                                    ))}
                                </select>
                            </div>

                            {/* --- Subject Filter Logic --- */}
                            {(() => {
                                const currentStream = settings?.stream || 'general';
                                const allowedSubjects = SUBJECT_LISTS[currentStream] || SUBJECT_LISTS['general'];
                                const filteredIcons = Object.entries(SUBJECT_ICONS)
                                    .filter(([name]) => allowedSubjects.includes(name) || name === 'شخصی')
                                    .sort(([nameA], [nameB]) => {
                                        const indexA = allowedSubjects.indexOf(nameA);
                                        const indexB = allowedSubjects.indexOf(nameB);

                                        // If both are in the list, sort by their index
                                        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                        // If only A is in the list, it comes first
                                        if (indexA !== -1) return -1;
                                        // If only B is in the list, it comes first
                                        if (indexB !== -1) return 1;
                                        // Otherwise keep order
                                        return 0;
                                    });

                                return (
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {isExamMode ? 'انتخاب دروس آزمون' : 'انتخاب درس'}
                                            </label>
                                            {!isExamMode && (
                                                <div className="flex bg-gray-100 dark:bg-gray-800/80 rounded-lg p-0.5">
                                                    <button type="button" onClick={() => setViewMode('grid')} className={`p-1 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-500' : 'text-gray-400'}`}><LayoutGrid size={13} /></button>
                                                    <button type="button" onClick={() => setViewMode('list')} className={`p-1 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-500' : 'text-gray-400'}`}><List size={13} /></button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                                            {filteredIcons.map(([name, style]) => {
                                                const isSelected = isExamMode ? selectedExamSubjects.includes(name) : formData.subject === name;
                                                return (
                                                    <button
                                                        key={name}
                                                        type="button"
                                                        onClick={() => isExamMode ? handleExamSubjectToggle(name) : setFormData({ ...formData, subject: name as Subject })}
                                                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 active:scale-95 aspect-square ${isSelected
                                                            ? 'bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/50 dark:to-indigo-800/40 border-indigo-200 dark:border-indigo-500/50 shadow-md ring-1 ring-indigo-400/30 dark:ring-indigo-500/30'
                                                            : 'bg-white/50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 grayscale hover:grayscale-0'
                                                            }`}
                                                    >
                                                        <span className="text-xl mb-1 drop-shadow-sm">{style.icon}</span>
                                                        <span className="text-[9px] font-medium text-center truncate w-full text-gray-700 dark:text-gray-300">{name}</span>
                                                        {isExamMode && isSelected && <CheckCircle2 size={12} className="absolute top-1 right-1 text-indigo-500 fill-white dark:fill-gray-900" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Input Fields */}
                            {isExamMode ? (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-500">مباحث آزمون</label>
                                    {selectedExamSubjects.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2 bg-gray-50 dark:bg-gray-800/30 rounded-lg">هیچ درسی انتخاب نشده است.</p>}
                                    {selectedExamSubjects.map(subj => (
                                        <div key={subj} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/40 p-2 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-gray-700 shadow-sm text-lg">
                                                {SUBJECT_ICONS[subj]?.icon || '📚'}
                                            </div>
                                            <input
                                                type="text"
                                                placeholder={`مبحث ${subj}...`}
                                                className="flex-1 bg-transparent text-sm outline-none px-2 text-gray-800 dark:text-white placeholder:text-gray-400"
                                                value={subTaskInputs[subj]?.topic || ''}
                                                onChange={e => handleSubTaskInput(subj, 'topic', e.target.value)}
                                            />
                                        </div>
                                    ))}
                                    <div className="group pt-2">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 group-focus-within:text-indigo-500 transition-colors">توضیحات کلی</label>
                                        <input
                                            type="text"
                                            value={formData.details || ''}
                                            onChange={e => setFormData({ ...formData, details: e.target.value })}
                                            className="w-full bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition"
                                            placeholder="مثلا: آزمون قلم‌چی جامع ۱"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="group">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 pointer-events-none group-focus-within:text-indigo-500 transition-colors">مبحث (Topic)</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.topic || ''}
                                            onChange={e => setFormData({ ...formData, topic: e.target.value })}
                                            className="w-full bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition text-gray-900 dark:text-white shadow-sm"
                                            placeholder="مثلا: نوسان و موج"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="group">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 group-focus-within:text-indigo-500 transition-colors">جزئیات</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.details || ''}
                                                onChange={e => setFormData({ ...formData, details: e.target.value })}
                                                className="w-full bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition shadow-sm"
                                                placeholder="۴۵ تست"
                                            />
                                        </div>
                                        <div className="group">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 group-focus-within:text-indigo-500 transition-colors">بازه تست</label>
                                            <input
                                                type="text"
                                                value={formData.testRange || ''}
                                                onChange={e => setFormData({ ...formData, testRange: e.target.value })}
                                                className="w-full bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition shadow-sm"
                                                placeholder="اختیاری"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            <div className="bg-gray-50/50 dark:bg-gray-800/20 p-3 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">تگ‌ها</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {(formData.tags || []).map(tag => (
                                        <span key={tag} className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-600 text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                                            {tag}
                                            <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500 transition ml-1"><X size={12} /></button>
                                        </span>
                                    ))}
                                </div>
                                <div className="relative">
                                    <Tag size={16} className="absolute right-3 top-3.5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={addTag}
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl pl-3 pr-10 py-3 text-sm outline-none focus:border-indigo-500 transition"
                                        placeholder="تگ جدید و اینتر..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'report' && (
                        <div className="p-5 space-y-6 animate-in slide-in-from-right-2 duration-300">
                            {/* Duration */}
                            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-500/20">
                                <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400">
                                    <Clock size={20} />
                                    <label className="text-sm font-bold">مدت زمان فعالیت</label>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        step="5"
                                        value={formData.actualDuration || ''}
                                        onChange={e => setFormData({ ...formData, actualDuration: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-white dark:bg-gray-800 border-none ring-1 ring-indigo-200 dark:ring-indigo-800 rounded-2xl py-4 text-center font-black text-3xl text-indigo-700 dark:text-indigo-300 outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder:text-gray-300"
                                        placeholder="0"
                                    />
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-gray-500">دقیقه</span>
                                </div>
                            </div>

                            {/* Scoring Logic - Exam vs Standard */}
                            {isExamMode && formData.subTasks && formData.subTasks.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                        <Target size={18} />
                                        <span>نتایج آزمون به تفکیک درس</span>
                                    </div>
                                    {formData.subTasks.map((sub, idx) => (
                                        <div key={sub.id} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-lg">{SUBJECT_ICONS[sub.subject]?.icon}</span>
                                                <span className="font-bold text-sm dark:text-white">{sub.subject}</span>
                                                <span className="text-xs text-gray-400">({sub.topic})</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="relative">
                                                    <input type="number" placeholder="درست" className="w-full text-center bg-white dark:bg-gray-700 rounded-lg py-1 text-sm border-emerald-200 border text-emerald-600 font-bold"
                                                        value={sub.testStats?.correct || ''}
                                                        onChange={e => handleSubTaskScore(idx, 'correct', parseInt(e.target.value) || 0)}
                                                    />
                                                    <span className="text-[9px] text-emerald-500 absolute -top-2 right-2 bg-white dark:bg-gray-800 px-1">درست</span>
                                                </div>
                                                <div className="relative">
                                                    <input type="number" placeholder="غلط" className="w-full text-center bg-white dark:bg-gray-700 rounded-lg py-1 text-sm border-rose-200 border text-rose-500 font-bold"
                                                        value={sub.testStats?.wrong || ''}
                                                        onChange={e => handleSubTaskScore(idx, 'wrong', parseInt(e.target.value) || 0)}
                                                    />
                                                    <span className="text-[9px] text-rose-500 absolute -top-2 right-2 bg-white dark:bg-gray-800 px-1">غلط</span>
                                                </div>
                                                <div className="relative">
                                                    <input type="number" placeholder="کل" className="w-full text-center bg-white dark:bg-gray-700 rounded-lg py-1 text-sm border-gray-200 border text-gray-600 font-bold"
                                                        value={sub.testStats?.total || ''}
                                                        onChange={e => handleSubTaskScore(idx, 'total', parseInt(e.target.value) || 0)}
                                                    />
                                                    <span className="text-[9px] text-gray-400 absolute -top-2 right-2 bg-white dark:bg-gray-800 px-1">کل</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Standard Scoring */
                                <div className="p-1">
                                    <div className="flex items-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400">
                                        <Target size={18} />
                                        <label className="text-sm font-bold">نتیجه تست‌زنی</label>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-2xl text-center border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                                            <label className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mb-2">درست</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2 text-center font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                value={formData.testStats?.correct || ''}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    testStats: { ...(formData.testStats || { correct: 0, wrong: 0, total: 0 }), correct: parseInt(e.target.value) || 0 }
                                                })}
                                            />
                                        </div>
                                        <div className="bg-rose-50 dark:bg-rose-900/10 p-3 rounded-2xl text-center border border-rose-100 dark:border-rose-500/20 shadow-sm">
                                            <label className="block text-[10px] text-rose-600 dark:text-rose-400 font-bold mb-2">غلط</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl p-2 text-center font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/50"
                                                value={formData.testStats?.wrong || ''}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    testStats: { ...(formData.testStats || { correct: 0, wrong: 0, total: 0 }), wrong: parseInt(e.target.value) || 0 }
                                                })}
                                            />
                                        </div>
                                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl text-center border border-gray-200 dark:border-gray-700 shadow-sm">
                                            <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-2">کل</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2 text-center font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-gray-400"
                                                value={formData.testStats?.total || ''}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    testStats: { ...(formData.testStats || { correct: 0, wrong: 0, total: 0 }), total: parseInt(e.target.value) || 0 }
                                                })}
                                            />
                                        </div>
                                    </div>
                                    {(formData.testStats?.wrong || 0) > 0 && (
                                        <div className="mt-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-500/20 p-3 rounded-2xl flex items-center justify-between shadow-sm animate-in zoom-in-95 duration-300">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-orange-100 dark:bg-orange-800 p-1.5 rounded-lg text-orange-600 dark:text-orange-300"><Target size={14} /></div>
                                                <span className="text-xs text-orange-800 dark:text-orange-200 font-bold max-w-[150px] md:max-w-none">تست‌های غلط را برای مرور به جعبه لایتنر اضافه کن!</span>
                                            </div>
                                            <button type="button" onClick={() => { onClose(); navigate('/leitner'); }} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-sm transition-colors whitespace-nowrap">افزودن فلش‌کارت</button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Quality Rating */}
                            <div>
                                <div className="flex items-center gap-2 mb-3 text-amber-500">
                                    <Star size={18} fill="currentColor" />
                                    <label className="text-sm font-bold">کیفیت مطالعه</label>
                                </div>
                                <div className="flex justify-between bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-inner">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => toggleStar(star)}
                                            className={`transition-all duration-200 active:scale-125 hover:scale-110 ${star <= (formData.qualityRating || 0) ? 'text-amber-400 drop-shadow-sm' : 'text-gray-200 dark:text-gray-700'}`}
                                        >
                                            <Star size={36} fill="currentColor" strokeWidth={0} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </form>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md z-10">
                    <button onClick={handleSubmit} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 active:scale-[0.98] flex items-center justify-center gap-2 text-md">
                        {tab === 'info' ? 'ذخیره فعالیت' : 'ثبت عملکرد'}
                        {tab === 'report' ? <CheckCircle2 size={20} /> : null}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TaskModal;
