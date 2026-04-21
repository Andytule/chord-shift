import React from 'react';

const KEYS = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
];

interface Props {
  semitones: number;
  selectedKey: string | null;
  sheetName: string;
  useFlats: boolean;
  onTransposeImmediate: (delta: number) => void;
  onKeyChange: (key: string | null) => void;
  onNameChange: (name: string) => void;
  onUseFlatsChange: (v: boolean) => void;
  onReset: () => void;
  loading: boolean;
}

const TransposeControls: React.FC<Props> = ({
  semitones,
  selectedKey,
  sheetName,
  useFlats,
  onTransposeImmediate,
  onKeyChange,
  onNameChange,
  onUseFlatsChange,
  onReset,
  loading,
}) => {
  const handleStep = (delta: number) => {
    onTransposeImmediate(delta);
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
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>

      {/* Semitone stepper */}
      <div className="control-group">
        <label className="control-label">Transpose</label>
        <div className="stepper">
          <button className="step-btn" onClick={() => handleStep(-1)} disabled={loading}>
            −
          </button>
          <span className="step-value">{semitones > 0 ? `+${semitones}` : semitones}</span>
          <button className="step-btn" onClick={() => handleStep(1)} disabled={loading}>
            +
          </button>
        </div>
      </div>

      {/* Sharps / Flats toggle */}
      <div className="control-group">
        <label className="control-label">Notation</label>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${!useFlats ? 'active' : ''}`}
            onClick={() => onUseFlatsChange(false)}
          >
            ♯ Sharps
          </button>
          <button
            className={`toggle-btn ${useFlats ? 'active' : ''}`}
            onClick={() => onUseFlatsChange(true)}
          >
            ♭ Flats
          </button>
        </div>
      </div>

      <div className="control-actions">
        <button className="btn-ghost" onClick={onReset}>
          Reset
        </button>
      </div>
    </div>
  );
};

export default TransposeControls;
