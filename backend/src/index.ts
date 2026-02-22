import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Supabase client (using anon key for now – safe for read/write demos)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Simple root route to confirm server works
app.get('/', (req, res) => {
  res.json({ message: 'ChordShift Backend is running' });
});

// Test endpoint: insert + fetch a dummy chord sheet
app.get('/test-db', async (req, res) => {
  try {
    // Insert sample data
    const { data: insertData, error: insertError } = await supabase
      .from('chord_sheets')
      .insert({
        original_progression: 'C Am F G',
        transposed_progression: 'D Bm G A',
        key: 'D major',
      })
      .select();

    if (insertError) throw insertError;

    // Fetch recent sheets
    const { data: sheets, error: fetchError } = await supabase
      .from('chord_sheets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (fetchError) throw fetchError;

    res.json({
      inserted: insertData,
      recent_sheets: sheets,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
  console.log('Test DB connection: http://localhost:5000/test-db');
});