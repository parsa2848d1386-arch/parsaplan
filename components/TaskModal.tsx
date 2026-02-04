
import React, { useEffect, useState } from 'react';
import { Subject, SubjectTask, SUBJECT_ICONS } from '../types';
import { useStore } from '../context/StoreContext';
import { X, Clock, Star, Target, Calendar, CheckCircle2, Tag, CalendarClock, ChevronRight, ChevronLeft, LayoutGrid, List } from 'lucide-react';



interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Partial<SubjectTask>) => void;
    initialData?: SubjectTask | null;
    currentDayId: number;
    defaultDateStr?: string;
}

const { scheduleReview, totalDays } = useStore();
const [formData, setFormData] = useState<Partial<SubjectTask>>({});
const [tab, setTab] = useState<'info' | 'report'>('info');
const [tagInput, setTagInput] = useState('');
const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // For subject selection

useEffect(() => {
    if (isOpen) {
        setTab('info');
        if (initialData) {
            setFormData(initialData);
            if (initialData.isCompleted) setTab('report');
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
                tags: []
            });
        }
    }
}, [isOpen, initialData, currentDayId, defaultDateStr]);

if (!isOpen) return null;

const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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

return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md transition-opacity">
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] border border-gray-100 dark:border-gray-800">

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button
                        onClick={() => setTab('info')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === 'info' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        اطلاعات پایه
                    </button>
                    <button
                        onClick={() => setTab('report')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === 'report' ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        ثبت عملکرد
                    </button>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition">
                    <X size={20} />
                </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">

                {tab === 'info' && (
                    <div className="p-6 space-y-6 animate-in slide-in-from-left-2 duration-300">

                        {/* Day Selection */}
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                            <label className="block text-xs font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-1">
                                <Calendar size={14} />
                                روز برنامه
                            </label>
                            <select
                                value={formData.dayId || 1}
                                onChange={(e) => setFormData({ ...formData, dayId: parseInt(e.target.value) })}
                                className="w-full bg-white dark:bg-gray-800 border-none ring-1 ring-blue-200 dark:ring-blue-800 rounded-xl px-4 py-3 text-sm font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition"
                            >
                                {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
                                    <option key={day} value={day}>روز {day}</option>
                                ))}
                            </select>
                        </div>

                        {/* Subject Selection */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">انتخاب درس</label>
                                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                                    <button type="button" onClick={() => setViewMode('grid')} className={`p-1 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-500' : 'text-gray-400'}`}><LayoutGrid size={14} /></button>
                                    <button type="button" onClick={() => setViewMode('list')} className={`p-1 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-500' : 'text-gray-400'}`}><List size={14} /></button>
                                </div>
                            </div>

                            {viewMode === 'list' ? (
                                <select
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value as Subject })}
                                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition text-gray-900 dark:text-white appearance-none"
                                >
                                    {Object.entries(SUBJECT_ICONS).map(([name, style]) => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                                    {Object.entries(SUBJECT_ICONS).map(([name, style]) => (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, subject: name as Subject })}
                                            className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 aspect-square ${formData.subject === name
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-500/50 shadow-sm ring-1 ring-indigo-500/30'
                                                    : 'bg-gray-50 dark:bg-gray-800/50 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/80 grayscale hover:grayscale-0'
                                                }`}
                                        >
                                            <span className="text-xl mb-1">{style.icon}</span>
                                            <span className="text-[9px] font-medium text-center truncate w-full text-gray-700 dark:text-gray-300">{name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="group">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 pointer-events-none group-focus-within:text-indigo-500 transition-colors">مبحث (Topic)</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.topic || ''}
                                    onChange={e => setFormData({ ...formData, topic: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition text-gray-900 dark:text-white placeholder:text-gray-400"
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
                                        className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition text-gray-900 dark:text-white"
                                        placeholder="۴۵ تست"
                                    />
                                </div>
                                <div className="group">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 group-focus-within:text-indigo-500 transition-colors">بازه تست</label>
                                    <input
                                        type="text"
                                        value={formData.testRange || ''}
                                        onChange={e => setFormData({ ...formData, testRange: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition text-gray-900 dark:text-white"
                                        placeholder="اختیاری"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Feature 3: Smart Tagging */}
                        <div className="bg-gray-50 dark:bg-gray-800/30 p-3 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">تگ‌ها</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(formData.tags || []).map(tag => (
                                    <span key={tag} className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-600 text-xs px-2 py-1 rounded-lg flex items-center gap-1 animate-in zoom-in-50 duration-200">
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
                                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl pl-3 pr-10 py-3 text-sm outline-none focus:border-indigo-500 transition text-gray-900 dark:text-white placeholder:text-gray-400/70"
                                    placeholder="تگ جدید و اینتر..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'report' && (
                    <div className="p-6 space-y-6 animate-in slide-in-from-right-2 duration-300">
                        {/* Duration */}
                        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-500/20">
                            <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400">
                                <Clock size={20} />
                                <label className="text-sm font-bold">مدت زمان مطالعه</label>
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
                            <div className="flex justify-center gap-2 mt-3">
                                {[15, 30, 45, 60, 90].map(mins => (
                                    <button
                                        key={mins}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, actualDuration: mins }))}
                                        className="px-2 py-1 bg-white dark:bg-gray-800 text-[10px] font-bold text-gray-500 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition shadow-sm border border-gray-100 dark:border-gray-700"
                                    >
                                        {mins}
                                    </button>
                                ))}
                            </div>
                        </div>

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

                        {/* Test Results */}
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
                        </div>

                        {/* Spaced Repetition */}
                        {initialData && (
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                                <div className="flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                                    <CalendarClock size={16} />
                                    برنامه‌ریزی مرور (لایتنر)
                                </div>
                                <div className="flex gap-2">
                                    {[1, 3, 7, 14, 30].map(day => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => handleScheduleReview(day)}
                                            className="flex-1 bg-white dark:bg-gray-800 py-2 rounded-xl text-[10px] font-bold border border-indigo-100 dark:border-gray-700 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 dark:hover:bg-indigo-600 transition shadow-sm text-gray-600 dark:text-gray-300"
                                        >
                                            {day} روز
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </form>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
                <button onClick={handleSubmit} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98] flex items-center justify-center gap-2 text-lg">
                    {tab === 'info' ? 'ذخیره تغییرات' : 'ثبت عملکرد'}
                    {tab === 'report' ? <CheckCircle2 size={20} /> : null}
                </button>
            </div>
        </div>
    </div>
);
};

export default TaskModal;
