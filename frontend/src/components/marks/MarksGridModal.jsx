import MarksSheet from './MarksSheet';
import { GhostButton } from '../ui/AdminUI';
import { X, Table } from 'lucide-react';

export default function MarksGridModal({ open, assessment, onClose, showToast }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-ink/40 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-6xl max-h-[94vh] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-paper/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-soft border border-teal-200 text-accent">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink font-serif tracking-tight flex items-center gap-2 flex-wrap">
                <span>Marks Entry</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent-soft text-accent border border-teal-200 font-medium">
                  {assessment?.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-surface border border-border text-muted tabular-nums">
                  Max Marks: {assessment?.maxMarks}
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-ink p-1.5 rounded-lg hover:bg-paper transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <MarksSheet assessmentId={assessment?._id} showToast={showToast} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-border bg-paper/60">
          <GhostButton onClick={onClose}>Done</GhostButton>
        </div>
      </div>
    </div>
  );
}
