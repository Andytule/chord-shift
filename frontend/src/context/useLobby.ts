import { useContext } from 'react';

import { LobbyContext, type LobbyContextValue } from './LobbyContext';

export const useLobby = (): LobbyContextValue => {
  const ctx = useContext(LobbyContext);
  if (!ctx) throw new Error('useLobby must be used within LobbyProvider');
  return ctx;
};
