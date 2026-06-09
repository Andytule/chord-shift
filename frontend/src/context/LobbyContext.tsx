import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';

import { disconnectSocket, getSocket } from '../lib/socket';

export interface LobbyState {
  sheetText: string;
  semitones: number;
  strategy: 'semitone' | 'capo';
  capoFret: number;
  useFlats: boolean;
  scrollY: number;
  detectedKey: string | null;
}

export interface Participant {
  displayName: string;
  isLeader: boolean;
}

export interface LobbyContextValue {
  lobbyCode: string | null;
  lobbyRole: 'leader' | 'follower' | null;
  participants: Participant[];
  isInLobby: boolean;
  createLobby: (displayName: string, initialState: LobbyState) => void;
  joinLobby: (code: string, displayName: string) => void;
  leaveLobby: () => void;
  broadcastStateUpdate: (patch: Partial<LobbyState>) => void;
  broadcastScrollSync: (scrollY: number) => void;
  leaderState: LobbyState | null;
  lobbyError: string | null;
}

export const LobbyContext = createContext<LobbyContextValue | null>(null);

interface LobbyProviderProps {
  children: React.ReactNode;
  onLobbyClosed?: (reason: string) => void;
}

export const LobbyProvider: React.FC<LobbyProviderProps> = ({ children, onLobbyClosed }) => {
  const [lobbyCode, setLobbyCode] = useState<string | null>(null);
  const [lobbyRole, setLobbyRole] = useState<'leader' | 'follower' | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [leaderState, setLeaderState] = useState<LobbyState | null>(null);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  const codeRef = useRef<string | null>(null);

  const clearLobby = useCallback(() => {
    setLobbyCode(null);
    setLobbyRole(null);
    setParticipants([]);
    setLeaderState(null);
    codeRef.current = null;
  }, []);

  useEffect(() => {
    const socket = getSocket();

    socket.on(
      'lobby:created',
      ({
        code,
        state,
        participants: initialParticipants,
      }: {
        code: string;
        state: LobbyState;
        participants?: Participant[];
      }) => {
        setLobbyCode(code);
        codeRef.current = code;
        setLobbyRole('leader');
        setLeaderState(state);
        setParticipants(initialParticipants ?? []);
        setLobbyError(null);
      }
    );

    socket.on(
      'lobby:joined',
      ({
        code,
        state,
        participants,
      }: {
        code: string;
        state: LobbyState;
        participants: Participant[];
      }) => {
        setLobbyCode(code);
        codeRef.current = code;
        setLobbyRole('follower');
        setLeaderState(state);
        setParticipants(participants);
        setLobbyError(null);
      }
    );

    socket.on('lobby:state_changed', ({ state }: { state: LobbyState }) => {
      setLeaderState(state);
    });

    socket.on('lobby:participants', ({ participants }: { participants: Participant[] }) => {
      setParticipants(participants);
    });

    socket.on('lobby:closed', ({ reason }: { reason: string }) => {
      clearLobby();
      onLobbyClosed?.(reason);
    });

    socket.on('lobby:error', ({ message }: { message: string }) => {
      setLobbyError(message);
    });

    return () => {
      socket.off('lobby:created');
      socket.off('lobby:joined');
      socket.off('lobby:state_changed');
      socket.off('lobby:participants');
      socket.off('lobby:closed');
      socket.off('lobby:error');
    };
  }, [clearLobby, onLobbyClosed]);

  const createLobby = useCallback((displayName: string, initialState: LobbyState) => {
    const socket = getSocket();
    socket.emit('lobby:create', { displayName, initialState });
  }, []);

  const joinLobby = useCallback((code: string, displayName: string) => {
    const socket = getSocket();
    socket.emit('lobby:join', { code: code.toUpperCase(), displayName });
  }, []);

  const leaveLobby = useCallback(() => {
    const socket = getSocket();
    socket.emit('lobby:leave');
    clearLobby();
    disconnectSocket();
  }, [clearLobby]);

  const broadcastStateUpdate = useCallback((patch: Partial<LobbyState>) => {
    const socket = getSocket();
    if (codeRef.current) {
      socket.emit('lobby:state_update', { code: codeRef.current, state: patch });
    }
  }, []);

  const broadcastScrollSync = useCallback((scrollY: number) => {
    const socket = getSocket();
    if (codeRef.current) {
      socket.emit('lobby:scroll_sync', { code: codeRef.current, scrollY });
    }
  }, []);

  return (
    <LobbyContext.Provider
      value={{
        lobbyCode,
        lobbyRole,
        participants,
        isInLobby: lobbyCode !== null,
        createLobby,
        joinLobby,
        leaveLobby,
        broadcastStateUpdate,
        broadcastScrollSync,
        leaderState,
        lobbyError,
      }}
    >
      {children}
    </LobbyContext.Provider>
  );
};
