import { Router } from 'express';

import { ChordTransformationService } from '../services/ChordTransformationService';
import type { StrategyType } from '../services/TransformationFactory';

const router = Router();

// POST /transpose
// Transposes a chord sheet and returns the result. Does not persist anything.
//
// Body:
//   sheetText : string               — full chord sheet (mixed lyrics + chords)
//   semitones : number               — semitones to shift (positive = up, negative = down)
//   strategy  : "semitone" | "capo"  — defaults to "semitone"
//   capoFret  : number               — used when strategy is "capo"
//
// Response:
//   transposedText   : string
//   originalChords   : string[]
//   transposedChords : string[]
//   detectedKey      : string | null

router.post('/', (req, res) => {
  try {
    const { sheetText, semitones, strategy = 'semitone', capoFret } = req.body;

    if (typeof sheetText !== 'string' || sheetText.trim() === '') {
      res.status(400).json({ error: 'sheetText is required' });
      return;
    }

    const amount =
      strategy === 'capo'
        ? typeof capoFret === 'number'
          ? capoFret
          : 0
        : typeof semitones === 'number'
          ? semitones
          : 0;

    const service = new ChordTransformationService(strategy as StrategyType);
    const result = service.transform(sheetText, amount);
    const detectedKey = service.detectKey(result.transposedText);

    res.json({ ...result, detectedKey });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
