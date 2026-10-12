import React, { useState, useEffect, Component } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listProgrammesApi } from '../../api/admin';
import { getProgrammeAttainmentApi, exportProgrammeCSVUrl } from '../../api/programme';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Award,
  Download,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Filter,
  GraduationCap,
  Layers,
  ChevronDown,
  ChevronRight,
  Radar as RadarIcon,
  BookOpen,
} from 'lucide-react';

/**
 * ErrorBoundary to prevent any rendering failure from crashing the app into a blank screen.
 */
class ProgrammeReportErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ProgrammeReportErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 bg-gray-900 border border-red-800/40 rounded-2xl text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Something went wrong loading the report</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            {this.state.error?.message || 'An unexpected error occurred while rendering the Programme Attainment Report.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProgrammeReportPageContent() {
  const { user } = useAuth();
  const [programmes, setProgrammes] = useState([]);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('');
  const [targetThreshold, setTargetThreshold] = useState(60);
  const [academicYear, setAcademicYear] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedOutcome, setExpandedOutcome] = useState(null);
  const [chartView, setChartView] = useState('bar'); // 'bar' or 'radar'

  // 1. Load programmes on mount
  useEffect(() => {
    async function loadProgrammes() {
      try {
        setLoading(true);
        setError('');
        const res = await listProgrammesApi();
        // Handle both wrapped { data: [...] } and unwrapped [...]
        const progs = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setProgrammes(progs);

        if (progs.length > 0) {
          const userDeptId = user?.department?._id || user?.department;
          const matchingProg = progs.find((p) => String(p.department?._id || p.department) === String(userDeptId));
          setSelectedProgrammeId(matchingProg ? matchingProg._id : progs[0]._id);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load programmes');
      } finally {
        setLoading(false);
      }
    }
    loadProgrammes();
  }, [user]);

  // 2. Fetch report when programme, target, or academic year changes
  useEffect(() => {
    if (!selectedProgrammeId) return;
    fetchReport();
  }, [selectedProgrammeId, targetThreshold, academicYear]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getProgrammeAttainmentApi(selectedProgrammeId, targetThreshold, academicYear);
      // Handle both wrapped and unwrapped response shapes
      const data = res?.data !== undefined ? (res.data?.data !== undefined ? res.data.data : res.data) : res;
      setReportData(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate programme attainment report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!selectedProgrammeId) return;
    const url = exportProgrammeCSVUrl(selectedProgrammeId, targetThreshold, academicYear);
    window.open(url, '_blank');
  };

  // Prepare chart datasets safely
  const allOutcomes = [
    ...(reportData?.pos || []),
    ...(reportData?.psos || []),
  ];

  const barChartData = allOutcomes.map((o) => ({
    name: o.code,
    attainment: typeof o.attainment === 'number' ? o.attainment : null,
    chartValue: typeof o.attainment === 'number' ? o.attainment : 0,
    target: o.targetThreshold || targetThreshold,
    status: o.status || 'Not mapped / No data',
    hasData: typeof o.attainment === 'number',
    title: o.title || o.code,
  }));

  const radarChartData = (reportData?.pos || []).map((po) => ({
    attribute: po.code,
    attainment: typeof po.attainment === 'number' ? po.attainment : 0,
    hasData: typeof po.attainment === 'number',
    target: targetThreshold,
    fullMark: 100,
  }));

  const hasAnyEvaluatedRadarData = radarChartData.some((p) => p.hasData);

  const toggleExpand = (code) => {
    setExpandedOutcome(expandedOutcome === code ? null : code);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Programme Attainment Report</h1>
              <p className="text-sm text-gray-400">
                Washington Accord & NBA Graduate Attribute PO / PSO Attainment Analytics
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons & Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Programme selector */}
          <select
            value={selectedProgrammeId}
            onChange={(e) => setSelectedProgrammeId(e.target.value)}
            disabled={programmes.length === 0}
            className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          >
            {programmes.length === 0 ? (
              <option value="">No Programmes Available</option>
            ) : (
              programmes.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.code} - {p.name}
                </option>
              ))
            )}
          </select>

          {/* Target Threshold */}
          <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5">
            <span className="text-xs text-gray-400">Target %:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={targetThreshold}
              onChange={(e) => setTargetThreshold(Number(e.target.value) || 0)}
              className="w-14 bg-transparent text-sm font-bold text-white text-right focus:outline-none"
            />
          </div>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={loading || !reportData || !selectedProgrammeId}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium border border-gray-700 transition-all shrink-0 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Generating programme attainment report...</p>
        </div>
      ) : programmes.length === 0 ? (
        <div className="p-12 text-center bg-gray-900 border border-gray-800 rounded-2xl text-gray-400 space-y-2">
          <GraduationCap className="w-10 h-10 mx-auto text-gray-600 mb-2" />
          <h3 className="text-base font-semibold text-white">No Programmes Available</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Please ask an administrator to create an academic programme for your department.
          </p>
        </div>
      ) : !reportData ? (
        <div className="p-12 text-center bg-gray-900 border border-gray-800 rounded-2xl text-gray-400 space-y-2">
          <HelpCircle className="w-10 h-10 mx-auto text-gray-600 mb-2" />
          <h3 className="text-base font-semibold text-white">No Report Data Available</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Select a programme from the dropdown above to view its Graduate Attribute Attainment Report.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Executive Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-gray-400 font-medium">Average PO Attainment</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  {reportData.summary?.pos?.averageAttainment !== null && reportData.summary?.pos?.averageAttainment !== undefined
                    ? `${reportData.summary.pos.averageAttainment}%`
                    : 'N/A'}
                </span>
                <span className="text-xs text-gray-400 font-semibold">
                  Target: {targetThreshold}%
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {reportData.summary?.pos?.attained || 0} of {reportData.summary?.pos?.evaluated || 0} evaluated POs attained
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-gray-400 font-medium">Average PSO Attainment</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  {reportData.summary?.psos?.averageAttainment !== null && reportData.summary?.psos?.averageAttainment !== undefined
                    ? `${reportData.summary.psos.averageAttainment}%`
                    : 'N/A'}
                </span>
                <span className="text-xs text-gray-400 font-semibold">
                  Target: {targetThreshold}%
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {reportData.summary?.psos?.attained || 0} of {reportData.summary?.psos?.evaluated || 0} evaluated PSOs attained
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-gray-400 font-medium">Below Target Shortfalls</span>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl font-extrabold ${
                    (reportData.summary?.totalBelowTargetCount || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {reportData.summary?.totalBelowTargetCount || 0}
                </span>
                <span className="text-xs text-gray-400">Outcomes</span>
              </div>
              <p className="text-xs text-gray-400">
                {(reportData.summary?.totalBelowTargetCount || 0) === 0
                  ? 'All evaluated outcomes meet target'
                  : 'Requires curriculum action plan'}
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-gray-400 font-medium">Courses Evaluated</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">{reportData.coursesCount ?? 0}</span>
                <span className="text-xs text-gray-400">Courses</span>
              </div>
              <p className="text-xs text-gray-400">
                Programme: {reportData.programme?.code || 'N/A'}
              </p>
            </div>
          </div>

          {/* BELOW TARGET ALERTS SECTION */}
          {reportData.belowTargetOutcomes?.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Accreditation Gap Alert: {reportData.belowTargetOutcomes.length} Outcome(s) Below Target
                  </h3>
                  <p className="text-xs text-amber-300/80">
                    The following outcomes have attained less than the institutional target ({targetThreshold}%).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {reportData.belowTargetOutcomes.map((item) => (
                  <div
                    key={item.outcomeId || item.code}
                    className="bg-gray-900/80 border border-amber-800/30 rounded-xl p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold text-xs">
                        {item.code}
                      </span>
                      <span className="text-xs text-red-400 font-semibold">
                        Gap: -{item.gap !== null ? item.gap : 'N/A'}%
                      </span>
                    </div>
                    {item.title && <p className="text-xs font-semibold text-white">{item.title}</p>}
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-800 text-gray-400">
                      <span>Attainment: <strong className="text-amber-300">{item.attainment !== null ? `${item.attainment}%` : 'Not mapped / No data'}</strong></span>
                      <span>Target: {item.targetThreshold}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISUALIZATION CHARTS: BAR & RADAR */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  <span>Graduate Attribute Attainment Profile</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Visual attainment performance against the institutional target threshold ({targetThreshold}%)
                </p>
              </div>

              {/* Chart View Toggle */}
              <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800">
                <button
                  onClick={() => setChartView('bar')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    chartView === 'bar'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Bar Chart</span>
                </button>
                <button
                  onClick={() => setChartView('radar')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    chartView === 'radar'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <RadarIcon className="w-3.5 h-3.5" />
                  <span>Spider / Radar</span>
                </button>
              </div>
            </div>

            {/* BAR CHART VIEW */}
            {chartView === 'bar' && (
              barChartData.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No outcomes (POs / PSOs) defined to display in the bar chart.
                </div>
              ) : (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                      <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                      <YAxis domain={[0, 100]} stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-gray-900 border border-gray-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
                                <p className="font-bold text-white">{d.name} {d.title !== d.name ? `— ${d.title}` : ''}</p>
                                <p className="text-gray-300">
                                  Attainment: <strong className="text-indigo-400">{d.hasData ? `${d.attainment}%` : 'Not mapped / No data'}</strong>
                                </p>
                                <p className="text-gray-400">Target Threshold: {d.target}%</p>
                                <p className={`font-semibold ${d.status === 'Attained' ? 'text-emerald-400' : d.status === 'Below Target' ? 'text-amber-400' : 'text-gray-400'}`}>
                                  Status: {d.status}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <ReferenceLine
                        y={targetThreshold}
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        label={{ value: `Target (${targetThreshold}%)`, fill: '#f59e0b', fontSize: 11, position: 'top' }}
                      />
                      <Bar dataKey="chartValue" radius={[6, 6, 0, 0]}>
                        {barChartData.map((entry, index) => {
                          let color = '#6b7280'; // gray default
                          if (!entry.hasData) color = '#374151'; // unmapped / no data
                          else if (entry.attainment >= targetThreshold) color = '#10b981'; // emerald
                          else color = '#f59e0b'; // amber/red
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            )}

            {/* RADAR / SPIDER CHART VIEW */}
            {chartView === 'radar' && (
              radarChartData.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No Program Outcomes (POs) defined to display in the radar chart.
                </div>
              ) : (
                <div className="space-y-3">
                  {!hasAnyEvaluatedRadarData && (
                    <div className="p-2.5 rounded-xl bg-gray-950/80 border border-gray-800 text-gray-400 text-xs text-center">
                      Notice: Program Outcomes have no evaluated course mappings yet. Displaying baseline target comparison.
                    </div>
                  )}
                  <div className="h-96 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                        <PolarGrid stroke="#374151" />
                        <PolarAngleAxis dataKey="attribute" stroke="#9ca3af" tick={{ fill: '#e5e7eb', fontSize: 12, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#4b5563" />
                        <Radar
                          name="Attainment %"
                          dataKey="attainment"
                          stroke="#6366f1"
                          fill="#6366f1"
                          fillOpacity={hasAnyEvaluatedRadarData ? 0.4 : 0.05}
                        />
                        <Radar
                          name="Target %"
                          dataKey="target"
                          stroke="#f59e0b"
                          fill="#f59e0b"
                          fillOpacity={0.1}
                          strokeDasharray="3 3"
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const p = payload[0].payload;
                              return (
                                <div className="bg-gray-900 border border-gray-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                                  <p className="font-bold text-white">{p.attribute}</p>
                                  <p className="text-indigo-400">
                                    Attainment: {p.hasData ? `${p.attainment}%` : 'Not mapped / No data'}
                                  </p>
                                  <p className="text-amber-400">Target: {p.target}%</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            )}
          </div>

          {/* DETAILED OUTCOMES TABLE */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Program Outcomes & Program Specific Outcomes Attainment Breakdown</span>
            </h3>

            {allOutcomes.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No outcomes (POs / PSOs) defined for this programme.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-950/60 text-xs font-semibold uppercase text-gray-400">
                      <th className="py-3 px-4 w-12"></th>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Title / Statement</th>
                      <th className="py-3 px-4 text-center">Target</th>
                      <th className="py-3 px-4 text-center">Attainment</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Gap</th>
                      <th className="py-3 px-4 text-center">Contributing COs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {allOutcomes.map((item) => {
                      const isExpanded = expandedOutcome === item.code;
                      return (
                        <React.Fragment key={item.code}>
                          <tr
                            onClick={() => toggleExpand(item.code)}
                            className="hover:bg-gray-800/40 transition-colors cursor-pointer"
                          >
                            <td className="py-3 px-4 text-gray-500">
                              {item.contributingCOs?.length > 0 ? (
                                isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-indigo-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )
                              ) : null}
                            </td>
                            <td className="py-3 px-4 font-bold text-white">
                              <span
                                className={`px-2 py-0.5 rounded text-xs border ${
                                  item.type === 'PO'
                                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}
                              >
                                {item.code}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-md">
                              {item.title && <div className="font-semibold text-white">{item.title}</div>}
                              <div className="text-xs text-gray-400 line-clamp-2">{item.statement}</div>
                            </td>
                            <td className="py-3 px-4 text-center font-medium text-gray-300">
                              {item.targetThreshold}%
                            </td>
                            <td className="py-3 px-4 text-center font-bold">
                              {item.attainment !== null ? (
                                <span
                                  className={
                                    item.attainment >= item.targetThreshold
                                      ? 'text-emerald-400'
                                      : 'text-amber-400'
                                  }
                                >
                                  {item.attainment}%
                                </span>
                              ) : (
                                <span className="text-gray-500 italic">Not mapped / No data</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  item.status === 'Attained'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : item.status === 'Below Target'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                                }`}
                              >
                                {item.status || 'Not mapped / No data'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-xs font-medium">
                              {item.gap !== null && item.gap > 0 ? (
                                <span className="text-red-400 font-bold">-{item.gap}%</span>
                              ) : item.gap === 0 ? (
                                <span className="text-emerald-400 font-bold">0%</span>
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center text-xs text-gray-300">
                              {item.evaluatedCOsCount || 0} of {item.totalMappedCOsCount || 0} evaluated
                            </td>
                          </tr>

                          {/* Collapsible Contributing COs Breakdown */}
                          {isExpanded && item.contributingCOs?.length > 0 && (
                            <tr className="bg-gray-950/70 border-b border-gray-800">
                              <td colSpan={8} className="p-4 pl-12 space-y-2">
                                <div className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                                  Contributing Course Outcomes (COs) for {item.code}:
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                                  {item.contributingCOs.map((c, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs space-y-1"
                                    >
                                      <div className="flex justify-between font-semibold text-white">
                                        <span>{c.courseCode} — {c.coCode}</span>
                                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                                          Strength: {c.strength}
                                        </span>
                                      </div>
                                      <p className="text-gray-400 truncate">{c.courseName}</p>
                                      <div className="flex justify-between pt-1 border-t border-gray-800 text-gray-300">
                                        <span>CO Attainment:</span>
                                        <strong className={c.coAttainment !== null ? 'text-white' : 'text-gray-500'}>
                                          {c.coAttainment !== null ? `${c.coAttainment}%` : 'Not mapped / No data'}
                                        </strong>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* COURSE-WISE PO ATTAINMENT MATRIX (NBA FORMAT) */}
          {(reportData.courseMatrix || []).length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>Course-wise PO Attainment Matrix (NBA Criterion 3 Format)</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-950/60 text-xs font-semibold text-gray-400">
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-3 text-center">Sem</th>
                      {(reportData?.pos || []).map((po) => (
                        <th key={po._id || po.code} className="py-3 px-2 text-center text-indigo-400 font-bold">
                          {po.code}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {(reportData.courseMatrix || []).map((row) => (
                      <tr key={row.courseId || row.code} className="hover:bg-gray-800/30">
                        <td className="py-3 px-4 font-semibold text-white">
                          <span className="font-bold text-indigo-400">{row.code}</span> - {row.name}
                        </td>
                        <td className="py-3 px-3 text-center text-xs text-gray-400">{row.semester}</td>
                        {(reportData?.pos || []).map((po) => {
                          const val = row.pos?.[po.code]?.attainment;
                          return (
                            <td key={po._id || po.code} className="py-3 px-2 text-center text-xs font-semibold">
                              {val !== null && val !== undefined ? (
                                <span className={val >= targetThreshold ? 'text-emerald-400' : 'text-amber-400'}>
                                  {val}%
                                </span>
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Overall Programme PO Attainment Row */}
                    <tr className="bg-gray-950 font-bold border-t border-gray-700">
                      <td className="py-3 px-4 text-indigo-400" colSpan={2}>
                        Programme Overall PO Attainment
                      </td>
                      {(reportData?.pos || []).map((po) => (
                        <td key={po._id || po.code} className="py-3 px-2 text-center text-xs font-bold">
                          {po.attainment !== null ? (
                            <span className={po.attainment >= targetThreshold ? 'text-emerald-400' : 'text-amber-400'}>
                              {po.attainment}%
                            </span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProgrammeReportPage() {
  return (
    <ProgrammeReportErrorBoundary>
      <ProgrammeReportPageContent />
    </ProgrammeReportErrorBoundary>
  );
}
