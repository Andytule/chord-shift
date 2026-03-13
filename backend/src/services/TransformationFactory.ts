// Factory Pattern
// Creates the correct TranspositionStrategy based on a type string.
// Controllers never instantiate strategies directly — all creation
// logic is centralised here.

import { CapoTransposer } from '../lib/transposers/CapoTransposer';
import { SemitoneTransposer } from '../lib/transposers/SemitoneTransposer';
import type { TranspositionStrategy } from '../lib/transposers/TranspositionStrategy';

export type StrategyType = 'semitone' | 'capo';

export class TransformationFactory {
  static createStrategy(type: StrategyType): TranspositionStrategy {
    switch (type) {
      case 'semitone':
        return new SemitoneTransposer();
      case 'capo':
        return new CapoTransposer();
      default:
        throw new Error(`Unknown strategy type: ${type}`);
    }
  }
}
