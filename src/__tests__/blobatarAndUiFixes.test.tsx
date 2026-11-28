import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
    resolveBlobatarTraits,
    generateBlobatarSvgMarkup,
    getGamifiedBotRank,
    BLOBATAR_SHAPES,
} from '../../utils/blobatar';
import { BlobatarBot } from '../../components/ui/BlobatarBot';
import { WelcomeScreen } from '../../components/AIChat/WelcomeScreen';

describe('Gamified Blobatar Bot & Centerpiece Integration', () => {
    it('generates deterministic traits from username seed and respects explicit shape override like boxy', () => {
        const a = resolveBlobatarTraits('Parsashz', { shape: 'boxy' });
        const b = resolveBlobatarTraits('Parsashz', { shape: 'boxy' });
        const other = resolveBlobatarTraits('AnotherStudent');

        expect(a).toEqual(b);
        expect(a.shape).toBe('boxy');
        expect(a.bodyFill).not.toBe(other.bodyFill);
        expect(BLOBATAR_SHAPES).toContain(other.shape);
    });

    it('produces valid standalone SVG markup and evolves gamified rank by level and streak', () => {
        const svg = generateBlobatarSvgMarkup('Parsashz', { shape: 'boxy', hue: 238, expression: 'happy' });
        expect(svg).toContain('<svg');
        expect(svg).toContain('viewBox="0 0 100 100"');

        expect(getGamifiedBotRank(1, 0).tier).toBe('starter');
        expect(getGamifiedBotRank(5, 0).tier).toBe('knight');
        expect(getGamifiedBotRank(10, 0).tier).toBe('legend');
    });

    it('renders BlobatarBot with level badge and inside AI WelcomeScreen center without legacy clutter', () => {
        const { rerender } = render(
            <BlobatarBot seed="Parsashz" config={{ shape: 'boxy' }} level={7} streak={4} showLevelBadge />
        );
        expect(screen.getByText('Lv.7')).toBeInTheDocument();

        rerender(
            <WelcomeScreen
                onPromptSelect={() => {}}
                userName="پارسا"
                botSeed="Parsashz"
                botConfig={{ shape: 'boxy' }}
                level={7}
                xp={640}
                streak={4}
            />
        );
        expect(screen.getByText(/شوالیه تمرکز/)).toBeInTheDocument();
        expect(screen.getByText(/هم‌پای هوشمند/)).toBeInTheDocument();
        expect(screen.queryByText(/کار و پروژه/)).not.toBeInTheDocument();
    });
});
