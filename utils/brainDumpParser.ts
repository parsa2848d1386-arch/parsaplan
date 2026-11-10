import { SUBJECT_ICONS, StudyType, TaskPriority } from '../types';
import { normalizeFarsiNums } from '../utils';

export interface ParsedBrainDumpTask {
    id: string;
    subject: string;
    topic: string;
    details: string;
    startTime?: string;
    durationMinutes: number;
    priority: TaskPriority;
    studyType: StudyType;
    dateOffset: number;
}

const SUBJECT_KEYWORDS: { subject: string; regex: RegExp }[] = [
    // Universal life, work, health, finance & creative domains
    { subject: 'ورزش و سلامت', regex: /ورزش|باشگاه|بدنسازی|دویدن|پیاده‌روی|یوگا|شنا|پزشک|دارو|دکتر|سلامت/i },
    { subject: 'جلسات و هماهنگی', regex: /جلسه|میتینگ|مصاحبه|زنگ|تماس با|قرار ملاقات|هم‌فکری|meeting|call/i },
    { subject: 'مهارت و کدنویسی', regex: /کد|برنامه‌نویسی|ری‌اکت|تایپ‌اسکریپت|پایتون|دیباگ|توسعه|گیت|ui|ux|طراحی سایت/i },
    { subject: 'کار و پروژه', regex: /پروژه|گزارش|فریلنس|مشتری|ارائه|اسلاید|کار|اداره|ایمیل|رزومه/i },
    { subject: 'مالی و بودجه', regex: /بانک|قبض|قسط|وام|حقوق|بودجه|پس‌انداز|خرید سهام|مالی|حسابداری|فاکتور/i },
    { subject: 'خرید و کارهای منزل', regex: /خرید|سوپرمارکت|نانوایی|تمیز|شستن|مرتب کردن|منزل|خانه|آشپزی|تعمیر/i },
    { subject: 'خانواده و روابط', regex: /خانواده|مادر|پدر|همسر|دوست|مهمانی|هدیه|تولد|دیدار/i },
    { subject: 'بازاریابی و محتوا', regex: /محتوا|پست|رپورتاژ|ویدیو|ادیت|اینستاگرام|یوتیوب|بلاگ|سناریو/i },
    { subject: 'توسعه فردی', regex: /مدیتیشن|تنفس|شکرگزاری|عادت|ژورنال|برنامه‌ریزی هفتگی/i },
    { subject: 'مطالعه و کتاب', regex: /کتاب|پادکست|مقاله|پژوهش|سخنرانی/i },
    { subject: 'تفریح و استراحت', regex: /فیلم|سریال|گیم|سفر|کافه|استراحت|تفریح|موسیقی/i },

    // Academic & study keywords
    { subject: 'زیست‌شناسی', regex: /زیست|ژنتیک|گیاهی|جانوری|سلولی/i },
    { subject: 'فیزیک', regex: /فیزیک|مکانیک|مغناطیس|الکتریسیته|نوسان|سینماتیک|دینامیک/i },
    { subject: 'شیمی', regex: /شیمی|استوکیومتری|آلی|اسید|باز|ترمودینامیک|سینتیک/i },
    { subject: 'ریاضیات', regex: /ریاضی|حسابان|مشتق|انتگرال|حد|تابع|معادله/i },
    { subject: 'هندسه', regex: /هندسه|مخروط|دایره|مثلث|بردار/i },
    { subject: 'آمار و احتمال', regex: /آمار|احتمال|ترکیبیات/i },
    { subject: 'ریاضیات گسسته', regex: /گسسته|گراف|نظریه اعداد/i },
    { subject: 'زمین‌شناسی', regex: /زمین|کانی|سنگ/i },
    { subject: 'ادبیات فارسی', regex: /ادبیات|فارسی|آرایه|قرابت|دستور|لغت/i },
    { subject: 'علوم و فنون ادبی', regex: /فنون|عروض|قافیه/i },
    { subject: 'عربی', regex: /عربی|صرف|نحو|ترجمه|تعریب/i },
    { subject: 'دین و زندگی', regex: /دینی|دین و زندگی|آیه|پیام/i },
    { subject: 'زبان انگلیسی', regex: /زبان|انگلیسی|ریدینگ|کلوز|گرامر|english/i },
    { subject: 'فلسفه', regex: /فلسفه/i },
    { subject: 'منطق', regex: /منطق/i },
    { subject: 'اقتصاد', regex: /اقتصاد/i },
    { subject: 'روان‌شناسی', regex: /روان/i },
    { subject: 'جامعه‌شناسی', regex: /جامعه/i },
    { subject: 'تاریخ', regex: /تاریخ/i },
    { subject: 'جغرافیا', regex: /جغرافیا/i },
];

/**
 * Offline-safe heuristic NLP parser supporting Persian & English digits,
 * time expressions, study types, priority, and Iranian Konkoor subjects.
 */
export function parseBrainDumpText(rawText: string): ParsedBrainDumpTask[] {
    if (!rawText || !rawText.trim()) return [];

    const normalized = normalizeFarsiNums(rawText);
    const lines = normalized
        .split(/\n|(?<=[.!?؛])\s+/)
        .map(l => l.trim())
        .filter(l => l.length > 2);

    const items: ParsedBrainDumpTask[] = [];
    let autoHourCursor = 9;

    for (const line of lines) {
        let cleanTitle = line.replace(/^[-*•\d+.)\]]+\s*/, '').trim();

        // 1. Priority
        let priority: TaskPriority = 'medium';
        if (/فوری|حیاتی|حتما|حتماً|اضطراری|urgent|asap/i.test(line)) {
            priority = 'urgent';
            cleanTitle = cleanTitle.replace(/فوری|حیاتی|حتما|حتماً|اضطراری|urgent|asap/gi, '').trim();
        } else if (/مهم|بالا|high/i.test(line)) {
            priority = 'high';
            cleanTitle = cleanTitle.replace(/خیلی مهم|مهم|high/gi, '').trim();
        }

        // 2. Date offset (امروز / فردا / پس فردا)
        let dateOffset = 0;
        if (/پس\s*فردا/i.test(line)) dateOffset = 2;
        else if (/فردا/i.test(line)) dateOffset = 1;

        // 3. Time detection (supports "ساعت 10 تا 11:30", "15:30", "ساعت 18")
        let startTime: string | undefined;
        let durationMinutes = 60;

        const rangeMatch = line.match(/(?:ساعت\s*)?(\d{1,2})(?::(\d{2}))?\s*(?:تا|-|الی)\s*(\d{1,2})(?::(\d{2}))?\s*(صبح|ظهر|عصر|شب)?/);
        if (rangeMatch) {
            let h1 = parseInt(rangeMatch[1], 10);
            const m1 = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : 0;
            let h2 = parseInt(rangeMatch[3], 10);
            const m2 = rangeMatch[4] ? parseInt(rangeMatch[4], 10) : 0;
            const period = rangeMatch[5];

            if ((period === 'عصر' || period === 'شب') && h1 < 12) h1 += 12;
            if ((period === 'عصر' || period === 'شب') && h2 < 12) h2 += 12;

            if (h1 >= 0 && h1 <= 23 && h2 >= 0 && h2 <= 23) {
                startTime = `${String(h1).padStart(2, '0')}:${String(m1).padStart(2, '0')}`;
                const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                if (diff > 0 && diff <= 600) durationMinutes = diff;
            }
        } else {
            const timeMatch = line.match(/(?:ساعت\s*)(\d{1,2})(?::(\d{2}))?\s*(صبح|ظهر|عصر|شب)?|(\d{1,2}):(\d{2})\s*(صبح|ظهر|عصر|شب)?/);
            if (timeMatch) {
                let h = parseInt(timeMatch[1] || timeMatch[4], 10);
                const m = parseInt(timeMatch[2] || timeMatch[5] || '0', 10);
                const period = timeMatch[3] || timeMatch[6];
                if ((period === 'عصر' || period === 'شب') && h < 12) h += 12;
                if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
                    startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                }
            }
        }

        // 4. Explicit duration ("45 دقیقه", "2 ساعت", "1.5 ساعت", "نیم ساعت")
        const minMatch = line.match(/(\d+)\s*(?:دقیقه|min)/i);
        const hourMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:ساعت|hr|hour)/i);
        if (/نیم\s*ساعت/i.test(line)) {
            durationMinutes = 30;
        } else if (minMatch) {
            durationMinutes = Math.max(10, Math.min(480, parseInt(minMatch[1], 10)));
        } else if (hourMatch) {
            durationMinutes = Math.max(15, Math.min(480, Math.round(parseFloat(hourMatch[1]) * 60)));
        }

        if (!startTime) {
            startTime = `${String(autoHourCursor).padStart(2, '0')}:00`;
            autoHourCursor = autoHourCursor + Math.max(1, Math.ceil(durationMinutes / 60));
            if (autoHourCursor > 22) autoHourCursor = 8;
        }

        // 5. Subject Detection
        let subject = 'شخصی';
        for (const entry of SUBJECT_KEYWORDS) {
            if (entry.regex.test(line)) {
                subject = entry.subject;
                break;
            }
        }
        // Fallback check against SUBJECT_ICONS keys
        if (subject === 'شخصی') {
            for (const key of Object.keys(SUBJECT_ICONS)) {
                if (key !== 'شخصی' && line.includes(key)) {
                    subject = key;
                    break;
                }
            }
        }

        // 6. Study / Activity Type Detection
        let studyType: StudyType = 'task';
        let details = 'برنامه‌ریزی شده';
        if (/آزمون جامع|شبیه‌ساز|آزمون/i.test(line)) {
            studyType = 'exam';
            details = 'آزمون زمان‌دار';
        } else if (/تحلیل/i.test(line)) {
            studyType = 'analysis';
            details = 'تحلیل و بررسی نکات';
        } else if (/تست سرعتی|زمان‌دار/i.test(line)) {
            studyType = 'test_speed';
            details = 'تست سرعتی';
        } else if (/تست/i.test(line)) {
            studyType = 'test_educational';
            details = 'تست آموزشی';
        } else if (/مرور|خلاصه/i.test(line)) {
            studyType = 'review';
            details = 'مرور و جمع‌بندی';
        } else if (/جلسه|میتینگ|تماس|قرار/i.test(line)) {
            studyType = 'meeting';
            details = 'جلسه / هماهنگی';
        } else if (/ورزش|باشگاه|دویدن|پیاده‌روی|یوگا|تمرین/i.test(line)) {
            studyType = 'health';
            details = 'تندرستی و ورزش';
        } else if (/پروژه|کد|دیزاین|ساخت/i.test(line)) {
            studyType = 'project';
            details = 'کار روی پروژه';
        } else if (/عادت|مدیتیشن|روتین/i.test(line)) {
            studyType = 'habit';
            details = 'عادت روزانه';
        } else if (/مطالعه|کتاب|فصل|خواندن/i.test(line)) {
            studyType = 'study';
            details = 'مطالعه مفهومی';
        }

        items.push({
            id: `bd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            subject,
            topic: cleanTitle.slice(0, 80) || subject,
            details,
            startTime,
            durationMinutes,
            priority,
            studyType,
            dateOffset,
        });
    }

    return items;
}
