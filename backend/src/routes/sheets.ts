import { createClient } from '@supabase/supabase-js';
import { Router } from 'express';

import type { Database } from '../../../types/supabase';

const router = Router();

const supabase = createClient<Database>(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_ANON_KEY ?? ''
);

// GET /sheets
// Returns the 20 most recently saved chord sheets.
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chord_sheets')
      .select('*')
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
// Saves a new chord sheet.
// Body: { sheet_text: string, key?: string }
router.post('/', async (req, res) => {
  try {
    const { sheet_text, key } = req.body;

    if (typeof sheet_text !== 'string' || sheet_text.trim() === '') {
      res.status(400).json({ error: 'sheet_text is required' });
      return;
    }

    const { data, error } = await supabase
      .from('chord_sheets')
      .insert({ sheet_text, key: key ?? null })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ sheet: data });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /sheets/:id
// Overwrites an existing sheet with transposed content and updated key.
// Body: { sheet_text: string, key?: string }
router.put('/:id', async (req, res) => {
  try {
    const { sheet_text, key } = req.body;

    if (typeof sheet_text !== 'string' || sheet_text.trim() === '') {
      res.status(400).json({ error: 'sheet_text is required' });
      return;
    }

    const { data, error } = await supabase
      .from('chord_sheets')
      .update({
        sheet_text,
        key: key ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', Number(req.params.id))
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
    const { error } = await supabase.from('chord_sheets').delete().eq('id', Number(req.params.id));

    if (error) throw error;

    res.json({ message: 'Sheet deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
