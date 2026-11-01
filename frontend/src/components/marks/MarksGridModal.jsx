import { useState, useEffect, useMemo, useRef } from 'react';
import { getMarksGridApi, saveBulkMarksApi, importMarksCSVApi } from '../../api/faculty';
import { Spinner, GhostButton, PrimaryButton } from '../ui/AdminUI';
import {
  X, Save, FileSpreadsheet, Download, Upload, AlertCircle, CheckCircle2,
  Table, Info
} from 'lucide-react';

export default function MarksGridModal({ open, assessment, onClose, showToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  // localMarks: { [studentId]: { [questionId]: string | number } }
  const [localMarks, setLocalMarks] = useState({});
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const fileInputRef = useRef(null);

  const fetchGrid = async () => {
    if (!assessment?._id) return;
    try {
      setLoading(true);
      const res = await getMarksGridApi(assessment._id);
      setData(res.data);

      // Initialize local state
      const initial = {};
      const serverMarks = res.data.marks || {};
      for (const s of res.data.students || []) {
        initial[s._id] = {};
        for (const q of res.data.questions || []) {
          const val = serverMarks[s._id]?.[q._id];
          initial[s._id][q._id] = val !== null && val !== undefined ? String(val) : '';
        }
      }
      setLocalMarks(initial);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not load marks grid', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && assessment?._id) {
      fetchGrid();
    }
  }, [open, assessment?._id]);

  const questions = data?.questions || [];
  const students = data?.students || [];

  const handleCellChange = (studentId, questionId, val) => {
    setLocalMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [questionId]: val,
      },
    }));
  };

  // Validation: Check for invalid marks
  const validationErrors = useMemo(() => {
    const errors = [];
    for (const s of students) {
      for (const q of questions) {
        const val = localMarks[s._id]?.[q._id];
        if (val !== '' && val !== undefined && val !== null) {
          const num = Number(val);
          if (isNaN(num)) {
            errors.push(`${s.rollNo || s.name}: ${q.label} must be a number`);
          } else if (num < 0) {
            errors.push(`${s.rollNo || s.name}: ${q.label} cannot be negative`);
          } else if (num > q.maxMarks) {
            errors.push(`${s.rollNo || s.name}: ${q.label} exceeds max (${q.maxMarks})`);
          }
        }
      }
    }
    return errors;
  }, [students, questions, localMarks]);

  // Bulk Save Handler
  const handleBulkSave = async () => {
    if (validationErrors.length > 0) {
      showToast(`Please fix marks errors before saving: ${validationErrors[0]}`, 'error');
      return;
    }

    try {
      setSaving(true);
      const marksPayload = [];
      for (const s of students) {
        for (const q of questions) {
          const val = localMarks[s._id]?.[q._id];
          marksPayload.push({
            studentId: s._id,
            questionId: q._id,
            marksObtained: val === '' || val === null || val === undefined ? null : Number(val),
          });
        }
      }

      await saveBulkMarksApi({
        assessmentId: assessment._id,
        marks: marksPayload,
      });

      showToast('All marks saved successfully!', 'success');
      fetchGrid();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Export CSV template
  const handleExportTemplate = () => {
    if (questions.length === 0) {
      showToast('No questions configured to export', 'error');
      return;
    }

    const headers = ['RollNo', 'Name', ...questions.map((q) => q.label)];
    const rows = students.map((s) => {
      const qVals = questions.map((q) => localMarks[s._id]?.[q._id] ?? '');
      return [s.rollNo || '', `"${s.name || ''}"`, ...qVals].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${assessment.name.replace(/\s+/g, '_')}_Marks.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Marks CSV exported', 'success');
  };

  // Import CSV Handler
  const handleImportCSV = async () => {
    if (!csvText.trim()) {
      showToast('Please paste or upload CSV text', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await importMarksCSVApi({
        assessmentId: assessment._id,
        csvText,
      });

      const report = res.data;
      if (report.errors?.length > 0) {
        showToast(
          `Imported ${report.imported} rows, but had ${report.errors.length} notices (${report.errors[0]?.reason})`,
          'error'
        );
      } else {
        showToast(`Successfully imported marks for ${report.imported} students!`, 'success');
      }

      setCsvModalOpen(false);
      setCsvText('');
      fetchGrid();
    } catch (err) {
      showToast(err.response?.data?.message || 'CSV Import failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target.result || '');
    };
    reader.readAsText(file);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-ink/40 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-paper/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-soft border border-teal-200 text-accent">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink font-serif tracking-tight flex items-center gap-2">
                <span>Marks Entry Grid</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent-soft text-accent border border-teal-200 font-medium">
                  {assessment?.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-surface border border-border text-muted tabular-nums">
                  Max Marks: {assessment?.maxMarks}
                </span>
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Saved at question level · Empty cells represent not evaluated / absent
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-muted hover:text-ink p-1.5 rounded-lg hover:bg-paper transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Info Bar */}
        <div className="px-6 py-3 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-muted">
            <span>Enrolled Students: <strong className="text-ink tabular-nums">{students.length}</strong></span>
            <span>Questions: <strong className="text-ink tabular-nums">{questions.length}</strong></span>
            {validationErrors.length > 0 && (
              <span className="text-status-below flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                {validationErrors.length} invalid mark(s)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <GhostButton onClick={handleExportTemplate} title="Export CSV Template">
              <Download className="w-3.5 h-3.5" /> Template
            </GhostButton>
            <GhostButton onClick={() => setCsvModalOpen(true)} title="Import Marks via CSV">
              <Upload className="w-3.5 h-3.5" /> Import CSV
            </GhostButton>
            <PrimaryButton onClick={handleBulkSave} disabled={saving || validationErrors.length > 0}>
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Marks'}
            </PrimaryButton>
          </div>
        </div>

        {/* Modal Body: Marks Spreadsheet */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <Spinner />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-16 text-muted">
              <Info className="w-8 h-8 text-muted/60 mx-auto mb-2" />
              <p>No students enrolled in this course yet.</p>
              <p className="text-xs text-muted/70 mt-1">Enroll students into the course to enter marks.</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-16 text-muted">
              <Info className="w-8 h-8 text-muted/60 mx-auto mb-2" />
              <p>No questions configured for this assessment.</p>
              <p className="text-xs text-muted/70 mt-1">Add questions to this assessment before recording marks.</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden shadow-xs bg-surface">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-paper border-b border-border text-muted uppercase tracking-wider sticky top-0 z-10">
                    <th className="py-3 px-3 w-28 font-semibold">Roll No</th>
                    <th className="py-3 px-3 w-48 font-semibold">Student Name</th>
                    {questions.map((q) => (
                      <th key={q._id} className="py-3 px-2 text-center w-24">
                        <div className="font-bold text-ink text-xs">{q.label}</div>
                        <div className="text-[10px] text-muted font-mono mt-0.5 tabular-nums">Max {q.maxMarks}</div>
                        <div className="text-[10px] text-accent font-mono font-semibold">{q.co?.code}</div>
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center w-28 font-semibold text-status-attained">
                      Total ({assessment?.maxMarks})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {students.map((s) => {
                    // Compute total marks obtained for this student
                    let totalObtained = 0;
                    let hasAnyMark = false;
                    for (const q of questions) {
                      const val = localMarks[s._id]?.[q._id];
                      if (val !== '' && val !== undefined && val !== null) {
                        const num = Number(val);
                        if (!isNaN(num)) {
                          totalObtained += num;
                          hasAnyMark = true;
                        }
                      }
                    }

                    return (
                      <tr key={s._id} className="hover:bg-paper/60 transition-colors">
                        <td className="py-2 px-3 font-mono font-semibold text-ink tabular-nums">
                          {s.rollNo || '—'}
                        </td>
                        <td className="py-2 px-3 font-medium text-ink truncate max-w-[12rem]">
                          {s.name}
                        </td>
                        {questions.map((q) => {
                          const val = localMarks[s._id]?.[q._id] ?? '';
                          const num = Number(val);
                          const isInvalid =
                            val !== '' && (isNaN(num) || num < 0 || num > q.maxMarks);

                          return (
                            <td key={q._id} className="py-1.5 px-2 text-center">
                              <input
                                type="number"
                                step="any"
                                min={0}
                                max={q.maxMarks}
                                placeholder="—"
                                value={val}
                                onChange={(e) => handleCellChange(s._id, q._id, e.target.value)}
                                className={`w-16 text-center text-xs font-mono font-semibold py-1 px-1 rounded-md transition-all focus:outline-none focus:ring-1 tabular-nums ${
                                  isInvalid
                                    ? 'border border-status-below bg-status-below-soft text-status-below focus:ring-status-below'
                                    : val !== ''
                                    ? 'border border-border bg-surface text-ink font-bold focus:border-accent focus:ring-accent'
                                    : 'cell-not-evaluated border border-border/80 text-muted focus:border-accent focus:ring-accent'
                                }`}
                              />
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center font-mono font-bold tabular-nums">
                          {hasAnyMark ? (
                            <span className="text-status-attained px-2 py-0.5 rounded bg-status-attained-soft border border-emerald-200">
                              {Number(totalObtained.toFixed(2))}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-paper/60">
          <div className="text-xs text-muted">
            Tip: Press Tab to move across question cells quickly.
          </div>
          <div className="flex gap-2">
            <GhostButton onClick={onClose}>Close</GhostButton>
            <PrimaryButton onClick={handleBulkSave} disabled={saving || validationErrors.length > 0}>
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Marks'}
            </PrimaryButton>
          </div>
        </div>
      </div>

      {/* ─── CSV Import Submodal ─────────────────────────────────────────────── */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-surface border border-border rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-accent" />
                <span>Import Marks via CSV</span>
              </h3>
              <button
                onClick={() => setCsvModalOpen(false)}
                className="text-muted hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted">
              CSV must have headers matching the student roll number and question labels (e.g. <code>RollNo,{questions.map((q) => q.label).join(',')}</code>).
            </p>

            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <GhostButton onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-3.5 h-3.5" /> Upload .csv File
              </GhostButton>
              <span className="text-xs text-muted">or paste CSV text below:</span>
            </div>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`RollNo,${questions.map((q) => q.label).join(',')}\n22IT001,${questions.map((q) => q.maxMarks).join(',')}\n22IT002,...`}
              rows={6}
              className="w-full bg-surface border border-border rounded-lg p-3 text-xs font-mono text-ink placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />

            <div className="flex justify-end gap-2 pt-2">
              <GhostButton onClick={() => setCsvModalOpen(false)}>Cancel</GhostButton>
              <PrimaryButton onClick={handleImportCSV} disabled={saving || !csvText.trim()}>
                {saving ? 'Importing...' : 'Import Marks'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
