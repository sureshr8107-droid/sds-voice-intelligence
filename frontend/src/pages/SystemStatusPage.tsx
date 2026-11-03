import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Database,
  Radio,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { HealthService } from '../services/healthService';
import { ServiceHealth, DependencyStatus } from '@call-screening/shared';
import { NormalizedError } from '../services/apiClient';

export const SystemStatusPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [healthData, setHealthData] = useState<ServiceHealth | null>(null);
  const [error, setError] = useState<NormalizedError | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);

    const result = await HealthService.getDiagnostics();
    if (result.success && result.data) {
      setHealthData(result.data);
      setError(null);
    } else {
      setHealthData(null);
      setError(result.error || {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to fetch diagnostic data from backend.',
        timestamp: new Date().toISOString(),
      });
    }

    setLastChecked(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const renderBadge = (status: DependencyStatus | 'connected' | 'not_configured' | 'error') => {
    if (status === 'connected') {
      return (
        <span className="badge-healthy">
          <CheckCircle2 size={13} />
          <span>Connected</span>
        </span>
      );
    }
    if (status === 'not_configured') {
      return (
        <span className="badge-not-configured">
          <Clock size={13} />
          <span>Not Configured</span>
        </span>
      );
    }
    return (
      <span className="badge-error">
        <AlertTriangle size={13} />
        <span>Error</span>
      </span>
    );
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="text-white fw-bold mb-1 d-flex align-items-center gap-2">
            <Activity className="text-primary" size={26} />
            <span>System Health & Diagnostics</span>
          </h2>
          <p className="text-secondary small mb-0">
            Real-time status monitoring for backend processes, environment parameters, and external service adapters.
          </p>
        </div>

        <div className="d-flex align-items-center gap-3">
          {lastChecked && (
            <span className="text-secondary small">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="btn btn-outline-light btn-sm d-flex align-items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
            <span>{loading ? 'Checking...' : 'Refresh Status'}</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !healthData && !error && (
        <div className="glass-panel p-5 text-center my-4">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading diagnostics...</span>
          </div>
          <h5 className="text-white">Connecting to Backend API</h5>
          <p className="text-secondary small mb-0">Querying /api/v1/health endpoint...</p>
        </div>
      )}

      {/* Disconnection / Error State */}
      {error && (
        <div className="glass-panel p-4 mb-4 border-danger border-opacity-50">
          <div className="d-flex align-items-start gap-3">
            <div className="p-3 rounded-circle bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">
              <AlertCircle size={28} />
            </div>
            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2 mb-1">
                <h5 className="text-danger mb-0">Backend API Offline or Unreachable</h5>
                <span className="badge bg-danger bg-opacity-25 text-danger">{error.code}</span>
              </div>
              <p className="text-secondary small mb-3">{error.message}</p>
              <div className="p-3 rounded bg-dark border border-secondary border-opacity-25 mb-3 text-secondary small font-monospace">
                <div>Backend Target: http://localhost:5000/api/v1/health</div>
                <div>Status: Connection refused / Unreachable</div>
                <div>Timestamp: {error.timestamp}</div>
              </div>
              <button onClick={fetchHealth} className="btn btn-danger btn-sm">
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Diagnostics Results */}
      {healthData && (
        <>
          {/* Top Status Summary Cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="glass-panel p-3 h-100">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-secondary small">Frontend Console</span>
                  <span className="badge-healthy">
                    <CheckCircle2 size={13} />
                    <span>Operational</span>
                  </span>
                </div>
                <h4 className="text-white mb-0">React 18 + Vite</h4>
                <div className="text-secondary small mt-1">Host: Windows Workstation (Localhost)</div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="glass-panel p-3 h-100">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-secondary small">Backend API Process</span>
                  <span className="badge-healthy">
                    <CheckCircle2 size={13} />
                    <span>Healthy (200 OK)</span>
                  </span>
                </div>
                <h4 className="text-white mb-0">{healthData.service}</h4>
                <div className="text-secondary small mt-1">
                  Uptime: {healthData.uptimeSeconds} seconds • Env: {healthData.environment}
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="glass-panel p-3 h-100">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-secondary small">Request Tracing</span>
                  <span className="badge bg-secondary bg-opacity-25 text-secondary">Active</span>
                </div>
                <h6 className="text-white text-truncate mb-0 font-monospace">
                  {healthData.requestId || 'Generated per request'}
                </h6>
                <div className="text-secondary small mt-1">X-Request-Id UUID header verified</div>
              </div>
            </div>
          </div>

          {/* Subsystems & Dependency Adapters Grid */}
          <h4 className="text-white mb-3">Subsystem & Adapter Readiness</h4>
          <div className="row g-3 mb-4">
            {/* Database Adapter */}
            <div className="col-md-4">
              <div className="glass-panel p-4 h-100">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="p-2 rounded-3 bg-secondary bg-opacity-10 text-white">
                    <Database size={22} className="text-primary" />
                  </div>
                  {renderBadge(healthData.dependencies.database.status)}
                </div>
                <h5 className="text-white mb-1">{healthData.dependencies.database.provider}</h5>
                <p className="text-secondary small mb-3">
                  {healthData.dependencies.database.message}
                </p>
                <div className="border-top border-secondary border-opacity-25 pt-2 text-muted small">
                  Scheduled: Phase 3 (Migrations, RLS & Auth)
                </div>
              </div>
            </div>

            {/* AI Engine Adapter */}
            <div className="col-md-4">
              <div className="glass-panel p-4 h-100">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="p-2 rounded-3 bg-secondary bg-opacity-10 text-white">
                    <Cpu size={22} className="text-info" />
                  </div>
                  {renderBadge(healthData.dependencies.aiEngine.status)}
                </div>
                <h5 className="text-white mb-1">Local AI Pipeline</h5>
                <p className="text-secondary small mb-2">
                  STT: {healthData.dependencies.aiEngine.sttProvider}
                  <br />
                  LLM: {healthData.dependencies.aiEngine.llmProvider}
                  <br />
                  TTS: {healthData.dependencies.aiEngine.ttsProvider}
                </p>
                <p className="text-secondary small mb-3">
                  {healthData.dependencies.aiEngine.message}
                </p>
                <div className="border-top border-secondary border-opacity-25 pt-2 text-muted small">
                  Scheduled: Phase 6 (Ollama & Whisper)
                </div>
              </div>
            </div>

            {/* Telephony Adapter */}
            <div className="col-md-4">
              <div className="glass-panel p-4 h-100">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="p-2 rounded-3 bg-secondary bg-opacity-10 text-white">
                    <Radio size={22} className="text-warning" />
                  </div>
                  {renderBadge(healthData.dependencies.telephony.status)}
                </div>
                <h5 className="text-white mb-1">{healthData.dependencies.telephony.provider}</h5>
                <p className="text-secondary small mb-3">
                  {healthData.dependencies.telephony.message}
                </p>
                <div className="border-top border-secondary border-opacity-25 pt-2 text-muted small">
                  Scheduled: Phase 7 (ARI Channel Control)
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
