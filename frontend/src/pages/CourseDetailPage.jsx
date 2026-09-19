import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import {
  ArrowLeft,
  AlertCircle,
  BookOpen,
  Building2,
  Calendar,
  GraduationCap,
  Hash,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  X,
  Target,
  FileBarChart,
  Network,
  ClipboardList,
  Percent,
  Layers,
  Eye,
  Users,
  UserPlus,
  Search,
  TrendingUp,
  BarChart3,
  Check,
} from 'lucide-react';

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  // Course state
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Course Outcomes (CO) state
  const [outcomes, setOutcomes] = useState([]);
  const [outcomesLoading, setOutcomesLoading] = useState(true);
  const [outcomesError, setOutcomesError] = useState('');
  const [feedback, setFeedback] = useState(null);

  // CO Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOutcome, setEditingOutcome] = useState(null);
  const [modalFormData, setModalFormData] = useState({
    code: '',
    description: '',
    order: 1,
  });
  const [formErrors, setFormErrors] = useState({});
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [deleteModalOutcome, setDeleteModalOutcome] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // ── Assessments State ─────────────────────────────────────────────────
  const [assessments, setAssessments] = useState([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(true);
  const [assessmentsError, setAssessmentsError] = useState('');
  const [assessmentFeedback, setAssessmentFeedback] = useState(null);

  // Assessment Modal states
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [assessmentFormData, setAssessmentFormData] = useState({
    name: '',
    type: 'Internal',
    totalMarks: 50,
    weightage: 20,
    date: new Date().toISOString().split('T')[0],
    status: 'active',
    description: '',
  });
  const [assessmentFormErrors, setAssessmentFormErrors] = useState({});
  const [assessmentSubmitting, setAssessmentSubmitting] = useState(false);
  const [deleteAssessmentModal, setDeleteAssessmentModal] = useState(null);
  const [deleteAssessmentSubmitting, setDeleteAssessmentSubmitting] = useState(false);

  // ── Students State ───────────────────────────────────────────────────
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState('');
  const [studentFeedback, setStudentFeedback] = useState(null);

  // Student Enroll Modal state
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [candidateStudents, setCandidateStudents] = useState([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [enrollingId, setEnrollingId] = useState(null);

  // Student Delete Modal state
  const [deleteStudentModal, setDeleteStudentModal] = useState(null);
  const [deleteStudentSubmitting, setDeleteStudentSubmitting] = useState(false);

  // Status toggle
  const [statusTogglingId, setStatusTogglingId] = useState(null);

  // ── CO Attainment State ───────────────────────────────────────────────
  const [attainmentData, setAttainmentData] = useState(null);
  const [attainmentLoading, setAttainmentLoading] = useState(true);
  const [attainmentError, setAttainmentError] = useState('');
  const [targetThreshold, setTargetThreshold] = useState(40);
  const [selectedCOBreakdown, setSelectedCOBreakdown] = useState(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // ── Fetch Course Details ──────────────────────────────────────────────
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await api.get(`/api/courses/${courseId}`);
        setCourse(response.data.data);
      } catch (err) {
        const message =
          err.response?.data?.message ||
          'Failed to load course details. Please try again.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  // ── Fetch Course Outcomes ─────────────────────────────────────────────
  const fetchOutcomes = async () => {
    setOutcomesLoading(true);
    setOutcomesError('');
    try {
      const response = await api.get(`/api/courses/${courseId}/outcomes`);
      setOutcomes(response.data.data);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to load course outcomes.';
      setOutcomesError(message);
    } finally {
      setOutcomesLoading(false);
    }
  };

  // ── Fetch Assessments ─────────────────────────────────────────────────
  const fetchAssessments = async () => {
    setAssessmentsLoading(true);
    setAssessmentsError('');
    try {
      const response = await api.get(`/api/courses/${courseId}/assessments`);
      setAssessments(response.data.data);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to load assessments.';
      setAssessmentsError(message);
    } finally {
      setAssessmentsLoading(false);
    }
  };

  // ── Fetch Enrolled Students ───────────────────────────────────────────
  const fetchStudents = async () => {
    setStudentsLoading(true);
    setStudentsError('');
    try {
      const response = await api.get(`/api/courses/${courseId}/students`);
      setStudents(response.data.data);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to load enrolled students.';
      setStudentsError(message);
    } finally {
      setStudentsLoading(false);
    }
  };

  // ── Fetch CO Attainment ───────────────────────────────────────────────
  const fetchAttainment = async (targetVal) => {
    setAttainmentLoading(true);
    setAttainmentError('');
    try {
      const effectiveTarget = targetVal !== undefined ? targetVal : targetThreshold;
      const response = await api.get(`/api/courses/${courseId}/attainment?target=${effectiveTarget}`);
      setAttainmentData(response.data.data);
      if (response.data.data.targetPercentage) {
        setTargetThreshold(response.data.data.targetPercentage);
      }
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to calculate CO attainment.';
      setAttainmentError(message);
    } finally {
      setAttainmentLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchOutcomes();
      fetchAssessments();
      fetchStudents();
      fetchAttainment();
    }
  }, [courseId]);

  // Auto-dismiss feedbacks
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    if (assessmentFeedback) {
      const timer = setTimeout(() => setAssessmentFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [assessmentFeedback]);

  useEffect(() => {
    if (studentFeedback) {
      const timer = setTimeout(() => setStudentFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [studentFeedback]);

  // ── CO Modal Handlers ─────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingOutcome(null);
    setModalFormData({
      code: `CO${outcomes.length + 1}`,
      description: '',
      order: outcomes.length + 1,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (outcome) => {
    setEditingOutcome(outcome);
    setModalFormData({
      code: outcome.code,
      description: outcome.description,
      order: outcome.order,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOutcome(null);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!modalFormData.code.trim()) errors.code = 'Outcome code is required';
    if (!modalFormData.description.trim()) errors.description = 'Description is required';
    if (!modalFormData.order || Number(modalFormData.order) < 1) errors.order = 'Order must be ≥ 1';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setModalSubmitting(true);
    try {
      if (editingOutcome) {
        const response = await api.put(
          `/api/courses/${courseId}/outcomes/${editingOutcome._id}`,
          {
            code: modalFormData.code.trim().toUpperCase(),
            description: modalFormData.description.trim(),
            order: Number(modalFormData.order),
          }
        );
        setFeedback({
          type: 'success',
          message: response.data.message || 'Course Outcome updated successfully.',
        });
      } else {
        const response = await api.post(
          `/api/courses/${courseId}/outcomes`,
          {
            code: modalFormData.code.trim().toUpperCase(),
            description: modalFormData.description.trim(),
            order: Number(modalFormData.order),
          }
        );
        setFeedback({
          type: 'success',
          message: response.data.message || 'Course Outcome created successfully.',
        });
      }
      closeModal();
      await fetchOutcomes();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to save Course Outcome. Please try again.';
      setFormErrors({ submit: message });
    } finally {
      setModalSubmitting(false);
    }
  };

  const openDeleteModal = (outcome) => setDeleteModalOutcome(outcome);
  const closeDeleteModal = () => setDeleteModalOutcome(null);

  const handleDeleteConfirm = async () => {
    if (!deleteModalOutcome) return;
    setDeleteSubmitting(true);
    try {
      const response = await api.delete(
        `/api/courses/${courseId}/outcomes/${deleteModalOutcome._id}`
      );
      setFeedback({
        type: 'success',
        message: response.data.message || 'Course Outcome deleted successfully.',
      });
      closeDeleteModal();
      await fetchOutcomes();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to delete Course Outcome. Please try again.';
      setFeedback({ type: 'error', message });
      closeDeleteModal();
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // ── Assessment Modal Handlers ─────────────────────────────────────────
  const openAddAssessmentModal = () => {
    setEditingAssessment(null);
    setAssessmentFormData({
      name: `Internal Assessment ${assessments.filter(a => a.type === 'Internal').length + 1}`,
      type: 'Internal',
      totalMarks: 50,
      weightage: 20,
      date: new Date().toISOString().split('T')[0],
      status: 'active',
      description: '',
    });
    setAssessmentFormErrors({});
    setIsAssessmentModalOpen(true);
  };

  const openEditAssessmentModal = (assessment) => {
    setEditingAssessment(assessment);
    setAssessmentFormData({
      name: assessment.name,
      type: assessment.type,
      totalMarks: assessment.totalMarks,
      weightage: assessment.weightage || 0,
      date: assessment.date ? new Date(assessment.date).toISOString().split('T')[0] : '',
      status: assessment.status || 'active',
      description: assessment.description || '',
    });
    setAssessmentFormErrors({});
    setIsAssessmentModalOpen(true);
  };

  const closeAssessmentModal = () => {
    setIsAssessmentModalOpen(false);
    setEditingAssessment(null);
    setAssessmentFormErrors({});
  };

  const validateAssessmentForm = () => {
    const errors = {};
    if (!assessmentFormData.name.trim()) errors.name = 'Assessment name is required';
    if (!assessmentFormData.totalMarks || Number(assessmentFormData.totalMarks) < 1) {
      errors.totalMarks = 'Total marks must be ≥ 1';
    }
    if (assessmentFormData.weightage !== '' && (Number(assessmentFormData.weightage) < 0 || Number(assessmentFormData.weightage) > 100)) {
      errors.weightage = 'Weightage must be between 0 and 100%';
    }
    setAssessmentFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAssessmentSubmit = async (e) => {
    e.preventDefault();
    if (!validateAssessmentForm()) return;

    setAssessmentSubmitting(true);
    try {
      if (editingAssessment) {
        const response = await api.put(
          `/api/courses/${courseId}/assessments/${editingAssessment._id}`,
          assessmentFormData
        );
        setAssessmentFeedback({
          type: 'success',
          message: response.data.message || 'Assessment updated successfully.',
        });
      } else {
        const response = await api.post(
          `/api/courses/${courseId}/assessments`,
          assessmentFormData
        );
        setAssessmentFeedback({
          type: 'success',
          message: response.data.message || 'Assessment created successfully.',
        });
      }
      closeAssessmentModal();
      await fetchAssessments();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to save Assessment. Please try again.';
      setAssessmentFormErrors({ submit: message });
    } finally {
      setAssessmentSubmitting(false);
    }
  };

  const openDeleteAssessmentModal = (assessment) => setDeleteAssessmentModal(assessment);
  const closeDeleteAssessmentModal = () => setDeleteAssessmentModal(null);

  const handleDeleteAssessmentConfirm = async () => {
    if (!deleteAssessmentModal) return;
    setDeleteAssessmentSubmitting(true);
    try {
      const response = await api.delete(
        `/api/courses/${courseId}/assessments/${deleteAssessmentModal._id}`
      );
      setAssessmentFeedback({
        type: 'success',
        message: response.data.message || 'Assessment deleted successfully.',
      });
      closeDeleteAssessmentModal();
      await fetchAssessments();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to delete Assessment. Please try again.';
      setAssessmentFeedback({ type: 'error', message });
      closeDeleteAssessmentModal();
    } finally {
      setDeleteAssessmentSubmitting(false);
    }
  };

  // ── Student Handlers ──────────────────────────────────────────────────
  const searchCandidates = async (query) => {
    setCandidateLoading(true);
    try {
      const response = await api.get(
        `/api/courses/${courseId}/students/search${query ? `?q=${encodeURIComponent(query)}` : ''}`
      );
      setCandidateStudents(response.data.data || []);
    } catch (err) {
      console.error('Failed to search student candidates', err);
    } finally {
      setCandidateLoading(false);
    }
  };

  const openEnrollModal = async () => {
    setIsEnrollModalOpen(true);
    setStudentSearchQuery('');
    await searchCandidates('');
  };

  const closeEnrollModal = () => {
    setIsEnrollModalOpen(false);
    setStudentSearchQuery('');
    setCandidateStudents([]);
  };

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setStudentSearchQuery(query);
    searchCandidates(query);
  };

  const handleEnrollStudent = async (studentId) => {
    setEnrollingId(studentId);
    try {
      const response = await api.post(`/api/courses/${courseId}/students/${studentId}`);
      setStudentFeedback({
        type: 'success',
        message: response.data.message || 'Student enrolled successfully.',
      });
      // Mark as enrolled in candidate search results
      setCandidateStudents((prev) =>
        prev.map((c) => (c._id === studentId ? { ...c, isEnrolled: true } : c))
      );
      // Refresh course enrolled students list
      await fetchStudents();
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to enroll student. Please try again.';
      setStudentFeedback({ type: 'error', message });
    } finally {
      setEnrollingId(null);
    }
  };

  const handleToggleStudentStatus = async (enrollment) => {
    const newStatus = enrollment.status === 'active' ? 'inactive' : 'active';
    const studentId = enrollment.student?._id || enrollment.student;
    setStatusTogglingId(enrollment._id);
    try {
      const response = await api.patch(
        `/api/courses/${courseId}/students/${studentId}/status`,
        { status: newStatus }
      );
      setStudentFeedback({
        type: 'success',
        message: response.data.message || `Student status updated to ${newStatus}.`,
      });
      await fetchStudents();
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to update student status.';
      setStudentFeedback({ type: 'error', message });
    } finally {
      setStatusTogglingId(null);
    }
  };

  const openDeleteStudentModal = (enrollment) => setDeleteStudentModal(enrollment);
  const closeDeleteStudentModal = () => setDeleteStudentModal(null);

  const handleDeleteStudentConfirm = async () => {
    if (!deleteStudentModal) return;
    setDeleteStudentSubmitting(true);
    try {
      const studentId = deleteStudentModal.student?._id || deleteStudentModal.student;
      const response = await api.delete(
        `/api/courses/${courseId}/students/${studentId}`
      );
      setStudentFeedback({
        type: 'success',
        message: response.data.message || 'Student removed from course successfully.',
      });
      closeDeleteStudentModal();
      await fetchStudents();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to remove student from course. Please try again.';
      setStudentFeedback({ type: 'error', message });
      closeDeleteStudentModal();
    } finally {
      setDeleteStudentSubmitting(false);
    }
  };

  // ── Attainment Handlers ───────────────────────────────────────────────
  const handleTargetChange = (newTarget) => {
    const val = Number(newTarget);
    setTargetThreshold(val);
    fetchAttainment(val);
  };

  const handleSaveDefaultTarget = async () => {
    setIsUpdatingSettings(true);
    try {
      await api.patch(`/api/courses/${courseId}/attainment/settings`, {
        targetPercentage: targetThreshold,
      });
      setFeedback({
        type: 'success',
        message: `Default benchmark target updated to ${targetThreshold}%.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Failed to update benchmark settings.',
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const openCOBreakdown = (co) => setSelectedCOBreakdown(co);
  const closeCOBreakdown = () => setSelectedCOBreakdown(null);

  const backButton = (
    <button
      onClick={() => navigate('/courses')}
      className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Courses
    </button>
  );

  // ── Loading & Error States ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        {backButton}
        <div className="bg-white rounded-xl border border-surface-border shadow-sm p-6 animate-pulse">
          <div className="space-y-4">
            <div className="h-5 bg-slate-100 rounded w-32" />
            <div className="h-7 bg-slate-100 rounded w-2/3" />
            <div className="h-4 bg-slate-100 rounded w-1/2 mt-6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="space-y-6">
        {backButton}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Error loading course</p>
            <p className="text-sm text-red-600">{error || 'Course not found.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const details = [
    { label: 'Course Code', value: course.courseCode, icon: Hash },
    { label: 'Department', value: course.department, icon: Building2 },
    { label: 'Semester', value: `Semester ${course.semester}`, icon: BookOpen },
    { label: 'Credits', value: `${course.credits} Credits`, icon: GraduationCap },
    { label: 'Academic Year', value: course.academicYear, icon: Calendar },
    { label: 'Faculty', value: course.assignedFaculty?.name || '—', icon: User },
    {
      label: 'Status',
      value: course.isActive ? 'Active' : 'Inactive',
      icon: course.isActive ? CheckCircle : XCircle,
      valueColor: course.isActive ? 'text-emerald-600' : 'text-slate-500',
    },
    {
      label: 'Created',
      value: new Date(course.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-8">
      {backButton}

      {/* ── 1. Course Information Card ───────────────────────────────── */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-primary-50 text-primary-700 text-xs font-semibold tracking-wide">
                {course.courseCode}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  course.isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {course.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              {course.courseName}
            </h1>
            {course.description && (
              <p className="text-sm text-slate-500 mt-2 max-w-3xl">
                {course.description}
              </p>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {details.map(({ label, value, icon: Icon, valueColor }) => (
            <div
              key={label}
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-50"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-surface-border shrink-0">
                <Icon className="w-4 h-4 text-slate-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {label}
                </p>
                <p className={`text-sm font-semibold mt-0.5 ${valueColor || 'text-slate-700'}`}>
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 2. Course Outcomes Section ───────────────────────────────── */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">
                Course Outcomes (COs)
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {outcomes.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Define the measurable knowledge and skills students will gain upon completing this course.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Outcome
          </button>
        </div>

        <div className="pt-4">
          {outcomesLoading ? (
            <div className="space-y-3 py-4">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-surface-border bg-slate-50/50 animate-pulse space-y-2"
                >
                  <div className="h-4 bg-slate-200 rounded w-20" />
                  <div className="h-3 bg-slate-200 rounded w-5/6" />
                </div>
              ))}
            </div>
          ) : outcomesError ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{outcomesError}</span>
            </div>
          ) : outcomes.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={Target}
                title="No Course Outcomes added"
                message="Add Course Outcomes (CO1, CO2, etc.) to set learning benchmarks for assessments and attainment mapping."
                action={
                  <button
                    onClick={openAddModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add First CO
                  </button>
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {outcomes.map((co) => (
                <div
                  key={co._id}
                  className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-xl border border-surface-border hover:border-slate-300 hover:shadow-xs bg-white transition-all group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-primary-100 text-primary-800 text-xs font-bold tracking-wider shrink-0">
                      {co.code}
                    </span>
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 leading-relaxed break-words">
                        {co.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>Order #{co.order}</span>
                        <span>•</span>
                        <span>{co.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => openEditModal(co)}
                      title="Edit Course Outcome"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(co)}
                      title="Delete Course Outcome"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ── 3. Assessments Section ───────────────────────────────────── */}
      {assessmentFeedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            assessmentFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {assessmentFeedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{assessmentFeedback.message}</span>
          </div>
          <button
            onClick={() => setAssessmentFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">
                Course Assessments
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {assessments.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure internal evaluations, assignments, quizzes, and exams to measure student performance.
            </p>
          </div>

          <button
            onClick={openAddAssessmentModal}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Assessment
          </button>
        </div>

        <div className="pt-4">
          {assessmentsLoading ? (
            <div className="space-y-3 py-4">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-surface-border bg-slate-50/50 animate-pulse space-y-2"
                >
                  <div className="h-4 bg-slate-200 rounded w-28" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : assessmentsError ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{assessmentsError}</span>
            </div>
          ) : assessments.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={ClipboardList}
                title="No assessments created"
                message="Create tests, assignments, or quizzes to evaluate Course Outcomes and track student learning attainment."
                action={
                  <button
                    onClick={openAddAssessmentModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add First Assessment
                  </button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assessments.map((a) => (
                <div
                  key={a._id}
                  className="p-4 rounded-xl border border-surface-border bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">
                        {a.type}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : a.status === 'active'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-800">
                      {a.name}
                    </h3>
                    {a.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {a.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 mt-3 border-t border-surface-border flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-700">{a.totalMarks} Marks</span>
                      {a.weightage > 0 && <span>• {a.weightage}% Weightage</span>}
                      {a.date && <span>• {new Date(a.date).toLocaleDateString()}</span>}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/courses/${courseId}/assessments/${a._id}`)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 font-semibold transition-colors cursor-pointer"
                        title="View Questions"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Questions
                      </button>
                      <button
                        onClick={() => openEditAssessmentModal(a)}
                        className="p-1 rounded text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="Edit Assessment"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openDeleteAssessmentModal(a)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Assessment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ── 4. Enrolled Students Section ──────────────────────────────── */}
      {studentFeedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            studentFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {studentFeedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{studentFeedback.message}</span>
          </div>
          <button
            onClick={() => setStudentFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">
                Enrolled Students
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {students.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage students enrolled in this course for marks entry, evaluation, and outcome attainment.
            </p>
          </div>

          <button
            onClick={openEnrollModal}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Enroll Student
          </button>
        </div>

        <div className="pt-4">
          {studentsLoading ? (
            <div className="space-y-3 py-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-surface-border bg-slate-50/50 animate-pulse flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200" />
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-32" />
                      <div className="h-3 bg-slate-200 rounded w-48" />
                    </div>
                  </div>
                  <div className="h-4 bg-slate-200 rounded w-20" />
                </div>
              ))}
            </div>
          ) : studentsError ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{studentsError}</span>
            </div>
          ) : students.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={Users}
                title="No students enrolled yet"
                message="Enroll registered students in this course to evaluate assessments, input marks, and track CO attainment."
                action={
                  <button
                    onClick={openEnrollModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Enroll First Student
                  </button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-surface-border">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Enrolled Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {students.map((e) => {
                    const studentUser = e.student || {};
                    const initials = (studentUser.name || 'S')
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <tr key={e._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">
                                {studentUser.name || 'Unknown Student'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {studentUser.email || '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                            {studentUser.department || 'General'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">
                          {e.enrollmentDate
                            ? new Date(e.enrollmentDate).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => handleToggleStudentStatus(e)}
                            disabled={statusTogglingId === e._id}
                            title="Click to toggle status"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-opacity ${
                              e.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            } ${statusTogglingId === e._id ? 'opacity-50' : ''}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                e.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {e.status === 'active' ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => openDeleteStudentModal(e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove Student from Course"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* ── 5. Course Outcome (CO) Attainment Section ────────────────── */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary-50 text-primary-700">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">
                Course Outcome (CO) Attainment
              </h2>
              {attainmentData?.courseAttainmentStatus && (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    attainmentData.courseAttainmentStatus === 'Attained'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : attainmentData.courseAttainmentStatus === 'Not Attained'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {attainmentData.courseAttainmentStatus}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Direct OBE attainment calculated from student marks across all assessment questions mapped to each Course Outcome.
            </p>
          </div>

          {/* Benchmark Target Threshold Selector */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 bg-slate-50 p-2 rounded-xl border border-surface-border">
            <span className="text-xs font-semibold text-slate-600">
              Benchmark Target:
            </span>
            <div className="flex items-center gap-1">
              {[35, 40, 50, 60, 70].map((pct) => (
                <button
                  key={pct}
                  onClick={() => handleTargetChange(pct)}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    targetThreshold === pct
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-white hover:text-slate-800'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <button
              onClick={handleSaveDefaultTarget}
              disabled={isUpdatingSettings}
              className="ml-1 text-[11px] text-primary-600 hover:text-primary-800 font-medium underline cursor-pointer disabled:opacity-50"
              title="Save selected target as default course setting"
            >
              {isUpdatingSettings ? 'Saving...' : 'Set Default'}
            </button>
          </div>
        </div>

        <div className="pt-5 space-y-6">
          {attainmentLoading ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-surface-border bg-slate-50/50 animate-pulse space-y-2"
                  >
                    <div className="h-3 bg-slate-200 rounded w-20" />
                    <div className="h-6 bg-slate-200 rounded w-16" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-surface-border bg-slate-50/50 animate-pulse space-y-3"
                  >
                    <div className="h-4 bg-slate-200 rounded w-24" />
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-2 bg-slate-200 rounded w-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : attainmentError ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{attainmentError}</span>
            </div>
          ) : !attainmentData || attainmentData.outcomes.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={Target}
                title="No Course Outcomes to calculate"
                message="Define Course Outcomes and map assessment questions to calculate attainment percentages."
              />
            </div>
          ) : (
            <>
              {/* Analytics Summary Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Overall Course Attainment */}
                <div className="p-4 rounded-xl border border-surface-border bg-white shadow-xs space-y-2">
                  <span className="text-xs font-medium text-slate-500">
                    Average CO Attainment
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-800">
                      {attainmentData.averageAttainment !== null
                        ? `${attainmentData.averageAttainment}%`
                        : '—'}
                    </span>
                    {attainmentData.averageAttainment !== null && (
                      <span
                        className={`text-xs font-semibold ${
                          attainmentData.averageAttainment >= targetThreshold
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {attainmentData.averageAttainment >= targetThreshold
                          ? '✓ Target Met'
                          : '✗ Below Target'}
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        attainmentData.averageAttainment >= targetThreshold
                          ? 'bg-emerald-500'
                          : 'bg-rose-500'
                      }`}
                      style={{
                        width: `${Math.min(attainmentData.averageAttainment || 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 2. Attained COs Count */}
                <div className="p-4 rounded-xl border border-surface-border bg-white shadow-xs space-y-2">
                  <span className="text-xs font-medium text-slate-500">
                    Outcomes Attained
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800">
                      {attainmentData.attainedOutcomesCount}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      / {attainmentData.evaluatedOutcomesCount} evaluated ({attainmentData.totalCourseOutcomes} total)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    COs with attainment score ≥ {targetThreshold}%
                  </p>
                </div>

                {/* 3. Students Evaluated */}
                <div className="p-4 rounded-xl border border-surface-border bg-white shadow-xs space-y-2">
                  <span className="text-xs font-medium text-slate-500">
                    Total Enrolled Students
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-800">
                      {attainmentData.totalEnrolledStudents}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      enrolled
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Active students evaluated on assessments
                  </p>
                </div>

                {/* 4. Benchmark Target */}
                <div className="p-4 rounded-xl border border-surface-border bg-white shadow-xs space-y-2">
                  <span className="text-xs font-medium text-slate-500">
                    Target Benchmark
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-primary-600">
                      {targetThreshold}%
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      score threshold
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Minimum score required to attain a CO
                  </p>
                </div>
              </div>

              {/* CO Attainment Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attainmentData.outcomes.map((co) => {
                  const isAttained = co.status === 'Attained';
                  const hasData = co.attainmentPercentage !== null;

                  return (
                    <div
                      key={co.coId}
                      className={`p-4 rounded-xl border transition-all ${
                        !hasData
                          ? 'border-slate-200 bg-slate-50/50'
                          : isAttained
                          ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/20 to-white'
                          : 'border-rose-200 bg-gradient-to-br from-rose-50/20 to-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-primary-100 text-primary-800 text-xs font-bold tracking-wider">
                            {co.code}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              !hasData
                                ? 'bg-slate-100 text-slate-500'
                                : isAttained
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {co.status}
                          </span>
                        </div>

                        {/* Attainment Percentage Pill */}
                        <span className="text-lg font-black text-slate-800">
                          {hasData ? `${co.attainmentPercentage}%` : '—'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                        {co.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            !hasData
                              ? 'bg-slate-300'
                              : isAttained
                              ? 'bg-emerald-500'
                              : 'bg-rose-500'
                          }`}
                          style={{
                            width: `${Math.min(co.attainmentPercentage || 0, 100)}%`,
                          }}
                        />
                      </div>

                      {/* Details & Actions Footer */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-surface-border">
                        <div className="space-x-2">
                          <span>
                            <strong>{co.mappedQuestionsCount}</strong> Qs ({co.maxMarks}M)
                          </span>
                          <span>•</span>
                          <span>
                            <strong>{co.studentsAttained}</strong>/{co.studentsConsidered} attained
                          </span>
                        </div>

                        {co.studentsBreakdown && co.studentsBreakdown.length > 0 && (
                          <button
                            onClick={() => openCOBreakdown(co)}
                            className="text-xs font-semibold text-primary-600 hover:text-primary-800 hover:underline cursor-pointer"
                          >
                            View Students
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </Card>

      {/* ── 6. Conceptual Future Section: CO-PO Mapping ─────────────── */}
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Network className="w-5 h-5 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700">CO-PO Mapping</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Map course outcomes to program outcomes with 1-3 correlation levels for institutional accreditation and attainment compliance.
        </p>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
          Coming Soon
        </span>
      </Card>

      {/* ── CO Modal Dialog ─────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-border max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="text-base font-bold text-slate-800">
                {editingOutcome ? 'Edit Course Outcome' : 'Add Course Outcome'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formErrors.submit && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formErrors.submit}</span>
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Outcome Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CO1"
                    value={modalFormData.code}
                    onChange={(e) => setModalFormData({ ...modalFormData, code: e.target.value.toUpperCase() })}
                    className={`w-full px-3 py-2 text-sm rounded-lg border ${
                      formErrors.code ? 'border-red-300 bg-red-50/50' : 'border-slate-300'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500`}
                  />
                  {formErrors.code && <p className="text-xs text-red-600 mt-1">{formErrors.code}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Display Order <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={modalFormData.order}
                    onChange={(e) => setModalFormData({ ...modalFormData, order: e.target.value })}
                    className={`w-full px-3 py-2 text-sm rounded-lg border ${
                      formErrors.order ? 'border-red-300 bg-red-50/50' : 'border-slate-300'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500`}
                  />
                  {formErrors.order && <p className="text-xs text-red-600 mt-1">{formErrors.order}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Outcome Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain fundamental concepts..."
                  value={modalFormData.description}
                  onChange={(e) => setModalFormData({ ...modalFormData, description: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    formErrors.description ? 'border-red-300 bg-red-50/50' : 'border-slate-300'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none`}
                />
                {formErrors.description && <p className="text-xs text-red-600 mt-1">{formErrors.description}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={modalSubmitting}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {modalSubmitting ? 'Saving...' : editingOutcome ? 'Save Changes' : 'Create Outcome'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CO Delete Confirmation Modal ─────────────────────────────── */}
      {deleteModalOutcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-border max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Delete Course Outcome</h3>
              <p className="text-sm text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-semibold text-slate-700">{deleteModalOutcome.code}</span>?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleteSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
              >
                {deleteSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assessment Add / Edit Modal Dialog ────────────────────────── */}
      {isAssessmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-border max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="text-base font-bold text-slate-800">
                {editingAssessment ? 'Edit Assessment' : 'Add Course Assessment'}
              </h3>
              <button onClick={closeAssessmentModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {assessmentFormErrors.submit && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{assessmentFormErrors.submit}</span>
              </div>
            )}

            <form onSubmit={handleAssessmentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assessment Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Internal Assessment 1"
                  value={assessmentFormData.name}
                  onChange={(e) => setAssessmentFormData({ ...assessmentFormData, name: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    assessmentFormErrors.name ? 'border-red-300 bg-red-50/50' : 'border-slate-300'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500`}
                />
                {assessmentFormErrors.name && <p className="text-xs text-red-600 mt-1">{assessmentFormErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Evaluation Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assessmentFormData.type}
                    onChange={(e) => setAssessmentFormData({ ...assessmentFormData, type: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
                  >
                    <option value="Internal">Internal Exam</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Quiz">Quiz</option>
                    <option value="Final Exam">Final Exam</option>
                    <option value="Project">Project</option>
                    <option value="Lab">Lab Assessment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={assessmentFormData.status}
                    onChange={(e) => setAssessmentFormData({ ...assessmentFormData, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Marks <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={assessmentFormData.totalMarks}
                    onChange={(e) => setAssessmentFormData({ ...assessmentFormData, totalMarks: e.target.value })}
                    className={`w-full px-3 py-2 text-sm rounded-lg border ${
                      assessmentFormErrors.totalMarks ? 'border-red-300 bg-red-50/50' : 'border-slate-300'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500`}
                  />
                  {assessmentFormErrors.totalMarks && <p className="text-xs text-red-600 mt-1">{assessmentFormErrors.totalMarks}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Weightage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={assessmentFormData.weightage}
                    onChange={(e) => setAssessmentFormData({ ...assessmentFormData, weightage: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={assessmentFormData.date}
                    onChange={(e) => setAssessmentFormData({ ...assessmentFormData, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional evaluation instructions..."
                  value={assessmentFormData.description}
                  onChange={(e) => setAssessmentFormData({ ...assessmentFormData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={closeAssessmentModal}
                  disabled={assessmentSubmitting}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assessmentSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {assessmentSubmitting ? 'Saving...' : editingAssessment ? 'Save Changes' : 'Create Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assessment Delete Confirmation Modal ─────────────────────── */}
      {deleteAssessmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-border max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Delete Assessment</h3>
              <p className="text-sm text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-semibold text-slate-700">{deleteAssessmentModal.name}</span>?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={closeDeleteAssessmentModal}
                disabled={deleteAssessmentSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAssessmentConfirm}
                disabled={deleteAssessmentSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
              >
                {deleteAssessmentSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Enroll Student Modal Dialog ─────────────────────────────── */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-border max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Enroll Students
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Find and enroll registered students in this course.
                </p>
              </div>
              <button onClick={closeEnrollModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name or email..."
                value={studentSearchQuery}
                onChange={handleSearchInputChange}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                autoFocus
              />
            </div>

            {/* Candidate List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-surface-border border border-surface-border rounded-xl">
              {candidateLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="h-4 bg-slate-200 rounded w-28" />
                        <div className="h-3 bg-slate-100 rounded w-40" />
                      </div>
                      <div className="h-7 bg-slate-200 rounded w-16" />
                    </div>
                  ))}
                </div>
              ) : candidateStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium text-slate-700">No students found</p>
                  <p className="mt-1">
                    {studentSearchQuery ? 'Try adjusting your search keywords.' : 'No student accounts are registered yet.'}
                  </p>
                </div>
              ) : (
                candidateStudents.map((candidate) => {
                  const initials = (candidate.name || 'S')
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <div
                      key={candidate._id}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {candidate.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {candidate.email}
                            {candidate.department ? ` • ${candidate.department}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {candidate.isEnrolled ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Enrolled
                          </span>
                        ) : (
                          <button
                            onClick={() => handleEnrollStudent(candidate._id)}
                            disabled={enrollingId === candidate._id}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Plus className="w-3 h-3" />
                            {enrollingId === candidate._id ? 'Enrolling...' : 'Enroll'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={closeEnrollModal}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove Student Confirmation Modal ────────────────────────── */}
      {deleteStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-border max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Remove Student</h3>
              <p className="text-sm text-slate-500 mt-1">
                Are you sure you want to remove{' '}
                <span className="font-semibold text-slate-700">
                  {deleteStudentModal.student?.name || 'this student'}
                </span>{' '}
                from this course?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={closeDeleteStudentModal}
                disabled={deleteStudentSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStudentConfirm}
                disabled={deleteStudentSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
              >
                {deleteStudentSubmitting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Student CO Breakdown Modal ─────────────────────────────── */}
      {selectedCOBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-border max-w-2xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-primary-100 text-primary-800 text-xs font-bold">
                    {selectedCOBreakdown.code}
                  </span>
                  <h3 className="text-base font-bold text-slate-800">
                    Student Attainment Breakdown
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {selectedCOBreakdown.description}
                </p>
              </div>
              <button
                onClick={closeCOBreakdown}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl border border-surface-border">
              <div>
                <span className="text-slate-500">Benchmark Target: </span>
                <span className="font-bold text-slate-800">{targetThreshold}%</span>
              </div>
              <div>
                <span className="text-slate-500">Total Max Marks: </span>
                <span className="font-bold text-slate-800">{selectedCOBreakdown.maxMarks} Marks</span>
              </div>
              <div>
                <span className="text-slate-500">Attainment: </span>
                <span className="font-bold text-emerald-600">
                  {selectedCOBreakdown.studentsAttained} / {selectedCOBreakdown.studentsConsidered} ({selectedCOBreakdown.attainmentPercentage}%)
                </span>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto border border-surface-border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-surface-border sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5">Student</th>
                    <th className="px-3 py-2.5 text-center">Score / Max</th>
                    <th className="px-3 py-2.5 text-center">Percentage</th>
                    <th className="px-3 py-2.5 text-right">Attained</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {selectedCOBreakdown.studentsBreakdown.map((s) => (
                    <tr key={s.studentId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-800">{s.name}</p>
                        <p className="text-[11px] text-slate-400">{s.email}</p>
                      </td>
                      <td className="px-3 py-2 text-center font-medium text-slate-700">
                        {s.marksObtained} / {s.maxMarks}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`font-bold ${
                            s.studentPercentage >= targetThreshold
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {s.studentPercentage}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            s.isAttained
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {s.isAttained ? '✓ Yes' : '✗ No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={closeCOBreakdown}
                className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
