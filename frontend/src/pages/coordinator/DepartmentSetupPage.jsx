import { Fragment, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  listDepartmentsApi, listProgrammesApi,
  getObeTargetsApi, updateObeTargetsApi,
  listClassListsApi, listClassStudentsApi, uploadClassListApi,
} from '../../api/admin';
import {
  PageHeader, Card, PrimaryButton, GhostButton, FormInput, FormSelect,
  Modal, Spinner, EmptyState,
} from '../../components/ui/AdminUI';
import { useToast, ToastContainer } from '../../components/ui/Toast';
import { readSheetRows, downloadWorkbook, findColumn } from '../../utils/spreadsheet';
import { Target, Users, Upload, Download, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';

const TARGET_MARKS_HINT =
  'The minimum percentage of a CO\'s marks a student must score to be counted as having attained that CO. Every new CO in the school / centre starts with this value.';
const ATTAINMENT_GOAL_HINT =
  'The percentage of students who must reach the Target Marks for a CO to count as attained by the class. Every new CO in the school / centre starts with this value.';

const idOf = (v) => v?._id || v || '';

export default function DepartmentSetupPage() {
  const { user } = useAuth();
  const { toasts, showToast, dismiss } = useToast();
  const isAdmin = user?.role === 'admin';

  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState(isAdmin ? '' : idOf(user?.department));
  const [programmes, setProgrammes] = useState([]);

  useEffect(() => {
    if (isAdmin) {
      listDepartmentsApi()
        .then((res) => {
          setDepartments(res.data || []);
          setDepartmentId((prev) => prev || res.data?.[0]?._id || '');
        })
        .catch(() => showToast('Could not load schools / centres', 'error'));
    }
    listProgrammesApi()
      .then((res) => setProgrammes(res.data || []))
      .catch(() => showToast('Could not load programmes', 'error'));
  }, [isAdmin, showToast]);

  const departmentProgrammes = programmes.filter((p) => String(idOf(p.department)) === String(departmentId));

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <PageHeader
        title="School / Centre Setup"
        subtitle="Set the CO targets every course starts with, and upload class lists so faculty can add a whole section in one click."
        action={isAdmin && (
          <FormSelect
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            options={departments.map((d) => ({ value: d._id, label: `${d.name} (${d.code})` }))}
          />
        )}
      />

      {!departmentId ? (
        <Card className="p-6">
          <EmptyState message="Your account is not linked to a school / centre. Please contact the administrator." />
        </Card>
      ) : (
        <>
          <TargetsCard departmentId={departmentId} showToast={showToast} />
          <ClassListsCard programmes={departmentProgrammes} showToast={showToast} />
        </>
      )}
    </div>
  );
}

// ─── Department CO targets ────────────────────────────────────────────────────

function TargetsCard({ departmentId, showToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [marks, setMarks] = useState(60);
  const [attainment, setAttainment] = useState(70);
  const [applyToExisting, setApplyToExisting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getObeTargetsApi(departmentId)
      .then((res) => {
        setMarks(res.data.targetMarksPercentage);
        setAttainment(res.data.targetAttainmentPercentage);
      })
      .catch((err) => showToast(err.response?.data?.message || 'Could not load targets', 'error'))
      .finally(() => setLoading(false));
  }, [departmentId, showToast]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (applyToExisting && !window.confirm('This will overwrite the targets of every existing CO in the school / centre. Continue?')) {
      return;
    }
    setSaving(true);
    try {
      const res = await updateObeTargetsApi(departmentId, {
        targetMarksPercentage: Number(marks),
        targetAttainmentPercentage: Number(attainment),
        applyToExisting,
      });
      showToast(
        applyToExisting
          ? `Targets saved and applied to ${res.data.updatedCOs} existing CO(s)`
          : 'Targets saved. New COs will use them.',
        'success'
      );
      setApplyToExisting(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save targets', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-lg p-2 bg-accent-soft text-accent"><Target className="w-5 h-5" /></div>
        <div>
          <h3 className="font-serif text-base font-semibold text-ink">CO Targets</h3>
          <p className="text-xs text-muted">Faculty no longer enter these. Every new Course Outcome in the school / centre starts with these values.</p>
        </div>
      </div>
      {loading ? <Spinner /> : (
        <form onSubmit={handleSave} className="space-y-4 max-w-lg">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Target Marks %" hint={TARGET_MARKS_HINT} type="number" min={0} max={100} value={marks} onChange={(e) => setMarks(e.target.value)} required />
            <FormInput label="Attainment Goal %" hint={ATTAINMENT_GOAL_HINT} type="number" min={0} max={100} value={attainment} onChange={(e) => setAttainment(e.target.value)} required />
          </div>
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
            <input type="checkbox" checked={applyToExisting} onChange={(e) => setApplyToExisting(e.target.checked)} className="accent-teal-600" />
            Also update every existing CO in this school / centre
          </label>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Targets'}</PrimaryButton>
        </form>
      )}
    </Card>
  );
}

// ─── Class lists ──────────────────────────────────────────────────────────────

function ClassListsCard({ programmes, showToast }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [expandedStudents, setExpandedStudents] = useState([]);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listClassListsApi();
      setGroups(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not load class lists', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const programmeIds = new Set(programmes.map((p) => String(p._id)));
  const visibleGroups = groups.filter((g) => programmeIds.has(String(g.programme._id)));

  const toggleGroup = async (g) => {
    const key = `${g.programme._id}|${g.batch}|${g.section}`;
    if (expanded === key) {
      setExpanded(null);
      return;
    }
    setExpanded(key);
    setExpandedStudents([]);
    try {
      const res = await listClassStudentsApi({ programmeId: g.programme._id, batch: g.batch, section: g.section });
      setExpandedStudents(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not load students', 'error');
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg p-2 bg-accent-soft text-accent"><Users className="w-5 h-5" /></div>
          <div>
            <h3 className="font-serif text-base font-semibold text-ink">Class Lists</h3>
            <p className="text-xs text-muted">Upload each section once. Faculty then add the whole section to their course in one click.</p>
          </div>
        </div>
        <PrimaryButton onClick={() => setUploadOpen(true)} disabled={programmes.length === 0}>
          <Upload className="w-4 h-4" /> Upload Class List
        </PrimaryButton>
      </div>

      {loading ? <Spinner /> : visibleGroups.length === 0 ? (
        <EmptyState message="No class lists uploaded yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-paper/50 text-xs text-muted uppercase">
                <th className="py-3 px-4 text-left">Programme</th>
                <th className="py-3 px-4 text-left">Batch</th>
                <th className="py-3 px-4 text-left">Section</th>
                <th className="py-3 px-4 text-right">Students</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleGroups.map((g) => {
                const key = `${g.programme._id}|${g.batch}|${g.section}`;
                const isOpen = expanded === key;
                return (
                  <Fragment key={key}>
                    <tr onClick={() => toggleGroup(g)} className="hover:bg-paper/60 cursor-pointer">
                      <td className="py-3 px-4 text-ink font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          {g.programme.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted tabular-nums">{g.batch}</td>
                      <td className="py-3 px-4 text-muted">{g.section}</td>
                      <td className="py-3 px-4 text-right font-semibold text-ink tabular-nums">{g.count}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={4} className="bg-paper/40 px-4 py-3">
                          {expandedStudents.length === 0 ? <Spinner /> : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-xs">
                              {expandedStudents.map((s) => (
                                <div key={s._id} className="flex gap-2">
                                  <span className="font-mono text-muted tabular-nums">{s.rollNo}</span>
                                  <span className="text-ink truncate">{s.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <UploadClassListModal
        open={uploadOpen}
        programmes={programmes}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => { setUploadOpen(false); fetchGroups(); }}
        showToast={showToast}
      />
    </Card>
  );
}

function UploadClassListModal({ open, programmes, onClose, onUploaded, showToast }) {
  const [programmeId, setProgrammeId] = useState('');
  const [batch, setBatch] = useState(() => String(new Date().getFullYear()));
  const [section, setSection] = useState('A');
  const [fileName, setFileName] = useState('');
  const [students, setStudents] = useState([]);
  const [parseError, setParseError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setProgrammeId((prev) => prev || programmes[0]?._id || '');
      setFileName('');
      setStudents([]);
      setParseError('');
      setResult(null);
    }
  }, [open, programmes]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    setResult(null);
    try {
      const rows = await readSheetRows(file);
      const headers = Object.keys(rows[0] || {});
      const rollCol = findColumn(headers, ['RollNo', 'Roll No', 'Roll Number', 'Roll', 'Enrollment No', 'Enrollment Number']);
      const nameCol = findColumn(headers, ['Name', 'Student Name', 'Full Name']);
      const emailCol = findColumn(headers, ['Email', 'Email ID', 'E-mail']);
      if (!rollCol) {
        setStudents([]);
        setParseError('Could not find a Roll No column. Use the template, or name the column "RollNo".');
        return;
      }
      const parsed = rows
        .map((r) => ({
          rollNo: String(r[rollCol] || '').trim(),
          name: nameCol ? String(r[nameCol] || '').trim() : '',
          email: emailCol ? String(r[emailCol] || '').trim() : '',
        }))
        .filter((r) => r.rollNo || r.name);
      setStudents(parsed);
      if (parsed.length === 0) setParseError('The file has no student rows.');
    } catch {
      setParseError('Could not read this file. Please upload an .xlsx, .xls or .csv file.');
    }
  };

  const handleTemplate = () =>
    downloadWorkbook('Class_List_Template.xlsx', [
      { name: 'Class List', rows: [['RollNo', 'Name', 'Email'], ['0901IT241001', 'Aarav Patel', '']], widths: [16, 28, 30] },
    ]);

  const missingRolls = students.filter((s) => !s.rollNo).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await uploadClassListApi({ programmeId, batch, section, students });
      setResult(res.data);
      showToast(res.message, res.data.skipped.length > 0 ? 'error' : 'success');
      if (res.data.skipped.length === 0) onUploaded();
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload Class List" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormSelect label="Programme" value={programmeId} onChange={(e) => setProgrammeId(e.target.value)}
            options={programmes.map((p) => ({ value: p._id, label: p.name }))} />
          <FormInput label="Batch (admission year)" value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="2024" />
          <FormInput label="Section" value={section} onChange={(e) => setSection(e.target.value.toUpperCase())} placeholder="A" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
          <PrimaryButton onClick={() => fileRef.current?.click()}><Upload className="w-3.5 h-3.5" /> Choose File</PrimaryButton>
          <GhostButton onClick={handleTemplate}><Download className="w-3.5 h-3.5" /> Template</GhostButton>
          {fileName && <span className="text-xs text-muted truncate">{fileName}</span>}
        </div>
        <p className="text-[11px] text-muted">Columns: RollNo (required), Name, Email (optional). Students already in the system are matched by roll number and moved to this section.</p>

        {parseError && <p className="text-xs text-status-below">{parseError}</p>}

        {students.length > 0 && (
          <div className="rounded-xl border border-border">
            <div className="px-3 py-2 text-xs text-muted border-b border-border flex justify-between">
              <span><strong className="text-ink tabular-nums">{students.length}</strong> students found</span>
              {missingRolls > 0 && <span className="text-status-borderline">{missingRolls} row(s) without a roll number will be skipped</span>}
            </div>
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-border">
                  {students.map((s, i) => (
                    <tr key={i} className={!s.rollNo ? 'bg-status-borderline-soft' : ''}>
                      <td className="px-3 py-1.5 font-mono tabular-nums text-ink">{s.rollNo || '—'}</td>
                      <td className="px-3 py-1.5 text-ink">{s.name || <span className="text-muted">(no name)</span>}</td>
                      <td className="px-3 py-1.5 text-muted">{s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result?.skipped?.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-status-borderline-soft p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-status-borderline">
              <AlertTriangle className="w-3.5 h-3.5" /> {result.created} added, {result.updated} updated, {result.skipped.length} skipped
            </div>
            {result.skipped.slice(0, 8).map((s, i) => (
              <div key={i} className="text-ink">Row {s.row}{s.rollNo ? ` (${s.rollNo})` : ''}: {s.reason}</div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <GhostButton onClick={result ? onUploaded : onClose}>{result ? 'Done' : 'Cancel'}</GhostButton>
          <PrimaryButton onClick={handleSave} disabled={saving || students.length === 0 || !programmeId || !batch || !section}>
            {saving ? 'Saving...' : `Save ${students.length} Students`}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
