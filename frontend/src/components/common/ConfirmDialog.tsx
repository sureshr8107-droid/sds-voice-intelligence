import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content glass-panel border border-white border-opacity-10 text-white">
          <div className="modal-header border-bottom border-white border-opacity-10">
            <div className="d-flex align-items-center gap-2">
              {isDestructive && (
                <div className="text-danger p-1 rounded bg-danger bg-opacity-20">
                  <AlertTriangle size={18} />
                </div>
              )}
              <h5 className="modal-title h6 fw-bold mb-0">{title}</h5>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onCancel}
              aria-label="Close"
            />
          </div>
          <div className="modal-body py-3">
            <p className="text-secondary small mb-0">{message}</p>
          </div>
          <div className="modal-footer border-top border-white border-opacity-10">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${isDestructive ? 'btn-danger' : 'btn-primary'}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
