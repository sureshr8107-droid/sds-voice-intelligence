import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from '../src/components/auth/ProtectedRoute';
import { RoleGuard } from '../src/components/auth/RoleGuard';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { AuthService } from '../src/services/authService';

vi.mock('../src/services/authService', () => ({
  AuthService: {
    getCurrentUser: vi.fn(),
  },
}));

describe('Navigation & Access Control Suite (Phase 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users from protected routes to /login', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/login" element={<div>LOGIN_PAGE_VIEW</div>} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>DASHBOARD_PROTECTED_CONTENT</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText('LOGIN_PAGE_VIEW')).toBeInTheDocument();
    expect(screen.queryByText('DASHBOARD_PROTECTED_CONTENT')).not.toBeInTheDocument();
  });

  it('redirects staff from admin-only routes to /unauthorized', async () => {
    vi.mocked(AuthService.getCurrentUser).mockResolvedValueOnce({
      success: true,
      user: {
        id: '22222222-2222-2222-2222-222222222002',
        email: 'staff@institution.local',
        fullName: 'Prof. Robert Miller',
        role: 'staff',
      },
    });

    const StartPage: React.FC = () => {
      const { loginWithToken } = useAuth();
      const navigate = useNavigate();

      const handleLoginAndNavigate = async () => {
        await loginWithToken('mock-staff-token');
        navigate('/admin-only');
      };

      return (
        <button onClick={handleLoginAndNavigate}>
          LOGIN_STAFF_AND_VISIT
        </button>
      );
    };

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/start']}>
          <Routes>
            <Route path="/start" element={<StartPage />} />
            <Route path="/unauthorized" element={<div>UNAUTHORIZED_PAGE_VIEW</div>} />
            <Route
              path="/admin-only"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['admin']}>
                    <div>ADMIN_ONLY_CONTENT</div>
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('LOGIN_STAFF_AND_VISIT'));

    await waitFor(() => {
      expect(screen.getByText('UNAUTHORIZED_PAGE_VIEW')).toBeInTheDocument();
      expect(screen.queryByText('ADMIN_ONLY_CONTENT')).not.toBeInTheDocument();
    });
  });

  it('allows admin access to admin-only routes', async () => {
    vi.mocked(AuthService.getCurrentUser).mockResolvedValueOnce({
      success: true,
      user: {
        id: '22222222-2222-2222-2222-222222222001',
        email: 'admin@institution.local',
        fullName: 'Dr. Alice Sharma',
        role: 'admin',
      },
    });

    const StartPage: React.FC = () => {
      const { loginWithToken } = useAuth();
      const navigate = useNavigate();

      const handleLoginAndNavigate = async () => {
        await loginWithToken('mock-admin-token');
        navigate('/admin-only');
      };

      return (
        <button onClick={handleLoginAndNavigate}>
          LOGIN_ADMIN_AND_VISIT
        </button>
      );
    };

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/start']}>
          <Routes>
            <Route path="/start" element={<StartPage />} />
            <Route path="/unauthorized" element={<div>UNAUTHORIZED_PAGE_VIEW</div>} />
            <Route
              path="/admin-only"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['admin']}>
                    <div>ADMIN_ONLY_CONTENT</div>
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('LOGIN_ADMIN_AND_VISIT'));

    await waitFor(() => {
      expect(screen.getByText('ADMIN_ONLY_CONTENT')).toBeInTheDocument();
      expect(screen.queryByText('UNAUTHORIZED_PAGE_VIEW')).not.toBeInTheDocument();
    });
  });
});
