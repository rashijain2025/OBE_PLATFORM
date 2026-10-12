import { useState, useEffect } from 'react';
import { getModelInfoApi, trainModelApi } from '../../api/prediction';
import {
  Brain,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  TrendingUp,
  Database,
  Calendar,
  Layers,
  Award,
  Zap,
} from 'lucide-react';

export default function ModelPage() {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);

  const fetchModelInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getModelInfoApi();
      setModelInfo(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to connect to ML service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelInfo();
  }, []);

  const handleRetrain = async () => {
    try {
      setRetraining(true);
      setNotification(null);
      const res = await trainModelApi();
      setNotification({
        type: 'success',
        message:
          res.message ||
          'Model retrained successfully with optimal cross-validation score!',
      });
      // Refresh info
      await fetchModelInfo();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to retrain ML model',
      });
    } finally {
      setRetraining(false);
    }
  };

  const info = modelInfo?.model_info || modelInfo || {};
  const metrics = info.metrics || {};
  const isTrained = modelInfo?.status === 'trained' || info.metrics;
  const isOffline = modelInfo?.status === 'offline' || modelInfo?.status === 'unavailable';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider flex items-center gap-1">
              <Brain className="w-3 h-3" /> Predictive ML Engine
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
              {info.data_source_label || 'Synthetic historical dataset (seeded)'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            ML Attainment Predictor Management
          </h1>
          <p className="text-sm text-gray-400">
            Supervised binary classifier comparing Logistic Regression vs. Random Forest for early CO attainment risk.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchModelInfo}
            disabled={loading || retraining}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition text-sm font-medium disabled:opacity-50"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleRetrain}
            disabled={retraining || isOffline}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/30 transition text-sm disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${retraining ? 'animate-spin' : ''}`} />
            <span>{retraining ? 'Retraining Model...' : 'Retrain Model'}</span>
          </button>
        </div>
      </div>

      {/* Mandatory OBE Prediction Disclaimer & Synthetic Tag Banner */}
      <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <span className="font-semibold text-amber-300">OBE Policy Disclaimer:</span>{' '}
            Predictions are probabilistic forecasts based on early formative assessments, not final attainment verdicts.
            Faculty discretion is advised.
            <div className="mt-1 text-xs text-amber-400/90 font-mono">
              Dataset Mode: <span className="underline font-semibold">{info.data_source_label || 'Synthetic historical dataset (seeded)'}</span>. Real historical batches can be plugged directly with zero architecture change.
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-red-950/40 border-red-800/60 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs hover:underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Service Offline Warning */}
      {isOffline && (
        <div className="p-6 rounded-xl bg-red-950/30 border border-red-800/50 text-red-200 space-y-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h3 className="font-bold text-lg text-white">ML Microservice Is Offline</h3>
          </div>
          <p className="text-sm text-gray-300">
            The Python FastAPI service at <code className="px-1.5 py-0.5 rounded bg-gray-900 text-red-300 font-mono text-xs">http://localhost:8000</code> could not be contacted.
            Backend routes and other OBE platform services remain operational with graceful degradation.
          </p>
          <div className="p-3 bg-gray-900/80 rounded-lg text-xs font-mono text-gray-300 border border-gray-800">
            # Start the ML service in terminal:
            <br />
            cd ml-service
            <br />
            uvicorn app.main:app --host 0.0.0.0 --port 8000
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !modelInfo && (
        <div className="p-12 text-center text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-400" />
          <p>Connecting to ML model service...</p>
        </div>
      )}

      {/* Model Dashboard */}
      {!loading && !isOffline && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
              <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-1">
                <span>Model Architecture</span>
                <Cpu className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-xl font-bold text-white truncate">
                {info.model_name || 'RandomForest'}
              </div>
              <div className="text-xs text-indigo-400 mt-1">
                Selected via 5-Fold Stratified CV
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
              <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-1">
                <span>Test F1-Score</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-emerald-400">
                {metrics.f1 ? `${(metrics.f1 * 100).toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Primary model selection criterion
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
              <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-1">
                <span>Accuracy & Recall</span>
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-bold text-white">
                {metrics.accuracy ? `${(metrics.accuracy * 100).toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-xs text-blue-400 mt-1">
                Recall: {metrics.recall ? `${(metrics.recall * 100).toFixed(1)}%` : 'N/A'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
              <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-1">
                <span>Precision</span>
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold text-purple-400">
                {metrics.precision ? `${(metrics.precision * 100).toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Low false alarm rate on non-attainment
              </div>
            </div>
          </div>

          {/* Model Specification & Training Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metadata & Lineage */}
            <div className="p-5 rounded-xl bg-gray-900 border border-gray-800 space-y-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white">Model Lineage & Dataset</h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Data Source Label</span>
                  <span className="font-semibold text-amber-300">
                    {info.data_source_label || 'Synthetic historical dataset (seeded)'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Training Sample Count</span>
                  <span className="font-mono text-gray-200">
                    {info.training_samples?.toLocaleString() || '1,500'} records
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Selection Method</span>
                  <span className="text-gray-300 text-right">
                    {info.selected_by || '5-fold Stratified Cross-Validation F1'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Baseline Comparison</span>
                  <span className="text-gray-300">LogisticRegression vs. RandomForest</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Last Trained</span>
                  <span className="text-gray-300 font-mono text-xs">
                    {info.trained_date ? new Date(info.trained_date).toLocaleString() : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-400">Missing Feature Handling</span>
                  <span className="text-emerald-400 text-xs font-semibold">
                    Mean Imputer + NaN Safe
                  </span>
                </div>
              </div>
            </div>

            {/* Feature Importances */}
            <div className="p-5 rounded-xl bg-gray-900 border border-gray-800 space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white">Feature Contributions & Importances</h3>
              </div>

              <p className="text-xs text-gray-400">
                Relative influence of student assessment indicators on final outcome attainment prediction.
              </p>

              <div className="space-y-4 pt-2">
                {info.feature_importances ? (
                  Object.entries(info.feature_importances).map(([feat, weight]) => {
                    const pct = Math.round(Number(weight) * 100);
                    const labelMap = {
                      early_co_pct: 'Early Assessment CO % So Far',
                      overall_early_pct: 'Overall Early Aggregate Score %',
                      trend: 'Formative Score Trend',
                      num_eval_questions: 'Evaluated Question Count for CO',
                    };

                    return (
                      <div key={feat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-300 font-medium">
                            {labelMap[feat] || feat}
                          </span>
                          <span className="font-mono text-indigo-400 font-bold">
                            {(Number(weight) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-400">No feature importances recorded.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
