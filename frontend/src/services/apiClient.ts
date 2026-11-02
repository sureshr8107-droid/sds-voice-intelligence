import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiErrorResponse } from '@call-screening/shared';

// Use environment variable or fallback to local API URL
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dynamic in-memory token provider (never stored in localStorage or sessionStorage)
let inMemoryTokenGetter: (() => string | null) | null = null;
let unauthorizedCallback: (() => void) | null = null;

export function configureAuthInterceptor(
  tokenGetter: () => string | null,
  onUnauthorized?: () => void
): void {
  inMemoryTokenGetter = tokenGetter;
  if (onUnauthorized) {
    unauthorizedCallback = onUnauthorized;
  }
}

// Attach in-memory token to outgoing requests if available
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (inMemoryTokenGetter) {
    const token = inMemoryTokenGetter();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Intercept 401 Unauthorized responses safely
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      if (unauthorizedCallback) {
        unauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);

export interface NormalizedError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
  timestamp: string;
}

export function normalizeError(error: unknown): NormalizedError {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<ApiErrorResponse>;

    if (axiosErr.response?.data?.error) {
      return {
        code: axiosErr.response.data.error.code || 'API_ERROR',
        message: axiosErr.response.data.error.message || 'An unexpected API error occurred.',
        details: axiosErr.response.data.error.details,
        requestId: axiosErr.response.data.error.requestId,
        timestamp: axiosErr.response.data.error.timestamp || new Date().toISOString(),
      };
    }

    if (axiosErr.code === 'ECONNABORTED') {
      return {
        code: 'TIMEOUT',
        message: 'The request timed out while communicating with the backend server.',
        timestamp: new Date().toISOString(),
      };
    }

    if (!axiosErr.response) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Unable to reach the backend server. Please verify the backend is running.',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      code: `HTTP_${axiosErr.response.status}`,
      message: axiosErr.message || 'HTTP request failed.',
      timestamp: new Date().toISOString(),
    };
  }

  if (error instanceof Error) {
    return {
      code: 'CLIENT_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred.',
    timestamp: new Date().toISOString(),
  };
}
