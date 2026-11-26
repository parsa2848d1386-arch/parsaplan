import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useUI } from '../context/UIContext';
import { parseBrainDumpText } from '../utils/brainDumpParser';
import { addDays, toIsoString, getDiffDays } from '../utils';
import { clearSessionDraft, loadSessionDraft, saveSessionDraft } from '../utils/formHelpers';
import { haptics } from '../utils/haptics';
import { SubjectTask } from '../types';
import AITaskReviewWindow, { ParsedTask } from './AITaskReviewWindow';
import { ModalSheet } from './ui/ModalSheet';
import { Sparkles, Mic, MicOff, Wand2, Cpu, Loader2, AlertCircle } from 'lucide-react';

const BRAINDUMP_DRAFT_KEY = 'parsaplan_draft_braindump_v1';

export const BrainDumpModal: React.FC = () => {
    const { addTasksBatch, startDate, currentDay, settings, subjects } = useStore();
    const { isBrainDumpOpen, setBrainDumpOpen, showToast } = useUI();

    const [rawText, setRawText] = useState<string>(() => loadSessionDraft<string>(BRAINDUMP_DRAFT_KEY) || '');
    const [inlineError, setInlineError] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [parsedPreview, setParsedPreview] = useState<ParsedTask[] | null>(null);

    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (rawText.trim()) {
            saveSessionDraft(BRAINDUMP_DRAFT_KEY, rawText);
        } else {
            clearSessionDraft(BRAINDUMP_DRAFT_KEY);
        }
    }, [rawText]);

    if (!isBrainDumpOpen) return null;

    const toggleVoice = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showToast('مرورگر شما از تشخیص گفتار پشتیبانی نمی‌کند.', 'warning');
            return;
        }
        if (isRecording && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsRecording(false);
            haptics.light();
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'fa-IR';
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
            let chunk = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                chunk += event.results[i][0].transcript + ' ';
            }
            setInlineError(null);
            setRawText((prev) => (prev ? `${prev}\n${chunk.trim()}` : chunk.trim()));
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
        haptics.medium();
    };

    const handleOfflineParse = () => {
        const results = parseBrainDumpText(rawText);
        if (results.length === 0) {
            const msg = 'حداقل یک کار یا برنامه برای تحلیل وارد کنید.';
            setInlineError(msg);
            haptics.warning();
            showToast(msg, 'warning');
            return;
        }
        setInlineError(null);
        haptics.light();
        const todayIso = toIsoString(new Date());
        const converted: ParsedTask[] = results.map((r) => {
            const targetDate = toIsoString(addDays(todayIso, r.dateOffset));
            return {
                title: r.topic,
                subject: r.subject,
                topic: r.topic,
                details: r.details,
                date: targetDate,
                studyType: r.studyType,
                startTime: r.startTime,
                durationMinutes: r.durationMinutes,
                priority: r.priority,
            };
        });
        setParsedPreview(converted);
    };

    const handleGeminiParse = async () => {
        if (!rawText.trim()) {
            const msg = 'لطفاً ابتدا متن برنامه یا فهرست کارهای خود را وارد کنید.';
            setInlineError(msg);
            haptics.warning();
            showToast(msg, 'warning');
            return;
        }

        setInlineError(null);
        setIsAiLoading(true);
        try {
            const todayIso = toIsoString(new Date());
            const subjectNames = subjects.map((s) => s.name).join('، ');

            const prompt = `متن زیر یادداشت یا لیست کارهای روزانه به زبان فارسی است (شامل کار، پروژه، ورزش، قرار ملاقات، کارهای شخصی یا مطالعه). آن را به یک آرایه JSON خالص (بدون مارک‌داون اضافه) از تسک‌ها تبدیل کن.
امروز: ${todayIso}
حوزه‌ها و دسته‌های موجود: ${subjectNames}
فرمت هر آیتم:
{"title":"عنوان کوتاه","subject":"نام دسته دقیق از لیست یا شخصی","topic":"عنوان کار","details":"توضیح کوتاه","date":"YYYY-MM-DD","studyType":"task|project|habit|health|meeting|creative|study|review|exam|analysis","startTime":"HH:mm optional","durationMinutes":60,"priority":"low|medium|high|urgent"}
متن کاربر:
${rawText}`;

            const res = await fetch('/api/gemini/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, model: settings.geminiModel || 'gemini-4-hydrogen' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'AI request failed');

            const txt = data.text || '';
            const match = txt.match(/\[[\s\S]*\]/);
            if (!match) throw new Error('JSON array not found');
            const arr = JSON.parse(match[0]) as any[];
            const converted: ParsedTask[] = arr.map((item) => ({
                title: item.title || item.topic || 'تسک جدید',
                subject: item.subject || 'شخصی',
                topic: item.topic || item.title || 'کار جدید',
                details: item.details || 'برنامه‌ریزی شده',
                date: item.date || todayIso,
                studyType: item.studyType || 'task',
                startTime: item.startTime,
                durationMinutes: Number(item.durationMinutes) || 60,
                priority: item.priority || 'medium',
            }));
            setParsedPreview(converted);
        } catch (e) {
            console.warn('Gemini BrainDump parse failed, falling back to offline parser:', e);
            handleOfflineParse();
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleConfirmAdd = () => {
        if (!parsedPreview) return;
        const batch: SubjectTask[] = parsedPreview.map((p, idx) => {
            const safeDate = p.date || toIsoString(new Date());
            return {
                id: `bd_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
                dayId: Math.max(1, getDiffDays(startDate, safeDate) + 1),
                date: safeDate,
                subject: p.subject || 'شخصی',
                topic: p.topic || p.title || 'تسک جدید',
                details: p.details || 'برنامه‌ریزی شده',
                testRange: p.testRange,
                isCompleted: false,
                status: 'todo',
                studyType: p.studyType || 'task',
                priority: p.priority || 'medium',
                startTime: p.startTime,
                durationMinutes: p.durationMinutes ?? 60,
                isCustom: true,
                tags: ['AI'],
            };
        });
        addTasksBatch(batch, 'تخلیه ذهن سریع');
        clearSessionDraft(BRAINDUMP_DRAFT_KEY);
        setParsedPreview(null);
        setRawText('');
        setBrainDumpOpen(false);
        haptics.success();
    };

    if (parsedPreview) {
        return (
            <AITaskReviewWindow
                tasks={parsedPreview}
                onClose={() => setParsedPreview(null)}
                onConfirm={handleConfirmAdd}
                onUpdateTasks={setParsedPreview}
                currentDayId={currentDay || 1}
            />
        );
    }

    const headerSlot = (
        <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Sparkles size={19} aria-hidden="true" />
            </div>
            <div className="min-w-0">
                <h2 className="text-base font-extrabold text-on-surface truncate">
                    تخلیه ذهن سریع (<bdi>Brain Dump</bdi>)
                </h2>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                    متن یا صوت بنویسید تا خودکار به تسک‌های زمان‌بندی‌شده تبدیل شود
                </p>
            </div>
        </div>
    );

    return (
        <ModalSheet
            isOpen={isBrainDumpOpen}
            onClose={() => setBrainDumpOpen(false)}
            title="تخلیه ذهن سریع"
            headerSlot={headerSlot}
            historyKey="braindump-modal"
            maxWidthClass="max-w-xl"
            dismissDisabled={isAiLoading}
        >
            <div className="p-5 space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5">
                <div className="space-y-1.5">
                    <label
                        htmlFor="braindump-textarea"
                        className="text-xs font-bold text-[var(--text-secondary)] block"
                    >
                        کارها و ایده‌های ذهنی خود را در هر خط بنویسید
                    </label>
                    <div className="relative">
                        <textarea
                            id="braindump-textarea"
                            data-autofocus="true"
                            rows={6}
                            value={rawText}
                            aria-invalid={Boolean(inlineError)}
                            aria-describedby={inlineError ? 'braindump-error' : 'braindump-hint'}
                            onChange={(e) => {
                                if (inlineError) setInlineError(null);
                                setRawText(e.target.value);
                            }}
                            placeholder={
                                'مثال:\nجلسه طراحی پروژه ساعت ۹ تا ۱۰:۳۰ فوری\nورزش و دویدن ۴۵ دقیقه عصر\nخرید منزل فردا ساعت ۱۸'
                            }
                            className={`w-full rounded-2xl border bg-surface-container-low p-4 pl-14 text-base sm:text-sm leading-7 text-on-surface outline-none transition ${
                                inlineError
                                    ? 'border-rose-500 focus:border-rose-500'
                                    : 'border-[var(--border-subtle)] focus:border-primary'
                            }`}
                        />
                        <button
                            type="button"
                            onClick={toggleVoice}
                            aria-label={isRecording ? 'توقف ضبط گفتار فارسی' : 'تبدیل گفتار فارسی به متن'}
                            aria-pressed={isRecording}
                            className={`absolute left-2.5 bottom-2.5 w-11 h-11 flex items-center justify-center rounded-xl shadow-xs transition cursor-pointer ${
                                isRecording
                                    ? 'bg-rose-600 text-white ring-4 ring-rose-500/25'
                                    : 'bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-primary'
                            }`}
                            title="تبدیل گفتار فارسی به متن"
                        >
                            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                        </button>
                    </div>
                    {inlineError && (
                        <p
                            id="braindump-error"
                            role="alert"
                            className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5"
                        >
                            <AlertCircle size={14} aria-hidden="true" />
                            <span>{inlineError}</span>
                        </p>
                    )}
                </div>

                <p id="braindump-hint" className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    پشتیبانی از اعداد فارسی/انگلیسی، بازه زمانی، مدت زمان، فوریت و همه حوزه‌های کار و زندگی. پیش‌نویس
                    شما به‌صورت خودکار ذخیره می‌شود.
                </p>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <button
                        type="button"
                        onClick={handleOfflineParse}
                        disabled={isAiLoading}
                        className="flex-1 min-h-[48px] py-3 px-4 rounded-2xl bg-primary hover:brightness-110 text-on-primary text-xs font-extrabold flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer disabled:opacity-60"
                    >
                        <Cpu size={16} aria-hidden="true" />
                        <span>تجزیه سریع آفلاین (فوری)</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleGeminiParse}
                        disabled={isAiLoading}
                        className="flex-1 min-h-[48px] py-3 px-4 rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-[var(--border-subtle)] text-xs font-extrabold flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer disabled:opacity-60"
                    >
                        {isAiLoading ? (
                            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                        ) : (
                            <Wand2 size={16} className="text-primary" aria-hidden="true" />
                        )}
                        <span>
                            تحلیل با هوش مصنوعی <bdi>Gemini</bdi>
                        </span>
                    </button>
                </div>
            </div>
        </ModalSheet>
    );
};
