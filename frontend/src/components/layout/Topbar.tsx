import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';

interface TopbarProps {
  onToggleMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleMobileMenu }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/login');
  };

  // Human-readable title from pathname
  const getPathTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Dashboard Overview';
    if (path.startsWith('/calls')) return 'Call Records & Intent';
    if (path.startsWith('/departments')) return 'Institutional Departments';
    if (path.startsWith('/staff-console')) return 'Staff Call Reception Console';
    if (path.startsWith('/staff')) return 'Staff & Availability Directory';
    if (path.startsWith('/extensions')) return 'SIP Extensions Configuration';
    if (path.startsWith('/routing-rules')) return 'AI Routing Rules';
    if (path.startsWith('/callbacks')) return 'Callback Queue';
    if (path.startsWith('/system-status') || path === '/status') return 'System Diagnostics';
    if (path.startsWith('/settings')) return 'System Settings';
    if (path === '/unauthorized') return 'Access Restricted';
    return 'SDS Voice Intelligence';
  };

  return (
    <header className="app-topbar">
      <div className="d-flex align-items-center gap-3">
        {/* Mobile Menu Toggle */}
        <button
          type="button"
          className="btn btn-sm btn-link text-white p-1 d-lg-none"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation drawer"
        >
          <Menu size={22} />
        </button>

        {/* Current View Indicator */}
        <div>
          <h2 className="h6 mb-0 text-white fw-bold d-none d-sm-block">{getPathTitle()}</h2>
          <span className="text-secondary small d-none d-md-inline" style={{ fontSize: '0.75rem' }}>
            SDS Voice Intelligence • Intelligent Calls. Smarter Connections.
          </span>
        </div>
      </div>

      <div className="d-flex align-items-center gap-3">
        {isAuthenticated && user ? (
          <div className="position-relative">
            <button
              type="button"
              className="btn btn-dark border border-white border-opacity-10 d-flex align-items-center gap-2 py-1 px-2 rounded-3 text-start"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
              aria-label="User profile menu"
            >
              <div className="p-1 rounded bg-primary bg-opacity-25 text-info">
                <User size={16} />
              </div>
              <div className="d-none d-sm-block">
                <div className="text-white small fw-bold line-clamp-1">{user.fullName}</div>
                <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                  {user.email}
                </div>
              </div>
              <StatusBadge type="role" value={user.role} className="ms-1" />
              <ChevronDown size={14} className="text-muted d-none d-sm-block" />
            </button>

            {/* Profile Dropdown */}
            {dropdownOpen && (
              <div
                className="position-absolute end-0 mt-2 glass-panel py-2 shadow-lg border border-white border-opacity-10"
                style={{ minWidth: '220px', zIndex: 1050 }}
              >
                <div className="px-3 py-2 border-bottom border-white border-opacity-10">
                  <div className="text-white small fw-bold">{user.fullName}</div>
                  <div className="text-muted small text-truncate">{user.email}</div>
                  <div className="mt-1">
                    <StatusBadge type="role" value={user.role} />
                  </div>
                </div>

                <Link
                  to="/settings"
                  className="dropdown-item px-3 py-2 text-secondary small d-flex align-items-center gap-2 hover-white text-decoration-none"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings size={14} />
                  <span>Account & Settings</span>
                </Link>

                <div className="border-top border-white border-opacity-10 my-1" />

                <button
                  type="button"
                  className="dropdown-item px-3 py-2 text-danger small d-flex align-items-center gap-2 w-100 text-start bg-transparent border-0"
                  onClick={handleLogout}
                >
                  <LogOut size={14} />
                  <span>Sign Out (Clear Memory)</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="d-flex align-items-center gap-2">
            <Link to="/login" className="btn btn-sm btn-info text-dark fw-bold px-3">
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
