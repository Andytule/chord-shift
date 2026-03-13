// Strategy Pattern (concrete strategy)
// Transposes a chord by a given number of semitones.
// Positive = up, negative = down. Handles sharps, flats,
// and all common chord quality suffixes.

import type { TranspositionStrategy } from './TranspositionStrategy';

const SHARPS: string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS: string[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Keys that conventionally use flat notation
const FLAT_KEYS = new Set([
  'F',
  'Bb',
  'Eb',
  'Ab',
  'Db',
  'Gb',
  'Dm',
  'Gm',
  'Cm',
  'Fm',
  'Bbm',
  'Ebm',
]);

function shouldUseFlats(root: string, semitones: number): boolean {
  const index = SHARPS.indexOf(root) !== -1 ? SHARPS.indexOf(root) : FLATS.indexOf(root);
  if (index === -1) return false;
  const newIndex = (((index + semitones) % 12) + 12) % 12;
  return FLAT_KEYS.has(SHARPS[newIndex]) || FLAT_KEYS.has(SHARPS[newIndex] + 'm');
}

// Parses "C#m7" → { root: "C#", suffix: "m7" }
function parseChord(chord: string): { root: string; suffix: string } | null {
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return null;
  return { root: match[1], suffix: match[2] };
}

export class SemitoneTransposer implements TranspositionStrategy {
  transpose(chordName: string, amount: number): string {
    const parsed = parseChord(chordName);
    if (!parsed) return chordName;

    const { root, suffix } = parsed;

    let index = SHARPS.indexOf(root);
    if (index === -1) index = FLATS.indexOf(root);
    if (index === -1) return chordName;

    const newIndex = (((index + amount) % 12) + 12) % 12;
    const newRoot = shouldUseFlats(root, amount) ? FLATS[newIndex] : SHARPS[newIndex];

    return newRoot + suffix;
  }
}
