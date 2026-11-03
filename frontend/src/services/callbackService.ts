import { apiClient, normalizeError, NormalizedError } from './apiClient';
import { CallbackRequest } from '@call-screening/shared';

export class CallbackService {
  static async getCallbacks(): Promise<{
    success: boolean;
    data?: CallbackRequest[];
    error?: NormalizedError;
  }> {
    try {
      const response = await apiClient.get<CallbackRequest[]>('/callbacks');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  static async updateCallbackStatus(
    id: string,
    status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<{ success: boolean; data?: CallbackRequest; error?: NormalizedError }> {
    try {
      const response = await apiClient.patch<CallbackRequest>(`/callbacks/${id}`, { status });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }
}
