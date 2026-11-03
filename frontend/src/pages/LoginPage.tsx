import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PhoneCall, Eye, EyeOff, Shield, LogIn, AlertCircle, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FormField } from '../components/common/FormField';

export const LoginPage: React.FC = () => {
  const { login, loginWithToken, isLoading, lastError, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sessionToken, setSessionToken] = useState('mock-admin-token');
  const [authMode, setAuthMode] = useState<'token' | 'credentials'>('credentials');
  const [validationError, setValidationError] = useState<string | null>(null);

  const destination = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard';

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    if (!sessionToken.trim()) {
      setValidationError('Please provide a valid session or Bearer token.');
      return;
    }

    const success = await loginWithToken(sessionToken);
    if (success) {
      navigate(destination, { replace: true });
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setValidationError('Password must be at least 6 characters long.');
      return;
    }

    const success = await login(email, password);
    if (success) {
      navigate(destination, { replace: true });
    }
  };

  const handleQuickRoleSelect = (tokenValue: string) => {
    setSessionToken(tokenValue);
    clearError();
    setValidationError(null);
  };

  return (
    <div className="container py-5 d-flex align-items-center justify-content-center min-vh-100">
      <div className="glass-panel p-4 p-md-5 w-100 shadow-lg" style={{ maxWidth: '480px' }}>
        {/* Brand Header */}
        <div className="text-center mb-4">
          <div className="d-inline-flex p-3 rounded-4 bg-info bg-opacity-15 text-info border border-info border-opacity-25 mb-3">
            <PhoneCall size={32} />
          </div>
          <h1 className="h3 fw-bold text-white mb-1">SDS Voice Intelligence</h1>
          <p className="text-secondary small mb-0">Intelligent Calls. Smarter Connections.</p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="d-flex rounded-3 bg-dark p-1 mb-4 border border-white border-opacity-10">
          <button
            type="button"
            className={`btn btn-sm flex-fill py-2 ${
              authMode === 'token' ? 'btn-info text-dark fw-bold' : 'btn-dark text-muted border-0'
            }`}
            onClick={() => {
              setAuthMode('token');
              clearError();
              setValidationError(null);
            }}
          >
            <Key size={14} className="me-1" />
            <span>Session Token</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm flex-fill py-2 ${
              authMode === 'credentials' ? 'btn-info text-dark fw-bold' : 'btn-dark text-muted border-0'
            }`}
            onClick={() => {
              setAuthMode('credentials');
              clearError();
              setValidationError(null);
            }}
          >
            <Shield size={14} className="me-1" />
            <span>Email / Password</span>
          </button>
        </div>

        {/* Error Feedback */}
        {(lastError || validationError) && (
          <div className="alert alert-danger py-2 px-3 small d-flex align-items-start gap-2 mb-4" role="alert">
            <AlertCircle size={16} className="mt-1 flex-shrink-0" />
            <div>
              <div className="fw-bold">{lastError?.code || 'Authentication Error'}</div>
              <div>{validationError || lastError?.message}</div>
            </div>
          </div>
        )}

        {authMode === 'token' ? (
          <form onSubmit={handleTokenSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="sessionToken" className="form-label text-white small fw-medium">
                Bearer Authentication Token
              </label>
              <textarea
                id="sessionToken"
                rows={2}
                className="form-control form-control-custom font-monospace small"
                placeholder="Paste Supabase JWT or development test token"
                value={sessionToken}
                onChange={(e) => setSessionToken(e.target.value)}
                required
              />
              <div className="text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
                Held strictly in memory for this session (never written to localStorage or sessionStorage).
              </div>
            </div>

            {/* Quick Test Token Selectors */}
            <div className="mb-4">
              <div className="text-secondary small mb-2" style={{ fontSize: '0.75rem' }}>
                Verified Test Personas (Backend /api/v1/auth/me):
              </div>
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`btn btn-xs py-1 px-2 rounded-2 small ${
                    sessionToken === 'mock-admin-token'
                      ? 'btn-outline-info active'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => handleQuickRoleSelect('mock-admin-token')}
                >
                  Admin (Dr. Alice Sharma)
                </button>
                <button
                  type="button"
                  className={`btn btn-xs py-1 px-2 rounded-2 small ${
                    sessionToken === 'mock-staff-token'
                      ? 'btn-outline-info active'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => handleQuickRoleSelect('mock-staff-token')}
                >
                  Staff (Prof. Robert Miller)
                </button>
                <button
                  type="button"
                  className={`btn btn-xs py-1 px-2 rounded-2 small ${
                    sessionToken === 'mock-operator-token'
                      ? 'btn-outline-info active'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => handleQuickRoleSelect('mock-operator-token')}
                >
                  Operator (Sarah Connor)
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-info w-100 py-2 text-dark fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Verifying Token...</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Authenticate & Enter Console</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCredentialsSubmit} noValidate>
            <FormField id="loginEmail" label="Institutional Email" required>
              <input
                id="loginEmail"
                type="email"
                className="form-control form-control-custom"
                placeholder="user@institution.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </FormField>

            <FormField id="loginPassword" label="Password" required>
              <div className="input-group">
                <input
                  id="loginPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control form-control-custom"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FormField>

            <button
              type="submit"
              className="btn btn-info w-100 py-2 text-dark fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm mt-4"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Security Notice */}
        <div className="mt-4 pt-3 border-top border-white border-opacity-10 text-center">
          <div className="d-flex align-items-center justify-content-center gap-1 text-muted small" style={{ fontSize: '0.72rem' }}>
            <Shield size={12} className="text-info" />
            <span>Zero Persistent Token Storage • In-Memory Session Security</span>
          </div>
        </div>
      </div>
    </div>
  );
};
