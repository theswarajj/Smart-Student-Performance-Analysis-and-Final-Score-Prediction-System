import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { studentApi, goalApi, type StudentSummary, type Goal } from '../../services/api';
import { formatScore, formatDelta, getRiskBadgeClass, getRiskIcon, factorLabels } from '../../utils/helpers';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ArrowRight, FlaskConical, Target, Info, CheckCircle2 } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [trendData, setTrendData] = useState<{date:string;score:number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      studentApi.getSummary(user.id),
      goalApi.getAll(user.id),
      studentApi.getPerformance(user.id),
    ]).then(([s, g, p]) => {
      setSummary(s);
      setGoals(g);
      setTrendData(p.predictions.map(pr => ({
        date: pr.date.split(' ')[0].slice(5),
        score: pr.predicted_score,
      })));
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="bento-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`tile span-${i < 3 ? 4 : i < 5 ? 6 : 12}`}>
            <div className="skeleton" style={{ height: i < 3 ? 160 : 200, borderRadius: 8 }} />
          </div>
        ))}
      </div>
    );
  }

  if (!summary) return <div className="empty-state"><h3>No data yet</h3><p>Complete your first check-in to see predictions.</p><button className="btn btn-primary" onClick={() => navigate('/student/check-in')}>Start Check-in</button></div>;

  const pred = summary.prediction;
  const goalsCompleted = goals.filter(g => g.is_completed).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700 }}>Dashboard</h2>

      <div className="bento-grid">
        {/* Score Gauge */}
        <motion.div className="tile span-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div className="kpi-label" style={{ marginBottom: 8 }}>Predicted Score</div>
            <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
              <svg viewBox="0 0 140 140" width={140} height={140}>
                <circle cx="70" cy="70" r="58" fill="none" stroke="var(--border)" strokeWidth="10" />
                <motion.circle cx="70" cy="70" r="58" fill="none"
                  stroke={pred ? (pred.risk === 'High' ? 'var(--risk-high)' : pred.risk === 'Medium' ? 'var(--risk-medium)' : 'var(--risk-low)') : 'var(--border)'}
                  strokeWidth="10" strokeDasharray={364} strokeLinecap="round"
                  style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
                  initial={{ strokeDashoffset: 364 }}
                  animate={{ strokeDashoffset: pred ? 364 * (1 - pred.predictedScore / 100) : 364 }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <motion.span className="kpi-value" style={{ fontSize: '2.2rem' }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  {pred ? formatScore(pred.predictedScore) : '—'}
                </motion.span>
                {pred && <span className="kpi-label">/ 100</span>}
              </div>
            </div>
            {pred && (
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
                <span className="kpi-label">Range: {pred.interval[0]} – {pred.interval[1]}</span>
                {pred.delta !== 0 && (
                  <span className={`kpi-delta ${pred.delta > 0 ? 'positive' : 'negative'}`}>
                    {formatDelta(pred.delta)}
                  </span>
                )}
              </div>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/student/what-if')} style={{ marginTop: 12 }}>
              <FlaskConical size={14} /> Open What-If Lab
            </button>
          </div>
        </motion.div>

        {/* Risk Tile */}
        <motion.div className="tile span-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="kpi-label" style={{ marginBottom: 8 }}>Risk Level</div>
          {pred ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: '1.8rem' }}>{getRiskIcon(pred.risk)}</span>
                <span className={getRiskBadgeClass(pred.risk)} style={{ fontSize: '1rem', padding: '4px 12px' }}>
                  {pred.risk}
                </span>
              </div>
              {pred.recommendations.length > 0 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  "{pred.factors.filter(f => f.impact < 0).slice(0, 2).map(f => factorLabels[f.name] || f.name).join(' and ')} are the main areas to improve"
                </p>
              )}
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/student/insights')}>
                <Info size={14} /> Why this score?
              </button>
            </>
          ) : <p className="text-muted">Complete a check-in first</p>}
        </motion.div>

        {/* Weekly Goals */}
        <motion.div className="tile span-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="kpi-label" style={{ marginBottom: 8 }}>Weekly Goals</div>
          <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 12px' }}>
            <svg viewBox="0 0 100 100" width={100} height={100}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
              <motion.circle cx="50" cy="50" r="42" fill="none" stroke="var(--accent)" strokeWidth="8"
                strokeDasharray={264} strokeLinecap="round"
                style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
                initial={{ strokeDashoffset: 264 }}
                animate={{ strokeDashoffset: goals.length > 0 ? 264 * (1 - goalsCompleted / goals.length) : 264 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>{goalsCompleted}/{goals.length || 0}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/student/planner')}>
            <Target size={14} /> View goals
          </button>
        </motion.div>

        {/* Trend Chart */}
        <motion.div className="tile span-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="kpi-label" style={{ marginBottom: 12 }}>Predicted Score Trend</div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <ReferenceLine y={65} stroke="var(--risk-high)" strokeDasharray="3 3" label={{ value: 'High', position: 'left', fontSize: 10 }} />
                <ReferenceLine y={69.5} stroke="var(--risk-low)" strokeDasharray="3 3" label={{ value: 'Low', position: 'left', fontSize: 10 }} />
                <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2.5}
                  dot={{ fill: 'var(--accent)', r: 4 }} animationDuration={1000} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-muted">Need at least 2 check-ins to show trends</p>}
        </motion.div>

        {/* Top 3 Actions */}
        <motion.div className="tile span-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="kpi-label" style={{ marginBottom: 12 }}>Top Actions</div>
          {pred && pred.recommendations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pred.recommendations.slice(0, 3).map((rec, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{factorLabels[rec.factor] || rec.factor}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rec.text}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-muted">No recommendations right now</p>}
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/student/insights')}>
            See all <ArrowRight size={14} />
          </button>
        </motion.div>
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
        🛡️ Predictions are meant to support students, not to label them.
      </p>
    </div>
  );
}
