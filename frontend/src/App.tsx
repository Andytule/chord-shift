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
import LobbyGate from './components/lobby/LobbyGate';
import LobbyView from './components/lobby/LobbyView';
import SheetList from './components/sheets/SheetList';
import Toast, { type ToastMessage } from './components/ui/Toast';
import { useAuth } from './context/useAuth';
import { useLobby } from './context/useLobby';

type View = 'list' | 'editor' | 'lobby';

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
  const { user, session, signOut, signInWithGoogle } = useAuth();
  const { isInLobby } = useLobby();

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

  const currentLobbyState = {
    sheetText, // Leader broadcasts their current view (already transposed)
    semitones, // Informational: shows leader's transpose offset (for UI display)
    strategy: 'semitone' as const,
    capoFret: 0,
    useFlats,
    scrollY: 0,
    detectedKey: selectedKey,
  };

  const handleJamClick = () => {
    if (isInLobby) {
      setView('lobby');
    } else {
      setView('lobby');
    }
  };

  // When lobby is created/joined, navigate to lobby view
  // This is driven by useLobby state — when isInLobby becomes true we show the lobby
  useEffect(() => {
    if (isInLobby && view !== 'lobby') {
      setView('lobby');
    }
  }, [isInLobby, view]);

  // If not logged in and not in a lobby, show login/join prompt
  if (!user && !isInLobby) {
    return (
      <div className="app">
        <header className="header">
          <div className="header__left">
            <div className="header__brand">
              <span className="header__logo">♩</span>
              <span className="header__title">ChordShift</span>
            </div>
          </div>
          <div className="header__right">
            <button className="btn-primary" onClick={() => setView('lobby')}>
              🎸 Join Jam
            </button>
          </div>
        </header>
        <main className="main">
          {view === 'lobby' ? (
            <LobbyGate initialState={null} onBack={() => setView('list')} />
          ) : (
            <div className="auth-prompt">
              <div className="auth-prompt__content">
                <h1 className="auth-prompt__title">
                  <span className="header__logo" style={{ fontSize: '4rem' }}>
                    ♩
                  </span>
                  <br />
                  ChordShift
                </h1>
                <p className="auth-prompt__description">
                  Transpose chord sheets and jam together in real-time
                </p>
                <div className="auth-prompt__actions">
                  <button className="btn-primary" onClick={signInWithGoogle}>
                    Sign in with Google
                  </button>
                  <button className="btn-ghost" onClick={() => setView('lobby')}>
                    Join a jam session
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header__left">
          {(view === 'editor' || view === 'lobby') && !isInLobby && (
            <button className="header__back" onClick={() => setView('list')}>
              ← Back
            </button>
          )}
          <div
            className="header__brand"
            onClick={() => (isInLobby ? undefined : setView('list'))}
            style={{ cursor: isInLobby ? 'default' : 'pointer' }}
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
          {!isInLobby && view !== 'lobby' && (
            <button className="btn-ghost header__jam-btn" onClick={handleJamClick}>
              🎸 Jam
            </button>
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

      <main className={`main${view === 'lobby' && isInLobby ? ' main--lobby' : ''}`}>
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

        {view === 'lobby' && !isInLobby && (
          <LobbyGate
            initialState={sheetText.trim() ? currentLobbyState : null}
            onBack={() => setView(sheetText.trim() ? 'editor' : 'list')}
          />
        )}

        {view === 'lobby' && isInLobby && (
          <LobbyView
            sheetText={sheetText}
            semitones={semitones}
            useFlats={useFlats}
            selectedKey={selectedKey}
            sheetName={sheetName}
            loading={loading}
            onSheetTextChange={setSheetText}
            onTranspose={handleTransposeImmediate}
            onUseFlatsChange={handleUseFlatsChange}
            onKeyChange={setSelectedKey}
            onNameChange={setSheetName}
            onReset={handleReset}
            onLeave={() => setView('editor')}
          />
        )}
      </main>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
