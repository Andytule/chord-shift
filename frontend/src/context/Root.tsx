import React from 'react';

import App from '../App';
import LoginPage from '../components/auth/LoginPage';
import { LobbyProvider } from './LobbyContext';
import { useAuth } from './useAuth';

const Root = (): React.ReactElement => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <span className="auth-loading__logo">♩</span>
      </div>
    );
  }

  return session ? (
    <LobbyProvider>
      <App />
    </LobbyProvider>
  ) : (
    <LoginPage />
  );
};

export default Root;
