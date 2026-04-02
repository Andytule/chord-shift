// Orchestrates chord transformation across a full chord sheet.
// Parses free-form text (mixed lyrics + chords), builds a ChordProgression,
// applies the chosen strategy, then reconstructs the text with transposed
// chords in place — leaving lyrics and formatting untouched.

import { Chord } from '../lib/chord/Chord';
import { ChordProgression } from '../lib/chord/ChordProgression';
import { destinationUsesFlats } from '../lib/transposers/SemitoneTransposer';
import type { TranspositionStrategy } from '../lib/transposers/TranspositionStrategy';
import { type StrategyType, TransformationFactory } from './TransformationFactory';

// Matches chord tokens: root note + optional sharp/flat + optional quality suffix
// Covers: Am, C#m7, Gsus4, Bb/F, Fmaj7, Ddim, Baug, G2, Ab2, Bb2, A/C#, etc.
// Uses lookahead/lookbehind instead of \b so that sharps (#) are included in the token.
const CHORD_REGEX: RegExp =
  /(?<![A-Za-z])([A-G][#b]?(?:maj|min|m|dim|aug|sus|add)?(?:\d+)?(?:\/[A-G][#b]?)?)(?![A-Za-z#b])/g;

// Common English words that match the chord regex but are not chords.
// NOTE: Do NOT add 'A' here — it is a valid note name that must be transposed.
const EXCLUDED_WORDS: Set<string> = new Set([
  'Be',
  'Add',
  'Age',
  'Bag',
  'Bed',
  'Cab',
  'Dad',
  'Fab',
  'Fad',
]);

// A line is treated as a chord line if at least half its tokens start with a note name.
// This prevents transposing words inside lyric lines.
function isChordLine(line: string): boolean {
  const tokens: string[] = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const chordLike: number = tokens.filter((t) => /^[A-G][#b]?/.test(t)).length;
  return chordLike / tokens.length >= 0.5;
}

export interface TransformResult {
  transposedText: string;
  originalChords: string[];
  transposedChords: string[];
}

export class ChordTransformationService {
  private strategy: TranspositionStrategy;

  constructor(strategyType: StrategyType = 'semitone') {
    this.strategy = TransformationFactory.createStrategy(strategyType);
  }

  setStrategy(strategyType: StrategyType): void {
    this.strategy = TransformationFactory.createStrategy(strategyType);
  }

  transform(sheetText: string, amount: number, useFlats?: boolean): TransformResult {
    const originalChords: string[] = [];
    const transposedChords: string[] = [];

    // Determine flat/sharp preference once for the whole sheet so every chord
    // is consistent. Use the caller's explicit override if provided; otherwise
    // derive from the most frequent root note in the sheet.
    let preferFlats: boolean;
    if (useFlats !== undefined) {
      preferFlats = useFlats;
    } else {
      const detectedKey = this.detectKey(sheetText);
      if (detectedKey) {
        preferFlats = destinationUsesFlats(detectedKey, amount);
      } else {
        preferFlats = false;
      }
    }

    const transposedText = sheetText
      .split('\n')
      .map((line) => {
        if (!isChordLine(line)) return line;

        return line.replace(CHORD_REGEX, (match) => {
          if (EXCLUDED_WORDS.has(match)) return match;

          // Build a Chord leaf and wrap in a ChordProgression composite,
          // then delegate transposition uniformly via the composite interface
          const chord: Chord = new Chord(match);
          const progression: ChordProgression = new ChordProgression();
          progression.add(chord);
          progression.transpose(amount, preferFlats);

          const transposed: string = chord.toString();
          originalChords.push(match);
          transposedChords.push(transposed);

          return transposed;
        });
      })
      .join('\n');

    return { transposedText, originalChords, transposedChords };
  }

  // Detects the likely key by finding the most frequent root note in the sheet
  detectKey(sheetText: string): string | null {
    const matches: RegExpExecArray[] = [...sheetText.matchAll(CHORD_REGEX)];
    if (matches.length === 0) return null;

    const freq: Record<string, number> = {};
    for (const [match] of matches) {
      const root: string | undefined = match.match(/^[A-G][#b]?/)?.[0];
      if (root) freq[root] = (freq[root] ?? 0) + 1;
    }

    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }
}
