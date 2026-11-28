import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import ReactMarkdown, { type Components, type ExtraProps } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export function sanitizeMarkdownUrl(url: string): string {
    const trimmed = (url || '').trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
    try {
        const parsed = new URL(trimmed, 'https://parsaplan.local');
        if (SAFE_URL_PROTOCOLS.has(parsed.protocol)) {
            return trimmed;
        }
    } catch {
        return '';
    }
    return '';
}

type MarkdownCodeProps = React.ComponentPropsWithoutRef<'code'> &
    ExtraProps & {
        inline?: boolean;
    };
import { User, Copy, Volume2, RotateCcw, Check, ListChecks, FileText, Image as ImageIcon, PlayCircle, ChevronDown, Eye, Clock, Tag } from 'lucide-react';
import { ParsedTask } from '../AITaskReviewWindow';
import { BlobatarBot } from '../ui/BlobatarBot';
import type { BlobatarConfig } from '../../types';
import { formatToPersianDigits } from '../../utils';
import { ANTICIPATION_MESSAGE_VARIANTS, TRANSITION_FAST } from '../../utils/motionPresets';

export interface MessageProps {
    message: {
        id: string;
        text: string;
        sender: 'user' | 'ai';
        timestamp: Date | string;
        isError?: boolean;
        retryText?: string;
        pendingTasks?: ParsedTask[];
        attachments?: { type: 'image' | 'video' | 'file'; url?: string; name: string }[];
    };
    onRetry?: (text: string) => void;
    onRegenerate?: (messageId: string) => void;
    onReviewTasks?: (tasks: ParsedTask[]) => void;
    onAutoAddTasks?: (tasks: ParsedTask[], messageId: string) => void;
    tasksApplied?: boolean;
    botSeed?: string;
    botConfig?: BlobatarConfig;
    userLevel?: number;
}

export const ChatMessage: React.FC<MessageProps> = ({
    message,
    onRetry,
    onRegenerate,
    onReviewTasks,
    onAutoAddTasks,
    tasksApplied,
    botSeed = 'Parsashz',
    botConfig,
    userLevel = 1,
}) => {
    const isUser = message.sender === 'user';
    const prefersReducedMotion = useReducedMotion();
    const [copied, setCopied] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [showTasks, setShowTasks] = useState(true);

    const handleCopy = () => {
        navigator.clipboard?.writeText(message.text);
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
        utterance.lang = 'fa-IR';
        utterance.rate = 1.0;
        utterance.onend = () => setSpeaking(false);
        setSpeaking(true);
        window.speechSynthesis.speak(utterance);
    };

    return (
        <motion.div
            variants={isUser ? ANTICIPATION_MESSAGE_VARIANTS : undefined}
            initial={isUser && !prefersReducedMotion ? 'hidden' : false}
            animate={isUser ? 'visible' : undefined}
            className={`flex flex-col space-y-2 ${isUser ? 'items-start' : 'items-end'} group mb-5`}
        >
            <div className={`flex gap-2.5 max-w-[90%] md:max-w-[78%] lg:max-w-[68%] ${isUser ? 'flex-row' : 'flex-row-reverse'}`}>
                {/* Avatar */}
                <div
                    className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${
                        isUser
                            ? 'bg-primary text-on-primary'
                            : 'bg-[var(--surface-elevated)] border border-[var(--border-subtle)]'
                    }`}
                >
                    {isUser ? (
                        <User size={15} strokeWidth={2.2} />
                    ) : (
                        <BlobatarBot seed={botSeed} config={botConfig} level={userLevel} size="xs" />
                    )}
                </div>

                {/* Bubble (Opaque Semantic Surface — Zero Content-Layer Blur) */}
                <div className={`relative flex flex-col min-w-[100px] ${isUser ? 'items-start' : 'items-end'}`}>
                    <div
                        className={`px-4 py-3 md:px-5 md:py-3.5 rounded-[20px] text-[14px] leading-6 relative ${
                            message.isError
                                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 rounded-tl-md'
                                : isUser
                                  ? 'bg-primary text-on-primary rounded-tr-md shadow-xs'
                                  : 'bg-[var(--surface-elevated)] text-on-surface border border-[var(--border-subtle)] rounded-tl-md shadow-xs'
                        }`}
                    >
                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {message.attachments.map((file, idx) => (
                                    <div key={idx} className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)]">
                                        {file.type === 'image' && file.url ? (
                                            <img src={file.url} alt={file.name} className="max-w-[200px] max-h-[150px] object-cover" />
                                        ) : file.type === 'video' && file.url ? (
                                            <div className="relative max-w-[200px]">
                                                <video src={file.url} className="max-w-full max-h-[150px] object-cover bg-black" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                    <PlayCircle className="text-white" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 p-2.5 bg-surface-container-low text-on-surface min-w-[140px]">
                                                {file.type === 'image' ? <ImageIcon size={17} /> : <FileText size={17} />}
                                                <span className="text-xs truncate max-w-[130px]" title={file.name}>
                                                    {file.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Markdown Content */}
                        {!isUser ? (
                            <div dir="rtl" className="max-w-none break-words text-start space-y-2">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    urlTransform={sanitizeMarkdownUrl}
                                    components={{
                                        h1: ({ node: _n, ...props }) => <h1 className="text-lg font-extrabold mb-2 mt-3 text-primary" {...props} />,
                                        h2: ({ node: _n, ...props }) => <h2 className="text-base font-extrabold mb-1.5 mt-3 text-on-surface" {...props} />,
                                        h3: ({ node: _n, ...props }) => <h3 className="text-sm font-bold mb-1 mt-2 text-on-surface" {...props} />,
                                        p: ({ node: _n, ...props }) => <p className="leading-7 text-on-surface" {...props} />,
                                        a: ({ node: _n, href, ...props }) => (
                                            <a
                                                href={href ? sanitizeMarkdownUrl(href) || undefined : undefined}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary underline hover:opacity-80"
                                                {...props}
                                            />
                                        ),
                                        ul: ({ node: _n, ...props }) => <ul className="list-disc list-outside ms-4 space-y-1 mb-2" {...props} />,
                                        ol: ({ node: _n, ...props }) => <ol className="list-decimal list-outside ms-4 space-y-1 mb-2" {...props} />,
                                        blockquote: ({ node: _n, ...props }) => (
                                            <blockquote
                                                className="border-s-2 border-primary/50 ps-3.5 py-2 my-2 bg-surface-container-low rounded-e-xl not-italic text-[var(--text-secondary)]"
                                                {...props}
                                            />
                                        ),
                                        code: ({ node: _n, inline, className: _cls, children, ...props }: MarkdownCodeProps) => {
                                            return !inline ? (
                                                <div className="relative my-2.5">
                                                    <pre
                                                        dir="ltr"
                                                        className="bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto text-xs font-mono text-left"
                                                    >
                                                        <code>{children}</code>
                                                    </pre>
                                                </div>
                                            ) : (
                                                <code
                                                    className="bg-surface-container text-primary px-1.5 py-0.5 rounded-md font-mono text-xs font-bold"
                                                    {...props}
                                                >
                                                    {children}
                                                </code>
                                            );
                                        },
                                    } satisfies Components}
                                >
                                    {message.text}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <div className="whitespace-pre-wrap leading-7">{message.text}</div>
                        )}

                        {/* Error Retry */}
                        {message.isError && onRetry && (
                            <button
                                type="button"
                                onClick={() => onRetry(message.retryText || message.text)}
                                className="min-h-[36px] flex items-center gap-1.5 mt-3 text-xs font-bold bg-[var(--surface-elevated)] text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-3 py-1.5 rounded-xl hover:opacity-90 transition cursor-pointer w-fit"
                            >
                                <RotateCcw size={14} />
                                تلاش مجدد
                            </button>
                        )}

                        {/* Timestamp */}
                        <div
                            className={`text-[11px] mt-1.5 flex justify-end font-mono tabular-nums ${
                                isUser ? 'text-on-primary/75' : 'text-[var(--text-secondary)]'
                            }`}
                        >
                            {new Date(message.timestamp).toLocaleTimeString('fa-IR', {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </div>
                    </div>

                    {/* Actions (High-Contrast Outside Bubble + Touch-Sized + Secondary Action Confirmation) */}
                    {isUser ? (
                        <div className={`flex items-center gap-1.5 mt-1 transition-opacity duration-200 px-0.5 select-none ${copied ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}>
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-primary hover:bg-surface-container rounded-xl transition cursor-pointer"
                                title="کپی پیام"
                                aria-label="کپی پیام"
                            >
                                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                            <AnimatePresence>
                                {copied && (
                                    <motion.span
                                        initial={prefersReducedMotion ? false : { opacity: 0, y: 4, scale: 0.92 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -2, scale: 0.95 }}
                                        transition={TRANSITION_FAST}
                                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg"
                                    >
                                        در کلیپ‌بورد کپی شد
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        !message.isError && (
                            <div className={`flex items-center gap-1.5 mt-1 transition-opacity duration-200 px-0.5 select-none ${copied ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}>
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-primary hover:bg-surface-container rounded-xl transition cursor-pointer"
                                    title="کپی پیام"
                                    aria-label="کپی پیام"
                                >
                                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSpeak}
                                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition cursor-pointer ${
                                        speaking
                                            ? 'text-primary bg-primary/10'
                                            : 'text-[var(--text-secondary)] hover:text-primary hover:bg-surface-container'
                                    }`}
                                    title="خواندن صوتی"
                                    aria-label="خواندن صوتی"
                                >
                                    <Volume2 size={14} />
                                </button>
                                {onRegenerate && (
                                    <button
                                        type="button"
                                        onClick={() => onRegenerate(message.id)}
                                        className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-primary hover:bg-surface-container rounded-xl transition cursor-pointer"
                                        title="بازتولید پاسخ"
                                        aria-label="بازتولید پاسخ"
                                    >
                                        <RotateCcw size={14} />
                                    </button>
                                )}
                                <AnimatePresence>
                                    {copied && (
                                        <motion.span
                                            initial={prefersReducedMotion ? false : { opacity: 0, y: 4, scale: 0.92 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -2, scale: 0.95 }}
                                            transition={TRANSITION_FAST}
                                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg"
                                        >
                                            در کلیپ‌بورد کپی شد
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Pending Tasks Review Card — Opaque Semantic Card */}
            {!isUser && message.pendingTasks && message.pendingTasks.length > 0 && onReviewTasks && (
                <div className="w-full max-w-[92%] md:max-w-[78%] me-auto ps-0 sm:ps-10">
                    <div className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-[22px] shadow-xs overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowTasks(!showTasks)}
                            aria-expanded={showTasks}
                            className="w-full bg-surface-container-low px-4 py-3 flex items-center justify-between cursor-pointer border-b border-[var(--border-subtle)] select-none text-start"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <ListChecks size={18} strokeWidth={2.2} />
                                </div>
                                <div className="flex flex-col text-start">
                                    <span className="text-xs sm:text-sm font-extrabold text-on-surface">
                                        پیشنهاد {formatToPersianDigits(message.pendingTasks.length)} تسک جدید
                                    </span>
                                    <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                                        {showTasks ? 'برای بستن ضربه بزنید' : 'برای مشاهده ضربه بزنید'}
                                    </span>
                                </div>
                            </div>
                            <ChevronDown
                                size={16}
                                className={`text-[var(--text-secondary)] transition-transform duration-200 ${showTasks ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {showTasks && (
                            <div className="p-4">
                                <div className="space-y-2 mb-4 max-h-72 overflow-y-auto custom-scrollbar pe-0.5">
                                    {message.pendingTasks.map((task, i) => (
                                        <div
                                            key={task.id || i}
                                            className="flex flex-col gap-1.5 p-2.5 bg-surface-container-low rounded-xl border border-[var(--border-subtle)] text-xs"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-start gap-2 min-w-0 flex-1">
                                                    <div className="w-1 self-stretch min-h-[28px] rounded-full bg-primary shrink-0" aria-hidden="true" />
                                                    <div className="min-w-0 flex-1 text-start">
                                                        <div className="font-extrabold text-on-surface truncate">
                                                            {task.subject}
                                                            {task.topic ? ` — ${task.topic}` : ''}
                                                        </div>
                                                        <div className="text-[var(--text-secondary)] text-[11px] font-medium mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
                                                            {task.startTime && (
                                                                <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-bold" dir="ltr">
                                                                    <Clock size={10} />
                                                                    {task.startTime}
                                                                </span>
                                                            )}
                                                            {task.durationMinutes && (
                                                                <span>{formatToPersianDigits(task.durationMinutes)} دقیقه</span>
                                                            )}
                                                            {task.testRange && (
                                                                <span className="text-violet-600 dark:text-violet-300 font-bold">
                                                                    تست {task.testRange}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    dir="rtl"
                                                    className="bg-primary/10 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] text-primary font-bold shrink-0 tabular-nums"
                                                >
                                                    {new Date(task.date).toLocaleDateString('fa-IR-u-ca-persian', {
                                                        weekday: 'short',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </div>
                                            </div>
                                            {task.tags && task.tags.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1 ps-3">
                                                    {task.tags.map((tg) => (
                                                        <span
                                                            key={tg}
                                                            className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-primary/8 text-primary border border-primary/15 font-bold"
                                                        >
                                                            <Tag size={9} />
                                                            {tg}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2">
                                    {onAutoAddTasks && !tasksApplied && (
                                        <button
                                            type="button"
                                            onClick={() => onAutoAddTasks(message.pendingTasks!, message.id)}
                                            className="min-h-[44px] flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                                        >
                                            <Check size={15} strokeWidth={2.5} />
                                            افزودن همه به برنامه
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onReviewTasks(message.pendingTasks!)}
                                        className={`min-h-[44px] flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                                            tasksApplied
                                                ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                                : 'bg-surface-container hover:bg-surface-container-high text-on-surface border border-[var(--border-subtle)]'
                                        }`}
                                    >
                                        {tasksApplied ? <Check size={15} strokeWidth={2.5} /> : <Eye size={15} strokeWidth={2.2} />}
                                        {tasksApplied ? 'به برنامه اضافه شد ✓' : 'ویرایش و بازبینی'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
};
