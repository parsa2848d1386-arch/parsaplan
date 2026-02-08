import React, { useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, StopCircle } from 'lucide-react';

interface ChatInputProps {
    input: string;
    setInput: (val: string) => void;
    onSend: () => void;
    isTyping: boolean;
    onStop?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ input, setInput, onSend, isTyping, onStop }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset height
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`; // Set to scrollHeight, max 150px
        }
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() && !isTyping) {
                onSend();
            }
        }
    };

    return (
        <div className="p-3 md:p-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 z-20 shrink-0">
            <div className="max-w-3xl mx-auto w-full">

                {/* Input Wrapper */}
                <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-900/50 p-1.5 pr-4 rounded-[2rem] border border-gray-200 dark:border-gray-800 focus-within:border-indigo-300 dark:focus-within:border-indigo-700/50 focus-within:ring-4 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/20 transition-all shadow-sm hover:shadow-md">

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

                    {/* Send / Stop Button */}
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
                                onClick={onSend}
                                disabled={!input.trim() || isTyping}
                                className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale text-white rounded-full transition-all shadow-md shadow-indigo-500/20 hover:scale-110 active:scale-95 group"
                            >
                                {isTyping ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Send size={18} className={input.trim() ? "translate-x-0.5 translate-y-0.5" : ""} strokeWidth={2.5} />
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
