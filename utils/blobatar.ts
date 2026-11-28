import type { BlobatarConfig, BlobatarExpression, BlobatarShape } from '../types';

export const BLOBATAR_SHAPES: readonly BlobatarShape[] = [
    'boxy',
    'round',
    'organic',
    'capsule',
    'nub',
    'cloud',
    'droplet',
    'hexagon',
    'sun',
    'triangle',
] as const;

export const BLOBATAR_SHAPE_LABELS: Record<BlobatarShape, string> = {
    boxy: 'ربات مربعی (Boxy)',
    round: 'گرد کلاسیک (Round)',
    organic: 'ارگانیک نرم (Organic)',
    capsule: 'کپسولی (Capsule)',
    nub: 'گوش‌دار فانتزی (Nub)',
    cloud: 'ابری (Cloud)',
    droplet: 'قطره‌ای (Droplet)',
    hexagon: 'شش‌ضلعی (Hexagon)',
    sun: 'خورشیدی (Sun)',
    triangle: 'مثلثی نرم (Triangle)',
};

export const BLOBATAR_EXPRESSION_LABELS: Record<BlobatarExpression, string> = {
    idle: 'آرام و آماده',
    happy: 'خوشحال و پرانرژی',
    focused: 'تمرکز عمیق',
    thinking: 'در حال پردازش',
    smug: 'بااعتمادبه‌نفس',
    energetic: 'هیجان‌زده',
};

const HUE_PRESETS = [238, 195, 160, 275, 330, 28, 44, 142, 210, 352] as const;

/**
 * Deterministic 32-bit FNV-1a hash from an arbitrary seed string.
 */
export function hashBlobatarSeed(seed: string): number {
    const normalized = (seed || 'parsaplan').trim().toLowerCase() || 'parsaplan';
    let h = 0x811c9dc5;
    for (let i = 0; i < normalized.length; i++) {
        h ^= normalized.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

function nextRand(state: { value: number }): number {
    let t = (state.value += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export interface ResolvedBlobatarTraits {
    seed: string;
    shape: BlobatarShape;
    hue: number;
    saturation: number;
    lightness: number;
    secondaryHue: number;
    expression: BlobatarExpression;
    eyeSpread: number;
    eyeSize: number;
    eyeY: number;
    isDarkText: boolean;
    bodyFill: string;
    bodyAccent: string;
    featureColor: string;
    cheekColor: string;
    antennaType: 'none' | 'orb' | 'spark';
}

/**
 * Computes WCAG-aware contrast polarity and SVG geometry traits deterministically
 * from username/seed and optional custom overrides (`shape`, `hue`, `expression`).
 */
export function resolveBlobatarTraits(
    rawSeed: string,
    config?: BlobatarConfig,
    runtimeContext?: {
        level?: number;
        streak?: number;
        isFocusRunning?: boolean;
        isThinking?: boolean;
    }
): ResolvedBlobatarTraits {
    const effectiveSeed = (config?.seed?.trim() || rawSeed?.trim() || 'ParsaPlan');
    const prng = { value: hashBlobatarSeed(effectiveSeed) };

    const r1 = nextRand(prng);
    const r2 = nextRand(prng);
    const r3 = nextRand(prng);
    const r4 = nextRand(prng);
    const r5 = nextRand(prng);

    const autoShapeIdx = Math.floor(r1 * BLOBATAR_SHAPES.length) % BLOBATAR_SHAPES.length;
    const shape: BlobatarShape =
        config?.shape && config.shape !== 'auto'
            ? config.shape
            : BLOBATAR_SHAPES[autoShapeIdx];

    const autoHue = HUE_PRESETS[Math.floor(r2 * HUE_PRESETS.length)] + Math.round((r3 - 0.5) * 18);
    const hue =
        typeof config?.hue === 'number' && Number.isFinite(config.hue)
            ? ((config.hue % 360) + 360) % 360
            : ((autoHue % 360) + 360) % 360;

    const saturation = Math.round(68 + r4 * 18); // 68% - 86%
    const lightness = Math.round(52 + r5 * 14);  // 52% - 66%

    // Ensure eye/mouth feature contrast against body luminance
    // Warm yellows/cyans/greens above ~58% perceptual luminance flip to dark slate ink
    const warmLightBoost = (hue >= 38 && hue <= 185) ? 8 : 0;
    const isDarkText = lightness + warmLightBoost >= 59;

    let expression: BlobatarExpression;
    if (runtimeContext?.isThinking) {
        expression = 'thinking';
    } else if (config?.expression && config.expression !== 'auto') {
        expression = config.expression;
    } else if (runtimeContext?.isFocusRunning) {
        expression = 'focused';
    } else if ((runtimeContext?.streak ?? 0) >= 3 || (runtimeContext?.level ?? 1) >= 5) {
        expression = 'happy';
    } else {
        const pool: BlobatarExpression[] = ['idle', 'happy', 'smug', 'energetic'];
        expression = pool[Math.floor(r4 * pool.length) % pool.length];
    }

    const eyeSpread = 12 + Math.round(r3 * 4);
    const eyeSize = shape === 'capsule' || shape === 'triangle' ? 4.4 : 4.8 + r5 * 0.8;
    const eyeY = shape === 'triangle' ? 54 : shape === 'droplet' ? 53 : 46;

    const secondaryHue = (hue + 28) % 360;
    const bodyFill = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const bodyAccent = `hsl(${secondaryHue}, ${Math.min(92, saturation + 6)}%, ${Math.max(38, lightness - 12)}%)`;
    const featureColor = isDarkText ? '#0f172a' : '#ffffff';
    const cheekColor = isDarkText ? 'rgba(225, 29, 72, 0.28)' : 'rgba(255, 255, 255, 0.28)';
    const antennaType: 'none' | 'orb' | 'spark' =
        (runtimeContext?.level ?? 1) >= 10
            ? 'spark'
            : shape === 'boxy' || (runtimeContext?.level ?? 1) >= 5
              ? 'orb'
              : 'none';

    return {
        seed: effectiveSeed,
        shape,
        hue,
        saturation,
        lightness,
        secondaryHue,
        expression,
        eyeSpread,
        eyeSize,
        eyeY,
        isDarkText,
        bodyFill,
        bodyAccent,
        featureColor,
        cheekColor,
        antennaType,
    };
}

/**
 * SVG path data in a normalized 0..100 coordinate space for all 10 Blobatar shapes.
 */
export function getBlobatarShapePath(shape: BlobatarShape): string {
    switch (shape) {
        case 'boxy':
            return 'M 18 24 C 18 17, 22 14, 30 14 L 70 14 C 78 14, 82 17, 82 24 L 84 70 C 84 80, 79 86, 68 86 L 32 86 C 21 86, 16 80, 16 70 Z';
        case 'round':
            return 'M 50 13 C 72 13, 87 28, 87 50 C 87 72, 72 87, 50 87 C 28 87, 13 72, 13 50 C 13 28, 28 13, 50 13 Z';
        case 'organic':
            return 'M 49 14 C 69 12, 84 23, 86 43 C 88 64, 77 84, 54 86 C 32 88, 13 77, 14 53 C 15 30, 29 16, 49 14 Z';
        case 'capsule':
            return 'M 50 10 C 68 10, 77 20, 77 38 L 77 62 C 77 80, 68 90, 50 90 C 32 90, 23 80, 23 62 L 23 38 C 23 20, 32 10, 50 10 Z';
        case 'nub':
            return 'M 25 22 C 20 14, 31 11, 36 19 C 44 17, 56 17, 64 19 C 69 11, 80 14, 75 22 C 83 31, 86 43, 85 57 C 84 76, 71 86, 50 86 C 29 86, 16 76, 15 57 C 14 43, 17 31, 25 22 Z';
        case 'cloud':
            return 'M 32 79 C 20 79, 13 70, 14 59 C 10 50, 15 37, 25 35 C 27 21, 41 13, 54 17 C 66 14, 80 23, 81 36 C 89 41, 90 54, 84 63 C 85 73, 77 80, 66 80 Z';
        case 'droplet':
            return 'M 50 11 C 57 22, 82 44, 82 62 C 82 78, 68 88, 50 88 C 32 88, 18 78, 18 62 C 18 44, 43 22, 50 11 Z';
        case 'hexagon':
            return 'M 50 12 L 80 28 C 83 30, 84 33, 84 37 L 84 63 C 84 67, 83 70, 80 72 L 50 88 L 20 72 C 17 70, 16 67, 16 63 L 16 37 C 16 33, 17 30, 20 28 Z';
        case 'sun':
            return 'M 50 10 L 58 18 L 69 14 L 72 25 L 84 26 L 81 37 L 90 45 L 82 54 L 87 65 L 76 69 L 76 81 L 64 80 L 57 89 L 47 83 L 36 88 L 32 78 L 20 79 L 22 67 L 12 61 L 19 50 L 12 39 L 21 33 L 19 21 L 31 21 L 37 12 L 47 18 Z';
        case 'triangle':
            return 'M 50 14 C 55 14, 59 17, 62 22 L 83 66 C 87 74, 82 84, 72 84 L 28 84 C 18 84, 13 74, 17 66 L 38 22 C 41 17, 45 14, 50 14 Z';
    }
}

export interface GamifiedBotRank {
    title: string;
    badgeBg: string;
    tier: 'starter' | 'explorer' | 'knight' | 'legend';
}

export function getGamifiedBotRank(level: number, streak = 0): GamifiedBotRank {
    if (level >= 10) {
        return {
            title: 'استاد افسانه‌ای',
            badgeBg: 'from-amber-400 to-orange-500 text-slate-950',
            tier: 'legend',
        };
    }
    if (level >= 5 || streak >= 7) {
        return {
            title: 'شوالیه تمرکز',
            badgeBg: 'from-indigo-500 to-violet-600 text-white',
            tier: 'knight',
        };
    }
    if (level >= 2 || streak >= 2) {
        return {
            title: 'هم‌پای رو‌به‌رشد',
            badgeBg: 'from-emerald-500 to-teal-600 text-white',
            tier: 'explorer',
        };
    }
    return {
        title: 'ربات نوپا',
        badgeBg: 'from-slate-500 to-slate-700 text-white',
        tier: 'starter',
    };
}

export function buildBlobatarReferenceUrl(seed: string, config?: BlobatarConfig): string {
    const params = new URLSearchParams();
    params.set('name', (config?.seed?.trim() || seed || 'Parsashz'));
    if (config?.shape && config.shape !== 'auto') {
        params.set('shape', config.shape);
    }
    if (config?.expression && config.expression !== 'auto') {
        params.set('expression', config.expression);
    }
    return `https://blobatar.dev/?${params.toString()}`;
}

export function generateBlobatarSvgMarkup(seed: string, config?: BlobatarConfig, size = 128): string {
    const t = resolveBlobatarTraits(seed, config);
    const bodyPath = getBlobatarShapePath(t.shape);
    const lx = 50 - t.eyeSpread;
    const rx = 50 + t.eyeSpread;
    const ey = t.eyeY;
    const mouthPath =
        t.expression === 'happy' || t.expression === 'energetic'
            ? `M ${50 - 7} ${ey + 11} Q 50 ${ey + 19} ${50 + 7} ${ey + 11}`
            : t.expression === 'smug'
              ? `M ${50 - 5} ${ey + 13} Q ${50 + 2} ${ey + 16} ${50 + 7} ${ey + 11}`
              : t.expression === 'thinking'
                ? `M ${50 - 4} ${ey + 13} L ${50 + 4} ${ey + 12}`
                : `M ${50 - 5} ${ey + 12} Q 50 ${ey + 16} ${50 + 5} ${ey + 12}`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" fill="none">
  <defs>
    <linearGradient id="bg-${t.hue}" x1="15%" y1="10%" x2="85%" y2="90%">
      <stop offset="0%" stop-color="${t.bodyFill}"/>
      <stop offset="100%" stop-color="${t.bodyAccent}"/>
    </linearGradient>
  </defs>
  <path d="${bodyPath}" fill="url(#bg-${t.hue})" />
  <ellipse cx="42" cy="28" rx="18" ry="8" fill="rgba(255,255,255,0.22)" transform="rotate(-14 42 28)" />
  <circle cx="${lx - 4}" cy="${ey + 8}" r="4.5" fill="${t.cheekColor}" />
  <circle cx="${rx + 4}" cy="${ey + 8}" r="4.5" fill="${t.cheekColor}" />
  <rect x="${lx - t.eyeSize}" y="${ey - t.eyeSize * 1.15}" width="${t.eyeSize * 2}" height="${t.eyeSize * 2.3}" rx="${t.eyeSize}" fill="${t.featureColor}" />
  <rect x="${rx - t.eyeSize}" y="${ey - t.eyeSize * 1.15}" width="${t.eyeSize * 2}" height="${t.eyeSize * 2.3}" rx="${t.eyeSize}" fill="${t.featureColor}" />
  <path d="${mouthPath}" stroke="${t.featureColor}" stroke-width="3.2" stroke-linecap="round" fill="none" />
</svg>`;
}
