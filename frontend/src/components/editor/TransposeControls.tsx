import React from 'react';

const KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

interface Props {
  semitones: number;
  strategy: 'semitone' | 'capo';
  capoFret: number;
  selectedKey: string | null;
  sheetName: string;
  onSemitonesChange: (v: number) => void;
  onStrategyChange: (v: 'semitone' | 'capo') => void;
  onCapoFretChange: (v: number) => void;
  onTransposeImmediate: (semitones: number, strategy: 'semitone' | 'capo', capoFret: number) => void;
  onKeyChange: (key: string | null) => void;
  onNameChange: (name: string) => void;
  onReset: () => void;
  loading: boolean;
}

const TransposeControls: React.FC<Props> = ({
  semitones,
  strategy,
  capoFret,
  selectedKey,
  sheetName,
  onSemitonesChange,
  onStrategyChange,
  onCapoFretChange,
  onTransposeImmediate,
  onKeyChange,
  onNameChange,
  onReset,
  loading,
}) => {
  const handleSemitoneStep = (delta: number) => {
    const next = semitones + delta;
    onSemitonesChange(next);
    onTransposeImmediate(delta, 'semitone', capoFret);
  };

  const handleCapoStep = (delta: number) => {
    const next = Math.max(0, capoFret + delta);
    if (next === capoFret) return;
    onCapoFretChange(next);
    onTransposeImmediate(semitones, 'capo', next);
  };

  return (
    <div className="controls-bar">
      {/* Sheet name */}
      <div className="control-group control-group--name">
        <label className="control-label">Sheet Name</label>
        <input
          className="control-input"
          type="text"
          value={sheetName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Untitled sheet"
        />
      </div>

      {/* Key selector */}
      <div className="control-group">
        <label className="control-label">Key</label>
        <select
          className="control-select"
          value={selectedKey ?? ''}
          onChange={(e) => onKeyChange(e.target.value || null)}
        >
          <option value="">— Auto —</option>
          {KEYS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      {/* Mode toggle */}
      <div className="control-group">
        <label className="control-label">Mode</label>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${strategy === 'semitone' ? 'active' : ''}`}
            onClick={() => onStrategyChange('semitone')}
          >
            Semitone
          </button>
          <button
            className={`toggle-btn ${strategy === 'capo' ? 'active' : ''}`}
            onClick={() => onStrategyChange('capo')}
          >
            Capo
          </button>
        </div>
      </div>

      {/* Stepper */}
      {strategy === 'semitone' ? (
        <div className="control-group">
          <label className="control-label">Semitones</label>
          <div className="stepper">
            <button className="step-btn" onClick={() => handleSemitoneStep(-1)} disabled={loading}>−</button>
            <span className="step-value">{semitones > 0 ? `+${semitones}` : semitones}</span>
            <button className="step-btn" onClick={() => handleSemitoneStep(1)} disabled={loading}>+</button>
          </div>
        </div>
      ) : (
        <div className="control-group">
          <label className="control-label">Capo Fret</label>
          <div className="stepper">
            <button className="step-btn" onClick={() => handleCapoStep(-1)} disabled={loading}>−</button>
            <span className="step-value">{capoFret}</span>
            <button className="step-btn" onClick={() => handleCapoStep(1)} disabled={loading}>+</button>
          </div>
        </div>
      )}

      <div className="control-actions">
        <button className="btn-ghost" onClick={onReset}>Reset</button>
      </div>
    </div>
  );
};

export default TransposeControls;
