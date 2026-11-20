import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, AlertTriangle, RefreshCw, Server, Brain, BarChart2,
  CheckCircle, Database, Upload, FileText, Clock,
  Zap, Shield, RotateCcw, ChevronDown, ChevronUp, Settings2,
  TrendingUp, Layers, Info, X, Award, CheckCircle2,
  Sliders, ArrowUpRight, Download, Users, FileCheck, Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import {
  adminApi,
  type ModelStatus,
  type TrainingLogEntry,
  type TrainingDataPreview,
  type RetrainResult,
  type CandidateBenchmark,
  type ModelCompareResult,
  type ActualScoresImportResult
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

type ActiveTab = 'retrain' | 'benchmark' | 'scores' | 'upload' | 'history';
type RetrainStep = 'idle' | 'training' | 'success' | 'error';

export default function ModelMonitor() {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scoreInputRef = useRef<HTMLInputElement>(null);

  // Main Data States
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [trainingPreview, setTrainingPreview] = useState<TrainingDataPreview | null>(null);
  const [history, setHistory] = useState<TrainingLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('retrain');

  // Retraining Config States
  const [selectedModel, setSelectedModel] = useState('Ridge');
  const [includeBase, setIncludeBase] = useState(true);
  const [studentWeight, setStudentWeight] = useState(10);
  const [notes, setNotes] = useState('');
  const [retrainStep, setRetrainStep] = useState<RetrainStep>('idle');
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [retrainResult, setRetrainResult] = useState<RetrainResult | null>(null);
  const [retrainError, setRetrainError] = useState('');

  // UI Expanders
  const [showRoster, setShowRoster] = useState(false);
  const [showFeatureMatrix, setShowFeatureMatrix] = useState(false);

  // Candidate Benchmark States
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<ModelCompareResult | null>(null);
  const [benchmarkError, setBenchmarkError] = useState('');

  // CSV Upload Retrain State
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Score Import State
  const [scoreImportLoading, setScoreImportLoading] = useState(false);
  const [scoreImportResult, setScoreImportResult] = useState<ActualScoresImportResult | null>(null);
  const [scoreImportError, setScoreImportError] = useState('');

  // Version Action State
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Initial load
  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [status, preview, hist] = await Promise.all([
        adminApi.getModelStatus(),
        token ? adminApi.getTrainingDataPreview(token) : Promise.resolve(null),
        token ? adminApi.getTrainingHistory(token) : Promise.resolve({ history: [] }),
      ]);
      setModelStatus(status);
      setTrainingPreview(preview);
      setHistory(hist.history || []);
    } catch (err) {
      console.error('Failed to load model data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run Retraining
  const handleRetrain = async (overrideModel?: string) => {
    if (!token) return;
    const modelToTrain = overrideModel || selectedModel;
    setRetrainStep('training');
    setProgress(10);
    setProgressMsg('Extracting current student academic & behavioural features...');
    setRetrainError('');

    const t1 = setTimeout(() => {
      setProgress(35);
      setProgressMsg(`Applying ${studentWeight}x sample weighting to class students...`);
    }, 400);

    const t2 = setTimeout(() => {
      setProgress(65);
      setProgressMsg(`Fitting ${modelToTrain} regressor pipeline on balanced dataset...`);
    }, 900);

    const t3 = setTimeout(() => {
      setProgress(85);
      setProgressMsg('Computing 20% holdout cross-validation and MAE...');
    }, 1400);

    try {
      let res: RetrainResult;
      if (activeTab === 'upload' && uploadFile) {
        res = await adminApi.retrainWithUpload(uploadFile, modelToTrain, includeBase, notes, token);
      } else {
        res = await adminApi.retrainModel({
          model_type: modelToTrain,
          include_base_data: includeBase,
          student_weight: studentWeight,
          notes: notes || undefined,
        }, token);
      }

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setProgress(100);
      setProgressMsg('Model finalized, saved to disk and hot-reloaded into production!');
      setRetrainResult(res);
      setTimeout(() => setRetrainStep('success'), 400);
      await loadData();
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setRetrainError(err.message || 'Retraining failed');
      setRetrainStep('error');
    }
  };

  // Run Candidate Benchmark
  const handleBenchmark = async () => {
    if (!token) return;
    setBenchmarkLoading(true);
    setBenchmarkError('');
    try {
      const res = await adminApi.compareModels({
        candidate_models: ['Ridge', 'RandomForest', 'GradientBoosting'],
        include_base_data: includeBase,
        student_weight: studentWeight,
      }, token);
      setBenchmarkResult(res);
    } catch (err: any) {
      setBenchmarkError(err.message || 'Failed to benchmark models');
    } finally {
      setBenchmarkLoading(false);
    }
  };

  // Activate Past Version
  const handleActivateVersion = async (version: string) => {
    if (!token) return;
    try {
      await adminApi.activateVersion(version, token);
      setActionMsg({ text: `Version ${version} is now active in production!`, type: 'success' });
      await loadData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Failed to activate version', type: 'error' });
    }
  };

  // Restore Initial Baseline
  const handleRestoreInitial = async () => {
    if (!token || !confirm('Restore the original baseline model? This will replace the active model.')) return;
    try {
      await adminApi.restoreModel(token);
      setActionMsg({ text: 'Initial baseline model successfully restored!', type: 'success' });
      await loadData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Restore failed', type: 'error' });
    }
  };

  // Import Actual Scores
  const handleScoreImport = async (file: File) => {
    if (!token) return;
    setScoreImportLoading(true);
    setScoreImportError('');
    setScoreImportResult(null);
    try {
      const res = await adminApi.importActualScores(file, token);
      setScoreImportResult(res);
      await loadData();
    } catch (err: any) {
      setScoreImportError(err.message || 'Failed to import scores');
    } finally {
      setScoreImportLoading(false);
    }
  };

  const resetRetraining = () => {
    setRetrainStep('idle');
    setProgress(0);
    setProgressMsg('');
    setRetrainResult(null);
    setRetrainError('');
  };

  // Feature Importance Data for Chart
  const featureChartData = (modelStatus?.featureImportance || []).slice(0, 9).map(f => ({
    name: f.name.replace(/_/g, ' '),
    importance: f.importance,
    coefficient: f.coefficient,
  }));

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 120, borderRadius: 20 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

      {/* ── Global Alert Banner ── */}
      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              padding: '12px 20px',
              borderRadius: 14,
              background: actionMsg.type === 'success' ? 'var(--risk-low-soft)' : 'var(--risk-high-soft)',
              color: actionMsg.type === 'success' ? 'var(--risk-low)' : 'var(--risk-high)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {actionMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
              <span>{actionMsg.text}</span>
            </div>
            <button onClick={() => setActionMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Production Header ── */}
      <header className="glass-card" style={{ padding: '28px 36px', borderRadius: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '5px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, marginBottom: 12 }}>
            <Server size={14} /> Production Model Engine • Live Hot-Reloading
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.1rem', fontWeight: 800, margin: 0, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            ML Model Management & Retraining
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.95rem' }}>
            Retrain your predictive engine with current student cohort data, benchmark regressors, and roll back versions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right', padding: '12px 20px', background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Model</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)', marginTop: 2 }}>
              <span>{modelStatus?.version || 'ridge-v1.0'}</span>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--risk-low)', boxShadow: '0 0 10px var(--risk-low)' }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>
              {modelStatus?.modelName || 'Ridge Pipeline'}
            </div>
          </div>

          <button
            id="refresh-model-status-btn"
            className="btn btn-ghost"
            onClick={loadData}
            title="Refresh status"
            style={{ borderRadius: 14, padding: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* ── KPI Bento Grid ── */}
      <div className="bento-grid">
        <motion.div className="tile glass-card span-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ borderRadius: 20 }}>
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} /> Mean Absolute Error
          </div>
          <div className="kpi-value" style={{ marginTop: 8 }}>
            {modelStatus?.metrics?.mae !== undefined ? modelStatus.metrics.mae.toFixed(2) : '—'}
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}> pts</span>
          </div>
          <div className="kpi-delta positive" style={{ marginTop: 8 }}>
            <CheckCircle size={14} /> Low error margin (Target &lt; 5.0)
          </div>
        </motion.div>

        <motion.div className="tile glass-card span-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ borderRadius: 20 }}>
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={18} /> Test R² Score
          </div>
          <div className="kpi-value" style={{ marginTop: 8 }}>
            {modelStatus?.metrics?.r2 !== undefined ? modelStatus.metrics.r2.toFixed(3) : '—'}
          </div>
          <div className="kpi-delta positive" style={{ marginTop: 8 }}>
            <TrendingUp size={14} /> High variance explained
          </div>
        </motion.div>

        <motion.div className="tile glass-card span-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ borderRadius: 20 }}>
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} /> Class Cohort Data
          </div>
          <div className="kpi-value" style={{ marginTop: 8 }}>
            {trainingPreview?.studentsWithResults !== undefined ? (
              <>
                <span style={{ color: 'var(--risk-low)' }}>{trainingPreview.studentsWithResults}</span>
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {' '}+ {trainingPreview.studentsWithPredicted} proxy
                </span>
              </>
            ) : '—'}
          </div>
          <div className="kpi-delta" style={{ marginTop: 8, color: 'var(--text-muted)' }}>
            {trainingPreview?.totalStudents || 0} total students registered
          </div>
        </motion.div>

        <motion.div className="tile glass-card span-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ borderRadius: 20 }}>
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={18} /> Total Training Pool
          </div>
          <div className="kpi-value" style={{ marginTop: 8 }}>
            {((trainingPreview?.baseDatasetSize || 0) + (trainingPreview?.studentsWithResults || 0) + (trainingPreview?.studentsWithPredicted || 0)).toLocaleString()}
          </div>
          <div className="kpi-delta" style={{ marginTop: 8, color: 'var(--accent)', fontWeight: 600 }}>
            <Sparkles size={14} /> {studentWeight}x Class student weight
          </div>
        </motion.div>
      </div>

      {/* ── Main Tab Navigation Bar ── */}
      <div className="glass-card" style={{ padding: 6, borderRadius: 18, display: 'flex', gap: 8, overflowX: 'auto' }}>
        {[
          { id: 'retrain', label: '⚡ Retrain from Class Data', icon: Zap },
          { id: 'benchmark', label: '🧪 Benchmark Candidates', icon: Award },
          { id: 'scores', label: '📝 Import Actual Exam Scores', icon: FileCheck },
          { id: 'upload', label: '📤 Train with CSV Dataset', icon: Upload },
          { id: 'history', label: `🕒 Version History (${history.length})`, icon: Clock },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => { setActiveTab(tab.id as ActiveTab); resetRetraining(); }}
              style={{
                flex: 1,
                minWidth: 160,
                padding: '12px 18px',
                borderRadius: 14,
                border: 'none',
                background: active ? 'linear-gradient(135deg, var(--accent), var(--accent-hover))' : 'transparent',
                color: active ? '#fff' : 'var(--text-muted)',
                fontWeight: active ? 700 : 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s',
                boxShadow: active ? '0 4px 14px rgba(13, 148, 136, 0.25)' : 'none',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 1: RETRAIN FROM CLASS DATA (PRIMARY WORKFLOW)
         ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'retrain' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Training Data Sourcing Panel */}
          <div className="glass-card" style={{ padding: 28, borderRadius: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Users size={22} style={{ color: 'var(--accent)' }} />
                  Class Student Training Data
                </h2>
                <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.88rem' }}>
                  Features are extracted from students' latest academic and behavioural check-ins. Actual exam marks are ground truth targets; predicted scores fill in proxy targets.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  id="toggle-student-roster-btn"
                  onClick={() => setShowRoster(!showRoster)}
                  style={{ padding: '8px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {showRoster ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showRoster ? 'Hide Roster' : `View Included Students (${trainingPreview?.studentRoster?.length || 0})`}
                </button>
                <button
                  id="toggle-feature-matrix-btn"
                  onClick={() => setShowFeatureMatrix(!showFeatureMatrix)}
                  style={{ padding: '8px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {showFeatureMatrix ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showFeatureMatrix ? 'Hide Feature Table' : 'Preview 11-Factor Matrix'}
                </button>
              </div>
            </div>

            {/* 4 Source Data Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div style={{ padding: '16px 20px', background: 'var(--surface-2)', borderRadius: 16, borderLeft: '4px solid var(--accent)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Students in Training Set</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                  {(trainingPreview?.studentsWithResults || 0) + (trainingPreview?.studentsWithPredicted || 0)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Ready with complete features</div>
              </div>

              <div style={{ padding: '16px 20px', background: 'var(--risk-low-soft)', borderRadius: 16, borderLeft: '4px solid var(--risk-low)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--risk-low)' }}>Verified Actual Exam Marks</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--risk-low)', marginTop: 4 }}>
                  {trainingPreview?.studentsWithResults || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Full ground truth quality</div>
              </div>

              <div style={{ padding: '16px 20px', background: 'var(--accent-soft)', borderRadius: 16, borderLeft: '4px solid var(--accent)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)' }}>Using Predicted Proxy Targets</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent)', marginTop: 4 }}>
                  {trainingPreview?.studentsWithPredicted || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Pending final examination results</div>
              </div>

              <div style={{ padding: '16px 20px', background: 'var(--surface-2)', borderRadius: 16, borderLeft: '4px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Historical Base Dataset</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                  {trainingPreview?.baseDatasetSize?.toLocaleString() || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>processed_students.csv</div>
              </div>
            </div>

            {/* Informational Callout */}
            {(trainingPreview?.studentsWithPredicted || 0) > 0 && (
              <div style={{ marginTop: 18, padding: '12px 18px', background: 'var(--accent-soft)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Info size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                  <strong>Note:</strong> {trainingPreview?.studentsWithPredicted} student(s) don't have actual exam results entered yet. Their predicted scores are acting as proxy targets. Upload actual scores in the <strong>"Import Actual Exam Scores"</strong> tab to maximize prediction precision.
                </div>
              </div>
            )}

            {/* Student Roster Preview (Expandable) */}
            <AnimatePresence>
              {showRoster && trainingPreview?.studentRoster && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginTop: 20 }}>
                  <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 14 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead style={{ position: 'sticky', top: 0, background: 'var(--surface-2)', zIndex: 1 }}>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '10px 14px' }}>Student</th>
                          <th style={{ padding: '10px 14px' }}>Real Attendance</th>
                          <th style={{ padding: '10px 14px' }}>Exam Mark</th>
                          <th style={{ padding: '10px 14px' }}>Teacher Observations</th>
                          <th style={{ padding: '10px 14px' }}>Parent Home Factors</th>
                          <th style={{ padding: '10px 14px' }}>Target Final Mark</th>
                          <th style={{ padding: '10px 14px' }}>Target Source</th>
                          <th style={{ padding: '10px 14px' }}>Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trainingPreview.studentRoster.map(s => (
                          <tr key={s.student_id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                              <div>{s.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {s.student_id} • {s.department}</div>
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text)' }}>
                              {s.attendance}%
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                              {s.previous_scores} / 100
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: '0.78rem', background: 'var(--accent-soft)', color: 'var(--accent)', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>
                                Mot: {s.motivation ?? 3}/5 • Peer: {s.peer_influence ?? 2}/3
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: '0.78rem', background: 'rgba(249, 115, 22, 0.1)', color: '#F97316', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>
                                Sleep: {s.sleep_hours ?? 7}h • Inv: {['Low','Med','High'][(s.parental_involvement || 2) - 1]}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--accent)' }}>
                              {s.target_score.toFixed(1)}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                padding: '3px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
                                background: s.has_actual ? 'var(--risk-low-soft)' : 'var(--accent-soft)',
                                color: s.has_actual ? 'var(--risk-low)' : 'var(--accent)',
                              }}>
                                {s.has_actual ? '✓ Actual Exam Result' : 'Proxy Predicted'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: s.has_actual ? 'var(--accent)' : 'inherit' }}>
                              {s.weight}x
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Feature Matrix Preview (Expandable) */}
            <AnimatePresence>
              {showFeatureMatrix && trainingPreview?.sampleData && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginTop: 20 }}>
                  <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 14 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      <thead style={{ position: 'sticky', top: 0, background: 'var(--surface-2)', zIndex: 1 }}>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Hours_Studied', 'Attendance', 'Previous_Scores', 'Tutoring_Sessions', 'Motivation_Level', 'Parental_Involvement', 'Peer_Influence', 'Sleep_Hours', 'Access_to_Resources', 'Teacher_Quality', 'Physical_Activity', 'Exam_Score'].map(col => (
                            <th key={col} style={{ padding: '8px 12px' }}>{col.replace(/_/g, ' ')}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trainingPreview.sampleData.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            {['Hours_Studied', 'Attendance', 'Previous_Scores', 'Tutoring_Sessions', 'Motivation_Level', 'Parental_Involvement', 'Peer_Influence', 'Sleep_Hours', 'Access_to_Resources', 'Teacher_Quality', 'Physical_Activity', 'Exam_Score'].map(col => (
                              <td key={col} style={{ padding: '8px 12px', fontWeight: col === 'Exam_Score' ? 700 : 400, color: col === 'Exam_Score' ? 'var(--accent)' : 'inherit' }}>
                                {typeof row[col] === 'number' ? row[col].toFixed(1) : row[col]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Training Configuration & Execution Hub */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Left Box: Controls */}
            <div className="glass-card" style={{ padding: 28, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={20} style={{ color: 'var(--accent)' }} /> Retraining Parameters
              </h3>

              {/* Sample Weight Slider */}
              <div style={{ background: 'var(--surface-2)', padding: '16px 20px', borderRadius: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label htmlFor="student-weight-slider" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>
                    Class Student Sample Weight Multiplier
                  </label>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 10px', borderRadius: 10 }}>
                    {studentWeight}x
                  </span>
                </div>
                <input
                  id="student-weight-slider"
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={studentWeight}
                  onChange={e => setStudentWeight(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent)' }}
                />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  Higher multiplier ensures the model adapts rapidly to your local student cohort rather than general population averages.
                </div>
              </div>

              {/* Training Data Origin Selector */}
              <div style={{ background: 'var(--surface-2)', padding: '16px 20px', borderRadius: 16 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  Training Data Origin
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    id="pure-class-mode-btn"
                    type="button"
                    onClick={() => setIncludeBase(false)}
                    style={{
                      padding: '12px 14px', borderRadius: 12, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                      border: !includeBase ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: !includeBase ? 'var(--accent-soft)' : 'var(--surface)',
                      color: 'var(--text)'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: !includeBase ? 'var(--accent)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🎓 Class Data Only</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.3 }}>
                      100% Real Enrolled Students from acadiq.db (0% base dataset)
                    </div>
                  </button>

                  <button
                    id="augmented-mode-btn"
                    type="button"
                    onClick={() => setIncludeBase(true)}
                    style={{
                      padding: '12px 14px', borderRadius: 12, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                      border: includeBase ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: includeBase ? 'var(--accent-soft)' : 'var(--surface)',
                      color: 'var(--text)'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: includeBase ? 'var(--accent)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🌐 Augmented Data</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.3 }}>
                      Class cohort weighted with 6,607 benchmark records
                    </div>
                  </button>
                </div>
                <div style={{ fontSize: '0.76rem', color: !includeBase ? 'var(--risk-low)' : 'var(--text-muted)', marginTop: 8, fontWeight: !includeBase ? 700 : 500 }}>
                  {!includeBase 
                    ? '✓ Verified: Model will fit strictly and exclusively on your live class student records.'
                    : 'Class student records are multiplied by the sample weight to prioritize your local cohort.'}
                </div>
              </div>

              {/* Algorithm Selection */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8, display: 'block' }}>
                  Choose Model Algorithm
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { id: 'Ridge', name: 'Ridge Regression', tag: 'Linear • L2 Regularized' },
                    { id: 'RandomForest', name: 'Random Forest', tag: 'Non-linear Tree Ensemble' },
                    { id: 'GradientBoosting', name: 'Gradient Boosting', tag: 'Sequential Tree Boost' },
                    { id: 'XGBoost', name: 'XGBoost', tag: 'Optimized Gradient Boost' },
                  ].map(m => (
                    <button
                      key={m.id}
                      id={`model-btn-${m.id}`}
                      onClick={() => setSelectedModel(m.id)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 14,
                        border: `2px solid ${selectedModel === m.id ? 'var(--accent)' : 'var(--border)'}`,
                        background: selectedModel === m.id ? 'var(--accent-soft)' : 'var(--surface-2)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: selectedModel === m.id ? 'var(--accent)' : 'var(--text)' }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{m.tag}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="training-notes-input" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
                  Training Notes (Optional)
                </label>
                <input
                  id="training-notes-input"
                  type="text"
                  placeholder="e.g., Post-Midterm Retrain with 10x class priority"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              {/* Start Button */}
              <button
                id="start-retrain-btn"
                onClick={() => handleRetrain()}
                disabled={retrainStep === 'training'}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  borderRadius: 16,
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  cursor: retrainStep === 'training' ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  boxShadow: '0 8px 24px rgba(13, 148, 136, 0.35)',
                  transition: 'all 0.2s',
                  marginTop: 4
                }}
              >
                <Brain size={22} />
                <span>Train, Evaluate & Hot-Reload Model</span>
              </button>
            </div>

            {/* Right Box: Live Progress or Status Visualizer */}
            <div className="glass-card" style={{ padding: 28, borderRadius: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <AnimatePresence mode="wait">

                {/* IDLE / READY STATE */}
                {retrainStep === 'idle' && (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Brain size={36} style={{ color: 'var(--accent)' }} />
                    </div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Ready to Retrain</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: 360, margin: '8px auto 20px' }}>
                      Click the button on the left to start retraining. The engine will train on student records, compute holdout validation metrics, and instantly update the production model without downtime.
                    </p>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--surface-2)', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      <Shield size={14} /> Full backup preserved automatically in <code>models/model_initial.pkl</code>
                    </div>
                  </motion.div>
                )}

                {/* TRAINING IN PROGRESS */}
                {retrainStep === 'training' && (
                  <motion.div key="training" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center', padding: '20px 0' }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                      style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid var(--border)', borderTopColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                    >
                      <Brain size={28} style={{ color: 'var(--accent)' }} />
                    </motion.div>

                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
                        Retraining with {selectedModel}...
                      </div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {progressMsg}
                      </div>
                    </div>

                    <div style={{ width: '100%', maxWidth: 380, margin: '0 auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6 }}>
                        <span>Progress</span>
                        <span style={{ color: 'var(--accent)' }}>{progress}%</span>
                      </div>
                      <div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 5, overflow: 'hidden' }}>
                        <motion.div
                          style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent-hover))', borderRadius: 5 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* SUCCESS COMPLETE */}
                {retrainStep === 'success' && retrainResult && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--risk-low-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                        <CheckCircle2 size={32} style={{ color: 'var(--risk-low)' }} />
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--risk-low)' }}>
                        Model Retrained & Activated!
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>
                        {retrainResult.version}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>MAE</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--risk-low)', marginTop: 2 }}>
                          {retrainResult.metrics.mae.toFixed(2)} pts
                        </div>
                      </div>
                      <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>R² Score</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--risk-low)', marginTop: 2 }}>
                          {retrainResult.metrics.r2.toFixed(3)}
                        </div>
                      </div>
                      <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Real MAE</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)', marginTop: 2 }}>
                          {retrainResult.metrics.real_mae !== null && retrainResult.metrics.real_mae !== undefined ? `${retrainResult.metrics.real_mae.toFixed(2)} pts` : '—'}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 12 }}>
                      <strong>Dataset Source:</strong> {retrainResult.source}<br />
                      <strong>Total Rows Trained:</strong> {retrainResult.samples.toLocaleString()}<br />
                      <strong>Updated Thresholds:</strong> High &lt; {retrainResult.thresholds.high_cutoff.toFixed(1)} | Low &ge; {retrainResult.thresholds.low_cutoff.toFixed(1)}
                    </div>

                    <button
                      onClick={resetRetraining}
                      style={{ padding: '12px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Done / Ready for Next Task
                    </button>
                  </motion.div>
                )}

                {/* ERROR STATE */}
                {retrainStep === 'error' && (
                  <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--risk-high-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <AlertTriangle size={30} style={{ color: 'var(--risk-high)' }} />
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--risk-high)', fontSize: '1.15rem' }}>Retraining Failed</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 6, padding: '10px 16px', background: 'var(--surface-2)', borderRadius: 12 }}>
                      {retrainError}
                    </div>
                    <button
                      onClick={resetRetraining}
                      style={{ marginTop: 16, padding: '10px 20px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Try Again
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 2: BENCHMARK CANDIDATE MODELS (STREAMLIT APP.PY FEATURE)
         ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'benchmark' && (
        <div className="glass-card" style={{ padding: 32, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Award size={24} style={{ color: 'var(--accent)' }} /> Candidate Model Benchmark & Comparison
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>
                Evaluates candidate regressors (Ridge, Random Forest, Gradient Boosting) side-by-side on your class data using 3-fold cross-validation and a 20% holdout test split.
              </p>
            </div>

            <button
              id="run-benchmark-btn"
              onClick={handleBenchmark}
              disabled={benchmarkLoading}
              style={{
                padding: '12px 24px',
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: benchmarkLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.25)'
              }}
            >
              {benchmarkLoading ? <RefreshCw className="spin" size={18} /> : <Zap size={18} />}
              <span>{benchmarkLoading ? 'Evaluating Candidates...' : 'Run Benchmark & Compare'}</span>
            </button>
          </div>

          {benchmarkError && (
            <div style={{ padding: '12px 18px', background: 'var(--risk-high-soft)', color: 'var(--risk-high)', borderRadius: 14, fontWeight: 600 }}>
              {benchmarkError}
            </div>
          )}

          {benchmarkResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Benchmark Summary Info */}
              <div style={{ padding: '12px 20px', background: 'var(--surface-2)', borderRadius: 14, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong>Benchmark Source:</strong> {benchmarkResult.source} •{' '}
                <strong>Weight:</strong> {benchmarkResult.studentWeight}x on class students
              </div>

              {/* Benchmark Comparison Table */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead style={{ background: 'var(--surface-2)' }}>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '14px 18px' }}>Model</th>
                      <th style={{ padding: '14px 18px' }}>CV R² (Train)</th>
                      <th style={{ padding: '14px 18px' }}>Test R²</th>
                      <th style={{ padding: '14px 18px' }}>Test MAE</th>
                      <th style={{ padding: '14px 18px' }}>Test RMSE</th>
                      <th style={{ padding: '14px 18px' }}>Real Student MAE</th>
                      <th style={{ padding: '14px 18px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarkResult.results.map(cand => (
                      <tr key={cand.model} style={{ borderBottom: '1px solid var(--border)', background: cand.is_best ? 'var(--accent-soft)' : 'transparent' }}>
                        <td style={{ padding: '14px 18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {cand.model}
                          {cand.is_best && (
                            <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>
                              ★ TOP PERFORMER
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 600 }}>{cand.cv_r2.toFixed(3)}</td>
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: cand.test_r2 > 0.65 ? 'var(--risk-low)' : 'var(--text)' }}>
                          {cand.test_r2.toFixed(3)}
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 600 }}>{cand.test_mae.toFixed(2)} pts</td>
                        <td style={{ padding: '14px 18px' }}>{cand.test_rmse.toFixed(2)}</td>
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--accent)' }}>
                          {cand.real_student_mae !== null ? `${cand.real_student_mae.toFixed(2)} pts (${cand.real_in_test} test)` : '—'}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <button
                            id={`activate-candidate-${cand.model}`}
                            onClick={() => handleRetrain(cand.model)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: 10,
                              border: 'none',
                              background: cand.is_best ? 'linear-gradient(135deg, var(--accent), var(--accent-hover))' : 'var(--surface)',
                              color: cand.is_best ? '#fff' : 'var(--text)',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              boxShadow: cand.is_best ? '0 2px 8px rgba(13, 148, 136, 0.3)' : 'var(--shadow-1)',
                              borderWidth: cand.is_best ? 0 : 1,
                              borderStyle: 'solid',
                              borderColor: 'var(--border)'
                            }}
                          >
                            Activate {cand.model}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Comparative Chart */}
              <div style={{ marginTop: 10 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Accuracy (R²) Comparison</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={benchmarkResult.results} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="model" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 600 }} />
                    <YAxis domain={[0, 1]} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }} />
                    <Bar dataKey="test_r2" name="Test R²" radius={[8, 8, 0, 0]}>
                      {benchmarkResult.results.map((entry, index) => (
                        <Cell key={index} fill={entry.is_best ? 'var(--accent)' : 'var(--accent-soft)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <Award size={44} style={{ color: 'var(--border)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>No Benchmark Executed Yet</div>
              <p style={{ maxWidth: 440, margin: '6px auto 16px', fontSize: '0.88rem' }}>
                Click "Run Benchmark & Compare" to evaluate Ridge, Random Forest, and Gradient Boosting simultaneously against your students.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 3: IMPORT ACTUAL EXAM SCORES (STREAMLIT APP.PY FEATURE)
         ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'scores' && (
        <div className="glass-card" style={{ padding: 32, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileCheck size={24} style={{ color: 'var(--risk-low)' }} /> Import Verified Final Exam Scores
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>
              Upload actual semester or board exam results to upgrade students from predicted proxies to 100% verified ground truth data for retraining.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Download Template Step */}
            <div style={{ padding: 24, background: 'var(--surface-2)', borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Download size={18} style={{ color: 'var(--accent)' }} /> Step 1: Download Class Roster CSV
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                This template is pre-populated with your currently enrolled student IDs, names, and usernames.
              </p>
              <div style={{ marginTop: 'auto' }}>
                <a
                  id="download-scores-template-btn"
                  href={token ? adminApi.getActualScoresTemplateUrl(token) : '#'}
                  download="actual_scores_template.csv"
                  className="btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 20px',
                    borderRadius: 12,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    color: 'var(--text)',
                    textDecoration: 'none'
                  }}
                >
                  <Download size={16} /> Download Pre-Filled CSV Template
                </a>
              </div>
            </div>

            {/* Upload Completed CSV */}
            <div style={{ padding: 24, background: 'var(--surface-2)', borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={18} style={{ color: 'var(--accent)' }} /> Step 2: Upload Filled Scores CSV
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Upload the CSV file with the actual marks filled in. The system will match students by ID, username, or name.
              </p>

              <input
                ref={scoreInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleScoreImport(f);
                }}
              />

              <div style={{ marginTop: 'auto' }}>
                <button
                  id="select-score-csv-btn"
                  onClick={() => scoreInputRef.current?.click()}
                  disabled={scoreImportLoading}
                  style={{
                    padding: '12px 20px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: scoreImportLoading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(13, 148, 136, 0.25)'
                  }}
                >
                  {scoreImportLoading ? <RefreshCw className="spin" size={16} /> : <Upload size={16} />}
                  <span>{scoreImportLoading ? 'Importing Scores...' : 'Select CSV to Upload'}</span>
                </button>
              </div>
            </div>
          </div>

          {scoreImportResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: 20, background: 'var(--risk-low-soft)', borderRadius: 16, border: '1px solid var(--risk-low)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, color: 'var(--risk-low)', fontSize: '1.05rem' }}>
                <CheckCircle2 size={20} /> Scores Successfully Attached!
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text)', marginTop: 8 }}>
                Imported: <strong>{scoreImportResult.imported}</strong> new records • Updated: <strong>{scoreImportResult.updated}</strong> existing records.
                Your class training set now contains more verified ground truth data for retraining!
              </div>
            </motion.div>
          )}

          {scoreImportError && (
            <div style={{ padding: 16, background: 'var(--risk-high-soft)', color: 'var(--risk-high)', borderRadius: 14, fontWeight: 600 }}>
              {scoreImportError}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 4: TRAIN WITH CSV DATASET
         ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'upload' && (
        <div className="glass-card" style={{ padding: 32, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Upload size={24} style={{ color: 'var(--accent)' }} /> Train with Uploaded CSV Dataset
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>
              Upload an external institutional dataset (.csv) containing features and actual exam scores.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
              <button
                id="select-dataset-csv-btn"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  height: 180,
                  borderRadius: 20,
                  border: `2px dashed ${uploadFile ? 'var(--accent)' : 'var(--border)'}`,
                  background: uploadFile ? 'var(--accent-soft)' : 'var(--surface-2)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  color: uploadFile ? 'var(--accent)' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                {uploadFile ? (
                  <>
                    <FileText size={36} />
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{uploadFile.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(uploadFile.size / 1024).toFixed(1)} KB • Click to choose another</div>
                  </>
                ) : (
                  <>
                    <Upload size={36} />
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>Click to Select CSV Dataset</div>
                    <div style={{ fontSize: '0.8rem' }}>Requires 11 features + 'Exam_Score' column</div>
                  </>
                )}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 6, display: 'block' }}>Algorithm</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Ridge', 'RandomForest', 'GradientBoosting'].map(m => (
                    <button
                      key={m}
                      onClick={() => setSelectedModel(m)}
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: 10,
                        border: `2px solid ${selectedModel === m ? 'var(--accent)' : 'var(--border)'}`,
                        background: selectedModel === m ? 'var(--accent-soft)' : 'var(--surface-2)',
                        color: selectedModel === m ? 'var(--accent)' : 'var(--text)',
                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 12 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Merge with base dataset ({trainingPreview?.baseDatasetSize} rows)</span>
                <input type="checkbox" checked={includeBase} onChange={e => setIncludeBase(e.target.checked)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} />
              </div>

              <button
                id="train-uploaded-csv-btn"
                onClick={() => handleRetrain()}
                disabled={!uploadFile || retrainStep === 'training'}
                style={{
                  marginTop: 'auto',
                  padding: '16px',
                  borderRadius: 14,
                  border: 'none',
                  background: !uploadFile ? 'var(--border)' : 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: !uploadFile ? 'not-allowed' : 'pointer'
                }}
              >
                Start Training with Uploaded CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 5: VERSION HISTORY & ROLLBACK (STREAMLIT APP.PY FEATURE)
         ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="glass-card" style={{ padding: 32, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={24} style={{ color: 'var(--accent)' }} /> Model Versions & Rollback Repository
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>
                Every retrain run is permanently archived. You can roll back or switch to any earlier version with one click.
              </p>
            </div>

            {trainingPreview?.hasInitialBackup && (
              <button
                id="restore-initial-baseline-btn"
                onClick={handleRestoreInitial}
                style={{
                  padding: '10px 18px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <RotateCcw size={16} /> Restore Initial Baseline Model
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              No training runs archived yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead style={{ background: 'var(--surface-2)' }}>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '14px 18px' }}>Version</th>
                    <th style={{ padding: '14px 18px' }}>Algorithm</th>
                    <th style={{ padding: '14px 18px' }}>Data Source</th>
                    <th style={{ padding: '14px 18px' }}>Samples</th>
                    <th style={{ padding: '14px 18px' }}>MAE</th>
                    <th style={{ padding: '14px 18px' }}>R²</th>
                    <th style={{ padding: '14px 18px' }}>Status</th>
                    <th style={{ padding: '14px 18px' }}>Trained Date</th>
                    <th style={{ padding: '14px 18px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(entry => {
                    const isActive = entry.status === 'active' || (modelStatus?.version && entry.version.includes(modelStatus.version));
                    return (
                      <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)', background: isActive ? 'var(--accent-soft)' : 'transparent' }}>
                        <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 700 }}>
                          {entry.version}
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 600 }}>{entry.model_name}</td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.source}>
                          {entry.source}
                        </td>
                        <td style={{ padding: '14px 18px' }}>{entry.n_samples?.toLocaleString() || '—'}</td>
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: entry.mae && entry.mae < 5 ? 'var(--risk-low)' : 'var(--text)' }}>
                          {entry.mae !== null ? `${entry.mae.toFixed(2)} pts` : '—'}
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: entry.r2 && entry.r2 > 0.7 ? 'var(--risk-low)' : 'var(--text)' }}>
                          {entry.r2 !== null ? entry.r2.toFixed(3) : '—'}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 800,
                            background: isActive ? 'var(--risk-low-soft)' : 'var(--surface-2)',
                            color: isActive ? 'var(--risk-low)' : 'var(--text-muted)'
                          }}>
                            {isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--risk-low)' }} />}
                            {isActive ? 'ACTIVE' : (entry.status || 'Archived').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          {!isActive && (
                            <button
                              id={`activate-version-${entry.version}`}
                              onClick={() => handleActivateVersion(entry.version)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: 10,
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                color: 'var(--text)',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              <RotateCcw size={12} /> Make Active
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Feature Importance & Risk Ranges ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 20 }}>
        {/* Feature Importance Chart */}
        <div className="glass-card" style={{ padding: 28, borderRadius: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={20} style={{ color: 'var(--accent)' }} /> Production Feature Importance
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 16px' }}>
            Weights assigned by the active production regressor across all 11 standardized predictors.
          </p>
          {featureChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={featureChartData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 110 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={110} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-3)' }}
                  formatter={(value: any) => [Number(value).toFixed(4), 'Relative Importance']}
                />
                <Bar dataKey="importance" radius={[0, 6, 6, 0]}>
                  {featureChartData.map((_, index) => (
                    <Cell key={index} fill={index < 3 ? 'var(--accent)' : 'var(--accent-soft)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No feature data available
            </div>
          )}
        </div>

        {/* Risk Thresholds & Model Intercept */}
        <div className="glass-card" style={{ padding: 28, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings2 size={20} style={{ color: 'var(--accent)' }} /> Production Risk Cut-Offs
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Automatically recomputed dynamically on the reference dataset whenever the model is retrained.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}>
            <div style={{ padding: '14px 18px', background: 'var(--risk-high-soft)', borderRadius: 14, borderLeft: '4px solid var(--risk-high)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--risk-high)', fontWeight: 700, textTransform: 'uppercase' }}>High Academic Risk Cut-Off</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--risk-high)', marginTop: 2 }}>
                {'<'} {modelStatus?.thresholds?.high?.toFixed(1) || '—'} marks
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Triggers immediate teacher intervention flag</div>
            </div>

            <div style={{ padding: '14px 18px', background: 'var(--risk-medium-soft)', borderRadius: 14, borderLeft: '4px solid var(--risk-medium)' }}>
              <div style={{ fontSize: '0.78rem', color: '#92400E', fontWeight: 700, textTransform: 'uppercase' }}>Medium Risk Band</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#92400E', marginTop: 2 }}>
                {modelStatus?.thresholds?.high?.toFixed(1) || '—'} – {modelStatus?.thresholds?.low?.toFixed(1) || '—'} marks
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Recommended for proactive check-in & tutoring</div>
            </div>

            <div style={{ padding: '14px 18px', background: 'var(--risk-low-soft)', borderRadius: 14, borderLeft: '4px solid var(--risk-low)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--risk-low)', fontWeight: 700, textTransform: 'uppercase' }}>Low Risk (On Track)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--risk-low)', marginTop: 2 }}>
                {'≥'} {modelStatus?.thresholds?.low?.toFixed(1) || '—'} marks
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Consistent performance meeting target standards</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
