import { destinationUsesFlats } from '../lib/transposers/SemitoneTransposer';
import type { TranspositionStrategy } from '../lib/transposers/TranspositionStrategy';
import { type StrategyType, TransformationFactory } from './TransformationFactory';

const CHORD_REGEX: RegExp =
  /(?<![A-Za-z])([A-G][#b]?(?:maj|min|m|dim|aug|sus|add)?(?:\d+)?(?:[b#]\d+)*(?:\/[A-G][#b]?)?)(?![A-Za-z])/g;

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
  private strategyType: StrategyType;

  constructor(strategyType: StrategyType = 'semitone') {
    this.strategyType = strategyType;
    this.strategy = TransformationFactory.createStrategy(strategyType);
  }

  setStrategy(strategyType: StrategyType): void {
    this.strategyType = strategyType;
    this.strategy = TransformationFactory.createStrategy(strategyType);
  }

  transform(sheetText: string, amount: number, useFlats?: boolean): TransformResult {
    const originalChords: string[] = [];
    const transposedChords: string[] = [];

    const effectiveSemitones: number = this.strategyType === 'capo' ? -amount : amount;

    let preferFlats: boolean;
    if (useFlats !== undefined) {
      preferFlats = useFlats;
    } else {
      const detectedKey = this.detectKey(sheetText);
      if (detectedKey) {
        preferFlats = destinationUsesFlats(detectedKey, effectiveSemitones);
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
          const transposed: string = this.strategy.transpose(match, amount, preferFlats);

          originalChords.push(match);
          transposedChords.push(transposed);

          return transposed;
        });
      })
      .join('\n');

    return { transposedText, originalChords, transposedChords };
  }

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
