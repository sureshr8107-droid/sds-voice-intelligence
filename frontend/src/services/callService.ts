import { apiClient, normalizeError, NormalizedError } from './apiClient';
import { CallRecord, CallStatus, UpdateCallStatusRequest } from '@call-screening/shared';

export interface CallFilterParams {
  page?: number;
  limit?: number;
  status?: CallStatus | 'all';
  departmentId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CallListResponse {
  calls: CallRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface CallStats {
  totalCalls: number;
  inProgressCalls: number;
  completedCalls: number;
  missedCalls: number;
  pendingCallbacks: number;
  avgDurationSeconds: number;
}

export class CallService {
  /**
   * Fetch paginated calls list with optional filters
   */
  static async getCalls(
    params: CallFilterParams = {}
  ): Promise<{ success: boolean; data?: CallListResponse; error?: NormalizedError }> {
    try {
      const response = await apiClient.get<CallListResponse>('/calls', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  /**
   * Fetch single call details by ID
   */
  static async getCallById(
    id: string
  ): Promise<{ success: boolean; data?: CallRecord; error?: NormalizedError }> {
    try {
      const response = await apiClient.get<CallRecord>(`/calls/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  /**
   * Fetch aggregate call metrics
   */
  static async getCallStats(): Promise<{
    success: boolean;
    data?: CallStats;
    error?: NormalizedError;
  }> {
    try {
      const response = await apiClient.get<CallStats>('/calls/stats');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  /**
   * Transition call status via Call State Machine (PATCH /api/v1/calls/:id/status)
   */
  static async updateCallStatus(
    id: string,
    payload: UpdateCallStatusRequest
  ): Promise<{ success: boolean; data?: CallRecord; error?: NormalizedError }> {
    try {
      const response = await apiClient.patch<CallRecord>(`/calls/${id}/status`, payload);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }
}
