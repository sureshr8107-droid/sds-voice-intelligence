import { apiClient, normalizeError, NormalizedError } from './apiClient';
import { RoutingRule, CreateRoutingRuleRequest, UpdateRoutingRuleRequest } from '@call-screening/shared';

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

  static async createRoutingRule(
    payload: CreateRoutingRuleRequest
  ): Promise<{ success: boolean; data?: RoutingRule; error?: NormalizedError }> {
    try {
      const response = await apiClient.post<RoutingRule>('/routing-rules', payload);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  static async updateRoutingRule(
    id: string,
    payload: UpdateRoutingRuleRequest
  ): Promise<{ success: boolean; data?: RoutingRule; error?: NormalizedError }> {
    try {
      const response = await apiClient.patch<RoutingRule>(`/routing-rules/${id}`, payload);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  static async toggleRuleActive(
    id: string,
    isActive: boolean
  ): Promise<{ success: boolean; data?: RoutingRule; error?: NormalizedError }> {
    return this.updateRoutingRule(id, { isActive });
  }

  static async deleteRoutingRule(
    id: string
  ): Promise<{ success: boolean; error?: NormalizedError }> {
    try {
      await apiClient.delete(`/routing-rules/${id}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }
}
