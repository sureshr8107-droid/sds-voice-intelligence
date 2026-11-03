import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { NormalizedError } from '../../services/apiClient';

interface ErrorStateProps {
  error: NormalizedError | string;
  onRetry?: () => void;
  title?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  title = 'Failed to Load Data',
}) => {
  const isNormalized = typeof error !== 'string';
  const message = isNormalized ? error.message : error;
  const code = isNormalized ? error.code : undefined;
  const requestId = isNormalized ? error.requestId : undefined;

  return (
    <div className="glass-panel p-4 my-3 border-danger border-opacity-25">
      <div className="d-flex align-items-start gap-3">
        <div className="p-2 rounded-circle bg-danger bg-opacity-20 text-danger flex-shrink-0">
          <AlertCircle size={24} />
        </div>
        <div className="flex-grow-1">
          <h6 className="text-white fw-bold mb-1">{title}</h6>
          <p className="text-secondary small mb-2">{message}</p>

          {(code || requestId) && (
            <div className="d-flex flex-wrap gap-2 mb-3">
              {code && (
                <span className="badge bg-dark border border-secondary text-secondary font-monospace small">
                  Code: {code}
                </span>
              )}
              {requestId && (
                <span className="badge bg-dark border border-secondary text-secondary font-monospace small">
                  Req ID: {requestId}
                </span>
              )}
            </div>
          )}

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-2"
            >
              <RefreshCw size={14} />
              <span>Retry Request</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
