import { useState, useEffect } from 'react';
import { Activity, Server, Brain, CheckCircle, XCircle, Loader } from 'lucide-react';
import { getBackendHealth, getMlHealth } from '../api/health';

function StatusCard({ title, icon: Icon, status, details }) {
  const statusConfig = {
    loading: { color: 'text-status-borderline', bg: 'bg-status-borderline-soft', border: 'border-amber-200', Icon: Loader, label: 'Checking...' },
    ok: { color: 'text-status-attained', bg: 'bg-status-attained-soft', border: 'border-emerald-200', Icon: CheckCircle, label: 'Healthy' },
    error: { color: 'text-status-below', bg: 'bg-status-below-soft', border: 'border-red-200', Icon: XCircle, label: 'Unreachable' },
  };

  const cfg = statusConfig[status];
  const StatusIcon = cfg.Icon;

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-6 flex flex-col gap-4 shadow-card`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-6 h-6 ${cfg.color}`} />
          <h3 className="text-lg font-semibold text-ink font-serif">{title}</h3>
        </div>
        <StatusIcon className={`w-5 h-5 ${cfg.color} ${status === 'loading' ? 'animate-spin' : ''}`} />
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
      </div>
      {details && (
        <p className="text-sm text-muted">{details}</p>
      )}
    </div>
  );
}

export default function HealthPage() {
  const [backend, setBackend] = useState({ status: 'loading', details: '' });
  const [ml, setMl] = useState({ status: 'loading', details: '' });

  useEffect(() => {
    getBackendHealth()
      .then((res) => {
        const d = res.data.data;
        setBackend({
          status: 'ok',
          details: `DB: ${d.database} · Env: ${d.environment}`,
        });
      })
      .catch((err) => {
        setBackend({
          status: 'error',
          details: err.message || 'Cannot reach backend',
        });
      });

    getMlHealth()
      .then((res) => {
        setMl({
          status: 'ok',
          details: `Service: ${res.data.data.service}`,
        });
      })
      .catch((err) => {
        setMl({
          status: 'error',
          details: err.message || 'Cannot reach ML service',
        });
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Activity className="w-8 h-8 text-accent" />
          <h1 className="text-3xl font-bold text-ink font-serif">System Health</h1>
        </div>
        <p className="text-muted">Service status dashboard</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <StatusCard
          title="Backend API"
          icon={Server}
          status={backend.status}
          details={backend.details}
        />
        <StatusCard
          title="ML Service"
          icon={Brain}
          status={ml.status}
          details={ml.details}
        />
      </div>
    </div>
  );
}
