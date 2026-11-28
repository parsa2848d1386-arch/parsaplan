import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleGeminiChat, handleGeminiGenerate, type ApiRequestLike, type ApiResponseLike } from './api/_shared/geminiHandler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const HOST = '0.0.0.0';

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
    await handleGeminiGenerate(req as unknown as ApiRequestLike, res as unknown as ApiResponseLike);
  });

  app.post('/api/gemini/chat', async (req, res) => {
    await handleGeminiChat(req as unknown as ApiRequestLike, res as unknown as ApiResponseLike);
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
