import React, { useCallback, useState } from 'react';
import { saveSheet, transposeSheet } from './api/client';
import type { Sheet } from './api/client';
import ChordSheetEditor from './components/ChordSheetEditor';
import SaveModal from './components/SaveModal';
import SheetList from './components/SheetList';
import Toast from './components/Toast';
import type { ToastMessage } from './components/Toast';
import TransposeControls from './components/TransposeControls';

type View = 'list' | 'editor';

const SAMPLE_SHEET = `[Verse 1]
G               D             Em
The sun comes up, it's a new day dawning
G               D             Em       C
It's time to sing Your song again

[Chorus]
G    D    Em   C
Whatever may pass
G         D          C
And whatever lies before me`;

let toastCounter = 0;

const App = (): React.ReactElement => {
  const [view, setView] = useState<View>('list');
  const [sheetText, setSheetText] = useState('');
  const [semitones, setSemitones] = useState(0);
  const [strategy, setStrategy] = useState<'semitone' | 'capo'>('semitone');
  const [capoFret, setCapoFret] = useState(0);
  const [detectedKey, setDetectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const addToast = useCallback((text: string, type: 'success' | 'error') => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, text, type }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openNewEditor = () => {
    setSheetText('');
    setSemitones(0);
    setCapoFret(0);
    setDetectedKey(null);
    setView('editor');
  };

  const openExistingSheet = (sheet: Sheet) => {
    setSheetText(sheet.sheet_text);
    setDetectedKey(sheet.key);
    setSemitones(0);
    setCapoFret(0);
    setView('editor');
  };

  const handleTranspose = async () => {
    if (!sheetText.trim()) {
      addToast('Please enter a chord sheet first.', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await transposeSheet({
        sheetText,
        semitones: strategy === 'semitone' ? semitones : undefined,
        strategy,
        capoFret: strategy === 'capo' ? capoFret : undefined,
      });
      setSheetText(result.transposedText);
      setDetectedKey(result.detectedKey);
    } catch (e) {
      addToast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSemitones(0);
    setCapoFret(0);
  };

  const handleSaveConfirm = async (name: string) => {
    if (!sheetText.trim()) return;
    setSaving(true);
    try {
      await saveSheet(name, sheetText, detectedKey);
      addToast('Sheet saved!', 'success');
      setRefreshTrigger((n) => n + 1);
      setShowSaveModal(false);
    } catch (e) {
      addToast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header__left">
          {view === 'editor' && (
            <button className="header__back" onClick={() => setView('list')}>
              ← Back
            </button>
          )}
          <div className="header__brand">
            <span className="header__logo">♩</span>
            <span className="header__title">ChordShift</span>
          </div>
        </div>
        <div className="header__right">
          {view === 'editor' && (
            <button className="btn-primary" onClick={() => setShowSaveModal(true)}>
              Save Sheet
            </button>
          )}
        </div>
      </header>

      <main className="main">
        {view === 'list' && (
          <SheetList
            onOpen={openExistingSheet}
            onCreate={openNewEditor}
            refreshTrigger={refreshTrigger}
          />
        )}

        {view === 'editor' && (
          <div className="editor-view">
            <TransposeControls
              semitones={semitones}
              strategy={strategy}
              capoFret={capoFret}
              onSemitonesChange={setSemitones}
              onStrategyChange={setStrategy}
              onCapoFretChange={setCapoFret}
              onTranspose={handleTranspose}
              onReset={handleReset}
              loading={loading}
            />

            <div className="editor-meta">
              {detectedKey && (
                <span className="key-badge">Key: <strong>{detectedKey}</strong></span>
              )}
              <button className="btn-link" onClick={() => setSheetText(SAMPLE_SHEET)}>
                Load sample
              </button>
            </div>

            <ChordSheetEditor
              value={sheetText}
              onChange={setSheetText}
              placeholder={"Paste your chord sheet here…\n\nChords go on their own line above lyrics:\n\nG         D        Em\nThe sun comes up, it's a new day"}
            />
          </div>
        )}
      </main>

      {showSaveModal && (
        <SaveModal
          onConfirm={handleSaveConfirm}
          onCancel={() => setShowSaveModal(false)}
          saving={saving}
        />
      )}

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
