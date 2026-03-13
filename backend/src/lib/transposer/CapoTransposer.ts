// Strategy Pattern (concrete strategy)
// Capo strategy: transposes chord names DOWN by the capo fret amount
// so the player can use open-position shapes.
// e.g. song in A, capo 2 → player reads and plays G shapes.

import { SemitoneTransposer } from './SemitoneTransposer';
import type { TranspositionStrategy } from './TranspositionStrategy';

export class CapoTransposer implements TranspositionStrategy {
  private semitoneTransposer = new SemitoneTransposer();

  // amount = capo fret position (e.g. 2 = capo on fret 2)
  transpose(chordName: string, amount: number): string {
    return this.semitoneTransposer.transpose(chordName, -amount);
  }
}
