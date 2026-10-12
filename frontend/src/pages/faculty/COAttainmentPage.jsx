import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { listCoursesApi } from '../../api/admin';
import { getCourseCOAttainmentApi, exportAttainmentCSVUrl } from '../../api/attainment';
import {
  PageHeader, Card, FormSelect, FormInput, PrimaryButton, GhostButton, Spinner, EmptyState
} from '../../components/ui/AdminUI';
import { useToast, ToastContainer } from '../../components/ui/Toast';
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
            <div className="flex items-center gap-2">
              <a
                href={exportAttainmentCSVUrl(selectedCourseId, target)}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </a>
              <Link
                to={`/reports?courseId=${selectedCourseId}&target=${target}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 transition-colors"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <FormSelect
              label="Select Course"
              value={selectedCourseId}
              onChange={(val) => {
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
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Enrolled</div>
              <div className="text-2xl font-bold text-white mt-1">{data.totalEnrolledStudents}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">Active students</div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Evaluated COs</div>
              <div className="text-2xl font-bold text-indigo-400 mt-1">
                {data.evaluatedCOsCount} / {data.totalCourseOutcomes}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">Configured with marks</div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Attained COs</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{data.attainedCOsCount}</div>
              <div className="text-[11px] text-emerald-500/70 mt-0.5">≥ {target}% target</div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Below Target</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">{data.belowTargetCOsCount}</div>
              <div className="text-[11px] text-amber-500/70 mt-0.5">&lt; {target}% target</div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Average Attainment</div>
              <div className="text-2xl font-bold text-purple-400 mt-1">
                {data.averageAttainment !== null ? `${data.averageAttainment}%` : '—'}
              </div>
              <div className="text-[11px] text-purple-400/70 mt-0.5 capitalize">{data.overallStatus}</div>
            </div>
          </div>

          {/* Below-Target Banner if any */}
          {data.belowTargetCOsCount > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-amber-300">
                  {data.belowTargetCOsCount} Course Outcome(s) below target threshold ({target}%):
                </div>
                <div className="text-xs text-amber-200/80 mt-1 flex flex-wrap gap-2">
                  {data.belowTargetCOs.map((b) => (
                    <span key={b.coId} className="px-2 py-0.5 rounded bg-amber-500/20 font-mono">
                      {b.code} ({b.classAttainment}%, Gap: -{b.gap}%)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* View Tabs */}
          <div className="flex border-b border-gray-800 gap-4">
            <button
              onClick={() => setActiveTab('class')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'class'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Class-Wise Attainment</span>
            </button>

            <button
              onClick={() => setActiveTab('student')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'student'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
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
                    <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-4 text-left w-20">Code</th>
                      <th className="py-3 px-4 text-left w-32">Bloom Level</th>
                      <th className="py-3 px-4 text-left">Outcome Statement</th>
                      <th className="py-3 px-4 text-center w-36">Evaluated</th>
                      <th className="py-3 px-4 text-center w-28">Attained</th>
                      <th className="py-3 px-4 text-center w-32">Class Attainment</th>
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
          )}

          {/* TAB 2: Student-Wise Matrix */}
          {activeTab === 'student' && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-3 w-28 font-semibold">Roll No</th>
                      <th className="py-3 px-3 w-44 font-semibold">Student Name</th>
                      {cos.map((co) => (
                        <th key={co.coId} className="py-3 px-3 text-center w-28">
                          <div className="font-bold text-white text-xs">{co.code}</div>
                          <div className="text-[10px] text-gray-400 font-mono">Goal ≥ {target}%</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {studentMatrix.map((s) => (
                      <tr key={s.studentId} className="hover:bg-gray-800/20 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-300">
                          {s.rollNo || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-white truncate max-w-[12rem]">
                          {s.name}
                        </td>
                        {cos.map((co) => {
                          const score = s.coScores[co.code];
                          if (!score || !score.isEvaluated) {
                            return (
                              <td key={co.coId} className="py-2 px-3 text-center text-gray-500 font-mono text-[11px]">
                                <span className="px-1.5 py-0.5 rounded bg-gray-800/60 text-gray-400">
                                  Not Eval
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td key={co.coId} className="py-2 px-3 text-center">
                              <span
                                className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded ${
                                  score.isAttained
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
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
