import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { parentApi, studentApi, type ChildInfo, type PerformanceData } from '../../services/api';
import { formatScore } from '../../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, Target, Activity, BarChart3,
  Lightbulb, ArrowUpRight, ArrowDownRight, Shield, Brain, Zap
} from 'lucide-react';

export default function ParentProgress() {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [perfLoading, setPerfLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    parentApi.getChildren(user.id).then(res => {
      setChildren(res);
      if (res.length > 0) setSelectedChildId(res[0].id);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!selectedChildId) return;
    setPerfLoading(true);
    studentApi.getPerformance(selectedChildId)
      .then(setPerformance)
      .catch(() => setPerformance(null))
      .finally(() => setPerfLoading(false));
  }, [selectedChildId]);

  if (loading) return (
    <div className="bento-grid"><div className="tile span-12"><div className="skeleton" style={{ height: 400, width: '100%' }} /></div></div>
  );

  const child = children.find(c => c.id === selectedChildId) || children[0];
  if (!child) return (
    <div className="empty-state" style={{ padding: 64, textAlign: 'center' }}>
      <TrendingUp size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
      <h3>No child linked</h3>
      <p style={{ color: 'var(--text-muted)' }}>Contact the admin to link your child's account.</p>
    </div>
  );

  const pred = child.prediction;
  const predictions = performance?.predictions || [];
  const results = performance?.results || [];
  const thresholds = performance?.thresholds || { high: 75, low: 50 };

  // Calculate trend from last 2 predictions
  const getTrend = () => {
    if (predictions.length < 2) return { direction: 'stable' as const, delta: 0 };
    const latest = predictions[predictions.length - 1].predicted_score;
    const prev = predictions[predictions.length - 2].predicted_score;
    const delta = latest - prev;
    if (delta > 2) return { direction: 'up' as const, delta };
    if (delta < -2) return { direction: 'down' as const, delta };
    return { direction: 'stable' as const, delta };
  };

  const trend = getTrend();

  const TrendIcon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;
  const trendColor = trend.direction === 'up' ? 'var(--risk-low)' : trend.direction === 'down' ? 'var(--risk-high)' : 'var(--text-muted)';

  // Factor impacts from prediction
  const factors = pred?.factors || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#F97316', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
            <BarChart3 size={16} /> Detailed Progress Report
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 700, margin: 0 }}>
            {child.name}'s Academic Progress
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.95rem' }}>
            Track ML predictions, actual results, and factor-level insights over time.
          </p>
        </div>

        {children.length > 1 && (
          <div style={{ display: 'flex', gap: 8, background: 'var(--surface-2)', padding: 4, borderRadius: 24, border: '1px solid var(--border)' }}>
            {children.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedChildId(c.id)}
                style={{
                  padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: selectedChildId === c.id ? 700 : 500,
                  background: selectedChildId === c.id ? '#F97316' : 'transparent',
                  color: selectedChildId === c.id ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s'
                }}>
                {c.name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}
      </header>

      <AnimatePresence mode="wait">
        <motion.div key={selectedChildId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* KPI Summary Row */}
          <div className="bento-grid">
            {/* Current Predicted Score */}
            <div className="tile span-3" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(249, 115, 22, 0.12)', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Predicted Score</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)' }}>
                  {pred ? formatScore(pred.predictedScore) : '—'}
                </div>
              </div>
            </div>

            {/* Trend */}
            <div className="tile span-3" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: trend.direction === 'up' ? 'rgba(16, 185, 129, 0.12)' : trend.direction === 'down' ? 'rgba(239, 68, 68, 0.12)' : 'var(--surface-2)', color: trendColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendIcon size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Score Trend</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: trendColor }}>
                  {trend.direction === 'up' ? `+${trend.delta.toFixed(1)}` : trend.direction === 'down' ? trend.delta.toFixed(1) : 'Stable'}
                </div>
              </div>
            </div>

            {/* Risk Level */}
            <div className="tile span-3" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: pred?.risk === 'High' ? 'rgba(239, 68, 68, 0.12)' : pred?.risk === 'Medium' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)', color: pred?.risk === 'High' ? 'var(--risk-high)' : pred?.risk === 'Medium' ? 'var(--risk-medium)' : 'var(--risk-low)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Risk Level</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: pred?.risk === 'High' ? 'var(--risk-high)' : pred?.risk === 'Medium' ? 'var(--risk-medium)' : 'var(--risk-low)' }}>
                  {pred?.risk || 'Unknown'}
                </div>
              </div>
            </div>

            {/* Exams Taken */}
            <div className="tile span-3" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Exams Recorded</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)' }}>
                  {results.length}
                </div>
              </div>
            </div>
          </div>

          {/* Prediction History Timeline */}
          <div className="glass-card" style={{ borderRadius: 24, padding: 32 }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={20} color="#F97316" /> Prediction History
            </h3>

            {perfLoading ? (
              <div className="skeleton" style={{ height: 200, width: '100%', borderRadius: 16 }} />
            ) : predictions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <Zap size={32} style={{ marginBottom: 12 }} />
                <p>No prediction history yet. Predictions will appear as teachers and parents submit observations.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Simple bar-style visualization */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 160, padding: '0 8px' }}>
                  {predictions.slice(-12).map((p, i) => {
                    const height = Math.max(10, (p.predicted_score / 100) * 140);
                    const risk = p.risk_level;
                    const barColor = risk === 'High' ? 'var(--risk-high)' : risk === 'Medium' ? 'var(--risk-medium)' : 'var(--risk-low)';
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text)' }}>
                          {p.predicted_score.toFixed(0)}
                        </span>
                        <motion.div
                          initial={{ height: 0 }} animate={{ height }}
                          transition={{ delay: i * 0.05, duration: 0.4 }}
                          style={{
                            width: '100%', maxWidth: 48, borderRadius: '8px 8px 4px 4px',
                            background: `linear-gradient(to top, ${barColor}, ${barColor}88)`,
                          }}
                        />
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                          {new Date(p.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
                  {[
                    { label: 'On Track', color: 'var(--risk-low)' },
                    { label: 'Caution', color: 'var(--risk-medium)' },
                    { label: 'At Risk', color: 'var(--risk-high)' }
                  ].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                      {l.label}
                    </div>
                  ))}
                </div>

                {/* Threshold annotations */}
                <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 4, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>🟢 Low-risk cutoff: ≥ {thresholds.high}</span>
                  <span>🔴 High-risk cutoff: ≤ {thresholds.low}</span>
                </div>
              </div>
            )}
          </div>

          {/* Predicted vs Actual Comparison */}
          {results.length > 0 && (
            <div className="glass-card" style={{ borderRadius: 24, padding: 32 }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={20} color="#F97316" /> Predicted vs Actual Scores
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {results.map((r, i) => {
                  const diff = r.actual_score - r.predicted_score;
                  const icon = diff > 0 ? <ArrowUpRight size={16} color="var(--risk-low)" /> : diff < 0 ? <ArrowDownRight size={16} color="var(--risk-high)" /> : <Minus size={16} />;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.subject || 'Exam'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.exam_type} • {new Date(r.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Predicted</div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)' }}>{r.predicted_score?.toFixed(1) ?? '—'}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Actual</div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{r.actual_score.toFixed(1)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 12, background: diff > 0 ? 'rgba(16, 185, 129, 0.1)' : diff < 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface)', fontSize: '0.85rem', fontWeight: 700, color: diff > 0 ? 'var(--risk-low)' : diff < 0 ? 'var(--risk-high)' : 'var(--text-muted)' }}>
                        {icon} {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Key Factor Impacts */}
          {factors.length > 0 && (
            <div className="glass-card" style={{ borderRadius: 24, padding: 32 }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lightbulb size={20} color="#F97316" /> What's Influencing the Score
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>
                These factors have the greatest impact on {child.name.split(' ')[0]}'s predicted performance.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {(factors as any[]).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 8).map((f, i) => {
                  const positive = f.impact > 0;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: positive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: positive ? 'var(--risk-low)' : 'var(--risk-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {positive ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', textTransform: 'capitalize' }}>
                          {f.name.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Value: {typeof f.value === 'number' ? f.value.toFixed(1) : f.value} • Impact: {positive ? '+' : ''}{f.impact.toFixed(2)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {pred?.recommendations && pred.recommendations.length > 0 && (
            <div className="glass-card" style={{ borderRadius: 24, padding: 32, background: 'linear-gradient(135deg, var(--surface), rgba(249, 115, 22, 0.04))' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={20} color="#F97316" /> AI Recommendations
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pred.recommendations.map((rec, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    style={{ display: 'flex', gap: 12, padding: 16, background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border)', alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(249, 115, 22, 0.12)', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--accent)', marginBottom: 4, textTransform: 'capitalize' }}>
                        {rec.factor.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5 }}>{rec.text}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
