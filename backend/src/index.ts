import { createClient, SupabaseClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import type { Database } from '../../types/supabase';

dotenv.config();

const app = express();
const port: string | 5001 = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const supabaseUrl: string = process.env.SUPABASE_URL || '';
const supabaseKey: string = process.env.SUPABASE_ANON_KEY || '';
const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseKey);

app.get('/', (req, res) => {
  res.json({ message: 'ChordShift Backend is running' });
});

app.get('/sheets', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chord_sheets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({ sheets: data });
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message || String(error),
    });
  }
});

app.get('/test-db', async (req, res) => {
  try {
    const sampleSheetText = `
([Intro]

F   C   G
F   C   G


[Verse 1]

               F
Give me eyes to see 
C                         G
More of who You are 
                 F
May what I behold
C                       G
Still my anxious heart 
...
    `.trim();

    const { data: insertData, error: insertError } = await supabase
      .from('chord_sheets')
      .insert({
        sheet_text: sampleSheetText,
        key: 'F major',
      })
      .select();

    if (insertError) throw insertError;

    const { data: sheets, error: fetchError } = await supabase
      .from('chord_sheets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (fetchError) throw fetchError;

    res.json({
      message: 'DB test successful',
      inserted: insertData,
      recent_sheets: sheets,
    });
  } catch (error) {
    console.error('DB test error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    let details = 'No additional details';
    if (error && typeof error === 'object' && 'details' in error) {
      details = String((error as { details?: unknown }).details ?? details);
    }
    if (error && typeof error === 'object' && 'hint' in error) {
      details += ` | Hint: ${String((error as { hint?: unknown }).hint)}`;
    }

    res.status(500).json({
      error: message,
      details,
    });
  }
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
  console.log('Test DB connection: http://localhost:5001/test-db');
});
