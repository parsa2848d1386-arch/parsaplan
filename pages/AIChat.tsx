import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ChevronLeft, Settings as SettingsIcon, Plus, Check, X, Loader2, ListChecks, History, MessageSquare, Trash2, Edit2, Menu, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SubjectTask, Subject, SUBJECT_LISTS } from '../types';
import AITaskReviewWindow, { ParsedTask } from '../components/AITaskReviewWindow';

// --- TYPES ---
interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    isError?: boolean;
    pendingTasks?: ParsedTask[];
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    timestamp: number; // Last updated
}

const AIChat: React.FC = () => {
    const navigate = useNavigate();
    const { settings, subjects, addTask, updateSettings, startDate, currentDay, totalDays } = useStore();

    // --- STATE ---
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar

    // UI State
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
    const [selectedModel, setSelectedModel] = useState(localStorage.getItem('gemini_model') || 'gemini-1.5-flash');
    const [reviewTasks, setReviewTasks] = useState<ParsedTask[] | null>(null);

    // References
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Derived State
    const activeSession = sessions.find(s => s.id === activeSessionId);
    const messages = activeSession?.messages || [];

    // --- INITIALIZATION ---
    useEffect(() => {
        // Load Sessions
        const savedSessions = localStorage.getItem('gemini_chat_sessions');

        if (savedSessions) {
            try {
                const parsed: ChatSession[] = JSON.parse(savedSessions);
                // Fix Date objects
                const fixed = parsed.map(s => ({
                    ...s,
                    messages: s.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
                }));
                setSessions(fixed);
                if (fixed.length > 0) setActiveSessionId(fixed[0].id);
            } catch (e) {
                console.error("Failed to parse sessions", e);
            }
        } else {
            // MIGRATION: Check for old single history
            const oldHistory = localStorage.getItem('gemini_chat_history');
            if (oldHistory) {
                try {
                    const parsedOld = JSON.parse(oldHistory);
                    const fixedOld = parsedOld.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));

                    const newSession: ChatSession = {
                        id: crypto.randomUUID(),
                        title: 'چت قبلی',
                        messages: fixedOld,
                        timestamp: Date.now()
                    };

                    setSessions([newSession]);
                    setActiveSessionId(newSession.id);
                    localStorage.removeItem('gemini_chat_history'); // Cleanup
                } catch (e) { console.error("Migration failed"); }
            } else {
                // Fresh Start
                createNewChat();
            }
        }
    }, []);

    // --- PERSISTENCE ---
    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('gemini_chat_sessions', JSON.stringify(sessions));
        }
    }, [sessions]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, activeSessionId]);

    // --- ACTIONS ---
    const createNewChat = () => {
        const newSession: ChatSession = {
            id: crypto.randomUUID(),
            title: 'چت جدید',
            messages: [{
                id: 'init',
                text: 'سلام! چطور می‌تونم کمکت کنم؟',
                sender: 'ai',
                timestamp: new Date()
            }],
            timestamp: Date.now()
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const deleteSession = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!window.confirm('آیا این چت حذف شود؟')) return;

        setSessions(prev => {
            const filtered = prev.filter(s => s.id !== id);
            if (activeSessionId === id) {
                // Switch to another if active was deleted
                setActiveSessionId(filtered.length > 0 ? filtered[0].id : null);
            }
            if (filtered.length === 0) {
                // Create one if empty
                setTimeout(() => createNewChat(), 0);
            }
            return filtered;
        });
    };

    const renameSession = (id: string, newTitle: string) => {
        setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
    };

    const updateActiveSessionMessages = (newMessages: Message[]) => {
        setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                return {
                    ...s,
                    messages: newMessages,
                    timestamp: Date.now(),
                    // Auto-rename if it's the first user message and title is default
                    title: (s.messages.length <= 1 && newMessages.length > 1 && s.title === 'چت جدید')
                        ? (newMessages.find(m => m.sender === 'user')?.text.substring(0, 30) || 'چت جدید') + '...'
                        : s.title
                };
            }
            return s;
        }));
    };

    const saveSettings = () => {
        localStorage.setItem('gemini_api_key', apiKey);
        localStorage.setItem('gemini_model', selectedModel);
        setShowSettings(false);
    };

    // --- GEMINI LOGIC ---
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
3. Supported JSON Types: "preview_tasks", "autopilot_series".

**JSON FORMATS:**
Type A (Explicit Tasks):
\`\`\`json
{ "type": "preview_tasks", "message": "...", "tasks": [{ "subject": "زیست", "topic": "...", "details": "...", "date": "2024-01-01" }] }
\`\`\`

Type B (Series):
\`\`\`json
{ "type": "autopilot_series", "message": "...", "series": { "subject": "فیزیک", "topic": "نوسان", "startDay": ${currentDay}, "endDay": ${Math.min(currentDay + 5, totalDays)}, "dailyCount": 30, "startTest": 1 } }
\`\`\`
`.trim();
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        if (!apiKey) {
            setShowSettings(true);
            return;
        }

        const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user', timestamp: new Date() };

        // Optimistic Update
        const currentMsgs = activeSession?.messages || [];
        const updatedMsgs = [...currentMsgs, userMsg];
        updateActiveSessionMessages(updatedMsgs);

        setInput('');
        setIsTyping(true);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: selectedModel });

            // Construct history for API
            const historyForApi = updatedMsgs.slice(0, -1).map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));

            // Ensure system prompt is first context
            const chat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: `SYSTEM_PROMPT: ${generateSystemPrompt()}` }] },
                    { role: "model", parts: [{ text: "باشه، من آماده‌ام." }] },
                    ...historyForApi
                ],
            });

            const result = await chat.sendMessage(input);
            const response = result.response;
            const text = response.text();

            // JSON Logic
            let parsedTasks: ParsedTask[] | undefined;
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                try {
                    const action = JSON.parse(jsonMatch[0]);
                    if (action.type === 'autopilot_series' && action.series) {
                        // ... (Series Logic Same as before)
                        const { subject, topic, startDay, endDay, dailyCount, startTest } = action.series;
                        parsedTasks = [];
                        let currentTest = startTest || 1;
                        const planStart = new Date(startDate);
                        for (let day = startDay; day <= endDay; day++) {
                            const taskDate = new Date(planStart);
                            taskDate.setDate(planStart.getDate() + (day - 1));
                            const endTest = currentTest + dailyCount - 1;
                            parsedTasks.push({
                                title: `${subject}`, subject, topic, details: `تست ${currentTest} تا ${endTest}`,
                                testRange: `${currentTest}-${endTest}`, date: taskDate.toISOString().split('T')[0]
                            });
                            currentTest = endTest + 1;
                        }
                    } else if (action.tasks || Array.isArray(action)) {
                        parsedTasks = action.tasks || action;
                    }
                } catch (e) { console.error("JSON Error", e); }
            }

            const aiMsg: Message = {
                id: Date.now().toString(),
                text: text.replace(/```json[\s\S]*?```/g, '').trim() || (parsedTasks ? 'لیست تسک‌ها آماده بررسی است:' : text),
                sender: 'ai',
                timestamp: new Date(),
                pendingTasks: parsedTasks
            };

            updateActiveSessionMessages([...updatedMsgs, aiMsg]);

        } catch (error: any) {
            const errorMsg: Message = {
                id: Date.now().toString(),
                text: error.message || 'خطا در ارتباط',
                sender: 'ai',
                timestamp: new Date(),
                isError: true
            };
            updateActiveSessionMessages([...updatedMsgs, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleConfirmTasks = () => {
        if (reviewTasks) {
            reviewTasks.forEach(t => {
                addTask({
                    id: crypto.randomUUID(), dayId: 0, date: t.date, subject: t.subject as any,
                    topic: t.topic, details: t.details, testRange: t.testRange,
                    isCompleted: false, isCustom: true, studyType: t.studyType, subTasks: t.subTasks as any, tags: ['AI']
                });
            });
            const successMsg: Message = {
                id: Date.now().toString(), text: `${reviewTasks.length} تسک اضافه شد. ✅`,
                sender: 'ai', timestamp: new Date()
            };
            updateActiveSessionMessages([...messages, successMsg]);
            setReviewTasks(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    return (
        <div className="flex h-[100dvh] bg-slate-50 dark:bg-gray-950 overflow-hidden relative">

            {/* --- SIDEBAR --- */}
            <aside className={`
                fixed inset-y-0 right-0 z-40 w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
            `}>
                <div className="h-full flex flex-col">
                    {/* Sidebar Header */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <h2 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <History size={18} />
                            تاریخچه
                        </h2>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 hover:bg-gray-100 rounded-lg">
                            <X size={18} />
                        </button>
                    </div>

                    {/* New Chat Button */}
                    <div className="p-4">
                        <button
                            onClick={createNewChat}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold transition-all shadow-md active:scale-95"
                        >
                            <Plus size={18} /> چت جدید
                        </button>
                    </div>

                    {/* Sessions List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4 space-y-2">
                        {sessions.map(session => (
                            <div
                                key={session.id}
                                onClick={() => { setActiveSessionId(session.id); setIsSidebarOpen(false); }}
                                className={`group relative p-3 rounded-xl border transition-all cursor-pointer select-none
                                    ${activeSessionId === session.id
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                                        : 'bg-white dark:bg-gray-800/50 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-2 overflow-hidden">
                                    <div className="flex-1 min-w-0">
                                        {/* Editable Title */}
                                        <div className="font-bold text-sm text-gray-700 dark:text-gray-200 truncate mb-0.5" title={session.title}>
                                            {session.title}
                                        </div>
                                        <div className="text-[10px] text-gray-400 truncate">
                                            {new Date(session.timestamp).toLocaleDateString('fa-IR')}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions (Variables opacity) */}
                                <div className={`absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg p-1 shadow-sm ${activeSessionId === session.id ? 'opacity-100' : ''}`}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newName = prompt('نام جدید:', session.title);
                                            if (newName) renameSession(session.id, newName);
                                        }}
                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md"
                                        title="تغییر نام"
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                    <button
                                        onClick={(e) => deleteSession(session.id, e)}
                                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md"
                                        title="حذف"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Backdrop for Mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* --- MAIN CHAT AREA --- */}
            <main className="flex-1 flex flex-col h-full relative w-full">

                {/* Header */}
                <header className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -mr-2 text-gray-500">
                            <Menu size={24} />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                            <Sparkles size={20} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="font-bold text-gray-800 dark:text-white truncate max-w-[150px] sm:max-w-xs transition-all">
                                {activeSession?.title || 'دستیار هوشمند'}
                            </h1>
                            <p className="text-[10px] text-indigo-500 font-mono inline-block opacity-80">
                                {selectedModel}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition text-gray-500">
                            <SettingsIcon size={20} />
                        </button>
                        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition text-gray-500">
                            <ChevronLeft size={24} />
                        </button>
                    </div>
                </header>

                {/* Settings Overlay */}
                {showSettings && (
                    <div className="absolute top-[70px] right-4 left-4 z-30 animate-in fade-in slide-in-from-top-4 max-w-md mx-auto">
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800 dark:text-gray-200">تنظیمات</h3>
                                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-red-500"><X size={18} /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">API Key</label>
                                    <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-indigo-500 outline-none text-sm font-mono dir-ltr" placeholder="AI Key..." />
                                </div>
                                <button onClick={saveSettings} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold hover:bg-indigo-700">ذخیره</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-24 scroll-smooth">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                            <MessageSquare size={48} className="text-gray-300 dark:text-gray-600" />
                            <p className="text-sm text-gray-400">یک چت جدید شروع کنید...</p>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`flex gap-3 max-w-[90%] md:max-w-[75%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.sender === 'user' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'}`}>
                                    {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                                </div>
                                <div className={`p-4 rounded-2xl text-sm leading-7 whitespace-pre-wrap shadow-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800 rounded-tl-none'} ${msg.isError ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200' : ''}`}>
                                    {msg.text}
                                    {msg.isError && (
                                        <button onClick={() => {
                                            updateActiveSessionMessages(messages.filter(m => m.id !== msg.id));
                                            setInput(messages.findLast(m => m.sender === 'user')?.text || '');
                                        }} className="block mt-2 text-xs font-bold text-rose-500 hover:underline">تلاش مجدد</button>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons for AI */}
                            {msg.sender === 'ai' && msg.pendingTasks && (
                                <div className="w-full max-w-sm mr-11">
                                    <button onClick={() => setReviewTasks(msg.pendingTasks!)} className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-indigo-200 rounded-xl shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center gap-2">
                                            <ListChecks size={18} className="text-indigo-500" />
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">مشاهده پیشنهاد ({msg.pendingTasks.length})</span>
                                        </div>
                                        <ChevronLeft size={16} className="text-gray-400" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center"><Bot size={16} /></div>
                            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-1.5 w-16 justify-center h-12">
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 md:p-4 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 sticky bottom-0 z-20">
                    <div className="flex gap-2 items-end bg-gray-50 dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-800 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="پیام خود را بنویسید..." className="flex-1 bg-transparent border-none focus:ring-0 p-3 max-h-32 min-h-[50px] resize-none text-sm custom-scrollbar dark:text-white" rows={1} dir="rtl" />
                        <button onClick={handleSend} disabled={!input.trim() || isTyping} className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 mb-0.5">
                            {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>
                </div>

            </main>

            {/* Modal Portal */}
            {reviewTasks && <AITaskReviewWindow tasks={reviewTasks} onClose={() => setReviewTasks(null)} onConfirm={handleConfirmTasks} onUpdateTasks={setReviewTasks} />}
        </div>
    );
};

export default AIChat;
