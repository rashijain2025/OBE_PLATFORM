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

const CREDIT_OPTIONS = [1, 2, 3, 4];

// UG (B.Tech) runs 8 semesters, PG (M.Tech) 4; other levels follow their duration
function semesterCount(programme) {
  if (!programme) return 0;
  if (programme.level === 'UG') return 8;
  if (programme.level === 'PG') return 4;
  return Math.max(1, (programme.durationYears || 4) * 2);
}

const EMPTY_COURSE = { programme: '', faculty: '', name: '', code: '', credits: '', semester: '', academicYear: '2025-2026' };

function CourseModal({ open, course, programmes, facultyList, onClose, onSuccess, showToast }) {
  const isEdit = !!course;
  const [form, setForm] = useState(EMPTY_COURSE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (course) {
      setForm({
        programme: course.programme?._id || '',
        faculty: course.faculty?._id || '',
        name: course.name,
        code: course.code,
        credits: course.credits ?? '',
        semester: course.semester ?? '',
        academicYear: course.academicYear,
      });
    } else {
      setForm(EMPTY_COURSE);
    }
  }, [course, open]);

  const selectedProgramme = programmes.find((p) => p._id === form.programme);
  const maxSemester = semesterCount(selectedProgramme);

  // A semester that does not exist in the newly chosen programme is cleared
  const pickProgramme = (programmeId) => {
    const max = semesterCount(programmes.find((p) => p._id === programmeId));
    setForm((prev) => ({ ...prev, programme: programmeId, semester: Number(prev.semester) <= max ? prev.semester : '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.programme || !form.faculty || !form.name || !form.code || !form.credits || !form.semester || !form.academicYear) {
      showToast('Please fill in every field', 'error');
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
        <FormSelect label="Programme *" id="c-prog" value={form.programme} onChange={(e) => pickProgramme(e.target.value)}>
          <option value="">— Select Programme —</option>
          {programmes.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.code})</option>)}
        </FormSelect>
        <FormSelect label="Faculty *" id="c-fac" value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })}>
          <option value="">— Select Faculty —</option>
          {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name} ({f.email})</option>)}
        </FormSelect>
        <FormInput label="Course Name *" id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Data Structures & Algorithms" />
        <FormInput label="Course Code *" id="c-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CS301" />
        <div className="grid grid-cols-2 gap-3">
          <FormSelect label="Credits *" id="c-cred" value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) || '' })}>
            <option value="">— Select —</option>
            {CREDIT_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </FormSelect>
          <FormSelect
            label="Semester *"
            id="c-sem"
            value={form.semester}
            onChange={(e) => setForm({ ...form, semester: Number(e.target.value) || '' })}
            disabled={!selectedProgramme}
          >
            <option value="">{selectedProgramme ? '— Select —' : 'Choose programme first'}</option>
            {Array.from({ length: maxSemester }, (_, i) => i + 1).map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </FormSelect>
        </div>
        <FormInput label="Academic Year *" id="c-year" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2025-2026" />
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
  // Faculty only see their own courses, so the faculty column would just repeat their name
  const showFacultyColumn = user?.role !== 'faculty';

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
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={user?.role === 'faculty' ? 'No courses assigned yet' : 'No courses found'}
            description={
              user?.role === 'faculty'
                ? 'Your coordinator has not assigned a course yet.'
                : 'No course records found matching your filters.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-paper/50">
                  <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3">Code</th>
                  <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3">Name</th>
                  {showFacultyColumn && (
                    <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3 hidden sm:table-cell">Faculty</th>
                  )}
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
                    {showFacultyColumn && (
                      <td className="px-4 py-3 text-muted hidden sm:table-cell">{c.faculty?.name || '—'}</td>
                    )}
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
