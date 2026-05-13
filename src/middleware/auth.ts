import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; role: string };
    }
  }
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ message: "Token tidak ditemukan." });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ message: "Token tidak valid." });

  req.user = { id: payload.sub, email: payload.email, role: payload.role };
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.user = { id: payload.sub, email: payload.email, role: payload.role };
  }
  next();
}

export function signToken(userId: number, email: string, role: string): string {
  return jwt.sign(
    { sub: userId, email, role } satisfies JwtPayload,
    process.env.JWT_SECRET!,
    { expiresIn: "30d" }
  );
}
