import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { SearchFilterBar, FilterConfig } from '../components/common/SearchFilterBar';
import { FeatureUnavailableBanner } from '../components/common/FeatureUnavailableBanner';
import { CallbackService } from '../services/callbackService';
import { CallbackRequest } from '@call-screening/shared';
import { NormalizedError } from '../services/apiClient';

export const CallbacksPage: React.FC = () => {
  const [callbacks, setCallbacks] = useState<CallbackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<NormalizedError | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchCallbacks = async () => {
    setLoading(true);
    const res = await CallbackService.getCallbacks();
    if (res.success && res.data) {
      const items = Array.isArray(res.data) ? res.data : (res.data as any).callbacks || [];
      setCallbacks(items);
      setError(null);
    } else {
      setCallbacks([]);
      setError(res.error || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCallbacks();
  }, []);

  const filterConfigs: FilterConfig[] = [
    {
      id: 'status',
      label: 'Status',
      selectedValue: statusFilter,
      options: [
        { value: 'all', label: 'All Callback States' },
        { value: 'pending', label: 'Pending' },
        { value: 'assigned', label: 'Assigned' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
  ];

  const filteredCallbacks = callbacks.filter((cb) => {
    const matchesSearch =
      cb.callerNumber.includes(searchQuery) ||
      (cb.callerName && cb.callerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (cb.notes && cb.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || cb.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<CallbackRequest>[] = [
    {
      key: 'caller',
      header: 'Caller Information',
      render: (cb) => (
        <div>
          <div className="text-white fw-bold">{cb.callerNumber}</div>
          {cb.callerName && <div className="text-muted small">{cb.callerName}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Queue Status',
      render: (cb) => {
        if (cb.status === 'completed') {
          return (
            <span className="badge-status badge-status-completed">
              <CheckCircle2 size={12} />
              <span>Completed</span>
            </span>
          );
        }
        if (cb.status === 'in_progress') {
          return (
            <span className="badge-status badge-status-in-progress">
              <Clock size={12} />
              <span>In Progress</span>
            </span>
          );
        }
        return (
          <span className="badge-status badge-status-callback_requested">
            <Clock size={12} />
            <span>Pending</span>
          </span>
        );
      },
    },
    {
      key: 'preferredTime',
      header: 'Preferred Time',
      render: (cb) => (
        <span className="text-secondary small font-monospace">
          {cb.preferredCallbackTime || 'As soon as available'}
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'AI Summary / Notes',
      render: (cb) => (
        <span className="text-muted small text-truncate d-inline-block" style={{ maxWidth: '240px' }}>
          {cb.transcriptSummary || cb.notes || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Queued At',
      render: (cb) => (
        <span className="text-muted small">
          {new Date(cb.createdAt).toLocaleString(undefined, {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="container-fluid px-0">
      <PageHeader
        title="Callback Request Queue"
        subtitle="Manage callback requests generated when callers timeout or select voicemail/callback."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Callbacks' },
        ]}
        actions={
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            onClick={fetchCallbacks}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {error && (
        <FeatureUnavailableBanner
          title="Callback Queue API Pending"
          description="Callback records are defined in the Phase 3 schema. Live insertion occurs when a call times out or requests callback in Phase 5. Outbound calling will be integrated in Phase 7."
          plannedPhase="Phase 5 Backend & Phase 7 Telephony"
          endpoint="GET /api/v1/callbacks"
        />
      )}

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by phone number, caller name, or notes..."
        filters={filterConfigs}
        onFilterChange={(_id, val) => setStatusFilter(val)}
        onResetFilters={() => {
          setSearchQuery('');
          setStatusFilter('all');
        }}
      />

      <DataTable
        columns={columns}
        data={filteredCallbacks}
        keyExtractor={(cb) => cb.id}
        isLoading={loading}
        emptyTitle="No Callbacks Queued"
        emptyDescription="When screened callers request callbacks, their records will be queued here for staff follow-up."
      />
    </div>
  );
};
