import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';

// Extend Express Request so downstream handlers can read req.userId
declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

// Lazy singleton — created on first request so process.env is guaranteed
// to be populated by the time this runs (Docker env vars, dotenv, etc.)
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader: string | undefined = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token: string = authHeader.slice(7);

  const { data, error } = await getSupabase().auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.userId = data.user.id;
  next();
}
