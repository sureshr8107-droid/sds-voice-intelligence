import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-3 px-4 border-top border-white border-opacity-10 text-secondary small bg-surface">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-medium text-white">SDS Voice Intelligence</span>
          <span>•</span>
          <span className="text-muted">Intelligent Calls. Smarter Connections.</span>
          <span className="badge bg-secondary bg-opacity-25 text-secondary">Phase 4</span>
        </div>

        <div className="d-flex align-items-center gap-4">
          <Link
            to="/system-status"
            className="text-secondary text-decoration-none d-flex align-items-center gap-1 hover-white"
          >
            <Activity size={14} className="text-info" />
            <span>Diagnostics</span>
          </Link>
          <span className="d-flex align-items-center gap-1 text-muted">
            <ShieldCheck size={14} className="text-success" />
            <span>RBAC Protected</span>
          </span>
        </div>
      </div>
    </footer>
  );
};
