import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useStore } from '../context/StoreContext';
import { StreamType } from '../types';
import { AuthModal } from '../components/AuthModal';
import { BrandLogo } from '../components/BrandLogo';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    Cloud,
    CloudOff,
    Sparkles,
    Target,
    UserCheck,
    X,
} from 'lucide-react';
import { formatToPersianDigits } from '../utils';
import { haptics } from '../utils/haptics';
import { TRANSITION_FAST } from '../utils/motionPresets';

const STREAM_OPTIONS: Array<{ id: StreamType; label: string; desc: string }> = [
    { id: 'life', label: 'مدیریت کل زندگی', desc: 'کار، عادت‌ها، ورزش و رشد شخصی' },
    { id: 'work', label: 'کار و پروژه', desc: 'وظایف شغلی، فریلنس و جلسات' },
    { id: 'general', label: 'مطالعه و عمومی', desc: 'کتاب، زبان، مهارت و یادگیری آزاد' },
    { id: 'tajrobi', label: 'کنکور تجربی', desc: 'دروس تخصصی تجربی و تست‌زنی' },
    { id: 'riazi', label: 'کنکور ریاضی', desc: 'دروس تخصصی ریاضی و فیزیک' },
    { id: 'ensani', label: 'کنکور انسانی', desc: 'دروس تخصصی انسانی و حفظیات' },
];
const PRIMARY_STREAM_IDS: StreamType[] = ['life', 'work', 'general', 'tajrobi'];

const FOCUS_PRESETS = [
    { id: 'classic', label: 'کلاسیک', work: 25, rest: 5, hint: 'پومودوروی استاندارد برای تمرکز روزانه' },
    { id: 'deep', label: 'عمیق', work: 50, rest: 10, hint: 'مناسب مطالعه تحلیلی و حل تست' },
    { id: 'marathon', label: 'ماراتن', work: 90, rest: 15, hint: 'بلوک‌های طولانی بدون حواس‌پرتی' },
] as const;

const DAILY_GOAL_HOURS = [4, 6, 8, 10] as const;

const TOTAL_SLIDES = 4;

const Welcome: React.FC = () => {
    const navigate = useNavigate();
    const prefersReducedMotion = useReducedMotion();
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

    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const [nameInput, setNameInput] = useState(userName || '');
    const [selectedStream, setSelectedStream] = useState<StreamType>(settings?.stream || 'life');
    const [showAllStreams, setShowAllStreams] = useState(false);
    const [workMins, setWorkMins] = useState(settings?.pomodoroWorkMinutes ?? 25);
    const [breakMins, setBreakMins] = useState(settings?.pomodoroBreakMinutes ?? 5);
    const [goalHours, setGoalHours] = useState(() =>
        Math.max(2, Math.round(((settings?.dailyCapacityMinutes ?? 360) / 60)))
    );
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
        updateSettings?.({
            stream: selectedStream,
            pomodoroWorkMinutes: workMins,
            pomodoroBreakMinutes: breakMins,
            dailyCapacityMinutes: goalHours * 60,
        });
        try {
            localStorage.setItem('parsaplan_onboarded', '1');
        } catch {}
    };

    const handleSkip = () => {
        haptics.light();
        applyInitialProfile();
        loginOffline?.();
        navigate('/');
    };

    const handleStartOffline = () => {
        haptics.success();
        applyInitialProfile();
        loginOffline?.();
        navigate('/');
    };

    const handleOpenCloudAuth = () => {
        haptics.medium();
        applyInitialProfile();
        setIsAuthOpen(true);
    };

    const goNext = () => {
        haptics.light();
        setDirection(1);
        setStep((prev) => Math.min(TOTAL_SLIDES - 1, prev + 1));
    };

    const goBack = () => {
        haptics.light();
        setDirection(-1);
        setStep((prev) => Math.max(0, prev - 1));
    };

    const curated = STREAM_OPTIONS.filter((o) => PRIMARY_STREAM_IDS.includes(o.id));
    if (!curated.some((o) => o.id === selectedStream)) {
        const activeObj = STREAM_OPTIONS.find((o) => o.id === selectedStream);
        if (activeObj) curated.splice(curated.length - 1, 1, activeObj);
    }
    const visibleStreams = showAllStreams ? STREAM_OPTIONS : curated;

    const slideVariants = {
        enter: (dir: number) => ({
            opacity: 0,
            x: prefersReducedMotion ? 0 : dir > 0 ? -24 : 24,
        }),
        center: {
            opacity: 1,
            x: 0,
        },
        exit: (dir: number) => ({
            opacity: 0,
            x: prefersReducedMotion ? 0 : dir > 0 ? 24 : -24,
        }),
    };

    return (
        <div
            className="min-h-[100dvh] bg-[var(--surface-canvas)] flex flex-col justify-between px-4 py-5 sm:p-6 font-sans text-start pt-safe pb-safe"
            dir="rtl"
        >
            <AuthModal
                isOpen={isAuthOpen}
                onClose={() => setIsAuthOpen(false)}
                onLogin={async (u, p) => (login ? login(u, p) : false)}
                onRegister={async (u, p, n) => (register ? register(u, p, n) : false)}
                isLoading={false}
            />

            {/* Top Minimal Header: Brand + Progress Dots + Always-Available Skip */}
            <header className="max-w-xl w-full mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 bg-primary text-on-primary squircle-sm flex items-center justify-center shadow-xs shrink-0">
                        <BrandLogo size={22} title="ParsaPlan" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-on-surface">پارساپلان</span>
                        <span className="text-[11px] font-bold text-[var(--text-tertiary)] tabular-nums">
                            گام {formatToPersianDigits(step + 1)} از {formatToPersianDigits(TOTAL_SLIDES)}
                        </span>
                    </div>
                </div>

                {/* Progress Bars */}
                <div className="hidden xs:flex items-center gap-1.5" aria-hidden="true">
                    {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => (
                        <span
                            key={idx}
                            className={`h-1.5 rounded-full transition-all duration-200 ${
                                idx === step
                                    ? 'w-7 bg-primary'
                                    : idx < step
                                      ? 'w-3 bg-primary/45'
                                      : 'w-2 bg-[var(--border-strong)]'
                            }`}
                        />
                    ))}
                </div>

                <button
                    type="button"
                    onClick={handleSkip}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)] hover:text-on-surface inline-flex items-center gap-1 transition cursor-pointer"
                >
                    <span>رد کردن</span>
                    <X size={14} aria-hidden="true" />
                </button>
            </header>

            {/* Centered Step Carousel Card */}
            <main className="max-w-xl w-full mx-auto my-auto py-4">
                <div className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-[28px] p-5 sm:p-7 shadow-sm overflow-hidden">
                    <AnimatePresence mode="wait" custom={direction}>
                        {step === 0 && (
                            <motion.div
                                key="slide-0"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={TRANSITION_FAST}
                                className="space-y-6"
                            >
                                <div className="space-y-2.5 text-center sm:text-start">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold">
                                        <Sparkles size={13} aria-hidden="true" />
                                        خوش آمدید
                                    </span>
                                    <h1 className="text-2xl sm:text-3xl font-black text-on-surface leading-snug">
                                        برنامه‌ریزی آزاد، ساده و{' '}
                                        <span className="text-primary">هوشمند</span>
                                    </h1>
                                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-7">
                                        بدون قالب‌های اجباری! کارها و تست‌های روزانه‌تان را آزادانه بچینید،
                                        با تایمر تمرکز کنید و با دستیار هوشمند در چند ثانیه برنامه بسازید.
                                    </p>
                                </div>

                                <div className="bg-surface-container-low border border-[var(--border-subtle)] rounded-2xl p-4 space-y-2">
                                    <label
                                        htmlFor="welcome-name"
                                        className="text-xs font-bold text-on-surface flex items-center gap-1.5"
                                    >
                                        <UserCheck size={14} className="text-primary" aria-hidden="true" />
                                        چطور صدایتان کنیم؟ (اختیاری)
                                    </label>
                                    <input
                                        id="welcome-name"
                                        type="text"
                                        autoComplete="name"
                                        value={nameInput}
                                        onChange={(e) => setNameInput(e.target.value)}
                                        placeholder="مثلاً پارسا"
                                        className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-base sm:text-sm text-on-surface outline-none focus:border-primary"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {step === 1 && (
                            <motion.div
                                key="slide-1"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={TRANSITION_FAST}
                                className="space-y-4"
                            >
                                <div>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold mb-2">
                                        <Target size={13} aria-hidden="true" />
                                        شخصی‌سازی فضا
                                    </span>
                                    <h2 className="text-xl sm:text-2xl font-black text-on-surface">
                                        الان بیشتر روی چه مسیری تمرکز دارید؟
                                    </h2>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                                        دسته‌بندی پیش‌فرض کارها متناسب با انتخاب شما چیده می‌شود و همیشه قابل تغییر است.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {visibleStreams.map((opt) => {
                                        const active = selectedStream === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                aria-pressed={active}
                                                onClick={() => {
                                                    haptics.light();
                                                    setSelectedStream(opt.id);
                                                }}
                                                className={`min-h-[56px] p-3.5 rounded-2xl border text-start transition cursor-pointer flex items-center justify-between gap-2 ${
                                                    active
                                                        ? 'bg-primary/10 border-primary ring-1 ring-primary/35'
                                                        : 'bg-surface-container-low border-[var(--border-subtle)] hover:border-primary/40'
                                                }`}
                                            >
                                                <div className="min-w-0">
                                                    <div className="text-xs sm:text-sm font-extrabold text-on-surface">
                                                        {opt.label}
                                                    </div>
                                                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
                                                        {opt.desc}
                                                    </div>
                                                </div>
                                                {active && (
                                                    <CheckCircle2 size={18} className="text-primary shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    aria-expanded={showAllStreams}
                                    onClick={() => setShowAllStreams((prev) => !prev)}
                                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-surface-container-low hover:bg-surface-container text-xs font-bold text-primary flex items-center justify-center gap-1.5 transition cursor-pointer"
                                >
                                    <span>
                                        {showAllStreams ? 'نمایش کمتر' : 'سایر مسیرهای تخصصی (ریاضی، انسانی، ...)'}
                                    </span>
                                    {showAllStreams ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="slide-2"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={TRANSITION_FAST}
                                className="space-y-5"
                            >
                                <div>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold mb-2">
                                        <Clock size={13} aria-hidden="true" />
                                        ریتم دلخواه شما
                                    </span>
                                    <h2 className="text-xl sm:text-2xl font-black text-on-surface">
                                        چقدر در روز می‌خواهید تمرکز کنید؟
                                    </h2>
                                </div>

                                {/* Daily Goal Hour Pills */}
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-[var(--text-secondary)] block">
                                        هدف تمرکز روزانه
                                    </span>
                                    <div className="grid grid-cols-4 gap-2">
                                        {DAILY_GOAL_HOURS.map((hrs) => {
                                            const active = goalHours === hrs;
                                            return (
                                                <button
                                                    key={hrs}
                                                    type="button"
                                                    onClick={() => {
                                                        haptics.light();
                                                        setGoalHours(hrs);
                                                    }}
                                                    className={`min-h-[46px] rounded-2xl border text-xs sm:text-sm font-black tabular-nums transition cursor-pointer ${
                                                        active
                                                            ? 'bg-primary text-on-primary border-primary shadow-xs'
                                                            : 'bg-surface-container-low text-on-surface border-[var(--border-subtle)] hover:border-primary/40'
                                                    }`}
                                                >
                                                    {formatToPersianDigits(hrs)} ساعت
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Focus Rhythm Presets */}
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-[var(--text-secondary)] block">
                                        الگوی تایمر فوکوس (کار / استراحت)
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {FOCUS_PRESETS.map((preset) => {
                                            const active = workMins === preset.work && breakMins === preset.rest;
                                            return (
                                                <button
                                                    key={preset.id}
                                                    type="button"
                                                    onClick={() => {
                                                        haptics.light();
                                                        setWorkMins(preset.work);
                                                        setBreakMins(preset.rest);
                                                    }}
                                                    className={`p-3 rounded-2xl border text-start transition cursor-pointer ${
                                                        active
                                                            ? 'bg-emerald-500/12 border-emerald-500 ring-1 ring-emerald-500/35'
                                                            : 'bg-surface-container-low border-[var(--border-subtle)] hover:border-primary/40'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-extrabold text-on-surface">
                                                            {preset.label}
                                                        </span>
                                                        <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                            {formatToPersianDigits(preset.work)}/{formatToPersianDigits(preset.rest)}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                                                        {preset.hint}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="slide-3"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={TRANSITION_FAST}
                                className="space-y-5"
                            >
                                <div className="text-center sm:text-start space-y-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold">
                                        <Cloud size={13} aria-hidden="true" />
                                        همگام‌سازی و ذخیره امن
                                    </span>
                                    <h2 className="text-xl sm:text-2xl font-black text-on-surface">
                                        همه‌چیز آماده شروع است{nameInput.trim() ? `، ${nameInput.trim()}` : ''}!
                                    </h2>
                                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-6">
                                        با ساخت حساب کاربری، تمام کارها، تست‌ها و سوابق تمرکز شما به‌صورت امن در فضای ابری ذخیره می‌شوند و روی همه دستگاه‌ها همگام می‌مانند.
                                    </p>
                                </div>

                                <div className="space-y-2.5">
                                    <button
                                        type="button"
                                        onClick={handleOpenCloudAuth}
                                        className="w-full min-h-[52px] px-5 py-3.5 bg-primary text-on-primary rounded-2xl font-extrabold text-sm hover:opacity-95 active:scale-[0.99] transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Cloud size={18} aria-hidden="true" />
                                        ورود یا ساخت حساب ابری (پیشنهادی)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleStartOffline}
                                        className="w-full min-h-[48px] px-5 py-3 bg-surface-container-low hover:bg-surface-container text-on-surface border border-[var(--border-subtle)] rounded-2xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <CloudOff size={17} aria-hidden="true" />
                                        شروع سریع آفلاین (روی همین دستگاه)
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Slide Navigation Footer */}
                    {step < TOTAL_SLIDES - 1 ? (
                        <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-[var(--border-subtle)]">
                            {step > 0 ? (
                                <button
                                    type="button"
                                    onClick={goBack}
                                    className="min-h-[44px] px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)] inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                    <ArrowRight size={15} aria-hidden="true" />
                                    قبلی
                                </button>
                            ) : (
                                <div />
                            )}

                            <button
                                type="button"
                                onClick={goNext}
                                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 shadow-xs hover:brightness-110 transition cursor-pointer"
                            >
                                <span>ادامه</span>
                                <ArrowLeft size={16} aria-hidden="true" />
                            </button>
                        </div>
                    ) : (
                        <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] flex justify-start">
                            <button
                                type="button"
                                onClick={goBack}
                                className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-on-surface inline-flex items-center gap-1 cursor-pointer"
                            >
                                <ArrowRight size={14} aria-hidden="true" />
                                بازگشت به تنظیمات قبلی
                            </button>
                        </div>
                    )}
                </div>
            </main>

            <footer className="max-w-xl w-full mx-auto text-center text-[11px] text-[var(--text-tertiary)]">
                تمام تنظیمات بعداً در بخش «تنظیمات» قابل تغییر هستند.
            </footer>
        </div>
    );
};

export default Welcome;
