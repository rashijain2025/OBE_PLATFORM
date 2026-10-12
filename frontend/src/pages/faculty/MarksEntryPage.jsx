import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listCoursesApi } from '../../api/admin';
import {
  listAssessmentsApi,
  getMarksGridApi,
  saveBulkMarksApi,
  importMarksCSVApi,
} from '../../api/faculty';
import {
  PageHeader, Card, FormSelect, PrimaryButton, GhostButton, Spinner, EmptyState
} from '../../components/ui/AdminUI';
import { useToast, ToastContainer } from '../../components/ui/Toast';
import {
  FileSpreadsheet, Save, Download, Upload, AlertCircle, CheckCircle2,
  Table, BookOpen, Layers, X
} from 'lucide-react';

export default function MarksEntryPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toasts, showToast } = useToast();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get('courseId') || '');
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(searchParams.get('assessmentId') || '');

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [saving, setSaving] = useState(false);

  const [gridData, setGridData] = useState(null);
  const [localMarks, setLocalMarks] = useState({});

  // CSV Modal state
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const fileInputRef = useRef(null);

  // 1. Fetch courses
  useEffect(() => {
    setLoadingCourses(true);
    listCoursesApi()
      .then((res) => {
        const list = res.data || [];
        setCourses(list);
        if (!selectedCourseId && list.length > 0) {
          setSelectedCourseId(list[0]._id);
        }
      })
      .catch((err) => showToast(err.response?.data?.message || 'Failed to load courses', 'error'))
      .finally(() => setLoadingCourses(false));
  }, [showToast]);

  // 2. Fetch assessments when course changes
  useEffect(() => {
    if (!selectedCourseId) {
      setAssessments([]);
      setSelectedAssessmentId('');
      setGridData(null);
      return;
    }

    setLoadingAssessments(true);
    listAssessmentsApi(selectedCourseId)
      .then((res) => {
        const list = res.data || [];
        setAssessments(list);
        if (list.length > 0) {
          // If query param assessment is in this course, keep it, otherwise pick first
          if (!list.some((a) => a._id === selectedAssessmentId)) {
            setSelectedAssessmentId(list[0]._id);
          }
        } else {
          setSelectedAssessmentId('');
          setGridData(null);
        }
      })
      .catch((err) => showToast(err.response?.data?.message || 'Failed to load assessments', 'error'))
      .finally(() => setLoadingAssessments(false));
  }, [selectedCourseId, showToast]);

  // 3. Fetch marks grid when assessment changes
  useEffect(() => {
    if (!selectedAssessmentId) {
      setGridData(null);
      return;
    }

    setLoadingGrid(true);
    getMarksGridApi(selectedAssessmentId)
      .then((res) => {
        setGridData(res.data);
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
      })
      .catch((err) => showToast(err.response?.data?.message || 'Failed to load marks grid', 'error'))
      .finally(() => setLoadingGrid(false));
  }, [selectedAssessmentId, showToast]);

  const questions = gridData?.questions || [];
  const students = gridData?.students || [];
  const assessment = gridData?.assessment;

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

  // Bulk Save
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
        assessmentId: selectedAssessmentId,
        marks: marksPayload,
      });

      showToast('All marks saved successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  // CSV Template Export
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
    link.setAttribute('download', `${assessment?.name || 'Marks'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Marks CSV exported', 'success');
  };

  // CSV Import
  const handleImportCSV = async () => {
    if (!csvText.trim()) {
      showToast('Please paste or upload CSV text', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await importMarksCSVApi({
        assessmentId: selectedAssessmentId,
        csvText,
      });

      const report = res.data;
      if (report.errors?.length > 0) {
        showToast(`Imported ${report.imported} rows with notices (${report.errors[0]?.reason})`, 'error');
      } else {
        showToast(`Successfully imported marks for ${report.imported} students!`, 'success');
      }

      setCsvModalOpen(false);
      setCsvText('');

      // Refresh grid
      const fresh = await getMarksGridApi(selectedAssessmentId);
      setGridData(fresh.data);
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
    reader.onload = (event) => setCsvText(event.target.result || '');
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />

      <PageHeader
        title="Student Marks Entry"
        subtitle="Record, validate, and bulk-save question-level scores for course assessments."
        action={
          selectedCourseId && (
            <Link
              to={`/courses/${selectedCourseId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Course Setup</span>
            </Link>
          )
        }
      />

      {/* Selectors Bar */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            label="Select Course"
            value={selectedCourseId}
            onChange={(val) => {
              setSelectedCourseId(val);
              setSearchParams({ courseId: val });
            }}
            options={courses.map((c) => ({
              value: c._id,
              label: `${c.code} — ${c.name} (${c.academicYear}, Sem ${c.semester})`,
            }))}
            disabled={loadingCourses}
          />

          <FormSelect
            label="Select Assessment"
            value={selectedAssessmentId}
            onChange={(val) => {
              setSelectedAssessmentId(val);
              setSearchParams({ courseId: selectedCourseId, assessmentId: val });
            }}
            options={assessments.map((a) => ({
              value: a._id,
              label: `${a.name} (${a.type.replace('_', ' ')} · Max ${a.maxMarks} marks)`,
            }))}
            disabled={loadingAssessments || assessments.length === 0}
          />
        </div>
      </Card>

      {/* Grid Container */}
      {loadingGrid ? (
        <div className="py-20 flex justify-center items-center">
          <Spinner />
        </div>
      ) : !selectedCourseId || !selectedAssessmentId ? (
        <Card>
          <EmptyState message="Please select a course and assessment to view the marks entry grid." />
        </Card>
      ) : students.length === 0 ? (
        <Card>
          <EmptyState message="No students are enrolled in this course. Enroll students from Course Setup." />
        </Card>
      ) : questions.length === 0 ? (
        <Card>
          <EmptyState message="No questions have been configured for this assessment. Add questions from Course Setup." />
        </Card>
      ) : (
        <Card>
          {/* Header Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-800">
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>Assessment: <strong className="text-white">{assessment?.name}</strong></span>
              <span>Max Marks: <strong className="text-blue-400">{assessment?.maxMarks}</strong></span>
              <span>Enrolled Students: <strong className="text-white">{students.length}</strong></span>
              <span>Questions: <strong className="text-white">{questions.length}</strong></span>
              {validationErrors.length > 0 && (
                <span className="text-rose-400 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {validationErrors.length} invalid mark(s)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <GhostButton onClick={handleExportTemplate} title="Export CSV Template">
                <Download className="w-3.5 h-3.5" /> Export Template
              </GhostButton>
              <GhostButton onClick={() => setCsvModalOpen(true)} title="Import Marks via CSV">
                <Upload className="w-3.5 h-3.5" /> Import CSV
              </GhostButton>
              <PrimaryButton onClick={handleBulkSave} disabled={saving || validationErrors.length > 0}>
                <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save All Marks'}
              </PrimaryButton>
            </div>
          </div>

          {/* Spreadsheet Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-3 w-28 font-semibold">Roll No</th>
                  <th className="py-3 px-3 w-48 font-semibold">Student Name</th>
                  {questions.map((q) => (
                    <th key={q._id} className="py-3 px-2 text-center w-24">
                      <div className="font-bold text-white text-xs">{q.label}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">Max {q.maxMarks}</div>
                      <div className="text-[10px] text-purple-400 font-mono">{q.co?.code}</div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center w-28 font-semibold text-emerald-400">
                    Total ({assessment?.maxMarks})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {students.map((s) => {
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
                    <tr key={s._id} className="hover:bg-gray-800/20 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-300">
                        {s.rollNo || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-white truncate max-w-[12rem]">
                        {s.name}
                      </td>
                      {questions.map((q) => {
                        const val = localMarks[s._id]?.[q._id] ?? '';
                        const num = Number(val);
                        const isInvalid =
                          val !== '' && (isNaN(num) || num < 0 || num > q.maxMarks);

                        return (
                          <td key={q._id} className="py-2 px-2 text-center">
                            <input
                              type="number"
                              step="any"
                              min={0}
                              max={q.maxMarks}
                              placeholder="—"
                              value={val}
                              onChange={(e) => handleCellChange(s._id, q._id, e.target.value)}
                              className={`w-16 text-center text-xs font-mono font-semibold py-1 px-1 rounded-md bg-gray-950 border transition-all focus:outline-none focus:ring-1 ${
                                isInvalid
                                  ? 'border-rose-500 bg-rose-950/20 text-rose-300 focus:ring-rose-500'
                                  : val !== ''
                                  ? 'border-indigo-500/40 text-emerald-300 focus:ring-indigo-500'
                                  : 'border-gray-800 text-gray-400 focus:ring-indigo-500'
                              }`}
                            />
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        {hasAnyMark ? (
                          <span className="text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                            {Number(totalObtained.toFixed(2))}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-800 text-xs text-gray-500">
            <div>Tip: Empty cells are saved as null (not evaluated). Enter 0 for zero marks.</div>
            <PrimaryButton onClick={handleBulkSave} disabled={saving || validationErrors.length > 0}>
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save All Marks'}
            </PrimaryButton>
          </div>
        </Card>
      )}

      {/* CSV Import Modal */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <span>Import Marks via CSV</span>
              </h3>
              <button
                onClick={() => setCsvModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400">
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
              <span className="text-xs text-gray-500">or paste CSV text below:</span>
            </div>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`RollNo,${questions.map((q) => q.label).join(',')}\n22IT001,${questions.map((q) => q.maxMarks).join(',')}\n22IT002,...`}
              rows={6}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
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
