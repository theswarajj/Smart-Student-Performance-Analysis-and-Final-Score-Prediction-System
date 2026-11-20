import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { parentApi, studentApi, type ChildInfo, type TimetableEntry } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Calendar, MapPin, User, BookOpen, Layers,
  ShieldCheck, Info, CheckCircle, GraduationCap
} from 'lucide-react';

const DAYS = [
  { day: 1, label: 'Monday', short: 'Mon' },
  { day: 2, label: 'Tuesday', short: 'Tue' },
  { day: 3, label: 'Wednesday', short: 'Wed' },
  { day: 4, label: 'Thursday', short: 'Thu' },
  { day: 5, label: 'Friday', short: 'Fri' },
];

export default function ParentTimetable() {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [slots, setSlots] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const todayDayNum = new Date().getDay();
  const initialDay = (todayDayNum >= 1 && todayDayNum <= 5) ? todayDayNum : 1;
  const [activeDay, setActiveDay] = useState<number>(initialDay);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  useEffect(() => {
    if (!user) return;
    parentApi.getChildren(user.id).then(res => {
      setChildren(res);
      if (res.length > 0) {
        setSelectedChildId(res[0].id);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!selectedChildId) return;
    studentApi.getTimetable(selectedChildId)
      .then(setSlots)
      .catch(console.error);
  }, [selectedChildId]);

  if (loading) {
    return (
      <div className="bento-grid">
        <div className="tile span-12"><div className="skeleton" style={{ height: 420 }} /></div>
      </div>
    );
  }

  const child = children.find(c => c.id === selectedChildId) || children[0];

  const dayEntries = slots
    .filter(s => s.day_of_week === activeDay)
    .sort((a, b) => a.period - b.period);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, maxWidth: 1200, margin: '0 auto' }}>
      
      {/* Header */}
      <header className="glass-card" style={{ padding: 28, borderRadius: 24, background: 'linear-gradient(135deg, var(--surface), var(--surface-2))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#F97316', background: 'rgba(249, 115, 22, 0.12)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>
              <Clock size={16} /> Daily Class Timetable
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              {child?.name || "Student"}'s Class Timetable
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '1rem' }}>
              Class: <strong>{child?.class_name || 'Enrolled Class'}</strong> • Class Advisor: <strong>{child?.teacher_name || 'Class Advisor'}</strong>
            </p>
          </div>

          <div style={{
            padding: '12px 18px', borderRadius: 16, background: 'var(--surface-2)',
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10
          }}>
            <ShieldCheck size={20} color="#6366F1" />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Official schedule issued by <strong>Administration</strong>
            </div>
          </div>
        </div>
      </header>

      {/* Child Switcher & View Mode */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        {children.length > 1 ? (
          <div style={{ display: 'flex', gap: 8, background: 'var(--surface-2)', padding: 4, borderRadius: 20, border: '1px solid var(--border)' }}>
            {children.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedChildId(c.id)}
                style={{
                  padding: '8px 18px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  fontWeight: selectedChildId === c.id ? 700 : 500, fontSize: '0.88rem',
                  background: selectedChildId === c.id ? '#F97316' : 'transparent',
                  color: selectedChildId === c.id ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}>
                {c.name}
              </button>
            ))}
          </div>
        ) : <div />}

        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
          <button
            onClick={() => setViewMode('day')}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: viewMode === 'day' ? 700 : 500, fontSize: '0.82rem',
              background: viewMode === 'day' ? '#F97316' : 'transparent',
              color: viewMode === 'day' ? '#fff' : 'var(--text-muted)'
            }}>
            Day View
          </button>
          <button
            onClick={() => setViewMode('week')}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: viewMode === 'week' ? 700 : 500, fontSize: '0.82rem',
              background: viewMode === 'week' ? '#F97316' : 'transparent',
              color: viewMode === 'week' ? '#fff' : 'var(--text-muted)'
            }}>
            Full Week Matrix
          </button>
        </div>
      </div>

      {/* DAY VIEW */}
      {viewMode === 'day' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Day Pills */}
          <div style={{ display: 'flex', gap: 8, background: 'var(--surface-2)', padding: 6, borderRadius: 18, border: '1px solid var(--border)', overflowX: 'auto' }}>
            {DAYS.map(d => {
              const count = slots.filter(s => s.day_of_week === d.day).length;
              const isToday = d.day === todayDayNum;
              const isSelected = activeDay === d.day;
              return (
                <button
                  key={d.day}
                  onClick={() => setActiveDay(d.day)}
                  style={{
                    flex: 1, minWidth: 120, padding: '12px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: isSelected ? '#F97316' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--text)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    transition: 'all 0.2s'
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{d.label}</span>
                    {isToday && (
                      <span style={{
                        fontSize: '0.65rem', padding: '1px 6px', borderRadius: 6,
                        background: isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(249, 115, 22, 0.15)',
                        color: isSelected ? '#fff' : '#F97316', fontWeight: 800
                      }}>
                        Today
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', opacity: isSelected ? 0.9 : 0.6 }}>
                    {count} {count === 1 ? 'Period' : 'Periods'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Periods List */}
          {dayEntries.length === 0 ? (
            <div className="glass-card" style={{ padding: 60, textAlign: 'center', borderRadius: 24 }}>
              <Clock size={48} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
              <h4 style={{ margin: '0 0 6px', fontWeight: 700 }}>No Lectures Scheduled</h4>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                No active classes scheduled on {DAYS.find(d => d.day === activeDay)?.label}.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {dayEntries.map((period, idx) => (
                <motion.div
                  key={period.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="glass-card"
                  style={{
                    padding: 22, borderRadius: 20, display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', flexWrap: 'wrap', gap: 16,
                    borderLeft: '5px solid #F97316'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 16,
                      background: 'rgba(249, 115, 22, 0.12)', color: '#F97316',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Period</span>
                      <span style={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1 }}>{period.period}</span>
                    </div>

                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
                        {period.subject}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={14} color="#F97316" /> Faculty: {period.teacher_name || 'Subject Professor'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={14} color="#6366F1" /> Venue: {period.room || 'Main Block'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    padding: '8px 16px', borderRadius: 12, background: 'var(--surface-2)',
                    fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)',
                    display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    <Clock size={15} color="#F97316" />
                    {period.start_time} – {period.end_time}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FULL WEEK MATRIX VIEW */}
      {viewMode === 'week' && (
        <div className="glass-card" style={{ padding: 24, borderRadius: 24, overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px 14px', fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Period / Time</th>
                {DAYS.map(d => (
                  <th key={d.day} style={{ padding: '12px 14px', fontSize: '0.88rem', fontWeight: 700, color: d.day === todayDayNum ? '#F97316' : 'var(--text)' }}>
                    {d.label} {d.day === todayDayNum && '• Today'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 7].map(pNum => (
                <tr key={pNum} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
                    Period {pNum}
                  </td>
                  {DAYS.map(d => {
                    const match = slots.find(s => s.day_of_week === d.day && s.period === pNum);
                    return (
                      <td key={d.day} style={{ padding: '10px', verticalAlign: 'top' }}>
                        {match ? (
                          <div style={{
                            padding: 10, borderRadius: 12, background: 'var(--surface-2)',
                            borderLeft: '3px solid #F97316', display: 'flex', flexDirection: 'column', gap: 2
                          }}>
                            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text)' }}>{match.subject}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{match.teacher_name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#6366F1' }}>{match.room}</div>
                          </div>
                        ) : (
                          <div style={{ padding: 10, color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
