import React from 'react';
import { Info, AlertTriangle } from 'lucide-react';

interface FeatureUnavailableBannerProps {
  title: string;
  description: string;
  plannedPhase?: string;
  endpoint?: string;
  variant?: 'info' | 'warning';
}

export const FeatureUnavailableBanner: React.FC<FeatureUnavailableBannerProps> = ({
  title,
  description,
  plannedPhase = 'Phase 5 Backend State Machine',
  endpoint,
  variant = 'info',
}) => {
  const isWarning = variant === 'warning';

  return (
    <div
      className={`glass-panel p-3 mb-4 border-${
        isWarning ? 'warning' : 'info'
      } border-opacity-30`}
      style={{
        background: isWarning
          ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.08) 0%, rgba(22, 32, 50, 0.8) 100%)'
          : 'linear-gradient(90deg, rgba(14, 165, 233, 0.08) 0%, rgba(22, 32, 50, 0.8) 100%)',
      }}
    >
      <div className="d-flex align-items-start gap-3">
        <div
          className={`p-2 rounded-circle flex-shrink-0 ${
            isWarning ? 'bg-warning bg-opacity-20 text-warning' : 'bg-info bg-opacity-20 text-info'
          }`}
        >
          {isWarning ? <AlertTriangle size={20} /> : <Info size={20} />}
        </div>
        <div>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <h6 className="text-white fw-bold mb-0">{title}</h6>
            <span className="badge bg-primary bg-opacity-25 text-info border border-info border-opacity-25 small">
              {plannedPhase}
            </span>
            {endpoint && (
              <span className="badge bg-dark border border-secondary text-secondary font-monospace small">
                {endpoint}
              </span>
            )}
          </div>
          <p className="text-secondary small mb-0">{description}</p>
        </div>
      </div>
    </div>
  );
};
