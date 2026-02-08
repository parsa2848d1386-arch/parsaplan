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
                type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file' as const,
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
        setAttachments([]);
        setPreviews([]);
    };

    const isUploading = previews.some(p => p.uploading);

    return (
        <div className="p-4 w-full z-20 shrink-0 pointer-events-none">
            {/* Inner container to capture pointer events, enabling clicks but ignoring the transparent background clicks if possible (though w-full makes it take space). 
                The user wants "no rectangle around it". 
                The parent takes full width. We'll center the input.
            */}
            <div className="max-w-3xl mx-auto w-full pointer-events-auto">

                {previews.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar px-1">
                        {previews.map((preview, idx) => (
                            <div key={idx} className="relative group shrink-0 shadow-sm animate-in zoom-in-50 duration-300">
                                <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center relative">
                                    {preview.type === 'image' ? (
                                        <img src={preview.url} alt={preview.name} className={`w-full h-full object-cover transition-opacity duration-300 ${preview.uploading ? 'opacity-50' : 'opacity-100'}`} />
                                    ) : (
                                        <FileText className={`text-gray-400 ${preview.uploading ? 'opacity-50' : ''}`} />
                                    )}

                                    {/* Uploading Overlay */}
                                    {preview.uploading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                                            <Loader2 size={16} className="text-indigo-600 animate-spin" />
                                        </div>
                                    )}

                                    {/* Success Indicator */}
                                    {!preview.uploading && (
                                        <div className="absolute bottom-0.5 right-0.5 bg-green-500 rounded-full p-[1px] border border-white animate-in zoom-in">
                                            <CheckCircle2 size={10} className="text-white" />
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => removeAttachment(idx)} className="absolute -top-1.5 -right-1.5 bg-gray-500 text-white rounded-full p-0.5 hover:bg-rose-500 transition shadow-sm z-10">
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className={`flex items-end gap-2 bg-white dark:bg-gray-900 p-1.5 pr-2 pl-2 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-black/50 focus-within:ring-4 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/20 transition-all transform duration-300 ${isTyping ? 'opacity-80 grayscale' : ''}`}>

                    <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-colors mb-0.5" title="افزودن فایل">
                        <Paperclip size={20} />
                    </button>
                    <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,video/*,.pdf,.txt,.doc,.docx" />

                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isUploading ? "در حال آپلود فایل..." : "پیام خود را بنویسید..."}
                        className="flex-1 bg-transparent border-none focus:ring-0 py-3 min-h-[44px] max-h-[150px] resize-none text-[14px] md:text-[15px] custom-scrollbar dark:text-white placeholder-gray-400 leading-relaxed font-normal"
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
                                disabled={(!input.trim() && attachments.length === 0) || isTyping || isUploading}
                                className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale text-white rounded-full transition-all shadow-md shadow-indigo-500/20 hover:scale-110 active:scale-95 group"
                            >
                                {isTyping || isUploading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Send size={18} className={(input.trim() || attachments.length > 0) ? "translate-x-0.5 translate-y-0.5" : ""} strokeWidth={2.5} />
                                )}
                            </button>
                        )}
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
