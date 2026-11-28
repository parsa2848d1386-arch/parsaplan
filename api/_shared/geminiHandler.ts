import type { IncomingMessage, ServerResponse } from 'node:http';
import { GoogleGenAI, type Part } from '@google/genai';
import { geminiChatRequestSchema, geminiGenerateRequestSchema } from '../../utils/schemas';

export const ALLOWED_MODELS = new Set([
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite',
]);

export const DEFAULT_FREE_MODEL = 'gemini-2.5-flash';
export const FALLBACK_FREE_MODEL = 'gemini-2.5-flash-lite';

const ALLOWED_ATTACHMENT_MIMES = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
]);

const MAX_ATTACHMENTS = 4;
const MAX_TOTAL_ATTACHMENT_BYTES = 6 * 1024 * 1024;
const MAX_TEXT_ATTACHMENT_CHARS = 60_000;

interface IncomingAttachment {
    name?: string;
    mimeType?: string;
    base64Data?: string;
    textContent?: string;
}

export interface ApiRequestLike extends IncomingMessage {
    body?: unknown;
    ip?: string;
}

export interface ApiResponseLike extends ServerResponse {
    status: (code: number) => ApiResponseLike;
    json: (payload: unknown) => void;
}

const rateLimitBuckets = new Map<string, number[]>();
const MINUTE_WINDOW_MS = 60 * 1000;
const HOUR_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQ_PER_MINUTE = 15;
const MAX_REQ_PER_HOUR = 120;

export function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
    const maybeExpress = res as Partial<ApiResponseLike>;
    if (typeof maybeExpress.status === 'function' && typeof maybeExpress.json === 'function') {
        maybeExpress.status(statusCode).json(payload);
        return;
    }
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
}

export async function readRequestBody(req: ApiRequestLike): Promise<Record<string, unknown>> {
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        return req.body as Record<string, unknown>;
    }
    if (typeof req.body === 'string' && req.body.trim()) {
        try {
            return JSON.parse(req.body) as Record<string, unknown>;
        } catch {
            return {};
        }
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw) return {};
    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return {};
    }
}

export function checkAiRateLimit(req: ApiRequestLike): {
    allowed: boolean;
    code?: string;
    retryAfterSec?: number;
    message?: string;
} {
    const forwarded = req.headers['x-forwarded-for'];
    const ipRaw = Array.isArray(forwarded)
        ? forwarded[0]
        : typeof forwarded === 'string'
          ? forwarded.split(',')[0]
          : req.ip || req.socket?.remoteAddress || 'unknown';
    const key = ipRaw.trim() || 'unknown';
    const now = Date.now();

    const timestamps = (rateLimitBuckets.get(key) || []).filter((ts) => now - ts < HOUR_WINDOW_MS);
    const lastMinuteCount = timestamps.filter((ts) => now - ts < MINUTE_WINDOW_MS).length;

    if (lastMinuteCount >= MAX_REQ_PER_MINUTE) {
        const oldestMinute = timestamps.find((ts) => now - ts < MINUTE_WINDOW_MS) || now;
        const retryAfterSec = Math.max(1, Math.ceil((MINUTE_WINDOW_MS - (now - oldestMinute)) / 1000));
        rateLimitBuckets.set(key, timestamps);
        return {
            allowed: false,
            code: 'RATE_LIMITED',
            retryAfterSec,
            message: `تعداد درخواست‌های شما در این دقیقه زیاد بود. لطفاً ${retryAfterSec} ثانیه دیگر تلاش کنید.`,
        };
    }

    if (timestamps.length >= MAX_REQ_PER_HOUR) {
        const oldestHour = timestamps[0] || now;
        const retryAfterSec = Math.max(1, Math.ceil((HOUR_WINDOW_MS - (now - oldestHour)) / 1000));
        rateLimitBuckets.set(key, timestamps);
        return {
            allowed: false,
            code: 'RATE_LIMITED_HOURLY',
            retryAfterSec,
            message: 'سقف استفاده ساعتی پر شده است. لطفاً کمی بعد دوباره تلاش کنید.',
        };
    }

    timestamps.push(now);
    rateLimitBuckets.set(key, timestamps);

    if (rateLimitBuckets.size > 1000) {
        for (const [k, list] of rateLimitBuckets.entries()) {
            if (list.length === 0 || now - list[list.length - 1] >= HOUR_WINDOW_MS) {
                rateLimitBuckets.delete(k);
            }
        }
    }

    return { allowed: true };
}

export function resolveModel(requested?: string): string {
    if (requested && ALLOWED_MODELS.has(requested)) {
        return requested;
    }
    if (requested === 'gemini-1.5-flash' || requested === 'gemini-2.0-flash-lite') {
        return FALLBACK_FREE_MODEL;
    }
    return DEFAULT_FREE_MODEL;
}

export function getAiClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        throw new Error('MISSING_GEMINI_API_KEY');
    }
    return new GoogleGenAI({ apiKey });
}

function isModelUnavailableError(err: unknown): boolean {
    const msg = (err instanceof Error ? err.message : String(err || '')).toLowerCase();
    const status =
        typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status?: number }).status === 'number'
            ? (err as { status: number }).status
            : 0;
    return (
        status === 404 ||
        msg.includes('not found') ||
        msg.includes('not supported') ||
        msg.includes('invalid model') ||
        msg.includes('unknown model')
    );
}

async function withFreeTierFallback<T>(
    requestedModel: string,
    executor: (modelName: string) => Promise<T>
): Promise<T> {
    const candidates = Array.from(new Set([requestedModel, DEFAULT_FREE_MODEL, FALLBACK_FREE_MODEL]));
    let lastError: unknown;
    for (let i = 0; i < candidates.length; i++) {
        try {
            return await executor(candidates[i]);
        } catch (err) {
            lastError = err;
            if (!isModelUnavailableError(err) || i === candidates.length - 1) {
                throw err;
            }
        }
    }
    throw lastError;
}

export function handleGeminiError(res: ServerResponse, err: unknown): void {
    const message = err instanceof Error ? err.message : String(err || 'Gemini API error');
    if (message === 'MISSING_GEMINI_API_KEY') {
        sendJson(res, 503, {
            error: 'کلید سرور هوش مصنوعی تنظیم نشده است. مدیر سایت باید متغیر محیطی GEMINI_API_KEY را در تنظیمات Vercel وارد کند.',
            code: 'MISSING_GEMINI_API_KEY',
        });
        return;
    }
    const status =
        typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status?: number }).status === 'number'
            ? (err as { status: number }).status
            : 500;
    sendJson(res, status >= 400 && status < 600 ? status : 500, { error: message });
}

export function parseAttachmentsToParts(rawAttachments: unknown):
    | { ok: true; parts: Part[] }
    | { ok: false; error: string } {
    if (!Array.isArray(rawAttachments) || rawAttachments.length === 0) {
        return { ok: true, parts: [] };
    }

    if (rawAttachments.length > MAX_ATTACHMENTS) {
        return { ok: false, error: `حداکثر ${MAX_ATTACHMENTS} فایل در هر پیام مجاز است.` };
    }

    const parts: Part[] = [];
    let totalDecodedBytes = 0;

    for (const item of rawAttachments as IncomingAttachment[]) {
        if (!item || typeof item !== 'object') {
            return { ok: false, error: 'فرمت یکی از فایل‌های پیوست نامعتبر است.' };
        }

        const mimeType = typeof item.mimeType === 'string' ? item.mimeType.trim().toLowerCase() : '';
        const safeName = typeof item.name === 'string' ? item.name.slice(0, 120) : 'attachment';

        if (!ALLOWED_ATTACHMENT_MIMES.has(mimeType)) {
            return {
                ok: false,
                error: `فرمت فایل «${safeName}» پشتیبانی نمی‌شود. (فقط تصویر، PDF و فایل متنی مجاز است)`,
            };
        }

        if ((typeof item.textContent === 'string' && mimeType.startsWith('text/')) || mimeType === 'application/json') {
            const clipped = (item.textContent || '').slice(0, MAX_TEXT_ATTACHMENT_CHARS);
            totalDecodedBytes += Buffer.byteLength(clipped, 'utf8');
            if (totalDecodedBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
                return { ok: false, error: 'مجموع حجم فایل‌های پیوست از سقف مجاز ۶ مگابایت بیشتر است.' };
            }
            parts.push({
                text: `[فایل پیوست: ${safeName}]\n${clipped}`,
            });
        } else if (typeof item.base64Data === 'string' && item.base64Data.length > 0) {
            const cleanBase64 = item.base64Data.includes(',') ? item.base64Data.split(',')[1] : item.base64Data;
            const estimatedBytes = Math.ceil((cleanBase64.length * 3) / 4);
            totalDecodedBytes += estimatedBytes;
            if (totalDecodedBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
                return { ok: false, error: 'مجموع حجم فایل‌های پیوست از سقف مجاز ۶ مگابایت بیشتر است.' };
            }
            parts.push({
                inlineData: {
                    mimeType,
                    data: cleanBase64,
                },
            });
        } else {
            return { ok: false, error: `محتوای فایل «${safeName}» قابل خواندن نیست.` };
        }
    }

    return { ok: true, parts };
}

export async function handleGeminiGenerate(req: ApiRequestLike, res: ServerResponse): Promise<void> {
    if (req.method && req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
    }

    const rate = checkAiRateLimit(req);
    if (!rate.allowed) {
        sendJson(res, 429, {
            error: rate.message,
            code: rate.code,
            retryAfterSec: rate.retryAfterSec,
        });
        return;
    }

    try {
        const body = await readRequestBody(req);
        const parsedBody = geminiGenerateRequestSchema.safeParse(body);
        if (!parsedBody.success) {
            sendJson(res, 400, { error: parsedBody.error.issues[0]?.message || 'درخواست نامعتبر است.' });
            return;
        }
        const { prompt, model, systemInstruction, responseMimeType } = parsedBody.data;
        const ai = getAiClient();
        const config: Record<string, unknown> = {};
        if (systemInstruction && systemInstruction.trim()) {
            config.systemInstruction = systemInstruction;
        }
        if (responseMimeType && responseMimeType.trim()) {
            config.responseMimeType = responseMimeType;
        }

        const primaryModel = resolveModel(model);
        const response = await withFreeTierFallback(primaryModel, (activeModel) =>
            ai.models.generateContent({
                model: activeModel,
                contents: prompt,
                ...(Object.keys(config).length > 0 ? { config } : {}),
            })
        );

        sendJson(res, 200, { text: response.text ?? '' });
    } catch (err) {
        handleGeminiError(res, err);
    }
}

export async function handleGeminiChat(req: ApiRequestLike, res: ServerResponse): Promise<void> {
    if (req.method && req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
    }

    const rate = checkAiRateLimit(req);
    if (!rate.allowed) {
        sendJson(res, 429, {
            error: rate.message,
            code: rate.code,
            retryAfterSec: rate.retryAfterSec,
        });
        return;
    }

    try {
        const body = await readRequestBody(req);
        const parsedBody = geminiChatRequestSchema.safeParse(body);
        if (!parsedBody.success) {
            sendJson(res, 400, { error: parsedBody.error.issues[0]?.message || 'درخواست چت نامعتبر است.' });
            return;
        }
        const { message, history, systemInstruction, model, attachments } = parsedBody.data;
        const messageText = message.trim();

        const parsedAttachments = parseAttachmentsToParts(attachments);
        if (parsedAttachments.ok === false) {
            sendJson(res, 400, { error: parsedAttachments.error });
            return;
        }

        if (!messageText && parsedAttachments.parts.length === 0) {
            sendJson(res, 400, { error: 'پیام یا حداقل یک فایل پیوست الزامی است.' });
            return;
        }

        const ai = getAiClient();
        const formattedHistory = Array.isArray(history)
            ? history
                  .filter(
                      (item): item is { role: 'user' | 'model'; text: string } =>
                          Boolean(item) &&
                          typeof item === 'object' &&
                          ((item as { role?: unknown }).role === 'user' || (item as { role?: unknown }).role === 'model') &&
                          typeof (item as { text?: unknown }).text === 'string' &&
                          (item as { text: string }).text.trim().length > 0
                  )
                  .slice(-20)
                  .map((item) => ({
                      role: item.role,
                      parts: [{ text: item.text }],
                  }))
            : [];

        const messageParts: Part[] = [...parsedAttachments.parts];
        if (messageText) {
            messageParts.push({ text: messageText });
        } else {
            messageParts.push({ text: 'لطفاً فایل پیوست‌شده را تحلیل کن و راهنمایی یا برنامه پیشنهادی بده.' });
        }

        const primaryModel = resolveModel(model);
        const response = await withFreeTierFallback(primaryModel, (activeModel) => {
            const chat = ai.chats.create({
                model: activeModel,
                config:
                    systemInstruction && systemInstruction.trim()
                        ? { systemInstruction }
                        : undefined,
                ...(formattedHistory.length > 0 ? { history: formattedHistory } : {}),
            });
            return chat.sendMessage({
                message: messageParts,
            });
        });

        sendJson(res, 200, { text: response.text ?? '' });
    } catch (err) {
        handleGeminiError(res, err);
    }
}
