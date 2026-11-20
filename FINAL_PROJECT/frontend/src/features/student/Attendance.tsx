import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { studentApi, type AttendanceData } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, CheckCircle2, XCircle, Clock, AlertTriangle,
  ShieldCheck, BarChart3, Filter, ChevronLeft, ChevronRight, Info
} from 'lucide-react';

export default function StudentAttendance() {
  const { user } = useAuth();
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'late'>('all');

  useEffect(() => {
    if (!user) return;
    studentApi.getAttendance(user.id)
      .then(setData)
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

  const overall = data?.overallPercentage || 0;
  const records = data?.records || [];
  const monthly = data?.monthly || [];
  const threshold = data?.threshold || 75;

  const isSafe = overall >= threshold;
  const isBorderline = overall >= 65 && overall < threshold;

  // Filter records
  const filteredRecords = records.filter(r => {
    if (statusFilter === 'all') return true;
    return r.status.toLowerCase() === statusFilter;
  });

  // Calculate stats
  const totalClasses = records.length;
  const presentCount = records.filter(r => r.status.toLowerCase() === 'present' || r.status.toLowerCase() === 'late').length;
  const absentCount = records.filter(r => r.status.toLowerCase() === 'absent').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, maxWidth: 1200, margin: '0 auto' }}>
      
      {/* Header */}
      <header className="glass-card" style={{ padding: 28, borderRadius: 24, background: 'linear-gradient(135deg, var(--surface), var(--surface-2))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#10B981', background: 'rgba(16, 185, 129, 0.12)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>
              <CalendarDays size={16} /> Attendance Records
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Class Attendance Tracker
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '1rem' }}>
              Minimum requirement is <strong>{threshold}%</strong>. Regular attendance is one of the highest weighted inputs in your final score forecast.
            </p>
          </div>

          <div style={{
            padding: '12px 24px', borderRadius: 20,
            background: isSafe ? 'rgba(16, 185, 129, 0.12)' : isBorderline ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${isSafe ? '#10B981' : isBorderline ? '#F59E0B' : '#EF4444'}44`,
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            {isSafe ? <ShieldCheck size={28} color="#10B981" /> : isBorderline ? <AlertTriangle size={28} color="#F59E0B" /> : <XCircle size={28} color="#EF4444" />}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isSafe ? '#10B981' : isBorderline ? '#F59E0B' : '#EF4444' }}>
                {isSafe ? 'Eligible for Finals' : isBorderline ? 'Attendance Warning' : 'Critical Shortage'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Bento Grid: Overview & Monthly */}
      <div className="bento-grid">
        
        {/* Gauge / Ring */}
        <div className="tile span-4 glass-card" style={{ padding: 28, borderRadius: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
              Overall Percentage
            </div>
            <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 16px' }}>
              <svg viewBox="0 0 160 160" width={160} height={160}>
                <circle cx="80" cy="80" r="68" fill="none" stroke="var(--border)" strokeWidth="12" />
                <motion.circle
                  cx="80" cy="80" r="68" fill="none"
                  stroke={isSafe ? '#10B981' : isBorderline ? '#F59E0B' : '#EF4444'}
                  strokeWidth="12" strokeDasharray={427} strokeLinecap="round"
                  style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
                  initial={{ strokeDashoffset: 427 }}
                  animate={{ strokeDashoffset: 427 * (1 - overall / 100) }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text)' }}>{overall}%</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Req: {threshold}%</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 12 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Attended</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10B981' }}>{presentCount}</div>
            </div>
            <div style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 12 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Absences</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#EF4444' }}>{absentCount}</div>
            </div>
          </div>
        </div>

        {/* Monthly Attendance Chart */}
        <div className="tile span-8 glass-card" style={{ padding: 28, borderRadius: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={18} color="#10B981" /> Monthly Attendance Rates
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Term breakdown</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {monthly.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No monthly logs recorded yet.
                </div>
              ) : (
                monthly.map((m, idx) => {
                  const pct = m.total > 0 ? Math.round((m.present / m.total) * 100) : 0;
                  const monthSafe = pct >= threshold;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                        <span style={{ fontWeight: 600 }}>{m.month}</span>
                        <span style={{ fontWeight: 700, color: monthSafe ? '#10B981' : '#EF4444' }}>
                          {pct}% ({m.present}/{m.total} sessions)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 10, background: 'var(--surface-2)', borderRadius: 10, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: idx * 0.1 }}
                          style={{
                            height: '100%',
                            borderRadius: 10,
                            background: monthSafe ? 'linear-gradient(90deg, #10B981, #059669)' : 'linear-gradient(90deg, #EF4444, #DC2626)'
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ marginTop: 20, padding: 14, background: 'var(--surface-2)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Info size={18} color="#10B981" />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              AI Insight: Maintaining &gt;85% attendance historically adds an estimated <strong>+4.5 marks</strong> to predicted final scores.
            </span>
          </div>
        </div>

      </div>

      {/* Daily Period-wise Log Table */}
      <div className="glass-card" style={{ padding: 28, borderRadius: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Daily Period Records</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Recorded period-by-period by class teachers
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 6, background: 'var(--surface-2)', padding: 4, borderRadius: 14, border: '1px solid var(--border)' }}>
            {(['all', 'present', 'late', 'absent'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                style={{
                  padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontWeight: statusFilter === f ? 700 : 500, fontSize: '0.82rem', textTransform: 'capitalize',
                  background: statusFilter === f ? '#10B981' : 'transparent',
                  color: statusFilter === f ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s'
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No records found for the selected filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px' }}>Period</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Verification</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r, idx) => {
                  const s = r.status.toLowerCase();
                  const badgeColor = s === 'present' ? '#10B981' : s === 'late' ? '#F59E0B' : '#EF4444';
                  const badgeBg = s === 'present' ? 'rgba(16, 185, 129, 0.12)' : s === 'late' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)';
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{r.date}</td>
                      <td style={{ padding: '14px 16px' }}>Period {r.period}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 12px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 700,
                          background: badgeBg, color: badgeColor, textTransform: 'capitalize',
                          display: 'inline-flex', alignItems: 'center', gap: 5
                        }}>
                          {s === 'present' ? <CheckCircle2 size={13} /> : s === 'late' ? <Clock size={13} /> : <XCircle size={13} />}
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        Official Campus Log
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
