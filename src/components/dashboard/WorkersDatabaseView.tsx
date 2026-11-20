import React, { useMemo, useState } from 'react';
import { Lock, Pencil, Plus, Search, Trash2, Unlock, X } from 'lucide-react';
import type {
  StoreDepartment,
  WorkerFormInput,
  WorkerRecord,
  WorkerStatus,
} from '../../types/vision';
import { filterWorkers, formatTimestamp, validateWorkerInput } from '../../utils/analytics';

interface WorkersDatabaseViewProps {
  workers: WorkerRecord[];
  loading: boolean;
  error: string | null;
  onAddWorker: (input: WorkerFormInput) => Promise<void>;
  onUpdateWorker: (id: string, input: WorkerFormInput) => Promise<void>;
  onDeleteWorker: (id: string) => Promise<void>;
}

const DEPARTMENTS: StoreDepartment[] = [
  'Floor Operations',
  'Checkout & Service',
  'Inventory & Backroom',
  'Store Management',
];

const EMPTY_FORM: WorkerFormInput = {
  name: '',
  role: '',
  department: 'Floor Operations',
  badgeCode: '',
  uniformCue: '',
  status: 'active',
};

export const WorkersDatabaseView: React.FC<WorkersDatabaseViewProps> = ({
  workers,
  loading,
  error,
  onAddWorker,
  onUpdateWorker,
  onDeleteWorker,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [managerUnlocked, setManagerUnlocked] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [formState, setFormState] = useState<WorkerFormInput>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof WorkerFormInput, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterWorkers(workers, searchQuery, departmentFilter),
    [workers, searchQuery, departmentFilter],
  );

  const openCreateModal = () => {
    setEditingWorkerId(null);
    setFormState(EMPTY_FORM);
    setFieldErrors({});
    setSubmitError(null);
    setModalOpen(true);
  };

  const openEditModal = (worker: WorkerRecord) => {
    setEditingWorkerId(worker.id);
    setFormState({
      name: worker.name,
      role: worker.role,
      department: worker.department,
      badgeCode: worker.badgeCode,
      uniformCue: worker.uniformCue,
      status: worker.status,
    });
    setFieldErrors({});
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateWorkerInput(formState);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editingWorkerId) {
        await onUpdateWorker(editingWorkerId, formState);
      } else {
        await onAddWorker(formState);
      }
      setModalOpen(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to save employee record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
            Database — Workers
          </h1>
          <p className="text-sm text-[#8B8B98] mt-1">
            Authorised registered employees only. Customer data and raw facial embeddings are never
            stored or displayed here.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setManagerUnlocked((v) => !v);
              setConfirmDeleteId(null);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              managerUnlocked
                ? 'border-[#5146C8] bg-[#5146C8]/15 text-white'
                : 'border-white/15 bg-[#15151C] text-[#E9E9EF] hover:border-white/35'
            }`}
          >
            {managerUnlocked ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-[#A69FF4]" aria-hidden="true" />
                <span>Manager Controls Unlocked</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-[#8B8B98]" aria-hidden="true" />
                <span>Unlock Manager Access</span>
              </>
            )}
          </button>

          {managerUnlocked && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#5146C8] text-white rounded-md hover:bg-[#4339B4] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Register Worker</span>
            </button>
          )}
        </div>
      </div>

      {/* Access Control Notice */}
      {!managerUnlocked && (
        <div className="p-4 rounded-md bg-[#15151C] border border-white/10 text-xs text-[#8B8B98] flex items-center justify-between gap-4">
          <span>
            Worker records are currently in restricted read-only view. Unlock Manager Access to
            register, edit, or remove authorised employees.
          </span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-4 rounded-md border border-white/20 bg-[#15151C] text-sm text-white"
        >
          {error}
        </div>
      )}

      {/* Search & Department Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="w-4 h-4 text-[#8B8B98] absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by worker name, badge ID, or uniform cue..."
            aria-label="Search registered workers"
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#15151C] border border-white/15 rounded-md text-white placeholder:text-[#8B8B98] focus:outline-none focus:border-[#5146C8]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="dept-filter" className="text-xs text-[#8B8B98] whitespace-nowrap">
            Department
          </label>
          <select
            id="dept-filter"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-[#15151C] border border-white/15 rounded-md text-white focus:outline-none focus:border-[#5146C8]"
          >
            <option value="ALL">All Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-[#15151C] border border-white/10 rounded-md" />
          ))}
        </div>
      ) : workers.length === 0 ? (
        <div className="border border-white/12 bg-[#15151C] rounded-lg p-10 text-center">
          <h2 className="font-display font-semibold text-lg text-white mb-2">
            No registered workers in directory
          </h2>
          <p className="text-sm text-[#8B8B98] mb-5">
            Unlock manager access to register authorised store employees.
          </p>
        </div>
      ) : (
        <div className="rounded-md bg-[#15151C] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[#8B8B98]">
                  <th className="py-3 px-4 font-medium">Badge ID</th>
                  <th className="py-3 px-4 font-medium">Registered Worker</th>
                  <th className="py-3 px-4 font-medium">Department</th>
                  <th className="py-3 px-4 font-medium">Permitted Visual / Uniform Cue</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Enrolled</th>
                  {managerUnlocked && (
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {filtered.map((worker) => (
                  <tr key={worker.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-mono-tabular text-[#A69FF4] whitespace-nowrap">
                      {worker.badgeCode}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-white">{worker.name}</div>
                      <div className="text-[11px] text-[#8B8B98]">{worker.role}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#E9E9EF] whitespace-nowrap">
                      {worker.department}
                    </td>
                    <td className="py-3.5 px-4 text-[#8B8B98] max-w-xs">{worker.uniformCue}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-xs font-medium ${
                          worker.status === 'active' ? 'text-white' : 'text-[#8B8B98]'
                        }`}
                      >
                        {worker.status === 'active' ? 'Active Shift' : 'Off Shift'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono-tabular text-[#8B8B98] whitespace-nowrap">
                      {formatTimestamp(worker.enrolledAt)}
                    </td>
                    {managerUnlocked && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {confirmDeleteId === worker.id ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                await onDeleteWorker(worker.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-[#5146C8] text-white rounded cursor-pointer"
                            >
                              Confirm Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-[11px] text-[#8B8B98] hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(worker)}
                              aria-label={`Edit ${worker.name}`}
                              className="p-1.5 text-[#8B8B98] hover:text-white rounded border border-transparent hover:border-white/15 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(worker.id)}
                              aria-label={`Delete ${worker.name}`}
                              className="p-1.5 text-[#8B8B98] hover:text-white rounded border border-transparent hover:border-white/15 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={managerUnlocked ? 7 : 6}
                      className="py-8 text-center text-[#8B8B98]"
                    >
                      No registered workers match your search or department filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Worker Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="worker-modal-title"
          className="fixed inset-0 z-50 bg-[#09090D]/80 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg bg-[#15151C] border border-white/15 rounded-lg p-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <h2 id="worker-modal-title" className="font-display font-semibold text-lg text-white">
                {editingWorkerId ? 'Edit Registered Worker' : 'Register Authorised Worker'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="p-1 text-[#8B8B98] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="worker-name" className="block text-xs text-[#E9E9EF] mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="worker-name"
                    type="text"
                    value={formState.name}
                    onChange={(e) => {
                      setFormState((s) => ({ ...s, name: e.target.value }));
                      setFieldErrors((f) => ({ ...f, name: undefined }));
                    }}
                    placeholder="e.g. Kavya Sharma"
                    className="w-full px-3 py-2 text-xs bg-[#09090D] border border-white/15 rounded-md text-white focus:outline-none focus:border-[#5146C8]"
                  />
                  {fieldErrors.name && (
                    <p className="text-[11px] text-[#A69FF4] mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="worker-badge" className="block text-xs text-[#E9E9EF] mb-1.5">
                    Badge ID
                  </label>
                  <input
                    id="worker-badge"
                    type="text"
                    value={formState.badgeCode}
                    onChange={(e) => {
                      setFormState((s) => ({ ...s, badgeCode: e.target.value }));
                      setFieldErrors((f) => ({ ...f, badgeCode: undefined }));
                    }}
                    placeholder="e.g. PM-108"
                    className="w-full px-3 py-2 text-xs bg-[#09090D] border border-white/15 rounded-md text-white font-mono-tabular focus:outline-none focus:border-[#5146C8]"
                  />
                  {fieldErrors.badgeCode && (
                    <p className="text-[11px] text-[#A69FF4] mt-1">{fieldErrors.badgeCode}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="worker-role" className="block text-xs text-[#E9E9EF] mb-1.5">
                    Role
                  </label>
                  <input
                    id="worker-role"
                    type="text"
                    value={formState.role}
                    onChange={(e) => {
                      setFormState((s) => ({ ...s, role: e.target.value }));
                      setFieldErrors((f) => ({ ...f, role: undefined }));
                    }}
                    placeholder="e.g. Floor Associate"
                    className="w-full px-3 py-2 text-xs bg-[#09090D] border border-white/15 rounded-md text-white focus:outline-none focus:border-[#5146C8]"
                  />
                  {fieldErrors.role && (
                    <p className="text-[11px] text-[#A69FF4] mt-1">{fieldErrors.role}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="worker-dept" className="block text-xs text-[#E9E9EF] mb-1.5">
                    Department
                  </label>
                  <select
                    id="worker-dept"
                    value={formState.department}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        department: e.target.value as StoreDepartment,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs bg-[#09090D] border border-white/15 rounded-md text-white focus:outline-none focus:border-[#5146C8]"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="worker-cue" className="block text-xs text-[#E9E9EF] mb-1.5">
                  Permitted Visual / Uniform Cue
                </label>
                <input
                  id="worker-cue"
                  type="text"
                  value={formState.uniformCue}
                  onChange={(e) => {
                    setFormState((s) => ({ ...s, uniformCue: e.target.value }));
                    setFieldErrors((f) => ({ ...f, uniformCue: undefined }));
                  }}
                  placeholder="e.g. Dark navy uniform blazer with lapel ID badge"
                  className="w-full px-3 py-2 text-xs bg-[#09090D] border border-white/15 rounded-md text-white focus:outline-none focus:border-[#5146C8]"
                />
                {fieldErrors.uniformCue && (
                  <p className="text-[11px] text-[#A69FF4] mt-1">{fieldErrors.uniformCue}</p>
                )}
              </div>

              <div>
                <label htmlFor="worker-status" className="block text-xs text-[#E9E9EF] mb-1.5">
                  Shift Status
                </label>
                <select
                  id="worker-status"
                  value={formState.status}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, status: e.target.value as WorkerStatus }))
                  }
                  className="w-full px-3 py-2 text-xs bg-[#09090D] border border-white/15 rounded-md text-white focus:outline-none focus:border-[#5146C8]"
                >
                  <option value="active">Active Shift</option>
                  <option value="off_shift">Off Shift</option>
                </select>
              </div>

              {submitError && (
                <p role="alert" className="text-xs text-[#A69FF4]">
                  {submitError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-white/15 text-[#E9E9EF] rounded-md hover:border-white/35 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-[#5146C8] text-white rounded-md hover:bg-[#4339B4] disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingWorkerId ? 'Save Changes' : 'Register Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
