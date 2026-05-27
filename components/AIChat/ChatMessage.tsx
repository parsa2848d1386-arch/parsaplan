import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Copy, Volume2, RotateCcw, Check, ListChecks, ChevronLeft, Download, FileText, Image as ImageIcon, PlayCircle, ChevronDown, Eye } from 'lucide-react';
import { ParsedTask } from '../AITaskReviewWindow';

export interface MessageProps {
    message: {
        id: string;
        text: string;
        sender: 'user' | 'ai';
        timestamp: Date;
        isError?: boolean;
        pendingTasks?: ParsedTask[];
        attachments?: { type: 'image' | 'video' | 'file'; url: string; name: string }[];
    };
    onRetry?: (text: string) => void;
    onReviewTasks?: (tasks: ParsedTask[]) => void;
}

export const ChatMessage: React.FC<MessageProps> = ({ message, onRetry, onReviewTasks }) => {
    const isUser = message.sender === 'user';
    const [copied, setCopied] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [showTasks, setShowTasks] = useState(true);

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
        <div className={`flex flex-col space-y-2.5 ${isUser ? 'items-start' : 'items-end'} group mb-6 animate-in fade-in slide-in-from-bottom-3 duration-400`}>
            {/* Note: In RTL, items-start is Right, items-end is Left. 
               We want User on Right, AI on Left.
               So User -> items-start. AI -> items-end. 
            */}

            <div className={`flex gap-3 max-w-[88%] md:max-w-[78%] lg:max-w-[65%] ${isUser ? 'flex-row' : 'flex-row-reverse'}`}>

                {/* Avatar */}
                <div className={`w-8.5 h-8.5 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md transform transition-transform hover:scale-110 btn-micro-interactive ${
                    isUser 
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-200 dark:shadow-indigo-950/50' 
                        : 'bg-white/80 dark:bg-gray-800/80 text-indigo-500 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-md'
                }`}>
                    {isUser ? <User size={15} strokeWidth={2.5} /> : <Bot size={17} strokeWidth={2.5} />}
                </div>

                {/* Bubble */}
                <div className={`relative flex flex-col min-w-[100px] ${isUser ? 'items-start' : 'items-end'}`}>
                    <div className={`
                        px-4 py-3 md:px-5 md:py-3.5 rounded-[1.3rem] text-[13px] md:text-[14px] leading-6 shadow-sm transition-all duration-300 relative
                        ${isUser
                            ? 'bubble-user-premium rounded-tr-sm'
                            : 'bubble-ai-premium rounded-tl-sm hover:shadow-md border border-gray-200/40 dark:border-gray-800/40'
                        }
                        ${message.isError ? 'bg-rose-50/80 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/50' : ''}
                    `}>

                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {message.attachments.map((file, idx) => (
                                    <div key={idx} className="relative group/file overflow-hidden rounded-lg border border-white/20 dark:border-gray-700">
                                        {file.type === 'image' ? (
                                            <img src={file.url} alt={file.name} className="max-w-[200px] max-h-[150px] object-cover" />
                                        ) : file.type === 'video' ? (
                                            <div className="relative max-w-[200px]">
                                                <video src={file.url} className="max-w-full max-h-[150px] object-cover bg-black" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30"><PlayCircle className="text-white" /></div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 p-3 bg-white/10 backdrop-blur-sm min-w-[150px]">
                                                <FileText size={20} />
                                                <span className="text-xs truncate max-w-[100px]">{file.name}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

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

            {/* Pending Tasks Review Card - Animated Inline Preview */}
            {!isUser && message.pendingTasks && message.pendingTasks.length > 0 && onReviewTasks && (
                <div className="w-full max-w-[85%] lg:max-w-[75%] lg:mr-auto lg:ml-0 mr-auto pr-11 animate-in fade-in slide-in-from-top-4 duration-500 ease-out fill-mode-backwards" style={{ animationDelay: '200ms' }}>
                    <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50 rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl hover:border-indigo-300/40 dark:hover:border-indigo-800/40 glass-premium">
                        {/* Header */}
                        <div
                            onClick={() => setShowTasks(!showTasks)}
                            className="bg-gradient-to-r from-indigo-500/5 to-transparent dark:from-indigo-500/10 p-3.5 flex items-center justify-between cursor-pointer border-b border-gray-100/50 dark:border-gray-800/50 select-none"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-8.5 h-8.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/30 dark:border-indigo-900/30 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                                    <ListChecks size={18} strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-xs md:text-sm font-extrabold text-gray-800 dark:text-gray-200">
                                        پیشنهاد {message.pendingTasks.length} تسک جدید
                                    </span>
                                    {showTasks ? (
                                        <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-extrabold">برای بستن کلیک کنید</span>
                                    ) : (
                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold">برای مشاهده کلیک کنید</span>
                                    )}
                                </div>
                            </div>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${showTasks ? 'rotate-180' : ''}`} />
                        </div>

                        {/* Inline Content */}
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showTasks ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-4 bg-gray-50/20 dark:bg-black/10">
                                <div className="space-y-2 mb-4">
                                    {message.pendingTasks.slice(0, 3).map((task, i) => (
                                        <div key={i} className="flex items-center gap-2.5 p-2.5 bg-white/85 dark:bg-gray-800/85 backdrop-blur-sm rounded-xl border border-gray-200/40 dark:border-gray-700/40 shadow-sm text-xs transition-all hover:translate-x-[-2px]">
                                            <div className={`w-1.5 h-8 rounded-full ${i % 2 === 0 ? 'bg-indigo-500' : 'bg-purple-500'} shadow-sm`}></div>
                                            <div className="flex-1 min-w-0 text-right">
                                                <div className="font-extrabold text-gray-700 dark:text-gray-300 truncate">{task.subject}</div>
                                                <div className="text-gray-400 dark:text-gray-500 truncate text-[10px] font-bold mt-0.5">{task.topic}</div>
                                            </div>
                                            <div className="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100/20 dark:border-indigo-900/20 px-2 py-1 rounded-lg text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold font-mono dir-rtl">
                                                {new Date(task.date).toLocaleDateString('fa-IR-u-ca-persian', { month: 'long', day: 'numeric' })}
                                            </div>
                                        </div>
                                    ))}
                                    {message.pendingTasks.length > 3 && (
                                        <div className="text-center text-[10px] text-gray-400 dark:text-gray-500 font-extrabold pt-1">
                                            و {message.pendingTasks.length - 3} مورد دیگر...
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => onReviewTasks(message.pendingTasks!)}
                                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 btn-micro-interactive"
                                >
                                    <Eye size={14} strokeWidth={2.5} />
                                    بررسی کامل و افزودن
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
