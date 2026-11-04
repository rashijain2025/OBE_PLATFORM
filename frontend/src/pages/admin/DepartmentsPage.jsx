import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  listDepartmentsApi, createDepartmentApi, updateDepartmentApi, deleteDepartmentApi, getSchoolsCatalogApi,
  listProgrammesApi, createProgrammeApi, updateProgrammeApi, deleteProgrammeApi,
  listUsersApi,
} from '../../api/admin';
import {
  PageHeader, Card, PrimaryButton, DangerButton, GhostButton,
  SearchInput, FormInput, FormSelect, FormInput as FI, Modal, Spinner, EmptyState,
} from '../../components/ui/AdminUI';
import { useToast, ToastContainer } from '../../components/ui/Toast';
import { Plus, Trash2, Edit2, Building2, Award, RefreshCw, ChevronDown, Check } from 'lucide-react';

// ─── Add School / Centre: pick from the fixed list, added on click ───────────
function AddSchoolMenu({ catalog, onAdded, showToast }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !menuRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const remaining = catalog.filter((c) => !c.existingId).length;

  const add = async (entry) => {
    setAdding(entry.name);
    try {
      await createDepartmentApi({ name: entry.name, code: entry.code });
      showToast(`${entry.name} added`, 'success');
      onAdded();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not add', 'error');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <PrimaryButton onClick={() => setOpen((o) => !o)}>
        <Plus className="w-4 h-4" /> Add School / Centre <ChevronDown className="w-3.5 h-3.5" />
      </PrimaryButton>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto rounded-xl border border-border bg-surface shadow-2xl py-1"
        >
          <div className="px-3 py-2 text-[11px] text-muted border-b border-border">
            {remaining > 0 ? `Click to add · ${remaining} of ${catalog.length} not added yet` : 'All Schools / Centres have been added'}
          </div>
          {catalog.map((c) => {
            const added = Boolean(c.existingId);
            return (
              <button
                key={c.name}
                type="button"
                role="menuitem"
                disabled={added || adding !== null}
                onClick={() => add(c)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                  added ? 'opacity-40 cursor-default' : 'text-ink hover:bg-paper cursor-pointer'
                }`}
              >
                <span>{c.name}</span>
                {added ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-status-attained shrink-0">
                    <Check className="w-3.5 h-3.5" /> Added
                  </span>
                ) : adding === c.name ? (
                  <span className="text-[11px] text-muted shrink-0">Adding…</span>
                ) : (
                  <span className="text-[11px] font-mono text-muted shrink-0">{c.code}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Department Form Modal ────────────────────────────────────────────────────
function DeptModal({ open, dept, catalog, coordinators, onClose, onSuccess, showToast }) {
  const isEdit = !!dept;
  const [form, setForm] = useState({ name: '', code: '', description: '', headOfDepartment: '' });
  const [saving, setSaving] = useState(false);

  // Names come from the institute's fixed list; ones used by another record are shown but disabled
  const isTaken = (c) => c.existingId && c.existingId !== dept?._id;

  const pickName = (name) => {
    const entry = catalog.find((c) => c.name === name);
    setForm((prev) => ({ ...prev, name, code: entry ? entry.code : prev.code }));
  };

  useEffect(() => {
    if (dept) setForm({ name: dept.name, code: dept.code, description: dept.description || '', headOfDepartment: dept.headOfDepartment?._id || '' });
    else setForm({ name: '', code: '', description: '', headOfDepartment: '' });
  }, [dept, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { showToast('Name and code are required', 'error'); return; }
    setSaving(true);
    try {
      if (isEdit) await updateDepartmentApi(dept._id, form);
      else await createDepartmentApi(form);
      showToast(isEdit ? 'School / Centre updated' : 'School / Centre created', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Operation failed', 'error');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} title={isEdit ? 'Edit School / Centre' : 'New School / Centre'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSelect label="School / Centre *" id="dept-name" value={form.name} onChange={(e) => pickName(e.target.value)}>
          <option value="">— Select School / Centre —</option>
          {catalog.map((c) => (
            <option key={c.name} value={c.name} disabled={isTaken(c)}>
              {c.name}{isTaken(c) ? ' (already added)' : ''}
            </option>
          ))}
        </FormSelect>
        <FormInput label="Code *" id="dept-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="IT" />
        <FormInput label="Description" id="dept-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
        <FormSelect label="Head of School / Centre" id="dept-hod" value={form.headOfDepartment} onChange={(e) => setForm({ ...form, headOfDepartment: e.target.value })}>
          <option value="">— None —</option>
          {coordinators.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.email})</option>)}
        </FormSelect>
        <div className="flex gap-3 justify-end pt-2">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

// ─── Programme Form Modal ─────────────────────────────────────────────────────
function ProgModal({ open, prog, departments, onClose, onSuccess, showToast }) {
  const isEdit = !!prog;
  const [form, setForm] = useState({ name: '', code: '', department: '', durationYears: 4, level: 'UG' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prog) setForm({ name: prog.name, code: prog.code, department: prog.department?._id || '', durationYears: prog.durationYears, level: prog.level });
    else setForm({ name: '', code: '', department: '', durationYears: 4, level: 'UG' });
  }, [prog, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim() || !form.department) { showToast('Name, code and school / centre are required', 'error'); return; }
    setSaving(true);
    try {
      if (isEdit) await updateProgrammeApi(prog._id, form);
      else await createProgrammeApi(form);
      showToast(isEdit ? 'Programme updated' : 'Programme created', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Operation failed', 'error');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} title={isEdit ? 'Edit Programme' : 'New Programme'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput label="Programme Name *" id="prog-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="B.Tech Information Technology" />
        <FormInput label="Code *" id="prog-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="BTECH-IT" />
        <FormSelect label="School / Centre *" id="prog-dept" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
          <option value="">— Select School / Centre —</option>
          {departments.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
        </FormSelect>
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="Duration (years)" id="prog-dur" type="number" min={1} max={10} value={form.durationYears} onChange={(e) => setForm({ ...form, durationYears: Number(e.target.value) })} />
          <FormSelect label="Level" id="prog-level" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
            {['UG', 'PG', 'Diploma', 'PhD'].map((l) => <option key={l} value={l}>{l}</option>)}
          </FormSelect>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function DepartmentsPage() {
  const { user } = useAuth();
  const { toasts, showToast, dismiss } = useToast();

  const [depts, setDepts] = useState([]);
  const [progs, setProgs] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptModal, setDeptModal] = useState({ open: false, dept: null });
  const [progModal, setProgModal] = useState({ open: false, prog: null });
  const [tab, setTab] = useState('departments');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, pRes, uRes, cRes] = await Promise.all([
        listDepartmentsApi().catch(() => ({ data: [] })),
        listProgrammesApi().catch(() => ({ data: [] })),
        listUsersApi({ role: 'coordinator', limit: 100 }).catch(() => ({ data: { users: [] } })),
        getSchoolsCatalogApi().catch(() => ({ data: [] })),
      ]);
      setDepts(dRes.data || []);
      setProgs(pRes.data || []);
      setCoordinators(uRes.data?.users || []);
      setCatalog(cRes.data || []);
    } catch (err) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDeleteDept = async (d) => {
    if (!confirm(`Delete school / centre "${d.name}"?`)) return;
    try {
      await deleteDepartmentApi(d._id);
      showToast('School / Centre deleted', 'success');
      fetchAll();
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'error'); }
  };

  const handleDeleteProg = async (p) => {
    if (!confirm(`Delete programme "${p.name}"?`)) return;
    try {
      await deleteProgrammeApi(p._id);
      showToast('Programme deleted', 'success');
      fetchAll();
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'error'); }
  };

  const filteredDepts = depts.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase())
  );
  const filteredProgs = progs.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())
  );

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <PageHeader
        title="Schools / Centres & Programmes"
        subtitle={`${depts.length} schools / centres · ${progs.length} programmes`}
        action={isAdmin && (
          <div className="flex gap-2">
            <GhostButton onClick={fetchAll}><RefreshCw className="w-3.5 h-3.5" /></GhostButton>
            {tab === 'departments'
              ? <AddSchoolMenu catalog={catalog} onAdded={fetchAll} showToast={showToast} />
              : <PrimaryButton onClick={() => setProgModal({ open: true, prog: null })}><Plus className="w-4 h-4" /> New Programme</PrimaryButton>
            }
          </div>
        )}
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[{ id: 'departments', label: 'Schools / Centres', icon: Building2 }, { id: 'programmes', label: 'Programmes', icon: Award }].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${tab === id ? 'border-ink text-ink font-semibold' : 'border-transparent text-muted hover:text-ink'}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />

      {loading ? <Spinner /> : (
        <>
          {/* Departments Table */}
          {tab === 'departments' && (
            <Card>
              {filteredDepts.length === 0 ? <EmptyState message="No schools / centres found" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-paper/50">
                        <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3">Name</th>
                        <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3">Code</th>
                        <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3 hidden md:table-cell">Head</th>
                        {isAdmin && <th className="px-4 py-3" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredDepts.map((d) => (
                        <tr key={d._id} className="hover:bg-paper/60 transition-colors">
                          <td className="px-4 py-3 font-medium text-ink">{d.name}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-ink font-semibold bg-paper px-2 py-0.5 rounded border border-border inline-block">
                              {d.code}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted hidden md:table-cell">{d.headOfDepartment?.name || '—'}</td>
                          {isAdmin && (
                            <td className="px-4 py-3">
                              <div className="flex gap-1.5 justify-end">
                                <GhostButton onClick={() => setDeptModal({ open: true, dept: d })}><Edit2 className="w-3 h-3" /></GhostButton>
                                <DangerButton onClick={() => handleDeleteDept(d)}><Trash2 className="w-3 h-3" /></DangerButton>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* Programmes Table */}
          {tab === 'programmes' && (
            <Card>
              {filteredProgs.length === 0 ? <EmptyState message="No programmes found" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-paper/50">
                        <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3">Name</th>
                        <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3">Code</th>
                        <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3 hidden md:table-cell">School / Centre</th>
                        <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3 hidden lg:table-cell">Level</th>
                        {isAdmin && <th className="px-4 py-3" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredProgs.map((p) => (
                        <tr key={p._id} className="hover:bg-paper/60 transition-colors">
                          <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-ink font-semibold bg-paper px-2 py-0.5 rounded border border-border inline-block">
                              {p.code}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted hidden md:table-cell">{p.department?.name || '—'}</td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-teal-200 font-medium">{p.level}</span>
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3">
                              <div className="flex gap-1.5 justify-end">
                                <GhostButton onClick={() => setProgModal({ open: true, prog: p })}><Edit2 className="w-3 h-3" /></GhostButton>
                                <DangerButton onClick={() => handleDeleteProg(p)}><Trash2 className="w-3 h-3" /></DangerButton>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      <DeptModal
        open={deptModal.open}
        dept={deptModal.dept}
        catalog={catalog}
        coordinators={coordinators}
        onClose={() => setDeptModal({ open: false, dept: null })}
        onSuccess={fetchAll}
        showToast={showToast}
      />

      <ProgModal
        open={progModal.open}
        prog={progModal.prog}
        departments={depts}
        onClose={() => setProgModal({ open: false, prog: null })}
        onSuccess={fetchAll}
        showToast={showToast}
      />
    </div>
  );
}
