import { useEffect, useState, useCallback } from 'react';
import {
  listCoordinatorsApi,
  createCoordinatorApi,
  updateCoordinatorApi,
  deleteCoordinatorApi,
} from '../../api/coordinators';
import { listDepartmentsApi } from '../../api/admin';
import { useAllowedEmailDomains, describeDomains, isAllowedEmail } from '../../utils/emailDomains';
import api from '../../api/axios';
import {
  PageHeader, Card, PrimaryButton, DangerButton, GhostButton,
  SearchInput, FormInput, FormSelect, Modal, Spinner, EmptyState, StatusBadge,
} from '../../components/ui/AdminUI';
import { useToast, ToastContainer } from '../../components/ui/Toast';
import { UserCheck, Plus, Edit2, Trash2, Shield, AlertTriangle, Building2, BookOpen } from 'lucide-react';

export default function CoordinatorsPage() {
  const allowedDomains = useAllowedEmailDomains();
  const [coordinators, setCoordinators] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { toasts, showToast, dismiss } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [coordRes, deptRes, progRes] = await Promise.all([
        listCoordinatorsApi(),
        listDepartmentsApi(),
        api.get('/programmes'),
      ]);
      setCoordinators(coordRes.data || []);
      setDepartments(deptRes.data || []);
      setProgrammes(progRes.data?.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load coordinator data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredCoordinators = coordinators.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.department?.name?.toLowerCase().includes(q) ||
      c.programme?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <PageHeader
        title="Programme Coordinators"
        subtitle={`Pre-register OBE Coordinators by ${describeDomains(allowedDomains)} email to grant Google sign-in access and assign academic programmes.`}
        action={
          <PrimaryButton onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4" />
            <span>Add Coordinator</span>
          </PrimaryButton>
        }
      />

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, email, school / centre..."
          />
          <div className="text-xs text-muted">
            Showing <strong className="text-ink">{filteredCoordinators.length}</strong> coordinator(s)
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : filteredCoordinators.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No coordinators registered"
            description={`Add your first programme coordinator with their ${describeDomains(allowedDomains)} email to enable Google sign-in.`}
            action={
              <PrimaryButton onClick={() => setCreateModalOpen(true)}>
                <Plus className="w-4 h-4" />
                <span>Add Coordinator</span>
              </PrimaryButton>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-paper text-xs uppercase tracking-wider text-muted">
                  <th className="py-3 px-4 font-semibold">Coordinator</th>
                  <th className="py-3 px-4 font-semibold">School / Centre</th>
                  <th className="py-3 px-4 font-semibold">Assigned Programme</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCoordinators.map((c) => (
                  <tr key={c._id} className="hover:bg-paper/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-ink flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{c.name}</span>
                      </div>
                      <div className="text-xs text-muted font-mono mt-0.5">{c.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-ink font-medium">
                        <Building2 className="w-3.5 h-3.5 text-muted" />
                        <span>{c.department?.name || c.department?.code || '—'}</span>
                      </div>
                      {c.department?.code && (
                        <div className="text-xs text-muted font-mono">{c.department.code}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-ink font-medium">
                        <BookOpen className="w-3.5 h-3.5 text-muted" />
                        <span>{c.programme?.name || '—'}</span>
                      </div>
                      {c.programme?.code && (
                        <span className="inline-block text-[11px] font-semibold px-2 py-0.5 bg-accent-soft text-accent rounded mt-0.5">
                          {c.programme.code}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge isActive={c.isActive} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <GhostButton onClick={() => setEditTarget(c)} title="Edit coordinator">
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </GhostButton>
                        <DangerButton onClick={() => setDeleteTarget(c)} title="Delete coordinator">
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </DangerButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      {createModalOpen && (
        <CoordinatorModal
          open={createModalOpen}
          departments={departments}
          programmes={programmes}
          coordinators={coordinators}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            loadData();
            setCreateModalOpen(false);
          }}
          showToast={showToast}
        />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <CoordinatorModal
          open={Boolean(editTarget)}
          initialData={editTarget}
          departments={departments}
          programmes={programmes}
          coordinators={coordinators}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            loadData();
            setEditTarget(null);
          }}
          showToast={showToast}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          open={Boolean(deleteTarget)}
          title="Remove Coordinator"
          onClose={() => setDeleteTarget(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-ink">
              Are you sure you want to remove <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) as coordinator?
            </p>
            <p className="text-xs text-muted">
              Their assigned programme will be unlinked, and they will no longer be able to manage curriculum or faculty invitations.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton onClick={() => setDeleteTarget(null)}>Cancel</GhostButton>
              <DangerButton
                onClick={async () => {
                  try {
                    await deleteCoordinatorApi(deleteTarget._id);
                    showToast('Coordinator removed successfully', 'success');
                    setDeleteTarget(null);
                    loadData();
                  } catch (err) {
                    showToast(err.response?.data?.message || 'Failed to remove coordinator', 'error');
                  }
                }}
              >
                Confirm Removal
              </DangerButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CoordinatorModal({
  open,
  initialData = null,
  departments,
  programmes,
  coordinators,
  onClose,
  onSuccess,
  showToast,
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [department, setDepartment] = useState(initialData?.department?._id || initialData?.department || '');
  const [programme, setProgramme] = useState(initialData?.programme?._id || initialData?.programme || '');
  const [isActive, setIsActive] = useState(initialData ? initialData.isActive : true);
  const [saving, setSaving] = useState(false);
  const [domainWarning, setDomainWarning] = useState('');

  const allowedDomains = useAllowedEmailDomains();

  // Validate domain on email change
  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed.includes('@') && !isAllowedEmail(trimmed, allowedDomains)) {
      setDomainWarning(`Not a ${describeDomains(allowedDomains)} address. Google sign-in will be refused for it.`);
    } else {
      setDomainWarning('');
    }
  }, [email, allowedDomains]);

  // Filter programmes by selected department
  const availableProgrammes = department
    ? programmes.filter((p) => String(p.department?._id || p.department) === String(department))
    : programmes;

  // Check if target programme is assigned to someone else
  const getProgrammeCoordinatorInfo = (progId) => {
    if (!progId) return null;
    const prog = programmes.find((p) => String(p._id) === String(progId));
    if (prog?.coordinator && String(prog.coordinator) !== String(initialData?._id)) {
      const assigned = coordinators.find((c) => String(c._id) === String(prog.coordinator));
      return assigned ? `${assigned.name} (${assigned.email})` : 'another coordinator';
    }
    return null;
  };

  const currentProgConflict = getProgrammeCoordinatorInfo(programme);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !department || !programme) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    if (currentProgConflict) {
      showToast(`Programme is already assigned to ${currentProgConflict}`, 'error');
      return;
    }

    setSaving(true);
    try {
      if (initialData) {
        const res = await updateCoordinatorApi(initialData._id, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          department,
          programme,
          isActive,
        });
        if (res.warning) showToast(res.warning, 'error');
        else showToast('Coordinator updated successfully', 'success');
      } else {
        const res = await createCoordinatorApi({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          department,
          programme,
        });
        if (res.warning) showToast(res.warning, 'error');
        else showToast('Coordinator created successfully', 'success');
      }
      onSuccess();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save coordinator', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={initialData ? 'Edit Coordinator' : 'Add Programme Coordinator'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Full Name *"
          id="coord-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Dr. Ramesh Sharma"
          required
        />

        <div>
          <FormInput
            label={`Email (${describeDomains(allowedDomains)}) *`}
            id="coord-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="coordinator@mitsgwalior.in"
            required
          />
          {domainWarning && (
            <div className="flex items-start gap-1.5 mt-1.5 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>{domainWarning}</span>
            </div>
          )}
        </div>

        <FormSelect
          label="School / Centre *"
          id="coord-dept"
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value);
            setProgramme('');
          }}
          required
        >
          <option value="">Select School / Centre...</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name} ({d.code})
            </option>
          ))}
        </FormSelect>

        <div>
          <FormSelect
            label="Assigned Programme *"
            id="coord-prog"
            value={programme}
            onChange={(e) => setProgramme(e.target.value)}
            required
            disabled={!department}
          >
            <option value="">{department ? 'Select Programme...' : 'Select School / Centre first'}</option>
            {availableProgrammes.map((p) => {
              const conflict = getProgrammeCoordinatorInfo(p._id);
              return (
                <option key={p._id} value={p._id} disabled={Boolean(conflict)}>
                  {p.name} ({p.code}){conflict ? ` — [Assigned to ${conflict}]` : ''}
                </option>
              );
            })}
          </FormSelect>
          {currentProgConflict && (
            <p className="mt-1 text-xs text-status-below">
              Programme is already assigned to {currentProgConflict}. Please select a different programme or reassign it first.
            </p>
          )}
        </div>

        {initialData && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="coord-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-border text-accent focus:ring-accent"
            />
            <label htmlFor="coord-active" className="text-sm font-medium text-ink cursor-pointer">
              Account Active (Coordinator can access platform)
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <GhostButton onClick={onClose} disabled={saving}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={saving || Boolean(currentProgConflict)}>
            {saving ? 'Saving...' : initialData ? 'Update Coordinator' : 'Add Coordinator'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
