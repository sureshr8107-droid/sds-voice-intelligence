import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PhoneCall,
  PhoneForwarded,
  CheckCircle2,
  PhoneMissed,
  Clock,
  Layers,
  ArrowRight,
  RefreshCw,
  Activity,
  Headphones,
  Shield,
  Cpu,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { FeatureUnavailableBanner } from '../components/common/FeatureUnavailableBanner';
import { StatusBadge } from '../components/common/StatusBadge';
import { HealthService } from '../services/healthService';
import { CallService, CallStats } from '../services/callService';
import { ServiceHealth, CallRecord } from '@call-screening/shared';
import { NormalizedError } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Diagnostics Health
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthData, setHealthData] = useState<ServiceHealth | null>(null);
  const [healthError, setHealthError] = useState<NormalizedError | null>(null);

  // Call Stats & Activity
  const [statsLoading, setStatsLoading] = useState(true);
  const [callStats, setCallStats] = useState<CallStats | null>(null);
  const [statsError, setStatsError] = useState<NormalizedError | null>(null);

  const [recentCalls, setRecentCalls] = useState<CallRecord[]>([]);
  const [recentCallsLoading, setRecentCallsLoading] = useState(true);
  const [recentCallsError, setRecentCallsError] = useState<NormalizedError | null>(null);

  const loadData = async () => {
    // 1. Fetch real system health diagnostics
    setHealthLoading(true);
    const healthRes = await HealthService.getDiagnostics();
    if (healthRes.success && healthRes.data) {
      setHealthData(healthRes.data);
      setHealthError(null);
    } else {
      setHealthError(healthRes.error || null);
    }
    setHealthLoading(false);

    // 2. Fetch call stats (returns 404 until Phase 5 backend is deployed)
    setStatsLoading(true);
    const statsRes = await CallService.getCallStats();
    if (statsRes.success && statsRes.data) {
      setCallStats(statsRes.data);
      setStatsError(null);
    } else {
      setCallStats(null);
      setStatsError(statsRes.error || null);
    }
    setStatsLoading(false);

    // 3. Fetch recent calls
    setRecentCallsLoading(true);
    const callsRes = await CallService.getCalls({ limit: 5 });
    if (callsRes.success && callsRes.data) {
      setRecentCalls(callsRes.data.calls);
      setRecentCallsError(null);
    } else {
      setRecentCalls([]);
      setRecentCallsError(callsRes.error || null);
    }
    setRecentCallsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="container-fluid px-0">
      {/* Page Header */}
      <PageHeader
        title="Command Dashboard"
        subtitle="Real-time call screening metrics, system diagnostics, and operational status."
        badge={
          <span className="badge bg-info bg-opacity-15 text-info border border-info border-opacity-25 px-2 py-1 rounded-pill">
            Phase 4 Live
          </span>
        }
        actions={
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            onClick={loadData}
          >
            <RefreshCw size={14} className={healthLoading ? 'spin' : ''} />
            <span>Refresh Diagnostics</span>
          </button>
        }
      />

      {/* Welcome Banner */}
      {user && (
        <div className="glass-panel p-4 mb-4 border border-white border-opacity-10">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div className="text-secondary small">Welcome back,</div>
              <h2 className="h4 text-white fw-bold mb-1">{user.fullName}</h2>
              <div className="d-flex align-items-center gap-2">
                <StatusBadge type="role" value={user.role} />
                <span className="text-muted small">• {user.email}</span>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2">
              <Link to="/staff-console" className="btn btn-sm btn-info text-dark fw-bold d-flex align-items-center gap-2">
                <Headphones size={15} />
                <span>Open Staff Console</span>
              </Link>
              <Link to="/system-status" className="btn btn-sm btn-outline-light d-flex align-items-center gap-2">
                <Activity size={15} />
                <span>System Diagnostics</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Operational Stats Grid */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-2">
          <StatCard
            title="Total Calls"
            value={callStats ? callStats.totalCalls : null}
            unavailableNotice={statsError ? 'Pending Phase 5' : undefined}
            isLoading={statsLoading}
            icon={<PhoneCall size={20} />}
            iconBgClass="bg-info bg-opacity-15"
            iconColorClass="text-info"
            subtitle="All-time screened"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-2">
          <StatCard
            title="In Progress"
            value={callStats ? callStats.inProgressCalls : null}
            unavailableNotice={statsError ? 'Pending Phase 5' : undefined}
            isLoading={statsLoading}
            icon={<PhoneForwarded size={20} />}
            iconBgClass="bg-primary bg-opacity-15"
            iconColorClass="text-primary"
            subtitle="Active bridges"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-2">
          <StatCard
            title="Completed"
            value={callStats ? callStats.completedCalls : null}
            unavailableNotice={statsError ? 'Pending Phase 5' : undefined}
            isLoading={statsLoading}
            icon={<CheckCircle2 size={20} />}
            iconBgClass="bg-success bg-opacity-15"
            iconColorClass="text-success"
            subtitle="Successfully routed"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-2">
          <StatCard
            title="Missed Calls"
            value={callStats ? callStats.missedCalls : null}
            unavailableNotice={statsError ? 'Pending Phase 5' : undefined}
            isLoading={statsLoading}
            icon={<PhoneMissed size={20} />}
            iconBgClass="bg-danger bg-opacity-15"
            iconColorClass="text-danger"
            subtitle="No staff answer"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-2">
          <StatCard
            title="Callbacks"
            value={callStats ? callStats.pendingCallbacks : null}
            unavailableNotice={statsError ? 'Pending Phase 5' : undefined}
            isLoading={statsLoading}
            icon={<Clock size={20} />}
            iconBgClass="bg-warning bg-opacity-15"
            iconColorClass="text-warning"
            subtitle="Pending queue"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-2">
          <StatCard
            title="Avg Duration"
            value={callStats && callStats.avgDurationSeconds > 0 ? `${callStats.avgDurationSeconds}s` : null}
            unavailableNotice={statsError ? 'Pending Phase 5' : undefined}
            isLoading={statsLoading}
            icon={<Layers size={20} />}
            iconBgClass="bg-purple bg-opacity-15"
            iconColorClass="text-purple"
            subtitle="Screening time"
          />
        </div>
      </div>

      {/* Pending API Notice for Live Calls */}
      {statsError && (
        <FeatureUnavailableBanner
          title="Call History & Metrics Backend Pending"
          description="The frontend call views are prepared for integration. Live telephony state machines and Asterisk ARI bridges will populate these statistics in Phase 5 & Phase 7. Operational metrics are not fabricated."
          plannedPhase="Phase 5 Backend State Machine"
          endpoint="GET /api/v1/calls/stats"
        />
      )}

      {/* System Service Health Summary */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-8">
          <div className="glass-panel p-4 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="text-white fw-bold mb-0 d-flex align-items-center gap-2">
                <Activity size={18} className="text-info" />
                <span>Verified System Diagnostics</span>
              </h5>
              {healthData && <StatusBadge type="health" value={healthData.status} />}
            </div>

            {healthLoading ? (
              <div className="p-3">
                <div className="skeleton-box w-100 mb-2" style={{ height: '36px' }}></div>
                <div className="skeleton-box w-100 mb-2" style={{ height: '36px' }}></div>
                <div className="skeleton-box w-100" style={{ height: '36px' }}></div>
              </div>
            ) : healthData ? (
              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-center justify-content-between p-3 rounded-3 bg-dark border border-white border-opacity-10">
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-2 rounded bg-info bg-opacity-15 text-info">
                      <Cpu size={20} />
                    </div>
                    <div>
                      <div className="text-white fw-bold small">{healthData.service}</div>
                      <div className="text-muted small">
                        Uptime: {healthData.uptimeSeconds}s • Env: {healthData.environment}
                      </div>
                    </div>
                  </div>
                  <span className="badge-healthy">
                    <CheckCircle2 size={12} />
                    <span>Active</span>
                  </span>
                </div>

                <div className="d-flex align-items-center justify-content-between p-3 rounded-3 bg-dark border border-white border-opacity-10">
                  <div>
                    <div className="text-white fw-bold small">Database Layer (Supabase PostgreSQL)</div>
                    <div className="text-muted small">
                      {healthData.dependencies.database.message || '12-table schema with RLS configured'}
                    </div>
                  </div>
                  <StatusBadge type="dependency" value={healthData.dependencies.database.status} />
                </div>

                <div className="d-flex align-items-center justify-content-between p-3 rounded-3 bg-dark border border-white border-opacity-10">
                  <div>
                    <div className="text-white fw-bold small">Local AI Pipeline (Whisper / Ollama / Piper)</div>
                    <div className="text-muted small">
                      {healthData.dependencies.aiEngine.message || 'Planned for Phase 6'}
                    </div>
                  </div>
                  <StatusBadge type="dependency" value={healthData.dependencies.aiEngine.status} />
                </div>

                <div className="d-flex align-items-center justify-content-between p-3 rounded-3 bg-dark border border-white border-opacity-10">
                  <div>
                    <div className="text-white fw-bold small">Telephony Control (Asterisk ARI / PJSIP)</div>
                    <div className="text-muted small">
                      {healthData.dependencies.telephony.message || 'Planned for Phase 7'}
                    </div>
                  </div>
                  <StatusBadge type="dependency" value={healthData.dependencies.telephony.status} />
                </div>
              </div>
            ) : (
              <div className="alert alert-warning small mb-0">
                {healthError?.message || 'Unable to contact backend diagnostic health check. Ensure backend is running on port 5000.'}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="col-12 col-lg-4">
          <div className="glass-panel p-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <h5 className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
                <Shield size={18} className="text-info" />
                <span>Institutional Controls</span>
              </h5>
              <p className="text-secondary small mb-4">
                Manage screening routing rules, staff extensions, and receptionist reception queues.
              </p>

              <div className="d-flex flex-column gap-2">
                <Link
                  to="/calls"
                  className="btn btn-outline-secondary text-start d-flex align-items-center justify-content-between p-2 rounded-3"
                >
                  <span className="small text-white">Call History & Intent Records</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to="/staff-console"
                  className="btn btn-outline-secondary text-start d-flex align-items-center justify-content-between p-2 rounded-3"
                >
                  <span className="small text-white">Staff Call Reception Console</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to="/departments"
                  className="btn btn-outline-secondary text-start d-flex align-items-center justify-content-between p-2 rounded-3"
                >
                  <span className="small text-white">Institutional Departments</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to="/routing-rules"
                  className="btn btn-outline-secondary text-start d-flex align-items-center justify-content-between p-2 rounded-3"
                >
                  <span className="small text-white">AI Screening & Routing Rules</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="pt-3 border-top border-white border-opacity-10 mt-3 text-muted small" style={{ fontSize: '0.72rem' }}>
              SDS Voice Intelligence • Production-Oriented Technical Foundation
            </div>
          </div>
        </div>
      </div>

      {/* Recent Call Activity Section */}
      <div className="glass-panel p-4 mb-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="text-white fw-bold mb-0 d-flex align-items-center gap-2">
            <PhoneCall size={18} className="text-info" />
            <span>Recent Call Activity</span>
          </h5>
          <Link to="/calls" className="btn btn-sm btn-link text-info text-decoration-none d-flex align-items-center gap-1">
            <span>View All Calls</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {recentCallsLoading ? (
          <div className="p-3 text-center text-muted small">Loading call activity...</div>
        ) : recentCallsError ? (
          <div className="p-3 rounded-3 bg-dark border border-white border-opacity-10 text-muted small">
            Recent call log endpoint pending Phase 5 backend state machine integration. Real-time call tracking is currently unconfigured.
          </div>
        ) : recentCalls.length > 0 ? (
          <div className="list-group list-group-flush bg-transparent">
            {recentCalls.map((call) => (
              <div
                key={call.id}
                className="list-group-item bg-transparent text-white border-white border-opacity-10 px-0 d-flex justify-content-between align-items-center"
              >
                <div>
                  <div className="fw-bold">{call.callerNumber}</div>
                  <div className="text-muted small">{call.detectedIntent || 'Unclassified'}</div>
                </div>
                <StatusBadge type="call" value={call.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted small">
            No recent calls recorded. Inbound calls will appear here once telephony channels are bridged.
          </div>
        )}
      </div>
    </div>
  );
};
