import { useState } from 'react';
import { downloadCourseReport } from '../../api/attainment';
import { FileSpreadsheet } from 'lucide-react';

/**
 * Downloads the full course report workbook (.xlsx) for a course
 */
export default function CourseReportButton({ courseId, target = 40, courseCode, showToast }) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      await downloadCourseReport(courseId, target, courseCode);
    } catch {
      showToast?.('Could not generate the course report', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || !courseId}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-paper bg-ink hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
    >
      <FileSpreadsheet className="w-3.5 h-3.5" />
      <span>{busy ? 'Preparing…' : 'Course Report (Excel)'}</span>
    </button>
  );
}
