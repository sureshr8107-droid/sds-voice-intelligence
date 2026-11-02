import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { SearchFilterBar } from '../components/common/SearchFilterBar';
import { StatusBadge } from '../components/common/StatusBadge';
import { FeatureUnavailableBanner } from '../components/common/FeatureUnavailableBanner';
import { StaffService } from '../services/staffService';
import { StaffSummary } from '@call-screening/shared';
import { NormalizedError } from '../services/apiClient';

export const StaffPage: React.FC = () => {
  const [staff, setStaff] = useState<StaffSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<NormalizedError | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStaff = async () => {
    setLoading(true);
    const res = await StaffService.getStaffMembers();
    if (res.success && res.data) {
      setStaff(res.data);
      setError(null);
    } else {
      setStaff([]);
      setError(res.error || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const filteredStaff = staff.filter(
    (member) =>
      member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.departmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.extension.includes(searchQuery)
  );

  const columns: Column<StaffSummary>[] = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (m) => (
        <div>
          <div className="text-white fw-bold">{m.fullName}</div>
          <div className="text-muted small">{m.email}</div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (m) => <span className="text-secondary small">{m.departmentName}</span>,
    },
    {
      key: 'extension',
      header: 'Assigned Extension',
      render: (m) => (
        <span className="badge bg-dark border border-secondary text-info font-monospace small">
          Ext {m.extension}
        </span>
      ),
    },
    {
      key: 'availability',
      header: 'Availability',
      render: (m) => (
        <StatusBadge
          type="availability"
          value={m.isAvailable ? 'available' : 'offline'}
        />
      ),
    },
    {
      key: 'priority',
      header: 'Routing Priority',
      render: (m) => (
        <span className="text-secondary small font-monospace">Priority {m.priorityOrder}</span>
      ),
    },
  ];

  return (
    <div className="container-fluid px-0">
      <PageHeader
        title="Staff & Availability Directory"
        subtitle="View institutional faculty and staff extensions, departments, and real-time availability."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Staff' },
        ]}
        actions={
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            onClick={fetchStaff}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {error && (
        <FeatureUnavailableBanner
          title="Staff Directory API Pending"
          description="Staff profiles and extensions are structured in Phase 3 Supabase migrations. The backend endpoint GET /api/v1/staff is scheduled for Phase 5 implementation."
          plannedPhase="Phase 5 Backend State Machine"
          endpoint="GET /api/v1/staff"
        />
      )}

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search staff by name, email, department, or extension..."
      />

      <DataTable
        columns={columns}
        data={filteredStaff}
        keyExtractor={(m) => m.id}
        isLoading={loading}
        emptyTitle="No Staff Records Found"
        emptyDescription="Institutional staff members and their associated softphone extensions will be listed here."
      />
    </div>
  );
};
