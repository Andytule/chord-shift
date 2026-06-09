import React, { useEffect, useMemo, useRef, useState } from 'react';

import { getSheets, type Sheet } from '../../api/client';
import { type LobbyState } from '../../context/LobbyContext';
import { useAuth } from '../../context/useAuth';
import { useLobby } from '../../context/useLobby';

interface Props {
  /** State from the currently open editor, if any. May be null when opened from the list view. */
  initialState: LobbyState | null;
  onBack: () => void;
}

const LobbyGate: React.FC<Props> = ({ initialState, onBack }) => {
  const { user } = useAuth();
  const { createLobby, joinLobby, lobbyError, isInLobby } = useLobby();

  const defaultName =
    user?.user_metadata?.full_name ?? (user?.email ? user.email.split('@')[0] : '') ?? '';

  const [tab, setTab] = useState<'host' | 'join'>(user ? 'host' : 'join');
  const [displayName, setDisplayName] = useState(defaultName);

  // Host: song selection
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  // Default to current sheet if available, otherwise blank sheet (null)
  const [selectedSheetId, setSelectedSheetId] = useState<number | 'current' | null>(
    initialState ? 'current' : null
  );

  // Join tab
  const [joinCode, setJoinCode] = useState(['', '', '', '']);
  const [joinName, setJoinName] = useState('');

  const codeRef0 = useRef<HTMLInputElement>(null);
  const codeRef1 = useRef<HTMLInputElement>(null);
  const codeRef2 = useRef<HTMLInputElement>(null);
  const codeRef3 = useRef<HTMLInputElement>(null);
  const codeRefs = useMemo(
    () => [codeRef0, codeRef1, codeRef2, codeRef3],
    // refs are stable — this array never changes

    []
  );

  // Load saved sheets when host tab is shown
  useEffect(() => {
    if (tab === 'host' && user) {
      setSheetsLoading(true);
      getSheets()
        .then(setSheets)
        .catch(() => setSheets([]))
        .finally(() => setSheetsLoading(false));
    }
  }, [tab, user]);

  // Auto-focus first code box when join tab opens
  useEffect(() => {
    if (tab === 'join') {
      setTimeout(() => codeRefs[0].current?.focus(), 50);
    }
  }, [tab, codeRefs]);

  const handleCodeInput = (index: number, value: string) => {
    const char = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(-1);
    const next = [...joinCode];
    next[index] = char;
    setJoinCode(next);
    if (char && index < 3) {
      codeRefs[index + 1].current?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !joinCode[index] && index > 0) {
      codeRefs[index - 1].current?.focus();
    }
  };

  const buildLobbyState = (): LobbyState => {
    if (selectedSheetId === 'current' && initialState) {
      return initialState;
    }
    if (typeof selectedSheetId === 'number') {
      const sheet = sheets.find((s) => s.id === selectedSheetId);
      if (sheet) {
        return {
          sheetText: sheet.sheet_text,
          semitones: 0,
          strategy: 'semitone',
          capoFret: 0,
          useFlats: false,
          scrollY: 0,
          detectedKey: sheet.key,
        };
      }
    }
    // Default empty state when no sheet is selected
    return {
      sheetText: '',
      semitones: 0,
      strategy: 'semitone',
      capoFret: 0,
      useFlats: false,
      scrollY: 0,
      detectedKey: null,
    };
  };

  const handleHost = () => {
    if (!displayName.trim()) return;
    const state = buildLobbyState();
    createLobby(displayName.trim(), state);
  };

  const handleJoin = () => {
    const code = joinCode.join('');
    if (code.length < 4 || !joinName.trim()) return;
    joinLobby(code, joinName.trim());
  };

  const canStart = !isInLobby && !!displayName.trim();

  return (
    <div className="lobby-gate">
      <div className="lobby-gate__card">
        <div className="lobby-gate__header">
          <button className="header__back" onClick={onBack}>
            ← Back
          </button>
          <h2 className="lobby-gate__title">
            <span className="lobby-gate__title-icon">🎸</span>
            Jam Session
          </h2>
          <p className="lobby-gate__subtitle">Play together in real time</p>
        </div>

        <div className="lobby-gate__tabs">
          {user && (
            <button
              className={`lobby-gate__tab ${tab === 'host' ? 'lobby-gate__tab--active' : ''}`}
              onClick={() => setTab('host')}
            >
              Host
            </button>
          )}
          <button
            className={`lobby-gate__tab ${tab === 'join' ? 'lobby-gate__tab--active' : ''}`}
            onClick={() => setTab('join')}
          >
            Join
          </button>
        </div>

        {lobbyError && <div className="lobby-gate__error">{lobbyError}</div>}

        {tab === 'host' && user && (
          <div className="lobby-gate__panel">
            <label className="lobby-gate__label" htmlFor="host-name">
              Your display name
            </label>
            <input
              id="host-name"
              className="lobby-gate__input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />

            <label className="lobby-gate__label">Song to share (optional)</label>
            <div className="lobby-gate__song-list">
              <button
                className={`lobby-gate__song-item ${selectedSheetId === null ? 'lobby-gate__song-item--selected' : ''}`}
                onClick={() => setSelectedSheetId(null)}
              >
                <span className="lobby-gate__song-badge">Empty</span>
                <span className="lobby-gate__song-name">Start with blank sheet</span>
              </button>

              {initialState && (
                <button
                  className={`lobby-gate__song-item ${selectedSheetId === 'current' ? 'lobby-gate__song-item--selected' : ''}`}
                  onClick={() => setSelectedSheetId('current')}
                >
                  <span className="lobby-gate__song-badge">Current</span>
                  <span className="lobby-gate__song-name">Sheet in editor</span>
                </button>
              )}

              {sheetsLoading && <p className="lobby-gate__hint">Loading your songs…</p>}

              {sheets.map((sheet) => (
                <button
                  key={sheet.id}
                  className={`lobby-gate__song-item ${selectedSheetId === sheet.id ? 'lobby-gate__song-item--selected' : ''}`}
                  onClick={() => setSelectedSheetId(sheet.id)}
                >
                  {sheet.key && <span className="lobby-gate__song-badge">{sheet.key}</span>}
                  <span className="lobby-gate__song-name">{sheet.name}</span>
                </button>
              ))}
            </div>

            <button
              className="btn-primary lobby-gate__cta"
              onClick={handleHost}
              disabled={!canStart}
            >
              Start Session
            </button>
          </div>
        )}

        {tab === 'join' && (
          <div className="lobby-gate__panel">
            <p className="lobby-gate__hint">Enter the 4-character code from the session host.</p>

            <label className="lobby-gate__label">Session code</label>
            <div className="lobby-gate__code-row">
              {joinCode.map((char, i) => (
                <input
                  key={i}
                  ref={codeRefs[i]}
                  className="lobby-gate__code-box"
                  value={char}
                  maxLength={1}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  onFocus={(e) => e.target.select()}
                  autoCapitalize="characters"
                />
              ))}
            </div>

            <label className="lobby-gate__label" htmlFor="join-name">
              Your display name
            </label>
            <input
              id="join-name"
              className="lobby-gate__input"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Your name"
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />

            <button
              className="btn-primary lobby-gate__cta"
              onClick={handleJoin}
              disabled={joinCode.join('').length < 4 || !joinName.trim() || isInLobby}
            >
              Join Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LobbyGate;
