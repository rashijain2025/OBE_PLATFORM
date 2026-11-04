import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { listCoursesApi } from '../../api/admin';
import { getFacultyReportApi, exportAttainmentCSVUrl } from '../../api/attainment';
import {
  PageHeader, Card, FormSelect, PrimaryButton, GhostButton, Spinner, EmptyState, InfoTip
} from '../../components/ui/AdminUI';
import { useToast, ToastContainer } from '../../components/ui/Toast';
import CourseReportButton from '../../components/course/CourseReportButton';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  ReferenceLine, Cell, CartesianGrid
} from 'recharts';
import {
  BarChart3, Download, Award, AlertTriangle, CheckCircle2,
  BookOpen, Users, Calendar, ArrowLeft, ChevronRight, Layers, FileSpreadsheet
} from 'lucide-react';

export default function FacultyReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toasts, showToast } = useToast();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get('courseId') || '');
  const [target, setTarget] = useState(Number(searchParams.get('target')) || 40);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [data, setData] = useState(null);

  // 1. Fetch courses
  useEffect(() => {
    setLoadingCourses(true);
    listCoursesApi()
      .then((res) => {
        const list = res.data || [];
        setCourses(list);
        if (!selectedCourseId && list.length > 0) {
          setSelectedCourseId(list[0]._id);
        }
      })
      .catch((err) => showToast(err.response?.data?.message || 'Failed to load courses', 'error'))
      .finally(() => setLoadingCourses(false));
  }, [showToast]);

  // 2. Fetch report data when course or target changes
  useEffect(() => {
    if (!selectedCourseId) {
      setData(null);
      return;
    }

    setLoadingReport(true);
    getFacultyReportApi(selectedCourseId, target)
      .then((res) => setData(res.data))
      .catch((err) => showToast(err.response?.data?.message || 'Failed to load report', 'error'))
      .finally(() => setLoadingReport(false));
  }, [selectedCourseId, target, showToast]);

  // Chart Data preparation
  const chartData = useMemo(() => {
    if (!data?.cos) return [];
    return data.cos.map((co) => ({
      code: co.code,
      classAttainment: co.classAttainment !== null ? co.classAttainment : 0,
      bloomLevel: co.bloomLevel,
      status: co.status,
      isAttained: co.status === 'Attained',
    }));
  }, [data]);

  const course = data?.course;
  const cos = data?.cos || [];

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />

      <PageHeader
        title="Faculty OBE Attainment Report"
        subtitle="Course outcomes performance analysis, gap review, and visual accreditation analytics."
        action={
          selectedCourseId && (
            <div className="flex items-center gap-2">
              <Link
                to={`/attainment?courseId=${selectedCourseId}&target=${target}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-ink hover:text-ink-dark bg-paper hover:bg-surface border border-border transition-colors shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>CO Matrix</span>
              </Link>
              <CourseReportButton courseId={selectedCourseId} target={target} courseCode={course?.code} showToast={showToast} />
              <a
                href={exportAttainmentCSVUrl(selectedCourseId, target)}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-status-attained bg-status-attained-soft hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV Report</span>
              </a>
            </div>
          )
        }
      />

      {/* Course & Target Selector Card */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <FormSelect
              label="Select Course"
              value={selectedCourseId}
              onChange={(e) => {
                const val = e.target ? e.target.value : e;
                setSelectedCourseId(val);
                setSearchParams({ courseId: val, target: String(target) });
              }}
              options={courses.map((c) => ({
                value: c._id,
                label: `${c.code} — ${c.name} (${c.academicYear}, Sem ${c.semester})`,
              }))}
              disabled={loadingCourses}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted mb-1 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                Target Attainment Threshold (%)
                <InfoTip text="This one number is used twice: a student attains a CO if they score at least this % of the marks on that CO's questions, and the CO counts as attained for the class if at least this % of evaluated students attain it." />
              </span>
              <span className="text-muted/70 text-[10px]">Default 40%</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={100}
                value={target}
                onChange={(e) => {
                  const val = Number(e.target.value) || 40;
                  setTarget(val);
                  setSearchParams({ courseId: selectedCourseId, target: String(val) });
                }}
                className="w-full bg-paper border border-border rounded-lg px-3 py-2 text-sm text-ink font-mono tabular-nums focus:outline-none focus:border-ink transition-colors shadow-sm"
              />
              <span className="absolute right-3 top-2.5 text-xs text-muted">%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Report Body */}
      {loadingReport ? (
        <div className="py-20 flex justify-center items-center">
          <Spinner />
        </div>
      ) : !data || !course ? (
        <Card>
          <EmptyState message="Select a course to view its accreditation report." />
        </Card>
      ) : (
        <>
          {/* 1. Course Metadata Card */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-accent-soft text-accent border border-teal-200">
                    {course.code}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-paper text-muted border border-border">
                    Semester {course.semester}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-paper text-muted border border-border">
                    {course.academicYear}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-paper text-muted border border-border font-mono">
                    {course.credits} Credits
                  </span>
                </div>
                <h2 className="text-2xl font-serif font-bold text-ink tracking-tight">{course.name}</h2>
                <div className="text-xs text-muted mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Programme: <strong className="text-ink font-medium">{course.programme?.name} ({course.programme?.code})</strong></span>
                  <span>Faculty: <strong className="text-accent font-medium">{course.faculty?.name}</strong></span>
                  <span>Enrolled Students: <strong className="text-ink font-mono font-medium">{data.totalEnrolledStudents}</strong></span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-paper p-4 text-center min-w-[10rem]">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">Course Attainment</div>
                <div className="text-3xl font-serif font-extrabold text-ink mt-1 tabular-nums">
                  {data.averageAttainment !== null ? `${data.averageAttainment}%` : '—'}
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      data.overallStatus === 'Attained'
                        ? 'bg-status-attained-soft text-status-attained border-emerald-200'
                        : 'bg-status-borderline-soft text-status-borderline border-amber-200'
                    }`}
                  >
                    {data.overallStatus} (≥ {target}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Below-Target Alert Card (if any) */}
          {data.belowTargetCOsCount > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-status-borderline-soft p-5 space-y-3">
              <div className="flex items-center gap-2 text-status-borderline font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-status-borderline shrink-0" />
                <span>Action Required: {data.belowTargetCOsCount} Course Outcome(s) Below Target ({target}%)</span>
              </div>
              <p className="text-xs text-ink/80 leading-relaxed">
                The following outcomes did not achieve the required threshold and recommend pedagogical intervention, remedial tutorials, or assessment redesign:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {data.belowTargetCOs.map((b) => (
                  <div key={b.coId} className="rounded-lg border border-amber-200/60 bg-surface p-3 text-xs shadow-sm">
                    <div className="flex items-center justify-between font-mono font-bold text-ink mb-1">
                      <span className="text-accent">{b.code}</span>
                      <span className="text-status-below font-bold tabular-nums">Gap: -{b.gap}%</span>
                    </div>
                    <div className="text-muted line-clamp-2">{b.statement}</div>
                    <div className="mt-2 text-muted text-[11px] flex justify-between font-mono tabular-nums">
                      <span>Attained: {b.classAttainment}%</span>
                      <span>Target: {b.targetThreshold}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-status-attained-soft p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-status-attained shrink-0" />
              <div className="text-xs text-status-attained font-medium">
                <strong className="font-semibold">All Course Outcomes Attained:</strong> Every evaluated outcome met or exceeded the {target}% class threshold.
              </div>
            </div>
          )}

          {/* 3. Visual Recharts Bar Chart */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-serif font-semibold text-ink flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-accent" />
                  <span>CO Attainment vs Target Threshold ({target}%)</span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Green bars indicate attainment meeting or exceeding threshold. Amber bars indicate below-target outcomes.
                </p>
              </div>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E1D6" vertical={false} />
                  <XAxis
                    dataKey="code"
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-surface p-3 shadow-lg text-xs space-y-1">
                          <div className="font-serif font-bold text-ink text-sm">{d.code}</div>
                          <div className="text-muted">Bloom Level: {d.bloomLevel}</div>
                          <div className="font-mono tabular-nums text-status-attained font-semibold">
                            Class Attainment: {d.classAttainment}%
                          </div>
                          <div className="font-mono tabular-nums text-muted">
                            Target Threshold: {target}%
                          </div>
                          <div className="font-semibold" style={{ color: d.isAttained ? '#059669' : '#D97706' }}>
                            Status: {d.status}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    y={target}
                    stroke="#E11D48"
                    strokeDasharray="4 4"
                    label={{
                      value: `Target ${target}%`,
                      fill: '#E11D48',
                      fontSize: 11,
                      position: 'top',
                    }}
                  />
                  <Bar dataKey="classAttainment" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isAttained ? '#059669' : '#D97706'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* 4. Structured CO Attainment Table */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-serif font-semibold text-ink">Course Outcomes Breakdown</h3>
              <a
                href={exportAttainmentCSVUrl(selectedCourseId, target)}
                download
                className="text-xs text-accent hover:underline flex items-center gap-1 font-medium"
              >
                <Download className="w-3.5 h-3.5" /> Download Full CSV
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted uppercase tracking-wider bg-paper">
                    <th className="py-3 px-4 text-left w-20">Code</th>
                    <th className="py-3 px-4 text-left w-32">Bloom Level</th>
                    <th className="py-3 px-4 text-left">Outcome Statement</th>
                    <th className="py-3 px-4 text-center w-36">Coverage</th>
                    <th className="py-3 px-4 text-center w-28">Attained</th>
                    <th className="py-3 px-4 text-center w-32">Class Score</th>
                    <th className="py-3 px-4 text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cos.map((co) => {
                    const isAttained = co.status === 'Attained';
                    const isPending = co.classAttainment === null;

                    return (
                      <tr key={co.coId} className="hover:bg-paper/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-accent text-xs">
                          {co.code}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-paper text-muted border border-border">
                            {co.bloomLevel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-ink text-xs leading-relaxed max-w-md">
                          {co.statement}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono tabular-nums text-xs text-muted">
                          {co.evaluatedText}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono tabular-nums text-xs text-muted">
                          {co.studentsAttained} of {co.studentsEvaluated}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono tabular-nums text-xs font-bold">
                          {isPending ? (
                            <span className="text-muted">—</span>
                          ) : (
                            <span className={isAttained ? 'text-status-attained' : 'text-status-borderline'}>
                              {co.classAttainment}%
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isPending ? (
                            <span className="text-xs px-2 py-0.5 rounded bg-paper text-muted border border-border">
                              {co.status}
                            </span>
                          ) : isAttained ? (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-status-attained-soft text-status-attained border border-emerald-200 font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Attained
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-status-borderline-soft text-status-borderline border border-amber-200 font-semibold inline-flex items-center gap-1 font-mono tabular-nums">
                              <AlertTriangle className="w-3 h-3" /> Gap: -{co.gap}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
