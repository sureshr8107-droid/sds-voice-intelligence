import { apiClient, normalizeError, NormalizedError } from './apiClient';
import { CallRecord, CallStatus } from '@call-screening/shared';

export interface CallFilterParams {
  page?: number;
  limit?: number;
  status?: CallStatus | 'all';
  departmentId?: string;
  search?: string;
}

export interface CallListResponse {
  calls: CallRecord[];
  total: number;
  page: number;
  limit: number;
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
}
