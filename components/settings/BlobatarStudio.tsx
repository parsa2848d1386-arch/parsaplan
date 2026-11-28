import React, { useMemo } from 'react';
import { Dices, Download, Sparkles, Palette, Smile } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import type { BlobatarConfig, BlobatarExpression, BlobatarShape } from '../../types';
import { BlobatarBot } from '../ui/BlobatarBot';
import {
    BLOBATAR_SHAPES,
    BLOBATAR_SHAPE_LABELS,
    BLOBATAR_EXPRESSION_LABELS,
    generateBlobatarSvgMarkup,
    getGamifiedBotRank,
    buildBlobatarReferenceUrl,
} from '../../utils/blobatar';
import { formatToPersianDigits } from '../../utils';
import { haptics } from '../../utils/haptics';

const HUE_SWATCHES = [
    { label: 'خودکار', value: 'auto' as const, color: 'linear-gradient(135deg, #6366f1, #ec4899, #10b981)' },
    { label: 'نیلی پارسا', value: 238, color: 'hsl(238, 76%, 58%)' },
    { label: 'فیروزه‌ای', value: 192, color: 'hsl(192, 78%, 54%)' },
    { label: 'زمردی', value: 156, color: 'hsl(156, 74%, 50%)' },
    { label: 'بنفش', value: 274, color: 'hsl(274, 76%, 60%)' },
    { label: 'سرخابی', value: 332, color: 'hsl(332, 78%, 58%)' },
    { label: 'نارنجی', value: 26, color: 'hsl(26, 84%, 56%)' },
    { label: 'طلایی', value: 44, color: 'hsl(44, 86%, 56%)' },
] as const;

const RANDOM_SEEDS = [
    'Parsashz',
    'FocusKnight',
    'DeepWorkBot',
    'StudyLegend',
    'PixelScholar',
    'TurboMind',
    'NovaPlanner',
    'ZenCoder',
];

/**
 * Interactive customizer for each user's unique gamified Blobatar bot avatar.
 */
export const BlobatarStudio: React.FC = () => {
    const {
        userName,
        user,
        settings,
        updateSettings,
        level = 1,
        xp = 0,
        streakStats,
        showToast,
    } = useStore();

    const defaultSeed = userName || user?.displayName || user?.email?.split('@')[0] || 'Parsashz';
    const currentConfig: BlobatarConfig = settings?.blobatar ?? {
        shape: 'boxy',
        hue: 'auto',
        expression: 'auto',
    };

    const effectiveSeed = currentConfig.seed?.trim() || defaultSeed;
    const rank = useMemo(
        () => getGamifiedBotRank(level, streakStats?.currentStreak ?? 0),
        [level, streakStats?.currentStreak]
    );

    const updateBot = (patch: Partial<BlobatarConfig>) => {
        haptics.selection();
        updateSettings({
            blobatar: {
                ...currentConfig,
                ...patch,
            },
        });
    };

    const handleRandomize = () => {
        haptics.medium();
        const randomSeed =
            RANDOM_SEEDS[Math.floor(Math.random() * RANDOM_SEEDS.length)] +
            '-' +
            Math.floor(10 + Math.random() * 89);
        const randomShape = BLOBATAR_SHAPES[Math.floor(Math.random() * BLOBATAR_SHAPES.length)];
        updateSettings({
            blobatar: {
                seed: randomSeed,
                shape: randomShape,
                hue: 'auto',
                expression: 'auto',
            },
        });
    };

    const handleDownloadSvg = () => {
        const svg = generateBlobatarSvgMarkup(effectiveSeed, currentConfig, 256);
        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `blobatar-${effectiveSeed.replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('فایل SVG بات گیمیک ذخیره شد', 'success');
    };

    const referenceUrl = buildBlobatarReferenceUrl(defaultSeed, currentConfig);

    return (
        <section
            id="bot-studio"
            className="bg-[var(--surface-elevated)] squircle-lg shadow-sm border border-[var(--border-subtle)] overflow-hidden"
        >
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/12 text-primary flex items-center justify-center shrink-0">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-on-surface text-base">استودیو بات گیمیک اختصاصی (Blobatar)</h2>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            کاراکتر منحصر‌به‌فرد شما به‌جای عکس پروفایل و در دستیار هوشمند، داشبورد و لیگ نمایش داده می‌شود.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleRandomize}
                        className="min-h-[40px] px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface border border-[var(--border-subtle)] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                        <Dices size={15} className="text-primary" />
                        <span>تصادفی</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleDownloadSvg}
                        className="min-h-[40px] px-3 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 hover:brightness-110 transition cursor-pointer"
                    >
                        <Download size={15} />
                        <span>دانلود SVG</span>
                    </button>
                </div>
            </div>

            <div className="p-5 grid lg:grid-cols-12 gap-6 items-start">
                {/* Live Interactive Preview Stage */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center p-5 rounded-2xl bg-surface-container-low border border-[var(--border-subtle)] text-center gap-3">
                    <BlobatarBot
                        seed={effectiveSeed}
                        config={currentConfig}
                        size="2xl"
                        level={level}
                        streak={streakStats?.currentStreak ?? 0}
                        interactiveGaze
                        showLevelBadge
                        showAura
                    />

                    <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className="text-sm font-black text-on-surface">{effectiveSeed}</span>
                            <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-l ${rank.badgeBg}`}
                            >
                                {rank.title}
                            </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] tabular-nums">
                            سطح {formatToPersianDigits(level)} • {formatToPersianDigits(xp)} XP • زنجیره{' '}
                            {formatToPersianDigits(streakStats?.currentStreak ?? 0)} روز
                        </p>
                        <p className="text-[11px] font-mono text-[var(--text-tertiary)] truncate max-w-[230px]" dir="ltr">
                            {referenceUrl}
                        </p>
                    </div>
                </div>

                {/* Controls Column */}
                <div className="lg:col-span-8 space-y-5">
                    {/* Seed Name */}
                    <div>
                        <label
                            htmlFor="blobatar-seed-input"
                            className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5"
                        >
                            نام یا کلید اختصاصی بات (Seed)
                        </label>
                        <input
                            id="blobatar-seed-input"
                            type="text"
                            value={currentConfig.seed ?? ''}
                            onChange={(e) => updateBot({ seed: e.target.value })}
                            placeholder={`پیش‌فرض: ${defaultSeed} (مثلاً Parsashz)`}
                            className="w-full min-h-[44px] bg-surface-container-low border border-[var(--border-subtle)] rounded-xl px-4 py-2 text-sm text-on-surface outline-none focus:border-primary"
                            dir="ltr"
                        />
                    </div>

                    {/* Silhouette Shape Grid */}
                    <div>
                        <span className="block text-xs font-bold text-[var(--text-secondary)] mb-2">
                            شکل بدنه (Silhouette)
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            <button
                                type="button"
                                onClick={() => updateBot({ shape: 'auto' })}
                                aria-pressed={!currentConfig.shape || currentConfig.shape === 'auto'}
                                className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 text-[11px] font-bold transition cursor-pointer ${
                                    !currentConfig.shape || currentConfig.shape === 'auto'
                                        ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                                        : 'border-[var(--border-subtle)] bg-surface-container-low text-[var(--text-secondary)] hover:bg-surface-container'
                                }`}
                            >
                                <Dices size={20} />
                                <span className="truncate w-full text-center">بر اساس نام</span>
                            </button>

                            {BLOBATAR_SHAPES.map((shape: BlobatarShape) => {
                                const selected = currentConfig.shape === shape;
                                return (
                                    <button
                                        key={shape}
                                        type="button"
                                        onClick={() => updateBot({ shape })}
                                        aria-pressed={selected}
                                        title={BLOBATAR_SHAPE_LABELS[shape]}
                                        className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 text-[11px] font-bold transition cursor-pointer ${
                                            selected
                                                ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                                                : 'border-[var(--border-subtle)] bg-surface-container-low text-[var(--text-secondary)] hover:bg-surface-container'
                                        }`}
                                    >
                                        <BlobatarBot
                                            seed={effectiveSeed}
                                            config={{ ...currentConfig, shape }}
                                            size="xs"
                                        />
                                        <span className="truncate w-full text-center capitalize">{shape}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Hue & Expression Row */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs font-bold text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                                <Palette size={14} className="text-primary" />
                                طیف رنگی بات
                            </span>
                            <div className="flex flex-wrap gap-2 items-center">
                                {HUE_SWATCHES.map((sw) => {
                                    const active =
                                        (sw.value === 'auto' &&
                                            (currentConfig.hue === undefined || currentConfig.hue === 'auto')) ||
                                        currentConfig.hue === sw.value;
                                    return (
                                        <button
                                            key={String(sw.value)}
                                            type="button"
                                            title={sw.label}
                                            aria-label={sw.label}
                                            aria-pressed={active}
                                            onClick={() => updateBot({ hue: sw.value })}
                                            className={`w-8 h-8 rounded-full border-2 transition cursor-pointer ${
                                                active
                                                    ? 'border-on-surface scale-110 ring-2 ring-primary/40'
                                                    : 'border-white/40 dark:border-slate-700 hover:scale-105'
                                            }`}
                                            style={{ background: sw.color }}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="blobatar-expression-select"
                                className="text-xs font-bold text-[var(--text-secondary)] mb-2 flex items-center gap-1.5"
                            >
                                <Smile size={14} className="text-primary" />
                                حالت چهره و واکنش
                            </label>
                            <select
                                id="blobatar-expression-select"
                                value={currentConfig.expression ?? 'auto'}
                                onChange={(e) =>
                                    updateBot({
                                        expression: e.target.value as BlobatarExpression | 'auto',
                                    })
                                }
                                className="w-full min-h-[44px] bg-surface-container-low border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
                            >
                                <option value="auto">پویا (هماهنگ با تایمر فوکوس، سطح و زنجیره)</option>
                                {(Object.keys(BLOBATAR_EXPRESSION_LABELS) as BlobatarExpression[]).map((exp) => (
                                    <option key={exp} value={exp}>
                                        {BLOBATAR_EXPRESSION_LABELS[exp]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
