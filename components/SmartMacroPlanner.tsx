import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Sparkles, Send, Loader2, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
// @ts-ignore
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SubjectTask } from '../types';

export const SmartMacroPlanner = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { geminiApiKey, settings, showToast, totalDays, getDayDate, addTask } = useStore();
    const [goal, setGoal] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const activeApiKey = settings.geminiApiKey || geminiApiKey || localStorage.getItem('gemini_api_key') || '';
    const activeModel = settings.geminiModel || 'gemini-2.5-flash';

    const handleGenerate = async () => {
        if (!goal.trim()) {
            showToast('لطفا هدف خود را بنویسید', 'warning');
            return;
        }
        if (!activeApiKey) {
            showToast('لطفا ابتدا در تنظیمات کلید هوش مصنوعی را وارد کنید', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const genAI = new GoogleGenerativeAI(activeApiKey);
            const model = genAI.getGenerativeModel({ model: activeModel });

            const sysPrompt = `
شما برنامه‌ریز کلان و هوشمند ParsaPlan هستید.
کاربر یک هدف نهایی دارد: "${goal}"
او ${totalDays} روز زمان دارد.
وظیفه شما ایجاد یک برنامه کلی و پخش کردن وظایف (Tasks) برای روزهای آینده است.
خروجی فقط و فقط باید یک آرایه JSON معتبر باشد که حاوی تسک‌هاست. بدون هیچ متن اضافه‌ای وگرنه سیستم کرش میکند!

فرمت هر آیتم در آرایه:
{
  "subject": "ریاضی",
  "topic": "تابع",
  "studyType": "study" | "exam" | "review",
  "durationMinutes": 60,
  "dayId": (عددی بین 1 تا ${totalDays})
}

حداکثر 15 تسک کلیدی و متعادل را به صورت تصادفی در روزهای مجاز (${totalDays} روز) پخش کن تا کاربر شروعی هوشمندانه داشته باشد. خروجی فقط یک بلوک JSON باشد.
            `;

            const result = await model.generateContent(sysPrompt);
            const responseText = result.response.text();

            const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(jsonStr);

            if (Array.isArray(parsed)) {
                let addedCount = 0;
                parsed.forEach((t: any) => {
                    if (t.subject && t.topic) {
                        const dayId = Math.min(Math.max(1, t.dayId || 1), totalDays);
                        const newTask: SubjectTask = {
                            id: crypto.randomUUID(),
                            subject: t.subject,
                            topic: t.topic,
                            studyType: t.studyType || 'study',
                            details: t.durationMinutes ? `${t.durationMinutes} دقیقه` : '',
                            isCompleted: false,
                            isCustom: false,
                            date: getDayDate(dayId),
                            dayId: dayId
                        };
                        addTask(newTask);
                        addedCount++;
                    }
                });
                showToast(`${addedCount} تسک با موفقیت توسط هوش مصنوعی برنامه‌ریزی شد!`, 'success');
                onClose();
            } else {
                throw new Error("Invalid output format");
            }
        } catch (error) {
            console.error(error);
            showToast('خطا در ارتباط با هوش مصنوعی یا پردازش اطلاعات', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 md:p-8"
                    >
                        <button
                            onClick={onClose}
                            className="absolute left-4 top-4 p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full text-gray-500 transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-5 border border-indigo-100 dark:border-indigo-800/50">
                            <Brain size={28} className="text-indigo-600 dark:text-indigo-400" />
                        </div>

                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">برنامه‌ریزی کلان با هوش مصنوعی</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                            هدف نهایی خودت رو برای کل این دوره بنویس. من تمام تسک‌ها، مرورها و آزمون‌ها رو هوشمندانه تا روز کنکورت پخش می‌کنم.
                        </p>

                        <div className="space-y-4">
                            <div className="relative">
                                <textarea
                                    value={goal}
                                    onChange={e => setGoal(e.target.value)}
                                    placeholder="مثال: می‌خوام کل فیزیک دوازدهم و یازدهم رو مسلط بشم..."
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 min-h-[120px] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                />
                                <Sparkles size={16} className="absolute right-3 bottom-3 text-indigo-400 opacity-50" />
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={isLoading || !goal.trim()}
                                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold shadow-lg transition-all ${isLoading || !goal.trim() ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed shadow-none' : 'bg-gradient-to-l from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/30 hover:shadow-indigo-500/50 active:scale-95'}`}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>در حال تحلیل و برنامه‌ریزی ده‌ها تسک...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        <span>برنامه‌ریزی هوشمندانه کل دوره</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
