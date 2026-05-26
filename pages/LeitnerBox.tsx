import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Plus, Check, X, BrainCircuit, RefreshCw, Trash2, ArrowRight, Search, Filter, BookOpen, Star, AlertTriangle, Sparkles, CheckCircle2, TrendingUp } from 'lucide-react';
import { Flashcard } from '../types';
import { toIsoString, getShamsiDate } from '../utils';

export default function LeitnerBox() {
    const { flashcards, addFlashcard, reviewFlashcard, deleteFlashcard } = useStore();
    const [isAdding, setIsAdding] = useState(false);

    // Form inputs
    const [newQuestion, setNewQuestion] = useState('');
    const [newAnswer, setNewAnswer] = useState('');
    const [newSubject, setNewSubject] = useState('');

    // Filters and Search
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('all');

    const todayIso = toIsoString(new Date());

    // Due cards for review today
    const dueCards = flashcards.filter(c => c.nextReviewDate <= todayIso).sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate));
    const [reviewIndex, setReviewIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);

    // Dynamic HSL colors for Leitner Boxes
    const boxConfigs = [
        { id: 1, name: 'جعبه ۱', color: 'bg-rose-500', textColor: 'text-rose-600', darkColor: 'dark:bg-rose-950/40', borderColor: 'border-rose-200 dark:border-rose-800/40', interval: '۱ روز' },
        { id: 2, name: 'جعبه ۲', color: 'bg-orange-500', textColor: 'text-orange-600', darkColor: 'dark:bg-orange-950/40', borderColor: 'border-orange-200 dark:border-orange-800/40', interval: '۲ روز' },
        { id: 3, name: 'جعبه ۳', color: 'bg-amber-500', textColor: 'text-amber-600', darkColor: 'dark:bg-amber-950/40', borderColor: 'border-amber-200 dark:border-amber-800/40', interval: '۴ روز' },
        { id: 4, name: 'جعبه ۴', color: 'bg-blue-500', textColor: 'text-blue-600', darkColor: 'dark:bg-blue-950/40', borderColor: 'border-blue-200 dark:border-blue-800/40', interval: '۸ روز' },
        { id: 5, name: 'جعبه ۵', color: 'bg-emerald-500', textColor: 'text-emerald-600', darkColor: 'dark:bg-emerald-950/40', borderColor: 'border-emerald-200 dark:border-emerald-800/40', interval: '۱۵ روز' },
    ];

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newQuestion.trim() || !newAnswer.trim()) return;
        addFlashcard({
            question: newQuestion,
            answer: newAnswer,
            subject: newSubject || 'عمومی',
            topic: ''
        });
        setNewQuestion('');
        setNewAnswer('');
        setIsAdding(false);
    };

    const handleReview = (success: boolean) => {
        const currentCard = dueCards[reviewIndex];
        if (!currentCard) return;

        reviewFlashcard(currentCard.id, success);
        setShowAnswer(false);
        setReviewIndex(0);
    };

    // Calculate Box Statistics
    const stats = boxConfigs.map(box => {
        const count = flashcards.filter(c => c.boxId === box.id).length;
        const total = flashcards.length;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        return { ...box, count, percent };
    });

    const masteredCount = flashcards.filter(c => c.boxId === 5).length;
    const masteryPercent = flashcards.length > 0 ? Math.round((masteredCount / flashcards.length) * 100) : 0;

    // Get unique subjects for filtering
    const allUniqueSubjects = Array.from(new Set(flashcards.map(c => c.subject || 'عمومی')));

    // Filtered flashcards list for management
    const filteredFlashcards = flashcards.filter(c => {
        const matchesSearch = c.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              c.answer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = selectedSubject === 'all' || c.subject === selectedSubject;
        return matchesSearch && matchesSubject;
    });

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 pb-32 space-y-6 animate-in fade-in duration-300 text-right" dir="rtl">
            {/* ====================================================
                HEADER
               ==================================================== */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200/50 dark:shadow-none shrink-0">
                        <BrainCircuit className="text-white animate-float" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white tracking-tight">جعبه لایتنر هوشمند</h1>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">مرور هوشمند و علمی اشتباهات، فرمول‌ها و مفاهیم</p>
                    </div>
                </div>

                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer"
                >
                    <Plus size={16} />
                    <span>کارت جدید</span>
                </button>
            </div>

            {/* ====================================================
                PRO STATS WIDGETS
               ==================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Box progress distribution */}
                <div className="md:col-span-2 bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-indigo-500" />
                        توزیع فلش‌کارت‌ها در جعبه‌ها
                    </h3>
                    <div className="space-y-3">
                        {stats.map(st => (
                            <div key={st.id} className="space-y-1">
                                <div className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{st.name}</span>
                                        <span className="text-[10px] text-gray-400 font-medium">({st.interval})</span>
                                    </div>
                                    <span className="font-mono text-gray-500 font-bold dark:text-gray-400">
                                        {st.count} کارت ({st.percent}%)
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800/80 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${st.color} rounded-full transition-all duration-1000`}
                                        style={{ width: `${st.percent}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mastery Circle Card */}
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/15 p-5 rounded-3xl border border-indigo-100/50 dark:border-indigo-900/30 flex flex-col items-center justify-center text-center">
                    <div className="relative mb-3">
                        {/* Circular Progress SVG */}
                        <svg width="90" height="90" viewBox="0 0 90 90" className="-rotate-90">
                            <circle cx="45" cy="45" r="38" fill="none" stroke="currentColor" strokeWidth="6" className="text-indigo-100 dark:text-indigo-900/40" />
                            <circle
                                cx="45" cy="45" r="38" fill="none"
                                stroke="url(#leitnerGrad)" strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 38}
                                strokeDashoffset={(2 * Math.PI * 38) - (masteryPercent / 100) * (2 * Math.PI * 38)}
                                className="transition-all duration-1000"
                            />
                            <defs>
                                <linearGradient id="leitnerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#ec4899" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{masteryPercent}%</span>
                        </div>
                    </div>
                    <h4 className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-1">
                        <Sparkles size={14} className="text-amber-400 fill-amber-400" />
                        سطح تسلط نهایی
                    </h4>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 max-w-[160px] leading-relaxed">
                        تعداد {masteredCount} کارت از کل {flashcards.length} کارت به جعبه ۵ (یادگیری کامل) رسیده‌اند.
                    </p>
                </div>
            </div>

            {/* ====================================================
                ADD NEW FLASHCARD FORM
               ==================================================== */}
            {isAdding && (
                <form onSubmit={handleAdd} className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-3xl border border-indigo-100/50 dark:border-indigo-500/20 animate-in slide-in-from-top-4 duration-200">
                    <h3 className="font-bold text-indigo-700 dark:text-indigo-300 mb-4 flex items-center gap-2 text-sm">
                        <Plus size={18} /> افزودن کارت مرور جدید به لایتنر
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">سوال یا تیتر اشتباه (روی کارت)</label>
                            <input
                                required
                                value={newQuestion}
                                onChange={e => setNewQuestion(e.target.value)}
                                type="text"
                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs outline-none focus:border-indigo-500 transition text-gray-700 dark:text-gray-200 font-bold"
                                placeholder="مثلاً: شیب خط سرعت زمان نشان دهنده چیست؟"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">جواب و توضیح کامل (پشت کارت)</label>
                            <textarea
                                required
                                value={newAnswer}
                                onChange={e => setNewAnswer(e.target.value)}
                                rows={3}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs outline-none focus:border-indigo-500 transition resize-none text-gray-700 dark:text-gray-200 font-semibold"
                                placeholder="شتاب لحظه‌ای متحرک"
                            ></textarea>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">درس مرتبط (مثال: فیزیک، زیست)</label>
                            <input
                                value={newSubject}
                                onChange={e => setNewSubject(e.target.value)}
                                type="text"
                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs outline-none focus:border-indigo-500 transition text-gray-700 dark:text-gray-200 font-bold"
                                placeholder="مثلاً فیزیک"
                            />
                        </div>
                        <div className="flex gap-2.5">
                            <button type="submit" className="flex-1 bg-indigo-600 text-white py-2.5 rounded-2xl text-xs font-bold shadow-sm hover:bg-indigo-700 active:scale-98 transition duration-200 cursor-pointer">ذخیره کارت</button>
                            <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2.5 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-700 active:scale-98 transition duration-200 cursor-pointer">انصراف</button>
                        </div>
                    </div>
                </form>
            )}

            {/* ====================================================
                ACTIVE REVIEWING DECK AREA
               ==================================================== */}
            {dueCards.length > 0 ? (
                <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 relative overflow-hidden flex flex-col items-center min-h-[320px] justify-center text-center">
                    {/* Glowing Accent */}
                    <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-2xl"></div>
                    
                    <div className="absolute top-4 right-4 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 animate-pulse">
                        <CheckCircle2 size={12} />
                        <span>{dueCards.length} کارت برای امروز باقی مانده</span>
                    </div>

                    <div className="w-full max-w-lg mb-8 space-y-4">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-black">
                            <BookOpen size={12} />
                            <span>درس: {dueCards[0].subject || 'عمومی'}</span>
                            <span className="opacity-40">•</span>
                            <span>جعبه {dueCards[0].boxId}</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white leading-relaxed max-w-md mx-auto">
                            {dueCards[0].question}
                        </h2>
                    </div>

                    {!showAnswer ? (
                        <button
                            onClick={() => setShowAnswer(true)}
                            className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 px-6 py-3.5 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 active:scale-95 transition duration-200 cursor-pointer shadow-sm"
                        >
                            <RefreshCw size={15} /> نمایش جواب و ارزیابی
                        </button>
                    ) : (
                        <div className="w-full max-w-md animate-in zoom-in-95 duration-200">
                            {/* Answer panel */}
                            <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/80 dark:border-emerald-900/30 p-5 rounded-2xl mb-6">
                                <span className="block text-[10px] font-extrabold text-emerald-600 mb-2">توضیح و جواب:</span>
                                <p className="text-emerald-800 dark:text-emerald-300 font-bold leading-loose text-sm">
                                    {dueCards[0].answer}
                                </p>
                            </div>
                            
                            {/* Assessment Buttons */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleReview(false)}
                                    className="flex-1 bg-white dark:bg-gray-800 border border-rose-200 dark:border-rose-900/30 text-rose-500 font-extrabold py-3.5 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-rose-50 dark:hover:bg-rose-900/20 active:scale-95 transition duration-200 cursor-pointer group"
                                >
                                    <X size={22} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[11px]">بلد نبودم ❌</span>
                                    <span className="text-[8px] opacity-60">برگشت به جعبه ۱</span>
                                </button>
                                <button
                                    onClick={() => handleReview(true)}
                                    className="flex-1 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-900/30 text-emerald-500 font-extrabold py-3.5 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-95 transition duration-200 cursor-pointer group"
                                >
                                    <Check size={22} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[11px]">یادم بود  ✅</span>
                                    <span className="text-[8px] opacity-60">انتقال به جعبه {dueCards[0].boxId < 5 ? dueCards[0].boxId + 1 : 5}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-900 p-10 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center">
                    <BrainCircuit size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
                    <h3 className="font-extrabold text-gray-700 dark:text-gray-200 text-lg mb-2">همه مرورهای لایتنر امروز تمام شد! 🎓</h3>
                    <p className="text-xs text-gray-400 max-w-xs leading-relaxed">کارت جدیدی در انتظار مرور امروز نیست. می‌توانی از دکمه بالا سمت چپ، فلش‌کارت اشتباهات جدید خود را اضافه کنی.</p>
                </div>
            )}

            {/* ====================================================
                MANAGEMENT & SEARCH & FILTER SECTION
               ==================================================== */}
            {flashcards.length > 0 && (
                <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="font-black text-gray-700 dark:text-gray-200 text-sm flex items-center gap-2">
                            <BookOpen size={16} className="text-indigo-500" />
                            مدیریت و جستجوی فلش‌کارت‌ها ({filteredFlashcards.length})
                        </h3>

                        {/* Search and Filters */}
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            {/* Search bar */}
                            <div className="relative w-full sm:w-48">
                                <Search size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="جستجو در کارت‌ها..."
                                    className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl pr-9 pl-3 py-2 text-xs outline-none focus:border-indigo-500 transition text-gray-700 dark:text-gray-200"
                                />
                            </div>

                            {/* Dropdown filter */}
                            <div className="relative w-full sm:w-36">
                                <Filter size={12} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                                <select
                                    value={selectedSubject}
                                    onChange={e => setSelectedSubject(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl pr-8 pl-3 py-2 text-xs outline-none focus:border-indigo-500 transition text-gray-700 dark:text-gray-200 font-bold appearance-none cursor-pointer"
                                >
                                    <option value="all">همه درس‌ها</option>
                                    {allUniqueSubjects.map((sub, idx) => (
                                        <option key={idx} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Card grid list */}
                    {filteredFlashcards.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {filteredFlashcards.map(c => {
                                const boxColor = boxConfigs.find(b => b.id === c.boxId)?.color || 'bg-gray-400';
                                return (
                                    <div key={c.id} className="flex justify-between items-start bg-slate-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-slate-100 dark:border-gray-800 hover:border-indigo-500/30 transition duration-200 relative group">
                                        <div className="space-y-1.5 flex-1 pr-1 truncate">
                                            <p className="text-xs font-black text-gray-800 dark:text-gray-200 truncate leading-relaxed">
                                                {c.question}
                                            </p>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">
                                                جواب: {c.answer}
                                            </p>
                                            <div className="flex items-center gap-2 text-[9px] text-gray-400 font-bold pt-1">
                                                <span className={`w-2 h-2 rounded-full ${boxColor}`} />
                                                <span>جعبه {c.boxId}</span>
                                                <span className="opacity-30">•</span>
                                                <span>درس: {c.subject}</span>
                                                {c.lastReviewedDate && (
                                                    <>
                                                        <span className="opacity-30">•</span>
                                                        <span>آخرین مرور: {getShamsiDate(c.lastReviewedDate)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => deleteFlashcard(c.id)}
                                            className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-2 rounded-xl transition-all duration-200 shrink-0 cursor-pointer self-center"
                                            title="حذف فلش‌کارت"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-xs font-bold bg-slate-50 dark:bg-gray-800/20 rounded-2xl">
                            هیچ فلش‌کارتی با این شرایط پیدا نشد!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
