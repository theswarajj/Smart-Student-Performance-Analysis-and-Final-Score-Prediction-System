import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { studentApi, predictionApi, type WhatIfResult, type CounterfactualResult } from '../../services/api';
import { factorLabels, formatScore, formatDelta } from '../../utils/helpers';
import { FlaskConical, Play, Target, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentWhatIf() {
  const { user } = useAuth();
  const [currentScore, setCurrentScore] = useState(0);
  const [changes, setChanges] = useState<Record<string, number>>({});
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [counterfactual, setCounterfactual] = useState<CounterfactualResult | null>(null);
  const [targetScore, setTargetScore] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [targetLoading, setTargetLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    studentApi.getSummary(user.id).then(s => {
      if (s.prediction) {
        setCurrentScore(s.prediction.predictedScore);
      }
    });
  }, [user]);

  const leverConfig = [
    { key: 'Attendance', label: 'Attendance (%)', min: 0, max: 100, step: 5, unit: '%' },
    { key: 'Hours_Studied', label: 'Study (hrs/week)', min: 0, max: 50, step: 1, unit: 'h' },
    { key: 'Motivation_Level', label: 'Motivation (0-2)', min: 0, max: 2, step: 1, unit: '' },
    { key: 'Physical_Activity', label: 'Exercise (hrs/week)', min: 0, max: 15, step: 1, unit: 'h' },
    { key: 'Sleep_Hours', label: 'Sleep (hrs/night)', min: 4, max: 12, step: 0.5, unit: 'h' },
  ];

  const handleSimulate = async () => {
    if (!user || Object.keys(changes).length === 0) return;
    setLoading(true);
    try {
      const res = await predictionApi.whatIf({ student_id: user.id, changes });
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTarget = async () => {
    if (!user) return;
    setTargetLoading(true);
    try {
      const res = await predictionApi.getCounterfactual(user.id, targetScore || undefined);
      setCounterfactual(res);
    } catch (e) {
      console.error(e);
    } finally {
      setTargetLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700 }}>What-If Lab</h2>
      <p style={{ color: 'var(--text-muted)' }}>Simulate how changes in your behaviour could affect your final score.</p>

      <div className="bento-grid">
        {/* Lab Simulator */}
        <div className="tile span-8">
          <div className="kpi-label" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FlaskConical size={18} /> Behaviour Simulator
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            {leverConfig.map(c => (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 140, fontSize: '0.85rem', fontWeight: 500 }}>{c.label}</div>
                <input type="range" className="slider" style={{ flex: 1 }}
                  min={c.min} max={c.max} step={c.step}
                  value={changes[c.key] !== undefined ? changes[c.key] : c.min}
                  onChange={e => setChanges({ ...changes, [c.key]: parseFloat(e.target.value) })}
                />
                <div style={{ width: 60, textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {changes[c.key] !== undefined ? `${changes[c.key]}${c.unit}` : 'N/A'}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={handleSimulate} disabled={loading || Object.keys(changes).length === 0}>
              {loading ? 'Simulating...' : <><Play size={16} /> Run Simulation</>}
            </button>
            <button className="btn btn-ghost" onClick={() => { setChanges({}); setResult(null); }}>Reset</button>
          </div>
          
          {result && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div>
                  <div className="kpi-label">Current</div>
                  <div className="kpi-value" style={{ fontSize: '1.8rem' }}>{formatScore(result.currentScore)}</div>
                </div>
                <ArrowRight className="text-muted" />
                <div>
                  <div className="kpi-label">Simulated</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="kpi-value" style={{ fontSize: '2.2rem', color: result.delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {formatScore(result.predictedScore)}
                    </div>
                    <div className={`badge ${result.delta >= 0 ? 'badge-risk-low' : 'badge-risk-high'}`}>
                      {formatDelta(result.delta)}
                    </div>
                  </div>
                </div>
              </div>
              {result.topLever && (
                <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  The biggest impact came from changing <strong>{factorLabels[result.topLever] || result.topLever}</strong> 
                  ({formatDelta(result.leverDeltas[result.topLever])}).
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Goal Seeker */}
        <div className="tile span-4" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>
          <div className="kpi-label" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
            <Target size={18} /> How to get an A?
          </div>
          <p style={{ fontSize: '0.85rem', marginBottom: 16, lineHeight: 1.5 }}>
            Want to reach a specific score? Tell us your goal, and we'll calculate the easiest way to get there.
          </p>
          <div className="input-group" style={{ marginBottom: 16 }}>
            <input type="number" className="input" placeholder="e.g. 85" value={targetScore} onChange={e => setTargetScore(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleTarget} disabled={targetLoading} style={{ width: '100%' }}>
            {targetLoading ? 'Calculating...' : 'Find the Path'}
          </button>

          {counterfactual && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 24 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>
                To reach {counterfactual.targetScore}, you need to:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {counterfactual.changes.map((c, i) => (
                  <div key={i} style={{ background: 'var(--surface)', padding: '8px 12px', borderRadius: 'var(--r-sm)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Increase <strong>{factorLabels[c.factor] || c.factor}</strong></span>
                    <span style={{ fontWeight: 600 }}>{c.from} ➔ {c.to}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
