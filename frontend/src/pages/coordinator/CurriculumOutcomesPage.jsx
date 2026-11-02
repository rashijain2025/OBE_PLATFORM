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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-border p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-soft text-accent border border-teal-200">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-ink tracking-tight">Curriculum Outcomes Framework</h1>
              <p className="text-sm text-muted">
                Official PEOs, NBA Graduate Attributes (PO1–PO12), and Program Specific Outcomes (PSOs)
              </p>
            </div>
          </div>
        </div>

        {/* Programme Selector */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-sm font-medium text-muted shrink-0">Programme:</label>
          <select
            value={selectedProgrammeId}
            onChange={(e) => setSelectedProgrammeId(e.target.value)}
            className="w-full sm:w-64 bg-paper border border-border rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink shadow-sm"
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

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'pos'
                ? 'bg-ink text-paper shadow-sm'
                : 'text-muted hover:text-ink hover:bg-paper'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Program Outcomes (POs)</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono tabular-nums ${
              activeTab === 'pos' ? 'bg-paper/20 text-paper' : 'bg-paper border border-border text-muted'
            }`}>
              {curriculumData?.pos?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('psos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'psos'
                ? 'bg-ink text-paper shadow-sm'
                : 'text-muted hover:text-ink hover:bg-paper'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Program Specific Outcomes (PSOs)</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono tabular-nums ${
              activeTab === 'psos' ? 'bg-paper/20 text-paper' : 'bg-paper border border-border text-muted'
            }`}>
              {curriculumData?.psos?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('peos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'peos'
                ? 'bg-ink text-paper shadow-sm'
                : 'text-muted hover:text-ink hover:bg-paper'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Educational Objectives (PEOs)</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono tabular-nums ${
              activeTab === 'peos' ? 'bg-paper/20 text-paper' : 'bg-paper border border-border text-muted'
            }`}>
              {curriculumData?.peos?.length || 0}
            </span>
          </button>
        </div>

        {canEdit && (
          <button
            onClick={() => handleOpenAddModal(activeTab === 'pos' ? 'PO' : activeTab === 'psos' ? 'PSO' : 'PEO')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ink hover:bg-ink-dark text-paper text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add {activeTab === 'pos' ? 'PO' : activeTab === 'psos' ? 'PSO' : 'PEO'}</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center text-muted font-mono">Loading outcomes data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* TAB 1: POs */}
          {activeTab === 'pos' &&
            curriculumData?.pos?.map((po) => (
              <div
                key={po._id}
                className="bg-surface border border-border rounded-2xl p-5 hover:border-ink/30 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-accent-soft border border-teal-200 text-accent font-bold text-xs uppercase tracking-wider font-mono">
                      {po.code}
                    </span>
                    {canEdit && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditModal('PO', po)}
                          title="Edit PO"
                          className="p-1.5 rounded-lg hover:bg-paper text-muted hover:text-ink transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('PO', po)}
                          title="Delete PO"
                          className="p-1.5 rounded-lg hover:bg-status-below-soft text-muted hover:text-status-below transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {po.title && <h3 className="font-serif font-semibold text-ink text-base leading-snug">{po.title}</h3>}
                  <p className="text-sm text-ink/80 leading-relaxed">{po.statement}</p>
                </div>
              </div>
            ))}

          {/* TAB 2: PSOs */}
          {activeTab === 'psos' &&
            curriculumData?.psos?.map((pso) => (
              <div
                key={pso._id}
                className="bg-surface border border-border rounded-2xl p-5 hover:border-ink/30 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-status-attained-soft border border-emerald-200 text-status-attained font-bold text-xs uppercase tracking-wider font-mono">
                      {pso.code}
                    </span>
                    {canEdit && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditModal('PSO', pso)}
                          title="Edit PSO"
                          className="p-1.5 rounded-lg hover:bg-paper text-muted hover:text-ink transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('PSO', pso)}
                          title="Delete PSO"
                          className="p-1.5 rounded-lg hover:bg-status-below-soft text-muted hover:text-status-below transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-ink/80 leading-relaxed">{pso.statement}</p>
                </div>
              </div>
            ))}

          {/* TAB 3: PEOs */}
          {activeTab === 'peos' &&
            curriculumData?.peos?.map((peo) => (
              <div
                key={peo._id}
                className="bg-surface border border-border rounded-2xl p-5 hover:border-ink/30 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-status-borderline-soft border border-amber-200 text-status-borderline font-bold text-xs uppercase tracking-wider font-mono">
                      {peo.code}
                    </span>
                    {canEdit && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditModal('PEO', peo)}
                          title="Edit PEO"
                          className="p-1.5 rounded-lg hover:bg-paper text-muted hover:text-ink transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('PEO', peo)}
                          title="Delete PEO"
                          className="p-1.5 rounded-lg hover:bg-status-below-soft text-muted hover:text-status-below transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-ink/80 leading-relaxed">{peo.statement}</p>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal for Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-serif font-bold text-ink flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                <span>
                  {editingItem ? 'Edit' : 'Add'} {modalType}
                </span>
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted hover:text-ink text-lg font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder={modalType === 'PO' ? 'e.g. PO1' : modalType === 'PSO' ? 'e.g. PSO-1' : 'e.g. PEO-I'}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-paper border border-border rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink shadow-inner font-mono"
                />
              </div>

              {modalType === 'PO' && (
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Title / Graduate Attribute
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering Knowledge"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-paper border border-border rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink shadow-inner"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Statement *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder={`Detailed statement defining this ${modalType}...`}
                  value={formData.statement}
                  onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
                  className="w-full bg-paper border border-border rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink shadow-inner"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-paper border border-border text-ink hover:bg-surface text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-ink hover:bg-ink-dark text-paper text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
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
