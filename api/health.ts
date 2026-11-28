import type { ApiRequestLike, ApiResponseLike } from './_shared/geminiHandler';
import { sendJson } from './_shared/geminiHandler';

export default function handler(req: ApiRequestLike, res: ApiResponseLike) {
    if (req.method && req.method !== 'GET') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
    }
    sendJson(res, 200, {
        ok: true,
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
        runtime: 'vercel-serverless',
    });
}
