import express from "express";
import cors from "cors";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { Express } from "express";

dotenv.config();

const app: Express = express();
const port: string | 5000 = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Supabase client (using anon key for now – safe for read/write demos)
const supabaseUrl: string = process.env.SUPABASE_URL || "";
const supabaseKey: string = process.env.SUPABASE_ANON_KEY || "";
const supabase: SupabaseClient<any, "public", "public", any, any> =
  createClient(supabaseUrl, supabaseKey);

// Simple root route to confirm server works
app.get("/", (req, res) => {
  res.json({ message: "ChordShift Backend is running" });
});

app.get("/sheets", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("chord_sheets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({ sheets: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint: insert + fetch a dummy chord sheet
app.get("/test-db", async (req, res) => {
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

    // Insert sample data
    const { data: insertData, error: insertError } = await supabase
      .from("chord_sheets")
      .insert({
        sheet_text: sampleSheetText,
        key: "F major",
      })
      .select();

    if (insertError) throw insertError;

    // Fetch recent sheets
    const { data: sheets, error: fetchError } = await supabase
      .from("chord_sheets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (fetchError) throw fetchError;

    res.json({
      message: "DB test successful",
      inserted: insertData,
      recent_sheets: sheets,
    });
  } catch (error: any) {
    console.error("DB test error:", error);
    res.status(500).json({ 
      error: error.message || "Unknown error",
      details: error.details || error.hint || "No additional details"
    });
  }
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
  console.log("Test DB connection: http://localhost:5000/test-db");
});
