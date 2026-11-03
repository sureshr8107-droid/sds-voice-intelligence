import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { SearchFilterBar } from '../components/common/SearchFilterBar';
import { FeatureUnavailableBanner } from '../components/common/FeatureUnavailableBanner';
import { FormField } from '../components/common/FormField';
import { DepartmentService, CreateDepartmentPayload } from '../services/departmentService';
import { Department } from '@call-screening/shared';
import { NormalizedError } from '../services/apiClient';

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<NormalizedError | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [primaryExtension, setPrimaryExtension] = useState('');
  const [routingTimeout, setRoutingTimeout] = useState('20');

  const fetchDepartments = async () => {
    setLoading(true);
    const res = await DepartmentService.getDepartments();
    if (res.success && res.data) {
      setDepartments(res.data);
      setError(null);
    } else {
      setDepartments([]);
      setError(res.error || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalFeedback(null);

    if (!name.trim() || !code.trim()) {
      setModalFeedback('Department name and code are required.');
      return;
    }

    setModalSubmitting(true);
    const payload: CreateDepartmentPayload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      primaryExtension: primaryExtension.trim() || undefined,
      routingTimeoutSeconds: parseInt(routingTimeout, 10) || 20,
    };

    const res = await DepartmentService.createDepartment(payload);
    setModalSubmitting(false);

    if (res.success && res.data) {
      setDepartments([...departments, res.data]);
      setIsModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
    } else {
      // Endpoint is not yet implemented on backend
      setModalFeedback(
        `Backend Endpoint Pending: POST /api/v1/departments is scheduled for Phase 5. The creation request was sent but the backend returned ${
          res.error?.code || 'NOT_FOUND'
        }.`
      );
    }
  };

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: Column<Department>[] = [
    {
      key: 'name',
      header: 'Department',
      render: (dept) => (
        <div>
          <div className="text-white fw-bold">{dept.name}</div>
          {dept.description && <div className="text-muted small">{dept.description}</div>}
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Code',
      render: (dept) => (
        <span className="badge bg-dark border border-secondary text-info font-monospace small">
          {dept.code}
        </span>
      ),
    },
    {
      key: 'primaryExtension',
      header: 'Primary Extension',
      render: (dept) => (
        <span className="text-white small font-monospace">
          {dept.primaryExtension || '—'}
        </span>
      ),
    },
    {
      key: 'timeout',
      header: 'Routing Timeout',
      render: (dept) => (
        <span className="text-secondary small font-monospace">
          {dept.routingTimeoutSeconds}s
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (dept) =>
        dept.isActive ? (
          <span className="badge-healthy">
            <CheckCircle2 size={12} />
            <span>Active</span>
          </span>
        ) : (
          <span className="badge-not-configured">Inactive</span>
        ),
    },
  ];

  return (
    <div className="container-fluid px-0">
      <PageHeader
        title="Institutional Departments"
        subtitle="Manage department routing destinations, staff groupings, and timeout thresholds."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Departments' },
        ]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
              onClick={fetchDepartments}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-info text-dark fw-bold d-flex align-items-center gap-2"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={16} />
              <span>Add Department</span>
            </button>
          </div>
        }
      />

      {error && (
        <FeatureUnavailableBanner
          title="Departments CRUD API Pending"
          description="The department schema exists in Phase 3 Supabase migrations. The backend REST routes GET/POST /api/v1/departments are scheduled for Phase 5. The interface is ready to connect."
          plannedPhase="Phase 5 Backend State Machine"
          endpoint="GET /api/v1/departments"
        />
      )}

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search departments by name or code..."
      />

      <DataTable
        columns={columns}
        data={filteredDepartments}
        keyExtractor={(dept) => dept.id}
        isLoading={loading}
        emptyTitle="No Departments Found"
        emptyDescription="Institutional departments registered in the system will be displayed here for call routing."
      />

      {/* Add Department Modal */}
      {isModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-panel border border-white border-opacity-10 text-white">
              <div className="modal-header border-bottom border-white border-opacity-10">
                <h5 className="modal-title h6 fw-bold mb-0">Create New Department</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Close"
                />
              </div>

              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body py-3">
                  {modalFeedback && (
                    <div className="alert alert-warning small py-2 px-3 mb-3">
                      {modalFeedback}
                    </div>
                  )}

                  <FormField id="deptName" label="Department Name" required>
                    <input
                      id="deptName"
                      type="text"
                      className="form-control form-control-custom"
                      placeholder="e.g., Computer Science & Engineering"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </FormField>

                  <div className="row g-3">
                    <div className="col-6">
                      <FormField id="deptCode" label="Department Code" required>
                        <input
                          id="deptCode"
                          type="text"
                          className="form-control form-control-custom font-monospace"
                          placeholder="e.g., CSE"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          required
                        />
                      </FormField>
                    </div>
                    <div className="col-6">
                      <FormField id="primaryExt" label="Primary Extension">
                        <input
                          id="primaryExt"
                          type="text"
                          className="form-control form-control-custom font-monospace"
                          placeholder="e.g., 100"
                          value={primaryExtension}
                          onChange={(e) => setPrimaryExtension(e.target.value)}
                        />
                      </FormField>
                    </div>
                  </div>

                  <FormField id="deptDesc" label="Description / Scope">
                    <textarea
                      id="deptDesc"
                      rows={2}
                      className="form-control form-control-custom small"
                      placeholder="Purpose, queries handled, or office location"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </FormField>

                  <FormField id="routingTimeout" label="Routing Timeout (seconds)">
                    <input
                      id="routingTimeout"
                      type="number"
                      className="form-control form-control-custom"
                      value={routingTimeout}
                      onChange={(e) => setRoutingTimeout(e.target.value)}
                      min={5}
                      max={60}
                    />
                  </FormField>
                </div>

                <div className="modal-footer border-top border-white border-opacity-10">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-info text-dark fw-bold"
                    disabled={modalSubmitting}
                  >
                    {modalSubmitting ? 'Saving...' : 'Save Department'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
