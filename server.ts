import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import {
  broadcastPushNotification,
  getPublicVapidKey,
  getSubscriberCount,
  removePushSubscription,
  savePushSubscription,
} from './src/server/pushService.ts';
import {
  clearYouTubeCaches,
  getLiveStatus,
  getRecordedProgrammes,
  getServiceDiagnostics,
  getVideoById,
} from './src/server/youtubeService.ts';

// Initialize Firebase Admin ONLY for ID token verification (requires zero IAM)
const adminApp = getApps().length
  ? getApp()
  : initializeApp({ projectId: firebaseConfig.projectId });
const adminAuth = getAuth(adminApp);

const AUTHORIZED_ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || 'basoomatawfiq1427@gmail.com,samiwabasri.ug@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

// Lightweight sliding-window rate limiter per IP
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const bucket = rateBuckets.get(ip);
    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (bucket.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
      });
    }
    bucket.count += 1;
    return next();
  };
}

interface AuthenticatedRequest extends Request {
  adminUser?: {
    uid: string;
    email: string;
  };
}

async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing administrator authorization token.' });
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Empty authorization token.' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = (decoded.email || '').toLowerCase();
    if (!decoded.email_verified || !email) {
      return res.status(403).json({ error: 'Verified email is required for administrator access.' });
    }
    if (!AUTHORIZED_ADMIN_EMAILS.has(email)) {
      return res.status(403).json({ error: 'Account is not authorized as a HILL MOBILE administrator.' });
    }
    req.adminUser = { uid: decoded.uid, email };
    return next();
  } catch (err) {
    console.error('Admin token verification failed:', err);
    return res.status(401).json({ error: 'Invalid or expired administrator session.' });
  }
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '64kb' }));

  // --- Public API Routes ---
  app.get('/api/health', (_req, res) => {
    const diag = getServiceDiagnostics();
    res.json({
      status: 'ok',
      ...diag,
      vapidConfigured: true,
      pushSubscriberCount: getSubscriberCount(),
    });
  });

  // Android Digital Asset Links for fullscreen Trusted Web Activity (TWA / PWABuilder APK)
  app.get('/.well-known/assetlinks.json', (_req, res) => {
    const packageName = (process.env.ANDROID_PACKAGE_NAME || 'org.hillmobile.app').trim();
    const sha256Regex = /^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$/;
    const fingerprints = (process.env.ANDROID_SHA256_FINGERPRINTS || '')
      .split(',')
      .map((fp) => fp.trim().toUpperCase())
      .filter((fp) => sha256Regex.test(fp));

    if (fingerprints.length === 0) {
      return res.status(200).json([]);
    }

    return res.status(200).json([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ]);
  });

  app.get('/api/youtube/live', rateLimit(120, 60_000), async (req, res) => {
    const force = req.query.force === 'true';
    const data = await getLiveStatus(force);
    res.json(data);
  });

  app.get('/api/youtube/videos', rateLimit(120, 60_000), async (req, res) => {
    const pageToken = typeof req.query.pageToken === 'string' ? req.query.pageToken : undefined;
    const maxResults =
      typeof req.query.maxResults === 'string' ? Number(req.query.maxResults) : 24;
    const query = typeof req.query.q === 'string' ? req.query.q.slice(0, 120) : undefined;
    const data = await getRecordedProgrammes({ pageToken, maxResults, query });
    res.json(data);
  });

  app.get('/api/youtube/video/:videoId', rateLimit(120, 60_000), async (req, res) => {
    const videoId = String(req.params.videoId || '');
    const data = await getVideoById(videoId);
    res.json(data);
  });

  // --- Web Push Subscription Routes ---
  app.get('/api/notifications/vapid-key', (_req, res) => {
    res.json({ publicKey: getPublicVapidKey() });
  });

  app.post('/api/notifications/subscribe', rateLimit(30, 60_000), (req, res) => {
    const body = req.body as {
      endpoint?: unknown;
      keys?: { p256dh?: unknown; auth?: unknown };
    };
    if (
      typeof body?.endpoint !== 'string' ||
      !body.endpoint.startsWith('https://') ||
      typeof body?.keys?.p256dh !== 'string' ||
      typeof body?.keys?.auth !== 'string'
    ) {
      return res.status(400).json({ error: 'Invalid push subscription payload.' });
    }
    const result = savePushSubscription({
      endpoint: body.endpoint,
      keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
    });
    return res.json({ subscribed: true, total: result.total });
  });

  app.post('/api/notifications/unsubscribe', rateLimit(30, 60_000), (req, res) => {
    const body = req.body as { endpoint?: unknown };
    if (typeof body?.endpoint !== 'string') {
      return res.status(400).json({ error: 'Invalid endpoint.' });
    }
    const result = removePushSubscription(body.endpoint);
    return res.json({ subscribed: false, total: result.total });
  });

  // --- Protected Administrator Routes ---
  app.get('/api/admin/status', requireAdmin, (_req, res) => {
    const diag = getServiceDiagnostics();
    res.json({
      status: 'ok',
      ...diag,
      vapidConfigured: true,
      pushSubscriberCount: getSubscriberCount(),
    });
  });

  app.post('/api/admin/sync', requireAdmin, async (_req, res) => {
    clearYouTubeCaches();
    const [live, videos] = await Promise.all([
      getLiveStatus(true),
      getRecordedProgrammes({ maxResults: 24, force: true }),
    ]);
    res.json({
      syncedAt: new Date().toISOString(),
      live,
      videosCount: videos.items.length,
      videos,
    });
  });

  app.post('/api/admin/notifications/broadcast', requireAdmin, async (req, res) => {
    const body = req.body as { title?: unknown; body?: unknown; url?: unknown };
    const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 120) : '';
    const msgBody = typeof body?.body === 'string' ? body.body.trim().slice(0, 500) : '';
    const url = typeof body?.url === 'string' && body.url.startsWith('/') ? body.url : '/#/notifications';

    if (!title || !msgBody) {
      return res.status(400).json({ error: 'Title and message body are required.' });
    }

    const delivery = await broadcastPushNotification({
      title,
      body: msgBody,
      url,
      tag: `announcement-${Date.now()}`,
    });
    return res.json({ ok: true, delivery });
  });

  const httpServer = http.createServer(app);

  // --- Vite / Static Frontend Serving ---
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { maxAge: '1h' }));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found.' });
      }
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        return res.sendFile(indexFile);
      }
      return res.status(404).send('Production build not found. Run npm run build.');
    });
  }

  const port = process.env.NODE_ENV === 'production' ? Number(process.env.PORT) || 3000 : 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`HILL MOBILE server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
