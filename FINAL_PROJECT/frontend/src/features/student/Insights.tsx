import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { studentApi, goalApi, type InsightsData } from '../../services/api';
import { factorLabels, getRiskBadgeClass, getRiskIcon } from '../../utils/helpers';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from 'recharts';
import { Lightbulb, CheckCircle2, Info, PlusCircle } from 'lucide-react';

export default function StudentInsights() {
  const { user } = useAuth();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  // UI States
  const [showClassAvg, setShowClassAvg] = useState(true);
  const [showInfo, setShowInfo] = useState<string | null>(null);
  const [addingGoal, setAddingGoal] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    studentApi.getInsights(user.id).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  const handleAddToPlan = async (factor: string, recText: string, index: number) => {
    if (!user) return;
    setAddingGoal(index);
    try {
      await goalApi.create({
        student_id: user.id,
        title: `Focus on: ${factorLabels[factor] || factor}`,
        description: recText,
        factor: factor
      });
      alert('Goal added to your planner!');
    } catch (e) {
      console.error(e);
      alert('Failed to add goal');
    } finally {
      setAddingGoal(null);
    }
  };

  if (loading) return <div className="bento-grid">{[...Array(4)].map((_, i) => <div key={i} className="tile span-6"><div className="skeleton" style={{ height: 300, width: '100%' }} /></div>)}</div>;
  if (!data) return <div className="empty-state" style={{ padding: 64, textAlign: 'center' }}><Lightbulb size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} /><h3 style={{ margin: '0 0 8px' }}>No insights yet</h3><p style={{ color: 'var(--text-muted)', margin: 0 }}>Complete a check-in to see your personalised insights.</p></div>;

  const impactData = data.factorImpacts.map(f => ({ name: factorLabels[f.name] || f.name, impact: f.impact, value: f.value }));
  const radarData = Object.entries(data.radarData).map(([k, v]) => ({
    subject: k, student: v, classAvg: data.classAverage[k] || 0,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32 }}>
      <header>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 700, margin: 0 }}>Insights</h2>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>Deep dive into what's driving your predicted score.</p>
      </header>

      {/* Explanation Panel */}
      <motion.div className="tile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 16, background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
        <div style={{ fontSize: '2rem', padding: 8, background: 'var(--surface)', borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          {getRiskIcon(data.risk)}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>Predicted Score: {data.predictedScore}</span>
            <span className={getRiskBadgeClass(data.risk)} style={{ fontSize: '0.8rem', padding: '2px 8px' }}>{data.risk} Risk</span>
          </div>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            {data.explanation}
          </p>
        </div>
      </motion.div>

      <div className="bento-grid">
        {/* Factor Impact Bars */}
        <motion.div className="tile span-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ position: 'relative' }}>
          <div className="kpi-label" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            Factor Impact
            <div style={{ position: 'relative' }} onMouseEnter={() => setShowInfo('impact')} onMouseLeave={() => setShowInfo(null)}>
              <Info size={14} color="var(--text-muted)" style={{ cursor: 'help' }} />
              {showInfo === 'impact' && (
                <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border)', width: 250, zIndex: 10, fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text)' }}>
                  <strong>Impact</strong> shows how many marks each factor adds or subtracts from your score compared to an average student. Green helps, red hurts.
                </div>
              )}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={impactData} layout="vertical" margin={{ left: 100, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={95} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: any) => [`${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(1)} marks`, 'Impact']} cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="impact" radius={[0, 4, 4, 0]} animationDuration={800}>
                {impactData.map((entry, i) => (
                  <Cell key={i} fill={entry.impact >= 0 ? 'var(--risk-low)' : 'var(--risk-high)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Behaviour Radar */}
        <motion.div className="tile span-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="kpi-label">Behavioural Profile</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={showClassAvg} onChange={e => setShowClassAvg(e.target.checked)} />
              Compare with Class Average
            </label>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <PolarRadiusAxis angle={30} domain={[0, 3]} tick={{ fontSize: 10 }} />
              <Radar name="You" dataKey="student" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.3} animationDuration={800} />
              {showClassAvg && Object.keys(data.classAverage).length > 0 && (
                <Radar name="Class Avg" dataKey="classAvg" stroke="var(--text-muted)" fill="var(--text-muted)" fillOpacity={0.1} strokeDasharray="4 4" />
              )}
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recommendations */}
        <motion.div className="tile span-12" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="kpi-label" style={{ marginBottom: 16 }}>Weak Areas & Recommended Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.recommendations.map((rec, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '16px 20px',
                background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)'
                  }}>
                    {rec.priority}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>{factorLabels[rec.factor] || rec.factor}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{rec.text}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleAddToPlan(rec.factor, rec.text, i)}
                  disabled={addingGoal === i}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <PlusCircle size={14} />
                  {addingGoal === i ? 'Adding...' : 'Add to my plan'}
                </button>
              </div>
            ))}
          </div>
          {data.recommendations.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--risk-low)', background: 'var(--risk-low-soft)', borderRadius: 12 }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 8px' }}>On Track!</h3>
              <p style={{ margin: 0, color: 'var(--text)' }}>No major weak areas found. Keep up the great work!</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
