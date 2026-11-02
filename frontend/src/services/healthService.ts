import { apiClient, normalizeError, NormalizedError } from './apiClient';
import { ServiceHealth } from '@call-screening/shared';

export interface HealthServiceResult {
  success: boolean;
  data?: ServiceHealth;
  error?: NormalizedError;
}

export class HealthService {
  /**
   * Fetch detailed diagnostic health status from the backend
   */
  public static async getDiagnostics(): Promise<HealthServiceResult> {
    try {
      const response = await apiClient.get<ServiceHealth>('/health');
      return {
        success: true,
        data: response.data,
      };
    } catch (err) {
      return {
        success: false,
        error: normalizeError(err),
      };
    }
  }
}
