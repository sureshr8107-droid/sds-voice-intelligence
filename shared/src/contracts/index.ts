export * from '../types';

/**
 * Standard pagination and filtering parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated list response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Call screening notification sent to staff dashboard
 */
export interface CallScreeningNotification {
  callId: string;
  callerNumber: string;
  callerName?: string;
  departmentId: string;
  departmentName: string;
  detectedIntent: string;
  summary: string;
  confidenceScore: number;
  timeoutSeconds: number;
  timestamp: string;
}
