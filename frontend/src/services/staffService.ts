import { apiClient, normalizeError, NormalizedError } from './apiClient';
import { StaffSummary, StaffExtension, StaffAvailability, AvailabilityStatus } from '@call-screening/shared';

export class StaffService {
  static async getStaffMembers(): Promise<{
    success: boolean;
    data?: StaffSummary[];
    error?: NormalizedError;
  }> {
    try {
      const response = await apiClient.get<StaffSummary[]>('/staff');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  static async getStaffExtensions(): Promise<{
    success: boolean;
    data?: StaffExtension[];
    error?: NormalizedError;
  }> {
    try {
      const response = await apiClient.get<StaffExtension[]>('/extensions');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  static async updateAvailability(
    staffExtensionId: string,
    status: AvailabilityStatus,
    customMessage?: string
  ): Promise<{
    success: boolean;
    data?: StaffAvailability;
    error?: NormalizedError;
  }> {
    try {
      const response = await apiClient.patch<StaffAvailability>(
        `/staff/${staffExtensionId}/availability`,
        { status, customStatusMessage: customMessage }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }
}
