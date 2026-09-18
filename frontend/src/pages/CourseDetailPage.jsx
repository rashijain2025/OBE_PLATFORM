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

  useEffect(() => {
    if (courseId) {
      fetchOutcomes();
      fetchAssessments();
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

      {/* ── 4. Conceptual Future Sections ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CO-PO Mapping Placeholder */}
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Network className="w-5 h-5 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-700">CO-PO Mapping</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Map course outcomes to program outcomes with 1-3 correlation levels.
          </p>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
            Coming Soon
          </span>
        </Card>

        {/* Attainment Placeholder */}
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <FileBarChart className="w-5 h-5 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-700">CO Attainment</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Calculate outcome achievement percentages and generate compliance reports.
          </p>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
            Coming Soon
          </span>
        </Card>
      </div>

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
    </div>
  );
}
