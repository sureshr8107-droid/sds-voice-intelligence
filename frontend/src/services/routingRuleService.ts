import { apiClient, normalizeError, NormalizedError } from './apiClient';
import { RoutingRule } from '@call-screening/shared';

export class RoutingRuleService {
  static async getRoutingRules(): Promise<{
    success: boolean;
    data?: RoutingRule[];
    error?: NormalizedError;
  }> {
    try {
      const response = await apiClient.get<RoutingRule[]>('/routing-rules');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  static async toggleRuleActive(
    id: string,
    isActive: boolean
  ): Promise<{ success: boolean; data?: RoutingRule; error?: NormalizedError }> {
    try {
      const response = await apiClient.patch<RoutingRule>(`/routing-rules/${id}`, { isActive });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }
}
