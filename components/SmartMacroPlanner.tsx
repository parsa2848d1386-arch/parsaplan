import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useUI } from '../context/UIContext';
import { Target, BrainCircuit, Activity, BookOpen, Star, Sparkles, Moon } from 'lucide-react';
import { MacroPlannerSkeleton } from './Skeleton';
import { getErrorMessage } from '../utils/formHelpers';
import { macroPlannerReportSchema, type MacroPlannerReport } from '../utils/schemas';
import { formatToPersianDigits } from '../utils';

const tryParseJson = (str: string): unknown => {
    try {
        return JSON.parse(str);
    } catch {
        return null;
    }
};

export default function SmartMacroPlanner() {
    const { tasks, getProgress, settings } = useStore();
    const { showToast } = useUI();

    const currentStream = settings?.stream || 'life';
    const isAcademicStream =
        currentStream === 'riazi' || currentStream === 'tajrobi' || currentStream === 'ensani';

    const [step, setStep] = useState(0);
    const [aiReport, setAiReport] = useState<MacroPlannerReport | null>(null);

    const [profile, setProfile] = useState({
        targetRank: '',
        examProvider: isAcademicStream ? 'ghalamchi' : 'focus_deep',
        examScore: '',
        sleepHours: 7,
        mathLevel: 'medium',
        scienceLevel: 'medium',
    });

    const EXAM_PROVIDERS = [
        { id: 'ghalamchi', label: 'قلم‌چی' },
        { id: 'maz', label: 'ماز' },
        { id: 'sanjesh', label: 'سنجش' },
        { id: 'gaj', label: 'گاج' },
        { id: 'other', label: 'سایر / مدرسه' },
    ];

    const GENERAL_FOCUS_STYLES = [
        { id: 'focus_deep', label: 'کار عمیق و پروژه' },
        { id: 'consistency', label: 'ساخت عادت و تداوم' },
        { id: 'speed_delivery', label: 'تحویل سریع و اسپرینت' },
        { id: 'balance', label: 'تعادل کار و زندگی' },
        { id: 'learning', label: 'یادگیری مهارت جدید' },
    ];

    const RESOURCE_LEVELS = isAcademicStream
        ? [
              { id: 'weak', label: 'پایه و درس‌نامه‌محور' },
              { id: 'medium', label: 'متوسط و استاندارد' },
              { id: 'hard', label: 'چالشی و سطح بالا' },
          ]
        : [
              { id: 'weak', label: 'آرام و بدون فشار (شروع سبک)' },
              { id: 'medium', label: 'متعادل و پایدار' },
              { id: 'hard', label: 'پرفشار و متمرکز بر نتیجه' },
          ];

    const handleAnalyze = async () => {
        setStep(3);

        const completed = tasks.filter((t) => t.isCompleted);
        const totalDuration = completed.reduce((acc, t) => acc + (t.actualDuration || 0), 0) / 60;
        const testTasks = completed.filter((t) => t.testStats && t.testStats.total > 0);
        const totalTests = testTasks.reduce((acc, t) => acc + (t.testStats?.total || 0), 0);
        const totalCorrect = testTasks.reduce((acc, t) => acc + (t.testStats?.correct || 0), 0);

        const modeContext = isAcademicStream
            ? `Iranian University Entrance Exam / Study consultant. Target: ${profile.targetRank}, Exam Provider: ${profile.examProvider}, Score/Level: ${profile.examScore}, Math/Physics Level: ${profile.mathLevel}, Science Level: ${profile.scienceLevel}`
            : `Productivity, personal goals & deep-work coach (stream: ${currentStream}). Primary Goal: ${profile.targetRank}, Execution Focus: ${profile.examProvider}, Current Blockers/Baseline: ${profile.examScore}, Intensity Preference: ${profile.mathLevel}, Energy Load: ${profile.scienceLevel}`;

        const prompt = `
        You are an expert ${modeContext}.
        Analyze the user's status based on real logged data and questionnaire:
        - Tracked Hours: ${totalDuration.toFixed(1)} hours
        - Completed Tasks: ${completed.length}
        - Practice Tests: ${totalTests} (Correct: ${totalCorrect})
        - General Progress: ${getProgress()}%
        - Daily Sleep: ${profile.sleepHours} hours

        Return ONLY plain JSON with this exact shape:
        {
            "overview": "concise paragraph of overall situation",
            "strengths": ["point 1", "point 2"],
            "weaknesses": ["point 1", "point 2"],
            "actionPlan": ["action 1", "action 2", "action 3"],
            "resourceAdvice": "specific actionable advice on tools/resources/schedule"
        }
        Do not wrap in markdown code fences. Write in natural, warm Persian.
        `;

        try {
            const res = await fetch('/api/gemini/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    model: settings?.geminiModel || 'gemini-4-hydrogen',
                    responseMimeType: 'application/json',
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'AI request failed');
            const response = data.text || '';

            const rawParsed = tryParseJson(response.replace(/```json/g, '').replace(/```/g, ''));
            const reportValidation = macroPlannerReportSchema.safeParse(rawParsed);
            if (reportValidation.success && reportValidation.data.overview) {
                setAiReport(reportValidation.data);
                setStep(4);
            } else {
                throw new Error('Invalid output format from AI');
            }
        } catch (e: unknown) {
            console.error(e);
            showToast(getErrorMessage(e, 'متاسفانه در تحلیل مشکلی پیش آمد. دوباره تلاش کنید.'), 'error');
            setStep(0);
        }
    };

    const providerList = isAcademicStream ? EXAM_PROVIDERS : GENERAL_FOCUS_STYLES;

    return (
        <div className="bg-[var(--surface-elevated)] squircle-lg shadow-xs border border-[var(--border-subtle)] overflow-hidden">
            {step === 0 && (
                <div className="p-6 sm:p-8 text-center">
                    <div className="w-14 h-14 bg-primary/12 text-primary squircle-sm flex items-center justify-center mx-auto mb-3.5">
                        <BrainCircuit size={28} aria-hidden="true" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-on-surface mb-2">مشاور هوشمند برنامه</h2>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-5 leading-relaxed">
                        {isAcademicStream
                            ? 'با بررسی ساعت مطالعه، روند آزمون‌ها و سطح منابع شما، یک نقشه راه اختصاصی و قابل اجرا تدوین می‌کند.'
                            : 'با بررسی تاریخچه تمرکز، عادت‌ها و اولویت‌های کاری شما، یک نقشه راه شخصی‌سازی‌شده برای هفته پیش‌رو پیشنهاد می‌دهد.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="min-h-[44px] bg-primary hover:brightness-110 text-on-primary px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition inline-flex items-center gap-2 cursor-pointer"
                    >
                        <Sparkles size={17} aria-hidden="true" /> شروع تحلیل هوشمند
                    </button>
                </div>
            )}

            {step === 1 && (
                <div className="p-5 sm:p-7">
                    <h3 className="font-bold text-on-surface mb-5 flex items-center gap-2 text-sm sm:text-base">
                        <Target size={19} className="text-primary" aria-hidden="true" />
                        {isAcademicStream ? 'اطلاعات پایه و هدف‌گذاری' : 'هدف‌گذاری و وضعیت فعلی'}
                    </h3>

                    <div className="space-y-4 max-w-md mx-auto">
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                                {isAcademicStream ? 'رتبه و رشته هدف شما چیست؟' : 'مهم‌ترین هدف دوره فعلی شما چیست؟'}
                            </label>
                            <input
                                value={profile.targetRank}
                                onChange={(e) => setProfile({ ...profile, targetRank: e.target.value })}
                                type="text"
                                placeholder={
                                    isAcademicStream
                                        ? 'مثلاً: پزشکی تهران یا مهندسی کامپیوتر'
                                        : 'مثلاً: تحویل نسخه جدید پروژه یا ۳۰ روز تداوم'
                                }
                                className="w-full min-h-[44px] bg-surface-container-low border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                                {isAcademicStream ? 'آزمون آزمایشی اصلی:' : 'اولویت اصلی این دوره:'}
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {providerList.map((ep) => (
                                    <button
                                        type="button"
                                        key={ep.id}
                                        onClick={() => setProfile({ ...profile, examProvider: ep.id })}
                                        className={`min-h-[40px] px-2.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                                            profile.examProvider === ep.id
                                                ? 'bg-primary-fixed text-on-primary-fixed border-primary/40'
                                                : 'bg-surface-container-low border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-on-surface'
                                        }`}
                                    >
                                        {ep.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                                {isAcademicStream
                                    ? 'میانگین تراز یا درصد فعلی:'
                                    : 'بزرگ‌ترین چالش فعلی (اختیاری):'}
                            </label>
                            <input
                                value={profile.examScore}
                                onChange={(e) => setProfile({ ...profile, examScore: e.target.value })}
                                type="text"
                                placeholder={
                                    isAcademicStream
                                        ? 'مثلاً: تراز ۶۵۰۰ یا میانگین ۴۵٪'
                                        : 'مثلاً: پراکندگی تمرکز در عصر یا حجم کار بالا'
                                }
                                className="w-full min-h-[44px] bg-surface-container-low border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
                                <Moon size={14} aria-hidden="true" /> میزان خواب شبانه‌روز ({formatToPersianDigits(profile.sleepHours)} ساعت)
                            </label>
                            <input
                                value={profile.sleepHours}
                                onChange={(e) => setProfile({ ...profile, sleepHours: Number(e.target.value) })}
                                type="range"
                                min="4"
                                max="10"
                                step="0.5"
                                className="w-full accent-primary cursor-pointer"
                            />
                        </div>

                        <div className="pt-3 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setStep(0)}
                                className="min-h-[42px] px-4 text-[var(--text-secondary)] bg-surface-container-low hover:bg-surface-container rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                                انصراف
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="min-h-[42px] px-6 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-xs hover:brightness-110 transition cursor-pointer"
                            >
                                مرحله بعد
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="p-5 sm:p-7">
                    <h3 className="font-bold text-on-surface mb-5 flex items-center gap-2 text-sm sm:text-base">
                        <BookOpen size={19} className="text-secondary" aria-hidden="true" />
                        {isAcademicStream ? 'سطح منابع تستی شما' : 'شدت و ریتم پیشنهادی برنامه'}
                    </h3>

                    <div className="space-y-5 max-w-md mx-auto">
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 pb-1.5 border-b border-[var(--border-subtle)]">
                                {isAcademicStream ? 'دروس محاسباتی و تحلیلی' : 'شدت زمان‌بندی روزانه'}
                            </label>
                            <div className="flex flex-col gap-2">
                                {RESOURCE_LEVELS.map((rl) => (
                                    <button
                                        type="button"
                                        key={rl.id}
                                        onClick={() => setProfile({ ...profile, mathLevel: rl.id })}
                                        className={`min-h-[42px] p-3 rounded-xl border text-xs font-bold transition text-start cursor-pointer ${
                                            profile.mathLevel === rl.id
                                                ? 'bg-secondary-container text-on-secondary-container border-secondary/40'
                                                : 'bg-surface-container-low border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-on-surface'
                                        }`}
                                    >
                                        {rl.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {isAcademicStream && (
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 pb-1.5 border-b border-[var(--border-subtle)]">
                                    دروس تخصصی و مفهومی
                                </label>
                                <div className="flex flex-col gap-2">
                                    {RESOURCE_LEVELS.map((rl) => (
                                        <button
                                            type="button"
                                            key={rl.id}
                                            onClick={() => setProfile({ ...profile, scienceLevel: rl.id })}
                                            className={`min-h-[42px] p-3 rounded-xl border text-xs font-bold transition text-start cursor-pointer ${
                                                profile.scienceLevel === rl.id
                                                    ? 'bg-primary-fixed text-on-primary-fixed border-primary/40'
                                                    : 'bg-surface-container-low border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-on-surface'
                                            }`}
                                        >
                                            {rl.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-3 flex justify-between items-center">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="min-h-[42px] px-3 text-[var(--text-secondary)] hover:text-on-surface text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                                <Target size={14} /> بازگشت
                            </button>
                            <button
                                type="button"
                                onClick={handleAnalyze}
                                className="min-h-[44px] px-6 py-2.5 bg-primary text-on-primary rounded-xl text-xs sm:text-sm font-bold shadow-sm hover:brightness-110 transition flex items-center gap-2 cursor-pointer"
                            >
                                <Activity size={17} /> تحلیل و پردازش
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && <MacroPlannerSkeleton />}

            {step === 4 && aiReport && (
                <div className="p-5 sm:p-7">
                    <div className="flex justify-between items-start mb-5 pb-4 border-b border-[var(--border-subtle)]">
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-primary flex items-center gap-2 mb-1">
                                <Sparkles size={20} className="text-amber-500" /> گزارش هوشمند شما
                            </h3>
                            <p className="text-xs font-bold text-[var(--text-secondary)]">
                                هدف: {profile.targetRank || 'ثبت نشده'} ·{' '}
                                {providerList.find((e) => e.id === profile.examProvider)?.label}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setStep(0)}
                            className="text-xs font-bold text-[var(--text-secondary)] hover:text-on-surface cursor-pointer"
                        >
                            اجرای مجدد
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-primary-fixed/35 p-4 rounded-2xl border border-primary/20 text-xs sm:text-sm leading-7 text-on-surface">
                            <strong>تحلیل کلی وضعیت: </strong>
                            {aiReport.overview}
                        </div>

                        <div className="grid md:grid-cols-2 gap-3.5">
                            <div className="bg-secondary-container/35 p-4 rounded-2xl border border-secondary/20">
                                <h4 className="font-bold text-secondary mb-2.5 text-xs sm:text-sm">نقاط قوت</h4>
                                <ul className="space-y-1.5">
                                    {aiReport.strengths?.map((item: string, i: number) => (
                                        <li key={i} className="text-xs text-on-surface flex gap-2 before:content-['✓'] before:text-secondary">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
                                <h4 className="font-bold text-rose-600 dark:text-rose-400 mb-2.5 text-xs sm:text-sm">
                                    نقاط نیازمند توجه
                                </h4>
                                <ul className="space-y-1.5">
                                    {aiReport.weaknesses?.map((item: string, i: number) => (
                                        <li key={i} className="text-xs text-on-surface flex gap-2 before:content-['!'] before:text-rose-500 before:font-bold">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
                            <h4 className="font-bold text-amber-700 dark:text-amber-300 mb-2.5 text-xs sm:text-sm flex items-center gap-1.5">
                                <Star size={15} /> برنامه عملیاتی
                            </h4>
                            <ul className="space-y-2">
                                {aiReport.actionPlan?.map((item: string, i: number) => (
                                    <li
                                        key={i}
                                        className="text-xs sm:text-sm font-medium text-on-surface flex items-start gap-2 bg-[var(--surface-elevated)] p-2.5 rounded-xl border border-[var(--border-subtle)]"
                                    >
                                        <span className="w-5 h-5 rounded-full bg-amber-500/25 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 tabular-nums">
                                            {formatToPersianDigits(i + 1)}
                                        </span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-surface-container-low p-4 rounded-2xl border border-[var(--border-subtle)]">
                            <h4 className="font-bold text-on-surface mb-1.5 text-xs sm:text-sm flex items-center gap-1.5">
                                <BookOpen size={15} className="text-primary" /> پیشنهاد ابزار و منابع
                            </h4>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{aiReport.resourceAdvice}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
