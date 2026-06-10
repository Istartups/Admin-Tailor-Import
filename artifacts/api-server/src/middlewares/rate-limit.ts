import type { Request, Response, NextFunction } from "express";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // limit each IP to 100 requests per windowMs

const ipCache = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
  const now = Date.now();

  const record = ipCache.get(ip);

  if (!record || now > record.resetTime) {
    ipCache.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return next();
  }

  record.count++;

  if (record.count > MAX_REQUESTS) {
    return res.status(429).json({
      message: "Too many requests from this IP, please try again after 15 minutes",
    });
  }

  next();
};
