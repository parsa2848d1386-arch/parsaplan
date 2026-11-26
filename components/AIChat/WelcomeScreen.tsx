import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    Sparkles,
    CheckCircle2,
    Brain,
    BarChart2,
    Zap,
    Briefcase,
    Target,
    Dumbbell,
    Calendar,
} from 'lucide-react';
import { STAGGER_CONTAINER_VARIANTS, STAGGER_ITEM_VARIANTS } from '../../utils/motionPresets';

interface WelcomeScreenProps {
    onPromptSelect: (text: string) => void;
    userName: string;
}

// Principle 10 (Hick's Law): 4 focused topic themes minimize choice paralysis
const TOPIC_THEMES = [
    { text: 'کار و پروژه', Icon: Briefcase },
    { text: 'اهداف و عادت‌ها', Icon: Target },
    { text: 'ورزش و سلامت', Icon: Dumbbell },
    { text: 'تایم‌لاین امروز', Icon: Calendar },
];

const BENTO_PROMPTS = [
    {
        text: 'برای امروز ۳ تسک زمان‌بندی‌شده (با ساعت شروع و مدت) بساز و به تایم‌لاین اضافه کن',
        Icon: CheckCircle2,
        bg: 'bg-emerald-50 dark:bg-emerald-950/35 text-emerald-600 dark:text-emerald-400',
    },
    {
        text: 'برنامه این هفته‌ام رو با تعادل کار، ورزش و استراحت بچین',
        Icon: Brain,
        bg: 'bg-primary/10 text-primary',
    },
    {
        text: 'عملکرد و زمان تمرکز اخیرم رو تحلیل کن و نقاط قوت و ضعف رو بگو',
        Icon: BarChart2,
        bg: 'bg-sky-50 dark:bg-sky-950/35 text-sky-600 dark:text-sky-400',
    },
    {
        text: 'پیشنهاد ۳ عادت کلیدی برای افزایش انرژی، تمرکز و بهره‌وری',
        Icon: Zap,
        bg: 'bg-amber-50 dark:bg-amber-950/35 text-amber-600 dark:text-amber-400',
    },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onPromptSelect, userName }) => {
    const prefersReducedMotion = useReducedMotion();

    return (
        <div className="flex flex-col items-center justify-start sm:justify-center py-2 sm:py-6 px-1 sm:px-4 text-center select-none max-w-2xl mx-auto">
            {/* Crisp App Emblem (Zero Blur-Orb Slop) */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 mb-3 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-sm">
                <Sparkles size={24} />
            </div>

            {/* Greeting Headline */}
            <h2 className="text-lg sm:text-2xl font-black text-on-surface mb-1">
                چطور می‌تونم کمکت کنم، <span className="text-primary">{userName || 'دوست من'}</span>؟
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-sm mb-4 leading-6">
                یکی از موضوعات زیر را انتخاب کن یا مستقیم برنامه و سوالت را بنویس.
            </p>

            {/* Quick Themes */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-4">
                {TOPIC_THEMES.map((theme) => {
                    const ThemeIcon = theme.Icon;
                    return (
                        <button
                            key={theme.text}
                            type="button"
                            onClick={() =>
                                onPromptSelect(`لطفاً در زمینه «${theme.text}» من را راهنمایی کن و چند پیشنهاد اجرایی بده.`)
                            }
                            className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--surface-elevated)] hover:bg-surface-container text-on-surface transition active:scale-95 border border-[var(--border-subtle)] text-xs font-bold cursor-pointer"
                        >
                            <ThemeIcon size={14} className="text-primary shrink-0" />
                            <span>{theme.text}</span>
                        </button>
                    );
                })}
            </div>

            {/* Action Prompt Cards (Principle 3: Stagger choreography) */}
            <motion.div
                variants={STAGGER_CONTAINER_VARIANTS}
                initial={prefersReducedMotion ? false : 'hidden'}
                animate="visible"
                className="flex flex-col gap-2.5 w-full mb-4"
            >
                {BENTO_PROMPTS.map((prompt, idx) => {
                    const Icon = prompt.Icon;
                    return (
                        <motion.button
                            key={idx}
                            variants={STAGGER_ITEM_VARIANTS}
                            type="button"
                            onClick={() => onPromptSelect(prompt.text)}
                            className="group w-full text-right p-3.5 sm:p-4 rounded-[20px] bg-[var(--surface-elevated)] hover:bg-surface-container-low transition flex items-center justify-between gap-3 active:scale-[0.99] border border-[var(--border-subtle)] cursor-pointer"
                        >
                            <span className="text-xs sm:text-sm text-on-surface group-hover:text-primary transition-colors flex-1 leading-6 font-semibold">
                                {prompt.text}
                            </span>
                            <div className={`w-10 h-10 shrink-0 rounded-xl ${prompt.bg} flex items-center justify-center`}>
                                <Icon size={18} />
                            </div>
                        </motion.button>
                    );
                })}
            </motion.div>
        </div>
    );
};

export default WelcomeScreen;