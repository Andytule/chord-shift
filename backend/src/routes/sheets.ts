import { createClient } from '@supabase/supabase-js';
import { Router } from 'express';

import type { Database } from '../../../types/supabase';
import { requireAuth } from '../middleware/requireAuth';

const router: Router = Router();

const supabase = createClient<Database>(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_ANON_KEY ?? ''
);

// All sheets routes require a valid Supabase JWT
router.use(requireAuth);

// GET /sheets
// Returns the 20 most recently saved sheets belonging to the authenticated user.
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chord_sheets')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({ sheets: data });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /sheets/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chord_sheets')
      .select('*')
      .eq('id', Number(req.params.id))
      .eq('user_id', req.userId)
      .single();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: 'Sheet not found' });
      return;
    }

    res.json({ sheet: data });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /sheets
// Body: { name: string, sheet_text: string, key?: string }
router.post('/', async (req, res) => {
  try {
    const { name, sheet_text, key } = req.body;

    if (typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    if (typeof sheet_text !== 'string' || sheet_text.trim() === '') {
      res.status(400).json({ error: 'sheet_text is required' });
      return;
    }

    const { data, error } = await supabase
      .from('chord_sheets')
      .insert({ name, sheet_text, key: key ?? null, user_id: req.userId })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ sheet: data });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /sheets/:id
// Body: { name?: string, sheet_text: string, key?: string }
router.put('/:id', async (req, res) => {
  try {
    const { name, sheet_text, key } = req.body;

    if (typeof sheet_text !== 'string' || sheet_text.trim() === '') {
      res.status(400).json({ error: 'sheet_text is required' });
      return;
    }

    const { data, error } = await supabase
      .from('chord_sheets')
      .update({
        ...(name ? { name } : {}),
        sheet_text,
        key: key ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', Number(req.params.id))
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: 'Sheet not found' });
      return;
    }

    res.json({ sheet: data });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /sheets/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('chord_sheets')
      .delete()
      .eq('id', Number(req.params.id))
      .eq('user_id', req.userId);

    if (error) throw error;

    res.json({ message: 'Sheet deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
