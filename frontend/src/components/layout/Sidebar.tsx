import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PhoneCall,
  Headphones,
  Building2,
  Users,
  Radio,
  Split,
  PhoneIncoming,
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '@call-screening/shared';

interface NavItemConfig {
  to: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles?: UserRole[];
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
  },
  {
    to: '/staff-console',
    label: 'Staff Console',
    icon: <Headphones size={18} />,
    allowedRoles: ['admin', 'staff', 'operator'],
  },
  {
    to: '/calls',
    label: 'Call History',
    icon: <PhoneCall size={18} />,
  },
  {
    to: '/departments',
    label: 'Departments',
    icon: <Building2 size={18} />,
    allowedRoles: ['admin'],
  },
  {
    to: '/staff',
    label: 'Staff Directory',
    icon: <Users size={18} />,
    allowedRoles: ['admin'],
  },
  {
    to: '/extensions',
    label: 'Extensions',
    icon: <Radio size={18} />,
    allowedRoles: ['admin'],
  },
  {
    to: '/routing-rules',
    label: 'Routing Rules',
    icon: <Split size={18} />,
    allowedRoles: ['admin'],
  },
  {
    to: '/callbacks',
    label: 'Callback Queue',
    icon: <PhoneIncoming size={18} />,
  },
  {
    to: '/system-status',
    label: 'System Status',
    icon: <Activity size={18} />,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: <Settings size={18} />,
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { user, hasRole } = useAuth();
  const location = useLocation();

  // Filter items by user role if restricted
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.allowedRoles) return true;
    if (!user) return true; // show for preview/unauthenticated layout fallback
    return hasRole(item.allowedRoles);
  });

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`app-sidebar ${isCollapsed ? 'collapsed' : ''} ${
          isMobileOpen ? 'show-mobile' : ''
        }`}
        aria-label="Sidebar Navigation"
      >
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="d-flex align-items-center gap-2 overflow-hidden">
            <div className="p-2 rounded-3 bg-info bg-opacity-20 text-info border border-info border-opacity-25 flex-shrink-0">
              <PhoneCall size={20} className="text-info" />
            </div>
            {!isCollapsed && (
              <div className="text-truncate">
                <div className="fw-bold fs-6 text-white text-truncate" title="SDS Voice Intelligence">
                  SDS Voice Intelligence
                </div>
                <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                  Intelligent Call Screening
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-sm btn-link text-muted p-1 d-none d-lg-block text-decoration-none"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          <div className="text-uppercase text-secondary small px-3 mb-2" style={{ fontSize: '0.68rem', letterSpacing: '0.08em' }}>
            {!isCollapsed ? 'Navigation' : '•••'}
          </div>

          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {!isCollapsed && (
          <div className="p-3 border-top border-white border-opacity-10 mt-auto">
            <div className="d-flex align-items-center gap-2">
              <div className="p-1 rounded bg-dark border border-white border-opacity-10 text-muted">
                <Shield size={14} className="text-info" />
              </div>
              <div className="text-truncate">
                <div className="text-white small fw-medium">Phase 4 Active</div>
                <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                  Enterprise Frontend
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
