import { apiClient, normalizeError, NormalizedError } from './apiClient';
import { AuthenticatedUser } from '@call-screening/shared';

export interface AuthMeResponse {
  user: AuthenticatedUser;
  timestamp: string;
}

export interface AuthVerificationResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: NormalizedError;
}

export class AuthService {
  /**
   * Fetch authenticated user profile from backend using in-memory token
   */
  static async getCurrentUser(token?: string): Promise<AuthVerificationResult> {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.get<AuthMeResponse>('/auth/me', { headers });

      return {
        success: true,
        user: response.data.user,
      };
    } catch (error) {
      return {
        success: false,
        error: normalizeError(error),
      };
    }
  }

  /**
   * Verify server-side admin role authorization against /auth/admin/test
   */
  static async verifyAdminAccess(): Promise<{ success: boolean; error?: NormalizedError }> {
    try {
      await apiClient.get('/auth/admin/test');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: normalizeError(error),
      };
    }
  }

  /**
   * Verify server-side staff/operator role authorization against /auth/staff/test
   */
  static async verifyStaffAccess(): Promise<{ success: boolean; error?: NormalizedError }> {
    try {
      await apiClient.get('/auth/staff/test');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: normalizeError(error),
      };
    }
  }
}
