import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import {
  FileBarChart,
  Download,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Target,
  Users,
  Award,
  RefreshCw,
  Building2,
  Calendar,
  Hash,
  ArrowUpRight,
  Info,
  Clock,
  ChevronDown,
} from 'lucide-react';

/**
 * ReportsPage — Faculty OBE Performance Reports & Analytics.
 * Connects to GET /api/courses/:courseId/report and GET /api/courses/:courseId/report?format=csv
 */
export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get('courseId') || '');
  const [report, setReport] = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  // 1. Fetch faculty courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const response = await api.get('/api/courses/my-courses');
        const courseList = response.data.data || [];
        setCourses(courseList);

        // If no courseId in URL, default to first course
        if (courseList.length > 0) {
          const initialId = searchParams.get('courseId') || courseList[0]._id;
          setSelectedCourseId(initialId);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load faculty courses.');
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, []);

  // 2. Fetch report data when selectedCourseId changes
  useEffect(() => {
    if (!selectedCourseId) return;

    const fetchReport = async () => {
      try {
        setLoadingReport(true);
        setError('');
        const response = await api.get(`/api/courses/${selectedCourseId}/report`);
        setReport(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to generate OBE report.');
        setReport(null);
      } finally {
        setLoadingReport(false);
      }
    };

    fetchReport();
    setSearchParams({ courseId: selectedCourseId });
  }, [selectedCourseId]);

  // Handle course switch
  const handleCourseChange = (e) => {
    setSelectedCourseId(e.target.value);
  };

  // Handle CSV Export
  const handleExportCSV = async () => {
    if (!selectedCourseId) return;
    try {
      setDownloading(true);
      const response = await api.get(`/api/courses/${selectedCourseId}/report?format=csv`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const courseCode = report?.course?.courseCode || 'Course';
      link.setAttribute('download', `OBE_Report_${courseCode}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download CSV report: ' + (err.response?.data?.message || err.message));
    } finally {
      setDownloading(false);
    }
  };

  // Helper for Bloom's Taxonomy badges
  const getBloomBadgeColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'remember':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'understand':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'apply':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'analyze':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'evaluate':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'create':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-primary-50 text-primary-700 border-primary-200';
    }
  };

  // ── Loading state for courses ──────────────────────────────────────
  if (loadingCourses) {
    return (
      <div className="space-y-6">
        <PageHeader title="OBE Performance Reports" description="Loading course analytics..." />
        <div className="h-32 bg-white rounded-xl border border-surface-border animate-pulse p-6" />
      </div>
    );
  }

  // ── No courses assigned to faculty ─────────────────────────────────
  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="OBE Performance Reports" description="Comprehensive outcome attainment analytics and exports." />
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No Courses Assigned"
            message="You currently do not have any courses assigned to generate OBE reports. Please check your assigned courses."
          />
        </Card>
      </div>
    );
  }

  const selectedCourse = courses.find((c) => c._id === selectedCourseId) || courses[0];
  const summary = report?.summary;
  const outcomes = report?.outcomes || [];
  const belowTargetOutcomes = report?.belowTargetOutcomes || [];
  const target = report?.targetPercentage || 40;

  return (
    <div className="space-y-8 pb-12">
      {/* ── Page Header & Course Selector ───────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileBarChart className="w-7 h-7 text-primary-600 shrink-0" />
            Faculty OBE Performance Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Course Outcome attainment review, benchmark gap analysis, and accreditation exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Course Dropdown */}
          <div className="relative min-w-[260px]">
            <select
              value={selectedCourseId}
              onChange={handleCourseChange}
              aria-label="Select course to view OBE report"
              className="w-full appearance-none pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-800 shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer"
            >
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.courseCode} — {c.courseName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={downloading || loadingReport || !report || outcomes.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Download CSV report"
          >
            {downloading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-rose-800">
            <p className="font-semibold">Unable to load report</p>
            <p className="mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setSelectedCourseId(selectedCourseId)}
            className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-md text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Loading Skeleton ────────────────────────────────────────── */}
      {loadingReport && (
        <div className="space-y-6 animate-pulse">
          <div className="h-28 bg-white rounded-xl border border-slate-200" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-xl border border-slate-200" />
            ))}
          </div>
          <div className="h-64 bg-white rounded-xl border border-slate-200" />
        </div>
      )}

      {/* ── Report Content ──────────────────────────────────────────── */}
      {!loadingReport && report && (
        <>
          {/* 1. Course Information Card */}
          <div className="bg-white rounded-xl border border-surface-border shadow-sm p-5 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-primary-50 text-primary-700 border border-primary-200 rounded-md font-mono text-xs font-semibold">
                    {report.course.courseCode}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">{report.course.courseName}</h2>
                </div>
                {report.course.description && (
                  <p className="text-sm text-slate-500 mt-1 max-w-3xl line-clamp-2">
                    {report.course.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                  <Target className="w-3.5 h-3.5 text-primary-600" />
                  Target Benchmark: {target}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Dept: <strong className="text-slate-800">{report.course.department}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Semester: <strong className="text-slate-800">{report.course.semester}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Academic Year: <strong className="text-slate-800">{report.course.academicYear}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Credits: <strong className="text-slate-800">{report.course.credits}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* 2. Overall OBE Summary (4-Card Metric Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Average Attainment */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-5 flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  summary.averageAttainment !== null
                    ? summary.averageAttainment >= target
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-amber-50 text-amber-600'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Overall Attainment
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {summary.averageAttainment !== null ? `${summary.averageAttainment}%` : '—'}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                      summary.courseAttainmentStatus === 'Attained'
                        ? 'bg-emerald-100 text-emerald-800'
                        : summary.courseAttainmentStatus === 'Not Attained'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {summary.courseAttainmentStatus}
                  </span>
                  <span className="text-[11px] text-slate-400">vs {target}% target</span>
                </div>
              </div>
            </div>

            {/* Card 2: Outcomes Attained */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-5 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Outcomes Attained
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {summary.attainedCOs}{' '}
                  <span className="text-sm font-normal text-slate-400">
                    / {summary.totalCOs} COs
                  </span>
                </p>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary-600 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        summary.totalCOs > 0
                          ? (summary.attainedCOs / summary.totalCOs) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Below-Target Outcomes (Non-judgmental) */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-5 flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  summary.belowTargetCOs > 0
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {summary.belowTargetCOs > 0 ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Below Target Threshold
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {summary.belowTargetCOs}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {summary.belowTargetCOs === 0
                    ? 'All COs met benchmark'
                    : 'Require curricular support'}
                </p>
              </div>
            </div>

            {/* Card 4: Students Evaluated */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-5 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Students Enrolled
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {summary.totalEnrolledStudents}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Active course cohort</p>
              </div>
            </div>
          </div>

          {/* ── Empty State: Course with No COs ────────────────────────── */}
          {outcomes.length === 0 && (
            <Card>
              <EmptyState
                icon={BookOpen}
                title="No Course Outcomes Configured"
                message="This course does not have any Course Outcomes (COs) defined yet. Configure COs in Course Details to enable OBE analytics."
              />
            </Card>
          )}

          {outcomes.length > 0 && (
            <>
              {/* 3. Visual Representation: Comparative Performance Bars */}
              <div className="bg-white rounded-xl border border-surface-border shadow-sm p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary-600" />
                      CO Attainment vs. Target Benchmark ({target}%)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Visual comparison of attainment percentage for each Course Outcome against the institutional target threshold.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <span className="w-3 h-3 rounded bg-emerald-500" /> Attained (≥ {target}%)
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-700">
                      <span className="w-3 h-3 rounded bg-amber-500" /> Below Target (&lt; {target}%)
                    </span>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {outcomes.map((co) => {
                    const isAttained = co.status === 'Attained';
                    const hasMarks = co.attainmentPercentage !== null;
                    const percent = co.attainmentPercentage || 0;

                    return (
                      <div key={co.coId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 font-mono w-10">
                              {co.code}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-semibold border rounded ${getBloomBadgeColor(
                                co.bloomLevel
                              )}`}
                            >
                              {co.bloomLevel}
                            </span>
                            <span className="text-slate-500 truncate max-w-[280px] sm:max-w-md">
                              {co.description}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {hasMarks ? (
                              <span
                                className={`font-mono font-bold ${
                                  isAttained ? 'text-emerald-700' : 'text-amber-700'
                                }`}
                              >
                                {co.attainmentPercentage}%
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">{co.status}</span>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar Container with Target Benchmark Line */}
                        <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          {hasMarks && (
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isAttained ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          )}
                          {/* Target Reference Indicator */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-slate-800 z-10"
                            style={{ left: `${target}%` }}
                            title={`Target: ${target}%`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. CO-wise Attainment Table */}
              <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Course Outcome (CO) Attainment Matrix
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Detailed tabular breakdown of question mapping, student participation, and attainment outcomes.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-surface-border text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">CO Code</th>
                        <th className="py-3 px-4">Bloom Level</th>
                        <th className="py-3 px-4 min-w-[220px]">Description</th>
                        <th className="py-3 px-4 text-center">Mapped Qs</th>
                        <th className="py-3 px-4 text-center">Evaluated</th>
                        <th className="py-3 px-4 text-center">Attained</th>
                        <th className="py-3 px-4 min-w-[140px]">Attainment %</th>
                        <th className="py-3 px-4 text-center">Target %</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {outcomes.map((co) => {
                        const isAttained = co.status === 'Attained';
                        const hasMarks = co.attainmentPercentage !== null;

                        return (
                          <tr key={co.coId} className="hover:bg-slate-50/75 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                              {co.code}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-semibold border rounded ${getBloomBadgeColor(
                                  co.bloomLevel
                                )}`}
                              >
                                {co.bloomLevel}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium leading-relaxed">
                              {co.description}
                            </td>
                            <td className="py-3.5 px-4 text-center text-slate-700">
                              {co.mappedQuestionsCount}
                            </td>
                            <td className="py-3.5 px-4 text-center text-slate-700">
                              {co.studentsConsidered}
                            </td>
                            <td className="py-3.5 px-4 text-center text-slate-700">
                              {co.studentsAttained}
                            </td>
                            <td className="py-3.5 px-4">
                              {hasMarks ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between font-mono font-semibold">
                                    <span
                                      className={
                                        isAttained ? 'text-emerald-700' : 'text-amber-700'
                                      }
                                    >
                                      {co.attainmentPercentage}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        isAttained ? 'bg-emerald-500' : 'bg-amber-500'
                                      }`}
                                      style={{
                                        width: `${Math.min(co.attainmentPercentage, 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No Marks</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                              {target}%
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  co.status === 'Attained'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : co.status === 'Not Attained'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {co.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. Below-Target COs Section (Constructive / Non-judgmental) */}
              <div className="bg-white rounded-xl border border-surface-border shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Curriculum Focus Areas & Remedial Planning
                    </h3>
                    <p className="text-xs text-slate-500">
                      Constructive insights for Course Outcomes operating below the institutional target ({target}%).
                    </p>
                  </div>
                </div>

                {belowTargetOutcomes.length === 0 ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-xs text-emerald-800">
                      <p className="font-semibold text-emerald-900">
                        Excellent Performance! All Course Outcomes Met Target
                      </p>
                      <p className="mt-0.5">
                        Every evaluated Course Outcome has attained or surpassed the configured benchmark threshold of {target}%.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {belowTargetOutcomes.map((co) => (
                      <div
                        key={co.coId}
                        className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {co.code}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-semibold border rounded ${getBloomBadgeColor(
                                co.bloomLevel
                              )}`}
                            >
                              {co.bloomLevel}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono text-xs font-semibold">
                            {co.attainmentPercentage}% / {target}% Target
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {co.description}
                        </p>

                        <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-amber-200/60">
                          <span>
                            Participation:{' '}
                            <strong className="text-slate-800">
                              {co.studentsAttained} of {co.studentsConsidered}
                            </strong>{' '}
                            students
                          </span>
                          <span className="font-semibold text-amber-800">
                            Deficit: {co.gapPercentage}%
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 bg-white/80 rounded-lg p-2.5 border border-amber-200/50">
                          <p className="font-semibold text-slate-700">Recommended Next Steps:</p>
                          <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
                            <li>Provide additional tutorial problems and guided practice.</li>
                            <li>Revisit prerequisite concepts in upcoming lecture sessions.</li>
                            <li>Introduce formative quiz checkpoints prior to major exams.</li>
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
