import './styles/main.scss';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AuthProvider, useAuth } from './context/AuthContext';
import App from './App.tsx';
import LoginPage from './components/auth/LoginPage.tsx';

const Root = () => {
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>
);
