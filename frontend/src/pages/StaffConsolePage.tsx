import React, { useState } from 'react';
import {
  UserCheck,
  Radio,
  PhoneCall,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { FeatureUnavailableBanner } from '../components/common/FeatureUnavailableBanner';
import { AvailabilityStatus } from '@call-screening/shared';
import { useAuth } from '../context/AuthContext';

export const StaffConsolePage: React.FC = () => {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<AvailabilityStatus>('available');
  const [statusMessage, setStatusMessage] = useState<string>('');

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

      {/* Strict Phase 4 Notice: Telephony & Live Events */}
      <FeatureUnavailableBanner
        title="Telephony Bridge & Live Event Push Not Connected"
        description="Real-time WebSocket / Socket.IO event push is scheduled for Phase 5. Softphone bridging (MicroSIP/Linphone via Asterisk ARI) will be activated in Phase 7. Live incoming call popups and automated 20s countdown timers are safely disabled until these phases."
        plannedPhase="Phase 5 Socket.IO & Phase 7 Asterisk ARI"
        variant="warning"
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
                <div className="mt-2">
                  <StatusBadge type="role" value={user.role} />
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
                onChange={(e) => setAvailability(e.target.value as AvailabilityStatus)}
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
              />
            </div>

            <div className="p-3 rounded-3 bg-dark border border-white border-opacity-10">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small">Status Indicator:</span>
                <StatusBadge type="availability" value={availability} />
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <span className="text-muted small">Softphone PBX:</span>
                <span className="text-warning small fst-italic">Asterisk Unlinked (Phase 7)</span>
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
                  0 Active Calls
                </span>
              </div>

              {/* Empty state representing honest operational reality */}
              <div className="text-center py-5 my-3 rounded-3 bg-dark bg-opacity-50 border border-white border-opacity-10">
                <div className="d-inline-flex p-3 rounded-circle bg-secondary bg-opacity-10 text-muted mb-3">
                  <Radio size={36} />
                </div>
                <h6 className="text-white fw-bold mb-1">Telephony Gateway Standby</h6>
                <p className="text-muted small mx-auto mb-3" style={{ maxWidth: '420px' }}>
                  The reception console is listening. When an inbound caller is screened by the local AI pipeline and routed to your extension, live alerts with a 20-second accept/reject countdown will appear here.
                </p>
                <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-dark border border-secondary text-secondary small">
                  <span className="spinner-grow spinner-grow-sm text-info" role="status" aria-hidden="true" />
                  <span>Awaiting Phase 5 Socket.IO Connection</span>
                </div>
              </div>
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
