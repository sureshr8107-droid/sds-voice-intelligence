import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number | null;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgClass?: string;
  iconColorClass?: string;
  isLoading?: boolean;
  unavailableNotice?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBgClass = 'bg-primary bg-opacity-15',
  iconColorClass = 'text-primary',
  isLoading = false,
  unavailableNotice,
}) => {
  return (
    <div className="stat-card h-100 d-flex flex-column justify-content-between">
      <div className="d-flex align-items-start justify-content-between mb-3">
        <div>
          <span className="text-secondary small fw-medium text-uppercase tracking-wider">{title}</span>
          <div className="mt-2">
            {isLoading ? (
              <div className="skeleton-box" style={{ width: '80px', height: '32px' }}></div>
            ) : unavailableNotice ? (
              <div className="fs-6 text-muted fst-italic">{unavailableNotice}</div>
            ) : (
              <h3 className="fw-bold mb-0 text-white">{value !== null ? value : '—'}</h3>
            )}
          </div>
        </div>
        <div className={`stat-icon ${iconBgClass} ${iconColorClass}`}>
          {icon}
        </div>
      </div>

      {subtitle && (
        <div className="text-muted small pt-2 border-top border-white border-opacity-10 d-flex align-items-center justify-content-between">
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
};
