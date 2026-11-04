import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { listCoursesApi } from '../../api/admin';
import { listAssessmentsApi } from '../../api/faculty';
import { PageHeader, Card, FormSelect, EmptyState } from '../../components/ui/AdminUI';
import { useToast, ToastContainer } from '../../components/ui/Toast';
import MarksSheet from '../../components/marks/MarksSheet';
import { BookOpen } from 'lucide-react';

export default function MarksEntryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toasts, showToast } = useToast();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get('courseId') || '');
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(searchParams.get('assessmentId') || '');

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingAssessments, setLoadingAssessments] = useState(false);

  // 1. Fetch courses
  useEffect(() => {
    setLoadingCourses(true);
    listCoursesApi()
      .then((res) => {
        const list = res.data || [];
        setCourses(list);
        setSelectedCourseId((prev) => prev || list[0]?._id || '');
      })
      .catch((err) => showToast(err.response?.data?.message || 'Failed to load courses', 'error'))
      .finally(() => setLoadingCourses(false));
  }, [showToast]);

  // 2. Fetch assessments when course changes
  useEffect(() => {
    if (!selectedCourseId) {
      setAssessments([]);
      setSelectedAssessmentId('');
      return;
    }

    setLoadingAssessments(true);
    listAssessmentsApi(selectedCourseId)
      .then((res) => {
        const list = res.data || [];
        setAssessments(list);
        // Keep the assessment from the URL if it belongs to this course, otherwise pick the first
        setSelectedAssessmentId((prev) => (list.some((a) => a._id === prev) ? prev : list[0]?._id || ''));
      })
      .catch((err) => showToast(err.response?.data?.message || 'Failed to load assessments', 'error'))
      .finally(() => setLoadingAssessments(false));
  }, [selectedCourseId, showToast]);

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />

      <PageHeader
        title="Student Marks Entry"
        subtitle="Type or paste marks like a spreadsheet. Changes save automatically."
        action={
          selectedCourseId && (
            <Link
              to={`/courses/${selectedCourseId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-ink bg-paper hover:bg-surface border border-border transition-colors shadow-sm"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Course Setup</span>
            </Link>
          )
        }
      />

      {/* Selectors Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            label="Course"
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              setSearchParams({ courseId: e.target.value });
            }}
            options={courses.map((c) => ({
              value: c._id,
              label: `${c.code} — ${c.name} (${c.academicYear}, Sem ${c.semester})`,
            }))}
            disabled={loadingCourses}
          />

          <FormSelect
            label="Assessment"
            value={selectedAssessmentId}
            onChange={(e) => {
              setSelectedAssessmentId(e.target.value);
              setSearchParams({ courseId: selectedCourseId, assessmentId: e.target.value });
            }}
            options={assessments.map((a) => ({
              value: a._id,
              label: `${a.name} (Max ${a.maxMarks} marks)`,
            }))}
            disabled={loadingAssessments || assessments.length === 0}
          />
        </div>
      </Card>

      {!selectedCourseId || !selectedAssessmentId ? (
        <Card>
          <EmptyState message="Select a course and assessment to enter marks." />
        </Card>
      ) : (
        <Card className="p-4 sm:p-5">
          <MarksSheet key={selectedAssessmentId} assessmentId={selectedAssessmentId} showToast={showToast} />
        </Card>
      )}
    </div>
  );
}
