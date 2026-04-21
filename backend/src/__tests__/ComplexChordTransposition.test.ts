import { CapoTransposer } from '../lib/transposers/CapoTransposer';
import { SemitoneTransposer } from '../lib/transposers/SemitoneTransposer';
import { ChordTransformationService } from '../services/ChordTransformationService';

const semitone: SemitoneTransposer = new SemitoneTransposer();
const capo: CapoTransposer = new CapoTransposer();
const svc: ChordTransformationService = new ChordTransformationService('semitone');

function roundTrip(chord: string, steps: number, useFlats?: boolean): string {
  const up: string = semitone.transpose(chord, steps, useFlats);
  return semitone.transpose(up, -steps, useFlats);
}

function sheetRoundTrip(text: string, steps: number, useFlats?: boolean): string {
  const { transposedText: up } = svc.transform(text, steps, useFlats);
  const { transposedText: back } = svc.transform(up, -steps, useFlats);
  return back;
}

describe('SemitoneTransposer — round-trip identity', () => {
  const sharpChords: string[] = [
    'C',
    'Cm',
    'C#',
    'F#',
    'Cmaj7',
    'Dm7',
    'G7',
    'F#m7',
    'Bm7b5',
    'G7b9',
    'G7#9',
    'Fmaj7#11',
    'Cm7#11',
    'Gsus4',
    'Dsus2',
    'Cadd9',
    'Dadd9',
    'Bdim7',
    'Gdim',
    'Faug',
    'G/B',
    'D/F#',
    'C/E',
    'Am7/G',
    'Fmaj7/A',
  ];

  const flatChords: string[] = [
    'Db',
    'Bb',
    'Bbmaj7',
    'Ebmaj7',
    'Cm7b5',
    'Bb/D',
    'Eb/G',
    'Ab/C',
    'Bbm7/Ab',
  ];

  const stepSets: number[] = [1, 2, 3, 5, 7, 11];

  sharpChords.forEach((chord) => {
    stepSets.forEach((steps) => {
      it(`${chord} +${steps} then -${steps} returns original`, () => {
        expect(roundTrip(chord, steps, false)).toBe(chord);
      });

      it(`${chord} -${steps} then +${steps} returns original`, () => {
        const down: string = semitone.transpose(chord, -steps, false);
        const back: string = semitone.transpose(down, steps, false);
        expect(back).toBe(chord);
      });
    });
  });

  flatChords.forEach((chord) => {
    stepSets.forEach((steps) => {
      it(`${chord} +${steps} then -${steps} returns original`, () => {
        expect(roundTrip(chord, steps, true)).toBe(chord);
      });

      it(`${chord} -${steps} then +${steps} returns original`, () => {
        const down: string = semitone.transpose(chord, -steps, true);
        const back: string = semitone.transpose(down, steps, true);
        expect(back).toBe(chord);
      });
    });
  });

  it('round-trips through all 12 semitones back to C', () => {
    expect(roundTrip('C', 12)).toBe('C');
  });

  it('round-trips Bbmaj7 through 12 semitones', () => {
    expect(roundTrip('Bbmaj7', 12)).toBe('Bbmaj7');
  });
});

describe('SemitoneTransposer — round-trip with useFlats=true', () => {
  const flatChords: string[] = ['Db', 'Gb', 'Bbm7', 'Ebmaj7', 'Ab7', 'Dbmaj7'];

  flatChords.forEach((chord) => {
    [2, 5, 7].forEach((steps) => {
      it(`${chord} +${steps}/-${steps} (useFlats=true) round-trips`, () => {
        expect(roundTrip(chord, steps, true)).toBe(chord);
      });
    });
  });
});

describe('SemitoneTransposer — round-trip with useFlats=false (sharps)', () => {
  const sharpChords: string[] = ['C#', 'F#', 'C#m7', 'F#maj7', 'B7', 'A#m'];

  sharpChords.forEach((chord) => {
    [2, 4, 7].forEach((steps) => {
      it(`${chord} +${steps}/-${steps} (useFlats=false) round-trips`, () => {
        expect(roundTrip(chord, steps, false)).toBe(chord);
      });
    });
  });
});

describe('SemitoneTransposer — enharmonic boundaries round-trip', () => {
  it('C# + 1 = D, D - 1 = C#', () => {
    expect(semitone.transpose(semitone.transpose('C#', 1, false), -1, false)).toBe('C#');
  });

  it('Db + 1 = D, D - 1 stays as Db (useFlats)', () => {
    const up: string = semitone.transpose('Db', 1, true);
    const back: string = semitone.transpose(up, -1, true);
    expect(back).toBe('Db');
  });

  it('F# + 1 = G, G - 1 = F#', () => {
    expect(semitone.transpose(semitone.transpose('F#', 1, false), -1, false)).toBe('F#');
  });

  it('Gb + 1 = G, G - 1 = Gb (useFlats)', () => {
    const up: string = semitone.transpose('Gb', 1, true);
    const back: string = semitone.transpose(up, -1, true);
    expect(back).toBe('Gb');
  });

  it('Bm7b5 crosses enharmonic boundary and returns: +1 -1', () => {
    expect(roundTrip('Bm7b5', 1, false)).toBe('Bm7b5');
  });

  it('Ebm7b5 crosses enharmonic boundary and returns: +3 -3 (useFlats)', () => {
    expect(roundTrip('Ebm7b5', 3, true)).toBe('Ebm7b5');
  });
});

describe('CapoTransposer — round-trip via semitone inverse', () => {
  const chords: string[] = ['A', 'D', 'E', 'Am', 'Bm7', 'Dmaj7', 'G/B', 'Bm7b5'];
  const frets: number[] = [2, 3, 4, 5];

  chords.forEach((chord) => {
    frets.forEach((fret) => {
      it(`${chord} capo ${fret} then +${fret} semitones returns original`, () => {
        const capoResult = capo.transpose(chord, fret);
        const back = semitone.transpose(capoResult, fret);
        expect(back).toBe(chord);
      });
    });
  });
});

describe('ChordTransformationService — full sheet round-trip', () => {
  const sheets: {
    name: string;
    text: string;
    useFlats?: boolean;
  }[] = [
    {
      name: 'I-V-vi-IV in G',
      text: 'G  D  Em  C',
    },
    {
      name: 'ii-V-I jazz (Cm7 Fm7 Bbmaj7)',
      text: 'Cm7  Fm7  Bb7  Ebmaj7',
      useFlats: true,
    },
    {
      name: 'altered jazz (Bm7b5 E7b9 Am)',
      text: 'Bm7b5  E7b9  Am',
    },
    {
      name: 'slash chords (G/B D/F# Am/E)',
      text: 'G/B  D/F#  Am/E  C/G',
    },
    {
      name: 'maj7#11 and sus chords',
      text: 'Fmaj7#11  Gsus4  Cadd9  Dm7',
    },
    {
      name: 'realistic mixed sheet',
      text: [
        '[Verse]',
        'Am        F         C         G',
        "When the night is calling, I can't stay",
        'Am        F         C         E7',
        'I will find my way back home',
        '',
        '[Chorus]',
        'F         C         G         Am',
        'Oh, raise your voice and sing',
      ].join('\n'),
    },
    {
      name: 'flat-heavy sheet (Bb/Eb/Ab)',
      text: 'Bbmaj7  Ebmaj7  Ab7  Db',
      useFlats: true,
    },
    {
      name: 'diminished / augmented mix',
      text: 'Bdim7  Faug  Cdim  Gaug',
    },
  ];

  const steps: number[] = [1, 2, 3, 5, 7];

  sheets.forEach(({ name, text, useFlats }) => {
    steps.forEach((n) => {
      it(`"${name}" +${n}/-${n} is identity`, () => {
        expect(sheetRoundTrip(text, n, useFlats)).toBe(text);
      });

      it(`"${name}" -${n}/+${n} is identity`, () => {
        const { transposedText: down } = svc.transform(text, -n, useFlats);
        const { transposedText: back } = svc.transform(down, n, useFlats);
        expect(back).toBe(text);
      });
    });
  });

  it('round-trip preserves blank lines and headers', () => {
    const sheet: string = '[Intro]\n\nG  D  Em\n\n[Verse]\nAm  F  C\n';
    expect(sheetRoundTrip(sheet, 4)).toBe(sheet);
  });

  it('round-trip preserves spacing layout between chords', () => {
    const sheet: string = 'G               D             Em              C';
    expect(sheetRoundTrip(sheet, 3)).toBe(sheet);
  });
});

describe('SemitoneTransposer — jazz and complex chord known values', () => {
  it('G13 + 2 = A13', () => {
    expect(semitone.transpose('G13', 2, false)).toBe('A13');
  });

  it('Bb13 + 2 (useFlats) = C13', () => {
    expect(semitone.transpose('Bb13', 2, true)).toBe('C13');
  });

  it('C9 + 5 = F9', () => {
    expect(semitone.transpose('C9', 5, false)).toBe('F9');
  });

  it('D9 - 2 (useFlats) = C9', () => {
    expect(semitone.transpose('D9', -2, true)).toBe('C9');
  });

  it('Fmaj7#11 + 7 = Cmaj7#11', () => {
    expect(semitone.transpose('Fmaj7#11', 7, false)).toBe('Cmaj7#11');
  });

  it('Bbmaj7#11 + 2 (useFlats) = Cmaj7#11', () => {
    expect(semitone.transpose('Bbmaj7#11', 2, true)).toBe('Cmaj7#11');
  });

  it('Am7b5 + 2 = Bm7b5', () => {
    expect(semitone.transpose('Am7b5', 2, false)).toBe('Bm7b5');
  });

  it('Dm7b5 + 3 (useFlats) = Fm7b5', () => {
    expect(semitone.transpose('Dm7b5', 3, true)).toBe('Fm7b5');
  });

  it('Ebm7b5 + 1 = Em7b5', () => {
    expect(semitone.transpose('Ebm7b5', 1, false)).toBe('Em7b5');
  });

  it('G7b9 + 5 (useFlats) = C7b9', () => {
    expect(semitone.transpose('G7b9', 5, true)).toBe('C7b9');
  });

  it('D7#9 + 7 = A7#9', () => {
    expect(semitone.transpose('D7#9', 7, false)).toBe('A7#9');
  });

  it('Bb7b9 + 5 (useFlats) = Eb7b9', () => {
    expect(semitone.transpose('Bb7b9', 5, true)).toBe('Eb7b9');
  });

  it('Cdim7 + 3 = Ebdim7', () => {
    expect(semitone.transpose('Cdim7', 3, true)).toBe('Ebdim7');
  });

  it('F#dim7 + 2 = G#dim7', () => {
    expect(semitone.transpose('F#dim7', 2, false)).toBe('G#dim7');
  });

  it('Caug + 4 = Eaug', () => {
    expect(semitone.transpose('Caug', 4, false)).toBe('Eaug');
  });

  it('Cmaj7/E + 2 = Dmaj7/F#', () => {
    expect(semitone.transpose('Cmaj7/E', 2, false)).toBe('Dmaj7/F#');
  });

  it('Am7b5/Eb + 2 = Bm7b5/F', () => {
    expect(semitone.transpose('Am7b5/Eb', 2, false)).toBe('Bm7b5/F');
  });

  it('Bbmaj7/D + 2 (useFlats) = Cmaj7/E', () => {
    expect(semitone.transpose('Bbmaj7/D', 2, true)).toBe('Cmaj7/E');
  });

  it('G7b9/F + 5 (useFlats) = C7b9/Bb', () => {
    expect(semitone.transpose('G7b9/F', 5, true)).toBe('C7b9/Bb');
  });
});

describe('ChordTransformationService — modulation back-and-forth', () => {
  it('ii-V-I in C → G and back (up 7, down 7)', () => {
    const original: string = 'Dm7  G7  Cmaj7';
    const up: string = svc.transform(original, 7, false).transposedText;
    expect(up).toBe('Am7  D7  Gmaj7');
    expect(svc.transform(up, -7, false).transposedText).toBe(original);
  });

  it('iii-VI-ii-V in C → F and back (up 5, down 5)', () => {
    const original: string = 'Em7  Am7  Dm7  G7';
    const { transposedText: up } = svc.transform(original, 5, true);
    expect(up).toBe('Am7  Dm7  Gm7  C7');
    expect(svc.transform(up, -5, true).transposedText).toBe(original);
  });

  it('I-IV-V blues in E → A and back (up 5, down 5)', () => {
    const original: string = 'E7  A7  B7';
    const { transposedText: up } = svc.transform(original, 5, false);
    expect(up).toBe('A7  D7  E7');
    expect(svc.transform(up, -5, false).transposedText).toBe(original);
  });

  it('flat-key jazz: Bbmaj7 Cm7 Dm7 Ebmaj7 → Eb and back (up 5, down 5)', () => {
    const original: string = 'Bbmaj7  Cm7  Dm7  Ebmaj7';
    const { transposedText: up } = svc.transform(original, 5, true);
    expect(up).toBe('Ebmaj7  Fm7  Gm7  Abmaj7');
    expect(svc.transform(up, -5, true).transposedText).toBe(original);
  });

  it('tritone substitution: G7 ↔ Db7 (up 6, down 6)', () => {
    const original = 'G7';
    const { transposedText: up } = svc.transform(original, 6, true);
    expect(up).toBe('Db7');
    expect(svc.transform(up, -6, false).transposedText).toBe(original);
  });

  it('chromatic mediant: C → Ab and back (up 8, down 8 useFlats)', () => {
    const original: string = 'C  Em  F  G';
    const { transposedText: up } = svc.transform(original, 8, true);
    expect(up).toBe('Ab  Cm  Db  Eb');
    expect(svc.transform(up, -8, false).transposedText).toBe(original);
  });

  it('half-step modulation up and back: Am → Bbm → Am', () => {
    const original: string = 'Am  Dm  E7';
    const { transposedText: up } = svc.transform(original, 1, true);
    expect(up).toBe('Bbm  Ebm  F7');
    expect(svc.transform(up, -1, false).transposedText).toBe(original);
  });

  it('relative key: C → Am back and forth (same chords, different framing)', () => {
    const original: string = 'C  Em  Am  F  G';
    const up9: string = svc.transform(original, 9, false).transposedText;
    const back: string = svc.transform(up9, -9, false).transposedText;
    expect(back).toBe(original);
  });
});

describe('ChordTransformationService (capo) — round-trip', () => {
  const capoSvc: ChordTransformationService = new ChordTransformationService('capo');

  it('capo 2 then capo back via semitone +2 returns original: A D E', () => {
    const original: string = 'A  D  E';
    const { transposedText: caped } = capoSvc.transform(original, 2);
    const { transposedText: back } = svc.transform(caped, 2, false);
    expect(back).toBe(original);
  });

  it('capo 5 on complex sheet round-trips', () => {
    const original: string = 'Am7  Dm7  G7  Cmaj7';
    const { transposedText: caped } = capoSvc.transform(original, 5);
    const { transposedText: back } = svc.transform(caped, 5, false);
    expect(back).toBe(original);
  });

  it('capo 3 then semitone +3 on slash chords', () => {
    const original: string = 'G/B  D/F#  C/E  Am/E';
    const { transposedText: caped } = capoSvc.transform(original, 3);
    const { transposedText: back } = svc.transform(caped, 3, false);
    expect(back).toBe(original);
  });
});

describe('SemitoneTransposer — zero semitone idempotency', () => {
  const chords: string[] = [
    'C',
    'Cm',
    'Cmaj7',
    'C#',
    'Db',
    'Bb',
    'F#m7b5',
    'G7#9',
    'Ebmaj7',
    'Am7/G',
    'Bm7b5/F',
    'Fmaj7#11',
  ];

  chords.forEach((chord) => {
    it(`${chord} + 0 = ${chord}`, () => {
      expect(semitone.transpose(chord, 0)).toBe(chord);
    });
  });
});
