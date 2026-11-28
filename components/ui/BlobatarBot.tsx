import React, { useId, useMemo, useState, useRef, useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { BlobatarConfig } from '../../types';
import {
    resolveBlobatarTraits,
    getBlobatarShapePath,
    getGamifiedBotRank,
} from '../../utils/blobatar';

export type BlobatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface BlobatarBotProps {
    seed: string;
    config?: BlobatarConfig;
    size?: BlobatarSize;
    level?: number;
    streak?: number;
    isFocusRunning?: boolean;
    isThinking?: boolean;
    interactiveGaze?: boolean;
    showLevelBadge?: boolean;
    showAura?: boolean;
    className?: string;
    title?: string;
}

const SIZE_CLASSES: Record<BlobatarSize, string> = {
    xs: 'w-7 h-7',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
    '2xl': 'w-24 h-24 sm:w-28 sm:h-28',
};

/**
 * Deterministic offline-first gamified Blobatar SVG avatar with optional pointer gaze,
 * blinking/breathing loops, contrast-safe features, and ParsaPlan RPG rank flair.
 */
export const BlobatarBot: React.FC<BlobatarBotProps> = React.memo(
    ({
        seed,
        config,
        size = 'md',
        level = 1,
        streak = 0,
        isFocusRunning = false,
        isThinking = false,
        interactiveGaze = false,
        showLevelBadge = false,
        showAura = false,
        className = '',
        title,
    }) => {
        const prefersReducedMotion = useReducedMotion();
        const gradientId = useId().replace(/:/g, '');
        const containerRef = useRef<HTMLDivElement>(null);
        const [gaze, setGaze] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

        const traits = useMemo(
            () =>
                resolveBlobatarTraits(seed, config, {
                    level,
                    streak,
                    isFocusRunning,
                    isThinking,
                }),
            [seed, config, level, streak, isFocusRunning, isThinking]
        );

        const rank = useMemo(() => getGamifiedBotRank(level, streak), [level, streak]);
        const bodyPath = useMemo(() => getBlobatarShapePath(traits.shape), [traits.shape]);

        const handlePointerMove = useCallback(
            (e: React.PointerEvent<HTMLDivElement>) => {
                if (!interactiveGaze || prefersReducedMotion || !containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();
                const nx = ((e.clientX - (rect.left + rect.width / 2)) / Math.max(rect.width, 40)) * 3.4;
                const ny = ((e.clientY - (rect.top + rect.height / 2)) / Math.max(rect.height, 40)) * 2.6;
                setGaze({
                    x: Math.max(-3.2, Math.min(3.2, nx)),
                    y: Math.max(-2.4, Math.min(2.4, ny)),
                });
            },
            [interactiveGaze, prefersReducedMotion]
        );

        const handlePointerLeave = useCallback(() => {
            if (interactiveGaze) setGaze({ x: 0, y: 0 });
        }, [interactiveGaze]);

        const lx = 50 - traits.eyeSpread;
        const rx = 50 + traits.eyeSpread;
        const ey = traits.eyeY;
        const eyeRx = traits.eyeSize;
        const eyeRy =
            traits.expression === 'happy'
                ? traits.eyeSize * 1.25
                : traits.expression === 'focused'
                  ? traits.eyeSize * 0.92
                  : traits.eyeSize * 1.15;

        const mouthPath = (() => {
            switch (traits.expression) {
                case 'happy':
                    return `M ${50 - 7.5} ${ey + 11} Q 50 ${ey + 19.5} ${50 + 7.5} ${ey + 11}`;
                case 'energetic':
                    return `M ${50 - 8} ${ey + 11} Q 50 ${ey + 21} ${50 + 8} ${ey + 11} Z`;
                case 'smug':
                    return `M ${50 - 5.5} ${ey + 13} Q ${50 + 1} ${ey + 16.5} ${50 + 7.5} ${ey + 10.5}`;
                case 'focused':
                    return `M ${50 - 5.5} ${ey + 13} L ${50 + 5.5} ${ey + 13}`;
                case 'thinking':
                    return `M ${50 - 4} ${ey + 13.5} Q 50 ${ey + 11} ${50 + 4.5} ${ey + 13}`;
                case 'idle':
                default:
                    return `M ${50 - 5.5} ${ey + 12} Q 50 ${ey + 16.5} ${50 + 5.5} ${ey + 12}`;
            }
        })();

        const effectiveGazeX = traits.expression === 'thinking' ? 2.1 : gaze.x;
        const effectiveGazeY = traits.expression === 'thinking' ? -1.4 : gaze.y;

        return (
            <div
                ref={containerRef}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                title={title}
                className={`relative inline-flex items-center justify-center shrink-0 select-none ${SIZE_CLASSES[size]} ${className}`}
            >
                {showAura && (
                    <span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-full opacity-45 blur-md pointer-events-none"
                        style={{ backgroundColor: traits.bodyFill }}
                    />
                )}

                <svg
                    viewBox="0 0 100 100"
                    className={`w-full h-full relative z-10 overflow-visible ${
                        !prefersReducedMotion && interactiveGaze ? 'transition-transform duration-300 hover:scale-105' : ''
                    }`}
                    aria-hidden="true"
                >
                    <defs>
                        <linearGradient id={`blobGrad-${gradientId}`} x1="15%" y1="10%" x2="88%" y2="90%">
                            <stop offset="0%" stopColor={traits.bodyFill} />
                            <stop offset="100%" stopColor={traits.bodyAccent} />
                        </linearGradient>
                    </defs>

                    {/* Optional Gamified Rank Antenna / Crown Detail */}
                    {traits.antennaType === 'orb' && (
                        <g>
                            <line
                                x1="50"
                                y1="14"
                                x2="50"
                                y2="5"
                                stroke={traits.bodyAccent}
                                strokeWidth="3.2"
                                strokeLinecap="round"
                            />
                            <circle cx="50" cy="4.5" r="4" fill={traits.bodyFill} stroke={traits.bodyAccent} strokeWidth="1.8" />
                        </g>
                    )}
                    {traits.antennaType === 'spark' && (
                        <path
                            d="M 50 1 L 52.8 6.8 L 59 7.8 L 54.4 11.8 L 55.6 17.5 L 50 14.5 L 44.4 17.5 L 45.6 11.8 L 41 7.8 L 47.2 6.8 Z"
                            fill="#fbbf24"
                            stroke="#d97706"
                            strokeWidth="1.2"
                        />
                    )}

                    {/* Blob Body Silhouette */}
                    <path
                        d={bodyPath}
                        fill={`url(#blobGrad-${gradientId})`}
                        stroke="rgba(255,255,255,0.22)"
                        strokeWidth="1.5"
                    />

                    {/* Soft Specular Highlight */}
                    <ellipse
                        cx="41"
                        cy="26"
                        rx="16"
                        ry="6.8"
                        fill="rgba(255,255,255,0.24)"
                        transform="rotate(-14 41 26)"
                    />

                    {/* Subtle Cheek Blush */}
                    <circle cx={lx - 4.5} cy={ey + 7.5} r="4.2" fill={traits.cheekColor} />
                    <circle cx={rx + 4.5} cy={ey + 7.5} r="4.2" fill={traits.cheekColor} />

                    {/* Expressive Eyes with Pointer Gaze */}
                    <g
                        style={{
                            transform: `translate(${effectiveGazeX}px, ${effectiveGazeY}px)`,
                            transition: prefersReducedMotion ? undefined : 'transform 140ms ease-out',
                        }}
                    >
                        {traits.expression === 'smug' ? (
                            <>
                                <line
                                    x1={lx - eyeRx}
                                    y1={ey - 2}
                                    x2={lx + eyeRx}
                                    y2={ey}
                                    stroke={traits.featureColor}
                                    strokeWidth="3.4"
                                    strokeLinecap="round"
                                />
                                <line
                                    x1={rx - eyeRx}
                                    y1={ey}
                                    x2={rx + eyeRx}
                                    y2={ey - 2}
                                    stroke={traits.featureColor}
                                    strokeWidth="3.4"
                                    strokeLinecap="round"
                                />
                                <circle cx={lx} cy={ey + 2.5} r={eyeRx * 0.72} fill={traits.featureColor} />
                                <circle cx={rx} cy={ey + 2.5} r={eyeRx * 0.72} fill={traits.featureColor} />
                            </>
                        ) : traits.expression === 'focused' ? (
                            <>
                                <rect
                                    x={lx - eyeRx * 1.1}
                                    y={ey - eyeRy * 0.68}
                                    width={eyeRx * 2.2}
                                    height={eyeRy * 1.4}
                                    rx={eyeRx * 0.65}
                                    fill={traits.featureColor}
                                />
                                <rect
                                    x={rx - eyeRx * 1.1}
                                    y={ey - eyeRy * 0.68}
                                    width={eyeRx * 2.2}
                                    height={eyeRy * 1.4}
                                    rx={eyeRx * 0.65}
                                    fill={traits.featureColor}
                                />
                                {/* Tiny glint */}
                                <circle
                                    cx={lx - 1.2}
                                    cy={ey - 1.2}
                                    r="1.4"
                                    fill={traits.isDarkText ? '#ffffff' : traits.bodyFill}
                                    opacity="0.9"
                                />
                                <circle
                                    cx={rx - 1.2}
                                    cy={ey - 1.2}
                                    r="1.4"
                                    fill={traits.isDarkText ? '#ffffff' : traits.bodyFill}
                                    opacity="0.9"
                                />
                            </>
                        ) : (
                            <>
                                <rect
                                    x={lx - eyeRx}
                                    y={ey - eyeRy}
                                    width={eyeRx * 2}
                                    height={eyeRy * 2}
                                    rx={eyeRx}
                                    fill={traits.featureColor}
                                >
                                    {!prefersReducedMotion && (
                                        <animate
                                            attributeName="height"
                                            values={`${eyeRy * 2};${eyeRy * 2};2.2;${eyeRy * 2}`}
                                            keyTimes="0;0.92;0.96;1"
                                            dur={traits.expression === 'thinking' ? '1.8s' : '4.2s'}
                                            repeatCount="indefinite"
                                        />
                                    )}
                                </rect>
                                <rect
                                    x={rx - eyeRx}
                                    y={ey - eyeRy}
                                    width={eyeRx * 2}
                                    height={eyeRy * 2}
                                    rx={eyeRx}
                                    fill={traits.featureColor}
                                >
                                    {!prefersReducedMotion && (
                                        <animate
                                            attributeName="height"
                                            values={`${eyeRy * 2};${eyeRy * 2};2.2;${eyeRy * 2}`}
                                            keyTimes="0;0.92;0.96;1"
                                            dur={traits.expression === 'thinking' ? '1.8s' : '4.2s'}
                                            repeatCount="indefinite"
                                        />
                                    )}
                                </rect>
                                {/* Specular eye catchlights */}
                                <circle
                                    cx={lx - eyeRx * 0.32}
                                    cy={ey - eyeRy * 0.35}
                                    r={Math.max(1.2, eyeRx * 0.3)}
                                    fill={traits.isDarkText ? '#ffffff' : 'rgba(255,255,255,0.65)'}
                                />
                                <circle
                                    cx={rx - eyeRx * 0.32}
                                    cy={ey - eyeRy * 0.35}
                                    r={Math.max(1.2, eyeRx * 0.3)}
                                    fill={traits.isDarkText ? '#ffffff' : 'rgba(255,255,255,0.65)'}
                                />
                            </>
                        )}

                        {/* Expressive Mouth */}
                        <path
                            d={mouthPath}
                            stroke={traits.featureColor}
                            strokeWidth="3.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill={traits.expression === 'energetic' ? traits.featureColor : 'none'}
                        />
                    </g>
                </svg>

                {showLevelBadge && (
                    <span
                        className={`absolute -bottom-1.5 -start-1.5 z-20 px-1.5 py-0.5 rounded-full bg-gradient-to-l ${rank.badgeBg} text-[10px] font-black shadow-sm border border-white/60 dark:border-slate-900 tabular-nums leading-none`}
                    >
                        Lv.{level}
                    </span>
                )}
            </div>
        );
    }
);
BlobatarBot.displayName = 'BlobatarBot';
