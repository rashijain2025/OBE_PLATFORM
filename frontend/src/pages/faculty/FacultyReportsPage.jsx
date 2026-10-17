import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { listCoursesApi } from '../../api/admin';
import { getFacultyReportApi, exportAttainmentCSVUrl } from '../../api/attainment';
import {
  PageHeader, Card, FormSelect, PrimaryButton, GhostButton, Spinner, EmptyState
} from '../../components/ui/AdminUI';
import { useToast, ToastContainer } from '../../components/ui/Toast';
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>CO Matrix</span>
              </Link>
              <a
                href={exportAttainmentCSVUrl(selectedCourseId, target)}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
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
            <label className="block text-xs font-medium text-gray-400 mb-1 flex items-center justify-between">
              <span>Target Attainment Threshold (%)</span>
              <span className="text-gray-500 text-[10px]">Default 40%</span>
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
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <span className="absolute right-3 top-2.5 text-xs text-gray-500">%</span>
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
          <div className="rounded-xl border border-gray-800 bg-gradient-to-r from-gray-900 via-gray-900 to-indigo-950/30 p-6 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {course.code}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                    Semester {course.semester}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                    {course.academicYear}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    {course.credits} Credits
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{course.name}</h2>
                <div className="text-xs text-gray-400 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Programme: <strong className="text-gray-300">{course.programme?.name} ({course.programme?.code})</strong></span>
                  <span>Faculty: <strong className="text-emerald-400">{course.faculty?.name}</strong></span>
                  <span>Enrolled Students: <strong className="text-white">{data.totalEnrolledStudents}</strong></span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 text-center min-w-[10rem]">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Course Attainment</div>
                <div className="text-3xl font-extrabold text-white mt-1">
                  {data.averageAttainment !== null ? `${data.averageAttainment}%` : '—'}
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      data.overallStatus === 'Attained'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
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
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Action Required: {data.belowTargetCOsCount} Course Outcome(s) Below Target ({target}%)</span>
              </div>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                The following outcomes did not achieve the required threshold and recommend pedagogical intervention, remedial tutorials, or assessment redesign:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {data.belowTargetCOs.map((b) => (
                  <div key={b.coId} className="rounded-lg border border-amber-500/20 bg-gray-900/80 p-3 text-xs">
                    <div className="flex items-center justify-between font-mono font-bold text-white mb-1">
                      <span className="text-indigo-400">{b.code}</span>
                      <span className="text-rose-400 font-bold">Gap: -{b.gap}%</span>
                    </div>
                    <div className="text-gray-300 line-clamp-2">{b.statement}</div>
                    <div className="mt-2 text-gray-400 text-[11px] flex justify-between">
                      <span>Attained: {b.classAttainment}%</span>
                      <span>Target: {b.targetThreshold}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-xs text-emerald-200">
                <strong className="text-emerald-300 font-semibold">All Course Outcomes Attained:</strong> Every evaluated outcome met or exceeded the {target}% class threshold.
              </div>
            </div>
          )}

          {/* 3. Visual Recharts Bar Chart */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  <span>CO Attainment vs Target Threshold ({target}%)</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Green bars indicate attainment meeting or exceeding threshold. Amber bars indicate below-target outcomes.
                </p>
              </div>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis
                    dataKey="code"
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-gray-700 bg-gray-900 p-3 shadow-xl text-xs space-y-1">
                          <div className="font-bold text-white text-sm">{d.code}</div>
                          <div className="text-gray-400">Bloom Level: {d.bloomLevel}</div>
                          <div className="font-mono text-emerald-400 font-semibold">
                            Class Attainment: {d.classAttainment}%
                          </div>
                          <div className="font-mono text-gray-400">
                            Target Threshold: {target}%
                          </div>
                          <div className="font-semibold" style={{ color: d.isAttained ? '#34d399' : '#f87171' }}>
                            Status: {d.status}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    y={target}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{
                      value: `Target ${target}%`,
                      fill: '#ef4444',
                      fontSize: 11,
                      position: 'top',
                    }}
                  />
                  <Bar dataKey="classAttainment" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isAttained ? '#10b981' : '#f59e0b'}
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
              <h3 className="text-base font-semibold text-white">Course Outcomes Breakdown</h3>
              <a
                href={exportAttainmentCSVUrl(selectedCourseId, target)}
                download
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Download className="w-3.5 h-3.5" /> Download Full CSV
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4 text-left w-20">Code</th>
                    <th className="py-3 px-4 text-left w-32">Bloom Level</th>
                    <th className="py-3 px-4 text-left">Outcome Statement</th>
                    <th className="py-3 px-4 text-center w-36">Coverage</th>
                    <th className="py-3 px-4 text-center w-28">Attained</th>
                    <th className="py-3 px-4 text-center w-32">Class Score</th>
                    <th className="py-3 px-4 text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {cos.map((co) => {
                    const isAttained = co.status === 'Attained';
                    const isPending = co.classAttainment === null;

                    return (
                      <tr key={co.coId} className="hover:bg-gray-800/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-400 text-xs">
                          {co.code}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {co.bloomLevel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-white text-xs leading-relaxed max-w-md">
                          {co.statement}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-gray-300">
                          {co.evaluatedText}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-gray-300">
                          {co.studentsAttained} of {co.studentsEvaluated}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs font-bold">
                          {isPending ? (
                            <span className="text-gray-500">—</span>
                          ) : (
                            <span className={isAttained ? 'text-emerald-400' : 'text-amber-400'}>
                              {co.classAttainment}%
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isPending ? (
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                              {co.status}
                            </span>
                          ) : isAttained ? (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Attained
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold inline-flex items-center gap-1">
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
