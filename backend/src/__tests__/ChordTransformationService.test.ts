import { ChordTransformationService } from '../services/ChordTransformationService';

const svc: ChordTransformationService = new ChordTransformationService('semitone');

function transpose(text: string, semitones: number, useFlats?: boolean) {
  return svc.transform(text, semitones, useFlats);
}

describe('ChordTransformationService — chord line detection', () => {
  it('transposes a pure chord line', () => {
    const { transposedText } = transpose('G  D  Em  C', 2);
    expect(transposedText).toBe('A  E  F#m  D');
  });

  it('leaves a lyric line untouched', () => {
    const lyric: string = "The sun comes up, it's a new day dawning";
    const { transposedText } = transpose(lyric, 2);
    expect(transposedText).toBe(lyric);
  });

  it('leaves a section header untouched', () => {
    const header: string = '[Chorus]';
    const { transposedText } = transpose(header, 2);
    expect(transposedText).toBe(header);
  });

  it('leaves empty lines untouched', () => {
    const { transposedText } = transpose('\n\n', 2);
    expect(transposedText).toBe('\n\n');
  });

  it('handles mixed sheet — only chord lines change', () => {
    const sheet: string = [
      '[Verse 1]',
      'G               D             Em',
      "The sun comes up, it's a new day",
      'G               D             C',
      'Time to sing Your song again',
    ].join('\n');

    const { transposedText } = transpose(sheet, 2);
    const lines: string[] = transposedText.split('\n');

    expect(lines[0]).toBe('[Verse 1]');
    expect(lines[1]).toBe('A               E             F#m');
    expect(lines[2]).toBe("The sun comes up, it's a new day");
    expect(lines[3]).toBe('A               E             D');
    expect(lines[4]).toBe('Time to sing Your song again');
  });
});

describe('ChordTransformationService — common progressions', () => {
  it('I-V-vi-IV in G → A (up 2)', () => {
    const { transposedText } = transpose('G  D  Em  C', 2);
    expect(transposedText).toBe('A  E  F#m  D');
  });

  it('ii-V-I in C → D (up 2)', () => {
    const { transposedText } = transpose('Dm7  G7  Cmaj7', 2);
    expect(transposedText).toBe('Em7  A7  Dmaj7');
  });

  it('12-bar blues in E → F# (up 2)', () => {
    const { transposedText } = transpose('E7  A7  B7', 2);
    expect(transposedText).toBe('F#7  B7  C#7');
  });

  it('works going down: G down 2 = F', () => {
    const { transposedText } = transpose('G  D  Em  C', -2, true);
    expect(transposedText).toBe('F  C  Dm  Bb');
  });
});

describe('ChordTransformationService — altered chords (regression)', () => {
  it('transposes m7b5 (half-diminished) chords correctly', () => {
    const { transposedText } = transpose('Bm7b5  E7  Am', 2);
    expect(transposedText).toBe('C#m7b5  F#7  Bm');
  });

  it('transposes m7#11 chords correctly', () => {
    const { transposedText } = transpose('Cm7#11', 2);
    expect(transposedText).toBe('Dm7#11');
  });

  it('transposes maj7#11 chords correctly', () => {
    const { transposedText } = transpose('Fmaj7#11', 2);
    expect(transposedText).toBe('Gmaj7#11');
  });

  it('transposes 7b9 dominant chords correctly', () => {
    const { transposedText } = transpose('G7b9', 2);
    expect(transposedText).toBe('A7b9');
  });

  it('transposes 7#9 dominant chords correctly', () => {
    const { transposedText } = transpose('G7#9', 2);
    expect(transposedText).toBe('A7#9');
  });

  it('transposes dim7 correctly', () => {
    const { transposedText } = transpose('Bdim7', 2);
    expect(transposedText).toBe('C#dim7');
  });
});

describe('ChordTransformationService — slash chords', () => {
  it('transposes both root and bass: G/B + 2 = A/C#', () => {
    const { transposedText } = transpose('G/B', 2);
    expect(transposedText).toBe('A/C#');
  });

  it('D/F# + 2 = E/G#', () => {
    const { transposedText } = transpose('D/F#', 2);
    expect(transposedText).toBe('E/G#');
  });

  it('Fmaj7/A + 2 = Gmaj7/B', () => {
    const { transposedText } = transpose('Fmaj7/A', 2);
    expect(transposedText).toBe('Gmaj7/B');
  });

  it('Am7/G + 2 = Bm7/A', () => {
    const { transposedText } = transpose('Am7/G', 2);
    expect(transposedText).toBe('Bm7/A');
  });
});

describe('ChordTransformationService — sharp/flat preference', () => {
  it('useFlats=true forces flat notation', () => {
    const { transposedText } = transpose('C', 1, true);
    expect(transposedText).toBe('Db');
  });

  it('useFlats=false forces sharp notation', () => {
    const { transposedText } = transpose('C', 1, false);
    expect(transposedText).toBe('C#');
  });

  it('auto-detects flat keys: C + 5 → F key uses flats', () => {
    const { transposedText } = transpose('C  G  Am  F', 5);
    expect(transposedText).toBe('F  C  Dm  Bb');
  });

  it('auto-detects sharp keys: C + 2 → D key uses sharps', () => {
    const { transposedText } = transpose('C  G  Am  F', 2);
    expect(transposedText).toBe('D  A  Bm  G');
  });
});

describe('ChordTransformationService — chord tracking', () => {
  it('returns parallel original and transposed chord arrays', () => {
    const { originalChords, transposedChords } = transpose('G  D  Em  C', 2);
    expect(originalChords).toEqual(['G', 'D', 'Em', 'C']);
    expect(transposedChords).toEqual(['A', 'E', 'F#m', 'D']);
  });

  it('only includes chords from chord lines (not lyrics)', () => {
    const sheet = 'G  D  Em\nThe words of the song';
    const { originalChords } = transpose(sheet, 2);
    expect(originalChords).toEqual(['G', 'D', 'Em']);
  });

  it('returns empty arrays when no chord lines present', () => {
    const { originalChords, transposedChords } = transpose('just some lyrics here', 2);
    expect(originalChords).toEqual([]);
    expect(transposedChords).toEqual([]);
  });
});

describe('ChordTransformationService — detectKey', () => {
  it('detects the most frequent root as the key', () => {
    const sheet = 'G  D  Em\nG  D  C\nG';
    expect(svc.detectKey(sheet)).toBe('G');
  });

  it('returns null for text with no chords', () => {
    expect(svc.detectKey('just some lyrics here')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(svc.detectKey('')).toBeNull();
  });

  it('detects key from a realistic sheet', () => {
    const sheet = ['Am  F  C  G', 'Am  F  C  G', 'Am  Em  F  G'].join('\n');
    const key = svc.detectKey(sheet);
    expect(key).toBe('A');
  });
});

describe('ChordTransformationService — excluded words', () => {
  it('does not transpose "Be" on a chord-like line', () => {
    const { transposedText } = transpose('Be  G  D', 2);
    expect(transposedText).toContain('Be');
    expect(transposedText).toContain('A');
    expect(transposedText).toContain('E');
  });

  it('does not transpose "Add" on a chord-like line', () => {
    const { transposedText } = transpose('Add  G', 2);
    expect(transposedText).toContain('Add');
  });
});

describe('ChordTransformationService — formatting preservation', () => {
  it('preserves spacing between chords', () => {
    const { transposedText } = transpose('G               D             Em', 2);
    expect(transposedText).toBe('A               E             F#m');
  });

  it('preserves multi-line structure', () => {
    const input = 'G  D\n\nEm  C\n';
    const { transposedText } = transpose(input, 2);
    const lines = transposedText.split('\n');
    expect(lines[0]).toBe('A  E');
    expect(lines[1]).toBe('');
    expect(lines[2]).toBe('F#m  D');
  });
});

describe('ChordTransformationService — capo strategy', () => {
  const capoSvc: ChordTransformationService = new ChordTransformationService('capo');

  it('capo 2: transposes chord sheet DOWN by 2', () => {
    const { transposedText } = capoSvc.transform('A  D  E', 2);
    expect(transposedText).toBe('G  C  D');
  });

  it('capo 0 is a no-op', () => {
    const { transposedText } = capoSvc.transform('G  C  D', 0);
    expect(transposedText).toBe('G  C  D');
  });

  it('setStrategy switches from semitone to capo', () => {
    const s: ChordTransformationService = new ChordTransformationService('semitone');
    s.setStrategy('capo');
    const { transposedText } = s.transform('A  D  E', 2);
    expect(transposedText).toBe('G  C  D');
  });
});
