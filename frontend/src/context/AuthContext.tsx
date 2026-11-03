import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AuthenticatedUser, UserRole } from '@call-screening/shared';
import { AuthService } from '../services/authService';
import { configureAuthInterceptor, NormalizedError } from '../services/apiClient';
import { socketService } from '../services/socketService';

interface AuthContextValue {
  user: AuthenticatedUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastError: NormalizedError | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithToken: (token: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Purely in-memory token and user session (NEVER stored in localStorage or sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastError, setLastError] = useState<NormalizedError | null>(null);

  const logout = useCallback(() => {
    // Terminate socket and revoke backend session
    socketService.disconnect();
    AuthService.logout().catch(() => {});
    setToken(null);
    setUser(null);
    setLastError(null);
  }, []);

  // Configure Axios interceptor and Socket.IO connection on token change
  useEffect(() => {
    configureAuthInterceptor(
      () => token,
      () => {
        logout();
      }
    );

    if (token) {
      socketService.connect(token);
    } else {
      socketService.disconnect();
    }
  }, [token, logout]);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      setLastError(null);

      const res = await AuthService.login({ email, password });
      if (res.success && res.data) {
        setToken(res.data.token);
        setUser(res.data.user);
        setLastError(null);
        setIsLoading(false);
        return true;
      } else {
        setToken(null);
        setUser(null);
        setLastError(
          res.error || {
            code: 'LOGIN_FAILED',
            message: 'Authentication failed. Please check your credentials.',
            timestamp: new Date().toISOString(),
          }
        );
        setIsLoading(false);
        return false;
      }
    },
    []
  );

  const loginWithToken = useCallback(
    async (rawToken: string): Promise<boolean> => {
      setIsLoading(true);
      setLastError(null);

      const cleanToken = rawToken.trim();
      if (!cleanToken) {
        setLastError({
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Authentication token cannot be empty.',
          timestamp: new Date().toISOString(),
        });
        setIsLoading(false);
        return false;
      }

      const result = await AuthService.getCurrentUser(cleanToken);

      if (result.success && result.user) {
        setToken(cleanToken);
        setUser(result.user);
        setLastError(null);
        setIsLoading(false);
        return true;
      } else {
        setToken(null);
        setUser(null);
        setLastError(
          result.error || {
            code: 'AUTH_FAILED',
            message: 'Failed to authenticate with the backend server.',
            timestamp: new Date().toISOString(),
          }
        );
        setIsLoading(false);
        return false;
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const hasRole = useCallback(
    (allowed: UserRole | UserRole[]): boolean => {
      if (!user) return false;
      const rolesArray = Array.isArray(allowed) ? allowed : [allowed];
      return rolesArray.includes(user.role);
    },
    [user]
  );

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!user,
      isLoading,
      lastError,
      login,
      loginWithToken,
      logout,
      clearError,
      hasRole,
    }),
    [user, token, isLoading, lastError, login, loginWithToken, logout, clearError, hasRole]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
