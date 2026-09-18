import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import {
  BookOpen,
  AlertCircle,
  ArrowRight,
  Calendar,
  Hash,
  Building2,
  GraduationCap,
} from 'lucide-react';

/**
 * CoursesPage — displays courses assigned to the logged-in faculty.
 * Fetches from GET /api/courses/my-courses.
 */
export default function CoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get('/api/courses/my-courses');
        setCourses(response.data.data);
      } catch (err) {
        const message =
          err.response?.data?.message ||
          'Failed to load courses. Please try again.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // ── Loading State ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Courses"
          description="Loading your courses..."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-surface-border shadow-sm p-5 h-48 animate-pulse"
            >
              <div className="space-y-3">
                <div className="h-4 bg-slate-100 rounded w-24" />
                <div className="h-5 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2 mt-4" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error State ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Courses" />
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Error loading courses</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty State ─────────────────────────────────────────────────────
  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Courses"
          description="View and manage your assigned courses."
        />
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No courses assigned"
            message="You don't have any courses assigned yet. Courses will appear here once an administrator assigns them to you."
          />
        </Card>
      </div>
    );
  }

  // ── Courses List ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Courses"
        description={`You have ${courses.length} course${courses.length !== 1 ? 's' : ''} assigned.`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {courses.map((course) => (
          <div
            key={course._id}
            className="bg-white rounded-xl border border-surface-border shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 group"
          >
            {/* Card Header */}
            <div className="p-5 pb-3">
              <div className="flex items-start justify-between mb-2">
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
              <h3 className="text-base font-semibold text-slate-800 leading-snug">
                {course.courseName}
              </h3>
            </div>

            {/* Card Details */}
            <div className="px-5 pb-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{course.department}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sem {course.semester}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span>{course.credits} Credits</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{course.academicYear}</span>
              </div>
            </div>

            {/* Card Action */}
            <div className="px-5 py-3 border-t border-surface-border">
              <button
                onClick={() => navigate(`/courses/${course._id}`)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
              >
                View Course
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
