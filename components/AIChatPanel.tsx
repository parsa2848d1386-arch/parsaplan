import React, { useState, useRef, useEffect } from 'react';
import {
    Sparkles, Send, Minimize2, Maximize2, X,
    GraduationCap, ClipboardList, CalendarDays, BookOpen, School, Loader2
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
// @ts-ignore
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SUBJECT_LISTS } from '../types';
import AITaskReviewWindow, { ParsedTask } from './AITaskReviewWindow';

/* ===== پنل دستیار هوشمند AI (سایدبار) =====
   پنل واقعی با اتصال به Gemini API
   شامل: چت واقعی، minimize/expand، پیشنهادات هوشمند
*/

const suggestions = [
    'برنامه مطالعه فردا',
    'تحلیل پیشرفت من',
    'پیشنهاد تست',
];

interface MiniMessage {
    id: string;
    text: string;
    sender: 'user' | 'ai';
}

const AIChatPanel: React.FC = () => {
    const {
        userName, settings, subjects, addTask, startDate, currentDay, totalDays,
        routineTemplate, tasks, xp, level, getProgress, moods, auditLog, progressPercent, dailyNotes
    } = useStore();

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<MiniMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [reviewTasks, setReviewTasks] = useState<ParsedTask[] | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const apiKey = localStorage.getItem('gemini_api_key') || '';
    const selectedModel = settings?.geminiModel || 'gemini-2.5-flash';

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const generateMiniPrompt = () => {
        const today = new Date().toISOString().split('T')[0];
        const currentStream = settings?.stream || 'general';
        const streamSubjects = SUBJECT_LISTS[currentStream] || SUBJECT_LISTS['general'];
        const allSubjects = [...new Set([...streamSubjects, ...(subjects?.map(s => s.name) || [])])].join(', ');
        const taskCompletion = getProgress();
        const overdueCount = tasks.filter(t => t.date < today && !t.isCompleted).length;

        return `
You are ParsaPlan's mini AI assistant sidebar. Respond CONCISELY in PERSIAN (max 3-4 sentences).
User: ${userName || 'کاربر'}, Level ${level}, XP: ${xp}
Stream: ${currentStream}, Subjects: ${allSubjects}
Day ${currentDay}/${totalDays}, Progress: ${taskCompletion}%, Overdue: ${overdueCount}
Today: ${today}

If user asks for tasks, output JSON:
\`\`\`json
{ "type": "preview_tasks", "message": "...", "tasks": [{ "subject": "...", "topic": "...", "details": "...", "date": "YYYY-MM-DD", "studyType": "study" }] }
\`\`\`
Valid studyType: "exam", "analysis", "test_educational", "test_speed", "review", "study"
Always respond in Persian. Be concise.`.trim();
    };

    const handleSend = async (textOverride?: string) => {
        const text = textOverride || message;
        if (!text.trim()) return;

        if (!apiKey) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: '⚠️ لطفاً ابتدا API Key را در تنظیمات AI وارد کنید.',
                sender: 'ai'
            }]);
            return;
        }

        const userMsg: MiniMessage = { id: Date.now().toString(), text, sender: 'user' };
        const updatedMsgs = [...messages, userMsg];
        setMessages(updatedMsgs);
        setMessage('');
        setIsTyping(true);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: selectedModel,
                systemInstruction: generateMiniPrompt()
            });

            const history = updatedMsgs.slice(0, -1).map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));

            const chat = model.startChat({ history });
            const result = await chat.sendMessage(text);
            const responseText = result.response.text();

            // Parse JSON tasks if present
            let parsedTasks: ParsedTask[] | undefined;
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            let cleanText = responseText;

            if (jsonMatch) {
                try {
                    const action = JSON.parse(jsonMatch[0]);
                    if (action.type === 'preview_tasks' && action.tasks) {
                        parsedTasks = action.tasks.map((t: any) => ({ ...t, id: crypto.randomUUID() }));
                        setReviewTasks(parsedTasks);
                    }
                    cleanText = responseText.replace(/```json[\s\S]*?```/g, '').replace(jsonMatch[0], '').trim();
                    if (!cleanText && action.message) cleanText = action.message;
                } catch { }
            }

            const aiMsg: MiniMessage = {
                id: (Date.now() + 1).toString(),
                text: cleanText || 'لیست تسک‌ها آماده بررسی است.',
                sender: 'ai'
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error: any) {
            const errMsg = error.message?.length > 100
                ? 'خطا در ارتباط با AI. تنظیمات را بررسی کنید.'
                : (error.message || 'خطای ناشناخته');
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                text: `❌ ${errMsg}`,
                sender: 'ai'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleConfirmTasks = () => {
        if (reviewTasks) {
            reviewTasks.forEach(t => {
                let computedDayId = 0;
                if (t.date && startDate) {
                    const taskDate = new Date(t.date);
                    const planStart = new Date(startDate);
                    const diffDays = Math.floor((taskDate.getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24));
                    computedDayId = diffDays + 1;
                    if (computedDayId < 1 || computedDayId > totalDays) computedDayId = 0;
                }
                addTask({
                    id: crypto.randomUUID(), dayId: computedDayId, date: t.date,
                    subject: t.subject as any, topic: t.topic, details: t.details,
                    testRange: t.testRange || '', isCompleted: false,
                    isCustom: computedDayId === 0, studyType: t.studyType || 'study',
                    subTasks: t.subTasks as any, tags: ['AI']
                });
            });
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: `✅ ${reviewTasks.length} تسک به برنامه اضافه شد.`,
                sender: 'ai'
            }]);
            setReviewTasks(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // === Minimized State ===
    if (isMinimized) {
        return (
            <button
                onClick={() => setIsMinimized(false)}
                className="w-full h-14 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 hover:shadow-xl transition-all group"
            >
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-500" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">دستیار AI</span>
                    {messages.length > 0 && (
                        <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center font-bold">
                            {messages.filter(m => m.sender === 'ai').length}
                        </span>
                    )}
                </div>
                <Maximize2 size={14} className="text-gray-400 group-hover:text-indigo-500 transition" />
            </button>
        );
    }

    // === Full Panel ===
    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100/80 dark:border-gray-800 overflow-hidden">
            {/* هدر */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-500" />
                    <h3 className="text-sm font-extrabold text-gray-800 dark:text-white">دستیار AI</h3>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setMessages([])}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        title="پاک کردن چت"
                    >
                        <X size={14} />
                    </button>
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        title="کوچک کردن"
                    >
                        <Minimize2 size={14} />
                    </button>
                </div>
            </div>

            {/* پیام‌ها */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar min-h-0">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-3">
                            <Sparkles size={22} className="text-indigo-500" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
                            سلام {userName || 'کاربر'}! 👋
                        </h4>
                        <p className="text-[11px] text-gray-400 max-w-[180px] leading-5">
                            درباره برنامه، تسک‌ها و پیشرفتت سؤال بپرس.
                        </p>

                        {/* پیشنهادات */}
                        <div className="flex flex-wrap justify-center gap-1.5 mt-4">
                            {suggestions.map(s => (
                                <button
                                    key={s}
                                    onClick={() => handleSend(s)}
                                    className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded-xl border border-gray-100 dark:border-gray-700 transition-all active:scale-95 hover:text-indigo-600 dark:hover:text-indigo-400"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                            >
                                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-[12px] leading-5 ${msg.sender === 'user'
                                    ? 'bg-indigo-500 text-white rounded-br-sm'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-bl-sm'
                                    }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-end">
                                <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* ورودی */}
            <div className="px-3 pb-3 flex-shrink-0">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-3 py-2">
                    <input
                        type="text"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="سؤالت رو بپرس..."
                        className="flex-1 bg-transparent text-[12px] outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400 min-w-0"
                        disabled={isTyping}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={!message.trim() || isTyping}
                        className={`p-1.5 rounded-xl transition-all active:scale-90 ${message.trim() && !isTyping
                            ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm'
                            : 'text-gray-300 dark:text-gray-600'
                            }`}
                    >
                        {isTyping ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                </div>
            </div>

            {/* Task Review Modal */}
            {reviewTasks && (
                <AITaskReviewWindow
                    tasks={reviewTasks}
                    currentDayId={currentDay}
                    onClose={() => setReviewTasks(null)}
                    onConfirm={handleConfirmTasks}
                    onUpdateTasks={setReviewTasks}
                />
            )}
        </div>
    );
};

export default AIChatPanel;
