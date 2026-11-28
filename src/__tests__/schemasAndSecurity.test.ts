import { describe, it, expect } from 'vitest';
import {
    aiTaskActionSchema,
    aiBrainDumpItemSchema,
    backupImportSchema,
    geminiGenerateRequestSchema,
    geminiChatRequestSchema,
} from '../../utils/schemas';
import { sanitizeMarkdownUrl } from '../../components/AIChat/ChatMessage';
import { calculateBackoff } from '../../services/syncEngine';

describe('Zod 4 Schemas & Defense-in-Depth Security', () => {
    it('validates valid and rejects malformed AI task action blocks', () => {
        const valid = aiTaskActionSchema.safeParse({
            action: {
                type: 'preview_tasks',
                tasks: [{ topic: 'حل تست فصل ۲', subject: 'ریاضی', durationMinutes: 60 }],
            },
        });
        expect(valid.success).toBe(true);

        const invalid = aiTaskActionSchema.safeParse({
            action: {
                type: 'invalid_action',
                tasks: 'not-an-array',
            },
        });
        expect(invalid.success).toBe(false);
    });

    it('sanitizes/clamps or rejects brain dump items cleanly via Zod 4', () => {
        const clamped = aiBrainDumpItemSchema.safeParse({
            topic: 'مرور خلاصه نکات',
            durationMinutes: 9999,
            priority: 'high',
        });
        expect(clamped.success).toBe(true);
        if (clamped.success) {
            expect(clamped.data.durationMinutes).toBe(60);
        }

        const badDate = aiBrainDumpItemSchema.safeParse({
            topic: 'تمرین',
            date: 'invalid-date-format',
        });
        expect(badDate.success).toBe(false);
    });

    it('validates backup JSON structure safely on import', () => {
        const goodBackup = backupImportSchema.safeParse({
            tasks: [{ id: 't1', topic: 'تمرین', durationMinutes: 30 }],
            xp: 120,
        });
        expect(goodBackup.success).toBe(true);

        const badBackup = backupImportSchema.safeParse({
            tasks: 'corrupted',
        });
        expect(badBackup.success).toBe(false);
    });

    it('validates /api/gemini request schemas cleanly', () => {
        expect(geminiGenerateRequestSchema.safeParse({ prompt: 'سلام' }).success).toBe(true);
        expect(geminiGenerateRequestSchema.safeParse({ prompt: '' }).success).toBe(false);
        expect(
            geminiChatRequestSchema.safeParse({
                message: 'برنامه فردا چیه؟',
                history: [{ role: 'user', text: 'سلام' }],
            }).success
        ).toBe(true);
        expect(
            geminiChatRequestSchema.safeParse({
                message: 'تست پیوست زیاد',
                attachments: new Array(6).fill({ name: 'file.pdf' }),
            }).success
        ).toBe(false);
    });

    it('blocks dangerous markdown link protocols while preserving safe URLs', () => {
        expect(sanitizeMarkdownUrl('javascript:alert(1)')).toBe('');
        expect(sanitizeMarkdownUrl('  JaVaScRiPt:void(0) ')).toBe('');
        expect(sanitizeMarkdownUrl('data:text/html,<script>alert(1)</script>')).toBe('');
        expect(sanitizeMarkdownUrl('https://parsaplan.ir/guide')).toBe('https://parsaplan.ir/guide');
        expect(sanitizeMarkdownUrl('#section-1')).toBe('#section-1');
    });

    it('bounds offline outbox exponential backoff cleanly', () => {
        for (let attempt = 0; attempt <= 12; attempt++) {
            const delay = calculateBackoff(attempt);
            expect(delay).toBeGreaterThanOrEqual(250);
            expect(delay).toBeLessThanOrEqual(45000);
        }
    });
});
