
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
    Bot, Key, Loader2, Send, AlertCircle, Check, X, Sparkles, Settings2, MessageSquare, Trash2, Plus
} from 'lucide-react';
import { Subject } from '../types';
import { toShamsiDate, fromShamsiDate } from '../utils';

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
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ParsedAction {
    type: 'add_tasks' | 'delete_tasks' | 'edit_tasks' | 'info';
    tasks?: any[];
    message?: string;
}

const DEFAULT_CONFIGS: Record<string, Partial<AIConfig>> = {
    openai: { endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-3.5-turbo' },
    anthropic: { endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-3-haiku-20240307' },
    custom: { endpoint: '', model: '' }
};

const SYSTEM_PROMPT = `شما یک دستیار هوشمند برای اپلیکیشن برنامه‌ریزی درسی هستید. کار شما کمک به کاربر برای اضافه کردن سریع تسک‌های مطالعاتی است.

وقتی کاربر درخواستی مثل این می‌دهد:
"از تست 1500 تا 1660 فیزیک، روزی 40 تا، از فردا شروع کن"

شما باید:
1. محاسبه کنید چند تسک نیاز است (1660-1500=160 تست، 160/40=4 روز)
2. تسک‌ها را به فرمت JSON خروجی دهید

قواعد:
- تاریخ‌ها را به فرمت ISO (YYYY-MM-DD) تبدیل کنید
- هر تسک باید شامل: title, subject, topic, details, testRange, date باشد
- اگر کاربر تاریخ شمسی گفت، تبدیل به میلادی کنید (تاریخ امروز: ${new Date().toISOString().split('T')[0]})

فرمت خروجی دقیق:
{"action": "add_tasks", "tasks": [{"title": "تست فیزیک ۱۵۰۰-۱۵۴۰", "subject": "فیزیک", "topic": "مبحث", "details": "حل تست", "testRange": "1500-1540", "date": "2024-01-15"}], "message": "۴ تسک برای ۴ روز ایجاد شد"}

اگر درخواست مبهم بود، سوال بپرسید.`;

export const AISettings: React.FC<AISettingsProps> = ({ isOpen, onClose }) => {
    const { showToast, addTask, getDayDate, tasks, totalDays, deleteTask, askConfirm } = useStore();

    // Config state
    const [showConfig, setShowConfig] = useState(false);
    const [provider, setProvider] = useState<'openai' | 'anthropic' | 'custom'>('openai');
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

    const saveConfig = () => {
        localStorage.setItem('ai_config', JSON.stringify(config));
        showToast('تنظیمات ذخیره شد', 'success');
        setShowConfig(false);
    };

    const handleProviderChange = (p: 'openai' | 'anthropic' | 'custom') => {
        setProvider(p);
        if (p !== 'custom') {
            setConfig(prev => ({
                ...prev,
                endpoint: DEFAULT_CONFIGS[p].endpoint!,
                model: DEFAULT_CONFIGS[p].model!
            }));
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || !config.apiKey) {
            showToast('پیام یا API Key خالی است', 'warning');
            return;
        }

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Build request based on provider
            let response: Response;

            if (provider === 'anthropic') {
                response = await fetch(config.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': config.apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: config.model,
                        max_tokens: 2000,
                        system: SYSTEM_PROMPT,
                        messages: [...messages, userMessage].map(m => ({
                            role: m.role === 'system' ? 'user' : m.role,
                            content: m.content
                        }))
                    })
                });
            } else {
                // OpenAI compatible
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
                        temperature: 0.7,
                        max_tokens: 2000
                    })
                });
            }

            if (!response.ok) {
                throw new Error(`خطا: ${response.status}`);
            }

            const data = await response.json();
            let assistantContent: string;

            if (provider === 'anthropic') {
                assistantContent = data.content[0].text;
            } else {
                assistantContent = data.choices[0]?.message?.content;
            }

            // Try to parse action from response
            try {
                const jsonMatch = assistantContent.match(/\{[\s\S]*"action"[\s\S]*\}/);
                if (jsonMatch) {
                    const action: ParsedAction = JSON.parse(jsonMatch[0]);
                    setPendingActions(action);
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: action.message || `${action.tasks?.length || 0} تسک آماده اضافه کردن است. تأیید می‌کنید؟`
                    }]);
                } else {
                    setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
                }
            } catch {
                setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
            }

        } catch (error: any) {
            console.error('AI Error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: `خطا: ${error.message}` }]);
        }

        setIsLoading(false);
    };

    const applyPendingActions = () => {
        if (!pendingActions?.tasks) return;

        pendingActions.tasks.forEach(task => {
            addTask({
                id: crypto.randomUUID(),
                title: task.title || `تست ${task.subject}`,
                subject: task.subject || Subject.Custom,
                topic: task.topic || '',
                details: task.details || '',
                testRange: task.testRange || '',
                date: task.date,
                isCompleted: false,
                isCustom: true,
                tags: []
            });
        });

        showToast(`${pendingActions.tasks.length} تسک اضافه شد`, 'success');
        setPendingActions(null);
        setMessages(prev => [...prev, { role: 'assistant', content: '✅ تسک‌ها با موفقیت اضافه شدند!' }]);
    };

    const clearChat = () => {
        setMessages([]);
        setPendingActions(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                    <div className="flex items-center gap-3">
                        <Bot size={24} />
                        <div>
                            <h2 className="text-lg font-bold">دستیار هوشمند</h2>
                            <p className="text-xs opacity-80">ساخت سریع تسک با دستور زبانی</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowConfig(!showConfig)} className="p-2 hover:bg-white/20 rounded-xl transition">
                            <Settings2 size={18} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Config Panel */}
                {showConfig && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 space-y-3 animate-in slide-in-from-top-2">
                        <div className="flex gap-2">
                            {(['openai', 'anthropic', 'custom'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => handleProviderChange(p)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${provider === p
                                            ? 'bg-violet-600 text-white'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                        }`}
                                >
                                    {p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic' : 'Custom'}
                                </button>
                            ))}
                        </div>

                        <input
                            type="password"
                            value={config.apiKey}
                            onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                            placeholder="API Key"
                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-violet-500"
                        />

                        {provider === 'custom' && (
                            <>
                                <input
                                    type="text"
                                    value={config.endpoint}
                                    onChange={e => setConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                                    placeholder="Endpoint URL"
                                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-violet-500"
                                />
                                <input
                                    type="text"
                                    value={config.model}
                                    onChange={e => setConfig(prev => ({ ...prev, model: e.target.value }))}
                                    placeholder="Model name"
                                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-violet-500"
                                />
                            </>
                        )}

                        <button onClick={saveConfig} className="w-full bg-violet-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-violet-700 transition">
                            ذخیره تنظیمات
                        </button>
                    </div>
                )}

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                        <div className="text-center py-8">
                            <Sparkles className="mx-auto text-violet-400 mb-3" size={32} />
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">دستورات نمونه:</p>
                            <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                                <p className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">"از تست ۱۵۰۰ تا ۱۶۶۰ فیزیک، روزی ۴۰ تا"</p>
                                <p className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">"۵ تسک شیمی آلی برای این هفته"</p>
                                <p className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">"تست ریاضی از ۱ تا ۲۰۰ برای ۵ روز آینده"</p>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                        >
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                    ? 'bg-violet-600 text-white rounded-br-none'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-end">
                            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-2xl rounded-bl-none">
                                <Loader2 className="animate-spin text-violet-500" size={20} />
                            </div>
                        </div>
                    )}

                    {/* Pending Actions */}
                    {pendingActions?.tasks && pendingActions.tasks.length > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-3">
                            <p className="text-xs font-bold text-green-700 dark:text-green-300 mb-2">
                                {pendingActions.tasks.length} تسک آماده اضافه کردن:
                            </p>
                            <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
                                {pendingActions.tasks.slice(0, 5).map((t, i) => (
                                    <div key={i} className="text-xs bg-white dark:bg-gray-800 p-1.5 rounded-lg">
                                        {t.title} - {t.date}
                                    </div>
                                ))}
                                {pendingActions.tasks.length > 5 && (
                                    <p className="text-[10px] text-gray-400">و {pendingActions.tasks.length - 5} تسک دیگر...</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={applyPendingActions}
                                    className="flex-1 bg-green-600 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                                >
                                    <Check size={14} /> تأیید و اضافه کن
                                </button>
                                <button
                                    onClick={() => setPendingActions(null)}
                                    className="px-4 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-2 rounded-xl text-xs font-bold"
                                >
                                    لغو
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                    {!config.apiKey && (
                        <div className="mb-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-2 flex items-center gap-2">
                            <AlertCircle size={14} className="text-amber-500" />
                            <span className="text-xs text-amber-700 dark:text-amber-300">ابتدا API Key را در تنظیمات وارد کنید</span>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button onClick={clearChat} className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                            <Trash2 size={18} />
                        </button>
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            placeholder="دستور خود را بنویسید..."
                            className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500"
                            disabled={isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                            className="p-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AISettings;
