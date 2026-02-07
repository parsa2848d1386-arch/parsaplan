import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SubjectTask, SUBJECT_LISTS } from '../types';
import AITaskReviewWindow, { ParsedTask } from '../components/AITaskReviewWindow';
import { ChatSidebar, ChatSession } from '../components/AIChat/ChatSidebar';
import { ChatMessage } from '../components/AIChat/ChatMessage';
import { ChatInput } from '../components/AIChat/ChatInput';
import { WelcomeScreen } from '../components/AIChat/WelcomeScreen';
import { Menu, Settings as SettingsIcon, ChevronLeft, X, Sparkles } from 'lucide-react';

// --- TYPES (Internal) ---
interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    isError?: boolean;
    pendingTasks?: ParsedTask[];
}

// NOTE: ChatSession is imported from ChatSidebar to ensure consistency, 
// but we might need to map or align if they differ. 
// For now, we will use the local state structure and cast if needed or ensure compatibility.

const AIChat: React.FC = () => {
    const navigate = useNavigate();
    const { settings, updateSettings, subjects, addTask, startDate, currentDay, totalDays, routineTemplate, tasks, xp, level, moods, auditLog, progressPercent, getProgress } = useStore();

    // --- STATE ---
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

    // UI State
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Settings (Persisted)
    const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
    const [selectedModel, setSelectedModel] = useState(settings.geminiModel || 'gemini-2.5-flash');

    const [reviewTasks, setReviewTasks] = useState<ParsedTask[] | null>(null);

    // References
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Derived State
    const activeSession = sessions.find(s => s.id === activeSessionId);
    const messages = activeSession?.messages || [];

    // --- INITIALIZATION ---
    useEffect(() => {
        const savedSessions = localStorage.getItem('gemini_chat_sessions');
        if (savedSessions) {
            try {
                const parsed: ChatSession[] = JSON.parse(savedSessions);
                const fixed = parsed.map(s => ({
                    ...s,
                    messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
                }));
                setSessions(fixed);
                if (fixed.length > 0) setActiveSessionId(fixed[0].id);
            } catch (e) {
                console.error("Failed to parse sessions", e);
            }
        } else {
            createNewChat();
        }
    }, []);

    // --- PERSISTENCE ---
    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('gemini_chat_sessions', JSON.stringify(sessions));
        }
    }, [sessions]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // --- ACTIONS ---
    const createNewChat = () => {
        const newSession: ChatSession = {
            id: crypto.randomUUID(),
            title: 'چت جدید',
            messages: [],
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
                setActiveSessionId(filtered.length > 0 ? filtered[0].id : null);
            }
            if (filtered.length === 0) {
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
                // Auto-rename logic
                let newTitle = s.title;
                if (s.messages.length === 0 && newMessages.length > 0 && s.title === 'چت جدید') {
                    const firstUserMsg = newMessages.find(m => m.sender === 'user');
                    if (firstUserMsg) {
                        newTitle = firstUserMsg.text.substring(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
                    }
                }

                return {
                    ...s,
                    messages: newMessages,
                    timestamp: Date.now(),
                    title: newTitle
                };
            }
            return s;
        }));
    };

    const saveSettings = () => {
        localStorage.setItem('gemini_api_key', apiKey);
        updateSettings({ geminiModel: selectedModel });
        setShowSettings(false);
    };

    // --- GEMINI LOGIC ---
    const generateSystemPrompt = () => {
        const today = new Date();
        const todayIso = today.toISOString().split('T')[0];
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowIso = tomorrow.toISOString().split('T')[0];

        const currentStream = settings?.stream || 'general';
        const streamSubjects = SUBJECT_LISTS[currentStream] || SUBJECT_LISTS['general'];
        const validSubjects = streamSubjects.join(', ');

        const routineSummary = routineTemplate.map(r => `- ${r.time}: ${r.title} (${r.type})`).join('\n');



        // Context: Progress & Mood
        const planCompletion = Math.round((currentDay / totalDays) * 100);
        const taskCompletion = getProgress();
        const recentMoods = Object.entries(moods).slice(-7).map(([date, mood]) => `${date}: ${mood}`).join(', ');
        const recentLogs = auditLog.slice(-5).map(l => `- ${l.action}: ${l.details}`).join('\n');

        // Filter tasks for today and tomorrow to save context window
        const relevantTasks = tasks.filter(t => t.date === todayIso || t.date === tomorrowIso);
        const tasksSummary = relevantTasks.map(t => `- [${t.date}] ${t.subject}: ${t.topic} (${t.isCompleted ? 'Done' : 'Pending'})`).join('\n');

        return `
You are an expert Study Assistant for 'ParsaPlan'.
Context:
- Today: ${todayIso} (Day ${currentDay} of ${totalDays})
- Tomorrow: ${tomorrowIso} (Day ${Math.min(currentDay + 1, totalDays)} of ${totalDays})
- Plan Start Date: ${startDate}
- Stream: ${currentStream}
- Valid Subjects: ${validSubjects}
- XP: ${xp} (Level ${level})
- Level Progress: ${Math.round(progressPercent)}% (XP towards next level)
- Plan Day Progress: ${planCompletion}% (Day ${currentDay} of ${totalDays})
- Overall Task Completion: ${taskCompletion}% (of all tasks)
- Recent Moods: ${recentMoods || 'No data'}

User's Routine:
${routineSummary}

Recent Tasks (Today & Tomorrow):
${tasksSummary}

Recent Activities (Logs):
${recentLogs}

**CRITICAL INSTRUCTIONS:**
1. Speak **PERSIAN (Farsi)** only.
2. If asked to add tasks, output a JSON object.
3. Supported JSON Types: "preview_tasks", "autopilot_series".
4. For tasks, you can suggest 'exam' (آزمون), 'analysis' (تحلیل), 'review' (مرور), or 'study' (مطالعه) as 'studyType'.
5. **DATE AWARENESS**: 
   - If user says "Tomorrow", use ${tomorrowIso}.
   - If user says "Today", use ${todayIso}.
   - Always calculate dates relative to Today (${todayIso}).

**JSON COMPATIBILITY:**
Type A (Explicit Tasks):
\`\`\`json
{ "type": "preview_tasks", "message": "...", "tasks": [{ "subject": "زیست", "topic": "...", "details": "...", "date": "2024-01-01", "studyType": "study" }] }
\`\`\`

Type B (Series):
\`\`\`json
{ "type": "autopilot_series", "message": "...", "series": { "subject": "فیزیک", "topic": "نوسان", "startDay": ${currentDay}, "endDay": ${Math.min(currentDay + 5, totalDays)}, "interval": 2, "dailyCount": 30, "startTest": 1 } }
\`\`\`
6. **Multi-Subject Exams**: If an exam covers multiple subjects, use a combined name like "ریاضی + فیزیک" in the "subject" field.
7. **Comprehensive Exam**: Suggest "Comprehensive Exam" (آزمون جامع) as a subject/topic if appropriate.
8. **Interval**: Use "interval" in autopilot_series (e.g., 2 for every other day).
`.trim();
    };

    const handleSend = async (manualInput?: string) => {
        const textToSend = manualInput || input;
        if (!textToSend.trim()) return;

        if (!apiKey) {
            setShowSettings(true);
            return;
        }

        const userMsg: Message = { id: Date.now().toString(), text: textToSend, sender: 'user', timestamp: new Date() };

        // Optimistic Update
        const currentMsgs = activeSession?.messages || [];
        const updatedMsgs = [...currentMsgs, userMsg];
        updateActiveSessionMessages(updatedMsgs);

        setInput('');
        setIsTyping(true);
        abortControllerRef.current = new AbortController();

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: selectedModel }); // Enforced 2.5 Flash

            const historyForApi = updatedMsgs.slice(0, -1).map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));

            const chat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: `SYSTEM_PROMPT: ${generateSystemPrompt()}` }] },
                    { role: "model", parts: [{ text: "باشه، من آماده‌ام. من دستیار درسی پارسا پلن هستم و به زبان فارسی صحبت می‌کنم." }] },
                    ...historyForApi
                ],
            });

            // Note: signal support depends on SDK version, wrapping in try/catch generally good
            const result = await chat.sendMessage(textToSend);
            const response = result.response;
            const text = response.text();

            // JSON Logic
            let parsedTasks: ParsedTask[] | undefined;
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                try {
                    const action = JSON.parse(jsonMatch[0]);
                    if (action.type === 'autopilot_series' && action.series) {
                        const { subject, topic, startDay, endDay, dailyCount, startTest, interval = 1 } = action.series;
                        parsedTasks = [];
                        let currentTest = startTest || 1;
                        const planStart = new Date(startDate);

                        // Loop relative to plan start
                        for (let day = startDay; day <= endDay; day += interval) {
                            if (day > totalDays) break;
                            const taskDate = new Date(planStart);
                            taskDate.setDate(planStart.getDate() + (day - 1));

                            const endTest = currentTest + dailyCount - 1;
                            const range = dailyCount > 0 ? `${currentTest}-${endTest}` : '';

                            parsedTasks.push({
                                title: `${subject}`, subject, topic, details: dailyCount > 0 ? `تست ${currentTest} تا ${endTest}` : 'مرور/مطالعه',
                                testRange: range, date: taskDate.toISOString().split('T')[0],
                                studyType: 'test_educational'
                            });
                            currentTest = endTest + 1;
                        }
                    } else if (action.tasks || Array.isArray(action)) {
                        parsedTasks = action.tasks || action;
                    }
                } catch (e) { console.error("JSON Error", e); }
            }

            const cleanText = text.replace(/```json[\s\S]*?```/g, '').trim();

            const aiMsg: Message = {
                id: Date.now().toString(),
                text: cleanText || (parsedTasks ? 'لیست تسک‌ها آماده بررسی است:' : text),
                sender: 'ai',
                timestamp: new Date(),
                pendingTasks: parsedTasks
            };

            updateActiveSessionMessages([...updatedMsgs, aiMsg]);

        } catch (error: any) {
            if (error.name !== 'AbortError') {
                const errorMsg: Message = {
                    id: Date.now().toString(),
                    text: error.message || 'خطا در ارتباط با هوش مصنوعی',
                    sender: 'ai',
                    timestamp: new Date(),
                    isError: true
                };
                updateActiveSessionMessages([...updatedMsgs, errorMsg]);
            }
        } finally {
            setIsTyping(false);
            abortControllerRef.current = null;
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
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
                id: Date.now().toString(), text: `${reviewTasks.length} تسک با موفقیت به برنامه اضافه شد. ✅`,
                sender: 'ai', timestamp: new Date()
            };
            updateActiveSessionMessages([...messages, successMsg]);
            setReviewTasks(null);
        }
    };

    return (
        <div className="flex h-full bg-slate-50 dark:bg-gray-950 overflow-hidden relative">

            <ChatSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelectSession={setActiveSessionId}
                onNewChat={createNewChat}
                onRenameSession={renameSession}
                onDeleteSession={deleteSession}
                isHistoryCollapsed={isHistoryCollapsed}
                setIsHistoryCollapsed={setIsHistoryCollapsed}
            />

            {/* Main Area */}
            <main className="flex-1 flex flex-col h-full relative w-full transition-all duration-300">

                {/* Header */}
                <header className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -mr-2 text-gray-500">
                            <Menu size={24} />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm md:text-lg">
                                {activeSession?.title || 'دستیار هوشمند'}
                            </h1>
                            <span className="text-[10px] text-indigo-500 font-mono opacity-80 mt-0.5 truncate max-w-[150px]">{selectedModel}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition text-gray-500 relative">
                            <SettingsIcon size={20} />
                            {!apiKey && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
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
                                <h3 className="font-bold text-gray-800 dark:text-gray-200">تنظیمات هوش مصنوعی</h3>
                                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-red-500"><X size={18} /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">API Key (Google Gemini)</label>
                                    <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-indigo-500 outline-none text-sm font-mono dir-ltr" placeholder="AI Key..." />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">مدل هوش مصنوعی (تایپ یا انتخاب)</label>
                                    <input
                                        list="gemini-models"
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-indigo-500 outline-none text-sm font-mono dir-ltr"
                                        placeholder="نام مدل را وارد کنید (مثلاً gemini-1.5-pro)"
                                    />
                                    <datalist id="gemini-models">
                                        <option value="gemini-2.5-flash" />
                                        <option value="gemini-2.0-flash" />
                                        <option value="gemini-1.5-flash" />
                                        <option value="gemini-1.5-pro" />
                                        <option value="gemini-pro" />
                                    </datalist>
                                </div>
                                <button onClick={saveSettings} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold hover:bg-indigo-700 transition">ذخیره تنظیمات</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar scroll-smooth min-h-0 relative">
                    {messages.length === 0 ? (
                        <WelcomeScreen onPromptSelect={(text) => handleSend(text)} userName="کاربر" />
                    ) : (
                        <div className="max-w-4xl mx-auto pb-4">
                            {messages.map((msg) => (
                                <ChatMessage
                                    key={msg.id}
                                    message={msg}
                                    onRetry={(text) => handleSend(text)}
                                    onReviewTasks={setReviewTasks}
                                />
                            ))}
                            {isTyping && (
                                <div className="flex gap-3 mb-6 animate-pulse opacity-70">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center"><Sparkles size={16} className="text-indigo-500" /></div>
                                    <div className="bg-white dark:bg-gray-900 px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-800 text-sm italic text-gray-500">
                                        در حال فکر کردن...
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <ChatInput
                    input={input}
                    setInput={setInput}
                    isTyping={isTyping}
                    onSend={() => handleSend()}
                    onStop={handleStop}
                />
            </main>

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

export default AIChat;
