import type { ApiRequestLike, ApiResponseLike } from '../_shared/geminiHandler';
import { handleGeminiGenerate } from '../_shared/geminiHandler';

export default async function handler(req: ApiRequestLike, res: ApiResponseLike) {
    return handleGeminiGenerate(req, res);
}
