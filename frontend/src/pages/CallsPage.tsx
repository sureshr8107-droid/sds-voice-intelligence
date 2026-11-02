import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { SearchFilterBar, FilterConfig } from '../components/common/SearchFilterBar';
import { StatusBadge } from '../components/common/StatusBadge';
import { FeatureUnavailableBanner } from '../components/common/FeatureUnavailableBanner';
import { CallService, CallFilterParams } from '../services/callService';
import { CallRecord, CallStatus } from '@call-screening/shared';
import { NormalizedError } from '../services/apiClient';

export const CallsPage: React.FC = () => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<NormalizedError | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  const fetchCalls = async () => {
    setLoading(true);
    setError(null);

    const params: CallFilterParams = {
      page: currentPage,
      limit: 10,
      status: statusFilter === 'all' ? undefined : (statusFilter as CallStatus),
      search: searchQuery.trim() || undefined,
    };

    const res = await CallService.getCalls(params);
    if (res.success && res.data) {
      setCalls(res.data.calls);
      setTotalItems(res.data.total);
      setError(null);
    } else {
      setCalls([]);
      setTotalItems(0);
      setError(res.error || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCalls();
  }, [currentPage, statusFilter]);

  const filterConfigs: FilterConfig[] = [
    {
      id: 'status',
      label: 'Status',
      selectedValue: statusFilter,
      options: [
        { value: 'all', label: 'All Call States' },
        { value: 'completed', label: 'Completed' },
        { value: 'bridged', label: 'Bridged' },
        { value: 'awaiting_staff', label: 'Awaiting Staff' },
        { value: 'processing', label: 'Processing' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'timed_out', label: 'Timed Out' },
        { value: 'callback_requested', label: 'Callback Queued' },
      ],
    },
  ];

  const columns: Column<CallRecord>[] = [
    {
      key: 'caller',
      header: 'Caller Information',
      render: (call) => (
        <div>
          <div className="text-white fw-bold">{call.callerNumber}</div>
          {call.callerName && <div className="text-muted small">{call.callerName}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Call Status',
      render: (call) => <StatusBadge type="call" value={call.status} />,
    },
    {
      key: 'intent',
      header: 'AI Detected Intent',
      render: (call) =>
        call.detectedIntent ? (
          <span className="badge bg-dark border border-secondary text-info font-monospace small">
            {call.detectedIntent}
          </span>
        ) : (
          <span className="text-muted small fst-italic">Pending analysis</span>
        ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (call) => (
        <span className="text-secondary small font-monospace">
          {call.durationSeconds > 0 ? `${call.durationSeconds}s` : '0s'}
        </span>
      ),
    },
    {
      key: 'startedAt',
      header: 'Date & Time',
      render: (call) => (
        <span className="text-muted small">
          {new Date(call.startedAt).toLocaleString(undefined, {
            dateStyle: 'short',
            timeStyle: 'medium',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-end',
      render: (call) => (
        <Link
          to={`/calls/${call.id}`}
          className="btn btn-sm btn-outline-info d-inline-flex align-items-center gap-1"
          aria-label={`View details for call ${call.id}`}
        >
          <Eye size={13} />
          <span>Details</span>
        </Link>
      ),
    },
  ];

  return (
    <div className="container-fluid px-0">
      <PageHeader
        title="Call History & Screening Log"
        subtitle="Complete log of inbound calls screened by AI, intent classifications, and routing outcomes."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Calls' },
        ]}
        actions={
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            onClick={fetchCalls}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Feature Unavailable Notice when backend /calls is pending */}
      {error && (
        <FeatureUnavailableBanner
          title="Call History Backend Pending"
          description="Inbound call recording and live event logging will be populated by the Phase 5 backend finite state machine and Asterisk ARI integration in Phase 7. The table below represents the active production schema structure."
          plannedPhase="Phase 5 Backend State Machine"
          endpoint="GET /api/v1/calls"
        />
      )}

      {/* Search and Filters */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by phone number or intent..."
        filters={filterConfigs}
        onFilterChange={(_id, val) => {
          setStatusFilter(val);
          setCurrentPage(1);
        }}
        onResetFilters={() => {
          setSearchQuery('');
          setStatusFilter('all');
          setCurrentPage(1);
        }}
      />

      {/* Calls Table */}
      <DataTable
        columns={columns}
        data={calls}
        keyExtractor={(call) => call.id}
        isLoading={loading}
        emptyTitle="No Call Records Found"
        emptyDescription="When inbound phone calls are received and screened by the AI pipeline, their transcripts and routing decisions will appear here."
        currentPage={currentPage}
        pageSize={10}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};
