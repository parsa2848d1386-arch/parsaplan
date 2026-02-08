import React, { useRef, useEffect, useState } from 'react';
import { Send, Loader2, Sparkles, StopCircle, Paperclip, X, FileText } from 'lucide-react';

interface ChatInputProps {
    input: string;
    setInput: (val: string) => void;
    onSend: (attachments?: File[]) => void;
    isTyping: boolean;
    onStop?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ input, setInput, onSend, isTyping, onStop }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [previews, setPreviews] = useState<{ url: string; type: 'image' | 'video' | 'file'; name: string }[]>([]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset height
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`; // Set to scrollHeight, max 150px
        }
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if ((input.trim() || attachments.length > 0) && !isTyping) {
                handleSendClick();
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setAttachments(prev => [...prev, ...newFiles]);

            newFiles.forEach(file => {
                const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
                const url = URL.createObjectURL(file);
                setPreviews(prev => [...prev, { url, type, name: file.name }]);
            });
            e.target.value = '';
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSendClick = () => {
        if (!input.trim() && attachments.length === 0) return;
        onSend(attachments);
        setAttachments([]);
        setPreviews([]);
    };

    return (
        <div className="p-3 md:p-4 w-full z-20 shrink-0">
            <div className="max-w-3xl mx-auto w-full">

                {previews.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar px-1">
                        {previews.map((preview, idx) => (
                            <div key={idx} className="relative group shrink-0 shadow-sm">
                                <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                                    {preview.type === 'image' ? (
                                        <img src={preview.url} alt={preview.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <FileText className="text-gray-400" />
                                    )}
                                </div>
                                <button onClick={() => removeAttachment(idx)} className="absolute -top-1.5 -right-1.5 bg-gray-500 text-white rounded-full p-0.5 hover:bg-rose-500 transition shadow-sm">
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-end gap-2 bg-white dark:bg-gray-900 p-1.5 pr-2 pl-2 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-xl dark:shadow-black/50 focus-within:ring-4 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/20 transition-all">

                    <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-colors mb-0.5" title="افزودن فایل">
                        <Paperclip size={20} />
                    </button>
                    <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,video/*,.pdf,.txt,.doc,.docx" />

                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="پیام خود را بنویسید..."
                        className="flex-1 bg-transparent border-none focus:ring-0 py-3 min-h-[44px] max-h-[150px] resize-none text-[14px] md:text-[15px] custom-scrollbar dark:text-white placeholder-gray-400 leading-relaxed"
                        rows={1}
                        dir="rtl"
                        disabled={isTyping}
                    />

                    <div className="pb-0.5 pl-0.5">
                        {isTyping && onStop ? (
                            <button
                                onClick={onStop}
                                className="w-10 h-10 flex items-center justify-center bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-all shadow-md shadow-rose-500/20 hover:scale-110 active:scale-95"
                                title="توقف"
                            >
                                <StopCircle size={18} className="animate-pulse" strokeWidth={2.5} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSendClick}
                                disabled={(!input.trim() && attachments.length === 0) || isTyping}
                                className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale text-white rounded-full transition-all shadow-md shadow-indigo-500/20 hover:scale-110 active:scale-95 group"
                            >
                                {isTyping ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Send size={18} className={(input.trim() || attachments.length > 0) ? "translate-x-0.5 translate-y-0.5" : ""} strokeWidth={2.5} />
                                )}
                            </button>
                        )}
                    </div>
                </div>

                <div className="text-center mt-2">
                    <p className="text-[9px] text-gray-400 dark:text-gray-600 flex items-center justify-center gap-1.5 opacity-70">
                        <Sparkles size={10} />
                        قدرت گرفته از Gemini 2.5 Flash
                    </p>
                </div>
            </div>
        </div>
    );
};
