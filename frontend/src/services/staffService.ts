import { apiClient, normalizeError, NormalizedError } from './apiClient';
import { StaffSummary, StaffExtension, StaffAvailability, AvailabilityStatus } from '@call-screening/shared';

export interface StaffDetailResponse {
  extension: StaffExtension;
  profile: import('@call-screening/shared').UserProfile;
  department: import('@call-screening/shared').Department;
  availability?: StaffAvailability;
}

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

  static async getStaffById(id: string): Promise<{
    success: boolean;
    data?: StaffDetailResponse;
    error?: NormalizedError;
  }> {
    try {
      const response = await apiClient.get<StaffDetailResponse>(`/staff/${id}`);
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
