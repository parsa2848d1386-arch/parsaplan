import { describe, it, expect } from 'vitest';
import { parseBrainDumpText } from '../../utils/brainDumpParser';

describe('brainDumpParser (Persian & English heuristic NLP)', () => {
    it('extracts subject, Persian digit time range, and urgent priority', () => {
        const res = parseBrainDumpText('مطالعه فصل ۳ زیست ساعت ۱۰ تا ۱۱:۳۰ فوری');
        expect(res).toHaveLength(1);
        expect(res[0].subject).toBe('زیست‌شناسی');
        expect(res[0].startTime).toBe('10:00');
        expect(res[0].durationMinutes).toBe(90);
        expect(res[0].priority).toBe('urgent');
    });

    it('parses tomorrow offset, speed-test type, and explicit duration', () => {
        const res = parseBrainDumpText('تست سرعتی فیزیک سینماتیک ۴۵ دقیقه فردا ساعت ۶ عصر');
        expect(res).toHaveLength(1);
        expect(res[0].subject).toBe('فیزیک');
        expect(res[0].studyType).toBe('test_speed');
        expect(res[0].durationMinutes).toBe(45);
        expect(res[0].dateOffset).toBe(1);
        expect(res[0].startTime).toBe('18:00');
    });

    it('handles multi-line dumps and empty strings gracefully', () => {
        expect(parseBrainDumpText('   \n  ')).toEqual([]);

        const multi = parseBrainDumpText(
            '- شیمی استوکیومتری نیم ساعت\n- مرور لغات زبان انگلیسی'
        );
        expect(multi).toHaveLength(2);
        expect(multi[0].subject).toBe('شیمی');
        expect(multi[0].durationMinutes).toBe(30);
        expect(multi[1].subject).toBe('زبان انگلیسی');
        expect(multi[1].studyType).toBe('review');
    });

    it('parses general life, work, fitness, finance, and meeting tasks accurately', () => {
        const lifeTasks = parseBrainDumpText(
            'ورزش و باشگاه ۱ ساعت عصر ساعت ۶ عصر\nجلسه با تیم پروژه فردا ساعت ۱۱ فوری\nخرید منزل ۳۰ دقیقه'
        );
        expect(lifeTasks).toHaveLength(3);
        expect(lifeTasks[0].subject).toBe('ورزش و سلامت');
        expect(lifeTasks[0].studyType).toBe('health');
        expect(lifeTasks[0].durationMinutes).toBe(60);
        expect(lifeTasks[0].startTime).toBe('18:00');

        expect(lifeTasks[1].subject).toBe('جلسات و هماهنگی');
        expect(lifeTasks[1].studyType).toBe('meeting');
        expect(lifeTasks[1].dateOffset).toBe(1);
        expect(lifeTasks[1].priority).toBe('urgent');

        expect(lifeTasks[2].subject).toBe('خرید و کارهای منزل');
        expect(lifeTasks[2].durationMinutes).toBe(30);
    });
});
