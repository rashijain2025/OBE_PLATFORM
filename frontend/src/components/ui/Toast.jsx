import { useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

/**
 * Simple toast notification hook + renderer
 * Usage: const { toasts, showToast } = useToast();
 *        showToast('Saved!', 'success') or showToast('Error', 'error')
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismiss };
}

export function ToastContainer({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, dismiss }) {
  const isSuccess = toast.type === 'success';
  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-in slide-in-from-right-4 duration-300 ${
        isSuccess
          ? 'bg-emerald-950 border-emerald-700/50 text-emerald-300'
          : 'bg-red-950 border-red-700/50 text-red-300'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
      ) : (
        <XCircle className="w-4 h-4 shrink-0 text-red-400" />
      )}
      <span>{toast.message}</span>
      <button
        onClick={() => dismiss(toast.id)}
        className="ml-2 text-current opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
