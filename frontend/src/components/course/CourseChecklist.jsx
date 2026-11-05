import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, AlertTriangle, ArrowRight } from 'lucide-react';

/**
 * Step-by-step setup progress for one course, with a jump to where each missing piece is fixed
 */
export default function CourseChecklist({ courseId, progress, onGoto }) {
  if (!progress) return null;
  const { steps, unmappedCOs, papers, enrolledCount, cosCount, marksPercent } = progress;

  const incompletePapers = papers.filter((p) => !p.paperComplete).map((p) => p.name);
  const marksPending = papers.filter((p) => p.marksTotal > 0 && p.marksFilled < p.marksTotal);

  const items = [
    {
      done: steps.cosDefined,
      title: 'Course Outcomes',
      detail: steps.cosDefined ? `${cosCount} COs defined` : 'Add the COs for this course',
      tab: 'cos',
    },
    {
      done: steps.allCOsAssessed,
      warn: steps.cosDefined && !steps.allCOsAssessed,
      title: 'Every CO assessed',
      detail: !steps.cosDefined
        ? 'Needs COs first'
        : steps.allCOsAssessed
          ? 'Each CO has at least one question'
          : `No questions for ${unmappedCOs.join(', ')}`,
      tab: 'assessments',
    },
    {
      done: steps.papersComplete,
      warn: papers.length > 0 && !steps.papersComplete,
      title: 'Question papers',
      detail: papers.length === 0
        ? 'Create assessments and their questions'
        : steps.papersComplete
          ? `${papers.length} papers match their max marks`
          : `Incomplete: ${incompletePapers.join(', ')}`,
      tab: 'assessments',
    },
    {
      done: steps.studentsAdded,
      title: 'Students',
      detail: steps.studentsAdded ? `${enrolledCount} students enrolled` : 'Add a class section',
      tab: 'students',
    },
    {
      done: steps.marksComplete,
      warn: progress.marksFilled > 0 && !steps.marksComplete,
      title: 'Marks entered',
      detail: progress.marksTotal === 0
        ? 'Needs questions and students first'
        : steps.marksComplete
          ? 'All marks entered'
          : `${marksPercent}% done · ${marksPending.map((p) => `${p.name} ${p.marksTotal - p.marksFilled} missing`).join(', ')}`,
      tab: 'assessments',
    },
  ];

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-serif text-base font-semibold text-ink">Course Setup Progress</h2>
          <p className="text-xs text-muted">{doneCount} of {items.length} steps complete</p>
        </div>
        {progress.ready ? (
          <Link
            to={`/attainment?courseId=${courseId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:opacity-90"
          >
            View Attainment <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <div className="w-32 h-2 rounded-full bg-paper border border-border overflow-hidden" aria-hidden="true">
            <div className="h-full bg-accent transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} />
          </div>
        )}
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {items.map((item, i) => {
          const Icon = item.done ? CheckCircle2 : item.warn ? AlertTriangle : Circle;
          const tone = item.done ? 'text-status-attained' : item.warn ? 'text-status-borderline' : 'text-muted';
          return (
            <li key={item.title}>
              <button
                type="button"
                onClick={() => onGoto(item.tab)}
                className="w-full h-full text-left rounded-xl border border-border bg-paper/40 hover:bg-paper px-3 py-2.5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-4 h-4 shrink-0 ${tone}`} />
                  <span className="text-xs font-semibold text-ink">{i + 1}. {item.title}</span>
                </div>
                <p className={`text-[11px] mt-1 leading-snug ${item.warn ? 'text-status-borderline' : 'text-muted'}`}>{item.detail}</p>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
