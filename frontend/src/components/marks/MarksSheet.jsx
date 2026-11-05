import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMarksGridApi, saveBulkMarksApi, importMarksCSVApi } from '../../api/faculty';
import { Spinner, GhostButton, PrimaryButton, Modal } from '../ui/AdminUI';
import { readSheetRows, downloadWorkbook } from '../../utils/spreadsheet';
import { Download, Upload, AlertCircle, CheckCircle2, Loader2, Info, AlertTriangle } from 'lucide-react';

const AUTOSAVE_DELAY_MS = 1200;
const ABSENT_VALUES = ['AB', 'A', 'ABSENT'];

const isAbsent = (val) => ABSENT_VALUES.includes(String(val).trim().toUpperCase());

function cellError(val, max) {
  const v = String(val ?? '').trim();
  if (v === '' || isAbsent(v)) return null;
  const num = Number(v);
  if (!Number.isFinite(num)) return 'Enter a number or AB';
  if (num < 0) return 'Cannot be negative';
  if (num > max) return `More than max (${max})`;
  return null;
}

// What the server should store for a cell value
const toPayload = (val) => {
  const v = String(val ?? '').trim();
  if (v === '') return null;
  if (isAbsent(v)) return 'AB';
  return Number(v);
};

const cellKey = (sid, qid) => `${sid}:${qid}`;

// "CO1, CO3" for a question mapped to several COs (older questions store a single `co`)
const coCodesOf = (q) => (q.cos?.length ? q.cos : q.co ? [q.co] : []).map((c) => c?.code).filter(Boolean).join(', ');

/**
 * Spreadsheet-style marks entry for one assessment.
 * Autosaves valid edits, supports Enter/arrow navigation, block paste from Excel, "AB" for absent,
 * an .xlsx template and a checked import with a preview before anything is saved.
 */
export default function MarksSheet({ assessmentId, showToast }) {
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState(null);
  const [values, setValues] = useState({});
  const [saved, setSaved] = useState({});
  const [saveState, setSaveState] = useState({ status: 'idle', at: null });
  const inputRefs = useRef({});
  const latest = useRef({ values: {}, saved: {} });

  const questions = useMemo(() => grid?.questions || [], [grid]);
  const students = useMemo(() => grid?.students || [], [grid]);
  const questionById = useMemo(() => new Map(questions.map((q) => [q._id, q])), [questions]);

  const loadGrid = useCallback(async () => {
    try {
      const res = await getMarksGridApi(assessmentId);
      const initial = {};
      for (const s of res.data.students || []) {
        for (const q of res.data.questions || []) {
          const v = res.data.marks?.[s._id]?.[q._id];
          initial[cellKey(s._id, q._id)] = v === null || v === undefined ? '' : String(v);
        }
      }
      setGrid(res.data);
      setValues(initial);
      setSaved(initial);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not load marks', 'error');
    } finally {
      setLoading(false);
    }
  }, [assessmentId, showToast]);

  useEffect(() => {
    setLoading(true);
    loadGrid();
  }, [loadGrid]);

  useEffect(() => {
    latest.current = { values, saved };
  }, [values, saved]);

  // Cells that changed since the last save, split into savable and invalid
  const { dirtyValid, invalidCount } = useMemo(() => {
    const valid = [];
    let invalid = 0;
    for (const key of Object.keys(values)) {
      if (values[key] === saved[key]) continue;
      const [sid, qid] = key.split(':');
      const q = questionById.get(qid);
      if (!q) continue;
      if (cellError(values[key], q.maxMarks)) invalid++;
      else valid.push({ key, raw: values[key], studentId: sid, questionId: qid, marksObtained: toPayload(values[key]) });
    }
    return { dirtyValid: valid, invalidCount: invalid };
  }, [values, saved, questionById]);

  const saveCells = useCallback(async (cells) => {
    if (cells.length === 0) return;
    setSaveState({ status: 'saving', at: null });
    try {
      await saveBulkMarksApi({
        assessmentId,
        marks: cells.map(({ studentId, questionId, marksObtained }) => ({ studentId, questionId, marksObtained })),
      });
      // Record exactly what was sent; anything typed meanwhile stays dirty and is saved next round
      setSaved((prev) => {
        const next = { ...prev };
        for (const c of cells) next[c.key] = c.raw;
        return next;
      });
      setSaveState({ status: 'saved', at: new Date() });
    } catch (err) {
      setSaveState({ status: 'error', at: null });
      showToast(err.response?.data?.message || 'Could not save marks', 'error');
    }
  }, [assessmentId, showToast]);

  // Debounced autosave of valid edits
  useEffect(() => {
    if (dirtyValid.length === 0) return undefined;
    const timer = setTimeout(() => saveCells(dirtyValid), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dirtyValid, saveCells]);

  // Save whatever is pending if the sheet is closed before the autosave fires
  useEffect(() => () => {
    const { values: v, saved: s } = latest.current;
    const pending = [];
    for (const key of Object.keys(v)) {
      if (v[key] === s[key]) continue;
      const [sid, qid] = key.split(':');
      pending.push({ studentId: sid, questionId: qid, raw: v[key] });
    }
    const savable = pending.filter((p) => {
      const q = (latest.current.questions || []).find((x) => x._id === p.questionId);
      return q && !cellError(p.raw, q.maxMarks);
    });
    if (savable.length > 0) {
      saveBulkMarksApi({
        assessmentId,
        marks: savable.map((p) => ({ studentId: p.studentId, questionId: p.questionId, marksObtained: toPayload(p.raw) })),
      }).catch(() => {});
    }
  }, [assessmentId]);

  useEffect(() => {
    latest.current.questions = questions;
  }, [questions]);

  const setCell = (sid, qid, val) => setValues((prev) => ({ ...prev, [cellKey(sid, qid)]: val }));

  const focusCell = (row, col) => {
    const el = inputRefs.current[`${row}-${col}`];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const handleKeyDown = (e, row, col) => {
    const el = e.currentTarget;
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusCell(e.shiftKey && e.key === 'Enter' ? row - 1 : row + 1, col);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusCell(row - 1, col);
    } else if (e.key === 'ArrowRight' && el.selectionStart === el.value.length) {
      e.preventDefault();
      focusCell(row, col + 1);
    } else if (e.key === 'ArrowLeft' && el.selectionStart === 0 && el.selectionEnd === 0) {
      e.preventDefault();
      focusCell(row, col - 1);
    }
  };

  // Paste a block copied from Excel, filling right and down from the focused cell
  const handlePaste = (e, row, col) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\t') && !text.trim().includes('\n')) return;
    e.preventDefault();
    const lines = text.replace(/\r/g, '').replace(/\n$/, '').split('\n');
    setValues((prev) => {
      const next = { ...prev };
      lines.forEach((line, dr) => {
        const s = students[row + dr];
        if (!s) return;
        line.split('\t').forEach((cell, dc) => {
          const q = questions[col + dc];
          if (q) next[cellKey(s._id, q._id)] = cell.trim();
        });
      });
      return next;
    });
  };

  const handleTemplate = () => {
    const course = grid?.assessment?.course;
    const header = ['RollNo', 'Name', ...questions.map((q) => q.label)];
    const maxRow = ['Max Marks', '', ...questions.map((q) => q.maxMarks)];
    const coRow = ['CO', '', ...questions.map((q) => coCodesOf(q))];
    const body = students.map((s) => [
      s.rollNo || '',
      s.name || '',
      ...questions.map((q) => values[cellKey(s._id, q._id)] ?? ''),
    ]);
    const safe = (str) => String(str || '').replace(/[^\w-]+/g, '_');
    downloadWorkbook(`${safe(course?.code)}_${safe(grid?.assessment?.name)}_Marks.xlsx`, [
      {
        name: 'Marks',
        rows: [header, maxRow, coRow, ...body],
        widths: [16, 28, ...questions.map(() => 8)],
      },
    ]);
  };

  // ─── Import with preview ───
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const rows = await readSheetRows(file);
      const res = await importMarksCSVApi({ assessmentId, rows, dryRun: true });
      setPreview({ fileName: file.name, rows, report: res.data });
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not read this file. Use the downloaded template (.xlsx or .csv).', 'error');
    } finally {
      setImporting(false);
    }
  };

  const confirmImport = async () => {
    setImporting(true);
    try {
      const res = await importMarksCSVApi({ assessmentId, rows: preview.rows, dryRun: false });
      showToast(`Imported ${res.data.imported} marks`, 'success');
      setPreview(null);
      await loadGrid();
    } catch (err) {
      showToast(err.response?.data?.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <div className="py-16 flex justify-center"><Spinner /></div>;
  if (!grid) return null;

  if (students.length === 0 || questions.length === 0) {
    return (
      <div className="text-center py-14 text-muted">
        <Info className="w-8 h-8 text-muted/60 mx-auto mb-2" />
        <p>{students.length === 0 ? 'No students are enrolled in this course yet.' : 'This assessment has no questions yet.'}</p>
        <p className="text-xs text-muted/70 mt-1">
          {students.length === 0 ? 'Add a class section from Course Setup → Enrolled Students.' : 'Add the question paper from Course Setup → Assessments.'}
        </p>
      </div>
    );
  }

  const filledCount = Object.values(values).filter((v) => String(v).trim() !== '').length;
  const totalCells = students.length * questions.length;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 text-muted flex-wrap">
          <span>Filled <strong className="text-ink tabular-nums">{filledCount} / {totalCells}</strong></span>
          <SaveIndicator state={saveState} pending={dirtyValid.length} invalid={invalidCount} />
        </div>
        <div className="flex items-center gap-2">
          <GhostButton onClick={handleTemplate}><Download className="w-3.5 h-3.5" /> Excel Template</GhostButton>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
          <GhostButton onClick={() => fileRef.current?.click()}>
            <Upload className="w-3.5 h-3.5" /> {importing && !preview ? 'Reading...' : 'Import Excel'}
          </GhostButton>
          {dirtyValid.length > 0 && (
            <PrimaryButton onClick={() => saveCells(dirtyValid)} disabled={saveState.status === 'saving'}>Save now</PrimaryButton>
          )}
        </div>
      </div>

      {/* Sheet */}
      <div className="border border-border rounded-xl overflow-auto max-h-[60vh] bg-surface">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-paper border-b border-border text-muted uppercase tracking-wider">
              <th className="py-2.5 px-3 w-28 font-semibold bg-paper">Roll No</th>
              <th className="py-2.5 px-3 w-48 font-semibold bg-paper">Student Name</th>
              {questions.map((q) => (
                <th key={q._id} className="py-2.5 px-2 text-center w-20 bg-paper">
                  <div className="font-bold text-ink text-xs normal-case">{q.label}</div>
                  <div className="text-[10px] text-muted font-mono tabular-nums">Max {q.maxMarks}</div>
                  <div className="text-[10px] text-accent font-mono font-semibold">{coCodesOf(q)}</div>
                </th>
              ))}
              <th className="py-2.5 px-3 text-center w-24 font-semibold bg-paper">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((s, row) => {
              let total = 0;
              let any = false;
              for (const q of questions) {
                const v = values[cellKey(s._id, q._id)];
                if (v !== '' && !isAbsent(v) && Number.isFinite(Number(v))) {
                  total += Number(v);
                  any = true;
                }
              }
              return (
                <tr key={s._id} className="hover:bg-paper/50">
                  <td className="py-1.5 px-3 font-mono font-semibold text-ink tabular-nums">{s.rollNo || '—'}</td>
                  <td className="py-1.5 px-3 font-medium text-ink truncate max-w-[12rem]">{s.name}</td>
                  {questions.map((q, col) => {
                    const key = cellKey(s._id, q._id);
                    const val = values[key] ?? '';
                    const error = cellError(val, q.maxMarks);
                    const absent = isAbsent(val);
                    const unsaved = val !== saved[key];
                    return (
                      <td key={q._id} className="py-1 px-1.5 text-center">
                        <input
                          ref={(el) => { inputRefs.current[`${row}-${col}`] = el; }}
                          type="text"
                          inputMode="decimal"
                          value={val}
                          placeholder="—"
                          title={error || (absent ? 'Absent' : undefined)}
                          aria-label={`${s.rollNo || s.name} ${q.label}`}
                          onChange={(e) => setCell(s._id, q._id, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, row, col)}
                          onPaste={(e) => handlePaste(e, row, col)}
                          onFocus={(e) => e.target.select()}
                          className={`w-14 text-center text-xs font-mono font-semibold py-1 px-1 rounded-md border focus:outline-none focus:ring-1 tabular-nums ${
                            error
                              ? 'border-status-below bg-status-below-soft text-status-below focus:ring-status-below'
                              : absent
                                ? 'border-amber-200 bg-status-borderline-soft text-status-borderline focus:ring-accent'
                                : val !== ''
                                  ? `bg-surface text-ink focus:ring-accent ${unsaved ? 'border-accent' : 'border-border'}`
                                  : 'border-border/80 bg-paper/50 text-muted focus:ring-accent'
                          }`}
                        />
                      </td>
                    );
                  })}
                  <td className="py-1.5 px-3 text-center font-mono font-bold tabular-nums">
                    {any ? <span className="text-ink">{Number(total.toFixed(2))}</span> : <span className="text-muted">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted">
        Changes save automatically. Enter or ↓ moves down, ↑ moves up, ← → move across. Type <strong>AB</strong> for absent.
        Paste a block copied from Excel into any cell. Blank means not entered yet.
      </p>

      <ImportPreviewModal
        preview={preview}
        importing={importing}
        onCancel={() => setPreview(null)}
        onConfirm={confirmImport}
      />
    </div>
  );
}

function SaveIndicator({ state, pending, invalid }) {
  return (
    <span className="inline-flex items-center gap-3">
      {state.status === 'saving' ? (
        <span className="inline-flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</span>
      ) : state.status === 'error' ? (
        <span className="inline-flex items-center gap-1 text-status-below"><AlertCircle className="w-3.5 h-3.5" /> Not saved</span>
      ) : pending > 0 ? (
        <span>Unsaved changes…</span>
      ) : state.status === 'saved' ? (
        <span className="inline-flex items-center gap-1 text-status-attained">
          <CheckCircle2 className="w-3.5 h-3.5" /> Saved {state.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ) : null}
      {invalid > 0 && (
        <span className="inline-flex items-center gap-1 text-status-below font-medium">
          <AlertCircle className="w-3.5 h-3.5" /> {invalid} invalid cell(s) not saved
        </span>
      )}
    </span>
  );
}

function ImportPreviewModal({ preview, importing, onCancel, onConfirm }) {
  if (!preview) return null;
  const r = preview.report;
  return (
    <Modal open onClose={onCancel} title="Check before importing" size="lg">
      <div className="space-y-4 text-sm">
        <p className="text-xs text-muted">{preview.fileName}</p>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Students matched" value={r.studentRows} />
          <Stat label="Marks to import" value={r.cellsToImport} good />
          <Stat label="Problems" value={r.issues.length} bad={r.issues.length > 0} />
        </div>

        <p className="text-xs text-muted">
          Questions matched: <span className="text-ink font-medium">{r.questionsMatched.join(', ')}</span>
          {r.unknownColumns.length > 0 && (
            <> · Ignored columns: <span className="text-status-borderline">{r.unknownColumns.join(', ')}</span></>
          )}
        </p>

        {r.issues.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-status-below-soft">
            <div className="px-3 py-2 text-xs font-semibold text-status-below border-b border-red-200">
              These cells will be skipped
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-red-100 text-xs">
              {r.issues.map((iss, i) => (
                <div key={i} className="px-3 py-1.5 text-ink">
                  Row {iss.row} · <span className="font-mono">{iss.rollNo}</span> — {iss.problem}
                </div>
              ))}
            </div>
          </div>
        )}

        {r.missingStudents.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-status-borderline">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              {r.missingStudents.length} enrolled student(s) are not in the file and will keep their current marks:
              {' '}{r.missingStudents.slice(0, 6).map((s) => s.rollNo).join(', ')}{r.missingStudents.length > 6 ? '…' : ''}
            </span>
          </div>
        )}

        <p className="text-[11px] text-muted">Blank cells in the file do not change existing marks.</p>

        <div className="flex justify-end gap-2 pt-1">
          <GhostButton onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton onClick={onConfirm} disabled={importing || r.cellsToImport === 0}>
            {importing ? 'Importing...' : `Import ${r.cellsToImport} marks`}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value, good, bad }) {
  return (
    <div className="rounded-xl border border-border bg-paper/40 px-3 py-2">
      <div className="text-[11px] text-muted uppercase font-semibold">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${bad ? 'text-status-below' : good ? 'text-status-attained' : 'text-ink'}`}>
        {value}
      </div>
    </div>
  );
}
