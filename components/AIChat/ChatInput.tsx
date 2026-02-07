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
        <div className="p-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 z-20 shrink-0">
            <div className="flex gap-2 items-end max-w-4xl mx-auto w-full relative">

                {/* Input Container */}
                <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-2 rounded-3xl border-2 border-transparent focus-within:border-indigo-100 dark:focus-within:border-indigo-900/50 focus-within:ring-4 focus-within:ring-indigo-50/50 dark:focus-within:ring-indigo-900/30 transition-all shadow-inner">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="سوال خود را بپرسید..."
                        className="w-full bg-transparent border-none focus:ring-0 p-3 min-h-[50px] resize-none text-sm md:text-base custom-scrollbar dark:text-white placeholder-gray-400"
                        rows={1}
                        dir="rtl"
                        disabled={isTyping}
                    />
                </div>

                {/* Send / Stop Button */}
                {isTyping && onStop ? (
                    <button
                        onClick={onStop}
                        className="p-3.5 mb-1 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl transition-all shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95 group"
                        title="توقف"
                    >
                        <StopCircle size={20} className="animate-pulse" />
                    </button>
                ) : (
                    <button
                        onClick={onSend}
                        disabled={!input.trim() || isTyping}
                        className="p-3.5 mb-1 bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale text-white rounded-2xl transition-all shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 group"
                    >
                        {isTyping ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <Send size={20} className={input.trim() ? "group-hover:-translate-x-1 group-hover:-translate-y-1 transition-transform" : ""} />
                        )}
                    </button>
                )}
            </div>

            <div className="text-center mt-2.5">
                <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1.5">
                    <Sparkles size={10} className="text-indigo-400" />
                    پشتیبانی شده توسط Gemini 2.5 Flash
                </p>
            </div>
        </div>
    );
};
