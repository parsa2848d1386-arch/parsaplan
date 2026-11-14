import React from 'react';
import { motion } from 'framer-motion';

interface WelcomeScreenProps {
    onPromptSelect: (text: string) => void;
    userName: string;
}

const TOPIC_PILLS = [
    { text: "کار و پروژه", icon: "💼" },
    { text: "اهداف و عادت‌ها", icon: "🌱" },
    { text: "ورزش و سلامت", icon: "🏋️" },
    { text: "تایم‌لاین امروز", icon: "📅" },
    { text: "مطالعه و مهارت", icon: "📖" },
];

const BENTO_PROMPTS = [
    {
        text: "برای امروز ۳ تسک زمان‌بندی‌شده (با ساعت شروع و مدت) بساز و به تایم‌لاین اضافه کن",
        icon: "assignment_turned_in",
        bg: "bg-secondary-container/40 text-on-secondary-container",
    },
    {
        text: "برنامه این هفته‌ام رو با تعادل کار، ورزش و استراحت بچین",
        icon: "psychology",
        bg: "bg-primary-fixed text-on-primary-fixed-variant",
    },
    {
        text: "عملکرد و زمان تمرکز اخیرم رو تحلیل کن و نقاط قوت و ضعف رو بگو",
        icon: "insights",
        bg: "bg-surface-container-highest text-primary",
    },
    {
        text: "پیشنهاد ۳ عادت کلیدی برای افزایش انرژی، تمرکز و بهره‌وری",
        icon: "bolt",
        bg: "bg-tertiary-fixed text-tertiary",
    },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onPromptSelect, userName }) => {
    return (
        <div className="h-full flex flex-col items-center justify-center p-4 md:p-6 text-center select-none overflow-y-auto max-w-2xl mx-auto custom-scrollbar">
            {/* Glowing AI Orb */}
            <div className="relative w-24 h-24 mb-space-md flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-primary-container blur-xl opacity-60 animate-pulse"></div>
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary via-primary-container to-secondary-container flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                    <span className="material-symbols-outlined text-on-primary text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        auto_awesome
                    </span>
                </div>
            </div>

            {/* Greeting Headline */}
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface tracking-tight mb-space-xs">
                چطور می‌تونم کمکت کنم، <span className="text-primary font-bold">{userName || 'سارا'}</span>؟
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mb-space-lg">
                از موضوعاتی که می‌خوای انتخاب کن یا هر سوال و برنامه‌ای داری بپرس.
            </p>

            {/* Topic Pills (Bento Quick Themes) */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-space-lg px-space-xs">
                {TOPIC_PILLS.map((pill, idx) => (
                    <button
                        key={idx}
                        onClick={() => onPromptSelect(`لطفاً در زمینه «${pill.text}» من را راهنمایی کن و چند پیشنهاد اجرایی بده.`)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container-lowest shadow-sm hover:shadow-md hover:bg-surface-container text-on-surface transition-all active:scale-95 border border-outline-variant/30 font-label-sm text-label-sm font-semibold"
                    >
                        <span className="text-base">{pill.icon}</span>
                        <span>{pill.text}</span>
                    </button>
                ))}
            </div>

            {/* Bento Action Prompt Cards */}
            <div className="flex flex-col gap-space-sm w-full mb-space-xl">
                {BENTO_PROMPTS.map((prompt, idx) => (
                    <button
                        key={idx}
                        onClick={() => onPromptSelect(prompt.text)}
                        className="group w-full text-right p-space-md rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-space-sm active:scale-[0.99] border border-outline-variant/30"
                    >
                        <span className="font-body-md text-body-md text-on-surface group-hover:text-primary transition-colors flex-1 leading-relaxed font-medium">
                            {prompt.text}
                        </span>
                        <div className={`w-11 h-11 shrink-0 rounded-xl ${prompt.bg} flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs`}>
                            <span className="material-symbols-outlined text-[22px]">{prompt.icon}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default WelcomeScreen;