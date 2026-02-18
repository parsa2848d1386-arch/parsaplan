
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { ArrowRight, CheckCircle2, Cloud, ShieldCheck, Sparkles } from 'lucide-react';

const Welcome: React.FC = () => {
    const navigate = useNavigate();
    const { login, register, user, isSyncing } = useStore();

    React.useEffect(() => {
        if (user) {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6 font-sans text-right" dir="rtl">
            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                {/* Left Side: Content */}
                <div className="space-y-8 animate-in slide-in-from-bottom-10 fade-in duration-700">
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                        <span className="text-white font-black text-3xl">P</span>
                    </div>

                    <div>
                        <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white leading-tight mb-4">
                            برنامه‌ریزی هوشمند <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">برای موفقیت شما</span>
                        </h1>
                        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-lg leading-relaxed">
                            پارسافل، دستیار هوشمند شما برای مدیریت زمان، دروس و آزمون‌ها.
                            با کمک هوش مصنوعی، مسیر موفقیت خود را هموار کنید.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-xl text-indigo-600 dark:text-indigo-400"><Sparkles size={20} /></div>
                            <span className="font-bold text-gray-700 dark:text-gray-200">دستیار هوشمند با قابلیت چت و مدیریت تسک</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl text-emerald-600 dark:text-emerald-400"><Cloud size={20} /></div>
                            <span className="font-bold text-gray-700 dark:text-gray-200">ذخیره‌سازی ابری امن و همگام‌سازی لحظه‌ای</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-xl text-orange-600 dark:text-orange-400"><CheckCircle2 size={20} /></div>
                            <span className="font-bold text-gray-700 dark:text-gray-200">پیگیری دقیق روند پیشرفت و تحلیل عملکرد</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button
                            onClick={() => navigate('/')}
                            className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold hover:scale-105 transition-transform shadow-xl flex items-center justify-center gap-2"
                        >
                            شروع کنید
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Right Side: Visual */}
                <div className="relative hidden lg:block animate-in zoom-in-95 fade-in duration-1000 delay-200">
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl transform rotate-12"></div>
                    <div className="relative bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl border border-white/50 dark:border-gray-700 rounded-3xl p-8 shadow-2xl skew-y-[-2deg] hover:skew-y-0 transition-transform duration-700">
                        {/* Mock UI Element */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded"></div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 p-4 flex items-center gap-4">
                                <div className="bg-indigo-500 w-12 h-12 rounded-xl flex items-center justify-center text-white"><Sparkles /></div>
                                <div>
                                    <div className="h-4 w-40 bg-indigo-200 dark:bg-indigo-800 rounded mb-2"></div>
                                    <div className="h-3 w-24 bg-indigo-100 dark:bg-indigo-900 rounded"></div>
                                </div>
                            </div>
                            <div className="h-24 bg-white dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600 p-4 flex items-center gap-4 opacity-70">
                                <div className="bg-gray-200 dark:bg-gray-600 w-12 h-12 rounded-xl"></div>
                                <div>
                                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                                    <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Welcome;
