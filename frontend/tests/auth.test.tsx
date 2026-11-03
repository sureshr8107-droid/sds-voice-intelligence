import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../src/pages/LoginPage';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { AuthService } from '../src/services/authService';

vi.mock('../src/services/authService', () => ({
  AuthService: {
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue({ success: true }),
    getCurrentUser: vi.fn(),
    verifyAdminAccess: vi.fn(),
    verifyStaffAccess: vi.fn(),
  },
}));

vi.mock('../src/services/socketService', () => ({
  socketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    onCallCreated: vi.fn().mockReturnValue(() => {}),
    onCallUpdated: vi.fn().mockReturnValue(() => {}),
    onCallStatusChanged: vi.fn().mockReturnValue(() => {}),
    onCallRoutingUpdated: vi.fn().mockReturnValue(() => {}),
    onStaffAvailabilityChanged: vi.fn().mockReturnValue(() => {}),
    onCallbackCreated: vi.fn().mockReturnValue(() => {}),
  },
}));

describe('Frontend Authentication Suite (Phase 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders LoginPage with SDS Voice Intelligence branding and tabs', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText(/SDS Voice Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/Intelligent Calls. Smarter Connections./i)).toBeInTheDocument();
    expect(screen.getByText(/Session Token/i)).toBeInTheDocument();
    expect(screen.getByText(/Email \/ Password/i)).toBeInTheDocument();
  });

  it('validates empty session token and displays error feedback', async () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

    // Switch to token tab
    const tokenTab = screen.getByRole('button', { name: /Session Token/i });
    fireEvent.click(tokenTab);

    const tokenInput = screen.getByLabelText(/Bearer Authentication Token/i);
    fireEvent.change(tokenInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Authenticate & Enter Console/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Authentication token cannot be empty|Please provide a valid session/i)
      ).toBeInTheDocument();
    });
  });

  it('authenticates credentials with email and password via POST /api/v1/auth/login', async () => {
    vi.mocked(AuthService.login).mockResolvedValueOnce({
      success: true,
      data: {
        token: 'mock-admin-token-jwt',
        user: {
          id: '22222222-2222-2222-2222-222222222001',
          email: 'admin@institution.local',
          fullName: 'Dr. Alice Sharma',
          role: 'admin',
        },
        expiresIn: '24h',
      },
    });

    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText(/Institutional Email/i);
    const passInput = screen.getByPlaceholderText('••••••••••••');

    fireEvent.change(emailInput, { target: { value: 'admin@institution.local' } });
    fireEvent.change(passInput, { target: { value: 'Admin@123' } });

    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(AuthService.login).toHaveBeenCalledWith({
        email: 'admin@institution.local',
        password: 'Admin@123',
      });
    });
  });

  it('authenticates valid token in memory and loads user session', async () => {
    vi.mocked(AuthService.getCurrentUser).mockResolvedValueOnce({
      success: true,
      user: {
        id: '22222222-2222-2222-2222-222222222001',
        email: 'admin@institution.local',
        fullName: 'Dr. Alice Sharma',
        role: 'admin',
      },
    });

    const TestConsumer: React.FC = () => {
      const { user, isAuthenticated, loginWithToken, logout } = useAuth();
      return (
        <div>
          <span data-testid="auth-status">{isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}</span>
          <span data-testid="user-name">{user?.fullName || 'NO_USER'}</span>
          <span data-testid="user-role">{user?.role || 'NO_ROLE'}</span>
          <button onClick={() => loginWithToken('mock-admin-token')}>Login</button>
          <button onClick={logout}>Logout</button>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('ANONYMOUS');

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('AUTHENTICATED');
      expect(screen.getByTestId('user-name')).toHaveTextContent('Dr. Alice Sharma');
      expect(screen.getByTestId('user-role')).toHaveTextContent('admin');
    });

    // Test in-memory logout
    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('ANONYMOUS');
      expect(screen.getByTestId('user-name')).toHaveTextContent('NO_USER');
    });
  });
});
