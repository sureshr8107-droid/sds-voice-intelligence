import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { SearchFilterBar } from '../components/common/SearchFilterBar';
import { FeatureUnavailableBanner } from '../components/common/FeatureUnavailableBanner';
import { RoutingRuleService } from '../services/routingRuleService';
import { RoutingRule } from '@call-screening/shared';
import { NormalizedError } from '../services/apiClient';

export const RoutingRulesPage: React.FC = () => {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<NormalizedError | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRules = async () => {
    setLoading(true);
    const res = await RoutingRuleService.getRoutingRules();
    if (res.success && res.data) {
      setRules(res.data);
      setError(null);
    } else {
      setRules([]);
      setError(res.error || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const filteredRules = rules.filter((rule) =>
    rule.intentKeyword.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: Column<RoutingRule>[] = [
    {
      key: 'intentKeyword',
      header: 'AI Intent Keyword / Trigger',
      render: (rule) => (
        <span className="badge bg-dark border border-secondary text-info font-monospace fs-6 px-2 py-1">
          {rule.intentKeyword}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Rule Priority',
      render: (rule) => (
        <span className="text-secondary small font-monospace">Priority {rule.priority}</span>
      ),
    },
    {
      key: 'fallbackDestinationType',
      header: 'Fallback Destination',
      render: (rule) => (
        <div className="small">
          <span className="text-white text-capitalize">{rule.fallbackDestinationType.replace('_', ' ')}</span>
          {rule.fallbackDestinationValue && (
            <span className="text-muted ms-1 font-monospace">({rule.fallbackDestinationValue})</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (rule) =>
        rule.isActive ? (
          <span className="badge-healthy">
            <CheckCircle2 size={12} />
            <span>Active</span>
          </span>
        ) : (
          <span className="badge-not-configured">Disabled</span>
        ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (rule) => (
        <span className="text-muted small">
          {new Date(rule.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="container-fluid px-0">
      <PageHeader
        title="AI Call Routing Rules"
        subtitle="Manage keyword-to-department classifiers and automated fallback destinations."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Routing Rules' },
        ]}
        actions={
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            onClick={fetchRules}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {error && (
        <FeatureUnavailableBanner
          title="Routing Rules Engine Pending"
          description="Routing tables and keyword classifiers are defined in Phase 3 database migrations. Backend execution logic and REST endpoints will be integrated during Phase 5 state machine development. Real telephony bridging takes place in Phase 7."
          plannedPhase="Phase 5 Backend State Machine"
          endpoint="GET /api/v1/routing-rules"
        />
      )}

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search rules by intent keyword or destination..."
      />

      <DataTable
        columns={columns}
        data={filteredRules}
        keyExtractor={(rule) => rule.id}
        isLoading={loading}
        emptyTitle="No Routing Rules Configured"
        emptyDescription="AI intent matching rules for automated caller routing will appear here."
      />
    </div>
  );
};
