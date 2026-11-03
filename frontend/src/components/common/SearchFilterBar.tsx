import React from 'react';
import { Search, X } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  options: FilterOption[];
  selectedValue: string;
}

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  onFilterChange?: (filterId: string, value: string) => void;
  onResetFilters?: () => void;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters = [],
  onFilterChange,
  onResetFilters,
}) => {
  const hasActiveFilters =
    searchQuery.trim().length > 0 || filters.some((f) => f.selectedValue !== 'all');

  return (
    <div className="glass-panel p-3 mb-4">
      <div className="row g-3 align-items-center">
        {/* Search Input */}
        <div className="col-12 col-md-5 col-lg-4">
          <div className="input-group">
            <span className="input-group-text bg-transparent border-0 text-muted ps-3">
              <Search size={16} />
            </span>
            <input
              type="text"
              className="form-control form-control-custom ps-2"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label={searchPlaceholder}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn btn-link text-muted pe-3 text-decoration-none"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns */}
        {filters.map((filter) => (
          <div key={filter.id} className="col-6 col-md-3 col-lg-2">
            <select
              className="form-select form-select-custom"
              value={filter.selectedValue}
              onChange={(e) => onFilterChange && onFilterChange(filter.id, e.target.value)}
              aria-label={`Filter by ${filter.label}`}
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Reset Action */}
        {hasActiveFilters && onResetFilters && (
          <div className="col-auto ms-auto">
            <button
              type="button"
              onClick={onResetFilters}
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            >
              <X size={14} />
              <span>Reset</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
