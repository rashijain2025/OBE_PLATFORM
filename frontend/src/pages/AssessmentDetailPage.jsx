import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Plus,
  Pencil,
  Trash2,
  X,
  ClipboardList,
  Hash,
  Award,
  FileText,
  Target,
  Layers,
  HelpCircle,
  Save,
  RotateCcw,
  Search,
  Users,
} from 'lucide-react';

const QUESTION_TYPES = ['MCQ', 'Short Answer', 'Long Answer', 'Numerical', 'Other'];

export default function AssessmentDetailPage() {
  const { courseId, assessmentId } = useParams();
  const navigate = useNavigate();

  // ── Assessment & course state ──────────────────────────────────────
  const [assessment, setAssessment] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Course Outcomes (for dropdown) ──────────────────────────────────
  const [outcomes, setOutcomes] = useState([]);

  // ── Questions state ────────────────────────────────────────────────
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsError, setQuestionsError] = useState('');
  const [feedback, setFeedback] = useState(null);

  // ── Question modal state ───────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    questionText: '',
    questionNumber: 1,
    marks: 5,
    questionType: 'Short Answer',
    co: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ── Delete modal state ─────────────────────────────────────────────
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // ── Student Marks state ────────────────────────────────────────────
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [marksLoading, setMarksLoading] = useState(true);
  const [marksError, setMarksError] = useState('');
  const [marksFeedback, setMarksFeedback] = useState(null);
  const [localMarks, setLocalMarks] = useState({});
  const [initialMarks, setInitialMarks] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [savingRowStudentId, setSavingRowStudentId] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [assessmentAttainment, setAssessmentAttainment] = useState([]);

  // ── Fetch Assessment + Course ──────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assessmentRes, courseRes, outcomesRes] = await Promise.all([
          api.get(`/api/courses/${courseId}/assessments/${assessmentId}`),
          api.get(`/api/courses/${courseId}`),
          api.get(`/api/courses/${courseId}/outcomes`),
        ]);
        setAssessment(assessmentRes.data.data);
        setCourse(courseRes.data.data);
        setOutcomes(outcomesRes.data.data);
      } catch (err) {
        const message =
          err.response?.data?.message ||
          'Failed to load assessment details.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, assessmentId]);

  // ── Fetch Questions ────────────────────────────────────────────────
  const fetchQuestions = async () => {
    setQuestionsLoading(true);
    setQuestionsError('');
    try {
      const response = await api.get(`/api/assessments/${assessmentId}/questions`);
      setQuestions(response.data.data);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to load questions.';
      setQuestionsError(message);
    } finally {
      setQuestionsLoading(false);
    }
  };

  // ── Fetch Student Marks ─────────────────────────────────────────────
  const fetchMarks = async () => {
    setMarksLoading(true);
    setMarksError('');
    try {
      const response = await api.get(`/api/assessments/${assessmentId}/marks`);
      const { students, marks } = response.data.data;
      setEnrolledStudents(students || []);

      const marksMap = {};
      (marks || []).forEach((m) => {
        const sId = m.student?._id || m.student;
        const qId = m.question?._id || m.question;
        marksMap[`${sId}_${qId}`] = m.marksObtained;
      });
      setLocalMarks(marksMap);
      setInitialMarks(marksMap);
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to load student marks.';
      setMarksError(message);
    } finally {
      setMarksLoading(false);
    }
  };

  const fetchAssessmentAttainment = async () => {
    try {
      const res = await api.get(`/api/assessments/${assessmentId}/attainment`);
      setAssessmentAttainment(res.data.data?.outcomes || []);
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    if (assessmentId) {
      fetchQuestions();
      fetchMarks();
      fetchAssessmentAttainment();
    }
  }, [assessmentId]);

  // ── Auto-dismiss feedback ──────────────────────────────────────────
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    if (marksFeedback) {
      const timer = setTimeout(() => setMarksFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [marksFeedback]);

  // ── Modal handlers ─────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingQuestion(null);
    setFormData({
      questionText: '',
      questionNumber: questions.length + 1,
      marks: 5,
      questionType: 'Short Answer',
      co: outcomes.length > 0 ? outcomes[0]._id : '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (question) => {
    setEditingQuestion(question);
    setFormData({
      questionText: question.questionText,
      questionNumber: question.questionNumber,
      marks: question.marks,
      questionType: question.questionType,
      co: question.co?._id || question.co || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingQuestion(null);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.questionText.trim()) errors.questionText = 'Question text is required';
    if (!formData.questionNumber || Number(formData.questionNumber) < 1) {
      errors.questionNumber = 'Question number must be ≥ 1';
    }
    if (!formData.marks || Number(formData.marks) < 0.5) {
      errors.marks = 'Marks must be ≥ 0.5';
    }
    if (!formData.co) errors.co = 'Please select a Course Outcome';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        questionText: formData.questionText.trim(),
        questionNumber: Number(formData.questionNumber),
        marks: Number(formData.marks),
        questionType: formData.questionType,
        co: formData.co,
      };

      if (editingQuestion) {
        const response = await api.put(
          `/api/assessments/${assessmentId}/questions/${editingQuestion._id}`,
          payload
        );
        setFeedback({
          type: 'success',
          message: response.data.message || 'Question updated successfully.',
        });
      } else {
        const response = await api.post(
          `/api/assessments/${assessmentId}/questions`,
          payload
        );
        setFeedback({
          type: 'success',
          message: response.data.message || 'Question created successfully.',
        });
      }
      closeModal();
      await fetchQuestions();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to save question. Please try again.';
      setFormErrors({ submit: message });
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (question) => setDeleteModal(question);
  const closeDeleteModal = () => setDeleteModal(null);

  const handleDeleteConfirm = async () => {
    if (!deleteModal) return;
    setDeleteSubmitting(true);
    try {
      const response = await api.delete(
        `/api/assessments/${assessmentId}/questions/${deleteModal._id}`
      );
      setFeedback({
        type: 'success',
        message: response.data.message || 'Question deleted successfully.',
      });
      closeDeleteModal();
      await fetchQuestions();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to delete question. Please try again.';
      setFeedback({ type: 'error', message });
      closeDeleteModal();
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // ── Student Marks Handlers ─────────────────────────────────────────
  const handleMarkChange = (studentId, questionId, value) => {
    setLocalMarks((prev) => ({
      ...prev,
      [`${studentId}_${questionId}`]: value,
    }));
  };

  const handleResetMarks = () => {
    setLocalMarks({ ...initialMarks });
    setMarksFeedback(null);
  };

  const getMarkError = (studentId, questionId, maxMarks) => {
    const val = localMarks[`${studentId}_${questionId}`];
    if (val === undefined || val === '' || val === null) return null;
    const num = Number(val);
    if (isNaN(num)) return 'Invalid number';
    if (num < 0) return 'Cannot be negative';
    if (num > maxMarks) return `Max is ${maxMarks}`;
    return null;
  };

  const hasUnsavedChanges = Object.keys(localMarks).some(
    (key) => localMarks[key] !== initialMarks[key]
  );

  const hasAnyMarkError = enrolledStudents.some((student) =>
    questions.some((q) => getMarkError(student._id, q._id, q.marks))
  );

  const handleSaveStudentRow = async (studentId) => {
    setSavingRowStudentId(studentId);
    try {
      const rowEntries = [];
      for (const q of questions) {
        const val = localMarks[`${studentId}_${q._id}`];
        if (val !== undefined && val !== '' && val !== null) {
          const num = Number(val);
          if (isNaN(num) || num < 0 || num > q.marks) {
            setMarksFeedback({
              type: 'error',
              message: `Invalid mark value for Q${q.questionNumber}. Must be between 0 and ${q.marks}.`,
            });
            setSavingRowStudentId(null);
            return;
          }
          rowEntries.push({
            studentId,
            questionId: q._id,
            marksObtained: num,
          });
        }
      }

      if (rowEntries.length === 0) {
        setMarksFeedback({
          type: 'error',
          message: 'No marks entered to save for this student.',
        });
        setSavingRowStudentId(null);
        return;
      }

      await api.post(`/api/assessments/${assessmentId}/marks`, { marks: rowEntries });

      setInitialMarks((prev) => {
        const next = { ...prev };
        rowEntries.forEach((r) => {
          next[`${r.studentId}_${r.questionId}`] = r.marksObtained;
        });
        return next;
      });

      setMarksFeedback({
        type: 'success',
        message: `Marks saved successfully for student.`,
      });
      await fetchMarks();
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to save student marks.';
      setMarksFeedback({ type: 'error', message });
    } finally {
      setSavingRowStudentId(null);
    }
  };

  const handleSaveAllMarks = async () => {
    setSavingAll(true);
    try {
      const allEntries = [];
      for (const student of enrolledStudents) {
        for (const q of questions) {
          const val = localMarks[`${student._id}_${q._id}`];
          if (val !== undefined && val !== '' && val !== null) {
            const num = Number(val);
            if (isNaN(num) || num < 0 || num > q.marks) {
              setMarksFeedback({
                type: 'error',
                message: `Invalid mark value for student ${student.name} on Q${q.questionNumber}. Must be between 0 and ${q.marks}.`,
              });
              setSavingAll(false);
              return;
            }
            allEntries.push({
              studentId: student._id,
              questionId: q._id,
              marksObtained: num,
            });
          }
        }
      }

      if (allEntries.length === 0) {
        setMarksFeedback({
          type: 'error',
          message: 'No marks entered to save.',
        });
        setSavingAll(false);
        return;
      }

      const res = await api.post(`/api/assessments/${assessmentId}/marks`, { marks: allEntries });

      setMarksFeedback({
        type: 'success',
        message: res.data.message || `Marks saved successfully for ${allEntries.length} entries.`,
      });
      await fetchMarks();
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to save marks. Please try again.';
      setMarksFeedback({ type: 'error', message });
    } finally {
      setSavingAll(false);
    }
  };

  // ── Computed values ────────────────────────────────────────────────
  const totalQuestionMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const coMapping = {};
  questions.forEach((q) => {
    const coCode = q.co?.code || 'Unmapped';
    if (!coMapping[coCode]) coMapping[coCode] = { marks: 0, count: 0 };
    coMapping[coCode].marks += q.marks;
    coMapping[coCode].count += 1;
  });

  const backButton = (
    <button
      onClick={() => navigate(`/courses/${courseId}`)}
      className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Course
    </button>
  );

  // ── Loading / Error ────────────────────────────────────────────────
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

  if (error || !assessment) {
    return (
      <div className="space-y-6">
        {backButton}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Error loading assessment</p>
            <p className="text-sm text-red-600">{error || 'Assessment not found.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusColors = {
    active: 'bg-blue-50 text-blue-700',
    draft: 'bg-slate-100 text-slate-600',
    completed: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <div className="space-y-8">
      {backButton}

      {/* ── 1. Assessment Information Card ──────────────────────────── */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold tracking-wide">
                {assessment.type}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  statusColors[assessment.status] || 'bg-slate-100 text-slate-600'
                }`}
              >
                {assessment.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              {assessment.name}
            </h1>
            {assessment.description && (
              <p className="text-sm text-slate-500 mt-1.5 max-w-3xl">
                {assessment.description}
              </p>
            )}
            {course && (
              <p className="text-xs text-slate-400 mt-2">
                <span className="font-semibold text-slate-500">{course.courseCode}</span>
                {' — '}
                {course.courseName}
              </p>
            )}
          </div>
        </div>

        {/* Assessment details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-surface-border shrink-0">
              <Award className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Marks</p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">{assessment.totalMarks}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-surface-border shrink-0">
              <Layers className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Weightage</p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">{assessment.weightage || 0}%</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-surface-border shrink-0">
              <ClipboardList className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Questions</p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">{questions.length}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-surface-border shrink-0">
              <Hash className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Q. Marks Sum</p>
              <p className={`text-sm font-semibold mt-0.5 ${
                totalQuestionMarks === assessment.totalMarks
                  ? 'text-emerald-600'
                  : totalQuestionMarks > assessment.totalMarks
                  ? 'text-red-600'
                  : 'text-amber-600'
              }`}>
                {totalQuestionMarks} / {assessment.totalMarks}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Feedback banner ─────────────────────────────────────────── */}
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

      {/* ── 2. Questions Section ────────────────────────────────────── */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">
                Questions
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {questions.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Add questions and map each to a Course Outcome for OBE attainment tracking.
            </p>
          </div>

          <button
            onClick={openAddModal}
            disabled={outcomes.length === 0}
            title={outcomes.length === 0 ? 'Add Course Outcomes first' : 'Add a new question'}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>

        {/* No COs warning */}
        {outcomes.length === 0 && !loading && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              No Course Outcomes defined for this course. Please{' '}
              <button
                onClick={() => navigate(`/courses/${courseId}`)}
                className="font-semibold underline hover:no-underline cursor-pointer"
              >
                add COs first
              </button>
              {' '}before creating questions.
            </span>
          </div>
        )}

        <div className="pt-4">
          {questionsLoading ? (
            <div className="space-y-3 py-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-surface-border bg-slate-50/50 animate-pulse space-y-2"
                >
                  <div className="h-4 bg-slate-200 rounded w-20" />
                  <div className="h-3 bg-slate-200 rounded w-5/6" />
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : questionsError ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{questionsError}</span>
            </div>
          ) : questions.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={HelpCircle}
                title="No questions added"
                message="Add questions to this assessment and map each to a Course Outcome for OBE attainment tracking."
                action={
                  outcomes.length > 0 ? (
                    <button
                      onClick={openAddModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add First Question
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q) => (
                <div
                  key={q._id}
                  className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-xl border border-surface-border hover:border-slate-300 hover:shadow-xs bg-white transition-all group"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Question number badge */}
                    <span className="inline-flex items-center justify-center min-w-[2.25rem] h-9 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold shrink-0">
                      Q{q.questionNumber}
                    </span>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 leading-relaxed break-words">
                        {q.questionText}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
                          <Award className="w-3 h-3" />
                          {q.marks} Marks
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          <FileText className="w-3 h-3" />
                          {q.questionType}
                        </span>

                        {q.co && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-50 text-primary-700 font-semibold">
                            <Target className="w-3 h-3" />
                            {q.co.code}
                          </span>
                        )}
                      </div>

                      {q.co?.description && (
                        <p className="text-xs text-slate-400 italic">
                          CO: {q.co.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => openEditModal(q)}
                      title="Edit Question"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(q)}
                      title="Delete Question"
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

      {/* ── 3. Question → CO Mapping Summary ───────────────────────── */}
      {questions.length > 0 && (
        <Card>
          <div className="pb-4 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">
                Question → CO Mapping
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Summary of marks distribution across Course Outcomes for this assessment.
            </p>
          </div>

          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(coMapping)
              .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
              .map(([code, data]) => {
                const att = assessmentAttainment.find((a) => a.code === code);
                return (
                  <div
                    key={code}
                    className="p-3 rounded-xl border border-surface-border bg-gradient-to-br from-primary-50/50 to-white"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-primary-100 text-primary-800 text-xs font-bold tracking-wider">
                        {code}
                      </span>
                      {att && att.attainmentPercentage !== null && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            att.status === 'Attained'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                          title={`${att.studentsAttained} of ${att.studentsConsidered} students attained`}
                        >
                          {att.attainmentPercentage}% Attained
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{data.count} question{data.count !== 1 ? 's' : ''}</span>
                      <span className="font-semibold text-slate-700">{data.marks} marks</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* ── 4. Student Assessment Marks Section ───────────────────── */}
      {marksFeedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            marksFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {marksFeedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{marksFeedback.message}</span>
          </div>
          <button
            onClick={() => setMarksFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">
                Student Assessment Marks
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {enrolledStudents.length} Students
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                {questions.length} Questions
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Enter and manage question-wise marks for enrolled students. Marks directly map to Course Outcomes for OBE attainment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 w-36 sm:w-44"
              />
            </div>

            {/* Reset Button */}
            {hasUnsavedChanges && (
              <button
                onClick={handleResetMarks}
                disabled={savingAll}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                title="Discard unsaved changes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}

            {/* Save All Button */}
            <button
              onClick={handleSaveAllMarks}
              disabled={savingAll || !hasUnsavedChanges || hasAnyMarkError}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                !hasUnsavedChanges || hasAnyMarkError
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700 cursor-pointer'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {savingAll ? 'Saving All...' : hasUnsavedChanges ? 'Save All Changes' : 'All Marks Saved'}
            </button>
          </div>
        </div>

        <div className="pt-4">
          {marksLoading ? (
            <div className="space-y-3 py-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-surface-border bg-slate-50/50 animate-pulse flex items-center justify-between"
                >
                  <div className="h-4 bg-slate-200 rounded w-36" />
                  <div className="flex gap-3">
                    <div className="h-8 bg-slate-200 rounded w-16" />
                    <div className="h-8 bg-slate-200 rounded w-16" />
                    <div className="h-8 bg-slate-200 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : marksError ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{marksError}</span>
            </div>
          ) : questions.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={HelpCircle}
                title="No assessment questions created"
                message="Add questions above before entering student marks."
                action={
                  outcomes.length > 0 ? (
                    <button
                      onClick={openAddModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Question
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : enrolledStudents.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={Users}
                title="No students enrolled in this course"
                message="Enroll students into this course from the Course Details page to start recording their assessment marks."
                action={
                  <button
                    onClick={() => navigate(`/courses/${courseId}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Go to Course Details
                  </button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-surface-border">
                  <tr>
                    <th className="px-4 py-3 min-w-[200px]">Student</th>
                    {questions.map((q) => (
                      <th
                        key={q._id}
                        className="px-3 py-3 text-center min-w-[100px]"
                      >
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-slate-800">
                            Q{q.questionNumber}
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            Max: {q.marks}M
                          </span>
                          {q.co && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-50 text-primary-700">
                              {q.co.code}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center min-w-[90px]">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-800">Total</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          /{totalQuestionMarks}M
                        </span>
                      </div>
                    </th>
                    <th className="px-3 py-3 text-right min-w-[80px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {enrolledStudents
                    .filter((s) => {
                      if (!studentSearch.trim()) return true;
                      const q = studentSearch.toLowerCase();
                      return (
                        s.name?.toLowerCase().includes(q) ||
                        s.email?.toLowerCase().includes(q)
                      );
                    })
                    .map((student) => {
                      const initials = (student.name || 'S')
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      let studentTotal = 0;
                      let hasRowChanged = false;
                      let rowHasError = false;

                      questions.forEach((q) => {
                        const cellKey = `${student._id}_${q._id}`;
                        const currentVal = localMarks[cellKey];
                        const origVal = initialMarks[cellKey];
                        if (currentVal !== origVal) hasRowChanged = true;

                        if (currentVal !== undefined && currentVal !== '' && currentVal !== null) {
                          const num = Number(currentVal);
                          if (!isNaN(num)) {
                            studentTotal += num;
                            if (num < 0 || num > q.marks) rowHasError = true;
                          } else {
                            rowHasError = true;
                          }
                        }
                      });

                      const isSavingRow = savingRowStudentId === student._id;

                      return (
                        <tr
                          key={student._id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 text-sm truncate">
                                  {student.name}
                                </p>
                                <p className="text-xs text-slate-400 truncate">
                                  {student.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {questions.map((q) => {
                            const cellKey = `${student._id}_${q._id}`;
                            const val = localMarks[cellKey] ?? '';
                            const error = getMarkError(student._id, q._id, q.marks);
                            const isDirty = localMarks[cellKey] !== initialMarks[cellKey];

                            return (
                              <td key={q._id} className="px-3 py-2.5 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max={q.marks}
                                    step="any"
                                    placeholder="—"
                                    value={val}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student._id,
                                        q._id,
                                        e.target.value
                                      )
                                    }
                                    className={`w-16 px-2 py-1.5 text-center text-sm font-semibold rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                                      error
                                        ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400/20'
                                        : isDirty
                                        ? 'border-amber-400 bg-amber-50/50 text-amber-900 focus:ring-amber-400/20'
                                        : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 focus:ring-primary-500/20 focus:border-primary-500'
                                    }`}
                                  />
                                  {error && (
                                    <span className="text-[10px] font-medium text-red-600 mt-0.5 whitespace-nowrap">
                                      {error}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}

                          {/* Row Total */}
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                                studentTotal > assessment.totalMarks
                                  ? 'bg-red-50 text-red-700'
                                  : studentTotal > 0
                                  ? 'bg-primary-50 text-primary-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {studentTotal}
                            </span>
                          </td>

                          {/* Row Actions */}
                          <td className="px-3 py-2.5 text-right">
                            <button
                              onClick={() => handleSaveStudentRow(student._id)}
                              disabled={isSavingRow || !hasRowChanged || rowHasError}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                !hasRowChanged || rowHasError
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-primary-600 hover:text-primary-800 hover:bg-primary-50 cursor-pointer font-semibold'
                              }`}
                              title="Save this row"
                            >
                              <Save className="w-3.5 h-3.5" />
                              {isSavingRow ? 'Saving...' : 'Save'}
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

      {/* ── Question Add / Edit Modal ──────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-border max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="text-base font-bold text-slate-800">
                {editingQuestion ? 'Edit Question' : 'Add Question'}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Question text */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Question Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter the question text..."
                  value={formData.questionText}
                  onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    formErrors.questionText ? 'border-red-300 bg-red-50/50' : 'border-slate-300'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none`}
                />
                {formErrors.questionText && <p className="text-xs text-red-600 mt-1">{formErrors.questionText}</p>}
              </div>

              {/* Question number + marks + type row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Q. No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.questionNumber}
                    onChange={(e) => setFormData({ ...formData, questionNumber: e.target.value })}
                    className={`w-full px-3 py-2 text-sm rounded-lg border ${
                      formErrors.questionNumber ? 'border-red-300 bg-red-50/50' : 'border-slate-300'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500`}
                  />
                  {formErrors.questionNumber && <p className="text-xs text-red-600 mt-1">{formErrors.questionNumber}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marks <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={formData.marks}
                    onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
                    className={`w-full px-3 py-2 text-sm rounded-lg border ${
                      formErrors.marks ? 'border-red-300 bg-red-50/50' : 'border-slate-300'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500`}
                  />
                  {formErrors.marks && <p className="text-xs text-red-600 mt-1">{formErrors.marks}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.questionType}
                    onChange={(e) => setFormData({ ...formData, questionType: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CO dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Outcome (CO) <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.co}
                  onChange={(e) => setFormData({ ...formData, co: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    formErrors.co ? 'border-red-300 bg-red-50/50' : 'border-slate-300'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white`}
                >
                  <option value="">— Select Course Outcome —</option>
                  {outcomes.map((co) => (
                    <option key={co._id} value={co._id}>
                      {co.code} — {co.description}
                    </option>
                  ))}
                </select>
                {formErrors.co && <p className="text-xs text-red-600 mt-1">{formErrors.co}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingQuestion ? 'Save Changes' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Question Delete Confirmation Modal ─────────────────────── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-border max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Delete Question</h3>
              <p className="text-sm text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-semibold text-slate-700">Q{deleteModal.questionNumber}</span>?
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
    </div>
  );
}
