import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../src/pages/DashboardPage';
import { AuthProvider } from '../src/context/AuthContext';
import { HealthService } from '../src/services/healthService';
import { CallService } from '../src/services/callService';
import { ServiceHealth } from '@call-screening/shared';

vi.mock('../src/services/healthService', () => ({
  HealthService: {
    getDiagnostics: vi.fn(),
  },
}));

vi.mock('../src/services/callService', () => ({
  CallService: {
    getCallStats: vi.fn(),
    getCalls: vi.fn(),
    getCallById: vi.fn(),
  },
}));

const mockHealthData: ServiceHealth = {
  status: 'healthy',
  service: 'ai-call-screening-backend',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  requestId: 'dashboard-test-id-999',
  uptimeSeconds: 300,
  environment: 'development',
  dependencies: {
    database: {
      provider: 'Supabase PostgreSQL',
      status: 'connected',
      message: '12 core tables and RLS active',
    },
    aiEngine: {
      sttProvider: 'Whisper',
      llmProvider: 'Ollama',
      ttsProvider: 'Piper',
      status: 'not_configured',
      message: 'Local AI Pipeline planned for Phase 6',
    },
    telephony: {
      provider: 'Asterisk PBX',
      status: 'not_configured',
      message: 'Asterisk ARI planned for Phase 7',
    },
  },
};

describe('Dashboard Component Suite (Phase 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Dashboard with stat cards, diagnostics, and unavailable banners', async () => {
    vi.mocked(HealthService.getDiagnostics).mockResolvedValueOnce({
      success: true,
      data: mockHealthData,
    });

    vi.mocked(CallService.getCallStats).mockResolvedValueOnce({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint /calls/stats not found - Phase 5 pending.',
        timestamp: new Date().toISOString(),
      },
    });

    vi.mocked(CallService.getCalls).mockResolvedValueOnce({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint /calls not found.',
        timestamp: new Date().toISOString(),
      },
    });

    render(
      <AuthProvider>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText(/Command Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Calls/i)).toBeInTheDocument();
    expect(screen.getByText(/In Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Completed/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Call History & Metrics Backend Pending/i)).toBeInTheDocument();
      expect(screen.getByText(/Verified System Diagnostics/i)).toBeInTheDocument();
      expect(screen.getByText(/12 core tables and RLS active/i)).toBeInTheDocument();
      expect(screen.getByText(/Local AI Pipeline planned for Phase 6/i)).toBeInTheDocument();
      expect(screen.getByText(/Asterisk ARI planned for Phase 7/i)).toBeInTheDocument();
    });
  });
});
