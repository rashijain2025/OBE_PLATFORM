import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listCoursesApi } from '../../api/admin';
import { getCoursePredictionsApi } from '../../api/prediction';
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
        return 'bg-red-500/20 text-red-300 border-red-500/40 font-bold';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
      case 'low':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">AI Early Warning & At-Risk Predictor</h1>
              <p className="text-sm text-gray-400">
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
            className="w-full sm:w-64 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5">
            <span className="text-xs text-gray-400">Target %:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={targetThreshold}
              onChange={(e) => setTargetThreshold(e.target.value)}
              className="w-12 bg-transparent text-sm font-bold text-white text-right focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Mandatory Disclaimer & Data Source Banner */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-gray-900 border border-indigo-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold text-white">
              PREDICTION, NOT FINAL RESULT: Probabilistic forecast based on continuous early assessments.
            </p>
            <p className="text-gray-300">
              Predictions highlight early risk signals to allow formative pedagogical interventions before final examinations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-gray-400">Data Source:</span>
          <span className="px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-700 text-indigo-300 font-mono font-medium">
            {data?.modelInfo?.data_source || 'Synthetic historical dataset (seeded)'}
          </span>
        </div>
      </div>

      {/* Error or Offline Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && !data.mlServiceOnline && (
        <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-800/50 text-amber-300 space-y-2">
          <div className="flex items-center gap-3 font-bold text-base">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>ML Prediction Service Currently Offline</span>
          </div>
          <p className="text-xs text-amber-200/80">
            {data.message} The rest of the OBE platform remains fully operational. Please ensure the Python ML service is running on port 8000.
          </p>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-gray-400">Evaluating continuous assessment features & running model inference...</div>
      ) : data && data.mlServiceOnline ? (
        <div className="space-y-6">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-gray-400 font-medium">At-Risk Student Instances</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold ${data.atRiskCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {data.atRiskCount}
                </span>
                <span className="text-xs text-gray-400">Student-CO pairs</span>
              </div>
              <p className="text-xs text-gray-400">
                {data.allPredictions?.filter((p) => p.risk_level === 'high').length} high risk ·{' '}
                {data.allPredictions?.filter((p) => p.risk_level === 'medium').length} medium risk
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-gray-400 font-medium">Weakest Course Outcome</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {data.weakestCO ? data.weakestCO.code : 'None'}
                </span>
                {data.weakestCO && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${data.weakestCO.willMeetTarget ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {data.weakestCO.predictedClassAttainment}%
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {data.weakestCO && !data.weakestCO.willMeetTarget
                  ? `Shortfall of -${data.weakestCO.gap}% vs target`
                  : 'All COs predicted on track'}
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-gray-400 font-medium">Early Assessments Analyzed</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">{data.earlyAssessmentsCount}</span>
                <span className="text-xs text-gray-400">Assessments</span>
              </div>
              <p className="text-xs text-gray-400">Quizzes, internals & assignments</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-gray-400 font-medium">Enrolled Cohort</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">{data.totalStudents}</span>
                <span className="text-xs text-gray-400">Students</span>
              </div>
              <p className="text-xs text-gray-400">Course: {data.course?.code}</p>
            </div>
          </div>

          {/* Actionable Pedagogical Intervention Box */}
          <div className="bg-indigo-950/20 border border-indigo-800/40 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Faculty Recommended Intervention Action</h3>
                <p className="text-xs text-gray-400">Automated pedagogical recommendation based on the weakest projected course outcome</p>
              </div>
            </div>
            <p className="text-sm text-indigo-200 leading-relaxed bg-gray-950/60 p-4 rounded-xl border border-gray-800">
              {data.suggestedAction}
            </p>
          </div>

          {/* Predicted Class CO Attainment Cards */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-400" />
              <span>Predicted Class Attainment per Course Outcome</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.classSummary?.map((co) => (
                <div
                  key={co.coId}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3 hover:border-gray-700 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold text-xs">
                      {co.code}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                        co.willMeetTarget
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}
                    >
                      {co.status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 line-clamp-2" title={co.statement}>
                    {co.statement}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-gray-800">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Predicted Class Attainment:</span>
                      <strong className={`font-bold ${co.willMeetTarget ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {co.predictedClassAttainment}%
                      </strong>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all ${
                          co.willMeetTarget ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(co.predictedClassAttainment, 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-gray-500 pt-1">
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
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <span>Student Risk Roster & Contributing Factors</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Individual student probability of attaining each CO by end-sem with explainable features
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Risk:</span>
                  <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-xs text-white"
                  >
                    <option value="all">All Levels</option>
                    <option value="high">High Risk Only</option>
                    <option value="medium">Medium Risk</option>
                    <option value="low">Low Risk</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span>CO:</span>
                  <select
                    value={coFilter}
                    onChange={(e) => setCoFilter(e.target.value)}
                    className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-xs text-white"
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
                  <tr className="border-b border-gray-800 bg-gray-950/60 text-xs font-semibold uppercase text-gray-400">
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
                <tbody className="divide-y divide-gray-800/60">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-400 text-sm">
                        No students match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-amber-400">{item.roll_no}</td>
                        <td className="py-3 px-4 font-medium text-white">{item.student_name}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold">
                            {item.co_code}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-xs font-semibold text-gray-200">
                          {item.early_co_pct}%
                        </td>
                        <td className="py-3 px-3 text-center text-xs text-gray-300">
                          {item.overall_early_pct}%
                        </td>
                        <td className="py-3 px-3 text-center text-xs">
                          {item.trend > 0 ? (
                            <span className="text-emerald-400 flex items-center justify-center gap-0.5">
                              <TrendingUp className="w-3 h-3" />+{item.trend}%
                            </span>
                          ) : item.trend < 0 ? (
                            <span className="text-red-400 flex items-center justify-center gap-0.5">
                              <TrendingDown className="w-3 h-3" />{item.trend}%
                            </span>
                          ) : (
                            <span className="text-gray-500">0.0%</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-xs">
                          <span className={item.attainment_probability >= 0.70 ? 'text-emerald-400' : item.attainment_probability >= 0.45 ? 'text-amber-400' : 'text-red-400'}>
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
                                    ? 'bg-red-500/10 text-red-300 border-red-500/20'
                                    : feat.impact === 'positive'
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                    : 'bg-gray-800 text-gray-400 border-gray-700'
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
