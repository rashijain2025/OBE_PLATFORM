import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getCourseDetailsApi,
  createCOApi, updateCOApi, deleteCOApi,
  createAssessmentApi, updateAssessmentApi, deleteAssessmentApi,
  listCourseEnrollmentsApi, enrollCourseStudentApi, bulkEnrollCourseStudentsApi, removeCourseEnrollmentApi,
  listClassGroupsApi, enrollClassApi,
} from '../../api/faculty';
import { listUsersApi } from '../../api/admin';
import {
  Card, PrimaryButton, DangerButton, GhostButton,
  FormInput, FormSelect, Modal, Spinner, EmptyState, InfoTip,
} from '../../components/ui/AdminUI';
import { useToast, ToastContainer } from '../../components/ui/Toast';
import MarksGridModal from '../../components/marks/MarksGridModal';
import QuestionPaperBuilder from '../../components/course/QuestionPaperBuilder';
import CourseChecklist from '../../components/course/CourseChecklist';
import CopySetupCard from '../../components/course/CopySetupCard';
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


// A course has at least 3 and at most 5 Course Outcomes
const MIN_COS = 3;
const MAX_COS = 5;
const CO_CODES = Array.from({ length: MAX_COS }, (_, i) => `CO${i + 1}`);

const TARGET_MARKS_HINT =
  'The minimum percentage of this CO\'s marks a student must score to be counted as having attained the CO. Example: 60% means a student needs at least 6 out of 10 marks on the questions mapped to this CO.';

const ATTAINMENT_GOAL_HINT =
  'The percentage of students who must reach the Target Marks for the CO to count as attained by the class. Example: 70% means at least 42 of 60 students must cross the target.';

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

  const enrolledStudentIds = useMemo(
    () => new Set(enrollments.map((e) => e.student?._id)),
    [enrollments]
  );

  // Modals state
  const [coModal, setCoModal] = useState({ open: false, co: null });
  const [assessmentModal, setAssessmentModal] = useState({ open: false, assessment: null });
  const [marksModal, setMarksModal] = useState({ open: false, assessment: null });
  const [enrollModal, setEnrollModal] = useState({ open: false });
  const [bulkEnrollModal, setBulkEnrollModal] = useState({ open: false });
  const [classModalOpen, setClassModalOpen] = useState(false);

  // Only the first load shows the full-page spinner; refreshes after edits update in place
  const fetchDetails = useCallback(async () => {
    try {
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
      listUsersApi({ role: 'student', limit: 500 })
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

  // Edit saves one CO; create receives every row added in the modal
  const handleSaveCO = async (rows) => {
    if (coModal.co) {
      try {
        await updateCOApi(coModal.co._id, rows[0]);
        showToast('Course Outcome updated successfully', 'success');
        setCoModal({ open: false, co: null });
        fetchDetails();
      } catch (err) {
        showToast(err.response?.data?.message || 'Operation failed', 'error');
      }
      return;
    }

    const failed = [];
    for (const row of rows) {
      try {
        await createCOApi({ ...row, courseId: id });
      } catch (err) {
        failed.push(`${row.code}: ${err.response?.data?.message || 'failed'}`);
      }
    }
    const createdCount = rows.length - failed.length;
    if (failed.length === 0) {
      showToast(`${createdCount} Course Outcome${createdCount !== 1 ? 's' : ''} created successfully`, 'success');
      setCoModal({ open: false, co: null });
    } else {
      showToast(`Created ${createdCount} of ${rows.length}. ${failed.join('; ')}`, 'error');
    }
    fetchDetails();
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

  const handleEnrollClass = async (group) => {
    try {
      const res = await enrollClassApi({ courseId: id, batch: group.batch, section: group.section });
      const added = res.data.enrolled + res.data.reactivated;
      showToast(
        added > 0
          ? `Added ${added} student(s) from batch ${group.batch} section ${group.section}`
          : `Everyone in batch ${group.batch} section ${group.section} is already enrolled`,
        'success'
      );
      setClassModalOpen(false);
      fetchEnrollments();
      fetchDetails();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not add class', 'error');
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
          <Link to="/courses" className="text-accent hover:underline text-sm font-medium">
            ← Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  const { course, cos, assessments, enrollmentsCount, progress, obeTargets } = data;
  const unmappedCOs = new Set(progress?.unmappedCOs || []);
  const isEmptyCourse = (cos?.length || 0) === 0 && (assessments?.length || 0) === 0;

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />

      {/* Back link & breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link to="/courses" className="hover:text-ink transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Courses
        </Link>
        <ChevronRight className="w-4 h-4 text-muted/60" />
        <span className="text-ink font-semibold">{course.code}</span>
      </div>

      {/* Course Banner Header */}
      <div className="rounded-2xl border border-border bg-surface shadow-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-paper text-ink border border-border">
                {course.code}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-paper border border-border text-muted">
                Sem {course.semester}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-paper border border-border text-muted">
                {course.academicYear}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-accent-soft text-accent border border-teal-200 font-medium">
                {course.credits} Credits
              </span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-ink tracking-tight">{course.name}</h1>
            <p className="text-sm text-muted mt-1">
              Programme: <span className="text-ink font-medium">{course.programme?.name} ({course.programme?.code})</span>
              {user?.role !== 'faculty' && (
                <> · Faculty: <span className="text-ink font-medium">{course.faculty?.name}</span></>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-border bg-paper/60 px-4 py-2.5 text-center">
              <div className="text-xs text-muted uppercase font-semibold">Enrolled</div>
              <div className="text-xl font-bold text-ink font-serif flex items-center justify-center gap-1.5 mt-0.5 tabular-nums">
                <Users className="w-4 h-4 text-accent" />
                <span>{enrollmentsCount}</span>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-paper/60 px-4 py-2.5 text-center">
              <div className="text-xs text-muted uppercase font-semibold">COs</div>
              <div className="text-xl font-bold text-ink font-serif flex items-center justify-center gap-1.5 mt-0.5 tabular-nums">
                <Award className="w-4 h-4 text-accent" />
                <span>{cos?.length || 0}</span>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-paper/60 px-4 py-2.5 text-center">
              <div className="text-xs text-muted uppercase font-semibold">Assessments</div>
              <div className="text-xl font-bold text-ink font-serif flex items-center justify-center gap-1.5 mt-0.5 tabular-nums">
                <CheckSquare className="w-4 h-4 text-accent" />
                <span>{assessments?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEmptyCourse && (
        <CopySetupCard courseId={id} onCopied={fetchDetails} showToast={showToast} />
      )}

      <CourseChecklist courseId={id} progress={progress} onGoto={setActiveTab} />

      {/* Tabs */}
      <div className="flex border-b border-border gap-4">
        <button
          onClick={() => setActiveTab('cos')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'cos'
              ? 'border-ink text-ink font-semibold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Course Outcomes (COs)</span>
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-paper border border-border text-muted tabular-nums">
            {cos?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('assessments')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'assessments'
              ? 'border-ink text-ink font-semibold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Assessments & Questions</span>
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-paper border border-border text-muted tabular-nums">
            {assessments?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'students'
              ? 'border-ink text-ink font-semibold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Enrolled Students</span>
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-paper border border-border text-muted tabular-nums">
            {enrollmentsCount || 0}
          </span>
        </button>
      </div>

      {/* ─── TAB 1: Course Outcomes ─────────────────────────────────────────── */}
      {activeTab === 'cos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-base font-semibold text-ink">Course Outcomes</h2>
              <p className="text-xs text-muted">Define course-level learning outcomes with target attainment and Bloom taxonomy levels.</p>
            </div>
            <PrimaryButton
              onClick={() => setCoModal({ open: true, co: null })}
              disabled={(cos?.length || 0) >= MAX_COS}
            >
              <Plus className="w-4 h-4" /> {(cos?.length || 0) >= MAX_COS ? `All ${MAX_COS} COs added` : 'Add COs'}
            </PrimaryButton>
          </div>

          <Card>
            {!cos || cos.length === 0 ? (
              <EmptyState message="No Course Outcomes created yet. Click 'Add COs' to define learning outcomes." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-paper/50">
                      <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3 w-20">Code</th>
                      <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3">Outcome Statement</th>
                      <th className="text-left text-xs font-semibold text-muted uppercase px-4 py-3 w-36">Bloom Level</th>
                      <th className="text-center text-xs font-semibold text-muted uppercase px-4 py-3 w-32">
                        <span className="inline-flex items-center gap-1">Target Marks <InfoTip text={TARGET_MARKS_HINT} placement="bottom" /></span>
                      </th>
                      <th className="text-center text-xs font-semibold text-muted uppercase px-4 py-3 w-36">
                        <span className="inline-flex items-center gap-1">Attainment Goal <InfoTip text={ATTAINMENT_GOAL_HINT} placement="bottom" /></span>
                      </th>
                      <th className="px-4 py-3 w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cos.map((co) => (
                      <tr key={co._id} className="hover:bg-paper/60 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-ink text-xs bg-paper px-2 py-0.5 rounded border border-border inline-block">
                            {co.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink font-medium leading-relaxed">
                          {co.statement}
                          {unmappedCOs.has(co.code) && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-status-borderline-soft text-status-borderline border border-amber-200 align-middle">
                              <AlertTriangle className="w-3 h-3" /> No questions yet
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-teal-200 font-medium">
                            {co.bloomLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-muted font-mono text-xs tabular-nums">{co.targetMarksPercentage}%</td>
                        <td className="px-4 py-3 text-center text-status-attained font-mono text-xs font-semibold tabular-nums">{co.targetAttainmentPercentage}%</td>
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
              <h2 className="font-serif text-base font-semibold text-ink">Course Assessments & Marks</h2>
              <p className="text-xs text-muted">Configure tests, map question-level marks to COs, and enter student marks.</p>
            </div>
            <PrimaryButton onClick={() => setAssessmentModal({ open: true, assessment: null })}>
              <Plus className="w-4 h-4" /> New Assessment
            </PrimaryButton>
          </div>

          {!assessments || assessments.length === 0 ? (
            <Card>
              <EmptyState message="No assessments configured yet. Create one, e.g. CIE 1, Assignment 1 or End Sem Exam." />
            </Card>
          ) : (
            <div className="space-y-5">
              {assessments.map((ass) => {
                const isMismatch = ass.warning !== null;
                return (
                  <div
                    key={ass._id}
                    className="rounded-2xl border border-border bg-surface overflow-hidden shadow-card transition-all"
                  >
                    {/* Assessment Card Header */}
                    <div className="border-b border-border bg-paper/60 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="font-serif text-lg font-bold text-ink tracking-tight">{ass.name}</h3>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent-soft text-accent border border-teal-200 font-semibold font-mono tabular-nums">
                            Max Marks: {ass.maxMarks}
                          </span>
                        </div>

                        {/* Marks Status Pill */}
                        <div className="flex items-center gap-2 pt-1">
                          {isMismatch ? (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-status-borderline-soft text-status-borderline border border-amber-200">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-status-borderline" />
                              <span>{ass.warning}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-status-attained-soft text-status-attained border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-status-attained" />
                              <span className="tabular-nums">Total marks configured: {ass.questionMarksSum} / {ass.maxMarks}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                        <button
                          onClick={() => setMarksModal({ open: true, assessment: ass })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-accent bg-accent-soft hover:bg-teal-100 border border-teal-200 transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Marks Grid</span>
                        </button>
                        <GhostButton onClick={() => setAssessmentModal({ open: true, assessment: ass })}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </GhostButton>
                        <DangerButton onClick={() => handleDeleteAssessment(ass)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </DangerButton>
                      </div>
                    </div>

                    {/* Question Paper (editable) */}
                    <div className="p-4 sm:p-5">
                      <QuestionPaperBuilder
                        assessment={ass}
                        cos={cos || []}
                        onSaved={fetchDetails}
                        showToast={showToast}
                      />
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
              <h2 className="font-serif text-base font-semibold text-ink">Enrolled Students</h2>
              <p className="text-xs text-muted">Add a whole class section at once. Use roll numbers or single enrollment for students outside a section.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <GhostButton onClick={() => setEnrollModal({ open: true })}>
                <UserPlus className="w-4 h-4" /> One Student
              </GhostButton>
              <GhostButton onClick={() => setBulkEnrollModal({ open: true })}>
                <Users className="w-4 h-4" /> By Roll Numbers
              </GhostButton>
              <PrimaryButton onClick={() => setClassModalOpen(true)}>
                <GraduationCap className="w-4 h-4" /> Add Class Section
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
                    <tr className="border-b border-border bg-paper/50 text-xs text-muted uppercase">
                      <th className="py-3 px-4 text-left w-32">Roll Number</th>
                      <th className="py-3 px-4 text-left">Student Name</th>
                      <th className="py-3 px-4 text-left hidden sm:table-cell">Email</th>
                      <th className="py-3 px-4 text-center w-28">Status</th>
                      <th className="py-3 px-4 text-right w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {enrollments.map((e) => (
                      <tr key={e._id} className="hover:bg-paper/60 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs text-ink font-semibold bg-paper px-2 py-0.5 rounded border border-border inline-block tabular-nums">
                            {e.student?.rollNo || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-ink">
                          {e.student?.name || '—'}
                        </td>
                        <td className="py-3 px-4 text-muted text-xs hidden sm:table-cell">
                          {e.student?.email}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-status-attained-soft text-status-attained border border-emerald-200 capitalize font-medium">
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
        existingCodes={(cos || []).map((c) => c.code)}
        departmentTargets={obeTargets}
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
        enrolledIds={enrolledStudentIds}
        onClose={() => setEnrollModal({ open: false })}
        onEnroll={handleSingleEnroll}
      />

      {/* ─── Bulk Enroll Modal ───────────────────────────────────────────────── */}
      <BulkEnrollModal
        open={bulkEnrollModal.open}
        onClose={() => setBulkEnrollModal({ open: false })}
        onBulkEnroll={handleBulkEnroll}
      />

      {/* ─── Add Class Section Modal ─────────────────────────────────────────── */}
      <AddClassModal
        open={classModalOpen}
        courseId={id}
        onClose={() => setClassModalOpen(false)}
        onAdd={handleEnrollClass}
      />
    </div>
  );
}

// ─── Modal Subcomponents ──────────────────────────────────────────────────────

function COFormModal({ open, co, existingCodes, departmentTargets, onClose, onSave }) {
  const [rows, setRows] = useState([]);
  // An existing CO keeps its own targets; new COs get the department's
  const shownTargets = co
    ? { targetMarksPercentage: co.targetMarksPercentage, targetAttainmentPercentage: co.targetAttainmentPercentage }
    : departmentTargets || { targetMarksPercentage: 60, targetAttainmentPercentage: 70 };

  // New COs take the free codes in order (CO1, CO2, …), so there is nothing to pick
  const freeCodes = useMemo(
    () => CO_CODES.filter((c) => !(existingCodes || []).includes(c)),
    [existingCodes]
  );
  // A course needs at least MIN_COS outcomes: open enough sections to reach that
  const minRows = co ? 1 : Math.min(freeCodes.length, Math.max(1, MIN_COS - (existingCodes || []).length));

  useEffect(() => {
    if (!open) return;
    if (co) {
      setRows([{ statement: co.statement || '', bloomLevel: co.bloomLevel || 'L3: Apply' }]);
    } else {
      setRows(Array.from({ length: minRows }, () => ({ statement: '', bloomLevel: 'L3: Apply' })));
    }
  }, [co, open, minRows]);

  const codeFor = (index) => (co ? co.code : freeCodes[index]);

  const updateRow = (index, patch) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, { statement: '', bloomLevel: 'L3: Apply' }]);

  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

  const canAddAnother = !co && rows.length < freeCodes.length;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(
      rows.map((r, i) => ({
        code: codeFor(i),
        statement: r.statement.trim(),
        bloomLevel: r.bloomLevel,
      }))
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={co ? `Edit ${co.code}` : 'Add Course Outcomes'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!co && (existingCodes || []).length < MIN_COS && (
          <p className="text-xs text-muted">
            Every course needs at least {MIN_COS} Course Outcomes, and can have up to {MAX_COS}.
          </p>
        )}

        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {rows.map((row, index) => (
            <div key={index} className="rounded-xl border border-border bg-paper/40 p-3 space-y-2.5">
              <div className="flex items-end gap-3">
                <div className="shrink-0 pb-1.5">
                  <span className="inline-block font-mono text-sm font-bold text-ink bg-surface border border-border rounded-lg px-3 py-1.5">
                    {codeFor(index)}
                  </span>
                </div>
                <div className="flex-1">
                  <FormSelect
                    label="Bloom's Taxonomy Level"
                    value={row.bloomLevel}
                    onChange={(e) => updateRow(index, { bloomLevel: e.target.value })}
                    options={BLOOM_LEVELS.map((l) => ({ value: l, label: l }))}
                  />
                </div>
                {/* Only the optional extra COs (beyond the required ones) can be removed */}
                {!co && index >= minRows && (
                  <DangerButton onClick={() => removeRow(index)} className="mb-0.5" title={`Remove ${codeFor(index)}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </DangerButton>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Outcome Statement *</label>
                <textarea
                  value={row.statement}
                  onChange={(e) => updateRow(index, { statement: e.target.value })}
                  rows={2}
                  required
                  placeholder="Describe what students will be able to do..."
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
            </div>
          ))}
        </div>

        {canAddAnother && (
          <button
            type="button"
            onClick={addRow}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-teal-300 bg-accent-soft/50 py-2 text-xs font-semibold text-accent hover:bg-accent-soft transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add CO ({freeCodes[rows.length]})
          </button>
        )}

        {/* Targets are department policy, set by the coordinator; shown here for reference only */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-paper/40 px-3 py-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            Target Marks <strong className="text-ink tabular-nums">{shownTargets.targetMarksPercentage}%</strong>
            <InfoTip text={TARGET_MARKS_HINT} />
          </span>
          <span className="inline-flex items-center gap-1.5">
            Attainment Goal <strong className="text-ink tabular-nums">{shownTargets.targetAttainmentPercentage}%</strong>
            <InfoTip text={ATTAINMENT_GOAL_HINT} />
          </span>
          <span className="text-[11px]">Set by your school / centre coordinator</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit">
            {co ? 'Update' : rows.length > 1 ? `Create ${rows.length} COs` : 'Create'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function AssessmentFormModal({ open, assessment, onClose, onSave }) {
  const [name, setName] = useState('');
  const [maxMarks, setMaxMarks] = useState(30);

  useEffect(() => {
    if (assessment) {
      setName(assessment.name || '');
      setMaxMarks(assessment.maxMarks ?? 30);
    } else {
      setName('');
      setMaxMarks(30);
    }
  }, [assessment, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name,
      maxMarks: Number(maxMarks),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={assessment ? `Edit ${assessment.name}` : 'Create Assessment'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Assessment Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. CIE 1, Quiz 1, End Sem Exam"
          required
        />
        <FormInput
          label="Maximum Marks"
          type="number"
          value={maxMarks}
          onChange={(e) => setMaxMarks(e.target.value)}
          min={1}
          required
        />
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit">{assessment ? 'Update' : 'Create'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function EnrollStudentModal({ open, students, enrolledIds, onClose, onEnroll }) {
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const eligibleStudents = useMemo(() => {
    return (students || [])
      .filter((s) => !enrolledIds?.has(s._id))
      .sort((a, b) => {
        const rollA = a.rollNo || a.name || '';
        const rollB = b.rollNo || b.name || '';
        return rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [students, enrolledIds]);

  useEffect(() => {
    if (open) {
      setSelectedStudentId((prev) => {
        if (prev && eligibleStudents.some((s) => s._id === prev)) {
          return prev;
        }
        return eligibleStudents[0]?._id || '';
      });
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
          <p className="text-xs text-muted">All registered students are already enrolled in this course.</p>
        ) : (
          <FormSelect
            label="Select Student *"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
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
        <p className="text-xs text-muted">
          Enter roll numbers separated by commas or new lines. Duplicate enrollments will be skipped automatically.
        </p>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Roll Numbers *</label>
          <textarea
            value={rollNumbersText}
            onChange={(e) => setRollNumbersText(e.target.value)}
            rows={5}
            placeholder="22IT001&#10;22IT002&#10;22IT003"
            required
            className="w-full bg-surface border border-border rounded-lg p-3 text-xs font-mono text-ink placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
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

function AddClassModal({ open, courseId, onClose, onAdd }) {
  const [groups, setGroups] = useState(null);
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    if (!open) return;
    setGroups(null);
    listClassGroupsApi(courseId)
      .then((res) => setGroups(res.data || []))
      .catch(() => setGroups([]));
  }, [open, courseId]);

  const handleAdd = async (g) => {
    setAdding(`${g.batch}|${g.section}`);
    await onAdd(g);
    setAdding(null);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Class Section">
      <div className="space-y-3">
        {groups === null ? (
          <Spinner />
        ) : groups.length === 0 ? (
          <p className="text-xs text-muted">
            No class lists have been uploaded for this programme yet. Ask your school / centre coordinator to upload them
            under School / Centre Setup, or add students by roll number.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border">
            {groups.map((g) => {
              const key = `${g.batch}|${g.section}`;
              const allIn = g.alreadyEnrolled === g.count;
              return (
                <div key={key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div>
                    <div className="text-sm font-semibold text-ink">Batch {g.batch} · Section {g.section}</div>
                    <div className="text-xs text-muted tabular-nums">
                      {g.count} students{g.alreadyEnrolled > 0 ? ` · ${g.alreadyEnrolled} already enrolled` : ''}
                    </div>
                  </div>
                  <PrimaryButton onClick={() => handleAdd(g)} disabled={allIn || adding === key}>
                    {allIn ? 'Added' : adding === key ? 'Adding...' : `Add ${g.count - g.alreadyEnrolled}`}
                  </PrimaryButton>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex justify-end pt-1">
          <GhostButton onClick={onClose}>Close</GhostButton>
        </div>
      </div>
    </Modal>
  );
}
