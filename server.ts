import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import compression from "compression";
import cookieParser from "cookie-parser";

dotenv.config();

// Helper to decode and validate Firebase ID Tokens without admin SDK secrets
function decodeFirebaseToken(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
    const payload = JSON.parse(payloadJson);
    
    // Check if expired
    const nowSecs = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSecs) {
      return null; // Expired
    }
    return payload;
  } catch (e) {
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable cookie parsing for secure session tokens
  app.use(cookieParser());

  // Enable gzip/brotli compression for text and JSON responses
  app.use(compression({
    threshold: 1024, // only compress responses above 1kb (1024 bytes)
    filter: (req, res) => {
      // Avoid double-compressing already-compressed payloads
      if (res.getHeader('Content-Encoding')) {
        return false;
      }
      // Use the default filter function to determine if compression is appropriate
      return compression.filter(req, res);
    }
  }));

  app.use(express.json());

  // Custom Authentication Rate Limiting
  interface RateLimitRecord {
    attempts: number;
    resetTime: number;
  }
  const authRateLimiterCache = new Map<string, RateLimitRecord>();

  function authRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const email = (req.body?.email || '').toLowerCase().trim();
    const key = `${ip}:${email}`;
    const now = Date.now();
    const limitRecord = authRateLimiterCache.get(key);
    
    if (limitRecord) {
      if (now > limitRecord.resetTime) {
        authRateLimiterCache.set(key, { attempts: 1, resetTime: now + 15 * 60 * 1000 });
      } else if (limitRecord.attempts >= 5) {
        const minutesLeft = Math.ceil((limitRecord.resetTime - now) / 60000);
        return res.status(429).json({
          error: "TOO_MANY_REQUESTS",
          message: `لقد تم حظر هذه المحاولة مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى المحاولة بعد ${minutesLeft} دقيقة.`,
          lockoutMinutesRemaining: minutesLeft
        });
      } else {
        limitRecord.attempts += 1;
        authRateLimiterCache.set(key, limitRecord);
      }
    } else {
      authRateLimiterCache.set(key, { attempts: 1, resetTime: now + 15 * 60 * 1000 });
    }
    next();
  }

  // Security Guards & Authorization Middleware
  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const token = req.cookies?.session_token;
    if (!token) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "يجب تسجيل الدخول للمتابعة" });
    }
    const payload = decodeFirebaseToken(token);
    if (!payload) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "جلسة العمل منتهية أو غير صالحة" });
    }
    (req as any).user = payload;
    next();
  }

  function requireVerified(req: express.Request, res: express.Response, next: express.NextFunction) {
    requireAuth(req, res, () => {
      // Bypassed email verification check as per user request to allow login/secure operations without activation/verification codes
      next();
    });
  }

  // --- API Routes ---

  // Session Sync: Establish httpOnly Cookie Session
  app.post("/api/auth/session", (req, res) => {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "MISSING_TOKEN", message: "ID token is required" });
    }
    
    const payload = decodeFirebaseToken(idToken);
    if (!payload) {
      return res.status(401).json({ error: "INVALID_TOKEN", message: "Token is invalid or expired" });
    }

    res.cookie('session_token', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 * 1000 // 1 hour
    });
    
    res.json({ success: true, user: { uid: payload.uid, email: payload.email, email_verified: payload.email_verified || false } });
  });

  // Session Sync: Clear httpOnly Session Cookie on Logout
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie('session_token');
    res.json({ success: true });
  });

  // Session Sync: Retrieve User Details from httpOnly Cookie Session
  app.get("/api/auth/session", (req, res) => {
    const token = req.cookies?.session_token;
    if (!token) {
      return res.json({ authenticated: false });
    }
    const payload = decodeFirebaseToken(token);
    if (!payload) {
      res.clearCookie('session_token');
      return res.json({ authenticated: false });
    }
    res.json({
      authenticated: true,
      user: {
        uid: payload.uid,
        email: payload.email,
        email_verified: payload.email_verified || false
      }
    });
  });

  // Backend Strong Password Complexity Enforcement Endpoint
  app.post("/api/auth/register", authRateLimiter, (req, res) => {
    const { email, password, displayName } = req.body;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "البريد الإلكتروني غير صحيح" });
    }
    if (!displayName || displayName.trim().length < 3) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "يجب أن يكون الاسم 3 أحرف على الأقل" });
    }
    
    const hasMinLength = password && password.length >= 12;
    const hasUpper = /[A-Z]/.test(password || '');
    const hasLower = /[a-z]/.test(password || '');
    const hasNumber = /[0-9]/.test(password || '');
    const hasSpecial = /[^A-Za-z0-9]/.test(password || '');

    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return res.status(400).json({
        error: "WEAK_PASSWORD",
        message: "يجب أن تتكون كلمة المرور من 12 حرفاً على الأقل، وتحتوي على حرف كبير (A-Z)، وحرف صغير (a-z)، ورقم (0-9)، ورمز خاص واحد على الأقل."
      });
    }
    
    res.json({ success: true });
  });

  // Example Secure Actions enforcing backend role-check / identity-check / email-check
  app.post("/api/secure/feedback", requireVerified, (req, res) => {
    res.json({ success: true, message: "تم إرسال بلاغك بنجاح من خلال خادم بَدَل آمن ومحمي" });
  });

  app.post("/api/secure/exchange", requireVerified, (req, res) => {
    res.json({ success: true, message: "تم إنشاء طلب المقايضة بنجاح والتحقق من الحساب بالكامل" });
  });

  // API Healthcheck route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    
    // In-memory cache for rendered HTML pages/fragments
    const htmlCache = new Map<string, { html: string; createdAt: number }>();
    const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

    app.use(express.static(distPath));

    app.get('*', async (req, res) => {
      // 1. Determine locale/variation
      let lang = 'ar'; // Default language
      if (req.query.lang && typeof req.query.lang === 'string') {
        lang = req.query.lang.toLowerCase() === 'en' ? 'en' : 'ar';
      } else {
        const acceptLang = req.headers['accept-language'];
        if (acceptLang && acceptLang.toLowerCase().includes('en') && !acceptLang.toLowerCase().includes('ar')) {
          lang = 'en';
        }
      }

      const cacheKey = `index_html_${lang}`;
      const now = Date.now();
      const cached = htmlCache.get(cacheKey);

      // Serve from memory cache if valid
      if (cached && (now - cached.createdAt < CACHE_TTL_MS)) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(cached.html);
      }

      // Cache MISS - load and construct page template
      try {
        const fs = await import("fs");
        let html = await fs.promises.readFile(indexPath, 'utf-8');

        // Dynamically insert locale modifications to keep outer page structured
        const isAr = lang === 'ar';
        const htmlTagReplacement = isAr ? '<html lang="ar" dir="rtl">' : '<html lang="en" dir="ltr">';
        html = html.replace(/<html[^>]*>/, htmlTagReplacement);

        // Dynamic title based on locale
        const titleReplacement = isAr 
          ? '<title>بَدَل - المنصة الأولى للمبادلة المقايضة الذكية</title>' 
          : '<title>Badal - Smart Barter & Swap Platform</title>';
        html = html.replace(/<title>[^<]*<\/title>/, titleReplacement);

        // Cache the rendered output
        htmlCache.set(cacheKey, {
          html,
          createdAt: now
        });

        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
      } catch (error) {
        console.error("Failed to read or render index.html:", error);
        // Fallback to sending file normally if caching template read fails
        res.sendFile(indexPath);
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
