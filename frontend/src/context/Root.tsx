import React from 'react';

import App from '../App';
import LoginPage from '../components/auth/LoginPage';
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

  return session ? <App /> : <LoginPage />;
};

export default Root;
