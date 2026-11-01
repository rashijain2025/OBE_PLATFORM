import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listCoursesApi } from '../../api/admin';
import { getMappingMatrixApi, saveMappingMatrixApi } from '../../api/programme';
import {
  FileSpreadsheet,
  Save,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Info,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function COPOMappingPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [matrixData, setMatrixData] = useState(null);
  const [copoState, setCopoState] = useState({}); // { [coId_poId]: 1|2|3|0 }
  const [copsoState, setCopsoState] = useState({}); // { [coId_psoId]: 1|2|3|0 }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Load courses on mount
  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        const res = await listCoursesApi();
        const allCourses = res.data || [];
        setCourses(allCourses);

        if (allCourses.length > 0) {
          // Preselect first course or coordinator's course
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

  // 2. Load Matrix when selectedCourseId changes
  useEffect(() => {
    if (!selectedCourseId) return;
    loadMatrix(selectedCourseId);
  }, [selectedCourseId]);

  const loadMatrix = async (courseId) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const res = await getMappingMatrixApi(courseId);
      const data = res.data;
      setMatrixData(data);

      // Initialize state maps
      const newCopo = {};
      for (const co of data.cos || []) {
        for (const po of data.pos || []) {
          const key = `${co._id}_${po._id}`;
          newCopo[key] = data.matrix.copo[key] || 0;
        }
      }
      setCopoState(newCopo);

      const newCopso = {};
      for (const co of data.cos || []) {
        for (const pso of data.psos || []) {
          const key = `${co._id}_${pso._id}`;
          newCopso[key] = data.matrix.copso[key] || 0;
        }
      }
      setCopsoState(newCopso);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load mapping matrix');
    } finally {
      setLoading(false);
    }
  };

  const handleCellChange = (type, coId, targetId, value) => {
    const key = `${coId}_${targetId}`;
    const intVal = Number(value);

    if (type === 'copo') {
      setCopoState((prev) => ({ ...prev, [key]: intVal }));
    } else {
      setCopsoState((prev) => ({ ...prev, [key]: intVal }));
    }
  };

  const handleSave = async () => {
    if (!selectedCourseId) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const copoPayload = [];
      for (const co of matrixData.cos) {
        for (const po of matrixData.pos) {
          const key = `${co._id}_${po._id}`;
          const level = copoState[key] || 0;
          copoPayload.push({
            courseOutcomeId: co._id,
            programOutcomeId: po._id,
            correlationLevel: level,
          });
        }
      }

      const copsoPayload = [];
      for (const co of matrixData.cos) {
        for (const pso of matrixData.psos) {
          const key = `${co._id}_${pso._id}`;
          const level = copsoState[key] || 0;
          copsoPayload.push({
            courseOutcomeId: co._id,
            programSpecificOutcomeId: pso._id,
            correlationLevel: level,
          });
        }
      }

      await saveMappingMatrixApi(selectedCourseId, {
        copo: copoPayload,
        copso: copsoPayload,
      });

      setSuccess('Mapping matrix saved successfully!');
      await loadMatrix(selectedCourseId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save mapping matrix');
    } finally {
      setSaving(false);
    }
  };

  // Helper styles for correlation strength badges
  const getStrengthBadge = (strength) => {
    switch (strength) {
      case 3:
        return 'bg-status-attained-soft text-status-attained border-emerald-300 font-bold font-mono';
      case 2:
        return 'bg-blue-50 text-blue-700 border-blue-300 font-bold font-mono';
      case 1:
        return 'bg-status-borderline-soft text-status-borderline border-amber-300 font-bold font-mono';
      default:
        return 'bg-paper text-muted border-border font-normal font-mono cell-not-evaluated';
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'coordinator';

  return (
    <div className="space-y-6">
      {/* Header & Course Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-border p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-soft text-accent border border-teal-200">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-ink tracking-tight">CO-PO & CO-PSO Mapping Matrix</h1>
              <p className="text-sm text-muted">
                Correlate Course Outcomes to Washington Accord Graduate Attributes (1 = Low, 2 = Medium, 3 = High)
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full sm:w-72 bg-paper border border-border rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink shadow-sm"
          >
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.code} - {c.name} ({c.academicYear})
              </option>
            ))}
          </select>

          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving || loading || !matrixData?.cos?.length}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-ink hover:bg-ink-dark text-paper text-sm font-semibold shadow-sm disabled:opacity-50 transition-all shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Matrix'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-status-below-soft border border-red-200 text-status-below text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-status-attained-soft border border-emerald-200 text-status-attained text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Course Context Card */}
      {matrixData?.course && (
        <div className="bg-surface border border-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs text-muted shadow-sm">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-muted">Course:</span>{' '}
              <strong className="text-ink font-semibold text-sm">{matrixData.course.code}</strong> - {matrixData.course.name}
            </div>
            <div>
              <span className="text-muted">Programme:</span>{' '}
              <strong className="text-ink font-semibold">{matrixData.course.programme?.name}</strong>
            </div>
            <div>
              <span className="text-muted">Faculty:</span>{' '}
              <strong className="text-ink font-semibold">{matrixData.course.faculty?.name || 'Unassigned'}</strong>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono">
            <span className="text-muted font-sans">Legend:</span>
            <span className="px-2 py-0.5 rounded border bg-paper text-muted border-border">0: None</span>
            <span className="px-2 py-0.5 rounded border bg-status-borderline-soft text-status-borderline border-amber-200 font-semibold tabular-nums">1: Low</span>
            <span className="px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 font-semibold tabular-nums">2: Medium</span>
            <span className="px-2 py-0.5 rounded border bg-status-attained-soft text-status-attained border-emerald-200 font-semibold tabular-nums">3: High</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-muted font-mono">Loading matrix...</div>
      ) : !matrixData?.cos?.length ? (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center space-y-3 shadow-sm">
          <AlertCircle className="w-10 h-10 text-accent mx-auto" />
          <h3 className="text-lg font-serif font-bold text-ink">No Course Outcomes Defined</h3>
          <p className="text-sm text-muted max-w-md mx-auto">
            Please define Course Outcomes (COs) for this course first before setting up mapping correlations.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: CO-PO MATRIX */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-serif font-bold text-ink flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent" />
                <span>Course Outcomes to Program Outcomes (CO-PO) Correlation Matrix</span>
              </h2>
              <span className="text-xs text-muted font-mono tabular-nums">
                {matrixData.cos.length} COs × {matrixData.pos.length} POs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-border bg-paper text-muted">
                    <th className="py-3 px-4 font-bold text-ink w-28">CO Code</th>
                    <th className="py-3 px-4 font-semibold text-muted max-w-xs">Statement</th>
                    {matrixData.pos.map((po) => (
                      <th
                        key={po._id}
                        title={`${po.code}: ${po.title} — ${po.statement}`}
                        className="py-3 px-3 font-mono font-bold text-accent text-center w-16 cursor-help"
                      >
                        {po.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {matrixData.cos.map((co) => (
                    <tr key={co._id} className="hover:bg-paper/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-ink flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-accent-soft text-accent border border-teal-200 text-xs font-mono font-bold">
                          {co.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-ink max-w-xs line-clamp-2" title={co.statement}>
                        {co.statement}
                      </td>
                      {matrixData.pos.map((po) => {
                        const key = `${co._id}_${po._id}`;
                        const currentStrength = copoState[key] || 0;

                        return (
                          <td key={po._id} className="py-2 px-2 text-center">
                            {canEdit ? (
                              <select
                                value={currentStrength}
                                onChange={(e) => handleCellChange('copo', co._id, po._id, e.target.value)}
                                className={`w-12 h-8 text-center text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-ink cursor-pointer transition-all tabular-nums ${getStrengthBadge(
                                  currentStrength
                                )}`}
                              >
                                <option value="0" className="bg-surface text-muted">-</option>
                                <option value="1" className="bg-surface text-status-borderline">1</option>
                                <option value="2" className="bg-surface text-blue-700">2</option>
                                <option value="3" className="bg-surface text-status-attained">3</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-block w-8 py-1 text-xs rounded border text-center tabular-nums ${getStrengthBadge(
                                  currentStrength
                                )}`}
                              >
                                {currentStrength || '-'}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Average Row */}
                  <tr className="bg-paper font-bold border-t border-border">
                    <td className="py-3 px-4 text-ink font-serif" colSpan={2}>
                      Average Correlation
                    </td>
                    {matrixData.pos.map((po) => {
                      const strengths = matrixData.cos
                        .map((co) => copoState[`${co._id}_${po._id}`] || 0)
                        .filter((s) => s > 0);
                      const avg = strengths.length > 0 ? (strengths.reduce((a, b) => a + b, 0) / strengths.length).toFixed(1) : '-';
                      return (
                        <td key={po._id} className="py-3 px-2 text-center text-xs text-ink font-mono font-bold tabular-nums">
                          {avg}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2: CO-PSO MATRIX */}
          {matrixData.psos.length > 0 && (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-serif font-bold text-ink flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  <span>Course Outcomes to Program Specific Outcomes (CO-PSO) Matrix</span>
                </h2>
                <span className="text-xs text-muted font-mono tabular-nums">
                  {matrixData.cos.length} COs × {matrixData.psos.length} PSOs
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border bg-paper text-muted">
                      <th className="py-3 px-4 font-bold text-ink w-28">CO Code</th>
                      <th className="py-3 px-4 font-semibold text-muted max-w-sm">Statement</th>
                      {matrixData.psos.map((pso) => (
                        <th
                          key={pso._id}
                          title={`${pso.code}: ${pso.statement}`}
                          className="py-3 px-4 font-mono font-bold text-accent text-center w-24 cursor-help"
                        >
                          {pso.code}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {matrixData.cos.map((co) => (
                      <tr key={co._id} className="hover:bg-paper/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-ink flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-accent-soft text-accent border border-teal-200 text-xs font-mono font-bold">
                            {co.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-ink max-w-sm line-clamp-2" title={co.statement}>
                          {co.statement}
                        </td>
                        {matrixData.psos.map((pso) => {
                          const key = `${co._id}_${pso._id}`;
                          const currentStrength = copsoState[key] || 0;

                          return (
                            <td key={pso._id} className="py-2 px-4 text-center">
                              {canEdit ? (
                                <select
                                  value={currentStrength}
                                  onChange={(e) => handleCellChange('copso', co._id, pso._id, e.target.value)}
                                  className={`w-14 h-8 text-center text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-ink cursor-pointer transition-all tabular-nums ${getStrengthBadge(
                                    currentStrength
                                  )}`}
                                >
                                  <option value="0" className="bg-surface text-muted">-</option>
                                  <option value="1" className="bg-surface text-status-borderline">1</option>
                                  <option value="2" className="bg-surface text-blue-700">2</option>
                                  <option value="3" className="bg-surface text-status-attained">3</option>
                                </select>
                              ) : (
                                <span
                                  className={`inline-block w-10 py-1 text-xs rounded border text-center tabular-nums ${getStrengthBadge(
                                    currentStrength
                                  )}`}
                                >
                                  {currentStrength || '-'}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Average Row */}
                    <tr className="bg-paper font-bold border-t border-border">
                      <td className="py-3 px-4 text-ink font-serif" colSpan={2}>
                        Average Correlation
                      </td>
                      {matrixData.psos.map((pso) => {
                        const strengths = matrixData.cos
                          .map((co) => copsoState[`${co._id}_${pso._id}`] || 0)
                          .filter((s) => s > 0);
                        const avg = strengths.length > 0 ? (strengths.reduce((a, b) => a + b, 0) / strengths.length).toFixed(1) : '-';
                        return (
                          <td key={pso._id} className="py-3 px-4 text-center text-xs text-ink font-mono font-bold tabular-nums">
                            {avg}
                          </td>
                        );
                      })}
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
