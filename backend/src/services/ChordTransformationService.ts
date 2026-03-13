// Orchestrates chord transformation across a full chord sheet.
// Parses free-form text (mixed lyrics + chords), builds a ChordProgression,
// applies the chosen strategy, then reconstructs the text with transposed
// chords in place — leaving lyrics and formatting untouched.

import { Chord } from '../lib/chord/Chord';
import { ChordProgression } from '../lib/chord/ChordProgression';
import type { TranspositionStrategy } from '../lib/transposer/TranspositionStrategy';
import { type StrategyType, TransformationFactory } from './TransformationFactory';

// Matches chord tokens: root note + optional sharp/flat + optional quality suffix
// Handles: Am, C#m7, Gsus4, Bb/F, Fmaj7, Ddim, Baug, etc.
const CHORD_REGEX = /\b([A-G][#b]?(?:maj|min|m|dim|aug|sus|add)?(?:\d+)?(?:\/[A-G][#b]?)?)\b/g;

// Common English words that match the chord regex but are not chords
const EXCLUDED_WORDS = new Set(['A', 'Be', 'Add', 'Age', 'Bag', 'Bed', 'Cab', 'Dad', 'Fab', 'Fad']);

// A line is treated as a chord line if at least half its tokens start with a note name.
// This prevents transposing words inside lyric lines.
function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const chordLike = tokens.filter((t) => /^[A-G][#b]?/.test(t)).length;
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

  transform(sheetText: string, amount: number): TransformResult {
    const originalChords: string[] = [];
    const transposedChords: string[] = [];

    const transposedText = sheetText
      .split('\n')
      .map((line) => {
        if (!isChordLine(line)) return line;

        return line.replace(CHORD_REGEX, (match) => {
          if (EXCLUDED_WORDS.has(match)) return match;

          // Build a Chord leaf and wrap in a ChordProgression composite,
          // then delegate transposition uniformly via the composite interface
          const chord = new Chord(match);
          const progression = new ChordProgression();
          progression.add(chord);
          progression.transpose(amount);

          const transposed = chord.toString();
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
    const matches = [...sheetText.matchAll(CHORD_REGEX)];
    if (matches.length === 0) return null;

    const freq: Record<string, number> = {};
    for (const [match] of matches) {
      const root = match.match(/^[A-G][#b]?/)?.[0];
      if (root) freq[root] = (freq[root] ?? 0) + 1;
    }

    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }
}
