
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
                            ParsaPlan دستیار جامع شما برای مدیریت زمان، کارهای روزانه، پروژه‌ها، عادت‌ها، سلامت و یادگیری است.
                            بدون اطلاعات شلوغ از پیش‌پر‌شده، فضای کاری خود را به سبک خودتان بسازید.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-xl text-indigo-600 dark:text-indigo-400"><Sparkles size={20} /></div>
                            <span className="font-bold text-gray-700 dark:text-gray-200">تایم‌لاین ۲۴ ساعته، جدول ۱۰ دقیقه‌ای و تخلیه ذهن هوشمند</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl text-emerald-600 dark:text-emerald-400"><Cloud size={20} /></div>
                            <span className="font-bold text-gray-700 dark:text-gray-200">ذخیره‌سازی آفلاین-محور به همراه همگام‌سازی ابری امن</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-xl text-orange-600 dark:text-orange-400"><CheckCircle2 size={20} /></div>
                            <span className="font-bold text-gray-700 dark:text-gray-200">نماهای کانبان، آیزنهاور، جدول، کرنومتر تمرکز و اتاق‌های مطالعه YPT</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button
                            onClick={() => navigate('/')}
                            className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold hover:scale-105 transition-transform shadow-xl flex items-center justify-center gap-2"
                        >
                            ورود به داشبورد شخصی
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Right Side: Interactive Capability Overview (zero mock placeholders) */}
                <div className="relative hidden lg:block animate-in zoom-in-95 fade-in duration-1000 delay-200">
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl transform rotate-12"></div>
                    <div className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/60 dark:border-gray-700 rounded-3xl p-8 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
                            <div>
                                <h3 className="font-black text-base text-gray-800 dark:text-white">آماده برای کل زندگی</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">کار • ورزش • خانواده • مالی • آموزش</p>
                            </div>
                            <ShieldCheck className="text-emerald-500" size={26} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <button
                                onClick={() => navigate('/planner')}
                                className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 text-right hover:scale-[1.02] transition"
                            >
                                <div className="font-black text-indigo-700 dark:text-indigo-300">🗓️ تایم‌لاین ۲۴ ساعته</div>
                                <div className="text-[11px] text-indigo-500 dark:text-indigo-400 mt-1">زمان‌بندی دقیق و گرید ۱۰ دقیقه‌ای</div>
                            </button>
                            <button
                                onClick={() => navigate('/subjects')}
                                className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 text-right hover:scale-[1.02] transition"
                            >
                                <div className="font-black text-emerald-700 dark:text-emerald-300">📋 کانبان و آیزنهاور</div>
                                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">مدیریت ۶ نمایی پروژه‌ها و اهداف</div>
                            </button>
                            <button
                                onClick={() => navigate('/leaderboard')}
                                className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/40 text-right hover:scale-[1.02] transition"
                            >
                                <div className="font-black text-purple-700 dark:text-purple-300">🏆 لیگ و اتاق‌های مطالعه</div>
                                <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-1">ساخت اتاق گروهی و تمرکز هم‌زمان</div>
                            </button>
                            <button
                                onClick={() => navigate('/settings')}
                                className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/40 text-right hover:scale-[1.02] transition"
                            >
                                <div className="font-black text-amber-700 dark:text-amber-300">🎯 تنظیم هدف D-Day</div>
                                <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">انتخاب سبک استفاده و هدف شخصی</div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Welcome;
