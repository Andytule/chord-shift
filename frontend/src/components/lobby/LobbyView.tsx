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
  const prevSheetTextRef = useRef(sheetText);
  const broadcastRef = useRef(broadcastStateUpdate);

  // Keep broadcastRef current
  useEffect(() => {
    broadcastRef.current = broadcastStateUpdate;
  }, [broadcastStateUpdate]);

  // Broadcast sheetText whenever it changes (from transpose or manual edit)
  useEffect(() => {
    if (sheetText !== prevSheetTextRef.current) {
      broadcastRef.current({ sheetText });
      prevSheetTextRef.current = sheetText;
    }
  }, [sheetText]);

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

  // Cleanup scroll throttle on unmount
  useEffect(() => {
    return () => {
      if (scrollThrottleRef.current) {
        clearTimeout(scrollThrottleRef.current);
        scrollThrottleRef.current = null;
      }
    };
  }, []);

  const handleTextChange = (v: string) => {
    onSheetTextChange(v);
    // Broadcasting happens automatically via useEffect on sheetText change
  };

  const handleTransposeWithBroadcast = async (delta: number) => {
    await onTranspose(delta);
    // onTranspose updates sheetText in App.tsx asynchronously via setState.
    // We need to broadcast both the new sheetText and semitones, but we don't
    // have the new sheetText yet. For now, broadcast semitones and rely on
    // a useEffect to catch the sheetText update.
    // TODO: This is a race condition - needs architectural fix
    broadcastStateUpdate({ semitones: semitones + delta });
  };

  return (
    <div className="lobby-view__panel">
      <TransposeControls
        semitones={semitones}
        selectedKey={selectedKey}
        sheetName={sheetName}
        useFlats={useFlats}
        onTransposeImmediate={handleTransposeWithBroadcast}
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
  // The leader's sheetText is already transposed to their key — we only apply
  // our personal capoOffset on top of what the leader sees.
  // Debounce to avoid excessive API calls if leader is typing rapidly.
  useEffect(() => {
    if (capoOffset === 0) {
      setDisplayText(leaderState.sheetText);
      setLocalLoading(false);
      return;
    }

    setLocalLoading(true);
    const timer = setTimeout(() => {
      transposeSheet({
        sheetText: leaderState.sheetText,
        semitones: capoOffset,
        strategy: 'semitone',
        useFlats: leaderState.useFlats,
      })
        .then((res: TransposeResponse) => setDisplayText(res.transposedText))
        .catch(() => setDisplayText(leaderState.sheetText))
        .finally(() => setLocalLoading(false));
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [leaderState.sheetText, leaderState.useFlats, capoOffset]);

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
