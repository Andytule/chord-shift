import React, { useCallback, useRef, useState } from 'react';
import { saveSheet, transposeSheet } from './api/client';
import type { Sheet } from './api/client';
import ChordSheetEditor from './components/editor/ChordSheetEditor';
import TransposeControls from './components/editor/TransposeControls';
import SheetList from './components/sheets/SheetList';
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
  const [useFlats, setUseFlats] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
    setUseFlats(false);
    setSelectedKey(null);
    originalTextRef.current = '';
    setView('editor');
  };

  const openExistingSheet = (sheet: Sheet) => {
    setSheetText(sheet.sheet_text);
    setSheetName(sheet.name);
    setSelectedKey(sheet.key);
    setSemitones(0);
    setUseFlats(false);
    originalTextRef.current = sheet.sheet_text;
    setView('editor');
  };

  const handleTransposeImmediate = async (delta: number) => {
    if (!sheetText.trim()) return;
    setLoading(true);
    try {
      const result = await transposeSheet({
        sheetText,
        semitones: delta,
        strategy: 'semitone',
        useFlats,
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

  const handleUseFlatsChange = async (newUseFlats: boolean) => {
    setUseFlats(newUseFlats);
    if (!sheetText.trim()) return;
    setLoading(true);
    try {
      // Re-transpose the current text by 0 semitones to rewrite notation only
      const result = await transposeSheet({
        sheetText,
        semitones: 0,
        strategy: 'semitone',
        useFlats: newUseFlats,
      });
      setSheetText(result.transposedText);
    } catch (e) {
      addToast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSheetText(originalTextRef.current);
    setSemitones(0);
    setSelectedKey(null);
  };

  const handleSave = async () => {
    if (!sheetText.trim()) return;
    const name = sheetName.trim() || 'Untitled sheet';
    setSaving(true);
    try {
      await saveSheet(name, sheetText, selectedKey);
      setSheetName(name);
      addToast('Sheet saved!', 'success');
      setRefreshTrigger((n) => n + 1);
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
          <div className="header__brand" onClick={() => setView('list')} style={{ cursor: 'pointer' }}>
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
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Sheet'}
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
              selectedKey={selectedKey}
              sheetName={sheetName}
              useFlats={useFlats}
              onSemitonesChange={setSemitones}
              onTransposeImmediate={handleTransposeImmediate}
              onKeyChange={setSelectedKey}
              onNameChange={setSheetName}
              onUseFlatsChange={handleUseFlatsChange}
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

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
