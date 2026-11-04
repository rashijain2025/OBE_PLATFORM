import { useEffect, useMemo, useRef, useState } from 'react';
import { saveQuestionPaperApi } from '../../api/faculty';
import { PrimaryButton, GhostButton } from '../ui/AdminUI';
import { Plus, Trash2, AlertTriangle, CheckCircle2, ClipboardPaste } from 'lucide-react';

const naturalSort = (a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });

let rowKeySeq = 0;
const newKey = () => `row-${++rowKeySeq}`;

function toRows(questions) {
  return [...(questions || [])]
    .sort(naturalSort)
    .map((q) => ({ key: newKey(), _id: q._id, label: q.label, maxMarks: String(q.maxMarks), coIds: coIdsOf(q) }));
}

// Every CO a question is mapped to (older questions store a single `co`)
function coIdsOf(q) {
  return (q.cos?.length ? q.cos : q.co ? [q.co] : []).map((c) => String(c?._id || c));
}

const rowsSignature = (rows) =>
  JSON.stringify(rows.map(({ _id, label, maxMarks, coIds }) => [_id || '', label.trim(), String(maxMarks), [...coIds].sort().join(',')]));

/**
 * Next label after the last one: Q3 → Q4, 2b → 2c, otherwise Q<n+1>
 */
function nextLabel(rows) {
  const last = rows[rows.length - 1]?.label?.trim();
  if (last) {
    const num = last.match(/^(.*?)(\d+)$/);
    if (num) return `${num[1]}${Number(num[2]) + 1}`;
    const letter = last.match(/^(.*\d)([a-y])$/i);
    if (letter) return `${letter[1]}${String.fromCharCode(letter[2].charCodeAt(0) + 1)}`;
  }
  return `Q${rows.length + 1}`;
}

/**
 * Editable question paper for one assessment: Label | Marks | CO, saved in one go.
 * Tab/Enter move between cells, Enter on the last row adds a row, and rows can be pasted from Excel.
 */
export default function QuestionPaperBuilder({ assessment, cos, onSaved, showToast }) {
  const [rows, setRows] = useState(() => toRows(assessment.questions));
  const [baseline, setBaseline] = useState(() => rowsSignature(toRows(assessment.questions)));
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef({});

  useEffect(() => {
    const fresh = toRows(assessment.questions);
    setBaseline(rowsSignature(fresh));
    setRows(fresh);
  }, [assessment.questions]);

  const coOptions = useMemo(
    () => [...cos].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    [cos]
  );
  const coByCode = useMemo(() => new Map(coOptions.map((c) => [c.code.toUpperCase(), c._id])), [coOptions]);

  const isDirty = rowsSignature(rows) !== baseline;
  const total = rows.reduce((s, r) => s + (Number(r.maxMarks) || 0), 0);
  const totalOk = rows.length > 0 && total === assessment.maxMarks;

  const rowErrors = useMemo(() => {
    const seen = new Map();
    rows.forEach((r) => {
      const k = r.label.trim().toUpperCase();
      if (k) seen.set(k, (seen.get(k) || 0) + 1);
    });
    return rows.map((r) => ({
      label: !r.label.trim() || seen.get(r.label.trim().toUpperCase()) > 1,
      marks: !(Number(r.maxMarks) > 0),
      co: r.coIds.length === 0,
    }));
  }, [rows]);
  const hasErrors = rowErrors.some((e) => e.label || e.marks || e.co);

  // Focus requests are applied after render, so a row added in the same event can receive focus
  const pendingFocus = useRef(null);
  useEffect(() => {
    if (!pendingFocus.current) return;
    const el = inputRefs.current[pendingFocus.current];
    pendingFocus.current = null;
    el?.focus();
    el?.select?.();
  }, [rows]);

  const focusCell = (rowIndex, col) => {
    const el = inputRefs.current[`${rowIndex}-${col}`];
    if (el) {
      el.focus();
      el.select?.();
    } else {
      pendingFocus.current = `${rowIndex}-${col}`;
    }
  };

  const updateRow = (index, patch) => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const addRow = () => {
    setRows((prev) => {
      // A new question starts with the previous question's COs, since consecutive questions often share them
      const lastCos = prev[prev.length - 1]?.coIds || (coOptions[0] ? [coOptions[0]._id] : []);
      return [...prev, { key: newKey(), label: nextLabel(prev), maxMarks: prev[prev.length - 1]?.maxMarks || '', coIds: [...lastCos] }];
    });
    focusCell(rows.length, 'marks');
  };

  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

  const toggleCo = (index, coId) =>
    setRows((prev) =>
      prev.map((r, i) =>
        i !== index ? r : { ...r, coIds: r.coIds.includes(coId) ? r.coIds.filter((c) => c !== coId) : [...r.coIds, coId] }
      )
    );

  const handleKeyDown = (e, rowIndex, col) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (rowIndex === rows.length - 1) addRow();
    else focusCell(rowIndex + 1, col);
  };

  // Paste rows copied from Excel: Label <tab> Marks <tab> COs ("CO2", "2", or several such as "CO1, CO3")
  const handlePaste = (e, rowIndex) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\t') && !text.trim().includes('\n')) return;
    e.preventDefault();
    const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
    setRows((prev) => {
      const next = [...prev];
      lines.forEach((line, i) => {
        const [label, marks, co] = line.split('\t').map((c) => c.trim());
        const pastedCos = (co || '').match(/\d+/g)?.map((n) => coByCode.get(`CO${Number(n)}`)).filter(Boolean) || [];
        const target = rowIndex + i;
        const base = next[target] || { key: newKey(), coIds: [...(next[target - 1]?.coIds || [])] };
        next[target] = {
          ...base,
          label: label || base.label || '',
          maxMarks: marks !== undefined && marks !== '' ? marks : base.maxMarks || '',
          coIds: pastedCos.length > 0 ? [...new Set(pastedCos)] : base.coIds,
        };
      });
      return next;
    });
    showToast(`Pasted ${lines.length} row(s). Review and click Save Paper.`, 'success');
  };

  const handleSave = async (allowDeleteWithMarks = false) => {
    setSaving(true);
    try {
      const res = await saveQuestionPaperApi({
        assessmentId: assessment._id,
        allowDeleteWithMarks,
        questions: rows.map((r) => ({ _id: r._id, label: r.label.trim(), maxMarks: Number(r.maxMarks), coIds: r.coIds })),
      });
      showToast(res.data.warning ? `Saved. ${res.data.warning}` : 'Question paper saved', res.data.warning ? 'error' : 'success');
      onSaved();
    } catch (err) {
      const removed = err.response?.data?.data?.removedWithMarks;
      if (err.response?.status === 409 && removed?.length) {
        if (window.confirm(`${err.response.data.message}\n\nDelete these questions and their marks?`)) {
          setSaving(false);
          return handleSave(true);
        }
      } else {
        showToast(err.response?.data?.message || 'Could not save question paper', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (cos.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-status-borderline">
        Add Course Outcomes first. Every question has to be mapped to a CO.
      </div>
    );
  }

  const cellBase = 'w-full px-2 py-1.5 rounded-md border text-xs bg-surface focus:outline-none focus:ring-1 focus:ring-accent';
  const cellClass = (bad) => `${cellBase} ${bad ? 'border-status-below bg-status-below-soft' : 'border-border focus:border-accent'}`;

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <div className="text-center py-5 text-xs text-muted space-y-1">
          <p>No questions yet. Add the first question, or paste rows copied from Excel (Label, Marks, COs such as "CO1, CO3").</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-paper/30 text-xs text-muted uppercase">
                <th className="text-left py-2 px-2 w-28">Question</th>
                <th className="text-left py-2 px-2 w-24">Marks</th>
                <th className="text-left py-2 px-2">Course Outcomes (tick all that apply)</th>
                <th className="py-2 px-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={r.key}>
                  <td className="py-1.5 px-2">
                    <input
                      ref={(el) => { inputRefs.current[`${i}-label`] = el; }}
                      value={r.label}
                      onChange={(e) => updateRow(i, { label: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, i, 'label')}
                      onPaste={(e) => handlePaste(e, i)}
                      placeholder="Q1"
                      className={`${cellClass(rowErrors[i]?.label)} font-mono font-semibold`}
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <input
                      ref={(el) => { inputRefs.current[`${i}-marks`] = el; }}
                      type="number"
                      min={0}
                      step="any"
                      value={r.maxMarks}
                      onChange={(e) => updateRow(i, { maxMarks: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, i, 'marks')}
                      onPaste={(e) => handlePaste(e, i)}
                      className={`${cellClass(rowErrors[i]?.marks)} font-mono tabular-nums`}
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <div
                      role="group"
                      aria-label={`Course Outcomes for ${r.label || `row ${i + 1}`}`}
                      className={`flex flex-wrap gap-1.5 rounded-md p-1 ${rowErrors[i]?.co ? 'ring-1 ring-status-below bg-status-below-soft' : ''}`}
                    >
                      {coOptions.map((c) => {
                        const checked = r.coIds.includes(String(c._id));
                        return (
                          <label
                            key={c._id}
                            title={c.statement}
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-mono font-semibold cursor-pointer select-none transition-colors ${
                              checked
                                ? 'border-accent bg-accent-soft text-accent'
                                : 'border-border bg-surface text-muted hover:text-ink'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCo(i, String(c._id))}
                              className="accent-teal-600"
                            />
                            {c.code}
                          </label>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="p-1.5 rounded-md text-muted hover:text-status-below hover:bg-status-below-soft transition-colors cursor-pointer"
                      aria-label={`Remove ${r.label || 'row'}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <GhostButton onClick={addRow}><Plus className="w-3.5 h-3.5" /> Add Question</GhostButton>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted">
            <ClipboardPaste className="w-3 h-3" /> Paste rows from Excel · Enter adds a row
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums ${
              totalOk ? 'text-status-attained' : 'text-status-borderline'
            }`}
          >
            {totalOk ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            Total {total} / {assessment.maxMarks}
          </span>
          {isDirty && (
            <>
              <GhostButton onClick={() => setRows(toRows(assessment.questions))}>Discard</GhostButton>
              <PrimaryButton onClick={() => handleSave(false)} disabled={saving || hasErrors}>
                {saving ? 'Saving...' : 'Save Paper'}
              </PrimaryButton>
            </>
          )}
        </div>
      </div>
      {isDirty && hasErrors && (
        <p className="text-[11px] text-status-below text-right">Fix the highlighted cells: every question needs a unique label, marks above 0 and at least one CO ticked.</p>
      )}
    </div>
  );
}
