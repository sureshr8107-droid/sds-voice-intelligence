import React, { useState } from 'react';
import { User, Shield, Bell, CheckCircle2, Lock } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { FormField } from '../components/common/FormField';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  // Preferences
  const [notificationSounds, setNotificationSounds] = useState(true);
  const [autoAwayTimeout, setAutoAwayTimeout] = useState('15');
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  return (
    <div className="container-fluid px-0">
      <PageHeader
        title="Settings & Account"
        subtitle="Manage user profile, role permissions, and local reception preferences."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Settings' },
        ]}
      />

      <div className="row g-4">
        {/* User Profile Card */}
        <div className="col-12 col-lg-6">
          <div className="glass-panel p-4 h-100">
            <h5 className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
              <User size={18} className="text-info" />
              <span>Institutional Identity & Role</span>
            </h5>

            {user ? (
              <div>
                <dl className="row small mb-4">
                  <dt className="col-sm-4 text-muted">Full Name</dt>
                  <dd className="col-sm-8 text-white fw-bold">{user.fullName}</dd>

                  <dt className="col-sm-4 text-muted">Email Address</dt>
                  <dd className="col-sm-8 text-secondary">{user.email}</dd>

                  <dt className="col-sm-4 text-muted">Assigned Role</dt>
                  <dd className="col-sm-8">
                    <StatusBadge type="role" value={user.role} />
                  </dd>

                  <dt className="col-sm-4 text-muted">User ID</dt>
                  <dd className="col-sm-8 text-secondary font-monospace small">
                    {user.id}
                  </dd>

                  {user.phoneNumber && (
                    <>
                      <dt className="col-sm-4 text-muted">Direct Phone</dt>
                      <dd className="col-sm-8 text-secondary">{user.phoneNumber}</dd>
                    </>
                  )}
                </dl>

                {/* Role Permissions Box */}
                <div className="p-3 rounded-3 bg-dark border border-white border-opacity-10">
                  <h6 className="text-white fw-bold small mb-2 d-flex align-items-center gap-1">
                    <Shield size={14} className="text-info" />
                    <span>Role Capabilities</span>
                  </h6>
                  <ul className="text-muted small ps-3 mb-0">
                    {user.role === 'admin' ? (
                      <>
                        <li>Full access to institutional dashboard and telemetry diagnostics</li>
                        <li>Manage departments, routing rules, and softphone extensions</li>
                        <li>Manage staff directories and access audit logs</li>
                        <li>Configure AI intent triggers and screening parameters</li>
                      </>
                    ) : (
                      <>
                        <li>Access Staff Call Reception Console with screening alerts</li>
                        <li>Toggle real-time availability and custom status messages</li>
                        <li>Review historical call recordings and caller intent tags</li>
                        <li>Process pending callback requests</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-muted small">No authenticated user session found.</div>
            )}
          </div>
        </div>

        {/* Local Console Preferences */}
        <div className="col-12 col-lg-6">
          <div className="glass-panel p-4 h-100">
            <h5 className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
              <Bell size={18} className="text-info" />
              <span>Console Audio & Preferences</span>
            </h5>

            <form onSubmit={handleSavePreferences}>
              {savedFeedback && (
                <div className="alert alert-success py-2 px-3 small d-flex align-items-center gap-2 mb-3">
                  <CheckCircle2 size={16} />
                  <span>Preferences updated successfully.</span>
                </div>
              )}

              <div className="form-check form-switch mb-3">
                <input
                  id="soundToggle"
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  checked={notificationSounds}
                  onChange={(e) => setNotificationSounds(e.target.checked)}
                />
                <label htmlFor="soundToggle" className="form-check-label text-white small">
                  Play audio chime on incoming call screening alert
                </label>
              </div>

              <FormField id="awayTimeout" label="Auto-Away Inactivity Timer (minutes)">
                <select
                  id="awayTimeout"
                  className="form-select form-select-custom"
                  value={autoAwayTimeout}
                  onChange={(e) => setAutoAwayTimeout(e.target.value)}
                >
                  <option value="5">5 Minutes</option>
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">60 Minutes</option>
                </select>
              </FormField>

              <button type="submit" className="btn btn-sm btn-info text-dark fw-bold mt-2">
                Save Preferences
              </button>
            </form>

            {/* Security Box */}
            <div className="mt-4 p-3 rounded-3 bg-dark border border-white border-opacity-10 text-muted small">
              <div className="d-flex align-items-center gap-1 text-white fw-bold small mb-1">
                <Lock size={14} className="text-info" />
                <span>Security Assurance</span>
              </div>
              <span>
                Authentication keys, Supabase service roles, and database secrets are strictly withheld from client-side bundles.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
