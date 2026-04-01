import React, { useCallback, useRef, useState } from 'react';
import { saveSheet, transposeSheet } from './api/client';
import type { Sheet } from './api/client';
import ChordSheetEditor from './components/editor/ChordSheetEditor';
import TransposeControls from './components/editor/TransposeControls';
import SheetList from './components/sheets/SheetList';
import SaveModal from './components/ui/SaveModal';
import Toast from './components/ui/Toast';
import type { ToastMessage } from './components/ui/Toast';

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
  const [sheetName, setSheetName] = useState('');
  const [semitones, setSemitones] = useState(0);
  const [strategy, setStrategy] = useState<'semitone' | 'capo'>('semitone');
  const [capoFret, setCapoFret] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Track the "original" sheet text so Reset can restore it
  const originalTextRef = useRef('');

  const addToast = useCallback((text: string, type: 'success' | 'error') => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, text, type }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openNewEditor = () => {
    setSheetText('');
    setSheetName('');
    setSemitones(0);
    setCapoFret(0);
    setSelectedKey(null);
    originalTextRef.current = '';
    setView('editor');
  };

  const openExistingSheet = (sheet: Sheet) => {
    setSheetText(sheet.sheet_text);
    setSheetName(sheet.name);
    setSelectedKey(sheet.key);
    setSemitones(0);
    setCapoFret(0);
    originalTextRef.current = sheet.sheet_text;
    setView('editor');
  };

  // Called immediately when +/- is pressed — transposes by the delta only
  const handleTransposeImmediate = async (
    delta: number,
    strat: 'semitone' | 'capo',
    fret: number
  ) => {
    if (!sheetText.trim()) return;
    setLoading(true);
    try {
      const result = await transposeSheet({
        sheetText,
        semitones: strat === 'semitone' ? delta : undefined,
        strategy: strat,
        capoFret: strat === 'capo' ? fret : undefined,
      });
      setSheetText(result.transposedText);
      if (result.detectedKey && !selectedKey) {
        setSelectedKey(result.detectedKey);
      }
    } catch (e) {
      addToast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSheetText(originalTextRef.current);
    setSemitones(0);
    setCapoFret(0);
    setSelectedKey(null);
  };

  const handleSaveConfirm = async (name: string) => {
    if (!sheetText.trim()) return;
    setSaving(true);
    try {
      await saveSheet(name, sheetText, selectedKey);
      setSheetName(name);
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
            <button className="header__back" onClick={() => setView('list')}>← Back</button>
          )}
          <div className="header__brand">
            <span className="header__logo">♩</span>
            <span className="header__title">ChordShift</span>
          </div>
        </div>
        <div className="header__right">
          {view === 'editor' && (
            <>
              <button className="btn-link" onClick={() => { setSheetText(SAMPLE_SHEET); originalTextRef.current = SAMPLE_SHEET; }}>
                Load sample
              </button>
              <button className="btn-primary" onClick={() => setShowSaveModal(true)}>
                Save Sheet
              </button>
            </>
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
              selectedKey={selectedKey}
              sheetName={sheetName}
              onSemitonesChange={setSemitones}
              onStrategyChange={setStrategy}
              onCapoFretChange={setCapoFret}
              onTransposeImmediate={handleTransposeImmediate}
              onKeyChange={setSelectedKey}
              onNameChange={setSheetName}
              onReset={handleReset}
              loading={loading}
            />
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
          defaultName={sheetName}
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
