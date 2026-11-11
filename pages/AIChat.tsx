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
import { Menu, Settings as SettingsIcon, ChevronLeft, X, Sparkles, History as HistoryIcon, Trash2 } from 'lucide-react';

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

const AIChat: React.FC<AIChatProps> = ({ isWidget = false, onClose }) => {
    const navigate = useNavigate();
    const { settings, updateSettings, subjects, addTasksBatch, askConfirm, startDate, currentDay, totalDays, tasks, xp, level, moods, auditLog, progressPercent, getProgress, userName, dailyNotes, showToast, geminiApiKey, userId } = useStore();

    // --- STATE ---
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // UI State
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    // Settings (Persisted)
    const activeApiKey = geminiApiKey || localStorage.getItem('gemini_api_key') || '';
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

    const {
        sessions: focusSessions,
        streakStats,
        studyMinutesByDate,
        updateSettings: updateStoreSettings,
    } = useStore();

    useEffect(() => {
        if (settings?.hasUnreadAiMessage) {
            updateStoreSettings({ hasUnreadAiMessage: false });
        }
    }, [settings?.hasUnreadAiMessage, updateStoreSettings]);

    // --- GEMINI LOGIC ---
    const generateSystemPrompt = () => {
        const today = new Date();
        const todayIso = today.toISOString().split('T')[0];
        const todayShamsi = toShamsi(today);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowIso = tomorrow.toISOString().split('T')[0];
        const tomorrowShamsi = toShamsi(tomorrow);

        const currentStream = settings?.stream || 'life';
        const streamSubjects = SUBJECT_LISTS[currentStream] || SUBJECT_LISTS['life'];
        const allSubjects = [...new Set([...streamSubjects, ...(subjects?.map(s => s.name) || [])])].join(', ');

        // Context: Progress & Mood & Notes
        const planCompletion = Math.round((currentDay / totalDays) * 100);
        const taskCompletion = getProgress();
        const overdueTasksCount = tasks.filter(t => t.date < todayIso && !t.isCompleted).length;

        // Deep Performance Metrics (tasks + live Pomodoro/Stopwatch sessions)
        const completedTasks = tasks.filter(t => t.isCompleted);
        const totalTaskMinutes = completedTasks.reduce((acc, t) => acc + (t.actualDuration || 0), 0);
        const totalFocusSessionMinutes = Math.round(
            (focusSessions || []).reduce((acc, s) => acc + (s.durationSeconds || 0), 0) / 60
        );
        const todayFocusedMins = studyMinutesByDate?.[todayIso] || 0;
        const dailyCapacityMins = settings?.dailyCapacityMinutes ?? 360;
        const plannedTodayMins = tasks
            .filter(t => t.date === todayIso && !t.isCompleted)
            .reduce((acc, t) => acc + (t.durationMinutes ?? 60), 0);
        const remainingFreeHours = Math.max(0, Math.round(((dailyCapacityMins - plannedTodayMins) / 60) * 10) / 10);
        const studyHours = Math.round((Math.max(totalTaskMinutes, totalFocusSessionMinutes) / 60) * 10) / 10;

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
You are the **ParsaPlan AI Coach**, a smart personal productivity, life-planning, project, habit, and learning assistant with FULL ACCESS to the user's account context.
Identity: You help ${userName || 'the user'} organize work, personal goals, health/fitness, habits, finances, and learning/studies cleanly without pressure.

**Comprehensive Context for ${userName || 'User'}:**
- Today: ${todayIso} (Shamsi: ${todayShamsi})
- Tomorrow (Shamsi): ${tomorrowShamsi}
- Workspace Profile Mode: ${currentStream}
- Active Categories / Life Areas: ${allSubjects}
- Current Level: ${level} (XP: ${xp}, Progress: ${Math.round(progressPercent || 0)}%)
- Plan Progress: ${planCompletion}% (Day ${currentDay} of ${totalDays})
- Overdue Tasks: ${overdueTasksCount}

**Performance Analytical Data:**
- Overall Completion: ${taskCompletion}%
- Total Logged Focus Time: ${studyHours} hours (Focus sessions logged: ${(focusSessions || []).length}, Today focused: ${todayFocusedMins} mins)
- Consistency Streak: ${streakStats?.currentStreak || 0} days (Longest: ${streakStats?.longestStreak || 0} days)
- Remaining Free Capacity Today: ~${remainingFreeHours} hours (out of ${Math.round(dailyCapacityMins / 60)}h target)
- Average Task Quality: ${avgFocus}/5
${tTotal > 0 ? `- Exam/Quiz Accuracy: ${accuracy}%` : ''}
- Category Completion: ${subPerformance}

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
2. Adapt to the user's workspace mode (${currentStream}) and support ANY topic (work projects, fitness, habits, personal errands, finances, creative writing, OR academics).
3. **If asked to plan, schedule, or add tasks, YOU MUST output a JSON block** within your response. Always include realistic \`date\` (\`YYYY-MM-DD\`), \`startTime\` (\`"HH:mm"\`), \`durationMinutes\` (integer, e.g. \`45\` or \`60\`), \`priority\` (\`"urgent"|"high"|"medium"|"low"\`), and \`studyType\` (\`"task"|"project"|"habit"|"health"|"meeting"|"creative"|"study"|"review"|"exam"|"analysis"\`) so every added task seamlessly syncs with the 24h Timeline, Dashboard, Kanban/Eisenhower views, and Analytics!
4. If the user explicitly asks you to directly/automatically add tasks (e.g., "اضافه کن"، "بذار تو برنامه"، "خودکار ثبت کن"), use \`"type": "auto_add_tasks"\`. If they ask for suggestions/draft plans, use \`"type": "preview_tasks"\`.

**JSON SCHEMAS (MANDATORY FORMAT):**

Type A: Auto-Add or Preview Tasks (Unified Dashboard + 24h Timeline + Views)
\`\`\`json
{ 
  "type": "auto_add_tasks", 
  "message": "یک پیام کوتاه...", 
  "tasks": [
    { "subject": "کار و پروژه", "topic": "تکمیل ارائه پروژه", "details": "آماده‌سازی اسلایدها", "date": "${todayIso}", "startTime": "09:30", "durationMinutes": 90, "priority": "high", "studyType": "project" },
    { "subject": "ورزش و سلامت", "topic": "تمرین ورزشی", "details": "۴۵ دقیقه دویدن", "date": "${todayIso}", "startTime": "18:00", "durationMinutes": 45, "priority": "medium", "studyType": "health" }
  ] 
}
\`\`\`

Type B: Recurring Multi-Day Series (Daily consecutive repeat)
\`\`\`json
{ 
  "type": "autopilot_series", 
  "message": "پیام...", 
  "series": { 
    "subject": "NameOfCategory", "topic": "Topic...", 
    "startDay": ${currentDay}, "endDay": ${currentDay + 5}, 
    "startTime": "10:00", "durationMinutes": 60,
    "dailyCount": 0, "startTest": 1, "interval": 1
  } 
}
\`\`\`

**FINAL COMMAND**: Be proactive and helpful. Use the user's name (${userName}) correctly. If you create tasks or schedules, always include the JSON block with valid times and dates.
`.trim();
    };

    const mapParsedTasksToSubjectTasks = (list: ParsedTask[]): SubjectTask[] => {
        const planStart = startDate || toIsoString(new Date());
        return list.map((t) => {
            const safeDate = t.date && !isNaN(Date.parse(t.date)) ? t.date : toIsoString(new Date());
            const diffDays = getDiffDays(planStart, safeDate);
            const rawDayId = diffDays + 1;
            const computedDayId = rawDayId >= 1 && rawDayId <= totalDays ? rawDayId : 0;
            const validPriority: TaskPriority =
                t.priority === 'urgent' || t.priority === 'high' || t.priority === 'medium' || t.priority === 'low'
                    ? t.priority
                    : 'medium';
            const validStart = typeof t.startTime === 'string' && /^\d{2}:\d{2}$/.test(t.startTime) ? t.startTime : undefined;
            const validDuration = Math.min(480, Math.max(15, Number(t.durationMinutes) || 60));

            return {
                id: crypto.randomUUID(),
                dayId: computedDayId,
                date: safeDate,
                subject: (t.subject || 'شخصی').trim(),
                topic: (t.topic || t.title || 'تسک جدید').trim(),
                details: t.details || '',
                testRange: t.testRange || '',
                isCompleted: false,
                status: 'todo',
                isCustom: computedDayId === 0,
                priority: validPriority,
                startTime: validStart,
                durationMinutes: validDuration,
                studyType: t.studyType || 'task',
                subTasks: t.subTasks as any,
                tags: ['AI'],
            };
        });
    };

    const handleSend = async (manualInput?: string, attachments?: File[]) => {
        const textToSend = manualInput || input;

        // Allow sending if there are attachments even if no text
        if (!textToSend.trim() && (!attachments || attachments.length === 0)) return;

        if (!activeApiKey) {
            showToast('لطفاً کلید API را در تنظیمات وارد کنید', 'warning');
            navigate('/settings');
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
            const genAI = new GoogleGenerativeAI(activeApiKey);
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

            const currentSignal = abortControllerRef.current.signal;
            const result = await chat.sendMessage(currentParts as any, { signal: currentSignal });
            if (currentSignal.aborted) return;
            const response = result.response;
            const text = response.text();

            // JSON Logic (supports auto_add_tasks, preview_tasks, and autopilot_series)
            let parsedTasks: ParsedTask[] | undefined;
            let shouldAutoAdd = false;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            let jsonString = "";

            if (jsonMatch) {
                try {
                    jsonString = jsonMatch[0];
                    const action = JSON.parse(jsonString);

                    if (action.type === 'autopilot_series' && action.series) {
                        const { subject, topic, startDay, endDay, dailyCount = 0, startTest = 1, interval = 1, startTime, durationMinutes } = action.series;

                        const safeStartDay = startDay || currentDay;
                        const safeEndDay = endDay || safeStartDay;

                        parsedTasks = [];
                        let currentTest = startTest;
                        const planStart = new Date(startDate);

                        for (let day = safeStartDay; day <= safeEndDay; day += interval) {
                            if (day > totalDays) break;
                            const taskDate = new Date(planStart);
                            taskDate.setDate(planStart.getDate() + (day - 1));

                            const endTest = currentTest + dailyCount - 1;

                            parsedTasks.push({
                                title: `${subject}`,
                                subject,
                                topic,
                                details: dailyCount > 0 ? `تست ${currentTest} تا ${endTest}` : 'برنامه‌ریزی شده',
                                date: taskDate.toISOString().split('T')[0],
                                startTime,
                                durationMinutes: durationMinutes || 60,
                                studyType: dailyCount > 0 ? 'study' : 'task',
                                id: crypto.randomUUID()
                            });
                            currentTest = endTest + 1;
                        }
                    } else if ((action.type === 'preview_tasks' || action.type === 'auto_add_tasks') && Array.isArray(action.tasks)) {
                        shouldAutoAdd = action.type === 'auto_add_tasks';
                        parsedTasks = action.tasks.map((t: any) => ({
                            ...t,
                            id: crypto.randomUUID()
                        }));
                    }
                } catch (e) {
                    console.error("JSON Error", e);
                    jsonString = "";
                }
            }

            let autoApplied = false;
            if (shouldAutoAdd && parsedTasks && parsedTasks.length > 0) {
                addTasksBatch(mapParsedTasksToSubjectTasks(parsedTasks), 'دستیار هوشمند AI');
                autoApplied = true;
            }

            // Remove JSON from the speech text
            let cleanText = text.replace(/```json[\s\S]*?```/g, '').trim();
            if (jsonString && cleanText.includes(jsonString)) {
                cleanText = cleanText.replace(jsonString, '').trim();
            }

            const aiMsg: Message = {
                id: Date.now().toString(),
                text: cleanText || (autoApplied ? `${parsedTasks?.length} تسک به‌صورت خودکار به برنامه، تایم‌لاین و تحلیل اضافه شد. ✅` : parsedTasks ? 'لیست تسک‌ها آماده بررسی است:' : text),
                sender: 'ai',
                timestamp: new Date(),
                pendingTasks: parsedTasks,
                tasksApplied: autoApplied,
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

    const handleRegenerate = async (aiMessageId: string) => {
        if (!activeSessionId) return;
        const currentSession = sessions.find(s => s.id === activeSessionId);
        if (!currentSession) return;

        const msgs = currentSession.messages;
        const aiMsgIndex = msgs.findIndex(m => m.id === aiMessageId);
        if (aiMsgIndex === -1) return;

        // پیدا کردن پیام قبلی کاربر
        const userMsg = msgs.slice(0, aiMsgIndex).reverse().find(m => m.sender === 'user');
        if (!userMsg) return;

        // حذف پیام هوش مصنوعی فعلی و تمام پیام‌های بعد از آن برای ریجنریت تمیز
        const cleanMsgs = msgs.slice(0, aiMsgIndex);
        updateActiveSessionMessages(cleanMsgs);

        // فراخوانی ارسال مجدد
        await handleSend(userMsg.text);
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
            text: `${list.length} تسک با موفقیت به داشبورد، تایم‌لاین ۲۴ ساعته و بخش تحلیل اضافه شد. ✅`,
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

    return (
        <div className="flex h-full bg-slate-50 dark:bg-gray-950 overflow-hidden relative font-sans">
            {/* Ambient Background Glowing Orbs (2026 Premium Aesthetic) */}
            <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full filter blur-[130px] pointer-events-none animate-float-slow" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-500/5 dark:bg-purple-500/10 rounded-full filter blur-[130px] pointer-events-none animate-float-slow" style={{ animationDelay: '-3s' }} />

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

                {/* Header (Glassmorphic) */}
                <header className="p-4 bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 flex items-center justify-between sticky top-0 z-20 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsSidebarOpen(true)} 
                            className="p-2.5 -mr-2 text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition btn-micro-interactive"
                            title="تاریخچه گفتگوها"
                        >
                            <HistoryIcon size={20} />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="font-extrabold text-gray-800 dark:text-white flex items-center gap-2 text-sm md:text-base tracking-tight">
                                {activeSession?.title || 'دستیار هوشمند'}
                            </h1>
                            <select 
                                value={selectedModel}
                                onChange={(e) => updateSettings({ geminiModel: e.target.value })}
                                className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-150/20 rounded-md px-1.5 py-0.5 mt-0.5 outline-none cursor-pointer hover:bg-indigo-100 transition-colors w-max"
                            >
                                <option value="gemini-2.0-flash" className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">Gemini 2.0 Flash</option>
                                <option value="gemini-1.5-pro" className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">Gemini 1.5 Pro</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {activeSession && activeSession.messages.length > 0 && (
                            <button 
                                onClick={handleClearSession} 
                                className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500 rounded-xl transition text-gray-500 btn-micro-interactive"
                                title="حذف تاریخچه این گفتگو"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        {isWidget ? (
                            <button onClick={onClose} className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500 rounded-xl transition text-gray-500 btn-micro-interactive">
                                <X size={20} />
                            </button>
                        ) : (
                            <button onClick={() => navigate('/')} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition text-gray-500 btn-micro-interactive">
                                <ChevronLeft size={20} />
                            </button>
                        )}
                    </div>
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar scroll-smooth min-h-0 relative">
                    {messages.length === 0 ? (
                        <WelcomeScreen onPromptSelect={(text) => handleSend(text)} userName="کاربر" />
                    ) : (
                        <div className="max-w-4xl mx-auto pb-4">
                            {/* 2026 Premium Chat Search Bar */}
                            <div className="mb-5 select-none animate-in fade-in slide-in-from-top-2 duration-300">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="🔍 جستجو در پیام‌های این گفتگو..."
                                    className="w-full bg-white/45 dark:bg-gray-900/45 backdrop-blur-xl border border-gray-200/40 dark:border-gray-800/40 rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-gray-750 dark:text-gray-200 shadow-sm"
                                    dir="rtl"
                                />
                            </div>

                            {filteredMessages.length === 0 && searchQuery !== '' ? (
                                <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-xs font-bold">
                                    پیامی متناسب با جستجوی شما پیدا نشد 🧐
                                </div>
                            ) : (
                                filteredMessages.map((msg) => (
                                    <ChatMessage
                                        key={msg.id}
                                        message={msg}
                                        onRetry={(text) => handleSend(text)}
                                        onRegenerate={handleRegenerate}
                                        onReviewTasks={setReviewTasks}
                                        onAutoAddTasks={handleAutoAddMessageTasks}
                                        tasksApplied={msg.tasksApplied}
                                    />
                                ))
                            )}
                            {isTyping && (
                                <div className="flex flex-row-reverse items-end gap-3.5 mb-6 opacity-90 animate-fade-in-up">
                                    <div className="w-8.5 h-8.5 rounded-xl bg-white/80 dark:bg-gray-800/80 text-indigo-500 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-md">
                                        <Sparkles size={16} className="text-indigo-500 animate-spin-slow" strokeWidth={2.5} />
                                    </div>
                                    <div className="bubble-ai-premium backdrop-blur-md px-5 py-3 rounded-[1.3rem] rounded-tl-sm border border-gray-200/40 dark:border-gray-800/40 text-sm text-gray-500 shadow-sm glass-premium">
                                        <div className="flex items-center gap-1.5 py-1">
                                            <span className="w-2.5 h-2.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-2.5 h-2.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-2.5 h-2.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full animate-bounce"></span>
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
