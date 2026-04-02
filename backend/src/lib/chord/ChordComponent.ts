// Composite Pattern (component interface)
// Both Chord (leaf) and ChordProgression (composite) implement this,
// allowing the transformation service to operate on either uniformly.

export interface ChordComponent {
  transpose(semitones: number, useFlats?: boolean): void;
  toString(): string;
}
