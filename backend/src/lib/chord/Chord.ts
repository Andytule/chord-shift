// Composite Pattern (leaf)
// Represents a single chord token. Holds its name and knows
// how to transpose itself via the SemitoneTransposer.

import { SemitoneTransposer } from '../transposer/SemitoneTransposer';
import type { ChordComponent } from './ChordComponent';

const transposer = new SemitoneTransposer();

export class Chord implements ChordComponent {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }

  transpose(semitones: number): void {
    this.name = transposer.transpose(this.name, semitones);
  }

  toString(): string {
    return this.name;
  }
}
