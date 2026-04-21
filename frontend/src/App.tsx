import React, { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

import {
  getNextUntitledName,
  saveSheet,
  setAuthToken,
  type Sheet,
  type TransposeResponse,
  transposeSheet,
  updateSheet,
} from './api/client';
import ChordSheetEditor from './components/editor/ChordSheetEditor';
import TransposeControls from './components/editor/TransposeControls';
import SheetList from './components/sheets/SheetList';
import Toast, { type ToastMessage } from './components/ui/Toast';
import { useAuth } from './context/useAuth';

type View = 'list' | 'editor';

const SAMPLE_SHEET: string = `[Verse 1]
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
  const { user, session, signOut } = useAuth();

  // Keep the API client's auth token in sync with the Supabase session
  useEffect(() => {
    setAuthToken(session?.access_token ?? null);
  }, [session]);
  const [view, setView] = useState<View>('list');
  const [sheetText, setSheetText] = useState<string>('');
  const [sheetName, setSheetName] = useState<string>('');
  const [currentSheetId, setCurrentSheetId] = useState<number | null>(null);
  const [semitones, setSemitones] = useState<number>(0);
  const [useFlats, setUseFlats] = useState<boolean>(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Track the "original" sheet text so Reset can restore it
  const originalTextRef: RefObject<string> = useRef('');
  // Track cumulative semitone offset from original so the counter stays accurate
  const semitoneOffsetRef: RefObject<number> = useRef(0);

  const addToast = useCallback((text: string, type: 'success' | 'error') => {
    const id: number = ++toastCounter;
    setToasts((prev) => [...prev, { id, text, type }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openNewEditor = async () => {
    const untitledName: string = await getNextUntitledName();
    setSheetText('');
    setSheetName(untitledName);
    setCurrentSheetId(null);
    setSemitones(0);
    setUseFlats(false);
    setSelectedKey(null);
    originalTextRef.current = '';
    semitoneOffsetRef.current = 0;
    setView('editor');
  };

  const openExistingSheet = (sheet: Sheet) => {
    setSheetText(sheet.sheet_text);
    setSheetName(sheet.name);
    setCurrentSheetId(sheet.id);
    setSelectedKey(sheet.key);
    setSemitones(0);
    setUseFlats(false);
    originalTextRef.current = sheet.sheet_text;
    semitoneOffsetRef.current = 0;
    setView('editor');
  };

  const handleTransposeImmediate = async (delta: number) => {
    if (!sheetText.trim()) return;
    setLoading(true);
    try {
      const result: TransposeResponse = await transposeSheet({
        sheetText,
        semitones: delta,
        strategy: 'semitone',
        useFlats,
      });
      setSheetText(result.transposedText);
      semitoneOffsetRef.current += delta;
      setSemitones(semitoneOffsetRef.current);
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
      const result: TransposeResponse = await transposeSheet({
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
    semitoneOffsetRef.current = 0;
    setSelectedKey(null);
  };

  const handleSave = async () => {
    if (!sheetText.trim()) return;
    const name: string = sheetName.trim() || 'untitled_chord_sheet_1';
    setSaving(true);
    try {
      let saved: Sheet;
      if (currentSheetId !== null) {
        saved = await updateSheet(currentSheetId, name, sheetText, selectedKey);
      } else {
        saved = await saveSheet(name, sheetText, selectedKey);
        setCurrentSheetId(saved.id);
      }
      setSheetName(saved.name);
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
            <button className="header__back" onClick={() => setView('list')}>
              ← Back
            </button>
          )}
          <div
            className="header__brand"
            onClick={() => setView('list')}
            style={{ cursor: 'pointer' }}
          >
            <span className="header__logo">♩</span>
            <span className="header__title">ChordShift</span>
          </div>
        </div>
        <div className="header__right">
          {view === 'editor' && (
            <>
              <button
                className="btn-link"
                onClick={() => {
                  setSheetText(SAMPLE_SHEET);
                  setSemitones(0);
                  semitoneOffsetRef.current = 0;
                  originalTextRef.current = SAMPLE_SHEET;
                }}
              >
                Load sample
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Sheet'}
              </button>
            </>
          )}
          <div className="header__user">
            {user?.user_metadata?.avatar_url && (
              <img
                className="header__avatar"
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata.full_name ?? 'User avatar'}
                referrerPolicy="no-referrer"
              />
            )}
            <button className="btn-ghost header__signout" onClick={signOut} title="Sign out">
              Sign out
            </button>
          </div>
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
              placeholder={
                "Paste your chord sheet here…\n\nChords go on their own line above lyrics:\n\nG         D        Em\nThe sun comes up, it's a new day"
              }
            />
          </div>
        )}
      </main>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
