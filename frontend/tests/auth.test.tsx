import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../src/pages/LoginPage';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { AuthService } from '../src/services/authService';

vi.mock('../src/services/authService', () => ({
  AuthService: {
    getCurrentUser: vi.fn(),
    verifyAdminAccess: vi.fn(),
    verifyStaffAccess: vi.fn(),
  },
}));

describe('Frontend Authentication Suite (Phase 4)', () => {
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
    expect(screen.getByText(/Session Token \(Phase 4\)/i)).toBeInTheDocument();
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

    const tokenInput = screen.getByLabelText(/Bearer Authentication Token/i);
    fireEvent.change(tokenInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Authenticate & Enter Console/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Authentication token cannot be empty|Please provide a valid session/i)).toBeInTheDocument();
    });
  });

  it('switches to email/password tab and shows Phase 5 credential pending notice upon submit', async () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

    const credsTab = screen.getByRole('button', { name: /Email \/ Password/i });
    fireEvent.click(credsTab);

    expect(screen.getByLabelText(/Institutional Email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/Institutional Email/i);
    const passInput = screen.getByPlaceholderText('••••••••••••');

    fireEvent.change(emailInput, { target: { value: 'admin@institution.local' } });
    fireEvent.change(passInput, { target: { value: 'securepassword123' } });

    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Notice: Backend endpoint POST \/api\/v1\/auth\/login is pending Phase 5/i)).toBeInTheDocument();
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
