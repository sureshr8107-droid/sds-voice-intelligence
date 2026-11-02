import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = <Inbox size={42} className="text-secondary" />,
  action,
}) => {
  return (
    <div className="glass-panel p-5 text-center my-3">
      <div className="d-inline-flex p-3 rounded-circle bg-dark border border-white border-opacity-10 mb-3">
        {icon}
      </div>
      <h5 className="text-white fw-bold mb-1">{title}</h5>
      <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '440px' }}>
        {description}
      </p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="btn btn-outline-info btn-sm px-3 py-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
