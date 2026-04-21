import React, { useEffect, useState } from 'react';

import { deleteSheet, getSheets, type Sheet } from '../../api/client';
import ConfirmModal from '../ui/ConfirmModal';

interface Props {
  onOpen: (sheet: Sheet) => void;
  onCreate: () => void;
  refreshTrigger: number;
}

const SheetList: React.FC<Props> = ({ onOpen, onCreate, refreshTrigger }) => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getSheets()
      .then(setSheets)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  const confirmDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteId(id);
  };

  const handleDeleteConfirmed = async () => {
    if (pendingDeleteId === null) return;
    try {
      await deleteSheet(pendingDeleteId);
      setSheets((prev) => prev.filter((s) => s.id !== pendingDeleteId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="sheet-list-view">
      <div className="sheet-list-view__header">
        <div>
          <h1 className="page-title">My Sheets</h1>
          <p className="page-subtitle">Your saved chord sheets</p>
        </div>
        <button className="btn-primary" onClick={onCreate}>
          + New Sheet
        </button>
      </div>

      {loading && <div className="list-state">Loading…</div>}
      {error && <div className="list-state list-state--error">Error: {error}</div>}

      {!loading && !error && sheets.length === 0 && (
        <div className="list-empty">
          <div className="list-empty__icon">♪</div>
          <p className="list-empty__text">No sheets yet</p>
          <p className="list-empty__sub">Create your first chord sheet to get started</p>
          <button className="btn-primary" onClick={onCreate}>
            + New Sheet
          </button>
        </div>
      )}

      {!loading && sheets.length > 0 && (
        <div className="sheet-grid">
          {sheets.map((sheet) => {
            const preview: string = sheet.sheet_text
              .split('\n')
              .filter((l) => l.trim() && !l.startsWith('['))
              .slice(0, 2)
              .join('  ·  ');
            const date: string = new Date(sheet.created_at ?? '').toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            return (
              <div key={sheet.id} className="sheet-card" onClick={() => onOpen(sheet)}>
                <div className="sheet-card__top">
                  <span className="sheet-card__name">{sheet.name}</span>
                  {sheet.key && <span className="sheet-card__key-badge">{sheet.key}</span>}
                </div>
                <div className="sheet-card__preview">{preview || 'Empty sheet'}</div>
                <div className="sheet-card__footer">
                  <span className="sheet-card__date">{date}</span>
                  <button
                    className="sheet-card__delete"
                    onClick={(e) => confirmDelete(sheet.id, e)}
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pendingDeleteId !== null && (
        <ConfirmModal
          title="Delete Sheet"
          message="Are you sure you want to delete this sheet? This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
};

export default SheetList;
