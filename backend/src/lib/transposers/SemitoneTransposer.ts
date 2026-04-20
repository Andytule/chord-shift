import type { TranspositionStrategy } from './TranspositionStrategy';

const SHARPS: string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS: string[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const UNAMBIGUOUS_FLAT_DESTS: Set<string> = new Set(['F', 'Bb', 'Eb', 'Ab']);

export function destinationUsesFlats(sourceRoot: string, semitones: number): boolean {
  let index: number = SHARPS.indexOf(sourceRoot);
  const sourceIsFlat: boolean = index === -1;
  if (index === -1) index = FLATS.indexOf(sourceRoot);
  if (index === -1) return false;

  const newIndex: number = (((index + semitones) % 12) + 12) % 12;
  const destFlatName: string = FLATS[newIndex];

  if (UNAMBIGUOUS_FLAT_DESTS.has(destFlatName)) return true;

  if (destFlatName !== 'Db' && destFlatName !== 'Gb') return false;

  return sourceIsFlat;
}

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

    const preferFlats: boolean =
      useFlats !== undefined ? useFlats : destinationUsesFlats(root, amount);

    const newRoot: string = transposeRoot(root, amount, preferFlats);
    const newBass: string = bass ? '/' + transposeRoot(bass, amount, preferFlats) : '';

    return newRoot + quality + newBass;
  }
}
