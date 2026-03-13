// Strategy Pattern (interface)
// All chord transformation algorithms implement this contract.
// New strategies (e.g. simplification) can be added without
// modifying any existing code.

export interface TranspositionStrategy {
  transpose(chordName: string, amount: number): string;
}
