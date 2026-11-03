import { apiClient, normalizeError, NormalizedError } from './apiClient';
import { CallbackRequest, CreateCallbackRequest, UpdateCallbackRequest } from '@call-screening/shared';

export class CallbackService {
  static async getCallbacks(params?: {
    status?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data?: { callbacks: CallbackRequest[]; total: number; page: number; limit: number };
    error?: NormalizedError;
  }> {
    try {
      const response = await apiClient.get<{
        callbacks: CallbackRequest[];
        total: number;
        page: number;
        limit: number;
      }>('/callbacks', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  static async createCallback(
    payload: CreateCallbackRequest
  ): Promise<{ success: boolean; data?: CallbackRequest; error?: NormalizedError }> {
    try {
      const response = await apiClient.post<CallbackRequest>('/callbacks', payload);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  static async updateCallback(
    id: string,
    payload: UpdateCallbackRequest
  ): Promise<{ success: boolean; data?: CallbackRequest; error?: NormalizedError }> {
    try {
      const response = await apiClient.patch<CallbackRequest>(`/callbacks/${id}`, payload);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  static async updateCallbackStatus(
    id: string,
    status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<{ success: boolean; data?: CallbackRequest; error?: NormalizedError }> {
    return this.updateCallback(id, { status });
  }
}
