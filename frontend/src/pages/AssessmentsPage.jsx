import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import {
  ClipboardList,
  AlertCircle,
  Calendar,
  Building2,
  BookOpen,
  ArrowRight,
  Filter,
} from 'lucide-react';

export default function AssessmentsPage() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const fetchAssessments = async () => {
      setLoading(true);
      try {
        const response = await api.get('/api/assessments');
        setAssessments(response.data.data);
      } catch (err) {
        const message =
          err.response?.data?.message ||
          'Failed to load assessments. Please try again.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, []);

  const filteredAssessments = assessments.filter((a) => {
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    return matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Assessments"
          description="Loading your assessments..."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-surface-border p-5 h-44 animate-pulse space-y-3"
            >
              <div className="h-4 bg-slate-100 rounded w-28" />
              <div className="h-5 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mt-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assessments" />
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Error loading assessments</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Assessments"
          description={`Showing ${filteredAssessments.length} assessment${filteredAssessments.length !== 1 ? 's' : ''} across your assigned courses.`}
        />

        {/* Filters */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-surface-border text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="all">All Types</option>
            <option value="Internal">Internal Exam</option>
            <option value="Assignment">Assignment</option>
            <option value="Quiz">Quiz</option>
            <option value="Final Exam">Final Exam</option>
            <option value="Project">Project</option>
            <option value="Lab">Lab Assessment</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-surface-border text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {assessments.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No assessments found"
            message="You have not created any assessments yet. Visit your course details page to add your first assessment."
            action={
              <button
                onClick={() => navigate('/courses')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer"
              >
                Go to My Courses
              </button>
            }
          />
        </Card>
      ) : filteredAssessments.length === 0 ? (
        <Card>
          <EmptyState
            icon={Filter}
            title="No matching assessments"
            message="No assessments match the selected filter criteria."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssessments.map((a) => (
            <div
              key={a._id}
              className="bg-white rounded-xl border border-surface-border shadow-xs hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">
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

                <h3 className="text-base font-bold text-slate-800 leading-snug">
                  {a.name}
                </h3>

                {a.course && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-700">{a.course.courseCode}</span>
                    <span>-</span>
                    <span className="truncate">{a.course.courseName}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-surface-border flex items-center justify-between text-xs text-slate-500">
                <div>
                  <span className="font-semibold text-slate-700">{a.totalMarks} Marks</span>
                  {a.weightage > 0 && <span className="ml-2">• {a.weightage}% Wt</span>}
                </div>

                {a.course && (
                  <button
                    onClick={() => navigate(`/courses/${a.course._id}`)}
                    className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-semibold cursor-pointer"
                  >
                    View in Course
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
