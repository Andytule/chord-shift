import { destinationUsesFlats, SemitoneTransposer } from '../lib/transposers/SemitoneTransposer';

const t = new SemitoneTransposer();

describe('destinationUsesFlats', () => {
  it('C+5 = F (unambiguous flat key) → true', () => {
    expect(destinationUsesFlats('C', 5)).toBe(true);
  });

  it('C+10 = Bb (unambiguous flat key) → true', () => {
    expect(destinationUsesFlats('C', 10)).toBe(true);
  });

  it('C+3 = Eb (unambiguous flat key) → true', () => {
    expect(destinationUsesFlats('C', 3)).toBe(true);
  });

  it('C+8 = Ab (unambiguous flat key) → true', () => {
    expect(destinationUsesFlats('C', 8)).toBe(true);
  });

  it('C+7 = G (sharp key) → false', () => {
    expect(destinationUsesFlats('C', 7)).toBe(false);
  });

  it('C+2 = D (natural) → false', () => {
    expect(destinationUsesFlats('C', 2)).toBe(false);
  });

  it('C-2 = Bb (flat key) → true', () => {
    expect(destinationUsesFlats('C', -2)).toBe(true);
  });

  it('Bb+2 = C (natural) → false', () => {
    expect(destinationUsesFlats('Bb', 2)).toBe(false);
  });

  it('E+2 = F#/Gb: sharp source (E) → F# (false)', () => {
    expect(destinationUsesFlats('E', 2)).toBe(false);
  });

  it('B+2 = C#/Db: sharp source (B) → C# (false)', () => {
    expect(destinationUsesFlats('B', 2)).toBe(false);
  });

  it('Bb+2 landing on C#/Db: natural source → C (false)', () => {
    expect(destinationUsesFlats('Bb', 2)).toBe(false);
  });

  it('Gb+2 = Ab (flat source, flat dest) → true', () => {
    expect(destinationUsesFlats('Gb', 2)).toBe(true);
  });

  it('Db+2 = Eb (flat key) → true', () => {
    expect(destinationUsesFlats('Db', 2)).toBe(true);
  });

  it('returns false for unrecognised root', () => {
    expect(destinationUsesFlats('X', 2)).toBe(false);
  });
});

describe('SemitoneTransposer — basic transposition', () => {
  const chromatic: string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  chromatic.forEach((note, i) => {
    const next: string = chromatic[(i + 1) % 12];
    it(`${note} + 1 semitone = ${next}`, () => {
      expect(t.transpose(note, 1, false)).toBe(next);
    });
  });

  it('wraps around: B + 1 = C', () => {
    expect(t.transpose('B', 1, false)).toBe('C');
  });

  it('C + 12 = C (octave)', () => {
    expect(t.transpose('C', 12, false)).toBe('C');
  });

  it('C - 1 = B (going down)', () => {
    expect(t.transpose('C', -1, false)).toBe('B');
  });

  it('C - 12 = C (octave down)', () => {
    expect(t.transpose('C', -12, false)).toBe('C');
  });

  it('C + 0 = C (no change)', () => {
    expect(t.transpose('C', 0, false)).toBe('C');
  });
});

describe('SemitoneTransposer — sharp/flat output', () => {
  it('uses sharps when useFlats=false: C + 1 = C#', () => {
    expect(t.transpose('C', 1, false)).toBe('C#');
  });

  it('uses flats when useFlats=true: C + 1 = Db', () => {
    expect(t.transpose('C', 1, true)).toBe('Db');
  });

  it('uses sharps for F# (enharmonic of Gb): G - 1 useFlats=false = F#', () => {
    expect(t.transpose('G', -1, false)).toBe('F#');
  });

  it('uses flats for Gb: G - 1 useFlats=true = Gb', () => {
    expect(t.transpose('G', -1, true)).toBe('Gb');
  });

  it('handles flat input root: Bb + 2 = C', () => {
    expect(t.transpose('Bb', 2, false)).toBe('C');
  });

  it('handles flat input root: Eb + 2 = F', () => {
    expect(t.transpose('Eb', 2, false)).toBe('F');
  });
});

describe('SemitoneTransposer — chord quality preservation', () => {
  const cases: Array<[string, number, boolean, string]> = [
    ['Am', 2, false, 'Bm'],
    ['Am', 2, true, 'Bm'],
    ['Cmaj7', 2, false, 'Dmaj7'],
    ['Fmaj7', 2, false, 'Gmaj7'],
    ['G7', 2, false, 'A7'],
    ['Dm7', 2, false, 'Em7'],
    ['Gsus4', 2, false, 'Asus4'],
    ['Csus2', 2, false, 'Dsus2'],
    ['Cadd9', 2, false, 'Dadd9'],
    ['Gdim', 2, false, 'Adim'],
    ['Gdim7', 2, false, 'Adim7'],
    ['Faug', 2, false, 'Gaug'],
    ['Fmin7', 2, false, 'Gmin7'],
    ['Asus2', 2, false, 'Bsus2'],
    ['C#m7', 2, false, 'D#m7'],
    ['Bbmaj7', 2, true, 'Cmaj7'],
    ['Ebm', 2, true, 'Fm'],
  ];

  cases.forEach(([input, semitones, useFlats, expected]) => {
    it(`${input} + ${semitones} (useFlats=${useFlats}) = ${expected}`, () => {
      expect(t.transpose(input, semitones, useFlats)).toBe(expected);
    });
  });
});

describe('SemitoneTransposer — altered extensions (regression)', () => {
  it('Bm7b5 + 2 = C#m7b5', () => {
    expect(t.transpose('Bm7b5', 2, false)).toBe('C#m7b5');
  });

  it('Cm7b5 + 2 = Dm7b5', () => {
    expect(t.transpose('Cm7b5', 2, false)).toBe('Dm7b5');
  });

  it('Ebm7b5 + 2 useFlats = Fm7b5', () => {
    expect(t.transpose('Ebm7b5', 2, true)).toBe('Fm7b5');
  });

  it('Am7b5 + 3 useFlats = Cm7b5', () => {
    expect(t.transpose('Am7b5', 3, true)).toBe('Cm7b5');
  });

  it('Cm7#11 + 2 = Dm7#11', () => {
    expect(t.transpose('Cm7#11', 2, false)).toBe('Dm7#11');
  });

  it('Fmaj7#11 + 2 = Gmaj7#11', () => {
    expect(t.transpose('Fmaj7#11', 2, false)).toBe('Gmaj7#11');
  });

  it('Bb7b9 + 2 useFlats = C7b9', () => {
    expect(t.transpose('Bb7b9', 2, true)).toBe('C7b9');
  });

  it('G7#9 + 2 = A7#9', () => {
    expect(t.transpose('G7#9', 2, false)).toBe('A7#9');
  });

  it('dim7 variants: Bdim7 + 2 = C#dim7', () => {
    expect(t.transpose('Bdim7', 2, false)).toBe('C#dim7');
  });
});

describe('SemitoneTransposer — slash chords', () => {
  it('G/B + 2 = A/C#', () => {
    expect(t.transpose('G/B', 2, false)).toBe('A/C#');
  });

  it('D/F# + 2 = E/G#', () => {
    expect(t.transpose('D/F#', 2, false)).toBe('E/G#');
  });

  it('C/E + 2 = D/F#', () => {
    expect(t.transpose('C/E', 2, false)).toBe('D/F#');
  });

  it('F/A + 2 useFlats = G/B', () => {
    expect(t.transpose('F/A', 2, false)).toBe('G/B');
  });

  it('Fmaj7/A + 2 = Gmaj7/B', () => {
    expect(t.transpose('Fmaj7/A', 2, false)).toBe('Gmaj7/B');
  });

  it('A/C# + 2 = B/D#', () => {
    expect(t.transpose('A/C#', 2, false)).toBe('B/D#');
  });

  it('Bb/D + 2 useFlats = C/E', () => {
    expect(t.transpose('Bb/D', 2, true)).toBe('C/E');
  });

  it('Am7/G + 2 = Bm7/A', () => {
    expect(t.transpose('Am7/G', 2, false)).toBe('Bm7/A');
  });
});

describe('SemitoneTransposer — edge cases', () => {
  it('returns input unchanged for unrecognised chord', () => {
    expect(t.transpose('X', 2, false)).toBe('X');
  });

  it('handles large positive shift (24 semitones = 2 octaves)', () => {
    expect(t.transpose('C', 24, false)).toBe('C');
  });

  it('handles large negative shift (-24 semitones)', () => {
    expect(t.transpose('G', -24, false)).toBe('G');
  });

  it('handles single-note natural root (no quality)', () => {
    expect(t.transpose('A', 3, false)).toBe('C');
  });
});
