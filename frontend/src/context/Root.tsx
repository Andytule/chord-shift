import React from 'react';

import App from '../App';
import { LobbyProvider } from './LobbyContext';
import { useAuth } from './useAuth';

const Root = (): React.ReactElement => {
  const { session: _session, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <span className="auth-loading__logo">♩</span>
      </div>
    );
  }

  // Always render App inside LobbyProvider to allow unauthenticated users to join jams
  return (
    <LobbyProvider>
      <App />
    </LobbyProvider>
  );
};

export default Root;
