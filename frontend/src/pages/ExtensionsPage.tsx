import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { SearchFilterBar } from '../components/common/SearchFilterBar';
import { FeatureUnavailableBanner } from '../components/common/FeatureUnavailableBanner';
import { StaffService } from '../services/staffService';
import { StaffExtension } from '@call-screening/shared';
import { NormalizedError } from '../services/apiClient';

export const ExtensionsPage: React.FC = () => {
  const [extensions, setExtensions] = useState<StaffExtension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<NormalizedError | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchExtensions = async () => {
    setLoading(true);
    const res = await StaffService.getStaffExtensions();
    if (res.success && res.data) {
      setExtensions(res.data);
      setError(null);
    } else {
      setExtensions([]);
      setError(res.error || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExtensions();
  }, []);

  const filteredExtensions = extensions.filter(
    (ext) =>
      ext.extension.includes(searchQuery) ||
      ext.sipUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: Column<StaffExtension>[] = [
    {
      key: 'extension',
      header: 'Extension',
      render: (ext) => (
        <span className="badge bg-dark border border-secondary text-info font-monospace fs-6 px-2 py-1">
          {ext.extension}
        </span>
      ),
    },
    {
      key: 'sipUsername',
      header: 'SIP Username',
      render: (ext) => (
        <span className="text-white small font-monospace">{ext.sipUsername}</span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority Rank',
      render: (ext) => (
        <span className="text-secondary small font-monospace">Rank {ext.priorityOrder}</span>
      ),
    },
    {
      key: 'status',
      header: 'PBX Registration Status',
      render: (ext) =>
        ext.isActive ? (
          <span className="badge-healthy">
            <CheckCircle2 size={12} />
            <span>Active / Ready</span>
          </span>
        ) : (
          <span className="badge-not-configured">Disabled</span>
        ),
    },
  ];

  return (
    <div className="container-fluid px-0">
      <PageHeader
        title="SIP Extensions Configuration"
        subtitle="Configure PJSIP extensions, softphone credentials, and softphone call routing priority."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Extensions' },
        ]}
        actions={
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            onClick={fetchExtensions}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {error && (
        <FeatureUnavailableBanner
          title="SIP Extensions API Pending"
          description="Extensions map directly to Asterisk PJSIP endpoints. Backend REST endpoint GET /api/v1/extensions is scheduled for Phase 5, and real Asterisk ARI registration status will connect in Phase 7."
          plannedPhase="Phase 5 Backend & Phase 7 Asterisk ARI"
          endpoint="GET /api/v1/extensions"
        />
      )}

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by extension number or SIP username..."
      />

      <DataTable
        columns={columns}
        data={filteredExtensions}
        keyExtractor={(ext) => ext.id}
        isLoading={loading}
        emptyTitle="No Extensions Registered"
        emptyDescription="Softphone extensions configured for staff softphones will appear here."
      />
    </div>
  );
};
