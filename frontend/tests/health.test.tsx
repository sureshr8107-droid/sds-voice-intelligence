import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HomePage } from '../src/pages/HomePage';
import { SystemStatusPage } from '../src/pages/SystemStatusPage';
import { NotFoundPage } from '../src/pages/NotFoundPage';
import { HealthService } from '../src/services/healthService';
import { ServiceHealth } from '@call-screening/shared';

// Mock the HealthService
vi.mock('../src/services/healthService', () => ({
  HealthService: {
    getDiagnostics: vi.fn(),
  },
}));

const mockHealthSuccess: ServiceHealth = {
  status: 'healthy',
  service: 'ai-call-screening-backend',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  requestId: 'test-request-id-123',
  uptimeSeconds: 120,
  environment: 'test',
  dependencies: {
    database: {
      provider: 'Supabase PostgreSQL',
      status: 'not_configured',
      message: 'Not configured - Phase 2 Foundation Mode',
    },
    aiEngine: {
      sttProvider: 'Whisper',
      llmProvider: 'Ollama',
      ttsProvider: 'Piper',
      status: 'not_configured',
      message: 'Not configured - Phase 6 Local AI Pipeline',
    },
    telephony: {
      provider: 'Asterisk PBX',
      status: 'not_configured',
      message: 'Not configured - Phase 7 Telephony Control',
    },
  },
};

describe('Frontend Component & View Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders HomePage with hero and phase 2 foundation details', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText(/AI-Powered Smart Call Screening & Routing System/i)).toBeInTheDocument();
    expect(screen.getByText(/Phase 2 Foundation Active/i)).toBeInTheDocument();
    expect(screen.getByText(/View System Health & Diagnostics/i)).toBeInTheDocument();
  });

  it('renders SystemStatusPage with successful backend diagnostics', async () => {
    vi.mocked(HealthService.getDiagnostics).mockResolvedValueOnce({
      success: true,
      data: mockHealthSuccess,
    });

    render(
      <BrowserRouter>
        <SystemStatusPage />
      </BrowserRouter>
    );

    // Initial loading state
    expect(screen.getByText(/Connecting to Backend API/i)).toBeInTheDocument();

    // After resolution
    await waitFor(() => {
      expect(screen.getByText(/ai-call-screening-backend/i)).toBeInTheDocument();
      expect(screen.getByText(/React 18 \+ Vite/i)).toBeInTheDocument();
      expect(screen.getByText(/test-request-id-123/i)).toBeInTheDocument();
      expect(screen.getByText(/Not configured - Phase 2 Foundation Mode/i)).toBeInTheDocument();
    });
  });

  it('renders SystemStatusPage error state when backend is unreachable and supports retry', async () => {
    vi.mocked(HealthService.getDiagnostics)
      .mockResolvedValueOnce({
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to reach backend server.',
          timestamp: new Date().toISOString(),
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: mockHealthSuccess,
      });

    render(
      <BrowserRouter>
        <SystemStatusPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Backend API Offline or Unreachable/i)).toBeInTheDocument();
      expect(screen.getByText(/NETWORK_ERROR/i)).toBeInTheDocument();
    });

    // Click retry button
    const retryBtn = screen.getByRole('button', { name: /Retry Connection/i });
    fireEvent.click(retryBtn);

    // After retry succeeds
    await waitFor(() => {
      expect(screen.getByText(/ai-call-screening-backend/i)).toBeInTheDocument();
    });
  });

  it('renders NotFoundPage with return link', () => {
    render(
      <BrowserRouter>
        <NotFoundPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/404 - Page Not Found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Return to Overview/i })).toBeInTheDocument();
  });
});
