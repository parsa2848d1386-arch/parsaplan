import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Part } from '@google/genai';
import { geminiChatRequestSchema, geminiGenerateRequestSchema } from './utils/schemas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const HOST = '0.0.0.0';

const ALLOWED_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
]);

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
const MAX_TOTAL_ATTACHMENT_BYTES = 6 * 1024 * 1024; // 6 MB decoded limit
const MAX_TEXT_ATTACHMENT_CHARS = 60_000;

interface IncomingAttachment {
  name?: string;
  mimeType?: string;
  base64Data?: string;
  textContent?: string;
}

// --- Sliding Window Rate Limiter per Client IP ---
const rateLimitBuckets = new Map<string, number[]>();
const MINUTE_WINDOW_MS = 60 * 1000;
const HOUR_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQ_PER_MINUTE = 15;
const MAX_REQ_PER_HOUR = 120;

function checkAiRateLimit(req: express.Request): { allowed: boolean; code?: string; retryAfterSec?: number; message?: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ipRaw = Array.isArray(forwarded) ? forwarded[0] : typeof forwarded === 'string' ? forwarded.split(',')[0] : req.ip || 'unknown';
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

  // Periodic map pruning
  if (rateLimitBuckets.size > 1000) {
    for (const [k, list] of rateLimitBuckets.entries()) {
      if (list.length === 0 || now - list[list.length - 1] >= HOUR_WINDOW_MS) {
        rateLimitBuckets.delete(k);
      }
    }
  }

  return { allowed: true };
}

function resolveModel(requested?: string): string {
  if (requested && ALLOWED_MODELS.has(requested)) {
    return requested;
  }
  if (requested === 'gemini-1.5-flash' || requested === 'gemini-2.0-flash-lite') {
    return 'gemini-3.1-flash-lite';
  }
  return 'gemini-4-hydrogen';
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('MISSING_GEMINI_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleGeminiError(res: express.Response, err: unknown) {
  const message = err instanceof Error ? err.message : String(err || 'Gemini API error');
  if (message === 'MISSING_GEMINI_API_KEY') {
    return res.status(503).json({
      error: 'کلید سرور هوش مصنوعی تنظیم نشده است. لطفاً از بخش Settings > Secrets مقدار GEMINI_API_KEY را بررسی کنید.',
      code: 'MISSING_GEMINI_API_KEY',
    });
  }
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status?: number }).status === 'number'
      ? (err as { status: number }).status
      : 500;
  return res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
}

function parseAttachmentsToParts(rawAttachments: unknown): { ok: true; parts: Part[] } | { ok: false; error: string } {
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
      return { ok: false, error: `فرمت فایل «${safeName}» پشتیبانی نمی‌شود. (فقط تصویر، PDF و فایل متنی مجاز است)` };
    }

    if (typeof item.textContent === 'string' && mimeType.startsWith('text/') || mimeType === 'application/json') {
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

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '12mb' }));

  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start';

  // Security headers (defense-in-depth for client & API routes)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)');
    if (isProduction) {
      res.setHeader(
        'Content-Security-Policy',
        [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: blob: https:",
          "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com",
          "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
        ].join('; ')
      );
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.post('/api/gemini/generate', async (req, res) => {
    const rate = checkAiRateLimit(req);
    if (!rate.allowed) {
      return res.status(429).json({
        error: rate.message,
        code: rate.code,
        retryAfterSec: rate.retryAfterSec,
      });
    }

    try {
      const parsedBody = geminiGenerateRequestSchema.safeParse(req.body ?? {});
      if (!parsedBody.success) {
        return res.status(400).json({ error: parsedBody.error.issues[0]?.message || 'متن درخواست نامعتبر است.' });
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

      const response = await ai.models.generateContent({
        model: resolveModel(model),
        contents: prompt,
        ...(Object.keys(config).length > 0 ? { config } : {}),
      });

      return res.json({ text: response.text ?? '' });
    } catch (err) {
      return handleGeminiError(res, err);
    }
  });

  app.post('/api/gemini/chat', async (req, res) => {
    const rate = checkAiRateLimit(req);
    if (!rate.allowed) {
      return res.status(429).json({
        error: rate.message,
        code: rate.code,
        retryAfterSec: rate.retryAfterSec,
      });
    }

    try {
      const parsedBody = geminiChatRequestSchema.safeParse(req.body ?? {});
      if (!parsedBody.success) {
        return res.status(400).json({ error: parsedBody.error.issues[0]?.message || 'درخواست چت نامعتبر است.' });
      }
      const { message, history, systemInstruction, model, attachments } = parsedBody.data;
      const messageText = message.trim();

      const parsedAttachments = parseAttachmentsToParts(attachments);
      if (parsedAttachments.ok === false) {
        return res.status(400).json({ error: parsedAttachments.error });
      }

      if (!messageText && parsedAttachments.parts.length === 0) {
        return res.status(400).json({ error: 'پیام یا حداقل یک فایل پیوست الزامی است.' });
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

      const chat = ai.chats.create({
        model: resolveModel(model),
        config:
          systemInstruction && systemInstruction.trim()
            ? { systemInstruction }
            : undefined,
        ...(formattedHistory.length > 0 ? { history: formattedHistory } : {}),
      });

      const messageParts: Part[] = [...parsedAttachments.parts];
      if (messageText) {
        messageParts.push({ text: messageText });
      } else {
        messageParts.push({ text: 'لطفاً فایل پیوست‌شده را تحلیل کن و راهنمایی یا برنامه پیشنهادی بده.' });
      }

      const response = await chat.sendMessage({
        message: messageParts,
      });
      return res.json({ text: response.text ?? '' });
    } catch (err) {
      return handleGeminiError(res, err);
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(
      '/assets',
      express.static(path.join(distDir, 'assets'), {
        maxAge: '365d',
        immutable: true,
      })
    );
    app.use(
      express.static(distDir, {
        setHeaders: (res, filePath) => {
          if (/\.(html|webmanifest)$/i.test(filePath) || /(sw|registerSW|workbox-.*)\.js$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        },
      })
    );
    app.use((_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`ParsaPlan server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
