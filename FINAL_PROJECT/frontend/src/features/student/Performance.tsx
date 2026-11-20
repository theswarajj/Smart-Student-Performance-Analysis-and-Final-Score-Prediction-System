import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { studentApi, type PerformanceData, type StudentSummary } from '../../services/api';
import { formatScore, formatDelta, getRiskBadgeClass, getRiskIcon, factorLabels } from '../../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, TrendingDown, Target, Activity, Shield,
  Brain, ArrowUpRight, ArrowDownRight, Award, Sparkles, CheckCircle2,
  Calendar, Layers, Zap
} from 'lucide-react';

export default function StudentPerformance() {
  const { user } = useAuth();
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      studentApi.getPerformance(user.id),
      studentApi.getSummary(user.id),
    ]).then(([p, s]) => {
      setPerformance(p);
      setSummary(s);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="bento-grid">
        <div className="tile span-12"><div className="skeleton" style={{ height: 420 }} /></div>
      </div>
    );
  }

  const predictions = performance?.predictions || [];
  const results = performance?.results || [];
  const academic = performance?.academic || [];
  const thresholds = performance?.thresholds || { high: 75, low: 50 };
  const pred = summary?.prediction;

  // Chart data: merge predictions and actual results chronologically
  const chartData = predictions.map(p => {
    const dStr = p.date.split(' ')[0];
    const matchRes = results.find(r => r.date.startsWith(dStr));
    return {
      date: dStr.slice(5),
      fullDate: dStr,
      predicted: p.predicted_score,
      actual: matchRes ? matchRes.actual_score : null,
      low: p.confidence_low,
      high: p.confidence_high,
    };
  });

  // Calculate overall performance delta
  const getOverallDelta = () => {
    if (predictions.length < 2) return 0;
    const latest = predictions[predictions.length - 1].predicted_score;
    const first = predictions[0].predicted_score;
    return Number((latest - first).toFixed(1));
  };

  const delta = getOverallDelta();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, maxWidth: 1200, margin: '0 auto' }}>
      
      {/* Page Header */}
      <header className="glass-card" style={{ padding: 28, borderRadius: 24, background: 'linear-gradient(135deg, var(--surface), var(--surface-2))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#10B981', background: 'rgba(16, 185, 129, 0.12)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>
              <TrendingUp size={16} /> Performance Analytics & History
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Academic Performance Trajectory
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '1rem' }}>
              Track how your daily study habits, attendance, and quiz results guide machine learning final score projections.
            </p>
          </div>

          {pred && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ padding: '12px 20px', borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Current Prediction</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10B981' }}>{formatScore(pred.predictedScore)}%</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Range: {pred.interval[0]}% – {pred.interval[1]}%</div>
              </div>
              <div style={{ padding: '12px 20px', borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Overall Progress</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: delta >= 0 ? '#10B981' : 'var(--risk-high)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  {delta >= 0 ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />} {delta >= 0 ? `+${delta}%` : `${delta}%`}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Since start of semester</div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Trajectory Timeline Chart */}
      <div className="glass-card" style={{ padding: 28, borderRadius: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color="#10B981" /> Score Progression & Confidence Band
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Blue line shows ML predicted trajectory; green dots represent recorded exam marks.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 3, background: '#10B981', borderRadius: 2 }} /> Predicted Score
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366F1' }} /> Actual Exam
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 1, borderTop: '2px dashed var(--risk-low)' }} /> Safe Cutoff (75%)
            </span>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            No prediction history recorded yet. Complete regular check-ins to track your curve!
          </div>
        ) : (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <YAxis domain={[40, 100]} stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="glass-card" style={{ padding: 12, borderRadius: 12, fontSize: '0.85rem', border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>Date: {d.fullDate}</div>
                        <div style={{ color: '#10B981' }}>Predicted Score: <strong>{d.predicted}%</strong></div>
                        {d.actual !== null && (
                          <div style={{ color: '#6366F1' }}>Actual Exam: <strong>{d.actual}%</strong></div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          Expected Range: {d.low}% – {d.high}%
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={thresholds.high} stroke="var(--risk-low)" strokeDasharray="4 4" label={{ value: 'Target 75%', fill: 'var(--risk-low)', fontSize: 11 }} />
                <ReferenceLine y={thresholds.low} stroke="var(--risk-high)" strokeDasharray="4 4" label={{ value: 'Risk 50%', fill: 'var(--risk-high)', fontSize: 11 }} />
                <Line type="monotone" dataKey="predicted" stroke="#10B981" strokeWidth={3} dot={{ r: 5, fill: '#10B981' }} activeDot={{ r: 8 }} />
                {results.length > 0 && (
                  <Line type="monotone" dataKey="actual" stroke="#6366F1" strokeWidth={2} dot={{ r: 6, fill: '#6366F1' }} connectNulls />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Grid: Key Drivers & Exam History */}
      <div className="bento-grid">
        
        {/* ML Factor Impacts */}
        <div className="tile span-7 glass-card" style={{ padding: 24, borderRadius: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={18} color="#10B981" /> Top AI Factor Drivers
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>
            Features contributing most strongly to your projected grade in the ML Ridge Regression pipeline:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(pred?.factors || []).map((f: any, idx: number) => {
              const isPositive = f.impact >= 0;
              return (
                <div key={idx} style={{ padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isPositive ? 'var(--risk-low)' : 'var(--risk-high)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{factorLabels[f.name] || f.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recorded Value: {f.value}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: isPositive ? 'var(--risk-low)' : 'var(--risk-high)' }}>
                    {isPositive ? `+${f.impact}` : f.impact} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Personalized Recommendations */}
        <div className="tile span-5 glass-card" style={{ padding: 24, borderRadius: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#F59E0B" /> Targeted Improvement Tips
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(pred?.recommendations && pred.recommendations.length > 0) ? (
                pred.recommendations.map((rec: any, idx: number) => (
                  <div key={idx} style={{ padding: 14, borderRadius: 14, background: 'var(--surface-2)', borderLeft: '4px solid #F59E0B' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', marginBottom: 4 }}>
                      Priority {rec.priority || idx + 1}: {factorLabels[rec.factor] || rec.factor}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5 }}>
                      {rec.text}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <CheckCircle2 size={32} color="#10B981" style={{ margin: '0 auto 8px' }} />
                  <div>All key metrics are in healthy bands! Keep maintaining this routine.</div>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            💡 Updating your daily check-in recomputes your model projection in real-time.
          </div>
        </div>

      </div>

    </div>
  );
}
