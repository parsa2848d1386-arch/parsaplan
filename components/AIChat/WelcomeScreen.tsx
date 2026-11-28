import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Brain, BarChart2, Flame } from 'lucide-react';
import { STAGGER_CONTAINER_VARIANTS, STAGGER_ITEM_VARIANTS } from '../../utils/motionPresets';
import type { BlobatarConfig } from '../../types';
import { BlobatarBot } from '../ui/BlobatarBot';
import { getGamifiedBotRank } from '../../utils/blobatar';
import { formatToPersianDigits } from '../../utils';

interface WelcomeScreenProps {
    onPromptSelect: (text: string) => void;
    userName: string;
    botSeed?: string;
    botConfig?: BlobatarConfig;
    level?: number;
    xp?: number;
    streak?: number;
    isFocusRunning?: boolean;
}

const BENTO_PROMPTS = [
    {
        text: 'برای امروز ۳ تسک زمان‌بندی‌شده بساز و به تایم‌لاین اضافه کن',
        Icon: CheckCircle2,
        bg: 'bg-emerald-50 dark:bg-emerald-950/35 text-emerald-600 dark:text-emerald-400',
    },
    {
        text: 'برنامه این هفته‌ام رو با تعادل کار، استراحت و تمرکز بچین',
        Icon: Brain,
        bg: 'bg-primary/10 text-primary',
    },
    {
        text: 'عملکرد و تمرکز اخیرم رو تحلیل کن و گام بعدی رو پیشنهاد بده',
        Icon: BarChart2,
        bg: 'bg-sky-50 dark:bg-sky-950/35 text-sky-600 dark:text-sky-400',
    },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
    onPromptSelect,
    userName,
    botSeed,
    botConfig,
    level = 1,
    xp = 0,
    streak = 0,
    isFocusRunning = false,
}) => {
    const prefersReducedMotion = useReducedMotion();
    const displayName = userName || 'دوست من';
    const effectiveSeed = botConfig?.seed?.trim() || botSeed || userName || 'Parsashz';
    const rank = getGamifiedBotRank(level, streak);

    return (
        <div className="flex flex-col items-center justify-center py-4 sm:py-8 px-1 sm:px-4 text-center select-none max-w-2xl mx-auto">
            {/* User's Personalized Gamified Blobatar Bot Centerpiece */}
            <div className="mb-3 flex flex-col items-center gap-2.5">
                <BlobatarBot
                    seed={effectiveSeed}
                    config={botConfig}
                    level={level}
                    streak={streak}
                    isFocusRunning={isFocusRunning}
                    interactiveGaze
                    showLevelBadge
                    showAura
                    size="2xl"
                />
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)]">
                    <span className="text-primary font-black">{rank.title}</span>
                    <span aria-hidden="true">•</span>
                    <span className="tabular-nums">{formatToPersianDigits(xp)} XP</span>
                    {streak > 0 && (
                        <>
                            <span aria-hidden="true">•</span>
                            <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 tabular-nums">
                                <Flame size={12} className="fill-current" aria-hidden="true" />
                                {formatToPersianDigits(streak)} روز
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Minimal Conversational Prompt Header */}
            <h2 className="text-lg sm:text-xl font-black text-on-surface mb-4">
                هم‌پای هوشمند <span className="text-primary">{displayName}</span> آماده است
            </h2>

            {/* Concise Action Starters */}
            <motion.div
                variants={STAGGER_CONTAINER_VARIANTS}
                initial={prefersReducedMotion ? false : 'hidden'}
                animate="visible"
                className="flex flex-col gap-2.5 w-full mb-2"
            >
                {BENTO_PROMPTS.map((prompt, idx) => {
                    const Icon = prompt.Icon;
                    return (
                        <motion.button
                            key={idx}
                            variants={STAGGER_ITEM_VARIANTS}
                            type="button"
                            onClick={() => onPromptSelect(prompt.text)}
                            className="group w-full text-start p-3.5 sm:p-4 rounded-[20px] bg-[var(--surface-elevated)] hover:bg-surface-container-low transition flex items-center justify-between gap-3 active:scale-[0.99] border border-[var(--border-subtle)] cursor-pointer"
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
