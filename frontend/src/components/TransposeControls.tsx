import React from 'react';

interface Props {
  semitones: number;
  strategy: 'semitone' | 'capo';
  capoFret: number;
  onSemitonesChange: (v: number) => void;
  onStrategyChange: (v: 'semitone' | 'capo') => void;
  onCapoFretChange: (v: number) => void;
  onTranspose: () => void;
  onReset: () => void;
  loading: boolean;
}

const TransposeControls: React.FC<Props> = ({
  semitones,
  strategy,
  capoFret,
  onSemitonesChange,
  onStrategyChange,
  onCapoFretChange,
  onTranspose,
  onReset,
  loading,
}) => {
  return (
    <div className="controls-bar">
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

      {strategy === 'semitone' ? (
        <div className="control-group">
          <label className="control-label">Semitones</label>
          <div className="stepper">
            <button className="step-btn" onClick={() => onSemitonesChange(semitones - 1)}>−</button>
            <span className="step-value">{semitones > 0 ? `+${semitones}` : semitones}</span>
            <button className="step-btn" onClick={() => onSemitonesChange(semitones + 1)}>+</button>
          </div>
        </div>
      ) : (
        <div className="control-group">
          <label className="control-label">Capo Fret</label>
          <div className="stepper">
            <button className="step-btn" onClick={() => onCapoFretChange(Math.max(0, capoFret - 1))}>−</button>
            <span className="step-value">{capoFret}</span>
            <button className="step-btn" onClick={() => onCapoFretChange(capoFret + 1)}>+</button>
          </div>
        </div>
      )}

      <div className="control-actions">
        <button className="btn-ghost" onClick={onReset}>Reset</button>
        <button className="btn-primary" onClick={onTranspose} disabled={loading}>
          {loading ? 'Transposing…' : 'Transpose'}
        </button>
      </div>
    </div>
  );
};

export default TransposeControls;
