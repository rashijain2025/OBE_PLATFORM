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
        <div className="p-8 my-6 bg-surface border border-red-200 rounded-2xl text-center space-y-4 shadow-sm">
          <div className="inline-flex p-3 rounded-full bg-status-below-soft text-status-below border border-red-200">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-serif font-bold text-ink">Something went wrong loading the report</h2>
          <p className="text-sm text-muted max-w-md mx-auto">
            {this.state.error?.message || 'An unexpected error occurred while rendering the Programme Attainment Report.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-ink hover:bg-ink-dark text-paper rounded-xl text-sm font-semibold transition shadow-sm"
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-border p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-soft text-accent border border-teal-200">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-ink tracking-tight">Programme Attainment Report</h1>
              <p className="text-sm text-muted">
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
            className="bg-paper border border-border rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink disabled:opacity-50 shadow-sm"
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
          <div className="flex items-center gap-2 bg-paper border border-border rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-xs text-muted">Target %:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={targetThreshold}
              onChange={(e) => setTargetThreshold(Number(e.target.value) || 0)}
              className="w-14 bg-transparent text-sm font-bold text-ink text-right focus:outline-none font-mono tabular-nums"
            />
          </div>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={loading || !reportData || !selectedProgrammeId}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-paper hover:bg-surface text-ink text-sm font-medium border border-border transition-all shrink-0 disabled:opacity-50 shadow-sm"
          >
            <Download className="w-4 h-4 text-accent" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-status-below-soft border border-red-200 text-status-below text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-muted flex flex-col items-center justify-center space-y-3 font-mono">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Generating programme attainment report...</p>
        </div>
      ) : programmes.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-border rounded-2xl text-muted space-y-2 shadow-sm">
          <GraduationCap className="w-10 h-10 mx-auto text-muted/60 mb-2" />
          <h3 className="text-base font-serif font-semibold text-ink">No Programmes Available</h3>
          <p className="text-xs text-muted max-w-md mx-auto">
            Please ask an administrator to create an academic programme for your department.
          </p>
        </div>
      ) : !reportData ? (
        <div className="p-12 text-center bg-surface border border-border rounded-2xl text-muted space-y-2 shadow-sm">
          <HelpCircle className="w-10 h-10 mx-auto text-muted/60 mb-2" />
          <h3 className="text-base font-serif font-semibold text-ink">No Report Data Available</h3>
          <p className="text-xs text-muted max-w-md mx-auto">
            Select a programme from the dropdown above to view its Graduate Attribute Attainment Report.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Executive Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-2xl p-5 space-y-1 shadow-sm">
              <span className="text-xs text-muted font-medium">Average PO Attainment</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-extrabold text-ink tabular-nums">
                  {reportData.summary?.pos?.averageAttainment !== null && reportData.summary?.pos?.averageAttainment !== undefined
                    ? `${reportData.summary.pos.averageAttainment}%`
                    : 'N/A'}
                </span>
                <span className="text-xs text-muted font-semibold font-mono tabular-nums">
                  Target: {targetThreshold}%
                </span>
              </div>
              <p className="text-xs text-muted font-mono tabular-nums">
                {reportData.summary?.pos?.attained || 0} of {reportData.summary?.pos?.evaluated || 0} evaluated POs attained
              </p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5 space-y-1 shadow-sm">
              <span className="text-xs text-muted font-medium">Average PSO Attainment</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-extrabold text-ink tabular-nums">
                  {reportData.summary?.psos?.averageAttainment !== null && reportData.summary?.psos?.averageAttainment !== undefined
                    ? `${reportData.summary.psos.averageAttainment}%`
                    : 'N/A'}
                </span>
                <span className="text-xs text-muted font-semibold font-mono tabular-nums">
                  Target: {targetThreshold}%
                </span>
              </div>
              <p className="text-xs text-muted font-mono tabular-nums">
                {reportData.summary?.psos?.attained || 0} of {reportData.summary?.psos?.evaluated || 0} evaluated PSOs attained
              </p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5 space-y-1 shadow-sm">
              <span className="text-xs text-muted font-medium">Below Target Shortfalls</span>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl font-serif font-extrabold tabular-nums ${
                    (reportData.summary?.totalBelowTargetCount || 0) > 0 ? 'text-status-borderline' : 'text-status-attained'
                  }`}
                >
                  {reportData.summary?.totalBelowTargetCount || 0}
                </span>
                <span className="text-xs text-muted">Outcomes</span>
              </div>
              <p className="text-xs text-muted">
                {(reportData.summary?.totalBelowTargetCount || 0) === 0
                  ? 'All evaluated outcomes meet target'
                  : 'Requires curriculum action plan'}
              </p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5 space-y-1 shadow-sm">
              <span className="text-xs text-muted font-medium">Courses Evaluated</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-extrabold text-ink tabular-nums">{reportData.coursesCount ?? 0}</span>
                <span className="text-xs text-muted">Courses</span>
              </div>
              <p className="text-xs text-muted">
                Programme: <strong className="text-ink font-semibold">{reportData.programme?.code || 'N/A'}</strong>
              </p>
            </div>
          </div>

          {/* BELOW TARGET ALERTS SECTION */}
          {reportData.belowTargetOutcomes?.length > 0 && (
            <div className="bg-status-borderline-soft border border-amber-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-status-borderline-soft text-status-borderline border border-amber-300">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-ink">
                    Accreditation Gap Alert: {reportData.belowTargetOutcomes.length} Outcome(s) Below Target
                  </h3>
                  <p className="text-xs text-ink/80">
                    The following outcomes have attained less than the institutional target ({targetThreshold}%).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {reportData.belowTargetOutcomes.map((item) => (
                  <div
                    key={item.outcomeId || item.code}
                    className="bg-surface border border-amber-200 rounded-xl p-4 space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-status-borderline-soft text-status-borderline border border-amber-200 font-bold text-xs font-mono">
                        {item.code}
                      </span>
                      <span className="text-xs text-status-below font-semibold font-mono tabular-nums">
                        Gap: -{item.gap !== null ? item.gap : 'N/A'}%
                      </span>
                    </div>
                    {item.title && <p className="text-xs font-serif font-semibold text-ink">{item.title}</p>}
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-border text-muted font-mono tabular-nums">
                      <span>Attainment: <strong className="text-status-borderline">{item.attainment !== null ? `${item.attainment}%` : 'Not mapped / No data'}</strong></span>
                      <span>Target: {item.targetThreshold}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISUALIZATION CHARTS: BAR & RADAR */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-serif font-bold text-ink flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-accent" />
                  <span>Graduate Attribute Attainment Profile</span>
                </h3>
                <p className="text-xs text-muted">
                  Visual attainment performance against the institutional target threshold ({targetThreshold}%)
                </p>
              </div>

              {/* Chart View Toggle */}
              <div className="flex items-center gap-1 bg-paper p-1 rounded-xl border border-border">
                <button
                  onClick={() => setChartView('bar')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    chartView === 'bar'
                      ? 'bg-ink text-paper shadow-sm'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Bar Chart</span>
                </button>
                <button
                  onClick={() => setChartView('radar')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    chartView === 'radar'
                      ? 'bg-ink text-paper shadow-sm'
                      : 'text-muted hover:text-ink'
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
                <div className="p-8 text-center text-muted text-sm font-mono">
                  No outcomes (POs / PSOs) defined to display in the bar chart.
                </div>
              ) : (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E7E1D6" opacity={1} />
                      <XAxis dataKey="name" stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }} />
                      <YAxis domain={[0, 100]} stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-surface border border-border p-3 rounded-xl shadow-xl text-xs space-y-1">
                                <p className="font-serif font-bold text-ink">{d.name} {d.title !== d.name ? `— ${d.title}` : ''}</p>
                                <p className="text-muted">
                                  Attainment: <strong className="text-accent font-mono tabular-nums">{d.hasData ? `${d.attainment}%` : 'Not mapped / No data'}</strong>
                                </p>
                                <p className="text-muted font-mono tabular-nums">Target Threshold: {d.target}%</p>
                                <p className={`font-semibold ${d.status === 'Attained' ? 'text-status-attained' : d.status === 'Below Target' ? 'text-status-borderline' : 'text-muted'}`}>
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
                        stroke="#E11D48"
                        strokeDasharray="4 4"
                        label={{ value: `Target (${targetThreshold}%)`, fill: '#E11D48', fontSize: 11, position: 'top' }}
                      />
                      <Bar dataKey="chartValue" radius={[6, 6, 0, 0]}>
                        {barChartData.map((entry, index) => {
                          let color = '#9CA3AF'; // neutral
                          if (!entry.hasData) color = '#E7E1D6'; // unmapped / no data
                          else if (entry.attainment >= targetThreshold) color = '#059669'; // emerald
                          else color = '#D97706'; // amber
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
                <div className="p-8 text-center text-muted text-sm font-mono">
                  No Program Outcomes (POs) defined to display in the radar chart.
                </div>
              ) : (
                <div className="space-y-3">
                  {!hasAnyEvaluatedRadarData && (
                    <div className="p-2.5 rounded-xl bg-paper border border-border text-muted text-xs text-center font-mono">
                      Notice: Program Outcomes have no evaluated course mappings yet. Displaying baseline target comparison.
                    </div>
                  )}
                  <div className="h-96 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                        <PolarGrid stroke="#E7E1D6" />
                        <PolarAngleAxis dataKey="attribute" stroke="#6B7280" tick={{ fill: '#1B2A4A', fontSize: 12, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#E7E1D6" />
                        <Radar
                          name="Attainment %"
                          dataKey="attainment"
                          stroke="#0F9FA8"
                          fill="#0F9FA8"
                          fillOpacity={hasAnyEvaluatedRadarData ? 0.35 : 0.05}
                        />
                        <Radar
                          name="Target %"
                          dataKey="target"
                          stroke="#E11D48"
                          fill="#E11D48"
                          fillOpacity={0.08}
                          strokeDasharray="3 3"
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const p = payload[0].payload;
                              return (
                                <div className="bg-surface border border-border p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                                  <p className="font-serif font-bold text-ink">{p.attribute}</p>
                                  <p className="text-accent font-mono tabular-nums">
                                    Attainment: {p.hasData ? `${p.attainment}%` : 'Not mapped / No data'}
                                  </p>
                                  <p className="text-status-below font-mono tabular-nums">Target: {p.target}%</p>
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
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-serif font-bold text-ink flex items-center gap-2">
              <Layers className="w-5 h-5 text-accent" />
              <span>Program Outcomes & Program Specific Outcomes Attainment Breakdown</span>
            </h3>

            {allOutcomes.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm font-mono">
                No outcomes (POs / PSOs) defined for this programme.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-paper text-xs font-semibold uppercase text-muted">
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
                  <tbody className="divide-y divide-border">
                    {allOutcomes.map((item) => {
                      const isExpanded = expandedOutcome === item.code;
                      return (
                        <React.Fragment key={item.code}>
                          <tr
                            onClick={() => toggleExpand(item.code)}
                            className="hover:bg-paper/50 transition-colors cursor-pointer"
                          >
                            <td className="py-3 px-4 text-muted">
                              {item.contributingCOs?.length > 0 ? (
                                isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-accent" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted" />
                                )
                              ) : null}
                            </td>
                            <td className="py-3 px-4 font-bold text-ink">
                              <span
                                className={`px-2 py-0.5 rounded text-xs border font-mono ${
                                  item.type === 'PO'
                                    ? 'bg-accent-soft text-accent border-teal-200'
                                    : 'bg-status-attained-soft text-status-attained border-emerald-200'
                                }`}
                              >
                                {item.code}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-md">
                              {item.title && <div className="font-serif font-semibold text-ink">{item.title}</div>}
                              <div className="text-xs text-muted line-clamp-2">{item.statement}</div>
                            </td>
                            <td className="py-3 px-4 text-center font-medium text-muted font-mono tabular-nums">
                              {item.targetThreshold}%
                            </td>
                            <td className="py-3 px-4 text-center font-bold font-mono tabular-nums">
                              {item.attainment !== null ? (
                                <span
                                  className={
                                    item.attainment >= item.targetThreshold
                                      ? 'text-status-attained'
                                      : 'text-status-borderline'
                                  }
                                >
                                  {item.attainment}%
                                </span>
                              ) : (
                                <span className="text-muted italic">Not mapped / No data</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  item.status === 'Attained'
                                    ? 'bg-status-attained-soft text-status-attained border border-emerald-200'
                                    : item.status === 'Below Target'
                                    ? 'bg-status-borderline-soft text-status-borderline border border-amber-200'
                                    : 'bg-paper text-muted border border-border'
                                }`}
                              >
                                {item.status || 'Not mapped / No data'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-xs font-medium font-mono tabular-nums">
                              {item.gap !== null && item.gap > 0 ? (
                                <span className="text-status-below font-bold">-{item.gap}%</span>
                              ) : item.gap === 0 ? (
                                <span className="text-status-attained font-bold">0%</span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center text-xs text-muted font-mono tabular-nums">
                              {item.evaluatedCOsCount || 0} of {item.totalMappedCOsCount || 0} evaluated
                            </td>
                          </tr>

                          {/* Collapsible Contributing COs Breakdown */}
                          {isExpanded && item.contributingCOs?.length > 0 && (
                            <tr className="bg-paper/40 border-b border-border">
                              <td colSpan={8} className="p-4 pl-12 space-y-2">
                                <div className="text-xs font-serif font-bold text-ink uppercase tracking-wider">
                                  Contributing Course Outcomes (COs) for {item.code}:
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                                  {item.contributingCOs.map((c, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-surface border border-border rounded-xl p-3 text-xs space-y-1 shadow-sm"
                                    >
                                      <div className="flex justify-between font-semibold text-ink font-mono">
                                        <span>{c.courseCode} — {c.coCode}</span>
                                        <span className="px-1.5 py-0.5 rounded bg-accent-soft text-accent border border-teal-200 text-[11px]">
                                          Strength: {c.strength}
                                        </span>
                                      </div>
                                      <p className="text-muted truncate">{c.courseName}</p>
                                      <div className="flex justify-between pt-1 border-t border-border text-muted font-mono tabular-nums">
                                        <span>CO Attainment:</span>
                                        <strong className={c.coAttainment !== null ? 'text-ink' : 'text-muted'}>
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
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-serif font-bold text-ink flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-accent" />
                <span>Course-wise PO Attainment Matrix (NBA Criterion 3 Format)</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border bg-paper text-xs font-semibold text-muted">
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-3 text-center">Sem</th>
                      {(reportData?.pos || []).map((po) => (
                        <th key={po._id || po.code} className="py-3 px-2 text-center text-accent font-bold font-mono">
                          {po.code}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(reportData.courseMatrix || []).map((row) => (
                      <tr key={row.courseId || row.code} className="hover:bg-paper/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-ink">
                          <span className="font-bold text-accent font-mono">{row.code}</span> - {row.name}
                        </td>
                        <td className="py-3 px-3 text-center text-xs text-muted font-mono">{row.semester}</td>
                        {(reportData?.pos || []).map((po) => {
                          const val = row.pos?.[po.code]?.attainment;
                          return (
                            <td key={po._id || po.code} className="py-3 px-2 text-center text-xs font-semibold font-mono tabular-nums">
                              {val !== null && val !== undefined ? (
                                <span className={val >= targetThreshold ? 'text-status-attained' : 'text-status-borderline'}>
                                  {val}%
                                </span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Overall Programme PO Attainment Row */}
                    <tr className="bg-paper font-bold border-t border-border">
                      <td className="py-3 px-4 text-ink font-serif" colSpan={2}>
                        Programme Overall PO Attainment
                      </td>
                      {(reportData?.pos || []).map((po) => (
                        <td key={po._id || po.code} className="py-3 px-2 text-center text-xs font-bold font-mono tabular-nums">
                          {po.attainment !== null ? (
                            <span className={po.attainment >= targetThreshold ? 'text-status-attained' : 'text-status-borderline'}>
                              {po.attainment}%
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
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
