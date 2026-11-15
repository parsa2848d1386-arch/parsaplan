import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
// @ts-ignore
import { GoogleGenerativeAI } from "@google/generative-ai";
import { get, set } from 'idb-keyval';
import { SubjectTask, SUBJECT_LISTS, TaskPriority } from '../types';
import { getDiffDays, toIsoString } from '../utils';
import AITaskReviewWindow, { ParsedTask } from '../components/AITaskReviewWindow';
import { ChatSidebar, ChatSession } from '../components/AIChat/ChatSidebar';
import { ChatMessage } from '../components/AIChat/ChatMessage';
import { ChatInput } from '../components/AIChat/ChatInput';
import { WelcomeScreen } from '../components/AIChat/WelcomeScreen';
import { Menu, Settings as SettingsIcon, ChevronLeft, X, Sparkles, History as HistoryIcon, Trash2, Plus } from 'lucide-react';

// --- TYPES (Internal) ---
interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    isError?: boolean;
    pendingTasks?: ParsedTask[];
    tasksApplied?: boolean;
    attachments?: { type: 'image' | 'video' | 'file'; url: string; name: string }[];
}

export interface AIChatProps {
    isWidget?: boolean;
    onClose?: () => void;
}

const AI_MODELS = [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

export const AIChat: React.FC<AIChatProps> = ({ isWidget = false, onClose }) => {
    const navigate = useNavigate();
    const { settings, updateSettings, subjects, addTasksBatch, askConfirm, startDate, currentDay, totalDays, tasks, xp, level, moods, auditLog, progressPercent, getProgress, userName, dailyNotes, showToast, geminiApiKey, userId } = useStore();

    // --- STATE ---
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

    // UI State
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    // Settings (Persisted)
    const activeApiKey =
        (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
        (typeof process !== 'undefined' && (process.env?.GEMINI_API_KEY as string)) ||
        geminiApiKey ||
        localStorage.getItem('gemini_api_key') ||
        '';
    const selectedModel = settings.geminiModel || 'gemini-2.0-flash';

    const [reviewTasks, setReviewTasks] = useState<ParsedTask[] | null>(null);

    // References
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Derived State
    const activeSession = sessions.find(s => s.id === activeSessionId);
    const messages = activeSession?.messages || [];
    const filteredMessages = messages.filter(m => 
        m.text.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // --- INITIALIZATION ---
    useEffect(() => {
        const loadSessions = async () => {
            const storageKey = `gemini_chat_sessions_${userId || 'parsaplan_local_user'}`;
            try {
                let savedSessions = await get(storageKey);
                if (!savedSessions && (userId === 'parsaplan_local_user' || !userId)) {
                    // Fallback to legacy un-scoped local storage if offline
                    const localRaw = localStorage.getItem('gemini_chat_sessions');
                    if (localRaw) {
                        savedSessions = JSON.parse(localRaw);
                    }
                }

                if (savedSessions && Array.isArray(savedSessions)) {
                    const fixed = savedSessions.map((s: any) => ({
                        ...s,
                        messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
                    }));
                    setSessions(fixed);
                    if (fixed.length > 0) setActiveSessionId(fixed[0].id);
                } else {
                    createNewChat();
                }
            } catch (e) {
                console.error("Failed to load sessions", e);
                createNewChat();
            }
        };
        if (userId !== undefined) {
            loadSessions();
        }
    }, [userId]);

    // --- PERSISTENCE ---
    useEffect(() => {
        if (sessions.length > 0 && userId !== undefined) {
            const storageKey = `gemini_chat_sessions_${userId || 'parsaplan_local_user'}`;
            set(storageKey, sessions).catch(e => console.error("Failed saving sessions", e));
        }
    }, [sessions, userId]);

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
        askConfirm(
            'حذف گفتگو',
            'آیا این گفتگو برای همیشه حذف شود؟',
            () => {
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
            },
            'danger'
        );
    };

    const renameSession = (id: string, newTitle: string) => {
        setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
    };

    const updateActiveSessionMessages = (newMessages: Message[]) => {
        if (!activeSessionId) return;
        setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                let title = s.title;
                if (s.title === 'چت جدید' && newMessages.length > 0) {
                    const firstUserMsg = newMessages.find(m => m.sender === 'user');
                    if (firstUserMsg) {
                        title = firstUserMsg.text.slice(0, 25) + (firstUserMsg.text.length > 25 ? '...' : '');
                    }
                }
                return { ...s, messages: newMessages, title, timestamp: Date.now() };
            }
            return s;
        }));
    };

    const mapParsedTasksToSubjectTasks = (parsed: ParsedTask[]): SubjectTask[] => {
        return parsed.map((p) => {
            const dateStr = p.date || toIsoString(new Date()).split('T')[0];
            const targetSubject = subjects.find(
                (s) => s.name.trim().toLowerCase() === (p.subject || '').trim().toLowerCase()
            );

            let calculatedDay = currentDay;
            if (startDate) {
                const diff = getDiffDays(startDate, dateStr);
                if (diff >= 0 && diff < totalDays) {
                    calculatedDay = diff + 1;
                }
            }

            return {
                id: p.id || crypto.randomUUID(),
                dayId: calculatedDay,
                day: calculatedDay,
                subject: targetSubject ? targetSubject.name : (p.subject || 'عمومی'),
                title: p.title || p.topic || 'تسک هوشمند',
                topic: p.topic || '',
                studyType: (p.studyType as any) || 'study',
                details: p.details || '',
                isCompleted: false,
                date: dateStr,
                startTime: p.startTime || '10:00',
                durationMinutes: p.durationMinutes || 60,
                priority: (p.priority as TaskPriority) || 'medium',
                source: 'ai_coach',
            };
        });
    };

    const handleSend = async (overrideText?: string, attachments?: File[]) => {
        const textToSend = overrideText || input;
        if (!textToSend.trim() && (!attachments || attachments.length === 0)) return;

        let processedAttachments: { type: 'image' | 'video' | 'file'; url: string; name: string }[] = [];
        if (attachments && attachments.length > 0) {
            processedAttachments = attachments.map(file => ({
                url: URL.createObjectURL(file),
                type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file',
                name: file.name
            }));
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            text: textToSend,
            sender: 'user',
            timestamp: new Date(),
            attachments: processedAttachments.length > 0 ? processedAttachments : undefined
        };

        const updatedMsgs = [...messages, userMsg];
        updateActiveSessionMessages(updatedMsgs);
        if (!overrideText) setInput('');
        setIsTyping(true);

        try {
            abortControllerRef.current = new AbortController();

            // Fallback response if no custom API key is present
            if (!activeApiKey) {
                setTimeout(() => {
                    const fallbackAI: Message = {
                        id: (Date.now() + 1).toString(),
                        text: `درود ${userName || 'سارا'} عزیز! درخواست شما دریافت شد:\n«${textToSend}»\n\nبرای اتصال زنده به موتور قدرتمند هوش مصنوعی Gemini و ایجاد خودکار تسک‌ها در تایم‌لاین، لطفاً کلید API رایگان خود را در تنظیمات وارد کنید.`,
                        sender: 'ai',
                        timestamp: new Date(),
                    };
                    updateActiveSessionMessages([...updatedMsgs, fallbackAI]);
                    setIsTyping(false);
                }, 1000);
                return;
            }

            const genAI = new GoogleGenerativeAI(activeApiKey);
            const model = genAI.getGenerativeModel({ model: selectedModel });

            const systemContext = `
شما دستیار هوشمند و اختصاصی برنامه‌ریزی تحصیلی «پارساپلان» هستید. نام کاربر: ${userName || 'سارا'}.
پاسخ‌های شما باید کاملاً فارسی، پرانرژی، راهبردی و ساختاریافته باشد.
اگر کاربر درخواست برنامه‌ریزی یا ساخت تسک دارد، می‌توانید یک بلوک JSON معتبر از دستورات زیر تولید کنید:
\`\`\`json
{
  "action": {
    "type": "preview_tasks",
    "tasks": [
      {
        "title": "مرور زیست",
        "subject": "زیست‌شناسی",
        "topic": "ژنتیک",
        "date": "${new Date().toISOString().split('T')[0]}",
        "startTime": "09:00",
        "durationMinutes": 60,
        "studyType": "study",
        "priority": "high"
      }
    ]
  }
}
\`\`\`
            `;

            const chat = model.startChat({
                history: [
                    { role: 'user', parts: [{ text: systemContext }] },
                    { role: 'model', parts: [{ text: 'درود! من دستیار هوشمند پارساپلان هستم و آماده‌ام به شما در مدیریت زمان، برنامه‌ریزی دقیق و ارتقای بازدهی کمک کنم.' }] }
                ]
            });

            const result = await chat.sendMessage(textToSend);
            const text = result.response.text();

            let parsedTasks: ParsedTask[] | undefined;
            let shouldAutoAdd = false;
            let jsonString = "";

            const jsonMatch = text.match(/```json([\s\S]*?)```/);
            if (jsonMatch && jsonMatch[1]) {
                try {
                    jsonString = jsonMatch[0];
                    const rawJson = JSON.parse(jsonMatch[1].trim());
                    const action = rawJson.action || rawJson;
                    if (action.type === 'preview_tasks' || action.type === 'auto_add_tasks') {
                        shouldAutoAdd = action.type === 'auto_add_tasks';
                        parsedTasks = action.tasks?.map((t: any) => ({
                            ...t,
                            id: crypto.randomUUID()
                        }));
                    }
                } catch (e) {
                    console.error("JSON Error", e);
                }
            }

            let autoApplied = false;
            if (shouldAutoAdd && parsedTasks && parsedTasks.length > 0) {
                addTasksBatch(mapParsedTasksToSubjectTasks(parsedTasks), 'دستیار هوشمند AI');
                autoApplied = true;
            }

            let cleanText = text.replace(/```json[\s\S]*?```/g, '').trim();

            const aiMsg: Message = {
                id: Date.now().toString(),
                text: cleanText || (autoApplied ? `${parsedTasks?.length} تسک به‌صورت خودکار به برنامه و تایم‌لاین اضافه شد. ✅` : 'برنامه آماده بررسی است:'),
                sender: 'ai',
                timestamp: new Date(),
                pendingTasks: parsedTasks,
                tasksApplied: autoApplied,
            };

            updateActiveSessionMessages([...updatedMsgs, aiMsg]);
            setIsTyping(false);
        } catch (error: any) {
            console.error("AI Error:", error);
            const errorMsg: Message = {
                id: Date.now().toString(),
                text: 'متاسفانه در پردازش درخواست خطایی رخ داد. لطفاً اتصال اینترنت یا کلید API را بررسی فرمایید.',
                sender: 'ai',
                timestamp: new Date(),
                isError: true
            };
            updateActiveSessionMessages([...updatedMsgs, errorMsg]);
            setIsTyping(false);
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsTyping(false);
        }
    };

    const handleClearSession = () => {
        if (!activeSessionId) return;
        askConfirm(
            'پاک‌سازی گفتگو',
            'آیا تاریخچه گفتگوهای این چت پاک شود؟',
            () => {
                updateActiveSessionMessages([]);
                showToast('تاریخچه این گفتگو پاک شد', 'info');
            },
            'danger'
        );
    };

    const handleAutoAddMessageTasks = (list: ParsedTask[], messageId: string) => {
        if (!list || list.length === 0) return;
        addTasksBatch(mapParsedTasksToSubjectTasks(list), 'دستیار هوشمند AI');
        const nextMsgs = messages.map((m) => (m.id === messageId ? { ...m, tasksApplied: true } : m));
        const confirmMsg: Message = {
            id: Date.now().toString(),
            text: `${list.length} تسک با موفقیت به داشبورد و تایم‌لاین اضافه شد. ✅`,
            sender: 'ai',
            timestamp: new Date(),
        };
        updateActiveSessionMessages([...nextMsgs, confirmMsg]);
    };

    const handleConfirmTasks = () => {
        if (reviewTasks && reviewTasks.length > 0) {
            addTasksBatch(mapParsedTasksToSubjectTasks(reviewTasks), 'دستیار هوشمند AI');
            const successMsg: Message = {
                id: Date.now().toString(),
                text: `${reviewTasks.length} تسک با موفقیت به برنامه و تایم‌لاین اضافه شد. ✅`,
                sender: 'ai',
                timestamp: new Date(),
            };
            updateActiveSessionMessages([...messages, successMsg]);
            setReviewTasks(null);
        }
    };

    const currentModelObj = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];

    return (
        <div className="flex h-full bg-surface text-on-surface overflow-hidden relative font-sans">
            {/* Ambient Background Glowing Orbs */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full filter blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-secondary-container/20 rounded-full filter blur-[120px] pointer-events-none" />

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
            <main className="flex-1 flex flex-col h-full relative w-full transition-all duration-300 z-10">
                {/* Header (Bento / Modern Capsule Bar) */}
                <header className="p-3.5 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 flex items-center justify-between sticky top-0 z-20 shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
                            title="تاریخچه گفتگوها"
                        >
                            <HistoryIcon size={20} />
                        </button>

                        {/* Model Selector Capsule */}
                        <div className="relative">
                            <button
                                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low text-primary shadow-xs hover:bg-surface-container transition-all border border-outline-variant/30"
                            >
                                <span className="material-symbols-outlined text-[16px]">expand_more</span>
                                <span className="font-label-sm text-label-sm font-bold tracking-wide">
                                    {currentModelObj.label}
                                </span>
                                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                            </button>

                            {/* Dropdown Popover */}
                            {isModelDropdownOpen && (
                                <div className="absolute top-full start-0 mt-2 w-48 bg-surface-container-lowest rounded-2xl shadow-xl p-1.5 z-30 flex flex-col gap-1 border border-outline-variant/30">
                                    {AI_MODELS.map((m) => (
                                        <button
                                            key={m.id}
                                            onClick={() => {
                                                updateSettings({ geminiModel: m.id });
                                                setIsModelDropdownOpen(false);
                                            }}
                                            className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-surface-container text-right transition-colors text-label-sm font-label-sm"
                                        >
                                            <span className={selectedModel === m.id ? 'text-primary font-bold' : 'text-on-surface'}>
                                                {m.label}
                                            </span>
                                            {selectedModel === m.id && (
                                                <span className="material-symbols-outlined text-primary text-[18px]">check</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={createNewChat}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                            title="چت جدید"
                        >
                            <Plus size={18} />
                        </button>

                        {activeSession && activeSession.messages.length > 0 && (
                            <button
                                onClick={handleClearSession}
                                className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container-low text-error hover:bg-error-container hover:text-on-error-container transition-colors"
                                title="پاک‌سازی این گفتگو"
                            >
                                <Trash2 size={17} />
                            </button>
                        )}

                        {isWidget ? (
                            <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-xl transition text-on-surface-variant">
                                <X size={20} />
                            </button>
                        ) : (
                            <button onClick={() => navigate('/')} className="p-2 hover:bg-surface-container rounded-xl transition text-on-surface-variant">
                                <ChevronLeft size={20} />
                            </button>
                        )}
                    </div>
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar scroll-smooth min-h-0 relative">
                    {messages.length === 0 ? (
                        <WelcomeScreen onPromptSelect={(text) => handleSend(text)} userName={userName || 'سارا'} />
                    ) : (
                        <div className="max-w-4xl mx-auto pb-4">
                            {/* Search bar */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="🔍 جستجو در پیام‌های این گفتگو..."
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-2 text-xs outline-none focus:border-primary text-on-surface shadow-xs"
                                    dir="rtl"
                                />
                            </div>

                            {filteredMessages.map((msg) => (
                                <ChatMessage
                                    key={msg.id}
                                    message={msg}
                                    onRetry={(text) => handleSend(text)}
                                    onRegenerate={() => handleSend(msg.text)}
                                    onReviewTasks={setReviewTasks}
                                    onAutoAddTasks={handleAutoAddMessageTasks}
                                    tasksApplied={msg.tasksApplied}
                                />
                            ))}

                            {isTyping && (
                                <div className="flex flex-row-reverse items-end gap-3.5 mb-6 opacity-90">
                                    <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-md">
                                        <Sparkles size={18} className="animate-spin" />
                                    </div>
                                    <div className="bg-surface-container-low p-4 rounded-2xl rounded-tl-sm border border-outline-variant/30 text-body-sm text-on-surface-variant shadow-xs">
                                        <div className="flex items-center gap-1.5 py-1">
                                            <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="sticky bottom-0 z-20 w-full p-3 bg-surface/80 backdrop-blur-xl border-t border-outline-variant/20">
                    <ChatInput
                        input={input}
                        setInput={setInput}
                        isTyping={isTyping}
                        onSend={(files) => handleSend(undefined, files)}
                        onStop={handleStop}
                    />
                    <div className="flex items-center justify-center gap-1.5 mt-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px] text-primary">auto_awesome</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant/80">
                            قدرت‌گرفته از هوش مصنوعی ParsaPlan / Gemini
                        </span>
                    </div>
                </div>
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