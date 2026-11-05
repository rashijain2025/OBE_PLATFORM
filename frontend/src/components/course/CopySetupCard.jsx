import { useEffect, useState } from 'react';
import { listCopySourcesApi, copyCourseSetupApi } from '../../api/faculty';
import { PrimaryButton } from '../ui/AdminUI';
import { Copy } from 'lucide-react';

/**
 * Offered on a course with no COs or assessments: copy the whole setup from an earlier offering
 */
export default function CopySetupCard({ courseId, onCopied, showToast }) {
  const [sources, setSources] = useState([]);
  const [sourceId, setSourceId] = useState('');
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    listCopySourcesApi(courseId)
      .then((res) => {
        setSources(res.data || []);
        setSourceId(res.data?.[0]?._id || '');
      })
      .catch(() => setSources([]));
  }, [courseId]);

  if (sources.length === 0) return null;

  const selected = sources.find((s) => s._id === sourceId);

  const handleCopy = async () => {
    setCopying(true);
    try {
      const res = await copyCourseSetupApi(courseId, sourceId);
      const d = res.data;
      showToast(
        `Copied ${d.cosCopied} COs, ${d.assessmentsCopied} assessments, ${d.questionsCopied} questions` +
          (d.mappingsCopied ? ` and ${d.mappingsCopied} CO-PO/PSO mappings` : ''),
        'success'
      );
      onCopied();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not copy course setup', 'error');
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="rounded-2xl border border-teal-200 bg-accent-soft/40 p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex items-start gap-3 flex-1">
        <div className="rounded-lg p-2 bg-accent-soft text-accent"><Copy className="w-5 h-5" /></div>
        <div>
          <h2 className="font-serif text-base font-semibold text-ink">Start from a previous offering</h2>
          <p className="text-xs text-muted">
            Copy COs, assessments, question papers and CO-PO mappings in one click. Marks and students are not copied.
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 md:w-auto">
        <select
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface border border-border text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          {sources.map((s) => (
            <option key={s._id} value={s._id}>
              {s.code} · {s.academicYear}{s.faculty?.name ? ` · ${s.faculty.name}` : ''}
            </option>
          ))}
        </select>
        <PrimaryButton onClick={handleCopy} disabled={copying || !sourceId}>
          {copying ? 'Copying...' : `Copy ${selected ? `${selected.cosCount} COs · ${selected.questionsCount} Qs` : ''}`}
        </PrimaryButton>
      </div>
    </div>
  );
}
