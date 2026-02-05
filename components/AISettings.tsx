
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import {
    Bot, Key, Loader2, Send, AlertCircle, Check, X, Sparkles, Settings2,
    MessageSquare, Trash2, Plus, Edit2, Calendar, BookOpen, Hash, AlignLeft
} from 'lucide-react';
import { Subject } from '../types';
import { toIsoString } from '../utils';

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

interface ParsedTask {
    title: string;
    subject: string;
    topic: string;
    details: string;
    testRange: string;
    date: string;
}

interface ParsedAction {
    type: 'preview_tasks' | 'info';
    tasks?: ParsedTask[];
    message?: string;
}

const DEFAULT_CONFIGS: Record<string, Partial<AIConfig>> = {
    openai: { endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
    anthropic: { endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-sonnet-20240620' },
    google: { endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', model: 'gemini-1.5-flash' },
    custom: { endpoint: '', model: '' }
};

const SYSTEM_PROMPT = `You are an advanced AI Study Planner Assistant for 'ParsaPlan'.
Your goal is to help students plan their study routine intelligently and efficiently.

** capabilities:**
1.  **Task Generation:** When a user asks for a plan (e.g., "Plan 200 math tests from index 1500 to 1700 over 4 days"), you MUST calculate the daily load and generate specific tasks.
2.  **Preview Mode:** ALWAYS return a JSON response for task generation so the user can preview them before adding.

**Rules for Task Generation:**
- **Calculate:** Distribute the workload evenly.
- **Dates:** Use YYYY-MM-DD. If 'tomorrow', use ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}. Today is ${new Date().toISOString().split('T')[0]}.
- **Subjects:** Infer the subject (Math, Physics, Biology, etc.) from the text.
- **Details:** Add a short motivating detail or specific range for that day.

**Response Format (Strict JSON):**
You must return ONLY a JSON object with this structure (no markdown, no extra text):
{
  "action": "preview_tasks",
  "message": "Here is a preview of your plan...",
  "tasks": [
    {
      "title": "Short Title",
      "subject": "Math", 
      "topic": "Derivatives",
      "details": "Tests 1500-1550",
      "testRange": "1500-1550",
      "date": "YYYY-MM-DD"
    }
  ]
}

If the user just wants to chat or asks a general question, use "action": "info".
{
  "action": "info",
  "message": "Your answer here..."
}
`;

export const AISettings: React.FC<AISettingsProps> = ({ isOpen, onClose }) => {
    const { showToast, addTask, currentDay, startDate, totalDays, getDayDate } = useStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Config state
    const [showConfig, setShowConfig] = useState(false);
    const [provider, setProvider] = useState<'openai' | 'anthropic' | 'google' | 'custom'>('openai');
    const [config, setConfig] = useState<AIConfig>(() => {
        const saved = localStorage.getItem('ai_config');
        if (saved) return JSON.parse(saved);
        return { endpoint: DEFAULT_CONFIGS.openai.endpoint!, apiKey: '', model: DEFAULT_CONFIGS.openai.model! };
    });

    // Chat state
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pendingActions, setPendingActions] = useState<ParsedAction | null>(null);

    // --- PERSISTENCE ---
    useEffect(() => {
        const savedChat = localStorage.getItem('ai_chat_history');
        if (savedChat) {
            try {
                setMessages(JSON.parse(savedChat));
            } catch (e) {
                console.error("Failed to load chat history", e);
            }
        }
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('ai_chat_history', JSON.stringify(messages));
        }
    }, [messages]);

    const clearChat = () => {
        setMessages([]);
        setPendingActions(null);
        localStorage.removeItem('ai_chat_history');
        showToast('تاریخچه چت پاک شد', 'info');
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

    // --- SYSTEM PROMPT CONSTRUCTION ---
    const getSystemPrompt = () => {
        const today = new Date().toISOString().split('T')[0];
        // Calculate dynamic dates for next 7 days as reference
        const examples = Array.from({ length: 3 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i + 1);
            return `${i + 1} day later: ${d.toISOString().split('T')[0]}`;
        }).join(', ');

        return `You are an advanced AI Study Planner Assistant for 'ParsaPlan'.
Current Context:
- Today's Date (Real World): ${today}
- Plan Start Date: ${startDate}
- Current Plan Day: Day ${currentDay} of ${totalDays}
- Date Reference: ${examples}

Your goal is to help students plan their study routine intelligently.

**Capabilities:**
1.  **Task Generation:** When a user asks for a plan, calculate daily load and generate specific tasks.
2.  **Date Awareness:**
    - If user says "Day 7", calculate the actual date: StartDate + 6 days.
    - If user says "Tomorrow", use Today + 1 day.
    - Always output dates in YYYY-MM-DD format.

**Response Format (Strict JSON):**
You must return ONLY a JSON object (no markdown):
{
  "action": "preview_tasks",
  "message": "Summary of what you did...",
  "tasks": [
    {
      "title": "Short Title",
      "subject": "Math", 
      "topic": "Topic Name",
      "details": "Details",
      "testRange": "10-20",
      "date": "YYYY-MM-DD"
    }
  ]
}

If chatting: {"action": "info", "message": "Answer..."}`;
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
            showToast('Please enter a message and ensure API Key is set.', 'warning');
            return;
        }

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
                const url = `${config.endpoint}/${config.model}:generateContent?key=${config.apiKey}`;
                const contents = newMessages.map(m => formatMessageForProvider(m, 'google'));
                // Inject System Prompt into the last message or as a separate turn (Gemini specific quirk)
                // Best practice for v1beta: Prepend system instruction to the conversation
                const finalContents = [
                    { role: 'user', parts: [{ text: `SYSTEM_Context: ${activeSystemPrompt}` }] },
                    ...contents
                ];

                response = await fetch(url, {
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
                if (action.type === 'preview_tasks' && action.tasks && action.tasks.length > 0) {
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

    const handleTaskEdit = (index: number, field: keyof ParsedTask, value: string) => {
        if (!pendingActions || !pendingActions.tasks) return;
        const updatedTasks = [...pendingActions.tasks];
        updatedTasks[index] = { ...updatedTasks[index], [field]: value };
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
        // Changed z-50 to z-[60] to be above floating nav
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 md:rounded-3xl shadow-2xl w-full max-w-2xl h-full md:h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border-x border-gray-200 dark:border-gray-800">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
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
                        <button onClick={() => setShowConfig(!showConfig)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition text-gray-500">
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
                        {/* Same config UI as before, just kept concise */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-2 block">ارائه دهنده</label>
                            <div className="flex flex-wrap gap-2">
                                {(['openai', 'anthropic', 'google', 'custom'] as const).map(p => (
                                    <button key={p} onClick={() => handleProviderChange(p)} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${provider === p ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{p} {provider === p && <Check size={14} />}</button>
                                ))}
                            </div>
                        </div>
                        <input type="password" value={config.apiKey} onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))} placeholder="API Key" className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs font-mono outline-none" />
                        <button onClick={saveConfig} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl text-sm font-bold shadow-lg">ذخیره</button>
                    </div>
                )}

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50 dark:bg-black/20 pb-20 md:pb-4">
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

                    {/* Preview Mode */}
                    {pendingActions?.tasks && (
                        <div className="bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-4 shadow-xl shadow-indigo-100/50 dark:shadow-none animate-in fade-in slide-in-from-bottom-5 mb-4">
                            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                    <h4 className="font-bold text-sm">پیش‌نمایش ({pendingActions.tasks.length} تسک)</h4>
                                </div>
                            </div>
                            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {pendingActions.tasks.map((task, idx) => (
                                    <div key={idx} className="group relative bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl p-3 hover:border-indigo-300 transition-colors">
                                        <div className="grid grid-cols-1 gap-2">
                                            <div className="flex items-center gap-2">
                                                <input type="text" value={task.title} onChange={(e) => handleTaskEdit(idx, 'title', e.target.value)} className="flex-1 bg-transparent font-bold text-gray-800 dark:text-white border-none p-0 focus:ring-0 text-sm" />
                                                <Edit2 size={12} className="opacity-0 group-hover:opacity-50 text-gray-400" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="date" value={task.date} onChange={(e) => handleTaskEdit(idx, 'date', e.target.value)} className="bg-white dark:bg-gray-800 p-1 rounded text-xs w-full text-gray-700 dark:text-gray-300 font-mono border-none" />
                                                <input type="text" value={task.testRange} onChange={(e) => handleTaskEdit(idx, 'testRange', e.target.value)} placeholder="Range" className="bg-white dark:bg-gray-800 p-1 rounded text-xs w-full text-gray-700 dark:text-gray-300 border-none" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <button onClick={confirmTasks} className="flex-1 bg-green-600 text-white h-10 rounded-xl text-sm font-bold hover:bg-green-700 transition flex items-center justify-center gap-2"><Check size={16} /> ثبت ({pendingActions.tasks.length})</button>
                                <button onClick={() => setPendingActions(null)} className="px-6 bg-red-50 text-red-500 h-10 rounded-xl text-sm font-bold">لغو</button>
                            </div>
                        </div>
                    )}

                    {isLoading && <div className="flex justify-end"><Loader2 className="animate-spin text-indigo-500" size={20} /></div>}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area - Fixed at bottom */}
                <div className="p-3 md:p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0 mb-safe">
                    <div className="flex items-end gap-2">
                        <button onClick={clearChat} className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 rounded-xl transition" title="پاک کردن"><Trash2 size={20} /></button>
                        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="پیام شما..." className="flex-1 bg-gray-100 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-black border focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none resize-none h-[50px] focus:h-[80px] transition-all" disabled={isLoading} />
                        <button onClick={sendMessage} disabled={isLoading || !input.trim()} className="p-3 mb-0.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-lg"><Send size={20} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AISettings;
