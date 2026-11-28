import type { ApiRequestLike, ApiResponseLike } from '../_shared/geminiHandler';
import { handleGeminiChat } from '../_shared/geminiHandler';

export default async function handler(req: ApiRequestLike, res: ApiResponseLike) {
    return handleGeminiChat(req, res);
}
