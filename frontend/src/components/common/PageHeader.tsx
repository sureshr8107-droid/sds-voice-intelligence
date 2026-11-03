import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  badge,
  actions,
}) => {
  return (
    <div className="mb-4">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="breadcrumb" className="mb-2">
          <ol className="breadcrumb small mb-0 d-flex align-items-center gap-1">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <li
                  key={idx}
                  className={`breadcrumb-item d-flex align-items-center gap-1 ${
                    isLast ? 'active text-secondary' : ''
                  }`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {crumb.to && !isLast ? (
                    <Link to={crumb.to} className="text-muted text-decoration-none hover-white">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                  {!isLast && <ChevronRight size={12} className="text-muted mx-1" />}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
        <div>
          <div className="d-flex align-items-center gap-3">
            <h1 className="h3 fw-bold mb-0 text-white">{title}</h1>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && <p className="text-secondary small mb-0 mt-1">{subtitle}</p>}
        </div>

        {actions && <div className="d-flex align-items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};
