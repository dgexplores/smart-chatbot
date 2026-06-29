import { Request, Response, NextFunction } from 'express';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const ipCache = new Map<string, RateLimitInfo>();

export const rateLimiter = (limit: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let record = ipCache.get(ip);

    if (!record) {
      record = { count: 1, resetTime: now + windowMs };
      ipCache.set(ip, record);
      return next();
    }

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }

    record.count++;

    if (record.count > limit) {
      const remainingSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', remainingSeconds);
      return res.status(429).json({
        success: false,
        message: `Too many requests. Please try again in ${remainingSeconds} seconds.`
      });
    }

    next();
  };
};

// Cleanup memory cache every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipCache.entries()) {
    if (now > record.resetTime) {
      ipCache.delete(ip);
    }
  }
}, 10 * 60 * 1000).unref();
