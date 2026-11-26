import React, { useRef, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Send, Loader2, Sparkles, StopCircle, Paperclip, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { SPRING_SNAPPY } from '../../utils/motionPresets';

export interface ChatAttachmentPayload {
    id: string;
    name: string;
    mimeType: string;
    kind: 'image' | 'file';
    previewUrl?: string;
    base64Data?: string;
    textContent?: string;
    sizeBytes: number;
}

const MAX_FILES = 4;
const MAX_TOTAL_BYTES = 6 * 1024 * 1024;
const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const TEXT_MIMES = new Set(['text/plain', 'text/markdown', 'text/csv', 'application/json']);

function inferMimeType(file: File): string {
    if (file.type) {
        const lower = file.type.toLowerCase();
        if (lower === 'image/jpg') return 'image/jpeg';
        return lower;
    }
    const name = file.name.toLowerCase();
    if (name.endsWith('.png')) return 'image/png';
    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
    if (name.endsWith('.webp')) return 'image/webp';
    if (name.endsWith('.gif')) return 'image/gif';
    if (name.endsWith('.pdf')) return 'application/pdf';
    if (name.endsWith('.md')) return 'text/markdown';
    if (name.endsWith('.csv')) return 'text/csv';
    if (name.endsWith('.json')) return 'application/json';
    if (name.endsWith('.txt')) return 'text/plain';
    return '';
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
        reader.readAsDataURL(file);
    });
}

function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('خطا در خواندن متن فایل'));
        reader.readAsText(file, 'utf-8');
    });
}

interface ChatInputProps {
    input: string;
    setInput: (val: string) => void;
    onSend: (attachments?: ChatAttachmentPayload[]) => void;
    isTyping: boolean;
    onStop?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ input, setInput, onSend, isTyping, onStop }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const prefersReducedMotion = useReducedMotion();
    const [attachments, setAttachments] = useState<ChatAttachmentPayload[]>([]);
    const [isReadingFiles, setIsReadingFiles] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const [isLaunching, setIsLaunching] = useState(false);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
        }
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if ((input.trim() || attachments.length > 0) && !isTyping && !isReadingFiles) {
                handleSendClick();
            }
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const selected = Array.from(e.target.files);
        e.target.value = '';
        setFileError(null);

        if (attachments.length + selected.length > MAX_FILES) {
            setFileError(`حداکثر ${MAX_FILES} فایل در هر پیام قابل ارسال است.`);
            return;
        }

        const currentBytes = attachments.reduce((sum, a) => sum + a.sizeBytes, 0);
        const incomingBytes = selected.reduce((sum, f) => sum + f.size, 0);
        if (currentBytes + incomingBytes > MAX_TOTAL_BYTES) {
            setFileError('مجموع حجم فایل‌های پیوست نباید بیشتر از ۶ مگابایت باشد.');
            return;
        }

        setIsReadingFiles(true);
        try {
            const processed: ChatAttachmentPayload[] = [];
            for (const file of selected) {
                const mimeType = inferMimeType(file);
                const isImage = IMAGE_MIMES.has(mimeType);
                const isPdf = mimeType === 'application/pdf';
                const isText = TEXT_MIMES.has(mimeType) || mimeType.startsWith('text/');

                if (!isImage && !isPdf && !isText) {
                    setFileError(`فرمت فایل «${file.name}» پشتیبانی نمی‌شود. (فقط تصویر، PDF و فایل متنی)`);
                    continue;
                }

                if (isText) {
                    const textContent = await readFileAsText(file);
                    processed.push({
                        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                        name: file.name,
                        mimeType: TEXT_MIMES.has(mimeType) ? mimeType : 'text/plain',
                        kind: 'file',
                        textContent,
                        sizeBytes: file.size,
                    });
                } else {
                    const dataUrl = await readFileAsDataUrl(file);
                    processed.push({
                        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                        name: file.name,
                        mimeType,
                        kind: isImage ? 'image' : 'file',
                        previewUrl: isImage ? dataUrl : undefined,
                        base64Data: dataUrl,
                        sizeBytes: file.size,
                    });
                }
            }

            if (processed.length > 0) {
                setAttachments((prev) => [...prev, ...processed].slice(0, MAX_FILES));
            }
        } catch {
            setFileError('خطا در آماده‌سازی فایل پیوست.');
        } finally {
            setIsReadingFiles(false);
        }
    };

    const removeAttachment = (id: string) => {
        setAttachments((prev) => prev.filter((item) => item.id !== id));
        setFileError(null);
    };

    const handleSendClick = () => {
        if ((!input.trim() && attachments.length === 0) || isReadingFiles || isTyping) return;
        setIsLaunching(true);
        window.setTimeout(() => setIsLaunching(false), 280);
        onSend(attachments.length > 0 ? attachments : undefined);
        setInput('');
        setAttachments([]);
        setFileError(null);
    };

    const canSend = (input.trim().length > 0 || attachments.length > 0) && !isTyping && !isReadingFiles;

    return (
        <div className="w-full shrink-0">
            <div className="max-w-3xl mx-auto w-full">
                {fileError && (
                    <div className="mb-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5">
                            <AlertCircle size={14} />
                            {fileError}
                        </span>
                        <button
                            type="button"
                            onClick={() => setFileError(null)}
                            aria-label="بستن خطا"
                            className="p-1 hover:opacity-80 cursor-pointer"
                        >
                            <X size={13} />
                        </button>
                    </div>
                )}

                <div
                    className={`relative transition-colors bg-surface-container-low border border-[var(--border-subtle)] focus-within:border-primary/60 rounded-[22px] p-1.5 flex flex-col ${
                        isTyping ? 'opacity-90' : ''
                    }`}
                >
                    {attachments.length > 0 && (
                        <div className="flex gap-2.5 overflow-x-auto pb-3 pt-1.5 px-1.5 custom-scrollbar mb-1.5 border-b border-[var(--border-subtle)]">
                            {attachments.map((att) => (
                                <div key={att.id} className="relative group/preview shrink-0">
                                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex flex-col items-center justify-center relative p-1">
                                        {att.kind === 'image' && att.previewUrl ? (
                                            <img src={att.previewUrl} alt={att.name} className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <>
                                                <FileText className="text-primary" size={20} />
                                                <span className="text-[9px] text-[var(--text-secondary)] truncate max-w-full mt-1">
                                                    {att.name}
                                                </span>
                                            </>
                                        )}

                                        <div className="absolute bottom-0.5 right-0.5 bg-emerald-500 rounded-full p-[1px] border border-white dark:border-slate-900">
                                            <CheckCircle2 size={10} className="text-white" />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeAttachment(att.id)}
                                        aria-label="حذف فایل پیوست"
                                        className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-rose-500 text-white rounded-full transition shadow-sm z-10 cursor-pointer"
                                    >
                                        <X size={11} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-end gap-1.5 px-1">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isTyping || isReadingFiles}
                            className="w-10 h-10 flex items-center justify-center text-[var(--text-secondary)] hover:text-primary hover:bg-surface-container rounded-xl transition-colors mb-0.5 disabled:opacity-50 cursor-pointer shrink-0"
                            title="افزودن تصویر، PDF یا فایل متنی (حداکثر ۶ مگابایت)"
                            aria-label="افزودن فایل"
                        >
                            {isReadingFiles ? <Loader2 size={18} className="animate-spin text-primary" /> : <Paperclip size={18} />}
                        </button>
                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileSelect}
                            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.txt,.md,.csv,.json"
                        />

                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isReadingFiles ? 'در حال آماده‌سازی فایل...' : 'پیام خود را بنویسید...'}
                            aria-label="متن پیام برای دستیار هوشمند"
                            className="flex-1 bg-transparent border-none focus:ring-0 py-2.5 min-h-[44px] max-h-[140px] resize-none text-base sm:text-sm custom-scrollbar text-on-surface placeholder:text-[var(--text-tertiary)] leading-relaxed font-medium outline-none"
                            rows={1}
                            dir="rtl"
                            disabled={isTyping}
                        />

                        <div className="pb-0.5 shrink-0">
                            {isTyping && onStop ? (
                                <button
                                    type="button"
                                    onClick={onStop}
                                    className="w-10 h-10 flex items-center justify-center bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition cursor-pointer"
                                    title="توقف"
                                    aria-label="توقف پاسخ‌دهی"
                                >
                                    <StopCircle size={18} strokeWidth={2.2} />
                                </button>
                            ) : (
                                <motion.button
                                    type="button"
                                    onClick={handleSendClick}
                                    disabled={!canSend}
                                    whileTap={canSend && !prefersReducedMotion ? { scale: 0.9, y: 2 } : undefined}
                                    transition={SPRING_SNAPPY}
                                    aria-label="ارسال پیام"
                                    className="w-10 h-10 flex items-center justify-center bg-primary hover:opacity-95 disabled:bg-surface-container disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed text-on-primary rounded-xl transition cursor-pointer"
                                >
                                    {isTyping || isReadingFiles ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <motion.span
                                            animate={
                                                prefersReducedMotion || !isLaunching
                                                    ? { y: 0, scale: 1 }
                                                    : { y: [0, 3, -5, 0], scale: [1, 0.9, 1.08, 1] }
                                            }
                                            transition={{ duration: 0.28, times: [0, 0.25, 0.7, 1] }}
                                            className="inline-flex"
                                        >
                                            <Send size={16} strokeWidth={2.3} />
                                        </motion.span>
                                    )}
                                </motion.button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="text-center mt-2">
                    <p className="text-[11px] text-[var(--text-secondary)] flex items-center justify-center gap-1.5 font-medium">
                        <Sparkles size={11} className="text-primary" />
                        دستیار هوشمند ParsaPlan · حداکثر ۴ فایل (۶ مگابایت)
                    </p>
                </div>
            </div>
        </div>
    );
};
