import { useState, useEffect } from 'react';
import { Activity, Server, Brain, CheckCircle, XCircle, Loader } from 'lucide-react';
import { getBackendHealth, getMlHealth } from '../api/health';

function StatusCard({ title, icon: Icon, status, details }) {
  const statusConfig = {
    loading: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', Icon: Loader, label: 'Checking...' },
    ok: { color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30', Icon: CheckCircle, label: 'Healthy' },
    error: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30', Icon: XCircle, label: 'Unreachable' },
  };

  const cfg = statusConfig[status];
  const StatusIcon = cfg.Icon;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-6 flex flex-col gap-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-6 h-6 ${cfg.color}`} />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <StatusIcon className={`w-5 h-5 ${cfg.color} ${status === 'loading' ? 'animate-spin' : ''}`} />
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
      </div>
      {details && (
        <p className="text-sm text-gray-400">{details}</p>
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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Activity className="w-8 h-8 text-indigo-400" />
            <h1 className="text-3xl font-bold text-white">OBE Platform</h1>
          </div>
          <p className="text-gray-400">System Health Dashboard</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    </div>
  );
}
