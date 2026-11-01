import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  listCoursesApi, createCourseApi, updateCourseApi, deleteCourseApi,
  listProgrammesApi, listUsersApi,
} from '../../api/admin';
import {
  PageHeader, Card, PrimaryButton, DangerButton, GhostButton,
  SearchInput, FormInput, FormSelect, Modal, Spinner, EmptyState,
} from '../../components/ui/AdminUI';
import { useToast, ToastContainer } from '../../components/ui/Toast';
import { Plus, Trash2, Edit2, RefreshCw, BookOpen } from 'lucide-react';

function CourseModal({ open, course, programmes, facultyList, onClose, onSuccess, showToast }) {
  const isEdit = !!course;
  const [form, setForm] = useState({
    code: '', name: '', semester: 1, programme: '', faculty: '', academicYear: '2025-2026', credits: 3,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (course) {
      setForm({
        code: course.code,
        name: course.name,
        semester: course.semester,
        programme: course.programme?._id || '',
        faculty: course.faculty?._id || '',
        academicYear: course.academicYear,
        credits: course.credits,
      });
    } else {
      setForm({ code: '', name: '', semester: 1, programme: '', faculty: '', academicYear: '2025-2026', credits: 3 });
    }
  }, [course, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code || !form.name || !form.programme || !form.faculty || !form.academicYear) {
      showToast('All fields except credits are required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await updateCourseApi(course._id, form);
      else await createCourseApi(form);
      showToast(isEdit ? 'Course updated' : 'Course created', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Operation failed', 'error');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} title={isEdit ? 'Edit Course' : 'New Course'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="Course Code *" id="c-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CS301" />
          <FormInput label="Academic Year *" id="c-year" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2025-2026" />
        </div>
        <FormInput label="Course Name *" id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Data Structures & Algorithms" />
        <FormSelect label="Programme *" id="c-prog" value={form.programme} onChange={(e) => setForm({ ...form, programme: e.target.value })}>
          <option value="">— Select Programme —</option>
          {programmes.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.code})</option>)}
        </FormSelect>
        <FormSelect label="Faculty *" id="c-fac" value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })}>
          <option value="">— Select Faculty —</option>
          {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name} ({f.email})</option>)}
        </FormSelect>
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="Semester *" id="c-sem" type="number" min={1} max={12} value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })} />
          <FormInput label="Credits" id="c-cred" type="number" min={1} max={10} value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function CoursesPage() {
  const { user } = useAuth();
  const { toasts, showToast, dismiss } = useToast();

  const [courses, setCourses] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ open: false, course: null });

  const canEdit = user?.role === 'admin' || user?.role === 'coordinator';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, pRes, uRes] = await Promise.all([
        listCoursesApi(),
        listProgrammesApi().catch((e) => {
          console.warn('Could not load programmes list:', e);
          return { data: [] };
        }),
        listUsersApi({ role: 'faculty', limit: 100 }).catch((e) => {
          console.warn('Could not load faculty list:', e);
          return { data: { users: [] } };
        }),
      ]);
      setCourses(cRes.data || []);
      setProgrammes(pRes.data || []);
      setFacultyList(uRes.data?.users || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load courses', 'error');
    } finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (c) => {
    if (!confirm(`Delete course "${c.name}"?`)) return;
    try {
      await deleteCourseApi(c._id);
      showToast('Course deleted', 'success');
      fetchAll();
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'error'); }
  };

  const filtered = courses.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.academicYear || '').includes(search)
  );

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <PageHeader
        title={user?.role === 'faculty' ? 'My Courses' : 'Courses'}
        subtitle={`${courses.length} course${courses.length !== 1 ? 's' : ''}`}
        action={canEdit && (
          <div className="flex gap-2">
            <GhostButton onClick={fetchAll}><RefreshCw className="w-3.5 h-3.5" /></GhostButton>
            <PrimaryButton onClick={() => setModal({ open: true, course: null })}>
              <Plus className="w-4 h-4" /> New Course
            </PrimaryButton>
          </div>
        )}
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Search by name, code, year..." />

      <Card>
        {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState message="No courses found" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-paper/50">
                  <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3">Code</th>
                  <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3 hidden sm:table-cell">Faculty</th>
                  <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3 hidden md:table-cell">Sem</th>
                  <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3 hidden lg:table-cell">Year</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-paper/60 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-ink font-semibold bg-paper px-2 py-0.5 rounded border border-border inline-block">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                    <td className="px-4 py-3 text-muted hidden sm:table-cell">{c.faculty?.name || '—'}</td>
                    <td className="px-4 py-3 text-muted hidden md:table-cell">Sem {c.semester}</td>
                    <td className="px-4 py-3 text-muted hidden lg:table-cell">{c.academicYear}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 justify-end items-center">
                        <Link
                          to={`/courses/${c._id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-accent bg-accent-soft hover:bg-teal-100 border border-teal-200 transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Setup</span>
                        </Link>
                        {canEdit && (
                          <>
                            <GhostButton onClick={() => setModal({ open: true, course: c })}><Edit2 className="w-3 h-3" /></GhostButton>
                            <DangerButton onClick={() => handleDelete(c)}><Trash2 className="w-3 h-3" /></DangerButton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CourseModal
        open={modal.open}
        course={modal.course}
        programmes={programmes}
        facultyList={facultyList}
        onClose={() => setModal({ open: false, course: null })}
        onSuccess={fetchAll}
        showToast={showToast}
      />
    </div>
  );
}
