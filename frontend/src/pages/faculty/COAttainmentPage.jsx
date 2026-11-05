import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { listCoursesApi } from '../../api/admin';
import { getCourseCOAttainmentApi, exportAttainmentCSVUrl } from '../../api/attainment';
import {
  PageHeader, Card, FormSelect, FormInput, PrimaryButton, GhostButton, Spinner, EmptyState, InfoTip
} from '../../components/ui/AdminUI';
import { useToast, ToastContainer } from '../../components/ui/Toast';
import CourseReportButton from '../../components/course/CourseReportButton';
import {
  Award, Target, Users, BookOpen, Download, AlertTriangle, CheckCircle2,
  Table, BarChart3, ChevronRight, Layers, FileSpreadsheet
} from 'lucide-react';

export default function COAttainmentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toasts, showToast } = useToast();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get('courseId') || '');
  const [target, setTarget] = useState(Number(searchParams.get('target')) || 40);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingAttainment, setLoadingAttainment] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('class'); // 'class' | 'student'

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

  // 2. Fetch attainment when course or target changes
  useEffect(() => {
    if (!selectedCourseId) {
      setData(null);
      return;
    }

    setLoadingAttainment(true);
    getCourseCOAttainmentApi(selectedCourseId, target)
      .then((res) => setData(res.data))
      .catch((err) => showToast(err.response?.data?.message || 'Failed to calculate attainment', 'error'))
      .finally(() => setLoadingAttainment(false));
  }, [selectedCourseId, target, showToast]);

  // Student Matrix data derivation
  const studentMatrix = useMemo(() => {
    if (!data?.cos || data.cos.length === 0) return [];

    const map = new Map();
    for (const co of data.cos) {
      for (const s of co.studentsBreakdown || []) {
        const sId = String(s.studentId);
        if (!map.has(sId)) {
          map.set(sId, {
            studentId: s.studentId,
            name: s.name,
            rollNo: s.rollNo,
            coScores: {},
          });
        }
        map.get(sId).coScores[co.code] = {
          percentage: s.percentage,
          isAttained: s.isAttained,
          isEvaluated: s.isEvaluated,
          marksObtained: s.marksObtained,
          maxMarks: s.maxMarks,
        };
      }
    }
    return Array.from(map.values());
  }, [data]);

  const cos = data?.cos || [];

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />

      <PageHeader
        title="Course Outcome (CO) Attainment"
        subtitle="Evaluate threshold-based student attainment and class-wide OBE achievement percentages."
        action={
          selectedCourseId && (
            <div className="flex items-center gap-2 flex-wrap">
              <CourseReportButton courseId={selectedCourseId} target={target} courseCode={data?.course?.code} showToast={showToast} />
              <a
                href={exportAttainmentCSVUrl(selectedCourseId, target)}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-accent bg-accent-soft hover:bg-teal-100 border border-teal-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </a>
              <Link
                to={`/reports?courseId=${selectedCourseId}&target=${target}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-ink bg-paper hover:bg-border/40 border border-border transition-colors"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Reports & Charts</span>
              </Link>
            </div>
          )
        }
      />

      {/* Course & Target Selector Card */}
      <Card>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
            <label className="block text-xs font-medium text-muted mb-1 flex items-center justify-between">
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
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink font-mono focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors tabular-nums"
              />
              <span className="absolute right-3 top-2.5 text-xs text-muted">%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {loadingAttainment ? (
        <div className="py-20 flex justify-center items-center">
          <Spinner />
        </div>
      ) : !data ? (
        <Card>
          <EmptyState message="Select a course to calculate Course Outcome attainment." />
        </Card>
      ) : (
        <>
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-2xl border border-border bg-surface shadow-card p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Total Enrolled</div>
              <div className="text-2xl font-bold text-ink font-serif mt-1 tabular-nums">{data.totalEnrolledStudents}</div>
              <div className="text-[11px] text-muted mt-0.5">Active students</div>
            </div>

            <div className="rounded-2xl border border-border bg-surface shadow-card p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Evaluated COs</div>
              <div className="text-2xl font-bold text-accent font-serif mt-1 tabular-nums">
                {data.evaluatedCOsCount} / {data.totalCourseOutcomes}
              </div>
              <div className="text-[11px] text-muted mt-0.5">Configured with marks</div>
            </div>

            <div className="rounded-2xl border border-border bg-surface shadow-card p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Attained COs</div>
              <div className="text-2xl font-bold text-status-attained font-serif mt-1 tabular-nums">{data.attainedCOsCount}</div>
              <div className="text-[11px] text-status-attained/80 mt-0.5">≥ {target}% target</div>
            </div>

            <div className="rounded-2xl border border-border bg-surface shadow-card p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Below Target</div>
              <div className="text-2xl font-bold text-status-borderline font-serif mt-1 tabular-nums">{data.belowTargetCOsCount}</div>
              <div className="text-[11px] text-status-borderline/80 mt-0.5">&lt; {target}% target</div>
            </div>

            <div className="rounded-2xl border border-border bg-surface shadow-card p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Average Attainment</div>
              <div className="text-2xl font-bold text-ink font-serif mt-1 tabular-nums">
                {data.averageAttainment !== null ? `${data.averageAttainment}%` : '—'}
              </div>
              <div className="text-[11px] text-muted mt-0.5 capitalize">{data.overallStatus}</div>
            </div>
          </div>

          {/* Below-Target Banner if any */}
          {data.belowTargetCOsCount > 0 && (
            <div className="rounded-xl border border-amber-200 bg-status-borderline-soft p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-status-borderline shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-amber-900">
                  {data.belowTargetCOsCount} Course Outcome(s) below target threshold ({target}%):
                </div>
                <div className="text-xs text-amber-800 mt-1 flex flex-wrap gap-2">
                  {data.belowTargetCOs.map((b) => (
                    <span key={b.coId} className="px-2 py-0.5 rounded bg-surface border border-amber-200 font-mono tabular-nums">
                      {b.code} ({b.classAttainment}%, Gap: -{b.gap}%)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* View Tabs */}
          <div className="flex border-b border-border gap-4">
            <button
              onClick={() => setActiveTab('class')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'class'
                  ? 'border-ink text-ink font-semibold'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Class-Wise Attainment</span>
            </button>
            <button
              onClick={() => setActiveTab('student')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'student'
                  ? 'border-ink text-ink font-semibold'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Student-Wise Attainment Matrix</span>
            </button>
          </div>

          {/* TAB 1: Class-Wise Attainment Table */}
          {activeTab === 'class' && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-paper/50 text-xs text-muted uppercase tracking-wider">
                      <th className="py-3 px-4 text-left w-20">Code</th>
                      <th className="py-3 px-4 text-left w-32">Bloom Level</th>
                      <th className="py-3 px-4 text-left">Outcome Statement</th>
                      <th className="py-3 px-4 text-center w-36">Evaluated</th>
                      <th className="py-3 px-4 text-center w-28">Attained</th>
                      <th className="py-3 px-4 text-center w-32">Class Attainment</th>
                      <th className="py-3 px-4 text-center w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cos.map((co) => {
                      const isAttained = co.status === 'Attained';
                      const isPending = co.classAttainment === null;

                      return (
                        <tr key={co.coId} className="hover:bg-paper/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-ink text-xs bg-paper px-2 py-0.5 rounded border border-border inline-block">
                              {co.code}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-teal-200 font-medium">
                              {co.bloomLevel}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-ink text-xs leading-relaxed max-w-md">
                            {co.statement}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-xs text-muted tabular-nums">
                            {co.evaluatedText}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-xs text-muted tabular-nums">
                            {co.studentsAttained} of {co.studentsEvaluated}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-xs font-bold tabular-nums">
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
                              <span className="text-xs px-2 py-0.5 rounded bg-paper border border-border text-muted">
                                {co.status}
                              </span>
                            ) : isAttained ? (
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-status-attained-soft text-status-attained border border-emerald-200 font-semibold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Attained
                              </span>
                            ) : (
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-status-borderline-soft text-status-borderline border border-amber-200 font-semibold inline-flex items-center gap-1">
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
          )}

          {/* TAB 2: Student-Wise Matrix */}
          {activeTab === 'student' && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-paper/50 text-muted uppercase tracking-wider">
                      <th className="py-3 px-3 w-28 font-semibold">Roll No</th>
                      <th className="py-3 px-3 w-44 font-semibold">Student Name</th>
                      {cos.map((co) => (
                        <th key={co.coId} className="py-3 px-3 text-center w-28">
                          <div className="font-bold text-ink text-xs">{co.code}</div>
                          <div className="text-[10px] text-muted font-mono tabular-nums">Goal ≥ {target}%</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {studentMatrix.map((s) => (
                      <tr key={s.studentId} className="hover:bg-paper/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-ink tabular-nums">
                          {s.rollNo || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-ink truncate max-w-[12rem]">
                          {s.name}
                        </td>
                        {cos.map((co) => {
                          const score = s.coScores[co.code];
                          if (!score || !score.isEvaluated) {
                            return (
                              <td key={co.coId} className="py-2 px-3 text-center text-muted font-mono text-[11px]">
                                <span className="px-1.5 py-0.5 rounded bg-paper border border-border text-muted">
                                  Not Eval
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td key={co.coId} className="py-2 px-3 text-center">
                              <span
                                className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded tabular-nums ${
                                  score.isAttained
                                    ? 'bg-status-attained-soft text-status-attained border border-emerald-200'
                                    : 'bg-status-below-soft text-status-below border border-red-200'
                                }`}
                              >
                                {score.percentage}%
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
