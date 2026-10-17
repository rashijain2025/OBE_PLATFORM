import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  listDepartmentsApi, createDepartmentApi, updateDepartmentApi, deleteDepartmentApi,
  listProgrammesApi, createProgrammeApi, updateProgrammeApi, deleteProgrammeApi,
  listUsersApi,
} from '../../api/admin';
import {
  PageHeader, Card, PrimaryButton, DangerButton, GhostButton,
  SearchInput, FormInput, FormSelect, FormInput as FI, Modal, Spinner, EmptyState,
} from '../../components/ui/AdminUI';
import { useToast, ToastContainer } from '../../components/ui/Toast';
import { Plus, Trash2, Edit2, Building2, Award, RefreshCw } from 'lucide-react';

// ─── Department Form Modal ────────────────────────────────────────────────────
function DeptModal({ open, dept, coordinators, onClose, onSuccess, showToast }) {
  const isEdit = !!dept;
  const [form, setForm] = useState({ name: '', code: '', description: '', headOfDepartment: '' });
  const [saving, setSaving] = useState(false);

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
      showToast(isEdit ? 'Department updated' : 'Department created', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Operation failed', 'error');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} title={isEdit ? 'Edit Department' : 'New Department'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput label="Department Name *" id="dept-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dept. of Information Technology" />
        <FormInput label="Code *" id="dept-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="IT" />
        <FormInput label="Description" id="dept-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
        <FormSelect label="Head of Department" id="dept-hod" value={form.headOfDepartment} onChange={(e) => setForm({ ...form, headOfDepartment: e.target.value })}>
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
    if (!form.name.trim() || !form.code.trim() || !form.department) { showToast('Name, code and department are required', 'error'); return; }
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
        <FormSelect label="Department *" id="prog-dept" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
          <option value="">— Select Department —</option>
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptModal, setDeptModal] = useState({ open: false, dept: null });
  const [progModal, setProgModal] = useState({ open: false, prog: null });
  const [tab, setTab] = useState('departments');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, pRes, uRes] = await Promise.all([
        listDepartmentsApi().catch(() => ({ data: [] })),
        listProgrammesApi().catch(() => ({ data: [] })),
        listUsersApi({ role: 'coordinator', limit: 100 }).catch(() => ({ data: { users: [] } })),
      ]);
      setDepts(dRes.data || []);
      setProgs(pRes.data || []);
      setCoordinators(uRes.data?.users || []);
    } catch (err) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDeleteDept = async (d) => {
    if (!confirm(`Delete department "${d.name}"?`)) return;
    try {
      await deleteDepartmentApi(d._id);
      showToast('Department deleted', 'success');
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
        title="Departments & Programmes"
        subtitle={`${depts.length} departments · ${progs.length} programmes`}
        action={isAdmin && (
          <div className="flex gap-2">
            <GhostButton onClick={fetchAll}><RefreshCw className="w-3.5 h-3.5" /></GhostButton>
            {tab === 'departments'
              ? <PrimaryButton onClick={() => setDeptModal({ open: true, dept: null })}><Plus className="w-4 h-4" /> New Department</PrimaryButton>
              : <PrimaryButton onClick={() => setProgModal({ open: true, prog: null })}><Plus className="w-4 h-4" /> New Programme</PrimaryButton>
            }
          </div>
        )}
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800">
        {[{ id: 'departments', label: 'Departments', icon: Building2 }, { id: 'programmes', label: 'Programmes', icon: Award }].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
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
              {filteredDepts.length === 0 ? <EmptyState message="No departments found" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase px-4 py-3">Name</th>
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase px-4 py-3">Code</th>
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase px-4 py-3 hidden md:table-cell">Head</th>
                        {isAdmin && <th className="px-4 py-3" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {filteredDepts.map((d) => (
                        <tr key={d._id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-white">{d.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-indigo-400">{d.code}</td>
                          <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{d.headOfDepartment?.name || '—'}</td>
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
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase px-4 py-3">Name</th>
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase px-4 py-3">Code</th>
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase px-4 py-3 hidden md:table-cell">Department</th>
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase px-4 py-3 hidden lg:table-cell">Level</th>
                        {isAdmin && <th className="px-4 py-3" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {filteredProgs.map((p) => (
                        <tr key={p._id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-indigo-400">{p.code}</td>
                          <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{p.department?.name || '—'}</td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{p.level}</span>
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
