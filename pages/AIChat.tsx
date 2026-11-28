import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { get, set } from 'idb-keyval';
import { SubjectTask, TaskPriority, StudyType, StoredChatMessage } from '../types';
import { getDiffDays, toIsoString } from '../utils';
import { getErrorMessage } from '../utils/formHelpers';
import { aiTaskActionSchema } from '../utils/schemas';
import AITaskReviewWindow, { ParsedTask } from '../components/AITaskReviewWindow';
import { ChatSidebar, ChatSession } from '../components/AIChat/ChatSidebar';
import { ChatMessage } from '../components/AIChat/ChatMessage';
import { ChatInput, ChatAttachmentPayload } from '../components/AIChat/ChatInput';
import { WelcomeScreen } from '../components/AIChat/WelcomeScreen';
import { BlobatarBot } from '../components/ui/BlobatarBot';
import { useOptionalFocus } from '../context/FocusContext';
import { ChevronRight, ChevronDown, Check, X, Sparkles, History as HistoryIcon, Trash2, Plus, Loader2 } from 'lucide-react';

// --- TYPES (Internal) ---
interface Message extends Omit<StoredChatMessage, 'pendingTasks'> {
    pendingTasks?: ParsedTask[];
}

export interface AIChatProps {
    isWidget?: boolean;
    onClose?: () => void;
}

const AI_MODELS = [
    { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen' },
    { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
];

export const AIChat: React.FC<AIChatProps> = ({ isWidget = false, onClose }) => {
    const navigate = useNavigate();
    const {
        settings,
        updateSettings,
        subjects,
        addTasksBatch,
        askConfirm,
        startDate,
        currentDay,
        totalDays,
        userName,
        user,
        level,
        xp,
        streakStats,
        showToast,
        userId,
    } = useStore();
    const focusCtx = useOptionalFocus();
    const botSeed = userName || user?.displayName || user?.email?.split('@')[0] || 'Parsashz';
    const currentStreak = streakStats?.currentStreak ?? 0;
    const isFocusRunning = focusCtx?.status === 'running';

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
    const selectedModel = AI_MODELS.some((m) => m.id === settings.geminiModel)
        ? settings.geminiModel
        : 'gemini-4-hydrogen';

    const [reviewTasks, setReviewTasks] = useState<ParsedTask[] | null>(null);

    // References
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Derived State
    const activeSession = sessions.find((s) => s.id === activeSessionId);
    const messages = activeSession?.messages || [];
    const filteredMessages = messages.filter((m) =>
        m.text.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // --- INITIALIZATION ---
    useEffect(() => {
        const loadSessions = async () => {
            const storageKey = `gemini_chat_sessions_${userId || 'parsaplan_local_user'}`;
            try {
                let savedSessions = await get(storageKey);
                if (!savedSessions && (userId === 'parsaplan_local_user' || !userId)) {
                    const localRaw = localStorage.getItem('gemini_chat_sessions');
                    if (localRaw) {
                        savedSessions = JSON.parse(localRaw);
                    }
                }

                if (savedSessions && Array.isArray(savedSessions)) {
                    const fixed: ChatSession[] = (savedSessions as Array<{ id: string; title: string; timestamp: number; messages?: StoredChatMessage[] }>).map((s) => ({
                        ...s,
                        messages: (Array.isArray(s.messages) ? s.messages : []).map((m) => ({
                            ...m,
                            timestamp: new Date(m.timestamp),
                        })),
                    }));
                    setSessions(fixed);
                    if (fixed.length > 0) setActiveSessionId(fixed[0].id);
                } else {
                    createNewChat();
                }
            } catch (e) {
                console.error('Failed to load sessions', e);
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
            set(storageKey, sessions).catch((e) => console.error('Failed saving sessions', e));
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
            timestamp: Date.now(),
        };
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const deleteSession = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        askConfirm(
            'حذف گفتگو',
            'آیا این گفتگو برای همیشه حذف شود؟',
            () => {
                setSessions((prev) => {
                    const filtered = prev.filter((s) => s.id !== id);
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
        setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s)));
    };

    const updateActiveSessionMessages = (newMessages: StoredChatMessage[]) => {
        if (!activeSessionId) return;
        setSessions((prev) =>
            prev.map((s) => {
                if (s.id === activeSessionId) {
                    let title = s.title;
                    if (s.title === 'چت جدید' && newMessages.length > 0) {
                        const firstUserMsg = newMessages.find((m) => m.sender === 'user');
                        if (firstUserMsg) {
                            title = firstUserMsg.text.slice(0, 25) + (firstUserMsg.text.length > 25 ? '...' : '');
                        }
                    }
                    return { ...s, messages: newMessages, title, timestamp: Date.now() };
                }
                return s;
            })
        );
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
                subject: targetSubject ? targetSubject.name : p.subject || 'عمومی',
                title: p.title || p.topic || 'تسک هوشمند',
                topic: p.topic || '',
                studyType: (p.studyType as StudyType) || 'study',
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

    const handleSend = async (overrideText?: string, attachments?: ChatAttachmentPayload[]) => {
        const textToSend = overrideText !== undefined ? overrideText : input;
        if (!textToSend.trim() && (!attachments || attachments.length === 0)) return;

        const displayAttachments: { type: 'image' | 'video' | 'file'; url?: string; name: string }[] =
            attachments && attachments.length > 0
                ? attachments.map((att) => ({
                      type: att.kind === 'image' ? 'image' : 'file',
                      url: att.kind === 'image' && att.sizeBytes <= 1_500_000 ? att.previewUrl : undefined,
                      name: att.name,
                  }))
                : [];

        const userMsg: Message = {
            id: Date.now().toString(),
            text: textToSend || 'تحلیل فایل پیوست‌شده',
            sender: 'user',
            timestamp: new Date(),
            attachments: displayAttachments.length > 0 ? displayAttachments : undefined,
        };

        const updatedMsgs = [...messages, userMsg];
        updateActiveSessionMessages(updatedMsgs);
        if (overrideText === undefined) setInput('');
        setIsTyping(true);

        try {
            abortControllerRef.current = new AbortController();

            const systemContext = `
شما دستیار هوشمند و اختصاصی برنامه‌ریزی تحصیلی «پارساپلان» هستید. نام کاربر: ${userName || 'دوست من'}.
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
        "date": "${toIsoString(new Date())}",
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

            const history = messages
                .filter((m) => !m.isError && m.text.trim().length > 0)
                .slice(-12)
                .map((m) => ({
                    role: m.sender === 'user' ? ('user' as const) : ('model' as const),
                    text: m.text,
                }));

            const serverAttachments = attachments?.map((att) => ({
                name: att.name,
                mimeType: att.mimeType,
                ...(att.base64Data ? { base64Data: att.base64Data } : {}),
                ...(att.textContent !== undefined ? { textContent: att.textContent } : {}),
            }));

            const response = await fetch('/api/gemini/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: textToSend,
                    history,
                    systemInstruction: systemContext,
                    model: selectedModel,
                    attachments: serverAttachments,
                }),
                signal: abortControllerRef.current.signal,
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(
                    data?.error ||
                        (response.status === 429
                            ? 'سقف درخواست‌های هوش مصنوعی موقتاً پر شده است.'
                            : 'AI request failed')
                );
            }

            const text: string = data.text || '';

            let parsedTasks: ParsedTask[] | undefined;

            const jsonMatch = text.match(/```json([\s\S]*?)```/);
            if (jsonMatch && jsonMatch[1]) {
                try {
                    const rawJson: unknown = JSON.parse(jsonMatch[1].trim());
                    const validated = aiTaskActionSchema.safeParse(rawJson);
                    if (validated.success) {
                        const actionBlock = validated.data.action;
                        const actionType = actionBlock?.type ?? validated.data.type;
                        const rawTasks = actionBlock?.tasks ?? validated.data.tasks;
                        if ((actionType === 'preview_tasks' || actionType === 'auto_add_tasks') && rawTasks) {
                            parsedTasks = rawTasks.map((t) => ({
                                id: t.id || crypto.randomUUID(),
                                title: t.title || t.topic || 'تسک هوشمند',
                                subject: t.subject,
                                topic: t.topic || t.title || '',
                                details: t.details,
                                testRange: t.testRange,
                                date: t.date || toIsoString(new Date()),
                                startTime: t.startTime,
                                durationMinutes: t.durationMinutes,
                                priority: t.priority,
                                studyType: t.studyType,
                                subTasks: t.subTasks?.map((st) => ({
                                    subject: st.subject || t.subject || 'عمومی',
                                    topic: st.topic || '',
                                })),
                            }));
                        }
                    }
                } catch (e) {
                    console.error('JSON Error', e);
                }
            }

            // User Agency (WWDC26): Always preview AI-proposed tasks before mutating the user's schedule
            if (parsedTasks && parsedTasks.length > 0) {
                setReviewTasks(parsedTasks);
            }

            const cleanText = text.replace(/```json[\s\S]*?```/g, '').trim();

            const aiMsg: Message = {
                id: Date.now().toString(),
                text: cleanText || 'برنامه پیشنهادی آماده بررسی و تایید شماست:',
                sender: 'ai',
                timestamp: new Date(),
                pendingTasks: parsedTasks,
                tasksApplied: false,
            };

            updateActiveSessionMessages([...updatedMsgs, aiMsg]);
            setIsTyping(false);
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') {
                setIsTyping(false);
                return;
            }
            console.error('AI Error:', error);
            const errorMsg: Message = {
                id: Date.now().toString(),
                text: getErrorMessage(
                    error,
                    'متاسفانه در پردازش درخواست خطایی رخ داد. لطفاً اتصال اینترنت را بررسی فرمایید.'
                ),
                sender: 'ai',
                timestamp: new Date(),
                isError: true,
                retryText: textToSend,
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
            text: `${list.length} تسک با موفقیت به داشبورد و تایم‌لاین اضافه شد.`,
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
                text: `${reviewTasks.length} تسک با موفقیت به برنامه و تایم‌لاین اضافه شد.`,
                sender: 'ai',
                timestamp: new Date(),
            };
            updateActiveSessionMessages([...messages, successMsg]);
            setReviewTasks(null);
        }
    };

    const currentModelObj = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0];

    return (
        <div
            className={`flex bg-[var(--surface-canvas)] text-on-surface overflow-hidden relative font-sans ${
                isWidget
                    ? 'h-full'
                    : 'h-[calc(100dvh-120px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-[calc(100dvh-64px)]'
            }`}
        >
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

            {/* Chat Conversation Area */}
            <section aria-label="ناحیه گفتگو" className="flex-1 flex flex-col h-full relative w-full transition-all duration-200 z-10 min-w-0">
                {/* Opaque Semantic Header (Zero Glass-on-Glass) */}
                <header
                    className={`px-3.5 py-2 bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 z-20 ${
                        isWidget ? 'pt-safe' : ''
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsSidebarOpen(true)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-on-surface hover:bg-surface-container transition cursor-pointer"
                            title="تاریخچه گفتگوها"
                            aria-label="تاریخچه گفتگوها"
                        >
                            <HistoryIcon size={19} />
                        </button>

                        {/* Model Selector */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                aria-expanded={isModelDropdownOpen}
                                aria-label="انتخاب مدل هوش مصنوعی"
                                className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-primary hover:bg-surface-container transition border border-[var(--border-subtle)] cursor-pointer"
                            >
                                <ChevronDown size={15} />
                                <span className="text-xs font-bold">{currentModelObj.label}</span>
                                <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                            </button>

                            {isModelDropdownOpen && (
                                <div className="absolute top-full start-0 mt-2 w-52 bg-[var(--surface-elevated)] rounded-2xl shadow-lg p-1.5 z-30 flex flex-col gap-1 border border-[var(--border-subtle)]">
                                    {AI_MODELS.map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => {
                                                updateSettings({ geminiModel: m.id });
                                                setIsModelDropdownOpen(false);
                                            }}
                                            className="min-h-[40px] flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-surface-container text-start transition-colors text-xs cursor-pointer"
                                        >
                                            <span className={selectedModel === m.id ? 'text-primary font-bold' : 'text-on-surface'}>
                                                {m.label}
                                            </span>
                                            {selectedModel === m.id && <Check size={15} className="text-primary" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={createNewChat}
                            className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-container-low text-[var(--text-secondary)] hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                            title="چت جدید"
                            aria-label="گفتگوی جدید"
                        >
                            <Plus size={18} />
                        </button>

                        {activeSession && activeSession.messages.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClearSession}
                                className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-container-low text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="پاک‌سازی این گفتگو"
                                aria-label="پاک‌سازی این گفتگو"
                            >
                                <Trash2 size={17} />
                            </button>
                        )}

                        {isWidget ? (
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="بستن دستیار هوشمند"
                                className="w-10 h-10 flex items-center justify-center hover:bg-surface-container rounded-xl transition text-[var(--text-secondary)] cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                aria-label="بازگشت به داشبورد"
                                className="w-10 h-10 flex items-center justify-center hover:bg-surface-container rounded-xl transition text-[var(--text-secondary)] cursor-pointer"
                            >
                                <ChevronRight size={20} />
                            </button>
                        )}
                    </div>
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-3.5 py-4 md:p-6 custom-scrollbar scroll-smooth min-h-0 relative">
                    {messages.length === 0 ? (
                        <WelcomeScreen
                            onPromptSelect={(text) => handleSend(text)}
                            userName={userName || 'دوست من'}
                            botSeed={botSeed}
                            botConfig={settings?.blobatar}
                            level={level}
                            xp={xp}
                            streak={currentStreak}
                            isFocusRunning={isFocusRunning}
                        />
                    ) : (
                        <div className="max-w-3xl mx-auto pb-4">
                            {/* Search bar */}
                            <div className="mb-4">
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="جستجو در پیام‌های این گفتگو..."
                                    aria-label="جستجو در پیام‌ها"
                                    className="w-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-2xl px-4 py-2.5 text-base sm:text-sm outline-none focus:border-primary text-on-surface"
                                    dir="rtl"
                                />
                            </div>

                            {filteredMessages.map((msg) => (
                                <ChatMessage
                                    key={msg.id}
                                    message={msg}
                                    onRetry={(retryTxt) => handleSend(retryTxt)}
                                    onRegenerate={() => handleSend(msg.text)}
                                    onReviewTasks={setReviewTasks}
                                    onAutoAddTasks={handleAutoAddMessageTasks}
                                    tasksApplied={msg.tasksApplied}
                                    botSeed={botSeed}
                                    botConfig={settings?.blobatar}
                                    userLevel={level}
                                />
                            ))}

                            {isTyping && (
                                <div className="flex flex-row-reverse items-center gap-3 mb-6">
                                    <div className="w-9 h-9 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                                        <BlobatarBot
                                            seed={botSeed}
                                            config={settings?.blobatar}
                                            level={level}
                                            isThinking
                                            size="xs"
                                        />
                                    </div>
                                    <div className="bg-[var(--surface-elevated)] px-4 py-3 rounded-[20px] rounded-tl-md border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)] flex items-center gap-2">
                                        <Loader2 size={15} className="animate-spin text-primary" />
                                        <span>در حال آماده‌سازی پاسخ...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Opaque Semantic Input Footer */}
                <div
                    className={`shrink-0 z-20 w-full px-3 pt-2.5 pb-2 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)] ${
                        isWidget ? 'pb-safe' : ''
                    }`}
                >
                    <ChatInput
                        input={input}
                        setInput={setInput}
                        isTyping={isTyping}
                        onSend={(files) => handleSend(undefined, files)}
                        onStop={handleStop}
                    />
                </div>
            </section>

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