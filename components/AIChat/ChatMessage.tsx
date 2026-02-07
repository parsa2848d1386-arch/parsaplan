import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Copy, Volume2, RotateCcw, Check, ListChecks, ChevronLeft, AlertTriangle } from 'lucide-react';
import { ParsedTask } from '../AITaskReviewWindow';

export interface MessageProps {
    message: {
        id: string;
        text: string;
        sender: 'user' | 'ai';
        timestamp: Date;
        isError?: boolean;
        pendingTasks?: ParsedTask[];
    };
    onRetry?: (text: string) => void;
    onReviewTasks?: (tasks: ParsedTask[]) => void;
}

export const ChatMessage: React.FC<MessageProps> = ({ message, onRetry, onReviewTasks }) => {
    const isUser = message.sender === 'user';
    const [copied, setCopied] = useState(false);
    const [speaking, setSpeaking] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(message.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSpeak = () => {
        if (speaking) {
            window.speechSynthesis.cancel();
            setSpeaking(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(message.text);
        utterance.lang = 'fa-IR'; // Attempt Persian
        utterance.rate = 1.0;
        utterance.onend = () => setSpeaking(false);
        setSpeaking(true);
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className={`flex flex-col space-y-2 ${isUser ? 'items-end' : 'items-start'} group mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`flex gap-3 max-w-[95%] md:max-w-[85%] lg:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-md transform transition-transform hover:scale-105 ${isUser ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-white dark:bg-gray-800 text-indigo-600 border border-indigo-100 dark:border-indigo-900'}`}>
                    {isUser ? <User size={20} /> : <Bot size={22} />}
                </div>

                {/* Bubble */}
                <div className={`relative flex flex-col min-w-[120px]`}>
                    <div className={`
                        p-4 md:p-5 rounded-3xl text-sm md:text-base leading-7 shadow-sm transition-all
                        ${isUser
                            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm'
                            : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-800 rounded-tl-sm hover:shadow-md'
                        }
                        ${message.isError ? 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50' : ''}
                    `}>
                        {/* Markdown Content */}
                        {!isUser ? (
                            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none dir-rtl break-words">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        // Custom styling for markdown elements
                                        h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-2 mt-4 text-indigo-700 dark:text-indigo-400" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-2 mt-3 text-indigo-600 dark:text-indigo-500" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-md font-bold mb-1 mt-2" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc list-outside mr-4 space-y-1 mb-2" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal list-outside mr-4 space-y-1 mb-2" {...props} />,
                                        blockquote: ({ node, ...props }) => <blockquote className="border-r-4 border-indigo-300 pr-4 py-1 my-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-l-lg italic text-gray-600 dark:text-gray-400" {...props} />,
                                        code: ({ node, inline, className, children, ...props }: any) => {
                                            const match = /language-(\w+)/.exec(className || '');
                                            return !inline ? (
                                                <div className="relative group/code my-3">
                                                    <pre className="bg-gray-800 text-gray-100 p-3 rounded-xl overflow-x-auto text-xs md:text-sm font-mono" {...props}>
                                                        <code>{children}</code>
                                                    </pre>
                                                </div>
                                            ) : (
                                                <code className="bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-mono text-xs font-bold" {...props}>
                                                    {children}
                                                </code>
                                            )
                                        }
                                    }}
                                >
                                    {message.text}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <div className="whitespace-pre-wrap">{message.text}</div>
                        )}

                        {/* Error Retry */}
                        {message.isError && onRetry && (
                            <button
                                onClick={() => onRetry(message.text)}
                                className="flex items-center gap-2 mt-3 text-xs font-bold bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-lg hover:bg-white/80 transition-colors w-fit"
                            >
                                <RotateCcw size={14} /> تلاش مجدد
                            </button>
                        )}

                        {/* Timestamp */}
                        <div className={`text-[10px] mt-2 opacity-60 flex justify-end font-mono ${isUser ? 'text-indigo-100' : 'text-gray-400'}`}>
                            {new Date(message.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>

                    {/* AI Actions */}
                    {!isUser && !message.isError && (
                        <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-1">
                            <button onClick={handleCopy} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition" title="کپی متن">
                                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                            <button onClick={handleSpeak} className={`p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition ${speaking ? 'text-indigo-600 bg-indigo-50 animate-pulse' : ''}`} title="خواندن متن">
                                <Volume2 size={14} />
                            </button>
                            {onRetry && (
                                <button onClick={() => onRetry(message.text)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition" title="پاسخ مجدد">
                                    <RotateCcw size={14} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Pending Tasks Review Card */}
            {!isUser && message.pendingTasks && message.pendingTasks.length > 0 && onReviewTasks && (
                <div className="w-full max-w-[85%] lg:max-w-[75%] mr-auto pr-[52px]">
                    <button
                        onClick={() => onReviewTasks(message.pendingTasks!)}
                        className="w-full md:w-auto flex items-center justify-between gap-4 p-4 bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/20 dark:to-gray-900 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group/task"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white dark:bg-gray-800 p-2 rounded-xl text-indigo-600 shadow-sm group-hover/task:scale-110 transition-transform">
                                <ListChecks size={20} />
                            </div>
                            <div className="text-right">
                                <span className="block text-sm font-bold text-gray-800 dark:text-gray-200">پیشنهاد {message.pendingTasks.length} تسک جدید</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 group-hover/task:text-indigo-500 transition-colors">برای بررسی و افزودن کلیک کنید</span>
                            </div>
                        </div>
                        <ChevronLeft size={18} className="text-gray-400 group-hover/task:-translate-x-1 transition-transform" />
                    </button>
                </div>
            )}
        </div>
    );
};
