// Strategy Pattern (concrete strategy)
// Transposes a chord by a given number of semitones.
// Positive = up, negative = down. Handles sharps, flats,
// and all common chord quality suffixes.

import type { TranspositionStrategy } from './TranspositionStrategy';

const SHARPS: string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS: string[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Root note indices (0-11) that conventionally use flat notation as a destination key
const FLAT_KEY_INDICES: Set<number> = new Set([
  5, // F
  10, // Bb
  3, // Eb
  8, // Ab
  1, // Db
  6, // Gb
]);

/**
 * Given a source root and a semitone shift, should the destination key use flats?
 * Called once per sheet so all chords are consistent.
 */
export function destinationUsesFlats(sourceRoot: string, semitones: number): boolean {
  let index: number = SHARPS.indexOf(sourceRoot);
  if (index === -1) index = FLATS.indexOf(sourceRoot);
  if (index === -1) return false;
  const newIndex: number = (((index + semitones) % 12) + 12) % 12;
  return FLAT_KEY_INDICES.has(newIndex);
}

// Parses "C#m7" → { root: "C#", quality: "m7", bass: null }
// Parses "A/Db"  → { root: "A",  quality: "",   bass: "Db" }
function parseChord(chord: string): { root: string; quality: string; bass: string | null } | null {
  const match: RegExpMatchArray | null = chord.match(/^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/);
  if (!match) return null;
  return { root: match[1], quality: match[2] ?? '', bass: match[3] ?? null };
}

function transposeRoot(root: string, amount: number, useFlats: boolean): string {
  let index: number = SHARPS.indexOf(root);
  if (index === -1) index = FLATS.indexOf(root);
  if (index === -1) return root;
  const newIndex: number = (((index + amount) % 12) + 12) % 12;
  return useFlats ? FLATS[newIndex] : SHARPS[newIndex];
}

export class SemitoneTransposer implements TranspositionStrategy {
  transpose(chordName: string, amount: number, useFlats?: boolean): string {
    const parsed = parseChord(chordName);
    if (!parsed) return chordName;

    const { root, quality, bass } = parsed;

    // Explicit override wins; otherwise derive from where root lands after transposition
    const preferFlats: boolean =
      useFlats !== undefined ? useFlats : destinationUsesFlats(root, amount);

    const newRoot: string = transposeRoot(root, amount, preferFlats);
    const newBass: string = bass ? '/' + transposeRoot(bass, amount, preferFlats) : '';

    return newRoot + quality + newBass;
  }
}
