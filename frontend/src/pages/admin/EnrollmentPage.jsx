import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  listCoursesApi, listEnrollmentsApi, enrollStudentApi, bulkEnrollApi,
  removeEnrollmentApi, listUsersApi,
} from '../../api/admin';
import {
  PageHeader, Card, PrimaryButton, DangerButton, GhostButton,
  FormSelect, FormInput, Modal, Spinner, EmptyState,
} from '../../components/ui/AdminUI';
import { useToast, ToastContainer } from '../../components/ui/Toast';
import { UserPlus, Users, Trash2, RefreshCw, List } from 'lucide-react';

export default function EnrollmentPage() {
  const { user } = useAuth();
  const { toasts, showToast, dismiss } = useToast();

  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrollModal, setEnrollModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);

  // Single enroll state
  const [singleStudentId, setSingleStudentId] = useState('');
  const [enrollSaving, setEnrollSaving] = useState(false);

  // Bulk enroll state
  const [bulkText, setBulkText] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const canEdit = user?.role === 'admin' || user?.role === 'coordinator';

  useEffect(() => {
    Promise.all([
      listCoursesApi(),
      listUsersApi({ role: 'student', limit: 500 }),
    ]).then(([cRes, uRes]) => {
      setCourses(cRes.data);
      setStudents(uRes.data.users);
    }).catch(() => showToast('Failed to load data', 'error'));
  }, []);

  const fetchEnrollments = useCallback(async (courseId) => {
    if (!courseId) { setEnrollments([]); return; }
    setLoading(true);
    try {
      const res = await listEnrollmentsApi(courseId);
      setEnrollments(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed', 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEnrollments(selectedCourse); }, [selectedCourse, fetchEnrollments]);

  const handleEnroll = async () => {
    if (!selectedCourse || !singleStudentId) { showToast('Select course and student', 'error'); return; }
    setEnrollSaving(true);
    try {
      await enrollStudentApi({ courseId: selectedCourse, studentId: singleStudentId });
      showToast('Student enrolled', 'success');
      fetchEnrollments(selectedCourse);
      setEnrollModal(false);
      setSingleStudentId('');
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setEnrollSaving(false); }
  };

  const handleBulkEnroll = async () => {
    const rolls = bulkText.split(/[\n,]/).map((r) => r.trim()).filter(Boolean);
    if (!selectedCourse || rolls.length === 0) { showToast('Select course and enter roll numbers', 'error'); return; }
    setBulkSaving(true);
    try {
      const res = await bulkEnrollApi({ courseId: selectedCourse, rollNumbers: rolls });
      setBulkResult(res.data);
      fetchEnrollments(selectedCourse);
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setBulkSaving(false); }
  };

  const handleRemove = async (e) => {
    if (!confirm('Remove this enrollment?')) return;
    try {
      await removeEnrollmentApi(e._id);
      showToast('Enrollment removed', 'success');
      fetchEnrollments(selectedCourse);
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'error'); }
  };

  const selectedCourseName = courses.find((c) => c._id === selectedCourse)?.name || '';
  const enrolledIds = new Set(enrollments.map((e) => e.student?._id));
  const availableStudents = students.filter((s) => !enrolledIds.has(s._id));

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <PageHeader
        title="Course Enrollments"
        subtitle="Enroll students into courses"
        action={canEdit && selectedCourse && (
          <div className="flex gap-2">
            <GhostButton onClick={() => setBulkModal(true)}><List className="w-3.5 h-3.5" /> Bulk Enroll</GhostButton>
            <PrimaryButton onClick={() => setEnrollModal(true)}><UserPlus className="w-4 h-4" /> Enroll Student</PrimaryButton>
          </div>
        )}
      />

      {/* Course Selector */}
      <Card className="p-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Select Course</label>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          <option value="">— Choose a course —</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>{c.code} — {c.name} ({c.academicYear})</option>
          ))}
        </select>
      </Card>

      {/* Enrollments Table */}
      {selectedCourse && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              {enrollments.length} student{enrollments.length !== 1 ? 's' : ''} enrolled in {selectedCourseName}
            </h3>
            <GhostButton onClick={() => fetchEnrollments(selectedCourse)}><RefreshCw className="w-3.5 h-3.5" /></GhostButton>
          </div>
          <Card>
            {loading ? <Spinner /> : enrollments.length === 0 ? <EmptyState message="No students enrolled yet" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase px-4 py-3">Student</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase px-4 py-3 hidden sm:table-cell">Email</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase px-4 py-3">Roll No</th>
                      {canEdit && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {enrollments.map((e) => (
                      <tr key={e._id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{e.student?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{e.student?.email || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-amber-400">{e.student?.rollNo || '—'}</td>
                        {canEdit && (
                          <td className="px-4 py-3">
                            <DangerButton onClick={() => handleRemove(e)}><Trash2 className="w-3 h-3" /></DangerButton>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Single Enroll Modal */}
      <Modal open={enrollModal} title="Enroll a Student" onClose={() => { setEnrollModal(false); setSingleStudentId(''); }}>
        <div className="space-y-4">
          <FormSelect label="Student" id="enroll-student" value={singleStudentId} onChange={(e) => setSingleStudentId(e.target.value)}>
            <option value="">— Select Student —</option>
            {availableStudents.map((s) => (
              <option key={s._id} value={s._id}>{s.name} {s.rollNo ? `(${s.rollNo})` : ''}</option>
            ))}
          </FormSelect>
          <div className="flex gap-3 justify-end pt-2">
            <GhostButton onClick={() => setEnrollModal(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={handleEnroll} disabled={enrollSaving || !singleStudentId}>
              {enrollSaving ? 'Enrolling...' : 'Enroll'}
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      {/* Bulk Enroll Modal */}
      <Modal open={bulkModal} title="Bulk Enroll by Roll Numbers" onClose={() => { setBulkModal(false); setBulkText(''); setBulkResult(null); }}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Roll Numbers (one per line or comma-separated)</label>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={6}
              placeholder="22IT001&#10;22IT002&#10;22IT003"
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
            />
          </div>
          {bulkResult && (
            <div className="text-xs space-y-1">
              <div className="text-emerald-400">✓ Enrolled: {bulkResult.enrolled?.length || 0}</div>
              <div className="text-amber-400">⏭ Skipped (already enrolled): {bulkResult.skipped?.length || 0}</div>
              <div className="text-red-400">✗ Errors (not found): {bulkResult.errors?.length || 0}</div>
              {bulkResult.errors?.length > 0 && (
                <div className="text-gray-500 mt-1">Not found: {bulkResult.errors.map((e) => e.rollNo).join(', ')}</div>
              )}
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <GhostButton onClick={() => { setBulkModal(false); setBulkText(''); setBulkResult(null); }}>Close</GhostButton>
            <PrimaryButton onClick={handleBulkEnroll} disabled={bulkSaving}>
              {bulkSaving ? 'Processing...' : 'Bulk Enroll'}
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
