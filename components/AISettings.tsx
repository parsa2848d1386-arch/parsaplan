
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import {
    Bot, Key, Loader2, Send, AlertCircle, Check, X, Sparkles, Settings2,
    MessageSquare, Trash2, Plus, Edit2, Calendar, BookOpen, Hash, AlignLeft
} from 'lucide-react';
import { Subject } from '../types';

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
    const { showToast, addTask } = useStore();
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

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, pendingActions]);

    const saveConfig = () => {
        localStorage.setItem('ai_config', JSON.stringify(config));
        showToast('Configuration saved!', 'success');
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

    const formatMessageForProvider = (msg: Message, p: string) => {
        if (p === 'google') {
            // Google Gemini format
            return {
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            };
        }
        // OpenAI/Anthropic format
        return { role: msg.role, content: msg.content };
    };

    const sendMessage = async () => {
        if (!input.trim() || !config.apiKey) {
            showToast('Please enter a message and ensure API Key is set.', 'warning');
            return;
        }

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setPendingActions(null);

        try {
            let response: Response;
            let responseData: any;
            let assistantContent: string = '';

            if (provider === 'google') {
                // Google Gemini API
                const url = `${config.endpoint}/${config.model}:generateContent?key=${config.apiKey}`;

                // Convert history to Gemini format
                // Note: Gemini doesn't support 'system' role in the messages list nicely in v1beta sometimes, 
                // but we can put it in the first user message or use system_instruction if available.
                // For 'generateContent', simple approach: prepend system prompt to latest message or use separate field.
                // We'll prepend context for robustness or use system_instruction if using v1beta/models/...

                const contents = messages.map(m => formatMessageForProvider(m, 'google'));
                contents.push({ role: 'user', parts: [{ text: `SYSTEM_INSTRUCTION: ${SYSTEM_PROMPT}\n\nUSER_REQUEST: ${input}` }] });

                response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents })
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
                        system: SYSTEM_PROMPT,
                        messages: [...messages, userMessage].map(m => ({
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
                // OpenAI Standard
                response = await fetch(config.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: config.model,
                        messages: [
                            { role: 'system', content: SYSTEM_PROMPT },
                            ...messages.map(m => ({ role: m.role, content: m.content })),
                            { role: 'user', content: input }
                        ],
                        temperature: 0.7
                    })
                });
                if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);
                responseData = await response.json();
                assistantContent = responseData.choices[0]?.message?.content;
            }

            // Cleanup code blocks if AI wraps JSON in ```json ... ```
            const cleanContent = assistantContent.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                // Try parsing JSON
                const action: ParsedAction = JSON.parse(cleanContent);

                // Show the textual message from the AI
                if (action.message) {
                    setMessages(prev => [...prev, { role: 'assistant', content: action.message }]);
                }

                // If tasks are returned, enter Preview Mode
                if (action.type === 'preview_tasks' && action.tasks && action.tasks.length > 0) {
                    setPendingActions(action);
                }

            } catch (e) {
                // Fallback if not JSON
                console.log('Not JSON:', e);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-200 dark:border-gray-800">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
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
                    <div className="p-5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 space-y-4 animate-in slide-in-from-top-2">
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-2 block">ارائه دهنده (Provider)</label>
                            <div className="flex flex-wrap gap-2">
                                {(['openai', 'anthropic', 'google', 'custom'] as const).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => handleProviderChange(p)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${provider === p
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                                            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                                            }`}
                                    >
                                        {p === 'openai' && 'OpenAI'}
                                        {p === 'anthropic' && 'Anthropic'}
                                        {p === 'google' && 'Google Gemini'}
                                        {p === 'custom' && 'Custom'}
                                        {provider === p && <Check size={14} />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1.5 block">API Key</label>
                                <div className="relative">
                                    <Key size={16} className="absolute right-3 top-3 text-gray-400" />
                                    <input
                                        type="password"
                                        value={config.apiKey}
                                        onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                        placeholder="sk-..."
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 pr-10 text-xs font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 transition"
                                    />
                                </div>
                            </div>

                            {(provider === 'custom' || provider === 'google') && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">Endpoint</label>
                                        <input
                                            type="text"
                                            value={config.endpoint}
                                            onChange={e => setConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">Model Name</label>
                                        <input
                                            type="text"
                                            value={config.model}
                                            onChange={e => setConfig(prev => ({ ...prev, model: e.target.value }))}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <button onClick={saveConfig} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition shadow-lg">
                            ذخیره و بستن
                        </button>
                    </div>
                )}

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50 dark:bg-black/20">
                    {messages.length === 0 && !pendingActions && (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                            <Sparkles size={48} className="text-indigo-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">چطور می‌توانم کمکتان کنم؟</h3>
                            <p className="text-sm text-gray-500 max-w-sm mt-2">
                                مثال: "از فردا به مدت ۴ روز، ۲۰۰ تست ریاضی از مبحث مشتق (تست ۱۵۰۰ تا ۱۷۰۰) برام بچین."
                            </p>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`p-4 max-w-[85%] rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-100 dark:border-gray-700'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {/* Preview Mode / Pending Actions */}
                    {pendingActions?.tasks && (
                        <div className="bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-4 shadow-xl shadow-indigo-100/50 dark:shadow-none animate-in fade-in slide-in-from-bottom-5">
                            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                    <h4 className="font-bold text-sm">پیش‌نمایش برنامه تولید شده</h4>
                                    <span className="bg-indigo-100 dark:bg-indigo-900 text-[10px] px-2 py-0.5 rounded-full">
                                        {pendingActions.tasks.length} تسک
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {pendingActions.tasks.map((task, idx) => (
                                    <div key={idx} className="group relative bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl p-3 hover:border-indigo-300 transition-colors">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {/* Title Edit */}
                                            <div className="col-span-2 flex items-center gap-2">
                                                <div className={`w-2 h-8 rounded-full ${task.subject === 'ریاضی' ? 'bg-blue-500' :
                                                        task.subject === 'فیزیک' ? 'bg-red-500' : 'bg-gray-400'
                                                    }`}></div>
                                                <input
                                                    type="text"
                                                    value={task.title}
                                                    onChange={(e) => handleTaskEdit(idx, 'title', e.target.value)}
                                                    className="flex-1 bg-transparent font-bold text-gray-800 dark:text-white border-none p-0 focus:ring-0 text-sm"
                                                />
                                                <Edit2 size={14} className="opacity-0 group-hover:opacity-50 text-gray-400" />
                                            </div>

                                            {/* Details Inputs */}
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <Calendar size={14} />
                                                <input
                                                    type="date"
                                                    value={task.date}
                                                    onChange={(e) => handleTaskEdit(idx, 'date', e.target.value)}
                                                    className="bg-transparent border-none p-0 text-xs w-full focus:ring-0 text-gray-700 dark:text-gray-300 font-mono"
                                                />
                                            </div>

                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <Hash size={14} />
                                                <input
                                                    type="text"
                                                    value={task.testRange}
                                                    placeholder="Range"
                                                    onChange={(e) => handleTaskEdit(idx, 'testRange', e.target.value)}
                                                    className="bg-transparent border-none p-0 text-xs w-full focus:ring-0 text-gray-700 dark:text-gray-300"
                                                />
                                            </div>

                                            <div className="col-span-2 flex items-center gap-2 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <AlignLeft size={14} />
                                                <input
                                                    type="text"
                                                    value={task.details}
                                                    placeholder="Details"
                                                    onChange={(e) => handleTaskEdit(idx, 'details', e.target.value)}
                                                    className="bg-transparent border-none p-0 text-xs w-full focus:ring-0 text-gray-700 dark:text-gray-300"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={confirmTasks}
                                    className="flex-1 bg-green-600 text-white h-10 rounded-xl text-sm font-bold hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-lg shadow-green-200 dark:shadow-none"
                                >
                                    <Check size={16} /> ثبت در برنامه
                                </button>
                                <button
                                    onClick={() => setPendingActions(null)}
                                    className="px-6 bg-red-50 text-red-500 dark:bg-red-900/20 h-10 rounded-xl text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                                >
                                    لغو
                                </button>
                            </div>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex justify-end">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-3">
                                <Loader2 className="animate-spin text-indigo-500" size={20} />
                                <span className="text-xs text-gray-500 font-medium">درحال نوشتن برنامه...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                    {!config.apiKey && (
                        <div className="mb-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center gap-3 animate-pulse">
                            <AlertCircle size={16} className="text-amber-500" />
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                لطفا ابتدا در تنظیمات، کلید API (Provider: {provider}) را وارد کنید.
                            </span>
                        </div>
                    )}
                    <div className="flex items-end gap-2">
                        <button
                            onClick={() => { setMessages([]); setPendingActions(null); }}
                            className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                            title="پاک کردن چت"
                        >
                            <Trash2 size={20} />
                        </button>
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            placeholder="دستور خود را تایپ کنید..."
                            className="flex-1 bg-gray-100 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-black border focus:border-indigo-500 rounded-xl px-4 py-3 text-sm outline-none resize-none h-[50px] focus:h-[80px] transition-all"
                            disabled={isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                            className="p-3 mb-0.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:shadow-none"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AISettings;
