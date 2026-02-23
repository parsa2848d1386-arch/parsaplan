import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageSquare, Plus, X, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WelcomeBannerProps {
    visible: boolean;
    onDismiss: () => void;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ visible, onDismiss }) => {
    const navigate = useNavigate();

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 shadow-xl shadow-indigo-300/30 dark:shadow-indigo-900/40"
                >
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
                    <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full translate-y-14 -translate-x-14" />
                    <div className="absolute top-4 left-8 w-2 h-2 bg-amber-300 rounded-full animate-pulse" />
                    <div className="absolute bottom-8 right-12 w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />

                    {/* Close button */}
                    <button
                        onClick={onDismiss}
                        className="absolute top-3 left-3 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition text-white/70 hover:text-white"
                    >
                        <X size={14} />
                    </button>

                    <div className="relative z-10">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                                <Sparkles size={20} className="text-amber-300" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white">به ParsaPlan خوش آمدید! 🎉</h2>
                                <p className="text-[11px] text-indigo-200">دستیار هوشمند برنامه‌ریزی شما</p>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-indigo-100 leading-relaxed mb-4">
                            اینجا می‌تونید با کمک هوش مصنوعی برنامه مطالعاتی بسازید، تسک‌هاتون رو مدیریت کنید و پیشرفتتون رو رصد کنید.
                            برای شروع از دکمه‌های زیر استفاده کنید!
                        </p>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={() => { navigate('/ai-chat'); onDismiss(); }}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-50 active:scale-95 transition-all shadow-md"
                            >
                                <MessageSquare size={15} />
                                ساخت برنامه با هوش مصنوعی
                            </button>
                            <button
                                onClick={() => { navigate('/subjects'); onDismiss(); }}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/15 text-white rounded-xl font-bold text-xs hover:bg-white/25 active:scale-95 transition-all border border-white/20"
                            >
                                <Plus size={15} />
                                افزودن تسک دستی
                            </button>
                        </div>

                        {/* Tips */}
                        <div className="mt-4 flex items-start gap-2 bg-white/10 rounded-xl p-3">
                            <BookOpen size={14} className="text-amber-300 mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] text-indigo-200 leading-relaxed">
                                <span className="font-bold text-white">راهنمایی:</span> می‌تونید به دستیار AI بگید «یک برنامه ۱۲ روزه مطالعاتی برای کنکور بساز» تا خودش همه چیز رو آماده کنه!
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
