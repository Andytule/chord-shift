import React, { useEffect, useState } from 'react';
import { deleteSheet, getSheets } from '../api/client';
import type { Sheet } from '../api/client';

interface Props {
  onLoad: (sheet: Sheet) => void;
  refreshTrigger: number;
}

const SavedSheets: React.FC<Props> = ({ onLoad, refreshTrigger }) => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSheets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSheets();
      setSheets(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheets();
  }, [refreshTrigger]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSheet(id);
      setSheets((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) return <div className="sheets-state">Loading saved sheets…</div>;
  if (error) return <div className="sheets-state sheets-state--error">Error: {error}</div>;
  if (sheets.length === 0)
    return <div className="sheets-state">No saved sheets yet. Transpose and save one!</div>;

  return (
    <div className="saved-sheets">
      {sheets.map((sheet) => {
        const preview = sheet.sheet_text.split('\n').find((l) => l.trim()) ?? '';
        const date = new Date(sheet.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return (
          <div
            key={sheet.id}
            className="sheet-card"
            onClick={() => onLoad(sheet)}
            title="Click to load into editor"
          >
            <div className="sheet-card__body">
              <div className="sheet-card__preview">{preview}</div>
              <div className="sheet-card__meta">
                {sheet.key && <span className="sheet-card__key">Key: {sheet.key}</span>}
                <span className="sheet-card__date">{date}</span>
              </div>
            </div>
            <button
              className="sheet-card__delete"
              onClick={(e) => handleDelete(sheet.id, e)}
              title="Delete sheet"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default SavedSheets;
