import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getCourseDetailsApi,
  createCOApi, updateCOApi, deleteCOApi,
  createAssessmentApi, updateAssessmentApi, deleteAssessmentApi,
  createQuestionApi, updateQuestionApi, deleteQuestionApi,
  listCourseEnrollmentsApi, enrollCourseStudentApi, bulkEnrollCourseStudentsApi, removeCourseEnrollmentApi,
} from '../../api/faculty';
import { listUsersApi } from '../../api/admin';
import {
  Card, PrimaryButton, DangerButton, GhostButton,
  FormInput, FormSelect, Modal, Spinner, EmptyState,
} from '../../components/ui/AdminUI';
import { useToast, ToastContainer } from '../../components/ui/Toast';
import MarksGridModal from '../../components/marks/MarksGridModal';
import {
  ArrowLeft, Award, CheckSquare, Plus, Edit2, Trash2,
  AlertTriangle, Users, CheckCircle2, ChevronRight, FileSpreadsheet, UserPlus, GraduationCap
} from 'lucide-react';

const BLOOM_LEVELS = [
  'L1: Remember',
  'L2: Understand',
  'L3: Apply',
  'L4: Analyze',
  'L5: Evaluate',
  'L6: Create',
];

const ASSESSMENT_TYPES = [
  { value: 'internal', label: 'Internal Exam (CIE)' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'lab', label: 'Lab Test' },
  { value: 'end_sem', label: 'End Semester Exam (SEE)' },
];

export default function CourseDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toasts, showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('cos'); // 'cos' | 'assessments' | 'students'

  // Enrollment state
  const [enrollments, setEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [allStudents, setAllStudents] = useState([]);

  // Modals state
  const [coModal, setCoModal] = useState({ open: false, co: null });
  const [assessmentModal, setAssessmentModal] = useState({ open: false, assessment: null });
  const [questionModal, setQuestionModal] = useState({ open: false, assessment: null, question: null });
  const [marksModal, setMarksModal] = useState({ open: false, assessment: null });
  const [enrollModal, setEnrollModal] = useState({ open: false });
  const [bulkEnrollModal, setBulkEnrollModal] = useState({ open: false });

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCourseDetailsApi(id);
      setData(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not load course details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  const fetchEnrollments = useCallback(async () => {
    try {
      setLoadingEnrollments(true);
      const res = await listCourseEnrollmentsApi(id);
      setEnrollments(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not load enrolled students', 'error');
    } finally {
      setLoadingEnrollments(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    if (activeTab === 'students') {
      fetchEnrollments();
      // Load student users list for dropdown
      listUsersApi({ role: 'student' })
        .then((res) => setAllStudents(res.data.users || []))
        .catch(() => {});
    }
  }, [activeTab, fetchEnrollments]);

  // ─── Enrollment Handlers ───────────────────────────────────────────────────

  const handleSingleEnroll = async (studentId) => {
    try {
      await enrollCourseStudentApi({ courseId: id, studentId });
      showToast('Student enrolled successfully', 'success');
      setEnrollModal({ open: false });
      fetchEnrollments();
      fetchDetails();
    } catch (err) {
      showToast(err.response?.data?.message || 'Enrollment failed', 'error');
    }
  };

  const handleBulkEnroll = async (rollNumbersText) => {
    const rollNumbers = rollNumbersText
      .split(/[\n,]+/)
      .map((r) => r.trim())
      .filter(Boolean);

    if (rollNumbers.length === 0) {
      showToast('Please enter at least one roll number', 'error');
      return;
    }

    try {
      const res = await bulkEnrollCourseStudentsApi({ courseId: id, rollNumbers });
      const { enrolled, skipped, errors } = res.data;
      if (errors?.length > 0) {
        showToast(`Enrolled: ${enrolled.length}, Skipped: ${skipped.length}, Not found: ${errors.length}`, 'error');
      } else {
        showToast(`Enrolled ${enrolled.length} student(s) (${skipped.length} skipped as duplicates)`, 'success');
      }
      setBulkEnrollModal({ open: false });
      fetchEnrollments();
      fetchDetails();
    } catch (err) {
      showToast(err.response?.data?.message || 'Bulk enrollment failed', 'error');
    }
  };

  const handleRemoveEnrollment = async (enrollmentId, studentName) => {
    if (!window.confirm(`Remove ${studentName} from this course?`)) return;
    try {
      await removeCourseEnrollmentApi(enrollmentId);
      showToast('Student enrollment removed', 'success');
      fetchEnrollments();
      fetchDetails();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not remove enrollment', 'error');
    }
  };

  // ─── CO Handlers ────────────────────────────────────────────────────────────

  const handleSaveCO = async (formData) => {
    try {
      if (coModal.co) {
        await updateCOApi(coModal.co._id, formData);
        showToast('Course Outcome updated successfully', 'success');
      } else {
        await createCOApi({ ...formData, courseId: id });
        showToast('Course Outcome created successfully', 'success');
      }
      setCoModal({ open: false, co: null });
      fetchDetails();
    } catch (err) {
      showToast(err.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleDeleteCO = async (co) => {
    if (!window.confirm(`Delete ${co.code}? This cannot be undone.`)) return;
    try {
      await deleteCOApi(co._id);
      showToast('Course Outcome deleted', 'success');
      fetchDetails();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not delete CO', 'error');
    }
  };

  // ─── Assessment Handlers ───────────────────────────────────────────────────

  const handleSaveAssessment = async (formData) => {
    try {
      if (assessmentModal.assessment) {
        const res = await updateAssessmentApi(assessmentModal.assessment._id, formData);
        if (res.data.warning) {
          showToast(res.data.warning, 'error');
        } else {
          showToast('Assessment updated', 'success');
        }
      } else {
        await createAssessmentApi({ ...formData, courseId: id });
        showToast('Assessment created successfully', 'success');
      }
      setAssessmentModal({ open: false, assessment: null });
      fetchDetails();
    } catch (err) {
      showToast(err.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleDeleteAssessment = async (ass) => {
    if (!window.confirm(`Delete ${ass.name} and all its questions?`)) return;
    try {
      await deleteAssessmentApi(ass._id);
      showToast('Assessment deleted', 'success');
      fetchDetails();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not delete assessment', 'error');
    }
  };

  // ─── Question Handlers ─────────────────────────────────────────────────────

  const handleSaveQuestion = async (formData) => {
    try {
      if (questionModal.question) {
        const res = await updateQuestionApi(questionModal.question._id, formData);
        if (res.warning) {
          showToast(`Saved with notice: ${res.warning}`, 'error');
        } else {
          showToast('Question updated successfully', 'success');
        }
      } else {
        const res = await createQuestionApi({
          ...formData,
          assessmentId: questionModal.assessment._id,
        });
        if (res.warning) {
          showToast(`Saved with notice: ${res.warning}`, 'error');
        } else {
          showToast('Question created & mapped successfully', 'success');
        }
      }
      setQuestionModal({ open: false, assessment: null, question: null });
      fetchDetails();
    } catch (err) {
      showToast(err.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleDeleteQuestion = async (q) => {
    if (!window.confirm(`Delete question ${q.label}?`)) return;
    try {
      const res = await deleteQuestionApi(q._id);
      if (res.warning) {
        showToast(`Deleted with notice: ${res.warning}`, 'error');
      } else {
        showToast('Question deleted', 'success');
      }
      fetchDetails();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not delete question', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!data?.course) {
    return (
      <div className="p-6">
        <EmptyState message="Course not found or access denied" />
        <div className="mt-4 text-center">
          <Link to="/courses" className="text-indigo-400 hover:underline text-sm">
            ← Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  const { course, cos, assessments, enrollmentsCount } = data;

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />

      {/* Back link & breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/courses" className="hover:text-white transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Courses
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-600" />
        <span className="text-white font-medium">{course.code}</span>
      </div>

      {/* Course Banner Header */}
      <div className="rounded-xl border border-gray-800 bg-gradient-to-r from-gray-900 via-gray-900 to-indigo-950/40 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {course.code}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                Sem {course.semester}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                {course.academicYear}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                {course.credits} Credits
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{course.name}</h1>
            <p className="text-sm text-gray-400 mt-1">
              Programme: <span className="text-gray-300 font-medium">{course.programme?.name} ({course.programme?.code})</span> · Faculty: <span className="text-emerald-400 font-medium">{course.faculty?.name}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-gray-800 bg-gray-900/80 px-4 py-2.5 text-center">
              <div className="text-xs text-gray-400 uppercase font-semibold">Enrolled</div>
              <div className="text-xl font-bold text-white flex items-center justify-center gap-1.5 mt-0.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>{enrollmentsCount}</span>
              </div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/80 px-4 py-2.5 text-center">
              <div className="text-xs text-gray-400 uppercase font-semibold">COs</div>
              <div className="text-xl font-bold text-white flex items-center justify-center gap-1.5 mt-0.5">
                <Award className="w-4 h-4 text-purple-400" />
                <span>{cos?.length || 0}</span>
              </div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/80 px-4 py-2.5 text-center">
              <div className="text-xs text-gray-400 uppercase font-semibold">Assessments</div>
              <div className="text-xl font-bold text-white flex items-center justify-center gap-1.5 mt-0.5">
                <CheckSquare className="w-4 h-4 text-blue-400" />
                <span>{assessments?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 gap-4">
        <button
          onClick={() => setActiveTab('cos')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'cos'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Course Outcomes (COs)</span>
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-800 text-gray-300">
            {cos?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('assessments')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'assessments'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Assessments & Questions</span>
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-800 text-gray-300">
            {assessments?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'students'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Enrolled Students</span>
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-800 text-gray-300">
            {enrollmentsCount || 0}
          </span>
        </button>
      </div>

      {/* ─── TAB 1: Course Outcomes ─────────────────────────────────────────── */}
      {activeTab === 'cos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Course Outcomes</h2>
              <p className="text-xs text-gray-400">Define course-level learning outcomes with target attainment and Bloom taxonomy levels.</p>
            </div>
            <PrimaryButton onClick={() => setCoModal({ open: true, co: null })}>
              <Plus className="w-4 h-4" /> Add CO
            </PrimaryButton>
          </div>

          <Card>
            {!cos || cos.length === 0 ? (
              <EmptyState message="No Course Outcomes created yet. Click 'Add CO' to define learning outcomes." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase px-4 py-3 w-20">Code</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase px-4 py-3">Outcome Statement</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase px-4 py-3 w-36">Bloom Level</th>
                      <th className="text-center text-xs font-semibold text-gray-400 uppercase px-4 py-3 w-28">Target Marks</th>
                      <th className="text-center text-xs font-semibold text-gray-400 uppercase px-4 py-3 w-28">Attainment Goal</th>
                      <th className="px-4 py-3 w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {cos.map((co) => (
                      <tr key={co._id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-indigo-400 text-xs">{co.code}</td>
                        <td className="px-4 py-3 text-white font-medium leading-relaxed">{co.statement}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-medium">
                            {co.bloomLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-300 font-mono text-xs">{co.targetMarksPercentage}%</td>
                        <td className="px-4 py-3 text-center text-emerald-400 font-mono text-xs font-semibold">{co.targetAttainmentPercentage}%</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-end">
                            <GhostButton onClick={() => setCoModal({ open: true, co })}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </GhostButton>
                            <DangerButton onClick={() => handleDeleteCO(co)}>
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* ─── TAB 2: Assessments & Questions ─────────────────────────────────── */}
      {activeTab === 'assessments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Course Assessments & Marks</h2>
              <p className="text-xs text-gray-400">Configure tests, map question-level marks to COs, and enter student marks.</p>
            </div>
            <PrimaryButton onClick={() => setAssessmentModal({ open: true, assessment: null })}>
              <Plus className="w-4 h-4" /> New Assessment
            </PrimaryButton>
          </div>

          {!assessments || assessments.length === 0 ? (
            <Card>
              <EmptyState message="No assessments configured yet. Create a CIE, Assignment, or SEE." />
            </Card>
          ) : (
            <div className="space-y-5">
              {assessments.map((ass) => {
                const isMismatch = ass.warning !== null;
                return (
                  <div
                    key={ass._id}
                    className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden shadow-lg transition-all"
                  >
                    {/* Assessment Card Header */}
                    <div className="border-b border-gray-800/80 bg-gray-850/50 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-lg font-bold text-white tracking-tight">{ass.name}</h3>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-medium capitalize">
                            {ass.type.replace('_', ' ')}
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 font-semibold font-mono">
                            Max Marks: {ass.maxMarks}
                          </span>
                          <span className="text-xs text-gray-400">
                            Weightage: {ass.weightage}x
                          </span>
                        </div>

                        {/* Marks Status Pill */}
                        <div className="flex items-center gap-2 pt-1">
                          {isMismatch ? (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                              <span>{ass.warning}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                              <span>Total marks configured: {ass.questionMarksSum} / {ass.maxMarks}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                        <button
                          onClick={() => setMarksModal({ open: true, assessment: ass })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Marks Grid</span>
                        </button>
                        <PrimaryButton
                          onClick={() => setQuestionModal({ open: true, assessment: ass, question: null })}
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Question
                        </PrimaryButton>
                        <GhostButton onClick={() => setAssessmentModal({ open: true, assessment: ass })}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </GhostButton>
                        <DangerButton onClick={() => handleDeleteAssessment(ass)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </DangerButton>
                      </div>
                    </div>

                    {/* Questions Table */}
                    <div className="p-4 sm:p-5">
                      {!ass.questions || ass.questions.length === 0 ? (
                        <div className="text-center py-6 text-xs text-gray-500">
                          No questions added yet. Click &quot;Add Question&quot; above to configure Question→CO mappings.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase">
                                <th className="text-left py-2 px-3 w-28">Label</th>
                                <th className="text-left py-2 px-3 w-28">Marks</th>
                                <th className="text-left py-2 px-3">Mapped Course Outcome</th>
                                <th className="py-2 px-3 w-24 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/40">
                              {ass.questions.map((q) => (
                                <tr key={q._id} className="hover:bg-gray-800/20">
                                  <td className="py-2.5 px-3 font-mono font-bold text-white text-xs">
                                    {q.label}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-semibold text-indigo-400 text-xs">
                                    {q.maxMarks} marks
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 shrink-0">
                                        {q.co?.code || '—'}
                                      </span>
                                      <span className="text-xs text-gray-300 line-clamp-1">
                                        {q.co?.statement}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="flex gap-1.5 justify-end">
                                      <GhostButton
                                        onClick={() => setQuestionModal({ open: true, assessment: ass, question: q })}
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </GhostButton>
                                      <DangerButton onClick={() => handleDeleteQuestion(q)}>
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: Enrolled Students ───────────────────────────────────────── */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Enrolled Students</h2>
              <p className="text-xs text-gray-400">View active course enrollments, enroll single students, or bulk enroll via roll numbers.</p>
            </div>
            <div className="flex items-center gap-2">
              <GhostButton onClick={() => setBulkEnrollModal({ open: true })}>
                <Users className="w-4 h-4" /> Bulk Enroll
              </GhostButton>
              <PrimaryButton onClick={() => setEnrollModal({ open: true })}>
                <UserPlus className="w-4 h-4" /> Enroll Student
              </PrimaryButton>
            </div>
          </div>

          <Card>
            {loadingEnrollments ? (
              <Spinner />
            ) : enrollments.length === 0 ? (
              <EmptyState message="No students enrolled in this course yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase">
                      <th className="py-3 px-4 text-left w-32">Roll Number</th>
                      <th className="py-3 px-4 text-left">Student Name</th>
                      <th className="py-3 px-4 text-left hidden sm:table-cell">Email</th>
                      <th className="py-3 px-4 text-center w-28">Status</th>
                      <th className="py-3 px-4 text-right w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {enrollments.map((e) => (
                      <tr key={e._id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-300 text-xs">
                          {e.student?.rollNo || '—'}
                        </td>
                        <td className="py-3 px-4 font-medium text-white">
                          {e.student?.name || '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-xs hidden sm:table-cell">
                          {e.student?.email}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 capitalize">
                            {e.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <DangerButton
                            onClick={() => handleRemoveEnrollment(e._id, e.student?.name)}
                            title="Remove Enrollment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </DangerButton>
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

      {/* ─── CO Modal ───────────────────────────────────────────────────────── */}
      <COFormModal
        open={coModal.open}
        co={coModal.co}
        onClose={() => setCoModal({ open: false, co: null })}
        onSave={handleSaveCO}
      />

      {/* ─── Assessment Modal ────────────────────────────────────────────────── */}
      <AssessmentFormModal
        open={assessmentModal.open}
        assessment={assessmentModal.assessment}
        onClose={() => setAssessmentModal({ open: false, assessment: null })}
        onSave={handleSaveAssessment}
      />

      {/* ─── Question Modal ─────────────────────────────────────────────────── */}
      <QuestionFormModal
        open={questionModal.open}
        assessment={questionModal.assessment}
        question={questionModal.question}
        cos={cos || []}
        onClose={() => setQuestionModal({ open: false, assessment: null, question: null })}
        onSave={handleSaveQuestion}
      />

      {/* ─── Marks Grid Modal ────────────────────────────────────────────────── */}
      {marksModal.open && (
        <MarksGridModal
          open={marksModal.open}
          assessment={marksModal.assessment}
          onClose={() => {
            setMarksModal({ open: false, assessment: null });
            fetchDetails();
          }}
          showToast={showToast}
        />
      )}

      {/* ─── Single Enroll Modal ─────────────────────────────────────────────── */}
      <EnrollStudentModal
        open={enrollModal.open}
        students={allStudents}
        enrolledIds={new Set(enrollments.map((e) => e.student?._id))}
        onClose={() => setEnrollModal({ open: false })}
        onEnroll={handleSingleEnroll}
      />

      {/* ─── Bulk Enroll Modal ───────────────────────────────────────────────── */}
      <BulkEnrollModal
        open={bulkEnrollModal.open}
        onClose={() => setBulkEnrollModal({ open: false })}
        onBulkEnroll={handleBulkEnroll}
      />
    </div>
  );
}

// ─── Modal Subcomponents ──────────────────────────────────────────────────────

function COFormModal({ open, co, onClose, onSave }) {
  const [code, setCode] = useState('');
  const [statement, setStatement] = useState('');
  const [bloomLevel, setBloomLevel] = useState('L3: Apply');
  const [targetMarksPercentage, setTargetMarksPercentage] = useState(60);
  const [targetAttainmentPercentage, setTargetAttainmentPercentage] = useState(70);

  useEffect(() => {
    if (co) {
      setCode(co.code || '');
      setStatement(co.statement || '');
      setBloomLevel(co.bloomLevel || 'L3: Apply');
      setTargetMarksPercentage(co.targetMarksPercentage ?? 60);
      setTargetAttainmentPercentage(co.targetAttainmentPercentage ?? 70);
    } else {
      setCode('');
      setStatement('');
      setBloomLevel('L3: Apply');
      setTargetMarksPercentage(60);
      setTargetAttainmentPercentage(70);
    }
  }, [co, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      code,
      statement,
      bloomLevel,
      targetMarksPercentage: Number(targetMarksPercentage),
      targetAttainmentPercentage: Number(targetAttainmentPercentage),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={co ? `Edit ${co.code}` : 'Add Course Outcome'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="CO Code (e.g. CO1, CO2)"
          value={code}
          onChange={setCode}
          placeholder="CO1"
          required
        />
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Outcome Statement *</label>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            rows={3}
            required
            placeholder="Describe what students will be able to do..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <FormSelect
          label="Bloom's Taxonomy Level"
          value={bloomLevel}
          onChange={setBloomLevel}
          options={BLOOM_LEVELS.map((l) => ({ value: l, label: l }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Target Marks %"
            type="number"
            value={targetMarksPercentage}
            onChange={setTargetMarksPercentage}
            min={0}
            max={100}
            required
          />
          <FormInput
            label="Attainment Goal %"
            type="number"
            value={targetAttainmentPercentage}
            onChange={setTargetAttainmentPercentage}
            min={0}
            max={100}
            required
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit">{co ? 'Update' : 'Create'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function AssessmentFormModal({ open, assessment, onClose, onSave }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('internal');
  const [maxMarks, setMaxMarks] = useState(30);
  const [weightage, setWeightage] = useState(1.0);

  useEffect(() => {
    if (assessment) {
      setName(assessment.name || '');
      setType(assessment.type || 'internal');
      setMaxMarks(assessment.maxMarks ?? 30);
      setWeightage(assessment.weightage ?? 1.0);
    } else {
      setName('');
      setType('internal');
      setMaxMarks(30);
      setWeightage(1.0);
    }
  }, [assessment, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name,
      type,
      maxMarks: Number(maxMarks),
      weightage: Number(weightage),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={assessment ? `Edit ${assessment.name}` : 'Create Assessment'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Assessment Name"
          value={name}
          onChange={setName}
          placeholder="e.g. CIE 1, Quiz 1, End Sem Exam"
          required
        />
        <FormSelect
          label="Assessment Type"
          value={type}
          onChange={setType}
          options={ASSESSMENT_TYPES}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Maximum Marks"
            type="number"
            value={maxMarks}
            onChange={setMaxMarks}
            min={1}
            required
          />
          <FormInput
            label="Weightage"
            type="number"
            value={weightage}
            onChange={setWeightage}
            step="0.1"
            min={0}
            required
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit">{assessment ? 'Update' : 'Create'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function QuestionFormModal({ open, assessment, question, cos, onClose, onSave }) {
  const [label, setLabel] = useState('');
  const [maxMarks, setMaxMarks] = useState(5);
  const [coId, setCoId] = useState('');

  useEffect(() => {
    if (question) {
      setLabel(question.label || '');
      setMaxMarks(question.maxMarks ?? 5);
      setCoId(question.co?._id || question.co || (cos[0]?._id || ''));
    } else {
      setLabel('');
      setMaxMarks(5);
      setCoId(cos[0]?._id || '');
    }
  }, [question, cos, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      label,
      maxMarks: Number(maxMarks),
      coId,
    });
  };

  if (!cos || cos.length === 0) {
    return (
      <Modal open={open} onClose={onClose} title="Course Outcomes Required">
        <div className="space-y-4 py-2">
          <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            Please define at least one Course Outcome (CO) for this course before creating questions.
          </p>
          <div className="flex justify-end">
            <PrimaryButton onClick={onClose}>Close</PrimaryButton>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={question ? `Edit ${question.label}` : `Add Question to ${assessment?.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Question Label"
          value={label}
          onChange={setLabel}
          placeholder="e.g. Q1, Q1a, Q2"
          required
        />
        <FormInput
          label="Max Marks for Question"
          type="number"
          value={maxMarks}
          onChange={setMaxMarks}
          min={1}
          required
        />
        <FormSelect
          label="Mapped Course Outcome *"
          value={coId}
          onChange={setCoId}
          options={cos.map((c) => ({
            value: c._id,
            label: `${c.code}: ${c.statement.slice(0, 45)}... (${c.bloomLevel})`,
          }))}
        />
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit">{question ? 'Update Question' : 'Save Question'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function EnrollStudentModal({ open, students, enrolledIds, onClose, onEnroll }) {
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const eligibleStudents = students.filter((s) => !enrolledIds.has(s._id));

  useEffect(() => {
    if (eligibleStudents.length > 0) {
      setSelectedStudentId(eligibleStudents[0]._id);
    } else {
      setSelectedStudentId('');
    }
  }, [open, eligibleStudents]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    onEnroll(selectedStudentId);
  };

  return (
    <Modal open={open} onClose={onClose} title="Enroll Student">
      <form onSubmit={handleSubmit} className="space-y-4">
        {eligibleStudents.length === 0 ? (
          <p className="text-xs text-gray-400">All registered students are already enrolled in this course.</p>
        ) : (
          <FormSelect
            label="Select Student *"
            value={selectedStudentId}
            onChange={setSelectedStudentId}
            options={eligibleStudents.map((s) => ({
              value: s._id,
              label: `${s.rollNo ? s.rollNo + ' — ' : ''}${s.name} (${s.email})`,
            }))}
          />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={!selectedStudentId}>Enroll</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function BulkEnrollModal({ open, onClose, onBulkEnroll }) {
  const [rollNumbersText, setRollNumbersText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onBulkEnroll(rollNumbersText);
  };

  return (
    <Modal open={open} onClose={onClose} title="Bulk Enroll Students">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-gray-400">
          Enter roll numbers separated by commas or new lines. Duplicate enrollments will be skipped automatically.
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Roll Numbers *</label>
          <textarea
            value={rollNumbersText}
            onChange={(e) => setRollNumbersText(e.target.value)}
            rows={5}
            placeholder="22IT001&#10;22IT002&#10;22IT003"
            required
            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit">Bulk Enroll</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
