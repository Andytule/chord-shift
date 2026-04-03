import { createClient } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';

// Extend Express Request so downstream handlers can read req.userId
declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

const supabase = createClient(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_ANON_KEY ?? '');

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.userId = data.user.id;
  next();
}
