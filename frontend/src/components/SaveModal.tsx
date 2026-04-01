import React, { useState } from 'react';

interface Props {
  defaultName?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  saving: boolean;
}

const SaveModal: React.FC<Props> = ({ defaultName = '', onConfirm, onCancel, saving }) => {
  const [name, setName] = useState(defaultName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onConfirm(name.trim());
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Save Sheet</h2>
        <p className="modal__subtitle">Give your chord sheet a name</p>
        <form onSubmit={handleSubmit}>
          <input
            className="modal__input"
            type="text"
            placeholder="e.g. Wonderwall – Oasis"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <div className="modal__actions">
            <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!name.trim() || saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveModal;
