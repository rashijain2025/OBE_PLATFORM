import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  listUsersApi,
  updateUserApi,
  resetPasswordApi,
  deactivateUserApi,
  deleteUserApi,
  listDepartmentsApi,
  bulkImportStudentsApi,
} from '../../api/admin';
import { registerUserApi } from '../../api/auth';
import {
  PageHeader, Card, PrimaryButton, DangerButton, GhostButton,
  SearchInput, FormInput, FormSelect, Modal, Spinner, EmptyState, RoleBadge, StatusBadge,
} from '../../components/ui/AdminUI';
import { useToast, ToastContainer } from '../../components/ui/Toast';
import { UserPlus, RefreshCw, KeyRound, UserX, Trash2, Edit2, Upload, Users, GraduationCap, ShieldCheck } from 'lucide-react';

const SYSTEM_ROLES = ['admin', 'coordinator', 'faculty'];

function RegisterSystemUserModal({ open, departments, onClose, onSuccess, showToast }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'faculty', department: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await registerUserApi({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        department: form.department || null,
      });
      showToast('System user created successfully', 'success');
      onSuccess();
      onClose();
      setForm({ name: '', email: '', password: '', role: 'faculty', department: '' });
      setErrors({});
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create user', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Register System User" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput label="Full Name *" id="sys-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. John Smith" error={errors.name} />
        <FormInput label="Email Address *" id="sys-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@obe.edu" error={errors.email} />
        <FormInput label="Password *" id="sys-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" error={errors.password} />
        <FormSelect label="System Role *" id="sys-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {SYSTEM_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </FormSelect>
        <FormSelect label="Department" id="sys-dept" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
          <option value="">No Department Assigned</option>
          {departments.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
        </FormSelect>
        <div className="flex gap-3 justify-end pt-2">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Registering...' : 'Create System User'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function AddStudentRecordModal({ open, departments, onClose, onSuccess, showToast }) {
  const [form, setForm] = useState({ name: '', rollNo: '', email: '', department: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.rollNo.trim()) e.rollNo = 'Roll number is required';
    return e;
  };

  const handleRollChange = (val) => {
    const trimmed = val.trim();
    setForm((prev) => ({
      ...prev,
      rollNo: val,
      email: prev.email ? prev.email : (trimmed ? `${trimmed.toLowerCase()}@student.obe.edu` : ''),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const email = form.email.trim() || `${form.rollNo.trim().toLowerCase()}@student.obe.edu`;
      await registerUserApi({
        name: form.name.trim(),
        rollNo: form.rollNo.trim(),
        email,
        role: 'student',
        department: form.department || null,
      });
      showToast('Student record created successfully', 'success');
      onSuccess();
      onClose();
      setForm({ name: '', rollNo: '', email: '', department: '' });
      setErrors({});
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create student record', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Add Student Record" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-xs">
          <strong>Notice:</strong> Students are stored as academic data records for enrollment, marks, and CO attainment. Student accounts cannot log in to the platform.
        </div>
        <FormInput label="Full Name *" id="stu-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Aarav Patel" error={errors.name} />
        <FormInput label="Roll Number *" id="stu-rollno" value={form.rollNo} onChange={(e) => handleRollChange(e.target.value)} placeholder="22IT001" error={errors.rollNo} />
        <FormInput label="Email (Optional / Auto-generated)" id="stu-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="22it001@student.obe.edu" error={errors.email} />
        <FormSelect label="Department" id="stu-dept" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
          <option value="">No Department Assigned</option>
          {departments.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
        </FormSelect>
        <div className="flex gap-3 justify-end pt-2">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Add Student Record'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function EditStudentRecordModal({ open, student, departments, onClose, onSuccess, showToast }) {
  const [form, setForm] = useState({ name: '', rollNo: '', email: '', department: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setForm({
        name: student.name || '',
        rollNo: student.rollNo || '',
        email: student.email || '',
        department: student.department?._id || student.department || '',
      });
    }
  }, [student]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('Name is required', 'error'); return; }
    if (!form.rollNo.trim()) { showToast('Roll Number is required', 'error'); return; }
    setSaving(true);
    try {
      await updateUserApi(student._id, {
        name: form.name.trim(),
        rollNo: form.rollNo.trim(),
        email: form.email.trim(),
        department: form.department || null,
      });
      showToast('Student record updated successfully', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update student', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={`Edit Student Record — ${student?.rollNo || student?.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput label="Full Name *" id="edit-stu-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <FormInput label="Roll Number *" id="edit-stu-rollno" value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} />
        <FormInput label="Email *" id="edit-stu-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <FormSelect label="Department" id="edit-stu-dept" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
          <option value="">No Department Assigned</option>
          {departments.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
        </FormSelect>
        <div className="flex gap-3 justify-end pt-2">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Updating...' : 'Save Changes'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function BulkImportStudentsModal({ open, departments, onClose, onSuccess, showToast }) {
  const [departmentId, setDepartmentId] = useState('');
  const [rawText, setRawText] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rawText.trim()) { showToast('Please enter at least one roll number', 'error'); return; }

    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const records = [];

    for (const line of lines) {
      // Support comma or tab separated: RollNo, Name, Email
      const parts = line.split(/[,\t]+/).map((p) => p.trim());
      if (parts.length >= 2) {
        records.push({
          rollNo: parts[0],
          name: parts[1],
          email: parts[2] || undefined,
        });
      } else {
        records.push(parts[0]);
      }
    }

    setSaving(true);
    setResult(null);
    try {
      const res = await bulkImportStudentsApi({
        rollNumbers: records,
        departmentId: departmentId || undefined,
      });
      setResult(res.data);
      showToast(res.message || 'Import completed', 'success');
      onSuccess();
    } catch (err) {
      showToast(err.response?.data?.message || 'Import failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setRawText('');
    setResult(null);
    onClose();
  };

  return (
    <Modal open={open} title="Bulk Import Student Records by Roll Number" onClose={handleReset}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-xs text-gray-400">
          Enter roll numbers one per line. Optionally format as <code className="text-indigo-400">RollNo, Full Name, Email</code>.
        </div>
        <FormSelect label="Target Department (Default)" id="bulk-stu-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">Select Department (Optional)</option>
          {departments.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
        </FormSelect>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Roll Numbers / CSV Data *
          </label>
          <textarea
            rows={6}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`22IT011\n22IT012, Pooja Patel, pooja@student.obe.edu\n22IT013`}
            className="w-full rounded-lg bg-gray-950 border border-gray-800 p-3 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {result && (
          <div className="p-3 bg-gray-800/80 rounded-lg text-xs space-y-1">
            <div className="font-semibold text-white">Import Summary:</div>
            <div className="text-emerald-400">✓ {result.createdCount} student records created</div>
            {result.skippedCount > 0 && (
              <div className="text-amber-400">⚠ {result.skippedCount} skipped (already registered)</div>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <GhostButton onClick={handleReset}>Close</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Importing...' : 'Import Records'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ open, user, onClose, showToast }) {
  const [pwd, setPwd] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pwd.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    setSaving(true);
    try {
      await resetPasswordApi(user._id, pwd);
      showToast(`Password reset for ${user.name}`, 'success');
      onClose();
      setPwd('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Reset failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={`Reset password — ${user?.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput label="New Password" id="reset-pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Min 6 characters" />
        <div className="flex gap-3 justify-end pt-2">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving...' : 'Reset Password'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { toasts, showToast, dismiss } = useToast();

  const [activeTab, setActiveTab] = useState('system'); // 'system' | 'students'
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals state
  const [showRegisterSystem, setShowRegisterSystem] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showBulkStudents, setShowBulkStudents] = useState(false);
  const [editStudentTarget, setEditStudentTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, dRes] = await Promise.all([
        listUsersApi({ limit: 500 }),
        listDepartmentsApi(),
      ]);
      setUsers(uRes.data.users);
      setDepartments(dRes.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load user records', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDeactivate = async (u) => {
    if (!confirm(`Deactivate ${u.name}?`)) return;
    try {
      await deactivateUserApi(u._id);
      showToast(`${u.name} deactivated`, 'success');
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Permanently delete ${u.name}? This cannot be undone.`)) return;
    try {
      await deleteUserApi(u._id);
      showToast(`${u.name} deleted`, 'success');
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed', 'error');
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="text-center py-16 text-red-400">
        Access denied. Admin only.
      </div>
    );
  }

  // Filter lists based on tab
  const systemUsers = users.filter((u) => u.role !== 'student');
  const studentRecords = users.filter((u) => u.role === 'student');

  const filteredSystemUsers = systemUsers.filter((u) => {
    const matchRole = !roleFilter || u.role === roleFilter;
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.department?.name || '').toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const filteredStudentRecords = studentRecords.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.rollNo || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.department?.name || '').toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <PageHeader
        title="User & Student Directory"
        subtitle={`${systemUsers.length} System Users · ${studentRecords.length} Student Records`}
        action={
          <div className="flex gap-2">
            <GhostButton onClick={fetchUsers}><RefreshCw className="w-3.5 h-3.5" /> Refresh</GhostButton>
            {activeTab === 'system' ? (
              <PrimaryButton onClick={() => setShowRegisterSystem(true)}>
                <UserPlus className="w-4 h-4" /> Register System User
              </PrimaryButton>
            ) : (
              <div className="flex gap-2">
                <GhostButton onClick={() => setShowBulkStudents(true)}>
                  <Upload className="w-4 h-4" /> Bulk Import Roll Numbers
                </GhostButton>
                <PrimaryButton onClick={() => setShowAddStudent(true)}>
                  <UserPlus className="w-4 h-4" /> Add Student Record
                </PrimaryButton>
              </div>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-800 space-x-1">
        <button
          onClick={() => { setActiveTab('system'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'system'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>System Users ({systemUsers.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('students'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'students'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Student Records ({studentRecords.length})</span>
        </button>
      </div>

      {/* SYSTEM USERS TAB */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search system user name, email, department..." />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="">All System Roles</option>
              {SYSTEM_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <Card>
            {loading ? <Spinner /> : filteredSystemUsers.length === 0 ? <EmptyState message="No system users found" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Name</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Email</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Role</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Department</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Status</th>
                      <th className="px-4 py-3 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {filteredSystemUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{u.name}</td>
                        <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{u.email}</td>
                        <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                        <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                          {u.department?.name ? `${u.department.name} (${u.department.code})` : '—'}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell"><StatusBadge active={u.isActive} /></td>
                        <td className="px-4 py-3">
                          {currentUser._id !== u._id && (
                            <div className="flex items-center gap-1.5 justify-end">
                              <GhostButton title="Reset Password" onClick={() => setResetTarget(u)}>
                                <KeyRound className="w-3 h-3" />
                              </GhostButton>
                              {u.isActive && (
                                <GhostButton title="Deactivate User" onClick={() => handleDeactivate(u)}>
                                  <UserX className="w-3 h-3" />
                                </GhostButton>
                              )}
                              <DangerButton title="Delete User" onClick={() => handleDelete(u)}>
                                <Trash2 className="w-3 h-3" />
                              </DangerButton>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* STUDENT RECORDS TAB */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-800 bg-gray-900/60">
            <div>
              <h3 className="text-sm font-semibold text-white">Student Academic Records</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Students are recorded as data entities for enrollments, marks entry, and CO attainment. Student accounts do not have platform login permissions.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search roll no, student name, email..." />
          </div>

          <Card>
            {loading ? <Spinner /> : filteredStudentRecords.length === 0 ? <EmptyState message="No student records found" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Roll No</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Name</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Email</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Department</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Status</th>
                      <th className="px-4 py-3 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {filteredStudentRecords.map((s) => (
                      <tr key={s._id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-amber-400 text-xs font-semibold">{s.rollNo || '—'}</td>
                        <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                        <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{s.email}</td>
                        <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                          {s.department?.name ? `${s.department.name} (${s.department.code})` : '—'}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell"><StatusBadge active={s.isActive} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 justify-end">
                            <GhostButton title="Edit Student Record" onClick={() => setEditStudentTarget(s)}>
                              <Edit2 className="w-3 h-3" />
                            </GhostButton>
                            <DangerButton title="Delete Student Record" onClick={() => handleDelete(s)}>
                              <Trash2 className="w-3 h-3" />
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
        </div>
      )}

      {/* Modals */}
      <RegisterSystemUserModal
        open={showRegisterSystem}
        departments={departments}
        onClose={() => setShowRegisterSystem(false)}
        onSuccess={fetchUsers}
        showToast={showToast}
      />

      <AddStudentRecordModal
        open={showAddStudent}
        departments={departments}
        onClose={() => setShowAddStudent(false)}
        onSuccess={fetchUsers}
        showToast={showToast}
      />

      <EditStudentRecordModal
        open={!!editStudentTarget}
        student={editStudentTarget}
        departments={departments}
        onClose={() => setEditStudentTarget(null)}
        onSuccess={fetchUsers}
        showToast={showToast}
      />

      <BulkImportStudentsModal
        open={showBulkStudents}
        departments={departments}
        onClose={() => setShowBulkStudents(false)}
        onSuccess={fetchUsers}
        showToast={showToast}
      />

      <ResetPasswordModal
        open={!!resetTarget}
        user={resetTarget}
        onClose={() => setResetTarget(null)}
        showToast={showToast}
      />
    </div>
  );
}
