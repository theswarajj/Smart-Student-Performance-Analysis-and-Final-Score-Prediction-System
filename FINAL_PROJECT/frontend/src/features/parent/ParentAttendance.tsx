import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { parentApi, studentApi, type ChildInfo, type AttendanceData } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Clock, CheckCircle2, XCircle, AlertTriangle,
  BarChart3, TrendingUp, Calendar
} from 'lucide-react';

export default function ParentAttendance() {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [attLoading, setAttLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    parentApi.getChildren(user.id).then(res => {
      setChildren(res);
      if (res.length > 0) setSelectedChildId(res[0].id);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!selectedChildId) return;
    setAttLoading(true);
    studentApi.getAttendance(selectedChildId)
      .then(setAttendance)
      .catch(() => setAttendance(null))
      .finally(() => setAttLoading(false));
  }, [selectedChildId]);

  if (loading) return (
    <div className="bento-grid"><div className="tile span-12"><div className="skeleton" style={{ height: 400, width: '100%' }} /></div></div>
  );

  const child = children.find(c => c.id === selectedChildId) || children[0];
  if (!child) return (
    <div className="empty-state" style={{ padding: 64, textAlign: 'center' }}>
      <CalendarDays size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
      <h3>No child linked</h3>
      <p style={{ color: 'var(--text-muted)' }}>Contact the admin to link your child's account.</p>
    </div>
  );

  const overall = attendance?.overallPercentage ?? child.attendance ?? 0;
  const threshold = attendance?.threshold ?? 75;
  const monthly = attendance?.monthly || [];
  const records = attendance?.records || [];

  // Group records by date
  const byDate: Record<string, typeof records> = {};
  records.forEach(r => {
    const d = r.date;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(r);
  });

  const dates = Object.keys(byDate).sort().reverse().slice(0, 20);

  const statusColor = overall >= threshold ? 'var(--risk-low)' : overall >= 60 ? 'var(--risk-medium)' : 'var(--risk-high)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#F97316', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
            <CalendarDays size={16} /> Attendance Records
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 700, margin: 0 }}>
            {child.name}'s Attendance
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.95rem' }}>
            7-period daily attendance tracked by class teachers.
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

          {/* KPI Summary */}
          <div className="bento-grid">
            {/* Overall Attendance */}
            <div className="tile span-4" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative', width: 72, height: 72 }}>
                <svg viewBox="0 0 36 36" style={{ width: 72, height: 72, transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={statusColor} strokeWidth="3"
                    strokeDasharray={`${(overall / 100) * 97.4} 97.4`}
                    strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                </svg>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem', color: statusColor }}>
                  {overall.toFixed(0)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Overall Attendance</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: statusColor }}>
                  {overall >= threshold ? 'On Track' : overall >= 60 ? 'Needs Improvement' : 'Critical'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Minimum: {threshold}%</div>
              </div>
            </div>

            {/* Total Periods */}
            <div className="tile span-4" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Periods Logged</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{records.length}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Across all dates</div>
              </div>
            </div>

            {/* Days Tracked */}
            <div className="tile span-4" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(249, 115, 22, 0.12)', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Days Tracked</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{Object.keys(byDate).length}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Unique school days</div>
              </div>
            </div>
          </div>

          {/* Monthly Summary Chart */}
          {monthly.length > 0 && (
            <div className="glass-card" style={{ borderRadius: 24, padding: 32 }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={20} color="#F97316" /> Monthly Attendance
              </h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 150, padding: '0 8px' }}>
                {monthly.map((m, i) => {
                  const pct = m.total > 0 ? (m.present / m.total) * 100 : 0;
                  const h = Math.max(8, (pct / 100) * 130);
                  const barColor = pct >= threshold ? 'var(--risk-low)' : pct >= 60 ? 'var(--risk-medium)' : 'var(--risk-high)';
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{pct.toFixed(0)}%</span>
                      <motion.div initial={{ height: 0 }} animate={{ height: h }} transition={{ delay: i * 0.06, duration: 0.4 }}
                        style={{ width: '100%', maxWidth: 56, borderRadius: '8px 8px 4px 4px', background: `linear-gradient(to top, ${barColor}, ${barColor}88)` }} />
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {new Date(m.month + '-01').toLocaleDateString('en-IN', { month: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Threshold line label */}
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                🟢 Above {threshold}% is on-track &nbsp; 🔴 Below {threshold}% triggers risk flag
              </div>
            </div>
          )}

          {/* Daily Period-wise Log */}
          <div className="glass-card" style={{ borderRadius: 24, padding: 32 }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={20} color="#F97316" /> Daily Period Log
            </h3>

            {attLoading ? (
              <div className="skeleton" style={{ height: 200, width: '100%', borderRadius: 16 }} />
            ) : dates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <CalendarDays size={32} style={{ marginBottom: 12 }} />
                <p>No attendance records found yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {dates.map((date, di) => {
                  const dayRecords = byDate[date];
                  const present = dayRecords.filter(r => r.status === 'present' || r.status === 'late').length;
                  const total = dayRecords.length;

                  return (
                    <motion.div key={date} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: di * 0.03 }}
                      style={{ padding: '14px 20px', background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: present === total ? 'var(--risk-low)' : present >= total / 2 ? 'var(--risk-medium)' : 'var(--risk-high)' }}>
                          {present}/{total} periods
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {dayRecords.sort((a, b) => a.period - b.period).map((r, ri) => {
                          const isPresent = r.status === 'present' || r.status === 'late';
                          return (
                            <div key={ri} title={`Period ${r.period}: ${r.status}`}
                              style={{
                                flex: 1, maxWidth: 52, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isPresent ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: isPresent ? 'var(--risk-low)' : 'var(--risk-high)',
                                border: `1px solid ${isPresent ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                                fontSize: '0.72rem', fontWeight: 700
                              }}>
                              {isPresent ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                              <span style={{ marginLeft: 3 }}>P{r.period}</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Attendance Impact Note */}
          <div style={{ padding: '16px 24px', background: 'rgba(249, 115, 22, 0.06)', borderRadius: 16, border: '1px solid rgba(249, 115, 22, 0.2)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <AlertTriangle size={20} color="#F97316" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5 }}>
              <strong>How attendance affects predictions:</strong> Attendance is a key input to the ML model. Consistent attendance above {threshold}% helps maintain a "Low Risk" status. Each missed period slightly reduces the predicted score and may trigger teacher interventions.
            </div>
          </div>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
