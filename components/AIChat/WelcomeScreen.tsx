import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, ClipboardList, BookOpen } from 'lucide-react';

interface WelcomeScreenProps {
    onPromptSelect: (text: string) => void;
    userName: string;
}

const QUICK_TAGS = [
    { text: "امتحانات", icon: "📝", bg: "bg-rose-50/50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 border-rose-100/50 dark:border-rose-900/30 hover:bg-rose-100/50" },
    { text: "تکالیف", icon: "📋", bg: "bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border-blue-100/50 dark:border-blue-900/30 hover:bg-blue-100/50" },
    { text: "رویدادها", icon: "🎯", bg: "bg-amber-50/50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/30 hover:bg-amber-100/50" },
    { text: "برنامه", icon: "📅", bg: "bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/30 hover:bg-emerald-100/50" },
    { text: "کلاس‌ها", icon: "🏫", bg: "bg-purple-50/50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 border-purple-100/50 dark:border-purple-900/30 hover:bg-purple-100/50" },
];

const QUICK_PROMPTS = [
    { text: "۱۰ سوال ریاضی بساز", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-50/50 dark:bg-blue-900/20" },
    { text: "یک برنامه فشرده ۱۲ روزه بساز", icon: ClipboardList, color: "text-emerald-500", bg: "bg-emerald-50/50 dark:bg-emerald-900/20" },
    { text: "تحلیل عملکرد درسی من", icon: Brain, color: "text-purple-500", bg: "bg-purple-50/50 dark:bg-purple-900/20" },
    { text: "یک جمله انگیزشی بگو", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-50/50 dark:bg-amber-900/20" },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onPromptSelect, userName }) => {
    return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto max-w-2xl mx-auto custom-scrollbar">

            {/* Glowing Logo Circle */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.1
                }}
                className="relative mb-6"
            >
                <div className="absolute inset-0 bg-indigo-500/20 rounded-[2rem] filter blur-xl animate-pulse-glow" />
                <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 relative z-10 border border-white/20"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                    >
                        <Sparkles size={34} className="text-white" />
                    </motion.div>
                </motion.div>
            </motion.div>

            {/* Welcome Title */}
            <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl md:text-2xl font-black text-gray-800 dark:text-gray-100 mb-2 tracking-tight flex items-center gap-2"
            >
                چطور می‌تونم کمکت کنم، <span className="gradient-text">{userName}</span>؟
            </motion.h1>

            <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-gray-400 dark:text-gray-500 max-w-sm mb-8 text-xs md:text-sm font-medium leading-relaxed"
            >
                از موضوعاتی که می‌خوای انتخاب کن یا هر سوالی داری بپرس
            </motion.p>

            {/* Quick Tags List */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-wrap justify-center gap-2 mb-8"
            >
                {QUICK_TAGS.map((tag, idx) => (
                    <button
                        key={idx}
                        onClick={() => onPromptSelect(`درباره ${tag.text} بگو`)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-extrabold border border-gray-200/50 dark:border-gray-800/80 transition-all btn-micro-interactive ${tag.bg} shadow-sm`}
                    >
                        <span>{tag.icon}</span>
                        {tag.text}
                    </button>
                ))}
            </motion.div>

            {/* Quick Prompts Grid */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full"
            >
                {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                        key={idx}
                        onClick={() => onPromptSelect(prompt.text)}
                        className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/70 dark:bg-gray-900/70 border border-gray-200/40 dark:border-gray-800/40 backdrop-blur-md shadow-sm hover:shadow-md hover:border-indigo-300/40 dark:hover:border-indigo-800/40 transition-all btn-micro-interactive group text-right glass-premium"
                    >
                        <div className={`p-3 rounded-xl ${prompt.bg} ${prompt.icon ? prompt.color : ''} group-hover:scale-110 transition-transform shadow-inner`}>
                            <prompt.icon size={18} />
                        </div>
                        <span className="font-extrabold text-gray-700 dark:text-gray-200 text-xs md:text-[13px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {prompt.text}
                        </span>
                    </button>
                ))}
            </motion.div>
        </div>
    );
};
