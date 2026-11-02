import React from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  error,
  helperText,
  required = false,
  children,
}) => {
  return (
    <div className="mb-3">
      <label htmlFor={id} className="form-label text-white small fw-medium d-flex align-items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error ? (
        <div className="text-danger small mt-1 d-flex align-items-center gap-1" role="alert">
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <div className="text-muted small mt-1">{helperText}</div>
      ) : null}
    </div>
  );
};
