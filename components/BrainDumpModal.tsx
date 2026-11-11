import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useStore } from '../context/StoreContext';
import { useUI } from '../context/UIContext';
import { parseBrainDumpText } from '../utils/brainDumpParser';
import { addDays, toIsoString, getDiffDays } from '../utils';
import { SubjectTask, TaskPriority } from '../types';
import AITaskReviewWindow, { ParsedTask } from './AITaskReviewWindow';
import { Sparkles, Mic, MicOff, X, Wand2, Cpu, Loader2 } from 'lucide-react';

interface ExtraMeta {
    startTime?: string;
    durationMinutes?: number;
    priority?: TaskPriority;
}

export const BrainDumpModal: React.FC = () => {
    const { addTasksBatch, startDate, currentDay, geminiApiKey, settings, subjects } = useStore();
    const { isBrainDumpOpen, setBrainDumpOpen, showToast } = useUI();

    const [rawText, setRawText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [parsedPreview, setParsedPreview] = useState<ParsedTask[] | null>(null);
    const [metaMap, setMetaMap] = useState<Record<number, ExtraMeta>>({});

    const recognitionRef = useRef<any>(null);

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
            setRawText((prev) => (prev ? `${prev}\n${chunk.trim()}` : chunk.trim()));
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    };

    const handleOfflineParse = () => {
        const results = parseBrainDumpText(rawText);
        if (results.length === 0) {
            showToast('حداقل یک کار یا برنامه برای تحلیل وارد کنید.', 'warning');
            return;
        }
        const todayIso = toIsoString(new Date());
        const metas: Record<number, ExtraMeta> = {};
        const converted: ParsedTask[] = results.map((r, idx) => {
            metas[idx] = {
                startTime: r.startTime,
                durationMinutes: r.durationMinutes,
                priority: r.priority,
            };
            const targetDate = toIsoString(addDays(todayIso, r.dateOffset));
            return {
                title: r.topic,
                subject: r.subject,
                topic: r.topic,
                details: r.details,
                date: targetDate,
                studyType: r.studyType,
            };
        });
        setMetaMap(metas);
        setParsedPreview(converted);
    };

    const handleGeminiParse = async () => {
        if (!rawText.trim()) {
            showToast('متن برنامه را وارد کنید.', 'warning');
            return;
        }
        if (!geminiApiKey) {
            handleOfflineParse();
            return;
        }

        setIsAiLoading(true);
        try {
            const genAI = new GoogleGenerativeAI(geminiApiKey);
            const model = genAI.getGenerativeModel({ model: settings.geminiModel || 'gemini-2.0-flash' });
            const todayIso = toIsoString(new Date());
            const subjectNames = subjects.map((s) => s.name).join('، ');

            const prompt = `متن زیر یادداشت یا لیست کارهای روزانه به زبان فارسی است (شامل کار، پروژه، ورزش، قرار ملاقات، کارهای شخصی یا مطالعه). آن را به یک آرایه JSON خالص (بدون مارک‌داون اضافه) از تسک‌ها تبدیل کن.
امروز: ${todayIso}
حوزه‌ها و دسته‌های موجود: ${subjectNames}
فرمت هر آیتم:
{"title":"عنوان کوتاه","subject":"نام دسته دقیق از لیست یا شخصی","topic":"عنوان کار","details":"توضیح کوتاه","date":"YYYY-MM-DD","studyType":"task|project|habit|health|meeting|creative|study|review|exam|analysis","startTime":"HH:mm optional","durationMinutes":60,"priority":"low|medium|high|urgent"}
متن کاربر:
${rawText}`;

            const res = await model.generateContent(prompt);
            const txt = res.response.text();
            const match = txt.match(/\[[\s\S]*\]/);
            if (!match) throw new Error('JSON array not found');
            const arr = JSON.parse(match[0]) as any[];
            const metas: Record<number, ExtraMeta> = {};
            const converted: ParsedTask[] = arr.map((item, idx) => {
                metas[idx] = {
                    startTime: item.startTime,
                    durationMinutes: Number(item.durationMinutes) || 60,
                    priority: item.priority || 'medium',
                };
                return {
                    title: item.title || item.topic || 'تسک جدید',
                    subject: item.subject || 'شخصی',
                    topic: item.topic || item.title || 'کار جدید',
                    details: item.details || 'برنامه‌ریزی شده',
                    date: item.date || todayIso,
                    studyType: item.studyType || 'task',
                };
            });
            setMetaMap(metas);
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
            const extra = metaMap[idx] || {};
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
                priority: extra.priority || 'medium',
                startTime: extra.startTime,
                durationMinutes: extra.durationMinutes ?? 60,
                isCustom: true,
                tags: ['AI'],
            };
        });
        addTasksBatch(batch, 'تخلیه ذهن سریع');
        setParsedPreview(null);
        setRawText('');
        setBrainDumpOpen(false);
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

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
            onClick={() => setBrainDumpOpen(false)}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 rounded-3xl max-w-xl w-full overflow-hidden border border-amber-200/70 dark:border-gray-700 shadow-2xl"
            >
                <div className="p-5 bg-gradient-to-l from-amber-500 to-orange-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Sparkles size={22} />
                        <div>
                            <h2 className="text-base font-black">تخلیه ذهن سریع (Brain Dump)</h2>
                            <p className="text-[11px] text-amber-100">متن یا صوت بنویسید تا خودکار به تسک‌های زمان‌بندی‌شده تبدیل شود</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => setBrainDumpOpen(false)} className="p-1.5 rounded-xl hover:bg-white/20">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="relative">
                        <textarea
                            rows={6}
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder={
                                'مثال:\nجلسه طراحی پروژه ساعت ۹ تا ۱۰:۳۰ فوری\nورزش و دویدن ۴۵ دقیقه عصر\nخرید منزل فردا ساعت ۱۸'
                            }
                            className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 text-xs leading-6 text-gray-800 dark:text-white outline-none focus:border-amber-500"
                        />
                        <button
                            type="button"
                            onClick={toggleVoice}
                            className={`absolute left-3 bottom-3 p-2.5 rounded-xl shadow-md transition ${
                                isRecording
                                    ? 'bg-rose-600 text-white animate-pulse'
                                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:text-indigo-600'
                            }`}
                            title="تبدیل گفتار فارسی به متن"
                        >
                            {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                        <span>پشتیبانی از اعداد فارسی/انگلیسی، بازه زمانی، مدت زمان، فوریت و همه حوزه‌های کار و زندگی</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            type="button"
                            onClick={handleOfflineParse}
                            disabled={isAiLoading}
                            className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-2 transition"
                        >
                            <Cpu size={15} /> تجزیه سریع آفلاین (فوری)
                        </button>

                        {geminiApiKey && (
                            <button
                                type="button"
                                onClick={handleGeminiParse}
                                disabled={isAiLoading}
                                className="flex-1 py-3 rounded-2xl bg-gradient-to-l from-purple-600 to-amber-600 text-white text-xs font-black flex items-center justify-center gap-2 transition disabled:opacity-60"
                            >
                                {isAiLoading ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                                تحلیل با هوش مصنوعی Gemini
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
