import { z } from 'zod';

/* ============================================================================
   Zod 4 Validation Schemas (Forms, AI Output Sanitization, Server API & Backups)
   ============================================================================ */

export const identifierRegex = /^([^\s@]+@[^\s@]+\.[^\s@]+|[a-zA-Z0-9_]{3,})$/;

export const loginSchema = z.object({
    username: z
        .string({ error: 'نام کاربری یا ایمیل الزامی است' })
        .trim()
        .min(3, { error: 'حداقل ۳ کاراکتر وارد کنید' })
        .regex(identifierRegex, { error: 'ایمیل معتبر یا نام کاربری انگلیسی وارد کنید' }),
    password: z
        .string({ error: 'رمز عبور الزامی است' })
        .min(6, { error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }),
});

export const registerSchema = z.object({
    username: z
        .string({ error: 'نام کاربری یا ایمیل الزامی است' })
        .trim()
        .min(3, { error: 'حداقل ۳ کاراکتر وارد کنید' })
        .regex(identifierRegex, { error: 'ایمیل معتبر یا نام کاربری انگلیسی (حروف، عدد و _)' }),
    displayName: z
        .string({ error: 'نام نمایشی الزامی است' })
        .trim()
        .min(2, { error: 'نام نمایشی حداقل ۲ کاراکتر باشد' })
        .max(80, { error: 'نام نمایشی نباید بیشتر از ۸۰ کاراکتر باشد' }),
    password: z
        .string({ error: 'رمز عبور الزامی است' })
        .min(6, { error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }),
});

export const resetSchema = z.object({
    identifier: z
        .string({ error: 'ایمیل یا نام کاربری الزامی است' })
        .trim()
        .min(3, { error: 'حداقل ۳ کاراکتر وارد کنید' })
        .regex(identifierRegex, { error: 'ایمیل یا نام کاربری معتبر وارد کنید' }),
});

export type LoginInputs = z.infer<typeof loginSchema>;
export type RegisterInputs = z.infer<typeof registerSchema>;
export type ResetInputs = z.infer<typeof resetSchema>;

export const STUDY_TYPE_VALUES = [
    'task',
    'project',
    'habit',
    'health',
    'meeting',
    'creative',
    'exam',
    'analysis',
    'test_educational',
    'test_speed',
    'review',
    'study',
] as const;

export const TASK_PRIORITY_VALUES = ['urgent', 'high', 'medium', 'low'] as const;

export const aiProposedTaskSchema = z.object({
    id: z.string().max(128).optional(),
    title: z.string().trim().max(160).optional(),
    subject: z.string().trim().min(1).max(80).catch('عمومی'),
    topic: z.string().trim().max(240).catch(''),
    details: z.string().max(1000).catch(''),
    testRange: z.string().max(200).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    startTime: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
    durationMinutes: z.coerce.number().int().min(5).max(480).catch(60),
    priority: z.enum(TASK_PRIORITY_VALUES).catch('medium'),
    studyType: z.enum(STUDY_TYPE_VALUES).catch('study'),
    subTasks: z
        .array(
            z.object({
                subject: z.string().trim().max(80).catch('عمومی'),
                topic: z.string().trim().max(200).catch(''),
            })
        )
        .max(20)
        .optional(),
});

export const aiTaskActionSchema = z.object({
    action: z
        .object({
            type: z.enum(['preview_tasks', 'auto_add_tasks']),
            tasks: z.array(aiProposedTaskSchema).max(40),
        })
        .optional(),
    type: z.enum(['preview_tasks', 'auto_add_tasks']).optional(),
    tasks: z.array(aiProposedTaskSchema).max(40).optional(),
});

export const aiBrainDumpItemSchema = z.object({
    title: z.string().trim().max(160).optional(),
    subject: z.string().trim().max(80).catch('شخصی'),
    topic: z.string().trim().max(240).optional(),
    details: z.string().max(1000).catch('برنامه‌ریزی شده'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    studyType: z.enum(STUDY_TYPE_VALUES).catch('task'),
    startTime: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
    durationMinutes: z.coerce.number().int().min(5).max(480).catch(60),
    priority: z.enum(TASK_PRIORITY_VALUES).catch('medium'),
});

export const aiVoiceTaskItemSchema = z.object({
    subject: z.string().trim().max(80).catch('عمومی'),
    topic: z.string().trim().max(240).catch('بدون مبحث'),
    details: z.string().max(500).catch('مطالعه'),
    dateOffset: z.coerce.number().int().min(-7).max(365).catch(0),
    estimatedMinutes: z.coerce.number().int().min(10).max(480).catch(60),
});

export const macroPlannerReportSchema = z.object({
    overview: z.string().max(3000).catch(''),
    strengths: z.array(z.string().max(400)).max(10).catch([]),
    weaknesses: z.array(z.string().max(400)).max(10).catch([]),
    actionPlan: z.array(z.string().max(500)).max(15).catch([]),
    resourceAdvice: z.string().max(2000).catch(''),
});

export type MacroPlannerReport = z.infer<typeof macroPlannerReportSchema>;

export const blobatarConfigSchema = z.object({
    seed: z.string().max(80).optional(),
    shape: z
        .enum([
            'auto',
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
        ])
        .optional(),
    hue: z.union([z.literal('auto'), z.number().min(0).max(360)]).optional(),
    expression: z.enum(['auto', 'idle', 'happy', 'focused', 'thinking', 'smug', 'energetic']).optional(),
});

export const backupImportSchema = z.object({
    tasks: z.array(z.record(z.string(), z.unknown())).max(10_000),
    userName: z.string().max(120).optional(),
    xp: z.number().finite().min(0).max(100_000_000).optional(),
    logs: z.array(z.record(z.string(), z.unknown())).max(5_000).optional(),
    moods: z.record(z.string(), z.string()).optional(),
    startDate: z.string().max(32).optional(),
    totalDays: z.number().int().min(1).max(3650).optional(),
    subjects: z.array(z.record(z.string(), z.unknown())).max(300).optional(),
    archivedPlans: z.array(z.record(z.string(), z.unknown())).max(200).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
    sessions: z.array(z.record(z.string(), z.unknown())).max(10_000).optional(),
    flashcards: z.array(z.record(z.string(), z.unknown())).max(10_000).optional(),
    notebookPages: z.array(z.record(z.string(), z.unknown())).max(2_000).optional(),
    stylusStrokes: z.array(z.record(z.string(), z.unknown())).max(5_000).optional(),
    routineTemplate: z.array(z.record(z.string(), z.unknown())).max(200).optional(),
    studyHoursLog: z.record(z.string(), z.number()).optional(),
    perfectDates: z.record(z.string(), z.boolean()).optional(),
    schemaVersion: z.number().int().optional(),
    lastUpdated: z.number().optional(),
});

export const geminiGenerateRequestSchema = z.object({
    prompt: z
        .string({ error: 'متن درخواست الزامی است.' })
        .trim()
        .min(1, { error: 'متن درخواست الزامی است.' })
        .max(40_000, { error: 'طول متن ارسالی بیش از حد مجاز است.' }),
    model: z.string().max(80).optional(),
    systemInstruction: z.string().max(16_000).optional(),
    responseMimeType: z.string().max(80).optional(),
});

export const geminiAttachmentSchema = z.object({
    name: z.string().max(120).optional(),
    mimeType: z.string().max(120).optional(),
    base64Data: z.string().optional(),
    textContent: z.string().optional(),
});

export const geminiChatHistoryItemSchema = z.object({
    role: z.enum(['user', 'model']),
    text: z.string().max(30_000),
});

export const geminiChatRequestSchema = z.object({
    message: z
        .string()
        .max(30_000, { error: 'طول پیام ارسالی بیش از حد مجاز است.' })
        .optional()
        .default(''),
    history: z.array(z.unknown()).max(60).optional(),
    systemInstruction: z.string().max(16_000).optional(),
    model: z.string().max(80).optional(),
    attachments: z.array(geminiAttachmentSchema).max(4, { error: 'حداکثر ۴ فایل در هر پیام مجاز است.' }).optional(),
});
