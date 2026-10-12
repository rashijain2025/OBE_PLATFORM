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
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
      case 2:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold';
      case 1:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
      default:
        return 'bg-gray-800/60 text-gray-400 border-gray-700 font-normal';
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'coordinator';

  return (
    <div className="space-y-6">
      {/* Header & Course Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">CO-PO & CO-PSO Mapping Matrix</h1>
              <p className="text-sm text-gray-400">
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
            className="w-full sm:w-72 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Matrix'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Course Context Card */}
      {matrixData?.course && (
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-300">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-gray-400">Course:</span>{' '}
              <strong className="text-white text-sm">{matrixData.course.code}</strong> - {matrixData.course.name}
            </div>
            <div>
              <span className="text-gray-400">Programme:</span>{' '}
              <strong className="text-white">{matrixData.course.programme?.name}</strong>
            </div>
            <div>
              <span className="text-gray-400">Faculty:</span>{' '}
              <strong className="text-white">{matrixData.course.faculty?.name || 'Unassigned'}</strong>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400">Legend:</span>
            <span className="px-2 py-0.5 rounded border bg-gray-800/60 text-gray-400 border-gray-700">0: None</span>
            <span className="px-2 py-0.5 rounded border bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold">1: Low</span>
            <span className="px-2 py-0.5 rounded border bg-blue-500/20 text-blue-300 border-blue-500/40 font-semibold">2: Medium</span>
            <span className="px-2 py-0.5 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold">3: High</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading matrix...</div>
      ) : !matrixData?.cos?.length ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Course Outcomes Defined</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Please define Course Outcomes (COs) for this course first before setting up mapping correlations.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: CO-PO MATRIX */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>Course Outcomes to Program Outcomes (CO-PO) Correlation Matrix</span>
              </h2>
              <span className="text-xs text-gray-400">
                {matrixData.cos.length} COs × {matrixData.pos.length} POs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-950/60">
                    <th className="py-3 px-4 font-bold text-gray-300 w-28">CO Code</th>
                    <th className="py-3 px-4 font-semibold text-gray-400 max-w-xs">Statement</th>
                    {matrixData.pos.map((po) => (
                      <th
                        key={po._id}
                        title={`${po.code}: ${po.title} — ${po.statement}`}
                        className="py-3 px-3 font-bold text-indigo-400 text-center w-16 cursor-help"
                      >
                        {po.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {matrixData.cos.map((co) => (
                    <tr key={co._id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs">
                          {co.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-300 max-w-xs line-clamp-2" title={co.statement}>
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
                                className={`w-12 h-8 text-center text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-all ${getStrengthBadge(
                                  currentStrength
                                )}`}
                              >
                                <option value="0" className="bg-gray-900 text-gray-400">-</option>
                                <option value="1" className="bg-gray-900 text-amber-300">1</option>
                                <option value="2" className="bg-gray-900 text-blue-300">2</option>
                                <option value="3" className="bg-gray-900 text-emerald-300">3</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-block w-8 py-1 text-xs rounded border text-center ${getStrengthBadge(
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
                  <tr className="bg-gray-950/80 font-bold border-t border-gray-700">
                    <td className="py-3 px-4 text-indigo-400" colSpan={2}>
                      Average Correlation
                    </td>
                    {matrixData.pos.map((po) => {
                      const strengths = matrixData.cos
                        .map((co) => copoState[`${co._id}_${po._id}`] || 0)
                        .filter((s) => s > 0);
                      const avg = strengths.length > 0 ? (strengths.reduce((a, b) => a + b, 0) / strengths.length).toFixed(1) : '-';
                      return (
                        <td key={po._id} className="py-3 px-2 text-center text-xs text-white">
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
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span>Course Outcomes to Program Specific Outcomes (CO-PSO) Matrix</span>
                </h2>
                <span className="text-xs text-gray-400">
                  {matrixData.cos.length} COs × {matrixData.psos.length} PSOs
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-950/60">
                      <th className="py-3 px-4 font-bold text-gray-300 w-28">CO Code</th>
                      <th className="py-3 px-4 font-semibold text-gray-400 max-w-sm">Statement</th>
                      {matrixData.psos.map((pso) => (
                        <th
                          key={pso._id}
                          title={`${pso.code}: ${pso.statement}`}
                          className="py-3 px-4 font-bold text-emerald-400 text-center w-24 cursor-help"
                        >
                          {pso.code}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {matrixData.cos.map((co) => (
                      <tr key={co._id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs">
                            {co.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-300 max-w-sm line-clamp-2" title={co.statement}>
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
                                  className={`w-14 h-8 text-center text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer transition-all ${getStrengthBadge(
                                    currentStrength
                                  )}`}
                                >
                                  <option value="0" className="bg-gray-900 text-gray-400">-</option>
                                  <option value="1" className="bg-gray-900 text-amber-300">1</option>
                                  <option value="2" className="bg-gray-900 text-blue-300">2</option>
                                  <option value="3" className="bg-gray-900 text-emerald-300">3</option>
                                </select>
                              ) : (
                                <span
                                  className={`inline-block w-10 py-1 text-xs rounded border text-center ${getStrengthBadge(
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
                    <tr className="bg-gray-950/80 font-bold border-t border-gray-700">
                      <td className="py-3 px-4 text-emerald-400" colSpan={2}>
                        Average Correlation
                      </td>
                      {matrixData.psos.map((pso) => {
                        const strengths = matrixData.cos
                          .map((co) => copsoState[`${co._id}_${pso._id}`] || 0)
                          .filter((s) => s > 0);
                        const avg = strengths.length > 0 ? (strengths.reduce((a, b) => a + b, 0) / strengths.length).toFixed(1) : '-';
                        return (
                          <td key={pso._id} className="py-3 px-4 text-center text-xs text-white">
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
