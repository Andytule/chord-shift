import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from './AuthContext';

export const useAuth = (): AuthContextValue => {
  const ctx: AuthContextValue | null = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
