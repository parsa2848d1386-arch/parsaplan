import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { StreamType } from '../types';
import { AuthModal } from '../components/AuthModal';
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Cloud, CloudOff, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';

const STREAM_OPTIONS: Array<{ id: StreamType; label: string }> = [
    { id: 'life', label: 'مدیریت کل زندگی' },
    { id: 'work', label: 'کار و پروژه' },
    { id: 'general', label: 'مطالعه و عمومی' },
    { id: 'riazi', label: 'کنکور ریاضی' },
    { id: 'tajrobi', label: 'کنکور تجربی' },
    { id: 'ensani', label: 'کنکور انسانی' },
];
const PRIMARY_STREAM_IDS: StreamType[] = ['life', 'work', 'general', 'tajrobi'];

const Welcome: React.FC = () => {
    const navigate = useNavigate();
    const {
        login,
        register,
        user,
        userName,
        setUserName,
        settings,
        updateSettings,
        loginOffline,
    } = useStore();

    const [nameInput, setNameInput] = useState(userName || '');
    const [selectedStream, setSelectedStream] = useState<StreamType>(settings?.stream || 'life');
    const [showAllStreams, setShowAllStreams] = useState(false);
    const [isAuthOpen, setIsAuthOpen] = useState(false);

    useEffect(() => {
        if (user) {
            try {
                localStorage.setItem('parsaplan_onboarded', '1');
            } catch {}
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    const applyInitialProfile = () => {
        const trimmedName = nameInput.trim();
        if (trimmedName) {
            setUserName?.(trimmedName);
        }
        updateSettings?.({ stream: selectedStream });
        try {
            localStorage.setItem('parsaplan_onboarded', '1');
        } catch {}
    };

    const handleStartOffline = () => {
        applyInitialProfile();
        loginOffline?.();
        navigate('/');
    };

    const handleOpenCloudAuth = () => {
        applyInitialProfile();
        setIsAuthOpen(true);
    };

    const navigateFeature = (path: string) => {
        applyInitialProfile();
        navigate(path);
    };

    return (
        <div
            className="min-h-screen bg-[var(--surface-canvas)] flex items-center justify-center px-4 py-8 sm:p-6 font-sans text-right pt-safe pb-safe"
            dir="rtl"
        >
            <AuthModal
                isOpen={isAuthOpen}
                onClose={() => setIsAuthOpen(false)}
                onLogin={async (u, p) => (login ? login(u, p) : false)}
                onRegister={async (u, p, n) => (register ? register(u, p, n) : false)}
                isLoading={false}
            />

            <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                {/* Right Column: Onboarding Setup */}
                <div className="space-y-6">
                    <div className="w-14 h-14 bg-primary text-on-primary rounded-[20px] flex items-center justify-center shadow-sm">
                        <span className="font-black text-2xl">P</span>
                    </div>

                    <div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-on-surface leading-[1.2] mb-3">
                            برنامه‌ریزی هوشمند <br />
                            <span className="text-primary">برای موفقیت شما</span>
                        </h1>
                        <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-lg leading-7">
                            ParsaPlan دستیار جامع شما برای مدیریت زمان، کارهای روزانه، پروژه‌ها، عادت‌ها و یادگیری است.
                            همین الان به صورت آفلاین شروع کنید یا حساب ابری خود را متصل نمایید.
                        </p>
                    </div>

                    {/* Quick First-Run Preferences (Opaque Semantic Card) */}
                    <div className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] squircle-lg p-4 sm:p-5 space-y-4 shadow-xs">
                        <div>
                            <label
                                htmlFor="welcome-name"
                                className="text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1.5"
                            >
                                <UserCheck size={14} className="text-primary" />
                                نام نمایشی شما (اختیاری)
                            </label>
                            <input
                                id="welcome-name"
                                type="text"
                                autoComplete="name"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                placeholder="مثلاً پارسا"
                                className="w-full px-4 py-3 squircle-sm bg-surface-container-low border border-[var(--border-subtle)] text-base sm:text-sm text-on-surface outline-none focus:border-primary"
                            />
                        </div>

                        <div>
                            <span className="text-xs font-bold text-on-surface mb-2 block">مسیر و سبک برنامه‌ریزی</span>
                            {(() => {
                                const curated = STREAM_OPTIONS.filter((o) => PRIMARY_STREAM_IDS.includes(o.id));
                                if (!curated.some((o) => o.id === selectedStream)) {
                                    const activeObj = STREAM_OPTIONS.find((o) => o.id === selectedStream);
                                    if (activeObj) curated.splice(curated.length - 1, 1, activeObj);
                                }
                                const visibleStreams = showAllStreams ? STREAM_OPTIONS : curated;
                                return (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {visibleStreams.map((opt) => {
                                                const active = selectedStream === opt.id;
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        aria-pressed={active}
                                                        onClick={() => setSelectedStream(opt.id)}
                                                        className={`min-h-[44px] px-3 py-2 squircle-sm text-xs font-bold border transition text-center cursor-pointer ${
                                                            active
                                                                ? 'bg-primary text-on-primary border-primary shadow-xs'
                                                                : 'bg-surface-container-low text-on-surface border-[var(--border-subtle)] hover:border-primary/40'
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            type="button"
                                            aria-expanded={showAllStreams}
                                            onClick={() => setShowAllStreams((prev) => !prev)}
                                            className="w-full min-h-[38px] px-3 py-1.5 squircle-sm border border-[var(--border-subtle)] bg-surface-container-low hover:bg-surface-container text-xs font-bold text-primary flex items-center justify-center gap-1.5 transition cursor-pointer"
                                        >
                                            <span>
                                                {showAllStreams ? 'نمایش کمتر' : 'سایر مسیرهای تخصصی (ریاضی، انسانی، ...)'}
                                            </span>
                                            {showAllStreams ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    <div className="space-y-2.5 text-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary/10 rounded-xl text-primary flex items-center justify-center shrink-0">
                                <Sparkles size={17} />
                            </div>
                            <span className="font-bold text-on-surface text-xs sm:text-sm">
                                تایم‌لاین ۲۴ ساعته، جدول ۱۰ دقیقه‌ای و تخلیه ذهن هوشمند
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <Cloud size={17} />
                            </div>
                            <span className="font-bold text-on-surface text-xs sm:text-sm">
                                ذخیره‌سازی آفلاین-محور به همراه همگام‌سازی ابری امن
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <CheckCircle2 size={17} />
                            </div>
                            <span className="font-bold text-on-surface text-xs sm:text-sm">
                                نماهای کانبان، آیزنهاور، کرنومتر تمرکز و اتاق‌های مطالعه
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-1">
                        <button
                            type="button"
                            onClick={handleStartOffline}
                            className="min-h-[48px] flex-1 px-6 py-3.5 bg-primary text-on-primary rounded-2xl font-bold text-sm hover:opacity-95 active:scale-[0.99] transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <CloudOff size={18} />
                            شروع فوری آفلاین
                            <ArrowLeft size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenCloudAuth}
                            className="min-h-[48px] flex-1 px-6 py-3.5 bg-[var(--surface-elevated)] hover:bg-surface-container text-on-surface border border-[var(--border-strong)] rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Cloud size={18} className="text-primary" />
                            ورود با گوگل / ایمیل
                        </button>
                    </div>
                </div>

                {/* Left Column: Capability Overview (Desktop) */}
                <div className="relative hidden lg:block">
                    <div className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-[28px] p-7 shadow-sm space-y-5">
                        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                            <div>
                                <h3 className="font-black text-base text-on-surface">آماده برای کل زندگی</h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    کار · ورزش · خانواده · مالی · آموزش
                                </p>
                            </div>
                            <ShieldCheck className="text-emerald-500" size={24} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <button
                                type="button"
                                onClick={() => navigateFeature('/planner')}
                                className="p-4 rounded-2xl bg-primary/8 border border-primary/20 text-right hover:bg-primary/12 transition cursor-pointer"
                            >
                                <div className="font-extrabold text-primary">تایم‌لاین ۲۴ ساعته</div>
                                <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                                    زمان‌بندی دقیق و گرید ۱۰ دقیقه‌ای
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => navigateFeature('/subjects')}
                                className="p-4 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 text-right hover:bg-emerald-500/12 transition cursor-pointer"
                            >
                                <div className="font-extrabold text-emerald-700 dark:text-emerald-300">کانبان و آیزنهاور</div>
                                <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                                    مدیریت ۶ نمایی پروژه‌ها و اهداف
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => navigateFeature('/leaderboard')}
                                className="p-4 rounded-2xl bg-sky-500/8 border border-sky-500/20 text-right hover:bg-sky-500/12 transition cursor-pointer"
                            >
                                <div className="font-extrabold text-sky-700 dark:text-sky-300">لیگ و اتاق‌های مطالعه</div>
                                <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                                    ساخت اتاق گروهی و تمرکز هم‌زمان
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => navigateFeature('/settings')}
                                className="p-4 rounded-2xl bg-amber-500/8 border border-amber-500/20 text-right hover:bg-amber-500/12 transition cursor-pointer"
                            >
                                <div className="font-extrabold text-amber-700 dark:text-amber-300">تنظیم هدف D-Day</div>
                                <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                                    انتخاب سبک استفاده و هدف شخصی
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Welcome;
