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

/**
 * Authentication contract payloads
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: import('../types').AuthenticatedUser;
  expiresIn: string;
}

/**
 * Call aggregate statistics contract
 */
export interface CallStatsResponse {
  totalCalls: number;
  inProgressCalls: number;
  completedCalls: number;
  missedCalls: number;
  pendingCallbacks: number;
  avgDurationSeconds: number;
}

/**
 * Call status update payload
 */
export interface UpdateCallStatusRequest {
  status: import('../types').CallStatus;
  reason?: string;
  assignedStaffId?: string;
  durationSeconds?: number;
  aiSummary?: string;
}

/**
 * Department management request payloads
 */
export interface CreateDepartmentRequest {
  name: string;
  code: string;
  description?: string;
  primaryExtension?: string;
  routingTimeoutSeconds?: number;
}

export interface UpdateDepartmentRequest {
  name?: string;
  code?: string;
  description?: string;
  primaryExtension?: string;
  routingTimeoutSeconds?: number;
  isActive?: boolean;
}

/**
 * Staff availability request payload
 */
export interface UpdateAvailabilityRequest {
  status: import('../types').AvailabilityStatus;
  customStatusMessage?: string;
}

/**
 * Routing rule request payloads
 */
export interface CreateRoutingRuleRequest {
  departmentId: string;
  intentKeyword: string;
  priority?: number;
  fallbackDestinationType: 'operator' | 'voicemail' | 'extension' | 'external_number';
  fallbackDestinationValue?: string;
  isActive?: boolean;
}

export interface UpdateRoutingRuleRequest {
  departmentId?: string;
  intentKeyword?: string;
  priority?: number;
  fallbackDestinationType?: 'operator' | 'voicemail' | 'extension' | 'external_number';
  fallbackDestinationValue?: string;
  isActive?: boolean;
}

/**
 * Callback management request payloads
 */
export interface CreateCallbackRequest {
  callerNumber: string;
  callerName?: string;
  requestedDepartmentId?: string;
  preferredCallbackTime?: string;
  transcriptSummary?: string;
  notes?: string;
  callId?: string;
}

export interface UpdateCallbackRequest {
  status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignedProfileId?: string;
  notes?: string;
}

/**
 * Real-time Socket.IO event payloads
 */
export interface CallCreatedEvent {
  call: import('../types').CallRecord;
  timestamp: string;
}

export interface CallUpdatedEvent {
  call: import('../types').CallRecord;
  timestamp: string;
}

export interface CallStatusChangedEvent {
  callId: string;
  previousStatus: import('../types').CallStatus;
  currentStatus: import('../types').CallStatus;
  reason?: string;
  timestamp: string;
}

export interface CallRoutingUpdatedEvent {
  callId: string;
  departmentId?: string;
  assignedStaffId?: string;
  ruleId?: string;
  intent?: string;
  fallback?: boolean;
  timestamp: string;
}

export interface StaffAvailabilityChangedEvent {
  staffExtensionId: string;
  profileId: string;
  status: import('../types').AvailabilityStatus;
  customStatusMessage?: string;
  timestamp: string;
}

export interface CallbackCreatedEvent {
  callback: import('../types').CallbackRequest;
  timestamp: string;
}

