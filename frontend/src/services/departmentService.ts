import { apiClient, normalizeError, NormalizedError } from './apiClient';
import { Department, CreateDepartmentRequest, UpdateDepartmentRequest } from '@call-screening/shared';

export type CreateDepartmentPayload = CreateDepartmentRequest;

export class DepartmentService {
  static async getDepartments(): Promise<{
    success: boolean;
    data?: Department[];
    error?: NormalizedError;
  }> {
    try {
      const response = await apiClient.get<Department[]>('/departments');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  static async getDepartmentById(
    id: string
  ): Promise<{ success: boolean; data?: Department; error?: NormalizedError }> {
    try {
      const response = await apiClient.get<Department>(`/departments/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  static async createDepartment(
    payload: CreateDepartmentPayload
  ): Promise<{ success: boolean; data?: Department; error?: NormalizedError }> {
    try {
      const response = await apiClient.post<Department>('/departments', payload);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  static async updateDepartment(
    id: string,
    payload: UpdateDepartmentRequest
  ): Promise<{ success: boolean; data?: Department; error?: NormalizedError }> {
    try {
      const response = await apiClient.patch<Department>(`/departments/${id}`, payload);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }
}
