import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="container text-center py-5">
      <div className="glass-panel p-5 mx-auto" style={{ maxWidth: '540px' }}>
        <div className="d-inline-flex p-3 rounded-circle bg-warning bg-opacity-10 text-warning mb-3">
          <HelpCircle size={48} />
        </div>
        <h1 className="text-white fw-bold mb-2">404 - Page Not Found</h1>
        <p className="text-secondary mb-4">
          The requested view or endpoint does not exist in this application.
        </p>
        <Link to="/" className="btn btn-primary d-inline-flex align-items-center gap-2">
          <Home size={18} />
          <span>Return to Overview</span>
        </Link>
      </div>
    </div>
  );
};
