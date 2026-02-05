
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

const AIChat: React.FC = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'سلام! من دستیار هوشمند شما هستم. چطور می‌تونم در برنامه‌ریزی بهتون کمک کنم؟',
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;

        const newUserMessage: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInput('');
        setIsTyping(true);

        // Simulate AI response for now
        setTimeout(() => {
            const newAiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: 'من در حال حاضر در حال توسعه هستم، اما به زودی می‌توانم تسک‌های شما را تحلیل کنم و برنامه دقیقی برایتان بسازم!',
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, newAiMessage]);
            setIsTyping(false);
        }, 1500);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-50 dark:bg-gray-950">
            {/* Header */}
            <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-800 dark:text-white">دستیار هوشمند</h1>
                        <p className="text-xs text-green-500 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            آنلاین
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition text-gray-500"
                >
                    <ChevronLeft size={24} />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex gap-2 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.sender === 'user'
                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                    : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                }`}>
                                {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`p-3.5 rounded-2xl text-sm leading-relaxed ${msg.sender === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-500/20'
                                    : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800 rounded-tl-none shadow-sm'
                                }`}>
                                {msg.text}
                                <div className={`text-[10px] mt-1 opacity-70 ${msg.sender === 'user' ? 'text-indigo-100' : 'text-gray-400'}`}>
                                    {msg.timestamp.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex w-full mt-2 space-x-3 max-w-xs">
                        <div className="flex gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <Bot size={16} />
                            </div>
                            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 sticky bottom-0 z-10 pb-8 sm:pb-4">
                <div className="flex gap-2 items-end bg-gray-50 dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-800 focus-within:border-indigo-500 dark:focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all shadow-sm">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="پیام خود را بنویسید..."
                        className="flex-1 bg-transparent border-none focus:ring-0 p-3 max-h-32 min-h-[50px] resize-none text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 text-sm custom-scrollbar"
                        rows={1}
                        dir="rtl"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-indigo-500/30 dark:shadow-none hover:scale-105 active:scale-95 mb-0.5"
                    >
                        <Send size={20} className={input.trim() ? '' : 'opacity-50'} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIChat;
