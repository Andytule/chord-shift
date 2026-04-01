import React from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const ChordSheetEditor: React.FC<Props> = ({ value, onChange, placeholder }) => {
  return (
    <textarea
      className="sheet-textarea"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
    />
  );
};

export default ChordSheetEditor;
