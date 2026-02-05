
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import {
    Bot, Key, Loader2, Send, AlertCircle, Check, X, Sparkles, Settings2,
    MessageSquare, Trash2, Plus, Edit2, Calendar, BookOpen, Hash, AlignLeft,
    History, ChevronLeft, ChevronRight, MoreVertical
} from 'lucide-react';
import { Subject, SUBJECT_ICONS } from '../types';
import AITaskReviewWindow, { ParsedTask } from './AITaskReviewWindow';

interface AISettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

interface AIConfig {
    endpoint: string;
    apiKey: string;
    model: string;
}

interface Message {
    role: 'user' | 'assistant' | 'system' | 'model';
    content: string;
}

interface ChatSession {
    id: string;
    title: string;
    date: string; // ISO string
    messages: Message[];
}

// ParsedTask moved to AITaskReviewWindow component for shared usage, or we can import it
// But since I defined it there, let's use the import.
// Actually, earlier I defined ParsedTask interface in AISettings. 
// I should remove the local interface if I import it, or just match them.
// The import above 'import AITaskReviewWindow, { ParsedTask }' handles it.
// So I will remove the local ParsedTask interface definition.

interface autopilotSeriesData {
    subject: string;
    topic: string;
    startDay: number;
    endDay: number;
    dailyCount: number;
    startTest: number;
}

interface ParsedAction {
    type: 'preview_tasks' | 'info' | 'autopilot_series';
    tasks?: ParsedTask[];
    series?: autopilotSeriesData;
    message?: string;
}

const DEFAULT_CONFIGS: Record<string, Partial<AIConfig>> = {
    openai: { endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
    anthropic: { endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-sonnet-20240620' },
    google: { endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', model: 'gemini-2.0-flash-exp' },
    custom: { endpoint: '', model: '' }
};

export const AISettings: React.FC<AISettingsProps> = ({ isOpen, onClose }) => {
    const { showToast, addTask, currentDay, startDate, totalDays } = useStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Config state
    const [showConfig, setShowConfig] = useState(false);
    const [provider, setProvider] = useState<'openai' | 'anthropic' | 'google' | 'custom'>('google');
    const [config, setConfig] = useState<AIConfig>(() => {
        const saved = localStorage.getItem('ai_config');
        if (saved) return JSON.parse(saved);
        return { endpoint: DEFAULT_CONFIGS.google.endpoint!, apiKey: '', model: DEFAULT_CONFIGS.google.model! };
    });

    // Chat state
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pendingActions, setPendingActions] = useState<ParsedAction | null>(null);

    // History state
    const [showHistory, setShowHistory] = useState(false);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    // --- HISTORY MANAGEMENT ---
    useEffect(() => {
        const savedSessions = localStorage.getItem('ai_chat_sessions');
        if (savedSessions) {
            try {
                setSessions(JSON.parse(savedSessions));
            } catch (e) { console.error("History load error", e); }
        }

        // Load last active session or create new
        const lastSessionId = localStorage.getItem('ai_last_session_id');
        if (lastSessionId && savedSessions) {
            const all = JSON.parse(savedSessions) as ChatSession[];
            const found = all.find(s => s.id === lastSessionId);
            if (found) {
                setMessages(found.messages);
                setCurrentSessionId(found.id);
            }
        }
    }, []);

    // Save sessions to local storage whenever they change
    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('ai_chat_sessions', JSON.stringify(sessions));
        }
    }, [sessions]);

    // Save current session messages
    useEffect(() => {
        if (currentSessionId && messages.length > 0) {
            setSessions(prev => prev.map(s =>
                s.id === currentSessionId
                    ? { ...s, messages, title: s.title === 'گفتگوی جدید' && messages[0] ? messages[0].content.slice(0, 30) + '...' : s.title }
                    : s
            ));
        }
    }, [messages, currentSessionId]);

    const startNewChat = () => {
        const newId = crypto.randomUUID();
        const newSession: ChatSession = {
            id: newId,
            title: 'گفتگوی جدید',
            date: new Date().toISOString(),
            messages: []
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newId);
        setMessages([]);
        setPendingActions(null);
        localStorage.setItem('ai_last_session_id', newId);
        if (window.innerWidth < 768) setShowHistory(false);
    };

    const loadSession = (session: ChatSession) => {
        setCurrentSessionId(session.id);
        setMessages(session.messages);
        setPendingActions(null);
        localStorage.setItem('ai_last_session_id', session.id);
        if (window.innerWidth < 768) setShowHistory(false);
    };

    const deleteSession = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newSessions = sessions.filter(s => s.id !== id);
        setSessions(newSessions);
        if (newSessions.length === 0) {
            localStorage.removeItem('ai_chat_sessions');
            setMessages([]);
            setCurrentSessionId(null);
        } else if (currentSessionId === id) {
            loadSession(newSessions[0]);
        }
    };

    // Rename Logic
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editTitleInput, setEditTitleInput] = useState('');

    const startEditing = (e: React.MouseEvent, session: ChatSession) => {
        e.stopPropagation();
        setEditingSessionId(session.id);
        setEditTitleInput(session.title);
    };

    const saveTitle = (id: string) => {
        if (!editTitleInput.trim()) return;
        setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editTitleInput.trim() } : s));
        setEditingSessionId(null);
    };

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, pendingActions, isOpen]);

    const saveConfig = () => {
        localStorage.setItem('ai_config', JSON.stringify(config));
        showToast('تنظیمات ذخیره شد', 'success');
        setShowConfig(false);
    };

    const handleProviderChange = (p: 'openai' | 'anthropic' | 'google' | 'custom') => {
        setProvider(p);
        if (p !== 'custom') {
            setConfig(prev => ({
                ...prev,
                endpoint: DEFAULT_CONFIGS[p].endpoint!,
                model: DEFAULT_CONFIGS[p].model!
            }));
        }
    };

    // --- SYSTEM PROMPT ---
    const getSystemPrompt = () => {
        const today = new Date().toISOString().split('T')[0];

        // Get valid subjects list
        const validSubjects = Object.keys(SUBJECT_ICONS).join(', ');

        // Calculate specific future dates for better context
        const next7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startDate);
            d.setDate(d.getDate() + (currentDay - 1) + i); // Start from *current plan day*
            return `Day ${currentDay + i}: ${d.toISOString().split('T')[0]}`;
        }).join('\n');

        return `You are an advanced AI Study Planner Assistant for 'ParsaPlan'.
Current Context:
- Real World Date: ${today}
- Plan Start Date: ${startDate}
- Current Plan Day: Day ${currentDay} of ${totalDays}

**UPCOMING DAYS REFERENCE:**
${next7Days}

**VALID SUBJECTS (Use these EXACT names):**
${validSubjects}

**CRITICAL RULES:**
1.  **LANGUAGE:** YOU MUST SPEAK **PERSIAN (FARSI)** ONLY. Even if the user speaks English, reply in Persian.
2.  **NO DIRECT ACTIONS:** You cannot add tasks directly. You can ONLY propose them via JSON.
3.  **AUTOPILOT FOR SERIES:** If the user asks for a series of tasks (e.g., "From day 4 to 12, 30 physics tests per day starting from test 300"), **DO NOT generate the list yourself.** Instead, use the 'autopilot_series' action.
4.  **RESPONSE FORMAT:**
    - For simple chat: {"type": "info", "message": "متن فارسی شما..."}
    - For specific single tasks: {"type": "preview_tasks", "tasks": [...], "message": "لیست تسک‌ها آماده شد..."}
    - For SERIES/RANGES (Smart Mode): 
      {"type": "autopilot_series", "series": {"subject": "فیزیک", "topic": "نوسان", "startDay": 4, "endDay": 12, "dailyCount": 30, "startTest": 300}, "message": "محاسبات انجام شد، بفرمایید..."}

**EXAMPLE REQUEST:** "Add two tasks for Day 12: Physics Exam and Analysis"
**EXAMPLE JSON:**
{
  "type": "preview_tasks",
  "tasks": [
    { "title": "Physics Exam", "subject": "فیزیک", "topic": "آزمون", "details": "Exam", "date": "2026-02-12", "testRange": "" },
    { "title": "Analysis", "subject": "فیزیک", "topic": "تحلیل آزمون", "details": "Analysis", "date": "2026-02-12", "testRange": "" }
  ],
  "message": "دو تسک آزمون و تحلیل فیزیک برای روز ۱۲ (۱۲ فوریه) آماده شد."
}

**DO NOT SAY "I have added the tasks" UNLESS you are returning the JSON.**
**Force Persian language in 'message' field.**`;
    };

    const formatMessageForProvider = (msg: Message, p: string) => {
        if (p === 'google') {
            return {
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            };
        }
        return { role: msg.role, content: msg.content };
    };

    const sendMessage = async () => {
        if (!input.trim() || !config.apiKey) {
            showToast('لطفا پیام را وارد کنید و کلید API را تنظیم نمایید.', 'warning');
            return;
        }

        if (!currentSessionId) startNewChat();

        const userMessage: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);
        setPendingActions(null);

        const activeSystemPrompt = getSystemPrompt();

        try {
            let response: Response;
            let responseData: any;
            let assistantContent: string = '';

            if (provider === 'google') {
                // Fix: Construct URL correctly with model name
                const baseUrl = config.endpoint.endsWith('/') ? config.endpoint.slice(0, -1) : config.endpoint;
                // Check if endpoint already includes 'models'
                const finalUrl = baseUrl.includes('/models')
                    ? `${baseUrl}/${config.model}:generateContent?key=${config.apiKey}`
                    : `${baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;

                const contents = newMessages.map(m => formatMessageForProvider(m, 'google'));
                const finalContents = [
                    { role: 'user', parts: [{ text: `SYSTEM_Context: ${activeSystemPrompt}` }] },
                    ...contents
                ];

                response = await fetch(finalUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: finalContents })
                });

                if (!response.ok) throw new Error(`Google API Error: ${response.status}`);
                responseData = await response.json();
                assistantContent = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            }
            else if (provider === 'anthropic') {
                response = await fetch(config.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': config.apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: config.model,
                        max_tokens: 4000,
                        system: activeSystemPrompt,
                        messages: newMessages.map(m => ({
                            role: m.role === 'system' ? 'user' : m.role,
                            content: m.content
                        }))
                    })
                });
                if (!response.ok) throw new Error(`Anthropic API Error: ${response.status}`);
                responseData = await response.json();
                assistantContent = responseData.content[0].text;
            }
            else {
                response = await fetch(config.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: config.model,
                        messages: [
                            { role: 'system', content: activeSystemPrompt },
                            ...newMessages.map(m => ({ role: m.role, content: m.content }))
                        ],
                        temperature: 0.7
                    })
                });
                if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);
                responseData = await response.json();
                assistantContent = responseData.choices[0]?.message?.content;
            }

            const cleanContent = assistantContent.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                const action: ParsedAction = JSON.parse(cleanContent);
                if (action.message) {
                    setMessages(prev => [...prev, { role: 'assistant', content: action.message }]);
                }

                if (action.type === 'autopilot_series' && action.series) {
                    // Logic to generate tasks on client side
                    const { subject, topic, startDay, endDay, dailyCount, startTest } = action.series;
                    const generatedTasks: ParsedTask[] = [];
                    let currentTestStart = startTest;

                    // Calculate dates
                    const planStart = new Date(startDate);

                    for (let day = startDay; day <= endDay; day++) {
                        const taskDate = new Date(planStart);
                        taskDate.setDate(planStart.getDate() + (day - 1));

                        const endTest = currentTestStart + dailyCount;

                        generatedTasks.push({
                            title: `${subject} - ${topic}`,
                            subject: subject,
                            topic: topic || '',
                            details: `تست ${currentTestStart} تا ${endTest}`,
                            testRange: `${currentTestStart}-${endTest}`,
                            date: taskDate.toISOString().split('T')[0]
                        });

                        currentTestStart = endTest;
                    }

                    setPendingActions({
                        type: 'preview_tasks',
                        tasks: generatedTasks,
                        message: action.message
                    });

                } else if (action.type === 'preview_tasks' && action.tasks && action.tasks.length > 0) {
                    setPendingActions(action);
                }
            } catch (e) {
                setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
            }

        } catch (error: any) {
            console.error('AI Error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
        }

        setIsLoading(false);
    };

    // Handlers moved to AITaskReviewWindow or simplified here
    const handleUpdateTasks = (updatedTasks: ParsedTask[]) => {
        if (!pendingActions) return;
        setPendingActions({ ...pendingActions, tasks: updatedTasks });
    };

    const confirmTasks = () => {
        if (!pendingActions?.tasks) return;
        pendingActions.tasks.forEach(task => {
            addTask({
                id: crypto.randomUUID(),
                title: task.title || 'New Task',
                subject: (task.subject as any) || Subject.Custom,
                topic: task.topic || '',
                details: task.details || '',
                testRange: task.testRange || '',
                date: task.date,
                isCompleted: false,
                isCustom: true,
                tags: []
            });
        });
        showToast(`${pendingActions.tasks.length} تسک به برنامه اضافه شد!`, 'success');
        setPendingActions(null);
        setMessages(prev => [...prev, { role: 'assistant', content: '✅ تسک‌ها با موفقیت تأیید و ثبت شدند.' }]);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* MAIN AI SETTINGS MODAL */}
            {/* MAIN AI SETTINGS MODAL */}
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-gray-900 md:rounded-3xl shadow-2xl w-full max-w-6xl h-full md:h-[90vh] flex overflow-hidden animate-in zoom-in-95 duration-300 border-x border-gray-200 dark:border-gray-800 ring-1 ring-white/10">

                    {/* Sidebar (History) */}
                    <div className={`${showHistory ? 'w-64 translate-x-0 border-r border-gray-200 dark:border-gray-800' : 'w-0 -translate-x-full opacity-0 md:opacity-100 md:w-0 border-none overflow-hidden'} md:relative absolute inset-y-0 left-0 bg-gray-50 dark:bg-gray-900 transition-all duration-300 z-20 flex flex-col`}>
                        <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
                            <h3 className="font-bold text-gray-700 dark:text-gray-200">تاریخچه</h3>
                            <button onClick={() => setShowHistory(false)} className="md:hidden p-1"><X size={16} /></button>
                        </div>
                        <div className="p-3">
                            <button onClick={startNewChat} className="w-full flex items-center gap-2 justify-center bg-indigo-600 text-white p-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition">
                                <Plus size={16} /> گفتگوی جدید
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {sessions.map(session => (
                                <div key={session.id} onClick={() => loadSession(session)} className={`p-3 rounded-xl cursor-pointer text-sm flex items-center justify-between group transition ${currentSessionId === session.id ? 'bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400'}`}>
                                    {editingSessionId === session.id ? (
                                        <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                                            <input
                                                autoFocus
                                                type="text"
                                                value={editTitleInput}
                                                onChange={e => setEditTitleInput(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') saveTitle(session.id);
                                                    if (e.key === 'Escape') setEditingSessionId(null);
                                                }}
                                                className="w-full bg-white dark:bg-gray-900 border border-indigo-300 rounded px-1 py-0.5 text-xs outline-none"
                                            />
                                            <button onClick={() => saveTitle(session.id)} className="text-green-600 p-0.5"><Check size={14} /></button>
                                            <button onClick={() => setEditingSessionId(null)} className="text-red-500 p-0.5"><X size={14} /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <MessageSquare size={14} className="shrink-0 opacity-70" />
                                                <span className="truncate">{session.title}</span>
                                            </div>
                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                                                <button onClick={(e) => startEditing(e, session)} className="p-1 hover:text-indigo-500 transition"><Edit2 size={14} /></button>
                                                <button onClick={(e) => deleteSession(e, session.id)} className="p-1 hover:text-red-500 transition"><Trash2 size={14} /></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 shrink-0">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setShowHistory(!showHistory)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition text-gray-500">
                                    {showHistory ? <ChevronRight size={20} /> : <History size={20} />}
                                </button>
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none hidden md:flex">
                                    <Bot size={24} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">دستیار هوشمند</h2>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-mono bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800">
                                            {provider} / {config.model}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowConfig(!showConfig)} className={`p-2 rounded-xl transition ${showConfig ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`}>
                                    <Settings2 size={20} />
                                </button>
                                <button onClick={onClose} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition text-gray-400 hover:text-red-500">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Config Panel */}
                        {showConfig && (
                            <div className="p-5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 space-y-4 animate-in slide-in-from-top-2 shrink-0">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-2 block">ارائه دهنده</label>
                                    <div className="flex flex-wrap gap-2">
                                        {(['openai', 'anthropic', 'google', 'custom'] as const).map(p => (
                                            <button key={p} onClick={() => handleProviderChange(p)} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${provider === p ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{p} {provider === p && <Check size={14} />}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">API Key</label>
                                        <input type="password" value={config.apiKey} onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs font-mono outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">Model Name</label>
                                        <input type="text" value={config.model} onChange={e => setConfig(prev => ({ ...prev, model: e.target.value }))} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs font-mono outline-none" />
                                    </div>
                                </div>
                                <button onClick={saveConfig} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl text-sm font-bold shadow-lg">ذخیره</button>
                            </div>
                        )}

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50 dark:bg-black/20 pb-20 md:pb-4 relative">
                            {messages.length === 0 && !pendingActions && (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                                    <Sparkles size={48} className="text-indigo-400 mb-4" />
                                    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">چطور می‌توانم کمکتان کنم؟</h3>
                                    <p className="text-sm text-gray-500 max-w-sm mt-2">روز هفتم برنامه (تاریخ ...) برام ۵۰ تست فیزیک بذار.</p>
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`p-4 max-w-[85%] rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-100 dark:border-gray-700'}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}

                            {isLoading && <div className="flex justify-end"><Loader2 className="animate-spin text-indigo-500" size={20} /></div>}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 md:p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0 mb-safe z-30">
                            <div className="flex items-end gap-2">
                                <button onClick={startNewChat} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-indigo-500 rounded-xl transition md:hidden" title="گفتگوی جدید"><Plus size={20} /></button>
                                <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="پیام شما..." className="flex-1 bg-gray-100 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-black border focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none resize-none h-[50px] focus:h-[80px] transition-all" disabled={isLoading} />
                                <button onClick={sendMessage} disabled={isLoading || !input.trim()} className="p-3 mb-0.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-lg"><Send size={20} /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TASK PREVIEW MODAL (Separate Window) */}
            {pendingActions?.tasks && (
                <AITaskReviewWindow
                    tasks={pendingActions.tasks}
                    onClose={() => setPendingActions(null)}
                    onConfirm={confirmTasks}
                    onUpdateTasks={handleUpdateTasks}
                />
            )}
        </>
    );
};

export default AISettings;
