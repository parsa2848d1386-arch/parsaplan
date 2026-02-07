import React from 'react';
import { Sparkles, Zap, Brain, Calendar, Coffee } from 'lucide-react';

interface WelcomeScreenProps {
    onPromptSelect: (text: string) => void;
    userName: string;
}

const QUICK_PROMPTS = [
    { text: "برنامه امروز رو بررسی کن", icon: Calendar, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { text: "چطور زمانم رو بهتر مدیریت کنم؟", icon: Zap, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { text: "یک جمله انگیزشی بگو", icon: Sparkles, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { text: "تحلیل عملکرد درسی من", icon: Brain, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onPromptSelect, userName }) => {
    return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">

            {/* Logo/Icon */}
            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 mb-8 transform hover:scale-105 transition-transform duration-500">
                <Sparkles size={40} className="text-white" />
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-gray-100 mb-3 tracking-tight">
                سلام {userName} 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-10 text-lg leading-relaxed">
                من دستیار هوشمند شما هستم. چطور می‌تونم امروز در مسیر موفقیت کمکت کنم؟
            </p>

            {/* Quick Prompts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                        key={idx}
                        onClick={() => onPromptSelect(prompt.text)}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group text-right"
                    >
                        <div className={`p-3 rounded-xl ${prompt.bg} ${prompt.icon ? prompt.color : ''} group-hover:scale-110 transition-transform`}>
                            <prompt.icon size={20} />
                        </div>
                        <span className="font-bold text-gray-700 dark:text-gray-200 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {prompt.text}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
