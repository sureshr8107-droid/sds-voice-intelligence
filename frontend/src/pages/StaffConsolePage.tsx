import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Radio,
  PhoneCall,
  Wifi,
  WifiOff,
  Check,
  PhoneForwarded,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { AvailabilityStatus, CallRecord } from '@call-screening/shared';
import { useAuth } from '../context/AuthContext';
import { StaffService } from '../services/staffService';
import { CallService } from '../services/callService';
import { socketService } from '../services/socketService';

export const StaffConsolePage: React.FC = () => {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<AvailabilityStatus>('available');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [staffExtId, setStaffExtId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [incomingCalls, setIncomingCalls] = useState<CallRecord[]>([]);

  // Find staff extension ID for current user
  useEffect(() => {
    const fetchStaffExt = async () => {
      const res = await StaffService.getStaffExtensions();
      if (res.success && res.data && user) {
        const myExt = res.data.find((e) => e.profileId === user.id);
        if (myExt) {
          setStaffExtId(myExt.id);
          const detailRes = await StaffService.getStaffById(myExt.id);
          if (detailRes.success && detailRes.data?.availability) {
            setAvailability(detailRes.data.availability.status);
            setStatusMessage(detailRes.data.availability.customStatusMessage || '');
          }
        }
      }
    };
    fetchStaffExt();
  }, [user]);

  // Socket.IO real-time event listener
  useEffect(() => {
    const checkConn = () => setSocketConnected(socketService.isConnected());
    checkConn();
    const interval = setInterval(checkConn, 2000);

    const unsubCallCreated = socketService.onCallCreated((call) => {
      if (call.status === 'awaiting_staff') {
        setIncomingCalls((prev) => [call, ...prev.filter((c) => c.id !== call.id)]);
      }
    });

    const unsubCallStatus = socketService.onCallStatusChanged((evt) => {
      if (evt.currentStatus !== 'awaiting_staff') {
        setIncomingCalls((prev) => prev.filter((c) => c.id !== evt.callId));
      }
    });

    return () => {
      clearInterval(interval);
      unsubCallCreated();
      unsubCallStatus();
    };
  }, []);

  const handleAvailabilityChange = async (newStatus: AvailabilityStatus) => {
    setAvailability(newStatus);
    if (!staffExtId) return;

    setIsSaving(true);
    setSaveSuccess(false);
    const res = await StaffService.updateAvailability(staffExtId, newStatus, statusMessage);
    setIsSaving(false);
    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const handleStatusMessageBlur = async () => {
    if (!staffExtId) return;
    setIsSaving(true);
    await StaffService.updateAvailability(staffExtId, availability, statusMessage);
    setIsSaving(false);
  };

  const handleAcceptCall = async (callId: string) => {
    await CallService.updateCallStatus(callId, {
      status: 'bridged',
      assignedStaffId: staffExtId || undefined,
      reason: 'Staff accepted call via reception console',
    });
    setIncomingCalls((prev) => prev.filter((c) => c.id !== callId));
  };

  const handleRejectCall = async (callId: string) => {
    await CallService.updateCallStatus(callId, {
      status: 'rejected',
      reason: 'Staff rejected incoming call alert',
    });
    setIncomingCalls((prev) => prev.filter((c) => c.id !== callId));
  };

  return (
    <div className="container-fluid px-0">
      <PageHeader
        title="Staff Call Reception Console"
        subtitle="Dedicated receptionist and operator dispatch console for screened call notifications."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Staff Console' },
        ]}
        badge={
          <span className="badge bg-info bg-opacity-25 text-info border border-info border-opacity-25 px-2 py-1 rounded-pill">
            Receptionist View
          </span>
        }
      />

      <div className="row g-4">
        {/* Availability Control Card */}
        <div className="col-12 col-lg-4">
          <div className="glass-panel p-4 h-100">
            <h5 className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
              <UserCheck size={18} className="text-info" />
              <span>Operator Status & Availability</span>
            </h5>

            {user && (
              <div className="mb-3 p-3 rounded-3 bg-dark border border-white border-opacity-10">
                <div className="text-white fw-bold small">{user.fullName}</div>
                <div className="text-muted small">{user.email}</div>
                <div className="mt-2 d-flex align-items-center justify-content-between">
                  <StatusBadge type="role" value={user.role} />
                  {saveSuccess && (
                    <span className="badge bg-success bg-opacity-25 text-success small d-flex align-items-center gap-1">
                      <Check size={12} /> Saved
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="availSelect" className="form-label text-white small fw-medium">
                Current Status Toggle
              </label>
              <select
                id="availSelect"
                className="form-select form-select-custom"
                value={availability}
                disabled={isSaving}
                onChange={(e) => handleAvailabilityChange(e.target.value as AvailabilityStatus)}
              >
                <option value="available">Available (Accepting Screened Calls)</option>
                <option value="busy">Busy (Do Not Route)</option>
                <option value="away">Away / Stepped Out</option>
                <option value="do_not_disturb">Do Not Disturb</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="statusMsg" className="form-label text-white small fw-medium">
                Custom Status Message
              </label>
              <input
                id="statusMsg"
                type="text"
                className="form-control form-control-custom"
                placeholder="e.g., In meeting until 3:00 PM"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                onBlur={handleStatusMessageBlur}
              />
            </div>

            <div className="p-3 rounded-3 bg-dark border border-white border-opacity-10">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small">Status Indicator:</span>
                <StatusBadge type="availability" value={availability} />
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <span className="text-muted small">Socket.IO Push:</span>
                <span className={`small d-flex align-items-center gap-1 ${socketConnected ? 'text-success' : 'text-warning'}`}>
                  {socketConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                  <span>{socketConnected ? 'Connected (Live)' : 'Standby / Polling'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Call Screening Queue */}
        <div className="col-12 col-lg-8">
          <div className="glass-panel p-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="text-white fw-bold mb-0 d-flex align-items-center gap-2">
                  <PhoneCall size={18} className="text-info" />
                  <span>Incoming Screened Call Queue</span>
                </h5>
                <span className="badge bg-secondary bg-opacity-25 text-secondary">
                  {incomingCalls.length} Active Calls
                </span>
              </div>

              {incomingCalls.length > 0 ? (
                <div className="d-flex flex-column gap-3 mb-4">
                  {incomingCalls.map((call) => (
                    <div
                      key={call.id}
                      className="p-3 rounded-3 bg-dark border border-info border-opacity-50 shadow-sm d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3"
                    >
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="text-white fw-bold font-monospace">{call.callerNumber}</span>
                          {call.callerName && <span className="text-muted small">({call.callerName})</span>}
                          <span className="badge bg-info bg-opacity-25 text-info small">
                            {call.detectedIntent || 'Inbound'}
                          </span>
                        </div>
                        {call.aiSummary && <p className="text-secondary small mb-0">{call.aiSummary}</p>}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-success d-flex align-items-center gap-1"
                          onClick={() => handleAcceptCall(call.id)}
                        >
                          <PhoneCall size={14} /> Accept
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                          onClick={() => handleRejectCall(call.id)}
                        >
                          <PhoneForwarded size={14} /> Send to Voicemail
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5 my-3 rounded-3 bg-dark bg-opacity-50 border border-white border-opacity-10">
                  <div className="d-inline-flex p-3 rounded-circle bg-secondary bg-opacity-10 text-muted mb-3">
                    <Radio size={36} />
                  </div>
                  <h6 className="text-white fw-bold mb-1">Reception Console Ready</h6>
                  <p className="text-muted small mx-auto mb-3" style={{ maxWidth: '420px' }}>
                    The reception console is active and listening for live Socket.IO screening events. When incoming calls are screened by AI and routed to your extension, they will appear here in real time.
                  </p>
                  <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-dark border border-secondary text-secondary small">
                    <span className="spinner-grow spinner-grow-sm text-info" role="status" aria-hidden="true" />
                    <span>Socket.IO Listener Active</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 rounded-3 bg-dark border border-white border-opacity-10 text-muted small d-flex flex-column flex-sm-row justify-content-between gap-2">
              <span>PBX Target: PJSIP/101 (MicroSIP / Linphone)</span>
              <span>Audio Channel: Local 16-bit 16kHz PCM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
