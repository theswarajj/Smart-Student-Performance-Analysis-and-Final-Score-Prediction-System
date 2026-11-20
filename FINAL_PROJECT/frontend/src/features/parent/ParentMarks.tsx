import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { parentApi, studentApi, type ChildInfo, type MarkEntry } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, GraduationCap, TrendingUp, TrendingDown, Minus,
  Award, BarChart3, FileText, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

export default function ParentMarks() {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [marks, setMarks] = useState<MarkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [marksLoading, setMarksLoading] = useState(false);
  const [filterExamType, setFilterExamType] = useState<string>('All');

  useEffect(() => {
    if (!user) return;
    parentApi.getChildren(user.id).then(res => {
      setChildren(res);
      if (res.length > 0) setSelectedChildId(res[0].id);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!selectedChildId) return;
    setMarksLoading(true);
    studentApi.getMarks(selectedChildId)
      .then(setMarks)
      .catch(() => setMarks([]))
      .finally(() => setMarksLoading(false));
  }, [selectedChildId]);

  if (loading) return (
    <div className="bento-grid"><div className="tile span-12"><div className="skeleton" style={{ height: 400, width: '100%' }} /></div></div>
  );

  const child = children.find(c => c.id === selectedChildId) || children[0];
  if (!child) return (
    <div className="empty-state" style={{ padding: 64, textAlign: 'center' }}>
      <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
      <h3>No child linked</h3>
      <p style={{ color: 'var(--text-muted)' }}>Contact the admin to link your child's account.</p>
    </div>
  );

  // Unique exam types
  const examTypes = ['All', ...Array.from(new Set(marks.map(m => m.exam_type).filter(Boolean)))];

  const filtered = filterExamType === 'All' ? marks : marks.filter(m => m.exam_type === filterExamType);

  // Stats
  const avgScore = filtered.length > 0 ? filtered.reduce((s, m) => s + m.actual_score, 0) / filtered.length : 0;
  const highestScore = filtered.length > 0 ? Math.max(...filtered.map(m => m.actual_score)) : 0;
  const lowestScore = filtered.length > 0 ? Math.min(...filtered.map(m => m.actual_score)) : 0;

  // Trend (compare last 2 marks)
  const getTrend = () => {
    if (filtered.length < 2) return { direction: 'stable' as const, delta: 0 };
    const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const delta = sorted[0].actual_score - sorted[1].actual_score;
    if (delta > 2) return { direction: 'up' as const, delta };
    if (delta < -2) return { direction: 'down' as const, delta };
    return { direction: 'stable' as const, delta };
  };
  const trend = getTrend();

  const getGrade = (score: number) => {
    if (score >= 90) return { letter: 'A+', color: '#10B981' };
    if (score >= 80) return { letter: 'A', color: '#10B981' };
    if (score >= 70) return { letter: 'B+', color: '#6366F1' };
    if (score >= 60) return { letter: 'B', color: '#3B82F6' };
    if (score >= 50) return { letter: 'C', color: '#F59E0B' };
    if (score >= 40) return { letter: 'D', color: '#F97316' };
    return { letter: 'F', color: '#EF4444' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#F97316', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
            <GraduationCap size={16} /> Exam Results
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 700, margin: 0 }}>
            {child.name}'s Marks
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.95rem' }}>
            All recorded exam scores and teacher-submitted marks.
          </p>
        </div>

        {children.length > 1 && (
          <div style={{ display: 'flex', gap: 8, background: 'var(--surface-2)', padding: 4, borderRadius: 24, border: '1px solid var(--border)' }}>
            {children.map(c => (
              <button key={c.id} onClick={() => setSelectedChildId(c.id)}
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

          {/* KPI Row */}
          <div className="bento-grid">
            <div className="tile span-3" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(249, 115, 22, 0.12)', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Average Score</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{avgScore.toFixed(1)}</div>
              </div>
            </div>

            <div className="tile span-3" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Highest Score</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10B981' }}>{highestScore.toFixed(1)}</div>
              </div>
            </div>

            <div className="tile span-3" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: trend.direction === 'up' ? 'rgba(16, 185, 129, 0.12)' : trend.direction === 'down' ? 'rgba(239, 68, 68, 0.12)' : 'var(--surface-2)', color: trend.direction === 'up' ? '#10B981' : trend.direction === 'down' ? '#EF4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {trend.direction === 'up' ? <TrendingUp size={24} /> : trend.direction === 'down' ? <TrendingDown size={24} /> : <Minus size={24} />}
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Latest Trend</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: trend.direction === 'up' ? '#10B981' : trend.direction === 'down' ? '#EF4444' : 'var(--text-muted)' }}>
                  {trend.direction === 'up' ? `+${trend.delta.toFixed(1)}` : trend.direction === 'down' ? trend.delta.toFixed(1) : 'Stable'}
                </div>
              </div>
            </div>

            <div className="tile span-3" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Exams</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{marks.length}</div>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {examTypes.map(et => (
              <button key={et} onClick={() => setFilterExamType(et)}
                style={{
                  padding: '6px 16px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer',
                  background: filterExamType === et ? '#F97316' : 'var(--surface)',
                  color: filterExamType === et ? '#fff' : 'var(--text-muted)',
                  fontWeight: filterExamType === et ? 700 : 500, fontSize: '0.85rem', transition: 'all 0.2s'
                }}>
                {et}
              </button>
            ))}
          </div>

          {/* Score Distribution Bars */}
          {filtered.length > 0 && (
            <div className="glass-card" style={{ borderRadius: 24, padding: 32 }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={20} color="#F97316" /> Score Timeline
              </h3>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 150, padding: '0 4px' }}>
                {[...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-15).map((m, i) => {
                  const h = Math.max(8, (m.actual_score / 100) * 130);
                  const grade = getGrade(m.actual_score);
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{m.actual_score.toFixed(0)}</span>
                      <motion.div initial={{ height: 0 }} animate={{ height: h }} transition={{ delay: i * 0.05, duration: 0.4 }}
                        style={{ width: '100%', maxWidth: 48, borderRadius: '8px 8px 4px 4px', background: `linear-gradient(to top, ${grade.color}, ${grade.color}88)` }} />
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                        {m.subject?.substring(0, 4) || 'Exam'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Marks Table */}
          <div className="glass-card" style={{ borderRadius: 24, padding: 32 }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <GraduationCap size={20} color="#F97316" /> Exam Results
            </h3>

            {marksLoading ? (
              <div className="skeleton" style={{ height: 200, width: '100%', borderRadius: 16 }} />
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <BookOpen size={32} style={{ marginBottom: 12 }} />
                <p>No exam results recorded yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                  <thead>
                    <tr>
                      {['Date', 'Subject', 'Exam Type', 'Score', 'Grade', 'ML Predicted', 'Gap'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 14px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m, i) => {
                      const grade = getGrade(m.actual_score);
                      const gap = m.predicted_score != null ? m.actual_score - m.predicted_score : null;
                      return (
                        <motion.tr key={m.id || i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                          style={{ background: 'var(--surface-2)', borderRadius: 14 }}>
                          <td style={{ padding: '12px 14px', borderRadius: '14px 0 0 14px', fontSize: '0.88rem' }}>
                            {new Date(m.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: '0.88rem' }}>{m.subject || '—'}</td>
                          <td style={{ padding: '12px 14px', fontSize: '0.88rem' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 10, background: 'var(--surface)', fontSize: '0.78rem', fontWeight: 600 }}>
                              {m.exam_type}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 800, fontSize: '1.05rem' }}>{m.actual_score.toFixed(1)}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, background: grade.color + '18', color: grade.color, fontWeight: 800, fontSize: '0.85rem' }}>
                              {grade.letter}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '0.88rem', color: 'var(--accent)' }}>
                            {m.predicted_score != null ? m.predicted_score.toFixed(1) : '—'}
                          </td>
                          <td style={{ padding: '12px 14px', borderRadius: '0 14px 14px 0' }}>
                            {gap != null ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: '0.85rem', color: gap > 0 ? '#10B981' : gap < 0 ? '#EF4444' : 'var(--text-muted)' }}>
                                {gap > 0 ? <ArrowUpRight size={14} /> : gap < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                                {gap > 0 ? '+' : ''}{gap.toFixed(1)}
                              </span>
                            ) : '—'}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
