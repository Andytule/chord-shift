const BASE_URL = 'http://localhost:5001';

export interface TransposeRequest {
  sheetText: string;
  semitones?: number;
  strategy?: 'semitone' | 'capo';
  capoFret?: number;
  useFlats?: boolean;
}

export interface TransposeResponse {
  transposedText: string;
  originalChords: string[];
  transposedChords: string[];
  detectedKey: string | null;
}

export interface Sheet {
  id: number;
  name: string;
  sheet_text: string;
  key: string | null;
  created_at: string;
  updated_at: string | null;
}

export async function transposeSheet(req: TransposeRequest): Promise<TransposeResponse> {
  const res = await fetch(`${BASE_URL}/transpose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? 'Transpose failed');
  }
  return res.json();
}

export async function getSheets(): Promise<Sheet[]> {
  const res = await fetch(`${BASE_URL}/sheets`);
  if (!res.ok) throw new Error('Failed to fetch sheets');
  const data = await res.json();
  return data.sheets;
}

export async function saveSheet(name: string, sheetText: string, key?: string | null): Promise<Sheet> {
  const res = await fetch(`${BASE_URL}/sheets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, sheet_text: sheetText, key }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? 'Save failed');
  }
  const data = await res.json();
  return data.sheet;
}

export async function updateSheet(id: number, name: string, sheetText: string, key?: string | null): Promise<Sheet> {
  const res = await fetch(`${BASE_URL}/sheets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, sheet_text: sheetText, key }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? 'Update failed');
  }
  const data = await res.json();
  return data.sheet;
}

export async function getNextUntitledName(): Promise<string> {
  const sheets = await getSheets();
  const pattern = /^untitled_chord_sheet_(\d+)$/i;
  const taken = new Set(
    sheets
      .map((s) => s.name.trim())
      .filter((n) => pattern.test(n))
      .map((n) => parseInt(pattern.exec(n)![1], 10))
  );
  let n = 1;
  while (taken.has(n)) n++;
  return `untitled_chord_sheet_${n}`;
}

export async function deleteSheet(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/sheets/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Delete failed');
}
