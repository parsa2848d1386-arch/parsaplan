
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ChevronLeft, Settings as SettingsIcon, Plus, Check, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SubjectTask, Subject } from '../types';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    isError?: boolean;
    proposedTasks?: SubjectTask[]; // If the message contains task proposals
}

const AIChat: React.FC = () => {
    const navigate = useNavigate();
    const { settings, subjects, addTask, updateSettings } = useStore();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'سلام! من دستیار هوشمند شما هستم. می‌تونم در برنامه‌ریزی، تحلیل آزمون یا ساخت روتین جدید بهت کمک کنم.',
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const saveApiKey = () => {
        localStorage.setItem('gemini_api_key', apiKey);
        setShowSettings(false);
    };

    const generateSystemPrompt = () => {
        const subjectNames = subjects.map(s => s.name).join(', ');
        return `
You are an expert study assistant for a student preparing for Concours (Konkur) in Iran.
Current Subjects: ${subjectNames}.
The user speaks Persian (Farsi). Respond in Persian.
If the user asks to create a generic plan, ask for specific goals or deadline first.
IMPORTANT: If the user asks to ADD tasks or Create a Plan, you MUST respond with a JSON array of tasks at the END of your message.
The JSON format for tasks must be an array of objects: 
[
  { "subject": "Math", "topic": "Derivatives", "details": "Solve 20 tests", "duration": 90 }
]
Wrap the JSON in \`\`\`json \`\`\` code block.
Do not include IDs or Dates in the JSON, the system will handle them.
        `;
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        if (!apiKey) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: 'لطفاً ابتدا کلید API را در تنظیمات وارد کنید.',
                sender: 'ai',
                timestamp: new Date(),
                isError: true
            }]);
            setShowSettings(true);
            return;
        }

        const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user', timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            const chat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: generateSystemPrompt() }] },
                    { role: "model", parts: [{ text: "باشه، من آماده‌ام. چطور می‌تونم کمک کنم؟" }] }
                ],
            });

            const result = await chat.sendMessage(input);
            const response = result.response;
            const text = response.text();

            // Check for JSON tasks
            let proposedTasks: SubjectTask[] | undefined;
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);

            if (jsonMatch && jsonMatch[1]) {
                try {
                    const rawTasks = JSON.parse(jsonMatch[1]);
                    proposedTasks = rawTasks.map((t: any) => ({
                        id: crypto.randomUUID(),
                        divId: 0, // Invalid initially
                        date: new Date().toISOString(), // Default to today
                        subject: t.subject,
                        topic: t.topic,
                        details: t.details || '',
                        isCompleted: false,
                        isCustom: true,
                        tags: ['AI Generated']
                    }));
                } catch (e) {
                    console.error("Failed to parse AI JSON tasks", e);
                }
            }

            // Remove JSON from text display to keep it clean (optional, keeping it for transparency usually better but user wants clean)
            // let displayKey = text.replace(/```json[\s\S]*?```/, '').trim(); 
            // Keeping full text for now so user sees context.

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: text,
                sender: 'ai',
                timestamp: new Date(),
                proposedTasks
            }]);

        } catch (error: any) {
            console.error("Gemini API Error:", error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: 'متاسفانه خطایی در ارتباط با هوش مصنوعی رخ داد. لطفاً اتصال اینترنت یا کلید API را بررسی کنید.',
                sender: 'ai',
                timestamp: new Date(),
                isError: true
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleAcceptTask = (task: SubjectTask) => {
        addTask(task);
        // Visual feedback handled by addTask toast
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-50 dark:bg-gray-950 relative">
            {/* Header */}
            <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-800 dark:text-white">دستیار هوشمند</h1>
                        <p className="text-xs text-green-500 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            Gemini Pro
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition text-gray-500"
                    >
                        <SettingsIcon size={20} />
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition text-gray-500"
                    >
                        <ChevronLeft size={24} />
                    </button>
                </div>
            </div>

            {/* API Key Modal/Overlay */}
            {showSettings && (
                <div className="absolute top-20 right-4 left-4 z-30 animate-in fade-in slide-in-from-top-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
                        <h3 className="font-bold text-sm mb-2 text-gray-800 dark:text-gray-200">تنظیمات هوش مصنوعی</h3>
                        <p className="text-xs text-gray-500 mb-3">برای استفاده، کلید API جمنای (Google Gemini) را وارد کنید.</p>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="کلید API خود را اینجا وارد کنید..."
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm mb-3 outline-none focus:border-indigo-500"
                        />
                        <div className="flex gap-2">
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="flex-1 p-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-center text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700">
                                دریافت کلید رایگان
                            </a>
                            <button onClick={saveApiKey} className="flex-1 bg-indigo-600 text-white p-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700">
                                ذخیره
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-24">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex flex-col space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                        <div className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.sender === 'user'
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                }`}>
                                {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`p-4 rounded-2xl text-sm leading-7 whitespace-pre-wrap ${msg.sender === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-500/20'
                                : msg.isError
                                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800'
                                    : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800 rounded-tl-none shadow-sm'
                                }`}>
                                {msg.text}
                            </div>
                        </div>

                        {/* Task Proposals */}
                        {msg.proposedTasks && msg.proposedTasks.length > 0 && (
                            <div className="w-full max-w-sm mr-11 space-y-2">
                                <div className="text-xs font-bold text-gray-500 px-1">تسک‌های پیشنهادی (برای افزودن کلیک کنید):</div>
                                {msg.proposedTasks.map((task, idx) => (
                                    <div key={idx} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center group hover:border-indigo-500 transition-colors">
                                        <div>
                                            <div className="font-bold text-sm text-gray-800 dark:text-gray-200">{task.subject}</div>
                                            <div className="text-xs text-gray-500">{task.topic}</div>
                                        </div>
                                        <button
                                            onClick={() => handleAcceptTask(task)}
                                            className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                                            title="Add to Plan"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {isTyping && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Bot size={16} />
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-1.5 w-16 justify-center h-12">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 sticky bottom-0 z-20 pb-8 sm:pb-4">
                <div className="flex gap-2 items-end bg-gray-50 dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-800 focus-within:border-indigo-500 dark:focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all shadow-sm">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="درخواست خود را بنویسید (مثلاً: یک برنامه برای زیست بساز)..."
                        className="flex-1 bg-transparent border-none focus:ring-0 p-3 max-h-32 min-h-[50px] resize-none text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 text-sm custom-scrollbar"
                        rows={1}
                        dir="rtl"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-indigo-500/30 dark:shadow-none hover:scale-105 active:scale-95 mb-0.5"
                    >
                        {isTyping ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className={input.trim() ? '' : 'opacity-50'} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIChat;
