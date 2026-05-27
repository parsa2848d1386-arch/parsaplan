import React, { useRef, useEffect, useState } from 'react';
import { Send, Loader2, Sparkles, StopCircle, Paperclip, X, FileText, CheckCircle2 } from 'lucide-react';

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
    const [previews, setPreviews] = useState<{ url: string; type: 'image' | 'video' | 'file'; name: string; uploading: boolean }[]>([]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset height
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`; // Set to scrollHeight, max 150px
        }
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const isUploading = previews.some(p => p.uploading);
            if ((input.trim() || attachments.length > 0) && !isTyping && !isUploading) {
                handleSendClick();
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setAttachments(prev => [...prev, ...newFiles]);

            const newPreviews = newFiles.map(file => ({
                url: URL.createObjectURL(file),
                type: (file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file') as 'image' | 'video' | 'file',
                name: file.name,
                uploading: true
            }));

            setPreviews(prev => [...prev, ...newPreviews]);

            // Simulate upload for each file with slight stagger
            newPreviews.forEach((_, idx) => {
                setTimeout(() => {
                    setPreviews(current =>
                        current.map(p =>
                            p.name === newPreviews[idx].name ? { ...p, uploading: false } : p
                        )
                    );
                }, 1500 + (idx * 500));
            });

            e.target.value = '';
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSendClick = () => {
        const isUploading = previews.some(p => p.uploading);
        if ((!input.trim() && attachments.length === 0) || isUploading) return;
        onSend(attachments);
        setInput('');
        setAttachments([]);
        setPreviews([]);
    };

    const isUploading = previews.some(p => p.uploading);

    return (
        <div className="p-4 w-full z-20 shrink-0">
            <div className="max-w-3xl mx-auto w-full">
                <div className={`
                    relative transition-all duration-300 ease-out bg-white/70 dark:bg-gray-900/70 border border-gray-200/50 dark:border-gray-800/50 
                    rounded-[24px] p-2 flex flex-col glass-premium floating-input-container shadow-lg
                    ${isTyping ? 'opacity-90' : ''}
                    group
                `}>

                    {previews.length > 0 && (
                        <div className="flex gap-2.5 overflow-x-auto pb-3.5 pt-1.5 px-1.5 custom-scrollbar mb-2 border-b border-gray-200/30 dark:border-gray-800/30">
                            {previews.map((preview, idx) => (
                                <div key={idx} className="relative group/preview shrink-0 animate-in zoom-in-50 duration-300">
                                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200/40 dark:border-gray-700/40 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm flex items-center justify-center relative shadow-inner">
                                        {preview.type === 'image' ? (
                                            <img src={preview.url} alt={preview.name} className={`w-full h-full object-cover transition-opacity duration-300 ${preview.uploading ? 'opacity-40' : 'opacity-100'}`} />
                                        ) : (
                                            <FileText className={`text-indigo-400 dark:text-indigo-500 ${preview.uploading ? 'opacity-40' : ''}`} size={24} />
                                        )}

                                        {/* Uploading Overlay */}
                                        {preview.uploading && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
                                                <Loader2 size={16} className="text-indigo-600 dark:text-indigo-400 animate-spin" />
                                            </div>
                                        )}

                                        {/* Success Indicator */}
                                        {!preview.uploading && (
                                            <div className="absolute bottom-0.5 right-0.5 bg-emerald-500 rounded-full p-[1px] border border-white dark:border-gray-900 animate-in zoom-in">
                                                <CheckCircle2 size={10} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => removeAttachment(idx)} className="absolute -top-2 -right-2 bg-gray-500 hover:bg-rose-500 text-white rounded-full p-1 transition shadow-md z-10 scale-0 group-hover/preview:scale-100">
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-end gap-2 pr-1.5 pl-1.5">
                        <button 
                            onClick={() => fileInputRef.current?.click()} 
                            className="p-3 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 rounded-full transition-colors mb-0.5 btn-micro-interactive" 
                            title="افزودن فایل"
                        >
                            <Paperclip size={18} />
                        </button>
                        <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,video/*,.pdf,.txt,.doc,.docx" />

                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isUploading ? "در حال آپلود فایل..." : "پیام خود را بنویسید..."}
                            className="flex-1 bg-transparent border-none focus:ring-0 py-3 min-h-[44px] max-h-[150px] resize-none text-[13px] md:text-[14px] custom-scrollbar dark:text-white placeholder-gray-400 leading-relaxed font-semibold outline-none border-0"
                            rows={1}
                            dir="rtl"
                            disabled={isTyping}
                        />

                        <div className="pb-0.5 pl-0.5">
                            {isTyping && onStop ? (
                                <button
                                    onClick={onStop}
                                    className="w-10 h-10 flex items-center justify-center bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-all shadow-md shadow-rose-500/20 btn-micro-interactive"
                                    title="توقف"
                                >
                                    <StopCircle size={18} className="animate-pulse" strokeWidth={2.5} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSendClick}
                                    disabled={(!input.trim() && attachments.length === 0) || isTyping || isUploading}
                                    className="w-10 h-10 flex items-center justify-center bg-gradient-to-tr from-indigo-600 to-purple-650 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-800 dark:disabled:to-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full transition-all shadow-md shadow-indigo-500/25 btn-micro-interactive group"
                                >
                                    {isTyping || isUploading ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Send size={16} className={(input.trim() || attachments.length > 0) ? "translate-x-[-1px] translate-y-[1px]" : ""} strokeWidth={2.5} />
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="text-center mt-3">
                    <p className="text-[10px] text-gray-400 dark:text-gray-600 flex items-center justify-center gap-1.5 opacity-60 font-medium">
                        <Sparkles size={10} />
                        قدرت گرفته از هوش مصنوعی ParsaPlan
                    </p>
                </div>
            </div>
        </div>
    );
};
