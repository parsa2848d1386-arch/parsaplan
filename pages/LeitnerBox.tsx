import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Plus, Check, X, BrainCircuit, RefreshCw, Trash2, ArrowRight } from 'lucide-react';
import { Flashcard } from '../types';
import { toIsoString, getShamsiDate } from '../utils';

export default function LeitnerBox() {
    const { flashcards, addFlashcard, reviewFlashcard, deleteFlashcard } = useStore();
    const [isAdding, setIsAdding] = useState(false);

    const [newQuestion, setNewQuestion] = useState('');
    const [newAnswer, setNewAnswer] = useState('');
    const [newSubject, setNewSubject] = useState('');

    const todayIso = toIsoString(new Date());

    const dueCards = flashcards.filter(c => c.nextReviewDate <= todayIso).sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate));
    const [reviewIndex, setReviewIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);

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
        // The card is updated in store, so dueCards will re-calculate, we don't need to increment index if we just take dueCards[0] next.
        // But dueCards updates reactively. Let's just keep reviewIndex = 0.
        setReviewIndex(0);
    };

    const stats = [1, 2, 3, 4, 5].map(box => ({
        boxId: box,
        count: flashcards.filter(c => c.boxId === box).length
    }));

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 pb-32 space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-200/50 dark:shadow-none shrink-0">
                        <BrainCircuit className="text-white" size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white tracking-tight">جعبه لایتنر</h1>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">مرور هوشمند اشتباهات و فلش‌کارت‌ها</p>
                    </div>
                </div>

                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
                >
                    <Plus size={16} />
                    <span>کارت جدید</span>
                </button>
            </div>

            {/* Boxes Stats */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-5 gap-2">
                    {stats.map(st => (
                        <div key={st.boxId} className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <span className="text-[10px] text-gray-400 font-bold mb-1">جعبه {st.boxId}</span>
                            <span className="text-xl font-black text-gray-800 dark:text-white">{st.count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Form */}
            {isAdding && (
                <form onSubmit={handleAdd} className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-500/20 animate-in slide-in-from-top-4">
                    <h3 className="font-bold text-indigo-700 dark:text-indigo-300 mb-4 flex items-center gap-2">
                        <Plus size={18} /> افزودن کارت مرور جدید
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">سوال یا تیتر اشتباه (روی کارت)</label>
                            <input required value={newQuestion} onChange={e => setNewQuestion(e.target.value)} type="text" className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">جواب و توضیح (پشت کارت)</label>
                            <textarea required value={newAnswer} onChange={e => setNewAnswer(e.target.value)} rows={3} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition resize-none"></textarea>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">درس مرتبط (اختیاری)</label>
                            <input value={newSubject} onChange={e => setNewSubject(e.target.value)} type="text" className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition" placeholder="مثلا فیزیک" />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-indigo-700 transition">ذخیره کارت</button>
                            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold hover:bg-gray-300 transition">انصراف</button>
                        </div>
                    </div>
                </form>
            )}

            {/* Review Area */}
            {dueCards.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden flex flex-col items-center min-h-[300px] justify-center text-center">
                    <div className="absolute top-4 right-4 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full text-[10px] font-bold">
                        {dueCards.length} کارت برای مرور
                    </div>

                    <div className="w-full max-w-sm mb-8">
                        <div className="text-xs text-indigo-500 dark:text-indigo-400 font-bold mb-4 bg-indigo-50 dark:bg-indigo-900/30 inline-block px-3 py-1 rounded-full">
                            درس: {dueCards[0].subject || 'نامشخص'} - جعبه {dueCards[0].boxId}
                        </div>
                        <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white leading-relaxed">
                            {dueCards[0].question}
                        </h2>
                    </div>

                    {!showAnswer ? (
                        <button onClick={() => setShowAnswer(true)} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition">
                            <RefreshCw size={18} /> نمایش جواب
                        </button>
                    ) : (
                        <div className="w-full max-w-sm animate-in zoom-in-95 duration-200">
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 p-5 rounded-2xl mb-8">
                                <p className="text-emerald-800 dark:text-emerald-200 font-medium leading-loose text-sm">
                                    {dueCards[0].answer}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => handleReview(false)} className="flex-1 bg-white dark:bg-gray-800 border-2 border-rose-100 dark:border-rose-900/30 text-rose-500 font-bold py-3 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition group">
                                    <X size={24} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px]">بلد نبودم</span>
                                    <span className="text-[8px] opacity-60">برگشت به جعبه ۱</span>
                                </button>
                                <button onClick={() => handleReview(true)} className="flex-1 bg-white dark:bg-gray-800 border-2 border-emerald-100 dark:border-emerald-900/30 text-emerald-500 font-bold py-3 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition group">
                                    <Check size={24} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px]">یادم بود</span>
                                    <span className="text-[8px] opacity-60">انتقال به جعبه {dueCards[0].boxId < 5 ? dueCards[0].boxId + 1 : 5}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center opacity-70">
                    <BrainCircuit size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="font-bold text-gray-500 dark:text-gray-400 text-lg mb-2">همه مرورهای امروز انجام شد!</h3>
                    <p className="text-xs text-gray-400 max-w-xs">کارت جدیدی برای امروز موجود نیست. می‌توانی از دکمه بالا فلش‌کارت جدید بسازی.</p>
                </div>
            )}

            {/* List all flashcards (manage) */}
            {flashcards.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4">مدیریت کارت‌ها</h3>
                    <div className="space-y-2">
                        {flashcards.map(c => (
                            <div key={c.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                <div className="truncate pr-2">
                                    <p className="text-xs font-bold text-gray-800 dark:text-white truncate max-w-[200px] md:max-w-md">{c.question}</p>
                                    <p className="text-[9px] text-gray-400">جعبه {c.boxId} • {c.subject}</p>
                                </div>
                                <button onClick={() => deleteFlashcard(c.id)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 p-2 rounded-lg transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
