import './styles/main.scss';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AuthProvider } from './context/AuthProvider';
import Root from './context/Root';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>
);
