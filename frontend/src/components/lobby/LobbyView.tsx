import React, { useEffect, useRef, useState } from 'react';

import { type TransposeResponse, transposeSheet } from '../../api/client';
import { type LobbyState } from '../../context/LobbyContext';
import { useLobby } from '../../context/useLobby';
import TransposeControls from '../editor/TransposeControls';

interface LeaderPanelProps {
  sheetText: string;
  semitones: number;
  useFlats: boolean;
  selectedKey: string | null;
  sheetName: string;
  loading: boolean;
  onSheetTextChange: (v: string) => void;
  onTranspose: (delta: number) => void;
  onUseFlatsChange: (v: boolean) => void;
  onKeyChange: (k: string | null) => void;
  onNameChange: (n: string) => void;
  onReset: () => void;
}

const LeaderPanel: React.FC<LeaderPanelProps> = ({
  sheetText,
  semitones,
  useFlats,
  selectedKey,
  sheetName,
  loading,
  onSheetTextChange,
  onTranspose,
  onUseFlatsChange,
  onKeyChange,
  onNameChange,
  onReset,
}) => {
  const { broadcastScrollSync, broadcastStateUpdate } = useLobby();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScroll = () => {
    if (scrollThrottleRef.current) return;
    scrollThrottleRef.current = setTimeout(() => {
      scrollThrottleRef.current = null;
      const el = textareaRef.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return;
      const scrollY = Math.min(1, Math.max(0, el.scrollTop / max));
      broadcastScrollSync(scrollY);
    }, 100);
  };

  const handleTextChange = (v: string) => {
    onSheetTextChange(v);
    broadcastStateUpdate({ sheetText: v });
  };

  return (
    <div className="lobby-view__panel">
      <TransposeControls
        semitones={semitones}
        selectedKey={selectedKey}
        sheetName={sheetName}
        useFlats={useFlats}
        onTransposeImmediate={onTranspose}
        onKeyChange={(k) => {
          onKeyChange(k);
          broadcastStateUpdate({ detectedKey: k });
        }}
        onNameChange={onNameChange}
        onUseFlatsChange={(v) => {
          onUseFlatsChange(v);
          broadcastStateUpdate({ useFlats: v });
        }}
        onReset={onReset}
        loading={loading}
      />
      <div className="lobby-view__editor-wrap">
        <textarea
          ref={textareaRef}
          className="sheet-textarea"
          value={sheetText}
          onChange={(e) => handleTextChange(e.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          placeholder="Your chord sheet…"
        />
      </div>
    </div>
  );
};

interface FollowerPanelProps {
  leaderState: LobbyState;
}

const FollowerPanel: React.FC<FollowerPanelProps> = ({ leaderState }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [capoOffset, setCapoOffset] = useState(0);
  const [displayText, setDisplayText] = useState(leaderState.sheetText);
  const [localLoading, setLocalLoading] = useState(false);

  // Sync displayed text when leader state changes or capo offset changes.
  // The leader's sheetText is already the raw/original text — we apply
  // leaderState.semitones (leader's transposition) PLUS our personal capoOffset.
  useEffect(() => {
    const totalSemitones = leaderState.semitones + capoOffset;
    if (totalSemitones === 0) {
      setDisplayText(leaderState.sheetText);
      return;
    }
    setLocalLoading(true);
    transposeSheet({
      sheetText: leaderState.sheetText,
      semitones: totalSemitones,
      strategy: 'semitone',
      useFlats: leaderState.useFlats,
    })
      .then((res: TransposeResponse) => setDisplayText(res.transposedText))
      .catch(() => setDisplayText(leaderState.sheetText))
      .finally(() => setLocalLoading(false));
  }, [leaderState.sheetText, leaderState.semitones, leaderState.useFlats, capoOffset]);

  // Scroll sync from server
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    if (max > 0) {
      el.scrollTop = leaderState.scrollY * max;
    }
  }, [leaderState.scrollY]);

  return (
    <div className="lobby-view__panel lobby-view__panel--follower">
      <div className="lobby-view__follower-bar">
        <span className="lobby-view__follower-label">Following leader</span>
        <div className="lobby-view__capo-wrap">
          <span className="control-label">My capo offset</span>
          <div className="stepper">
            <button className="step-btn" onClick={() => setCapoOffset((n) => n - 1)}>
              −
            </button>
            <span className="step-value">{capoOffset > 0 ? `+${capoOffset}` : capoOffset}</span>
            <button className="step-btn" onClick={() => setCapoOffset((n) => n + 1)}>
              +
            </button>
          </div>
          {capoOffset !== 0 && (
            <button
              className="btn-ghost"
              style={{ height: 28, fontSize: '0.8rem' }}
              onClick={() => setCapoOffset(0)}
            >
              Reset
            </button>
          )}
        </div>
        {localLoading && <span className="lobby-view__syncing">Syncing…</span>}
      </div>
      <div className="lobby-view__editor-wrap lobby-view__editor-wrap--readonly">
        <textarea
          ref={textareaRef}
          className="sheet-textarea sheet-textarea--readonly"
          value={displayText}
          readOnly
          spellCheck={false}
        />
      </div>
    </div>
  );
};

interface Props {
  // Leader props (passed from App.tsx)
  sheetText: string;
  semitones: number;
  useFlats: boolean;
  selectedKey: string | null;
  sheetName: string;
  loading: boolean;
  onSheetTextChange: (v: string) => void;
  onTranspose: (delta: number) => void;
  onUseFlatsChange: (v: boolean) => void;
  onKeyChange: (k: string | null) => void;
  onNameChange: (n: string) => void;
  onReset: () => void;
  onLeave: () => void;
}

const LobbyView: React.FC<Props> = (props) => {
  const { lobbyCode, lobbyRole, participants, leaveLobby, leaderState } = useLobby();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (lobbyCode) {
      navigator.clipboard.writeText(lobbyCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  const handleLeave = () => {
    leaveLobby();
    props.onLeave();
  };

  return (
    <div className="lobby-view">
      {/* Sidebar */}
      <aside className="lobby-view__sidebar">
        <div className="lobby-view__code-section">
          <span className="lobby-view__code-label">Session Code</span>
          <div className="lobby-view__code">{lobbyCode}</div>
          <button className="btn-ghost lobby-view__copy-btn" onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <div className="lobby-view__participants-section">
          <span className="lobby-view__section-label">Participants</span>
          <ul className="lobby-view__participants">
            {participants.map((p, i) => (
              <li key={i} className="lobby-view__participant">
                {p.isLeader && (
                  <span className="lobby-view__crown" title="Leader">
                    ♛
                  </span>
                )}
                <span className="lobby-view__participant-name">{p.displayName}</span>
              </li>
            ))}
          </ul>
        </div>

        <button className="btn-ghost lobby-view__leave-btn" onClick={handleLeave}>
          Leave Session
        </button>
      </aside>

      {/* Main panel */}
      <div className="lobby-view__main">
        {lobbyRole === 'leader' && (
          <LeaderPanel
            sheetText={props.sheetText}
            semitones={props.semitones}
            useFlats={props.useFlats}
            selectedKey={props.selectedKey}
            sheetName={props.sheetName}
            loading={props.loading}
            onSheetTextChange={props.onSheetTextChange}
            onTranspose={props.onTranspose}
            onUseFlatsChange={props.onUseFlatsChange}
            onKeyChange={props.onKeyChange}
            onNameChange={props.onNameChange}
            onReset={props.onReset}
          />
        )}
        {lobbyRole === 'follower' && leaderState && <FollowerPanel leaderState={leaderState} />}
      </div>
    </div>
  );
};

export default LobbyView;
