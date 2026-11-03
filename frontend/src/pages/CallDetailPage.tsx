import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  PhoneCall,
  Bot,
  FileText,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { FeatureUnavailableBanner } from '../components/common/FeatureUnavailableBanner';
import { CallService } from '../services/callService';
import { CallRecord } from '@call-screening/shared';
import { NormalizedError } from '../services/apiClient';

export const CallDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [call, setCall] = useState<CallRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<NormalizedError | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchCall = async () => {
      setLoading(true);
      const res = await CallService.getCallById(id);
      if (res.success && res.data) {
        setCall(res.data);
        setError(null);
      } else {
        setCall(null);
        setError(res.error || null);
      }
      setLoading(false);
    };
    fetchCall();
  }, [id]);

  return (
    <div className="container-fluid px-0">
      <PageHeader
        title={`Call Details: ${id || ''}`}
        subtitle="Full AI screening audit, intent analysis, and routing journey."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Calls', to: '/calls' },
          { label: id || 'Detail' },
        ]}
        actions={
          <Link to="/calls" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2">
            <ArrowLeft size={14} />
            <span>Back to Call History</span>
          </Link>
        }
      />

      {error && (
        <FeatureUnavailableBanner
          title="Call Record Endpoint Pending"
          description={`Call record '${id}' could not be retrieved from the backend API. Endpoint GET /api/v1/calls/:id is scheduled for Phase 5 implementation.`}
          plannedPhase="Phase 5 Backend State Machine"
          endpoint={`GET /api/v1/calls/${id}`}
        />
      )}

      {loading ? (
        <div className="glass-panel p-5 text-center">
          <div className="spinner-border text-info mb-2" role="status">
            <span className="visually-hidden">Loading call details...</span>
          </div>
          <div className="text-secondary small">Querying backend call service...</div>
        </div>
      ) : call ? (
        <div className="row g-4">
          {/* Metadata Card */}
          <div className="col-12 col-lg-6">
            <div className="glass-panel p-4 h-100">
              <h5 className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
                <PhoneCall size={18} className="text-info" />
                <span>Call Metadata</span>
              </h5>

              <dl className="row small mb-0">
                <dt className="col-sm-4 text-muted">Caller Number</dt>
                <dd className="col-sm-8 text-white fw-bold">{call.callerNumber}</dd>

                <dt className="col-sm-4 text-muted">Caller Name</dt>
                <dd className="col-sm-8 text-secondary">{call.callerName || 'Unknown / Unlisted'}</dd>

                <dt className="col-sm-4 text-muted">Current Status</dt>
                <dd className="col-sm-8">
                  <StatusBadge type="call" value={call.status} />
                </dd>

                <dt className="col-sm-4 text-muted">Screening Duration</dt>
                <dd className="col-sm-8 text-secondary font-monospace">
                  {call.durationSeconds} seconds
                </dd>

                <dt className="col-sm-4 text-muted">Started At</dt>
                <dd className="col-sm-8 text-secondary">
                  {new Date(call.startedAt).toLocaleString()}
                </dd>

                {call.endedAt && (
                  <>
                    <dt className="col-sm-4 text-muted">Ended At</dt>
                    <dd className="col-sm-8 text-secondary">
                      {new Date(call.endedAt).toLocaleString()}
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          {/* AI Screening Analysis */}
          <div className="col-12 col-lg-6">
            <div className="glass-panel p-4 h-100">
              <h5 className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
                <Bot size={18} className="text-info" />
                <span>AI Screening & Intent Classification</span>
              </h5>

              <div className="mb-3">
                <div className="text-muted small mb-1">Detected Intent</div>
                <div className="p-2 rounded bg-dark border border-white border-opacity-10 text-info fw-bold font-monospace">
                  {call.detectedIntent || 'None specified'}
                </div>
              </div>

              <div className="mb-3">
                <div className="text-muted small mb-1">Confidence Score</div>
                <div className="d-flex align-items-center gap-2">
                  <div className="progress flex-grow-1 bg-dark" style={{ height: '8px' }}>
                    <div
                      className="progress-bar bg-info"
                      role="progressbar"
                      style={{ width: `${(call.confidenceScore || 0) * 100}%` }}
                      aria-valuenow={(call.confidenceScore || 0) * 100}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  <span className="text-secondary small font-monospace">
                    {Math.round((call.confidenceScore || 0) * 100)}%
                  </span>
                </div>
              </div>

              <div>
                <div className="text-muted small mb-1">AI Transcript Summary</div>
                <p className="text-secondary small p-3 rounded bg-dark border border-white border-opacity-10 mb-0">
                  {call.aiSummary || 'AI conversation summary pending speech-to-text pipeline.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-5 text-center">
          <FileText size={48} className="text-muted mb-3" />
          <h5 className="text-white fw-bold">Call Record Awaiting Data</h5>
          <p className="text-secondary small mb-4" style={{ maxWidth: '480px', margin: '0 auto' }}>
            When Phase 5 backend finite state machine is connected, real call metadata, audio transcripts, and routing events will populate this view.
          </p>
          <Link to="/calls" className="btn btn-outline-info btn-sm">
            Return to Calls
          </Link>
        </div>
      )}
    </div>
  );
};
