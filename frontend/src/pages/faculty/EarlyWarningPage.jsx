import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listCoursesApi } from '../../api/admin';
import { getCoursePredictionsApi } from '../../api/prediction';
import { InfoTip } from '../../components/ui/AdminUI';
import {
  AlertTriangle,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Users,
  Target,
  Brain,
  Lightbulb,
  ShieldAlert,
  ArrowRight,
  Filter,
} from 'lucide-react';

export default function EarlyWarningPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [targetThreshold, setTargetThreshold] = useState(40);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [riskFilter, setRiskFilter] = useState('all'); // 'all', 'high', 'medium', 'low'
  const [coFilter, setCoFilter] = useState('all');

  // Load courses on mount
  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        const res = await listCoursesApi();
        const allCourses = res.data || [];
        setCourses(allCourses);

        if (allCourses.length > 0) {
          setSelectedCourseId(allCourses[0]._id);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, [user]);

  // Load predictions when selectedCourseId or target changes
  useEffect(() => {
    if (!selectedCourseId) return;
    loadPredictions(selectedCourseId, targetThreshold);
  }, [selectedCourseId, targetThreshold]);

  const loadPredictions = async (courseId, target) => {
    try {
      setLoading(true);
      setError('');
      const res = await getCoursePredictionsApi(courseId, target);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load early warning predictions');
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (level) => {
    switch (level) {
      case 'high':
        return 'bg-status-below-soft text-status-below border-red-200 font-bold';
      case 'medium':
        return 'bg-status-borderline-soft text-status-borderline border-amber-200 font-bold';
      case 'low':
        return 'bg-status-attained-soft text-status-attained border-emerald-200 font-semibold';
      default:
        return 'bg-paper text-muted border-border';
    }
  };

  // Filter students
  const filteredStudents = (data?.allPredictions || []).filter((item) => {
    if (riskFilter !== 'all' && item.risk_level !== riskFilter) return false;
    if (coFilter !== 'all' && item.co_code !== coFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-border p-6 rounded-2xl shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-soft text-accent border border-teal-200">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-ink tracking-tight">AI Early Warning & At-Risk Predictor</h1>
              <p className="text-sm text-muted">
                Continuous assessment intelligence forecasting final CO attainment & students needing intervention
              </p>
            </div>
          </div>
        </div>

        {/* Course & Target Selector */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full sm:w-64 bg-surface border border-border rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-1.5">
            <span className="text-xs text-muted">Target %:</span>
            <InfoTip
              placement="bottom"
              text="The CO score each student needs to reach. From marks entered so far, the model predicts how likely each student is to reach it, flags those unlikely to as at risk, and checks whether the class as a whole is on track."
            />
            <input
              type="number"
              min="1"
              max="100"
              value={targetThreshold}
              onChange={(e) => setTargetThreshold(e.target.value)}
              className="w-12 bg-transparent text-sm font-bold text-ink text-right focus:outline-none tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* Mandatory Disclaimer & Data Source Banner */}
      <div className="rounded-2xl border border-border bg-paper/60 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent-soft text-accent shrink-0 border border-teal-200">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold text-ink">
              PREDICTION, NOT FINAL RESULT: Probabilistic forecast based on continuous early assessments.
            </p>
            <p className="text-muted">
              Predictions highlight early risk signals to allow formative pedagogical interventions before final examinations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-muted">Data Source:</span>
          <span className="px-2.5 py-1 rounded-lg bg-surface border border-border text-ink font-mono font-medium">
            {data?.modelInfo?.data_source || 'Synthetic historical dataset (seeded)'}
          </span>
        </div>
      </div>

      {/* Error or Offline Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-status-below-soft border border-status-below/30 text-status-below text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && !data.mlServiceOnline && (
        <div className="p-5 rounded-2xl bg-status-borderline-soft border border-amber-200 text-status-borderline space-y-2">
          <div className="flex items-center gap-3 font-bold text-base text-amber-900 font-serif">
            <AlertTriangle className="w-5 h-5 text-status-borderline" />
            <span>ML Prediction Service Currently Offline</span>
          </div>
          <p className="text-xs text-amber-800">
            {data.message} The rest of the OBE platform remains fully operational. Please ensure the Python ML service is running on port 8000.
          </p>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-muted">Evaluating continuous assessment features & running model inference...</div>
      ) : data && data.mlServiceOnline ? (
        <div className="space-y-6">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-2xl p-5 space-y-1 shadow-card">
              <span className="text-xs text-muted font-medium">At-Risk Student Instances</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold font-serif tabular-nums ${data.atRiskCount > 0 ? 'text-status-borderline' : 'text-status-attained'}`}>
                  {data.atRiskCount}
                </span>
                <span className="text-xs text-muted">Student-CO pairs</span>
              </div>
              <p className="text-xs text-muted tabular-nums">
                {data.allPredictions?.filter((p) => p.risk_level === 'high').length} high risk ·{' '}
                {data.allPredictions?.filter((p) => p.risk_level === 'medium').length} medium risk
              </p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5 space-y-1 shadow-card">
              <span className="text-xs text-muted font-medium">Weakest Course Outcome</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-ink font-serif">
                  {data.weakestCO ? data.weakestCO.code : 'None'}
                </span>
                {data.weakestCO && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded tabular-nums ${data.weakestCO.willMeetTarget ? 'bg-status-attained-soft text-status-attained border border-emerald-200' : 'bg-status-below-soft text-status-below border border-red-200'}`}>
                    {data.weakestCO.predictedClassAttainment}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                {data.weakestCO && !data.weakestCO.willMeetTarget
                  ? `Shortfall of -${data.weakestCO.gap}% vs target`
                  : 'All COs predicted on track'}
              </p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5 space-y-1 shadow-card">
              <span className="text-xs text-muted font-medium">Early Assessments Analyzed</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-ink font-serif tabular-nums">{data.earlyAssessmentsCount}</span>
                <span className="text-xs text-muted">Assessments</span>
              </div>
              <p className="text-xs text-muted">Quizzes, internals & assignments</p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5 space-y-1 shadow-card">
              <span className="text-xs text-muted font-medium">Enrolled Cohort</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-ink font-serif tabular-nums">{data.totalStudents}</span>
                <span className="text-xs text-muted">Students</span>
              </div>
              <p className="text-xs text-muted">Course: {data.course?.code}</p>
            </div>
          </div>

          {/* Actionable Pedagogical Intervention Box */}
          <div className="bg-accent-soft/30 border border-teal-200 rounded-2xl p-6 space-y-3 shadow-card">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent-soft text-accent border border-teal-200">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink font-serif">Faculty Recommended Intervention Action</h3>
                <p className="text-xs text-muted">Automated pedagogical recommendation based on the weakest projected course outcome</p>
              </div>
            </div>
            <p className="text-sm text-ink leading-relaxed bg-surface p-4 rounded-xl border border-border">
              {data.suggestedAction}
            </p>
          </div>

          {/* Predicted Class CO Attainment Cards */}
          <div className="space-y-3">
            <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
              <Target className="w-5 h-5 text-accent" />
              <span>Predicted Class Attainment per Course Outcome</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.classSummary?.map((co) => (
                <div
                  key={co.coId}
                  className="bg-surface border border-border rounded-2xl p-5 space-y-3 hover:border-accent/40 transition-all shadow-card"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-accent-soft text-accent border border-teal-200 font-bold text-xs font-mono">
                      {co.code}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                        co.willMeetTarget
                          ? 'bg-status-attained-soft text-status-attained border-emerald-200'
                          : 'bg-status-below-soft text-status-below border-red-200'
                      }`}
                    >
                      {co.status}
                    </span>
                  </div>

                  <p className="text-xs text-muted line-clamp-2" title={co.statement}>
                    {co.statement}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-border">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">Predicted Class Attainment:</span>
                      <strong className={`font-bold tabular-nums ${co.willMeetTarget ? 'text-status-attained' : 'text-status-borderline'}`}>
                        {co.predictedClassAttainment}%
                      </strong>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-paper border border-border h-2 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all ${
                          co.willMeetTarget ? 'bg-status-attained' : 'bg-status-borderline'
                        }`}
                        style={{ width: `${Math.min(co.predictedClassAttainment, 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-muted pt-1 tabular-nums">
                      <span>Target: {co.targetThreshold}%</span>
                      <span>
                        {co.highRiskCount} high risk / {co.totalStudents || data.totalStudents} students
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* At-Risk Students Detailed Matrix Table */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-status-borderline" />
                  <span>Student Risk Roster & Contributing Factors</span>
                </h3>
                <p className="text-xs text-muted">
                  Individual student probability of attaining each CO by end-sem with explainable features
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Risk:</span>
                  <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="bg-surface border border-border rounded-lg px-2 py-1 text-xs text-ink focus:border-accent"
                  >
                    <option value="all">All Levels</option>
                    <option value="high">High Risk Only</option>
                    <option value="medium">Medium Risk</option>
                    <option value="low">Low Risk</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <span>CO:</span>
                  <select
                    value={coFilter}
                    onChange={(e) => setCoFilter(e.target.value)}
                    className="bg-surface border border-border rounded-lg px-2 py-1 text-xs text-ink focus:border-accent"
                  >
                    <option value="all">All COs</option>
                    {data.classSummary?.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-border bg-paper/50 text-xs font-semibold uppercase text-muted">
                    <th className="py-3 px-4">Roll No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-3 text-center">CO Code</th>
                    <th className="py-3 px-3 text-center">Early CO %</th>
                    <th className="py-3 px-3 text-center">Continuous Avg</th>
                    <th className="py-3 px-3 text-center">Trend</th>
                    <th className="py-3 px-3 text-center">Attainment Prob</th>
                    <th className="py-3 px-3 text-center">Risk Level</th>
                    <th className="py-3 px-4">Top Contributing Factors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted text-sm">
                        No students match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((item, idx) => (
                      <tr key={idx} className="hover:bg-paper/60 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs text-ink font-semibold bg-paper px-2 py-0.5 rounded border border-border inline-block tabular-nums">
                            {item.roll_no}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-ink">{item.student_name}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-accent-soft text-accent border border-teal-200 text-xs font-bold font-mono">
                            {item.co_code}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-xs font-semibold text-ink tabular-nums">
                          {item.early_co_pct}%
                        </td>
                        <td className="py-3 px-3 text-center text-xs text-muted tabular-nums">
                          {item.overall_early_pct}%
                        </td>
                        <td className="py-3 px-3 text-center text-xs tabular-nums">
                          {item.trend > 0 ? (
                            <span className="text-status-attained flex items-center justify-center gap-0.5 font-medium">
                              <TrendingUp className="w-3 h-3" />+{item.trend}%
                            </span>
                          ) : item.trend < 0 ? (
                            <span className="text-status-below flex items-center justify-center gap-0.5 font-medium">
                              <TrendingDown className="w-3 h-3" />{item.trend}%
                            </span>
                          ) : (
                            <span className="text-muted">0.0%</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-xs tabular-nums">
                          <span className={item.attainment_probability >= 0.70 ? 'text-status-attained' : item.attainment_probability >= 0.45 ? 'text-status-borderline' : 'text-status-below'}>
                            {(item.attainment_probability * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full border text-xs capitalize ${getRiskBadge(item.risk_level)}`}>
                            {item.risk_level}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {item.top_features?.slice(0, 2).map((feat, fIdx) => (
                              <span
                                key={fIdx}
                                className={`text-[11px] px-2 py-0.5 rounded border ${
                                  feat.impact === 'negative'
                                    ? 'bg-status-below-soft text-status-below border-red-200 font-medium'
                                    : feat.impact === 'positive'
                                    ? 'bg-status-attained-soft text-status-attained border-emerald-200 font-medium'
                                    : 'bg-paper text-muted border-border'
                                }`}
                              >
                                {feat.name}: {feat.value}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
