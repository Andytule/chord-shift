import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';

import sheetsRouter from '../routes/sheets';
import transposeRouter from '../routes/transpose';

jest.mock('../middleware/requireAuth', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction): void => {
    req.userId = 'test-user-id';
    next();
  },
}));

type SupabaseChainResult = { data?: unknown; error?: { message: string } | null };

type SupabaseChain = Promise<SupabaseChainResult> & {
  select: () => SupabaseChain;
  eq: () => SupabaseChain;
  order: () => SupabaseChain;
  limit: () => SupabaseChain;
  single: () => SupabaseChain;
  insert: () => SupabaseChain;
  update: () => SupabaseChain;
  delete: () => SupabaseChain;
};

let currentChain: SupabaseChain;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => currentChain),
    auth: { getUser: jest.fn() },
  })),
}));

function makeChain(result: SupabaseChainResult): SupabaseChain {
  const chain: SupabaseChain = Promise.resolve(result) as SupabaseChain;
  const methods: Array<keyof Omit<SupabaseChain, keyof Promise<SupabaseChainResult>>> = [
    'select',
    'eq',
    'order',
    'limit',
    'single',
    'insert',
    'update',
    'delete',
  ];
  methods.forEach((m) => {
    chain[m] = () => chain;
  });
  return chain;
}

function mockResult(result: SupabaseChainResult): void {
  currentChain = makeChain(result);
}

function buildApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/transpose', transposeRouter);
  app.use('/sheets', sheetsRouter);
  return app;
}

const app: express.Application = buildApp();

const MOCK_SHEET = {
  id: 1,
  name: 'My Sheet',
  sheet_text: 'G  D  Em  C',
  key: 'G',
  user_id: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: null,
};

describe('POST /transpose', () => {
  it('200: simple chord sheet up 2 semitones', async () => {
    const res = await request(app)
      .post('/transpose')
      .send({ sheetText: 'G  D  Em  C', semitones: 2 });

    expect(res.status).toBe(200);
    expect(res.body.transposedText).toBe('A  E  F#m  D');
    expect(res.body.originalChords).toEqual(['G', 'D', 'Em', 'C']);
    expect(res.body.transposedChords).toEqual(['A', 'E', 'F#m', 'D']);
  });

  it('200: down with negative semitones + useFlats', async () => {
    const res = await request(app)
      .post('/transpose')
      .send({ sheetText: 'G  D  Em  C', semitones: -2, useFlats: true });

    expect(res.status).toBe(200);
    expect(res.body.transposedText).toBe('F  C  Dm  Bb');
  });

  it('200: m7b5 altered chords are not truncated (regression)', async () => {
    const res = await request(app)
      .post('/transpose')
      .send({ sheetText: 'Bm7b5  E7  Am', semitones: 2 });

    expect(res.status).toBe(200);
    expect(res.body.transposedText).toBe('C#m7b5  F#7  Bm');
  });

  it('200: maj7#11 altered chords', async () => {
    const res = await request(app).post('/transpose').send({ sheetText: 'Fmaj7#11', semitones: 2 });

    expect(res.status).toBe(200);
    expect(res.body.transposedText).toBe('Gmaj7#11');
  });

  it('200: slash chords — both root and bass transposed', async () => {
    const res = await request(app)
      .post('/transpose')
      .send({ sheetText: 'G/B  D/F#  C/E', semitones: 2 });

    expect(res.status).toBe(200);
    expect(res.body.transposedText).toBe('A/C#  E/G#  D/F#');
  });

  it('200: useFlats=true forces flat notation', async () => {
    const res = await request(app)
      .post('/transpose')
      .send({ sheetText: 'C  G  Am  F', semitones: 1, useFlats: true });

    expect(res.status).toBe(200);
    expect(res.body.transposedText).toBe('Db  Ab  Bbm  Gb');
  });

  it('200: capo strategy transposes DOWN by capoFret', async () => {
    const res = await request(app)
      .post('/transpose')
      .send({ sheetText: 'A  D  E', strategy: 'capo', capoFret: 2 });

    expect(res.status).toBe(200);
    expect(res.body.transposedText).toBe('G  C  D');
  });

  it('200: lyric lines are left untouched', async () => {
    const sheet: string = 'G  D  Em\nThe words of the song\nC  G';
    const res = await request(app).post('/transpose').send({ sheetText: sheet, semitones: 2 });

    expect(res.status).toBe(200);
    const lines: string[] = (res.body.transposedText as string).split('\n');
    expect(lines[0]).toBe('A  E  F#m');
    expect(lines[1]).toBe('The words of the song');
    expect(lines[2]).toBe('D  A');
  });

  it('200: returns detectedKey from transposed sheet', async () => {
    const res = await request(app)
      .post('/transpose')
      .send({ sheetText: 'G  D  Em  G  G', semitones: 2 });

    expect(res.status).toBe(200);
    expect(res.body.detectedKey).toBe('A');
  });

  it('200: semitones defaults to 0 when omitted', async () => {
    const res = await request(app)
      .post('/transpose')
      .send({ sheetText: 'G  D  Em', strategy: 'semitone' });

    expect(res.status).toBe(200);
    expect(res.body.transposedText).toBe('G  D  Em');
  });

  it('400: missing sheetText', async () => {
    const res = await request(app).post('/transpose').send({ semitones: 2 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('400: whitespace-only sheetText', async () => {
    const res = await request(app).post('/transpose').send({ sheetText: '   ', semitones: 2 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('400: sheetText is not a string', async () => {
    const res = await request(app).post('/transpose').send({ sheetText: 42, semitones: 2 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /sheets', () => {
  it('200: returns sheets array', async () => {
    mockResult({ data: [MOCK_SHEET], error: null });

    const res = await request(app).get('/sheets').set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sheets');
    expect(Array.isArray(res.body.sheets)).toBe(true);
  });

  it('500: propagates Supabase error', async () => {
    mockResult({ data: null, error: { message: 'DB error' } });

    const res = await request(app).get('/sheets').set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(500);
  });
});

describe('GET /sheets/:id', () => {
  it('200: returns a single sheet', async () => {
    mockResult({ data: MOCK_SHEET, error: null });

    const res = await request(app).get('/sheets/1').set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sheet');
  });

  it('404: sheet not found (data is null)', async () => {
    mockResult({ data: null, error: null });

    const res = await request(app).get('/sheets/999').set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(404);
  });

  it('500: propagates Supabase error', async () => {
    mockResult({ data: null, error: { message: 'Not found in DB' } });

    const res = await request(app).get('/sheets/1').set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(500);
  });
});

describe('POST /sheets', () => {
  it('201: creates a sheet', async () => {
    mockResult({ data: MOCK_SHEET, error: null });

    const res = await request(app)
      .post('/sheets')
      .set('Authorization', 'Bearer fake-token')
      .send({ name: 'My Sheet', sheet_text: 'G  D  Em  C', key: 'G' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('sheet');
  });

  it('201: key field is optional', async () => {
    mockResult({ data: { ...MOCK_SHEET, key: null }, error: null });

    const res = await request(app)
      .post('/sheets')
      .set('Authorization', 'Bearer fake-token')
      .send({ name: 'My Sheet', sheet_text: 'G  D  Em  C' });

    expect(res.status).toBe(201);
  });

  it('400: missing name', async () => {
    const res = await request(app)
      .post('/sheets')
      .set('Authorization', 'Bearer fake-token')
      .send({ sheet_text: 'G  D  Em  C' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('400: missing sheet_text', async () => {
    const res = await request(app)
      .post('/sheets')
      .set('Authorization', 'Bearer fake-token')
      .send({ name: 'My Sheet' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sheet_text/i);
  });

  it('400: whitespace-only sheet_text', async () => {
    const res = await request(app)
      .post('/sheets')
      .set('Authorization', 'Bearer fake-token')
      .send({ name: 'My Sheet', sheet_text: '  ' });

    expect(res.status).toBe(400);
  });

  it('500: propagates Supabase insert error', async () => {
    mockResult({ data: null, error: { message: 'Insert failed' } });

    const res = await request(app)
      .post('/sheets')
      .set('Authorization', 'Bearer fake-token')
      .send({ name: 'My Sheet', sheet_text: 'G  D' });

    expect(res.status).toBe(500);
  });
});

describe('PUT /sheets/:id', () => {
  it('200: updates a sheet', async () => {
    mockResult({ data: { ...MOCK_SHEET, sheet_text: 'A  E  F#m  D' }, error: null });

    const res = await request(app)
      .put('/sheets/1')
      .set('Authorization', 'Bearer fake-token')
      .send({ name: 'Updated', sheet_text: 'A  E  F#m  D', key: 'A' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sheet');
  });

  it('400: missing sheet_text', async () => {
    const res = await request(app)
      .put('/sheets/1')
      .set('Authorization', 'Bearer fake-token')
      .send({ name: 'My Sheet' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sheet_text/i);
  });

  it('400: whitespace-only sheet_text', async () => {
    const res = await request(app)
      .put('/sheets/1')
      .set('Authorization', 'Bearer fake-token')
      .send({ name: 'My Sheet', sheet_text: '   ' });

    expect(res.status).toBe(400);
  });

  it('404: sheet not found', async () => {
    mockResult({ data: null, error: null });

    const res = await request(app)
      .put('/sheets/999')
      .set('Authorization', 'Bearer fake-token')
      .send({ sheet_text: 'G  D' });

    expect(res.status).toBe(404);
  });

  it('500: propagates Supabase update error', async () => {
    mockResult({ data: null, error: { message: 'Update failed' } });

    const res = await request(app)
      .put('/sheets/1')
      .set('Authorization', 'Bearer fake-token')
      .send({ sheet_text: 'G  D' });

    expect(res.status).toBe(500);
  });
});

describe('DELETE /sheets/:id', () => {
  it('200: deletes a sheet and returns confirmation message', async () => {
    mockResult({ error: null });

    const res = await request(app).delete('/sheets/1').set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('500: propagates Supabase delete error', async () => {
    mockResult({ error: { message: 'DB error' } });

    const res = await request(app).delete('/sheets/999').set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(500);
  });
});
