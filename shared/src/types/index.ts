/**
 * High-level system health states
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Third-party / external integration dependency status
 */
export type DependencyStatus = 'connected' | 'not_configured' | 'error';

/**
 * User roles for access control
 */
export type UserRole = 'admin' | 'staff' | 'operator';

/**
 * Staff availability status types
 */
export type AvailabilityStatus = 'available' | 'busy' | 'away' | 'do_not_disturb' | 'offline';

/**
 * Authenticated user context attached to Express requests
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phoneNumber?: string;
  avatarUrl?: string;
}

/**
 * Diagnostic health status response payload
 */
export interface ServiceHealth {
  status: HealthStatus;
  service: string;
  version: string;
  timestamp: string;
  requestId?: string;
  uptimeSeconds: number;
  environment: string;
  dependencies: {
    database: {
      provider: string;
      status: DependencyStatus;
      message?: string;
    };
    aiEngine: {
      sttProvider: string;
      llmProvider: string;
      ttsProvider: string;
      status: DependencyStatus;
      message?: string;
    };
    telephony: {
      provider: string;
      status: DependencyStatus;
      message?: string;
    };
  };
}

/**
 * Normalized API error response structure
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
    timestamp: string;
  };
}

/**
 * Finite call state lifecycle
 */
export type CallStatus =
  | 'initiated'
  | 'ringing'
  | 'answered_by_ai'
  | 'processing'
  | 'awaiting_staff'
  | 'connecting'
  | 'bridged'
  | 'completed'
  | 'rejected'
  | 'timed_out'
  | 'failed'
  | 'callback_requested';

/**
 * Core Database Entity: Profile
 */
export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phoneNumber?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Core Database Entity: Department
 */
export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  primaryExtension?: string;
  routingTimeoutSeconds: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Core Database Entity: StaffExtension
 */
export interface StaffExtension {
  id: string;
  profileId: string;
  departmentId: string;
  extension: string;
  sipUsername: string;
  priorityOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Core Database Entity: StaffAvailability
 */
export interface StaffAvailability {
  id: string;
  staffExtensionId: string;
  status: AvailabilityStatus;
  customStatusMessage?: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  workDays: number[];
  lastStatusChange: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Core Database Entity: RoutingRule
 */
export interface RoutingRule {
  id: string;
  departmentId: string;
  intentKeyword: string;
  priority: number;
  fallbackDestinationType: 'operator' | 'voicemail' | 'extension' | 'external_number';
  fallbackDestinationValue?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Core Database Entity: Call
 */
export interface CallRecord {
  id: string;
  telephonyCallId?: string;
  callerNumber: string;
  callerName?: string;
  detectedIntent?: string;
  departmentId?: string;
  assignedStaffId?: string;
  status: CallStatus;
  confidenceScore?: number;
  reason?: string;
  aiSummary?: string;
  durationSeconds: number;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Core Database Entity: CallTranscript
 */
export interface CallTranscript {
  id: string;
  callId: string;
  speaker: 'ai' | 'caller' | 'staff';
  transcriptText: string;
  confidence?: number;
  audioTimestampOffsetMs: number;
  createdAt: string;
}

/**
 * Core Database Entity: CallRequest (Staff screening alert)
 */
export interface CallRequest {
  id: string;
  callId: string;
  departmentId: string;
  staffExtensionId?: string;
  status: 'awaiting_staff' | 'accepted' | 'rejected' | 'timed_out' | 'cancelled';
  notifiedAt: string;
  respondedAt?: string;
  timeoutSeconds: number;
  createdAt: string;
}

/**
 * Core Database Entity: CallbackRequest
 */
export interface CallbackRequest {
  id: string;
  callId?: string;
  callerNumber: string;
  callerName?: string;
  requestedDepartmentId?: string;
  preferredCallbackTime?: string;
  transcriptSummary?: string;
  audioRecordingUrl?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignedProfileId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Core Database Entity: OutboundCallRequest
 */
export interface OutboundCallRequest {
  id: string;
  requestedByProfileId: string;
  destinationNumber: string;
  recipientName?: string;
  callerIdUsed?: string;
  reason: string;
  status: 'requested' | 'initiating' | 'ringing' | 'answered' | 'failed' | 'busy' | 'no_answer' | 'completed';
  durationSeconds: number;
  telephonyChannelId?: string;
  initiatedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Core Database Entity: AuditLog
 */
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

/**
 * Core Database Entity: SystemSetting
 */
export interface SystemSetting {
  id: string;
  settingKey: string;
  settingValue: unknown;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Call summary overview contract
 */
export interface CallSummary {
  id: string;
  callerNumber: string;
  callerName?: string;
  detectedIntent?: string;
  departmentId?: string;
  departmentName?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  status: CallStatus;
  confidenceScore?: number;
  reason?: string;
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Staff member summary contract
 */
export interface StaffSummary {
  id: string;
  profileId: string;
  fullName: string;
  email: string;
  departmentId: string;
  departmentName: string;
  extension: string;
  isAvailable: boolean;
  priorityOrder: number;
}

/**
 * Department summary contract
 */
export interface DepartmentSummary {
  id: string;
  name: string;
  description?: string;
  primaryExtension?: string;
  isActive: boolean;
  routingTimeoutSeconds: number;
}
