import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listProgrammesApi } from '../../api/admin';
import {
  getCurriculumApi,
  createPOApi,
  updatePOApi,
  deletePOApi,
  createPSOApi,
  updatePSOApi,
  deletePSOApi,
  createPEOApi,
  updatePEOApi,
  deletePEOApi,
} from '../../api/programme';
import {
  Award,
  BookOpen,
  Target,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export default function CurriculumOutcomesPage() {
  const { user } = useAuth();
  const [programmes, setProgrammes] = useState([]);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('');
  const [curriculumData, setCurriculumData] = useState(null);
  const [activeTab, setActiveTab] = useState('pos'); // 'pos', 'psos', 'peos'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('PO'); // 'PO', 'PSO', 'PEO'
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ code: '', title: '', statement: '' });
  const [submitting, setSubmitting] = useState(false);

  // Load Programmes on Mount
  useEffect(() => {
    async function loadProgrammes() {
      try {
        setLoading(true);
        const res = await listProgrammesApi();
        const progs = res.data || [];
        setProgrammes(progs);

        // Preselect coordinator's programme if available
        if (progs.length > 0) {
          const userDeptId = user?.department?._id || user?.department;
          const matchingProg = progs.find((p) => String(p.department?._id || p.department) === String(userDeptId));
          setSelectedProgrammeId(matchingProg ? matchingProg._id : progs[0]._id);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load programmes');
      } finally {
        setLoading(false);
      }
    }
    loadProgrammes();
  }, [user]);

  // Load Curriculum Outcomes when selectedProgrammeId changes
  useEffect(() => {
    if (!selectedProgrammeId) return;
    loadCurriculum(selectedProgrammeId);
  }, [selectedProgrammeId]);

  const loadCurriculum = async (progId) => {
    try {
      setLoading(true);
      setError('');
      const res = await getCurriculumApi(progId);
      setCurriculumData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load curriculum outcomes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = (type) => {
    setModalType(type);
    setEditingItem(null);
    setFormData({ code: '', title: '', statement: '' });
    setModalOpen(true);
  };

  const handleOpenEditModal = (type, item) => {
    setModalType(type);
    setEditingItem(item);
    setFormData({
      code: item.code || '',
      title: item.title || '',
      statement: item.statement || '',
    });
    setModalOpen(true);
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (modalType === 'PO') {
        if (editingItem) {
          await updatePOApi(editingItem._id, {
            code: formData.code,
            title: formData.title,
            statement: formData.statement,
          });
          setSuccess(`Program Outcome ${formData.code} updated successfully`);
        } else {
          await createPOApi({
            programmeId: selectedProgrammeId,
            code: formData.code,
            title: formData.title,
            statement: formData.statement,
          });
          setSuccess(`Program Outcome ${formData.code} created successfully`);
        }
      } else if (modalType === 'PSO') {
        if (editingItem) {
          await updatePSOApi(editingItem._id, {
            code: formData.code,
            statement: formData.statement,
          });
          setSuccess(`Program Specific Outcome ${formData.code} updated successfully`);
        } else {
          await createPSOApi({
            programmeId: selectedProgrammeId,
            code: formData.code,
            statement: formData.statement,
          });
          setSuccess(`Program Specific Outcome ${formData.code} created successfully`);
        }
      } else if (modalType === 'PEO') {
        if (editingItem) {
          await updatePEOApi(editingItem._id, {
            code: formData.code,
            statement: formData.statement,
          });
          setSuccess(`Program Educational Objective ${formData.code} updated successfully`);
        } else {
          await createPEOApi({
            programmeId: selectedProgrammeId,
            code: formData.code,
            statement: formData.statement,
          });
          setSuccess(`Program Educational Objective ${formData.code} created successfully`);
        }
      }

      setModalOpen(false);
      await loadCurriculum(selectedProgrammeId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save outcome');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (type, item) => {
    if (!window.confirm(`Are you sure you want to delete ${item.code}?`)) return;

    setError('');
    setSuccess('');
    try {
      if (type === 'PO') {
        await deletePOApi(item._id);
        setSuccess(`PO ${item.code} deleted successfully`);
      } else if (type === 'PSO') {
        await deletePSOApi(item._id);
        setSuccess(`PSO ${item.code} deleted successfully`);
      } else if (type === 'PEO') {
        await deletePEOApi(item._id);
        setSuccess(`PEO ${item.code} deleted successfully`);
      }
      await loadCurriculum(selectedProgrammeId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete outcome');
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'coordinator';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Curriculum Outcomes Framework</h1>
              <p className="text-sm text-gray-400">
                Official PEOs, NBA Graduate Attributes (PO1–PO12), and Program Specific Outcomes (PSOs)
              </p>
            </div>
          </div>
        </div>

        {/* Programme Selector */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-sm font-medium text-gray-400 shrink-0">Programme:</label>
          <select
            value={selectedProgrammeId}
            onChange={(e) => setSelectedProgrammeId(e.target.value)}
            className="w-full sm:w-64 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            {programmes.map((p) => (
              <option key={p._id} value={p._id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
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

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'pos'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Program Outcomes (POs)</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">
              {curriculumData?.pos?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('psos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'psos'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Program Specific Outcomes (PSOs)</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">
              {curriculumData?.psos?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('peos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'peos'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Educational Objectives (PEOs)</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">
              {curriculumData?.peos?.length || 0}
            </span>
          </button>
        </div>

        {canEdit && (
          <button
            onClick={() => handleOpenAddModal(activeTab === 'pos' ? 'PO' : activeTab === 'psos' ? 'PSO' : 'PEO')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add {activeTab === 'pos' ? 'PO' : activeTab === 'psos' ? 'PSO' : 'PEO'}</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading outcomes data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* TAB 1: POs */}
          {activeTab === 'pos' &&
            curriculumData?.pos?.map((po) => (
              <div
                key={po._id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                      {po.code}
                    </span>
                    {canEdit && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditModal('PO', po)}
                          title="Edit PO"
                          className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('PO', po)}
                          title="Delete PO"
                          className="p-1.5 rounded-lg hover:bg-red-950/40 text-gray-400 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {po.title && <h3 className="font-semibold text-white text-base leading-snug">{po.title}</h3>}
                  <p className="text-sm text-gray-300 leading-relaxed">{po.statement}</p>
                </div>
              </div>
            ))}

          {/* TAB 2: PSOs */}
          {activeTab === 'psos' &&
            curriculumData?.psos?.map((pso) => (
              <div
                key={pso._id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      {pso.code}
                    </span>
                    {canEdit && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditModal('PSO', pso)}
                          title="Edit PSO"
                          className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('PSO', pso)}
                          title="Delete PSO"
                          className="p-1.5 rounded-lg hover:bg-red-950/40 text-gray-400 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{pso.statement}</p>
                </div>
              </div>
            ))}

          {/* TAB 3: PEOs */}
          {activeTab === 'peos' &&
            curriculumData?.peos?.map((peo) => (
              <div
                key={peo._id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs uppercase tracking-wider">
                      {peo.code}
                    </span>
                    {canEdit && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditModal('PEO', peo)}
                          title="Edit PEO"
                          className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('PEO', peo)}
                          title="Delete PEO"
                          className="p-1.5 rounded-lg hover:bg-red-950/40 text-gray-400 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{peo.statement}</p>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal for Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span>
                  {editingItem ? 'Edit' : 'Add'} {modalType}
                </span>
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder={modalType === 'PO' ? 'e.g. PO1' : modalType === 'PSO' ? 'e.g. PSO-1' : 'e.g. PEO-I'}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {modalType === 'PO' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Title / Graduate Attribute
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering Knowledge"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                  Statement *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder={`Detailed statement defining this ${modalType}...`}
                  value={formData.statement}
                  onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
