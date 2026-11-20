import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { studentApi, type MarkEntry } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Award, TrendingUp, Filter, Sparkles,
  CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';

export default function StudentMarks() {
  const { user } = useAuth();
  const [marks, setMarks] = useState<MarkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [examTypeFilter, setExamTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    studentApi.getMarks(user.id)
      .then(setMarks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="bento-grid">
        <div className="tile span-12"><div className="skeleton" style={{ height: 400 }} /></div>
      </div>
    );
  }

  // Filter marks
  const filteredMarks = marks.filter(m => {
    if (examTypeFilter === 'all') return true;
    return m.exam_type?.toLowerCase() === examTypeFilter.toLowerCase();
  });

  // Calculate KPIs
  const scores = marks.map(m => m.actual_score);
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0';
  const highestScore = scores.length > 0 ? Math.max(...scores).toFixed(1) : '0';
  const lowestScore = scores.length > 0 ? Math.min(...scores).toFixed(1) : '0';

  const getGrade = (score: number) => {
    if (score >= 90) return { grade: 'A+', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
    if (score >= 80) return { grade: 'A', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' };
    if (score >= 70) return { grade: 'B', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' };
    if (score >= 60) return { grade: 'C', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' };
    if (score >= 50) return { grade: 'D', color: '#F97316', bg: 'rgba(249, 115, 22, 0.12)' };
    return { grade: 'F', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
  };

  const examTypes = ['all', ...Array.from(new Set(marks.map(m => m.exam_type).filter(Boolean)))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, maxWidth: 1200, margin: '0 auto' }}>
      
      {/* Header */}
      <header className="glass-card" style={{ padding: 28, borderRadius: 24, background: 'linear-gradient(135deg, var(--surface), var(--surface-2))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#10B981', background: 'rgba(16, 185, 129, 0.12)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>
              <BookOpen size={16} /> Examination Records
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Academic Marks & Exam Scores
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '1rem' }}>
              Detailed assessment breakdown across semester subjects, including actual scores vs. machine learning benchmarks.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ padding: '12px 20px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Average Score</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10B981' }}>{avgScore}%</div>
            </div>
            <div style={{ padding: '12px 20px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Peak Score</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6366F1' }}>{highestScore}%</div>
            </div>
            <div style={{ padding: '12px 20px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Exams</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)' }}>{marks.length}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Assessment Table Card */}
      <div className="glass-card" style={{ padding: 28, borderRadius: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Assessment Scorecard</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Verified subject examination entries entered by department faculty
            </p>
          </div>

          {/* Exam Type Filter */}
          <div style={{ display: 'flex', gap: 6, background: 'var(--surface-2)', padding: 4, borderRadius: 14, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {examTypes.map(t => (
              <button
                key={t}
                onClick={() => setExamTypeFilter(t)}
                style={{
                  padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontWeight: examTypeFilter === t ? 700 : 500, fontSize: '0.82rem', textTransform: 'capitalize',
                  background: examTypeFilter === t ? '#10B981' : 'transparent',
                  color: examTypeFilter === t ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s'
                }}>
                {t === 'all' ? 'All Assessments' : t}
              </button>
            ))}
          </div>
        </div>

        {filteredMarks.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Award size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <h4 style={{ margin: '0 0 6px', fontWeight: 700 }}>No Exam Records Found</h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Check back once department faculty enter test results.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.92rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 16px' }}>Subject Course</th>
                  <th style={{ padding: '14px 16px' }}>Assessment Type</th>
                  <th style={{ padding: '14px 16px' }}>Date</th>
                  <th style={{ padding: '14px 16px' }}>Score</th>
                  <th style={{ padding: '14px 16px' }}>Grade</th>
                  <th style={{ padding: '14px 16px' }}>AI Model Comparison</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarks.map((m, idx) => {
                  const g = getGrade(m.actual_score);
                  const predScore = m.predicted_score;
                  const delta = predScore !== undefined && predScore !== null ? Number((m.actual_score - predScore).toFixed(1)) : null;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px', fontWeight: 700, color: 'var(--text)' }}>
                        {m.subject || 'General Engineering Coursework'}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {m.exam_type || 'Examination'}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {m.date ? m.date.split('T')[0] : 'Current Term'}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
                            {m.actual_score}%
                          </span>
                          <div style={{ width: 60, height: 6, background: 'var(--surface-2)', borderRadius: 6, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, m.actual_score)}%`, height: '100%', background: g.color }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 12px', borderRadius: 10, fontWeight: 800, fontSize: '0.82rem',
                          background: g.bg, color: g.color
                        }}>
                          {g.grade}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {delta !== null ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: '0.82rem', fontWeight: 700,
                            color: delta >= 0 ? '#10B981' : '#EF4444'
                          }}>
                            {delta >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                            {delta >= 0 ? `+${delta}% vs Predicted` : `${delta}% vs Predicted`}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>On Benchmark</span>
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

    </div>
  );
}
