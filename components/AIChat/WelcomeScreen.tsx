import React from 'react';
import { Sparkles, Zap, Brain, Calendar, Coffee, BookOpen, ClipboardList, GraduationCap, FileText } from 'lucide-react';

interface WelcomeScreenProps {
    onPromptSelect: (text: string) => void;
    userName: string;
}

const QUICK_TAGS = [
    { text: "امتحانات", icon: "📝", bg: "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800" },
    { text: "تکالیف", icon: "📋", bg: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800" },
    { text: "رویدادها", icon: "🎯", bg: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800" },
    { text: "برنامه", icon: "📅", bg: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800" },
    { text: "کلاس‌ها", icon: "🏫", bg: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800" },
];

const QUICK_PROMPTS = [
    { text: "۱۰ سوال ریاضی بساز", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { text: "برنامه امتحان بساز", icon: ClipboardList, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { text: "تحلیل عملکرد درسی من", icon: Brain, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { text: "یک جمله انگیزشی بگو", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onPromptSelect, userName }) => {
    return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">

            {/* Logo/Icon */}
            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-6 transform hover:scale-105 transition-transform duration-500">
                <Sparkles size={38} className="text-white" />
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-gray-100 mb-2 tracking-tight">
                چطور می‌تونم کمکت کنم، {userName}؟
            </h1>
            <p className="text-gray-400 dark:text-gray-500 max-w-md mb-6 text-base leading-relaxed">
                از موضوعاتی که می‌خوای انتخاب کن یا هر سوالی داری بپرس
            </p>

            {/* Quick Tags (Pill-shaped) */}
            <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-lg">
                {QUICK_TAGS.map((tag, idx) => (
                    <button
                        key={idx}
                        onClick={() => onPromptSelect(`درباره ${tag.text} بگو`)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold border transition-all hover:scale-105 active:scale-95 ${tag.bg}`}
                    >
                        <span>{tag.icon}</span>
                        {tag.text}
                    </button>
                ))}
            </div>

            {/* Quick Prompts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                        key={idx}
                        onClick={() => onPromptSelect(prompt.text)}
                        className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group text-right"
                    >
                        <div className={`p-2.5 rounded-xl ${prompt.bg} ${prompt.icon ? prompt.color : ''} group-hover:scale-110 transition-transform`}>
                            <prompt.icon size={18} />
                        </div>
                        <span className="font-bold text-gray-700 dark:text-gray-200 text-[13px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {prompt.text}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
