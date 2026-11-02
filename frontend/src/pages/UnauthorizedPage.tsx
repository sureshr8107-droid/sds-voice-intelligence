import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';

export const UnauthorizedPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="container py-5 text-center">
      <div className="glass-panel p-5 mx-auto" style={{ maxWidth: '520px' }}>
        <div className="d-inline-flex p-3 rounded-circle bg-danger bg-opacity-15 text-danger mb-3">
          <ShieldAlert size={48} />
        </div>
        <h1 className="h3 fw-bold text-white mb-2">403 - Access Restricted</h1>
        <p className="text-secondary small mb-4">
          Your authenticated role does not have authorization to view this administrative resource.
          Access controls are enforced on the backend by Role-Based Access Control (RBAC).
        </p>

        {user && (
          <div className="p-3 rounded-3 bg-dark border border-white border-opacity-10 mb-4 text-start">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small">Current User:</span>
              <span className="text-white small fw-bold">{user.fullName}</span>
            </div>
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-muted small">Assigned Role:</span>
              <StatusBadge type="role" value={user.role} />
            </div>
          </div>
        )}

        <div className="d-flex justify-content-center gap-2">
          <Link to="/dashboard" className="btn btn-outline-secondary d-flex align-items-center gap-2">
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </Link>
          <Link to="/" className="btn btn-primary d-flex align-items-center gap-2">
            <Home size={16} />
            <span>Overview</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
