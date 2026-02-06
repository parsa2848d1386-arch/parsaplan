import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ChevronLeft, Settings as SettingsIcon, Plus, Check, X, Loader2, ListChecks, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SubjectTask, Subject, SUBJECT_LISTS } from '../types';
import AITaskReviewWindow, { ParsedTask } from '../components/AITaskReviewWindow';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    isError?: boolean;
    pendingTasks?: ParsedTask[]; // Tasks waiting to be reviewed
}



const AIChat: React.FC = () => {
    const navigate = useNavigate();
    const { settings, subjects, addTask, updateSettings, startDate, currentDay, totalDays } = useStore();

    // State
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'سلام! من دستیار هوشمند شما هستم. می‌تونم برنامه‌ریزی کنم، تسک بسازم یا روتین بهت پیشنهاد بدم. چطور کمکت کنم؟',
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
    const [selectedModel, setSelectedModel] = useState(localStorage.getItem('gemini_model') || 'gemini-1.5-flash');

    // Review Modal State
    const [reviewTasks, setReviewTasks] = useState<ParsedTask[] | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const saveSettings = () => {
        localStorage.setItem('gemini_api_key', apiKey);
        localStorage.setItem('gemini_model', selectedModel);
        setShowSettings(false);
    };

    // --- LOGIC PORTED FROM AISettings.tsx ---
    const generateSystemPrompt = () => {
        const today = new Date().toISOString().split('T')[0];
        const currentStream = settings?.stream || 'general';
        const streamSubjects = SUBJECT_LISTS[currentStream] || SUBJECT_LISTS['general'];
        const validSubjects = streamSubjects.join(', ');

        const next7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startDate);
            d.setDate(d.getDate() + (currentDay - 1) + i);
            return `Day ${currentDay + i}: ${d.toISOString().split('T')[0]}`;
        }).join('\n');

        return `
You are an expert Study Assistant for 'ParsaPlan'.
Context:
- Today: ${today}
- Plan Start: ${startDate}
- Current Day: ${currentDay} of ${totalDays}
- Subjects: ${validSubjects}

**CRITICAL INSTRUCTIONS:**
1. Speak **PERSIAN (Farsi)** only.
2. If asked to add tasks, output a JSON object.
3. Supported JSON Types:
   - "preview_tasks": For specific tasks.
   - "autopilot_series": For generating a range of tasks (e.g. "30 tests daily for 10 days").

**JSON FORMATS:**
Type A (Explicit Tasks):
\`\`\`json
{
  "type": "preview_tasks",
  "message": "...",
  "tasks": [
    { "subject": "زیست", "topic": "...", "details": "...", "date": "2024-01-01" }
  ]
}
\`\`\`

Type B (Series/Autopilot):
\`\`\`json
{
  "type": "autopilot_series",
  "message": "...",
  "series": {
    "subject": "فیزیک",
    "topic": "نوسان",
    "startDay": ${currentDay}, 
    "endDay": ${Math.min(currentDay + 5, totalDays)},
    "dailyCount": 30,
    "startTest": 1
  }
}
\`\`\`
`.trim();
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        if (!apiKey) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: 'لطفاً ابتدا کلید API را وارد کنید.',
                sender: 'ai',
                timestamp: new Date(),
                isError: true
            }]);
            setShowSettings(true);
            return;
        }

        const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user', timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: selectedModel });

            const chat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: `SYSTEM_PROMPT: ${generateSystemPrompt()}` }] },
                    { role: "model", parts: [{ text: "باشه، من آماده‌ام. چه کاری انجام دهم؟" }] }
                ],
            });

            const result = await chat.sendMessage(input);
            const response = result.response;
            const text = response.text();

            // JSON Parsing Logic
            let parsedTasks: ParsedTask[] | undefined;

            // Clean markdown
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

            // Try explicit JSON block regex if full parse fails, or just try parsing the whole/partial text
            const jsonMatch = text.match(/\{[\s\S]*\}/); // Find first JSON object

            if (jsonMatch) {
                try {
                    const action = JSON.parse(jsonMatch[0]);

                    if (action.type === 'autopilot_series' && action.series) {
                        // Generate Series
                        const { subject, topic, startDay, endDay, dailyCount, startTest } = action.series;
                        parsedTasks = [];
                        let currentTest = startTest || 1;
                        const planStart = new Date(startDate);

                        for (let day = startDay; day <= endDay; day++) {
                            const taskDate = new Date(planStart);
                            taskDate.setDate(planStart.getDate() + (day - 1));
                            const endTest = currentTest + dailyCount - 1;

                            parsedTasks.push({
                                title: `${subject}`,
                                subject: subject,
                                topic: topic,
                                details: `تست ${currentTest} تا ${endTest}`,
                                testRange: `${currentTest}-${endTest}`,
                                date: taskDate.toISOString().split('T')[0]
                            });
                            currentTest = endTest + 1;
                        }
                    } else if ((action.type === 'preview_tasks' || !action.type) && (action.tasks || Array.isArray(action))) {
                        parsedTasks = action.tasks || action;
                    }
                } catch (e) {
                    console.error("JSON Parse Error", e);
                }
            }

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: text.replace(/```json[\s\S]*?```/g, '').trim() || (parsedTasks ? 'لیست تسک‌ها آماده بررسی است:' : text),
                sender: 'ai',
                timestamp: new Date(),
                pendingTasks: parsedTasks
            }]);

        } catch (error: any) {
            console.error("Gemini API Error:", error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: `خطا: ${error.message || 'مشکل در ارتباط با سرور یا کلید نامعتبر'}`,
                sender: 'ai',
                timestamp: new Date(),
                isError: true
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleConfirmTasks = () => {
        if (reviewTasks) {
            reviewTasks.forEach(t => {
                addTask({
                    id: crypto.randomUUID(),
                    dayId: 0,
                    date: t.date,
                    subject: t.subject as any,
                    topic: t.topic,
                    details: t.details,
                    testRange: t.testRange,
                    isCompleted: false,
                    isCustom: true,
                    studyType: t.studyType,
                    subTasks: t.subTasks as any,
                    tags: ['AI']
                });
            });
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: `${reviewTasks.length} تسک با موفقیت به برنامه اضافه شدند. ✅`,
                sender: 'ai',
                timestamp: new Date()
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

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-50 dark:bg-gray-950 relative overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-800 dark:text-white">دستیار هوشمند</h1>
                        <p className="text-[10px] text-indigo-500 font-mono bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full inline-block mt-1 border border-indigo-100 dark:border-indigo-800">
                            {selectedModel}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-xl transition ${showSettings ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`}
                    >
                        <SettingsIcon size={20} />
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition text-gray-500"
                    >
                        <ChevronLeft size={24} />
                    </button>
                </div>
            </div>

            {/* API Key / Settings Modal */}
            {showSettings && (
                <div className="absolute top-[70px] right-4 left-4 z-30 animate-in fade-in slide-in-from-top-4">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 dark:text-gray-200">تنظیمات هوش مصنوعی</h3>
                            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-red-500"><X size={18} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1.5 block">کلید API گوگل (Gemini)</label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="کلید API خود را وارد کنید..."
                                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 border-transparent focus:bg-white dark:focus:bg-black border focus:border-indigo-500 text-sm outline-none transition-all font-mono"
                                />
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-500 font-bold mt-1 inline-block hover:underline">
                                    دریافت کلید رایگان
                                </a>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1.5 block">مدل هوش مصنوعی</label>
                                <input
                                    type="text"
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    placeholder="نام مدل (مثلاً gemini-1.5-flash)..."
                                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 border-transparent focus:bg-white dark:focus:bg-black border focus:border-indigo-500 text-sm outline-none transition-all font-mono text-left"
                                    dir="ltr"
                                />
                            </div>

                            <button onClick={saveSettings} className="w-full bg-indigo-600 text-white p-3 rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all">
                                ذخیره تنظیمات
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-24">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex flex-col space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                        <div className={`flex gap-3 max-w-[90%] md:max-w-[75%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.sender === 'user'
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                }`}>
                                {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`p-4 rounded-2xl text-sm leading-7 whitespace-pre-wrap shadow-sm ${msg.sender === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-200 dark:shadow-none'
                                : msg.isError
                                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800'
                                    : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800 rounded-tl-none'
                                }`}>
                                {msg.text}
                            </div>
                        </div>

                        {/* Task Proposals Action */}
                        {msg.pendingTasks && msg.pendingTasks.length > 0 && (
                            <div className="w-full max-w-sm mr-11">
                                <button
                                    onClick={() => setReviewTasks(msg.pendingTasks!)}
                                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-400 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <ListChecks size={20} />
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-gray-800 dark:text-white text-sm">پیشنهاد {msg.pendingTasks.length} تسک جدید</div>
                                            <div className="text-xs text-gray-500 group-hover:text-indigo-500 transition-colors">برای بررسی و افزودن کلیک کنید</div>
                                        </div>
                                    </div>
                                    <div className="bg-indigo-50 dark:bg-gray-700 p-2 rounded-lg text-indigo-600 dark:text-gray-300">
                                        <ChevronLeft size={16} />
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {isTyping && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Bot size={16} />
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-1.5 w-16 justify-center h-12">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-3 md:p-4 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 sticky bottom-0 z-20 pb-8 sm:pb-4 shrink-0">
                <div className="flex gap-2 items-end bg-gray-50 dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-800 focus-within:border-indigo-500 dark:focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all shadow-sm">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="درخواست خود را بنویسید (مثلاً: یک برنامه برای زیست بساز)..."
                        className="flex-1 bg-transparent border-none focus:ring-0 p-3 max-h-32 min-h-[50px] resize-none text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 text-sm custom-scrollbar"
                        rows={1}
                        dir="rtl"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-indigo-500/30 dark:shadow-none hover:scale-105 active:scale-95 mb-0.5"
                    >
                        {isTyping ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className={input.trim() ? '' : 'opacity-50'} />}
                    </button>
                </div>
            </div>

            {/* REVIEW WINDOW PORTAL */}
            {reviewTasks && (
                <AITaskReviewWindow
                    tasks={reviewTasks}
                    onClose={() => setReviewTasks(null)}
                    onConfirm={handleConfirmTasks}
                    onUpdateTasks={setReviewTasks}
                />
            )}
        </div>
    );
};

export default AIChat;
