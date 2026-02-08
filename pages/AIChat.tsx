import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
// @ts-ignore
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
    attachments?: { type: 'image' | 'video' | 'file'; url: string; name: string }[];
}

// NOTE: ChatSession is imported from ChatSidebar to ensure consistency, 
// but we might need to map or align if they differ. 
// For now, we will use the local state structure and cast if needed or ensure compatibility.

const AIChat: React.FC = () => {
    const navigate = useNavigate();
    const { settings, updateSettings, subjects, addTask, startDate, currentDay, totalDays, routineTemplate, tasks, xp, level, moods, auditLog, progressPercent, getProgress, userName, dailyNotes } = useStore();

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

    // --- HELPERS ---
    const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Remove data url prefix (e.g. "data:image/jpeg;base64,")
                const base64Data = base64String.split(',')[1];
                resolve({
                    inlineData: {
                        data: base64Data,
                        mimeType: file.type
                    }
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const toShamsi = (date: Date) => {
        return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);
    };

    // --- GEMINI LOGIC ---
    const generateSystemPrompt = () => {
        const today = new Date();
        const todayIso = today.toISOString().split('T')[0];
        const todayShamsi = toShamsi(today);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowIso = tomorrow.toISOString().split('T')[0];
        const tomorrowShamsi = toShamsi(tomorrow);

        const currentStream = settings?.stream || 'general';
        const streamSubjects = SUBJECT_LISTS[currentStream] || SUBJECT_LISTS['general'];
        const allSubjects = [...new Set([...streamSubjects, ...(subjects?.map(s => s.name) || [])])].join(', ');

        const routineSummary = routineTemplate.map(r => `- ${r.time}: ${r.title} (${r.type})`).join('\n');

        // Context: Progress & Mood & Notes
        const planCompletion = Math.round((currentDay / totalDays) * 100);
        const taskCompletion = getProgress();
        const overdueTasksCount = tasks.filter(t => t.date < todayIso && !t.isCompleted).length;

        // Deep Performance Metrics
        const completedTasks = tasks.filter(t => t.isCompleted);
        const totalMinutes = completedTasks.reduce((acc, t) => acc + (t.actualDuration || 0), 0);
        const studyHours = Math.round(totalMinutes / 60 * 10) / 10;

        const ratedTasks = completedTasks.filter(t => t.qualityRating);
        const avgFocus = ratedTasks.length > 0
            ? Math.round((ratedTasks.reduce((acc, t) => acc + (t.qualityRating || 0), 0) / ratedTasks.length) * 10) / 10
            : 0;

        const testedTasks = completedTasks.filter(t => t.testStats && t.testStats.total > 0);
        const tTotal = testedTasks.reduce((acc, t) => acc + (t.testStats?.total || 0), 0);
        const tCorrect = testedTasks.reduce((acc, t) => acc + (t.testStats?.correct || 0), 0);
        const tWrong = testedTasks.reduce((acc, t) => acc + (t.testStats?.wrong || 0), 0);
        const accuracy = tTotal > 0 ? Math.round(((tCorrect * 3 - tWrong) / (tTotal * 3)) * 100) : 0;

        // Subject-wise performance (summary)
        const subPerformance = SUBJECT_LISTS[currentStream]?.map(sub => {
            const subTasks = tasks.filter(t => t.subject === sub);
            if (subTasks.length === 0) return null;
            const subDone = subTasks.filter(t => t.isCompleted).length;
            return `${sub}: ${Math.round((subDone / subTasks.length) * 100)}%`;
        }).filter(Boolean).join(', ');

        // Extended Task Summary (Last 3 days + Next 7 days)
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 3);
        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(today.getDate() + 7);

        const relevantTasks = tasks.filter(t => {
            const d = new Date(t.date);
            return d >= sevenDaysAgo && d <= sevenDaysFromNow;
        });
        const tasksSummary = relevantTasks.map(t => `- [${t.date}] ${t.subject}: ${t.topic} (${t.isCompleted ? 'Done' : 'Pending'})`).join('\n');

        // Daily Notes Summary (Last 5 days)
        const notesSummary = Object.entries(dailyNotes || {})
            .slice(-5)
            .map(([date, note]) => `- ${date}: ${note}`)
            .join('\n');

        const recentMoods = Object.entries(moods || {}).slice(-7).map(([date, mood]) => `${date}: ${mood}`).join(', ');
        const recentLogs = (auditLog || []).slice(-10).map(l => `- ${l.action}: ${l.details}`).join('\n');

        return `
You are the **ParsasPlan Ultra Intelligence**, an advanced study assistant with FULL ACCESS to the user's account, history, and preferences.
Identity: You are built to manage, optimize, and oversee ${userName}'s entire educational journey.

**Comprehensive Context for ${userName}:**
- Today: ${todayIso} (Shamsi: ${todayShamsi})
- Tomorrow (Shamsi): ${tomorrowShamsi}
- Study Stream: ${currentStream}
- All Subjects: ${allSubjects}
- Current Level: ${level} (XP: ${xp}, Progress: ${Math.round(progressPercent || 0)}%)
- Plan Progress: ${planCompletion}% (Day ${currentDay} of ${totalDays})
- Overdue Tasks: ${overdueTasksCount}

**Performance Analytical Data:**
- Overall Mastery: ${taskCompletion}%
- Total Study Time: ${studyHours} hours
- Average Focus Quality: ${avgFocus}/5
- Global Test Accuracy: ${accuracy}%
- Subject Completion: ${subPerformance}
- Recent Exam Scores: ${tasks.filter(t => t.studyType === 'exam' && t.isCompleted && t.testStats && t.testStats.total > 0)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map(t => {
                    const score = Math.round(((t.testStats!.correct * 3 - t.testStats!.wrong) / (t.testStats!.total * 3)) * 100);
                    return `${t.subject} (${t.date}): ${score}%`;
                }).join(', ') || 'None yet'
            }

**User's Daily Routine (Schedule):**
${routineSummary}

**Historical & Future Task Timeline (Window):**
${tasksSummary || 'No upcoming tasks scheduled.'}

**Daily reflections & Notes:**
${notesSummary || 'No recent notes.'}

**Mood & Energy levels (Last 7 days):**
${recentMoods || 'Stable'}

**Recent System Activities:**
${recentLogs}

**YOUR OPERATIONAL PROTOCOL:**
1. Speak **PERSIAN (Farsi)** exclusively.
2. You have 'eyes' on every part of the app. Use the above context to provide deeply personalized advice.
3. If user mentions "last night" or "yesterday", check the 'Daily reflections' and 'Recent Tasks' for context.
4. If asked to add/update tasks, use the JSON format.
5. **DISTINGUISH TESTS VS EXAMS**: 
   - Requests for "tests" or "practice questions" → details property = "Practice X tests".
   - Requests for "Azmoon" or "Exam" → studyType = "exam".

**JSON CAPABILITIES:**
- preview_tasks: Suggest specific tasks.
- autopilot_series: Schedule a repeating study sequence.

**FINAL COMMAND**: Be proactive. If you see the user is lagging behind (${overdueTasksCount} overdue), offer to reschedule or motivate them based on their recent moods.
`.trim();
    };

    const handleSend = async (manualInput?: string, attachments?: File[]) => {
        const textToSend = manualInput || input;

        // Allow sending if there are attachments even if no text
        if (!textToSend.trim() && (!attachments || attachments.length === 0)) return;

        if (!apiKey) {
            setShowSettings(true);
            return;
        }

        let msgAttachments: { type: 'image' | 'video' | 'file'; url: string; name: string }[] | undefined;
        let generativeParts: any[] = [];

        if (attachments && attachments.length > 0) {
            // Create UI attachments
            msgAttachments = attachments.map(file => ({
                type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file',
                url: URL.createObjectURL(file),
                name: file.name
            }));

            // Create Gemini Parts
            try {
                const partsPromises = attachments.map(file => fileToGenerativePart(file));
                generativeParts = await Promise.all(partsPromises);
            } catch (error) {
                console.error("Error processing files:", error);
                // Continue without files if error, or handle error UI
            }
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            text: textToSend,
            sender: 'user',
            timestamp: new Date(),
            attachments: msgAttachments
        };

        // Optimistic Update
        const currentMsgs = activeSession?.messages || [];
        const updatedMsgs = [...currentMsgs, userMsg];
        updateActiveSessionMessages(updatedMsgs);

        setInput('');
        setIsTyping(true);
        abortControllerRef.current = new AbortController();

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: selectedModel,
                systemInstruction: generateSystemPrompt()
            });

            const history = updatedMsgs.slice(0, -1).map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));

            const chat = model.startChat({
                history: history,
            });

            // Combine text and attachments
            const currentParts: (string | { text: string } | { inlineData: { data: string; mimeType: string } })[] = [{ text: textToSend }];
            if (generativeParts && generativeParts.length > 0) {
                currentParts.push(...generativeParts);
            }

            const result = await chat.sendMessage(currentParts as any);
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
                                title: `${subject}`,
                                subject,
                                topic,
                                details: dailyCount > 0 ? `تست ${currentTest} تا ${endTest}` : 'مرور/مطالعه',
                                date: taskDate.toISOString().split('T')[0],
                                studyType: 'study', // Default to study for series unless specified
                                id: crypto.randomUUID()
                            });
                            currentTest = endTest + 1;
                        }
                    } else if (action.type === 'preview_tasks' && action.tasks) {
                        parsedTasks = action.tasks.map((t: any) => ({
                            ...t,
                            id: crypto.randomUUID()
                        }));
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
            setIsTyping(false);

        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("Gemini Error:", error);
                // Sanitize error message to prevent huge dumps
                const rawError = error.message || '';
                const cleanError = rawError.length > 200
                    ? 'متاسفانه خطایی در ارتباط با هوش مصنوعی رخ داد. لطفاً تنظیمات مدل یا اینترنت خود را بررسی کنید.'
                    : rawError;

                const errorMsg: Message = {
                    id: Date.now().toString(),
                    text: cleanError,
                    sender: 'ai',
                    timestamp: new Date(),
                    isError: true
                };
                updateActiveSessionMessages([...updatedMsgs, errorMsg]);
                setIsTyping(false);
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
                                <div className="flex flex-row-reverse items-end gap-3 mb-6 animate-pulse opacity-70">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/50 flex-shrink-0">
                                        <Sparkles size={18} className="text-indigo-600 animate-spin-slow" />
                                    </div>
                                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-5 py-3.5 rounded-[1.25rem] rounded-tl-sm border border-gray-100 dark:border-gray-800 text-sm font-medium text-gray-500 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                                        </div>
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
                    onSend={(files) => handleSend(undefined, files)}
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
