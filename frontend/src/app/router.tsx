import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { RoleGuard } from '../components/auth/RoleGuard';

// Pages
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { DashboardPage } from '../pages/DashboardPage';
import { CallsPage } from '../pages/CallsPage';
import { CallDetailPage } from '../pages/CallDetailPage';
import { DepartmentsPage } from '../pages/DepartmentsPage';
import { StaffPage } from '../pages/StaffPage';
import { ExtensionsPage } from '../pages/ExtensionsPage';
import { RoutingRulesPage } from '../pages/RoutingRulesPage';
import { CallbacksPage } from '../pages/CallbacksPage';
import { StaffConsolePage } from '../pages/StaffConsolePage';
import { SettingsPage } from '../pages/SettingsPage';
import { SystemStatusPage } from '../pages/SystemStatusPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const router = createBrowserRouter([
  // Public Landing / Overview
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'status',
        element: <SystemStatusPage />,
      },
      {
        path: 'unauthorized',
        element: <UnauthorizedPage />,
      },
    ],
  },

  // Public Login Route
  {
    path: '/login',
    element: <LoginPage />,
  },

  // Protected Enterprise Application Shell
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'calls',
        element: <CallsPage />,
      },
      {
        path: 'calls/:id',
        element: <CallDetailPage />,
      },
      {
        path: 'callbacks',
        element: <CallbacksPage />,
      },
      {
        path: 'staff-console',
        element: (
          <RoleGuard allowedRoles={['admin', 'staff', 'operator']}>
            <StaffConsolePage />
          </RoleGuard>
        ),
      },
      {
        path: 'departments',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <DepartmentsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'staff',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <StaffPage />
          </RoleGuard>
        ),
      },
      {
        path: 'extensions',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <ExtensionsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'routing-rules',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <RoutingRulesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'system-status',
        element: <SystemStatusPage />,
      },
    ],
  },

  // Catch-All Not Found
  {
    path: '404',
    element: (
      <AppLayout />
    ),
    children: [
      {
        index: true,
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/404" replace />,
  },
]);
