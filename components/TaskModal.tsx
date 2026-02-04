
import React, { useEffect, useState } from 'react';
import { Subject, SubjectTask, SUBJECT_ICONS } from '../types';
import { useStore } from '../context/StoreContext';
import { X, Clock, Star, Target, Calculator, CheckCircle2, Tag, CalendarClock } from 'lucide-react';


interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Partial<SubjectTask>) => void;
    initialData?: SubjectTask | null;
    currentDayId: number;
    defaultDateStr?: string;
}

const TaskModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData, currentDayId, defaultDateStr }) => {
    const { scheduleReview } = useStore();
    const [formData, setFormData] = useState<Partial<SubjectTask>>({});
    const [tab, setTab] = useState<'info' | 'report'>('info');
    const [tagInput, setTagInput] = useState('');

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setTab('info')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${tab === 'info' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            اطلاعات پایه
                        </button>
                        <button
                            onClick={() => setTab('report')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${tab === 'report' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            ثبت عملکرد
                        </button>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent p-1">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">

                    {tab === 'info' && (
                        <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">درس</label>
                                <select
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value as Subject })}
                                    className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 text-sm outline-none focus:border-indigo-500 transition text-gray-900 dark:text-white"
                                >
                                    {Object.entries(SUBJECT_ICONS).map(([name, style]) => (
                                        <option key={name} value={name}>{style.icon} {name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">مبحث (Topic)</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.topic || ''}
                                    onChange={e => setFormData({ ...formData, topic: e.target.value })}
                                    className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 text-sm outline-none focus:border-indigo-500 transition text-gray-900 dark:text-white placeholder:text-gray-400"
                                    placeholder="مثلا: نوسان و موج"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">جزئیات</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.details || ''}
                                        onChange={e => setFormData({ ...formData, details: e.target.value })}
                                        className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 text-sm outline-none focus:border-indigo-500 transition text-gray-900 dark:text-white"
                                        placeholder="۴۵ تست"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">بازه تست</label>
                                    <input
                                        type="text"
                                        value={formData.testRange || ''}
                                        onChange={e => setFormData({ ...formData, testRange: e.target.value })}
                                        className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 text-sm outline-none focus:border-indigo-500 transition text-gray-900 dark:text-white"
                                        placeholder="اختیاری"
                                    />
                                </div>
                            </div>

                            {/* Feature 3: Smart Tagging */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">تگ‌ها (اینتر بزنید)</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {(formData.tags || []).map(tag => (
                                        <span key={tag} className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                                            {tag}
                                            <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={12} /></button>
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
                                        className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 pr-10 text-sm outline-none focus:border-indigo-500 transition text-gray-900 dark:text-white"
                                        placeholder="تگ جدید (مثل: مهم، مرور)..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'report' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">

                            {/* Duration */}
                            <div>
                                <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
                                    <Clock size={18} />
                                    <label className="text-sm font-bold">مدت زمان مطالعه (دقیقه)</label>
                                </div>
                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 p-2 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <input
                                        type="number"
                                        min="0"
                                        step="5"
                                        value={formData.actualDuration || ''}
                                        onChange={e => setFormData({ ...formData, actualDuration: parseInt(e.target.value) || 0 })}
                                        className="flex-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg px-3 py-2 text-center font-bold text-lg text-gray-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all"
                                        placeholder="0"
                                    />
                                    <span className="text-xs font-medium text-gray-400 dark:text-gray-300">دقیقه</span>
                                </div>
                            </div>

                            {/* Quality Rating */}
                            <div>
                                <div className="flex items-center gap-2 mb-2 text-amber-500">
                                    <Star size={18} fill="currentColor" />
                                    <label className="text-sm font-bold">کیفیت مطالعه</label>
                                </div>
                                <div className="flex justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border border-gray-200 dark:border-gray-600">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => toggleStar(star)}
                                            className={`p-1 transition-transform active:scale-125 ${star <= (formData.qualityRating || 0) ? 'text-amber-400' : 'text-gray-300 dark:text-gray-500'}`}
                                        >
                                            <Star size={32} fill="currentColor" strokeWidth={0} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Test Results */}
                            <div>
                                <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
                                    <Target size={18} />
                                    <label className="text-sm font-bold">نتیجه تست‌زنی (اختیاری)</label>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-xl text-center border border-emerald-100 dark:border-emerald-800">
                                        <label className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mb-1">درست</label>
                                        <input
                                            type="number"
                                            className="w-full bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg p-2 text-center font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                                            value={formData.testStats?.correct || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                testStats: { ...formData.testStats!, correct: parseInt(e.target.value) || 0, wrong: formData.testStats?.wrong || 0, total: formData.testStats?.total || 0 }
                                            })}
                                        />
                                    </div>
                                    <div className="bg-rose-50 dark:bg-rose-900/20 p-2 rounded-xl text-center border border-rose-100 dark:border-rose-800">
                                        <label className="block text-[10px] text-rose-700 dark:text-rose-400 font-bold mb-1">غلط</label>
                                        <input
                                            type="number"
                                            className="w-full bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg p-2 text-center font-bold text-gray-900 dark:text-white outline-none focus:border-rose-500"
                                            value={formData.testStats?.wrong || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                testStats: { ...formData.testStats!, wrong: parseInt(e.target.value) || 0, correct: formData.testStats?.correct || 0, total: formData.testStats?.total || 0 }
                                            })}
                                        />
                                    </div>
                                    <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-xl text-center border border-gray-200 dark:border-gray-600">
                                        <label className="block text-[10px] text-gray-600 dark:text-gray-300 font-bold mb-1">کل</label>
                                        <input
                                            type="number"
                                            className="w-full bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg p-2 text-center font-bold text-gray-900 dark:text-white outline-none focus:border-gray-400"
                                            value={formData.testStats?.total || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                testStats: { ...formData.testStats!, total: parseInt(e.target.value) || 0, correct: formData.testStats?.correct || 0, wrong: formData.testStats?.wrong || 0 }
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Feature 4: Spaced Repetition (Only visible if task exists) */}
                            {initialData && (
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                    <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-400 text-xs font-bold">
                                        <CalendarClock size={16} />
                                        برنامه‌ریزی مرور (لایتنر)
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => handleScheduleReview(1)} className="flex-1 bg-white dark:bg-gray-700 py-1.5 rounded-lg text-xs border hover:bg-indigo-50 shadow-sm text-gray-700 dark:text-gray-300">فردا</button>
                                        <button type="button" onClick={() => handleScheduleReview(3)} className="flex-1 bg-white dark:bg-gray-700 py-1.5 rounded-lg text-xs border hover:bg-indigo-50 shadow-sm text-gray-700 dark:text-gray-300">۳ روز</button>
                                        <button type="button" onClick={() => handleScheduleReview(7)} className="flex-1 bg-white dark:bg-gray-700 py-1.5 rounded-lg text-xs border hover:bg-indigo-50 shadow-sm text-gray-700 dark:text-gray-300">۷ روز</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </form>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <button onClick={handleSubmit} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2">
                        {tab === 'info' ? 'ذخیره تغییرات' : 'ثبت عملکرد'}
                        {tab === 'report' && <CheckCircle2 size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskModal;
