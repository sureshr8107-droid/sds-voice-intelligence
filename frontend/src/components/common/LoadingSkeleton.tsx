import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
  height?: string;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  rows = 4,
  height = '48px',
  className = '',
}) => {
  return (
    <div className={`d-flex flex-column gap-2 ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="skeleton-box w-100"
          style={{ height, opacity: 1 - index * 0.15 }}
        />
      ))}
    </div>
  );
};
