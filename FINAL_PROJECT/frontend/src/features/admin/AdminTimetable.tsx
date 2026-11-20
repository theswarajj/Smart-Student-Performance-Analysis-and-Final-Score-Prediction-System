import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { classApi, adminApi, timetableApi, type ClassInfo, type TimetableEntry, type AdminUser } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Plus, Edit2, Trash2, Calendar, MapPin, User,
  CheckCircle, AlertCircle, X, Shield, BookOpen, Layers, Sparkles
} from 'lucide-react';

const DAYS = [
  { day: 1, label: 'Monday', short: 'Mon' },
  { day: 2, label: 'Tuesday', short: 'Tue' },
  { day: 3, label: 'Wednesday', short: 'Wed' },
  { day: 4, label: 'Thursday', short: 'Thu' },
  { day: 5, label: 'Friday', short: 'Fri' },
];

const DEFAULT_PERIODS = [
  { p: 1, start: '09:00', end: '10:00' },
  { p: 2, start: '10:00', end: '11:00' },
  { p: 3, start: '11:00', end: '12:00' },
  { p: 4, start: '12:00', end: '13:00' },
  { p: 5, start: '14:00', end: '15:00' },
  { p: 6, start: '15:00', end: '16:00' },
  { p: 7, start: '16:00', end: '17:00' },
];

export default function AdminTimetable() {
  const { token } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [teachers, setTeachers] = useState<AdminUser[]>([]);
  const [slots, setSlots] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Issue / Edit Slot
  const [showModal, setShowModal] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [slotDay, setSlotDay] = useState<number>(1);
  const [slotPeriod, setSlotPeriod] = useState<number>(1);
  const [slotStartTime, setSlotStartTime] = useState<string>('09:00');
  const [slotEndTime, setSlotEndTime] = useState<string>('10:00');
  const [slotSubject, setSlotSubject] = useState<string>('');
  const [slotTeacherId, setSlotTeacherId] = useState<number | ''>('');
  const [slotRoom, setSlotRoom] = useState<string>('Room 101');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Load classes and teachers
  useEffect(() => {
    Promise.all([
      classApi.getAll(),
      adminApi.getUsers('teacher', token || ''),
    ]).then(([clsList, tList]) => {
      setClasses(clsList);
      setTeachers(tList);
      if (clsList.length > 0) {
        setSelectedClassId(clsList[0].id);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  // Load timetable slots when selectedClassId changes
  const loadSlots = async (classId: number) => {
    try {
      const data = await timetableApi.getAll({ class_id: classId });
      setSlots(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      loadSlots(selectedClassId);
    }
  }, [selectedClassId]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Open modal to issue new slot
  const handleOpenCreate = (day = 1, period = 1) => {
    setEditingSlotId(null);
    setSlotDay(day);
    setSlotPeriod(period);
    const pInfo = DEFAULT_PERIODS.find(p => p.p === period) || DEFAULT_PERIODS[0];
    setSlotStartTime(pInfo.start);
    setSlotEndTime(pInfo.end);
    setSlotSubject('');
    setSlotTeacherId(teachers.length > 0 ? teachers[0].id : '');
    setSlotRoom('Room 101');
    setShowModal(true);
  };

  // Open modal to edit existing slot
  const handleOpenEdit = (slot: TimetableEntry) => {
    setEditingSlotId(slot.id || null);
    setSlotDay(slot.day_of_week);
    setSlotPeriod(slot.period);
    setSlotStartTime(slot.start_time);
    setSlotEndTime(slot.end_time);
    setSlotSubject(slot.subject);
    setSlotTeacherId(slot.teacher_id || (teachers.length > 0 ? teachers[0].id : ''));
    setSlotRoom(slot.room || 'Room 101');
    setShowModal(true);
  };

  // Save or update slot
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !slotSubject.trim() || !token) return;

    setIsSubmitting(true);
    try {
      const payload = {
        class_id: selectedClassId,
        day_of_week: slotDay,
        period: slotPeriod,
        start_time: slotStartTime,
        end_time: slotEndTime,
        subject: slotSubject.trim(),
        teacher_id: slotTeacherId ? Number(slotTeacherId) : undefined,
        room: slotRoom.trim() || undefined,
      };

      if (editingSlotId) {
        await timetableApi.updateSlot(editingSlotId, payload, token);
        showToast('Timetable slot updated successfully!');
      } else {
        await timetableApi.createSlot(payload, token);
        showToast('New timetable slot issued successfully!');
      }

      setShowModal(false);
      await loadSlots(selectedClassId);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save timetable slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete slot
  const handleDeleteSlot = async (slotId: number) => {
    if (!confirm('Are you sure you want to remove this timetable slot?')) return;
    if (!token || !selectedClassId) return;

    try {
      await timetableApi.deleteSlot(slotId, token);
      showToast('Timetable slot removed.');
      await loadSlots(selectedClassId);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete slot.');
    }
  };

  if (loading) {
    return (
      <div className="bento-grid">
        <div className="tile span-12"><div className="skeleton" style={{ height: 450 }} /></div>
      </div>
    );
  }

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, maxWidth: 1240, margin: '0 auto' }}>
      
      {/* Header */}
      <header className="glass-card" style={{ padding: 28, borderRadius: 24, background: 'linear-gradient(135deg, var(--surface), var(--surface-2))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#6366F1', background: 'rgba(99, 102, 241, 0.12)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>
              <Shield size={16} /> Administrator Exclusive Authority
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Timetable Management & Issuing
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '1rem' }}>
              Only administrators can issue, schedule, and edit institutional class timetables. Published schedules automatically sync to student, teacher, and parent logins.
            </p>
          </div>

          <button
            onClick={() => handleOpenCreate(1, 1)}
            disabled={!selectedClassId}
            style={{
              padding: '12px 24px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)'
            }}>
            <Plus size={18} /> Issue New Timetable Slot
          </button>
        </div>
      </header>

      {/* Class Selector Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Select Class:</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {classes.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              style={{
                padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontWeight: selectedClassId === c.id ? 700 : 500, fontSize: '0.88rem',
                background: selectedClassId === c.id ? '#6366F1' : 'var(--surface)',
                color: selectedClassId === c.id ? '#fff' : 'var(--text)',
                boxShadow: selectedClassId === c.id ? '0 4px 12px rgba(99, 102, 241, 0.25)' : 'none',
                borderWidth: 1, borderStyle: 'solid', borderColor: selectedClassId === c.id ? '#6366F1' : 'var(--border)',
                transition: 'all 0.2s'
              }}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Timetable Schedule Grid */}
      <div className="glass-card" style={{ padding: 24, borderRadius: 24, overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color="#6366F1" />
            Schedule for {selectedClass?.name || 'Selected Class'}
          </h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Showing {slots.length} scheduled periods • Click any cell to add or edit
          </span>
        </div>

        <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '12px 14px', fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', width: 140 }}>
                Period / Time
              </th>
              {DAYS.map(d => (
                <th key={d.day} style={{ padding: '12px 14px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7].map(pNum => {
              const pInfo = DEFAULT_PERIODS.find(p => p.p === pNum) || DEFAULT_PERIODS[0];
              return (
                <tr key={pNum} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
                    Period {pNum}
                    <div style={{ fontSize: '0.74rem', fontWeight: 500, marginTop: 2 }}>{pInfo.start} – {pInfo.end}</div>
                  </td>
                  {DAYS.map(d => {
                    const match = slots.find(s => s.day_of_week === d.day && s.period === pNum);
                    return (
                      <td key={d.day} style={{ padding: 8, verticalAlign: 'top', height: 95 }}>
                        {match ? (
                          <div style={{
                            padding: 10, borderRadius: 12, background: 'var(--surface-2)',
                            borderLeft: '4px solid #6366F1', display: 'flex', flexDirection: 'column', gap: 4,
                            height: '100%', justifyContent: 'space-between', position: 'relative'
                          }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>{match.subject}</div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <User size={12} /> {match.teacher_name || 'Assigned Faculty'}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#6366F1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <MapPin size={11} /> {match.room || 'Room TBA'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4, paddingTop: 4, borderTop: '1px dashed var(--border)' }}>
                              <button
                                onClick={() => handleOpenEdit(match)}
                                title="Edit Slot"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => match.id && handleDeleteSlot(match.id)}
                                title="Delete Slot"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 2 }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenCreate(d.day, pNum)}
                            style={{
                              width: '100%', height: '100%', minHeight: 70, borderRadius: 10,
                              border: '1px dashed var(--border)', background: 'transparent',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'var(--text-muted)', fontSize: '0.75rem', transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.color = '#6366F1'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                          >
                            + Issue
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── MODAL: ISSUE / EDIT TIMETABLE SLOT ─────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20
          }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card"
              style={{
                background: 'var(--surface)', maxWidth: 540, width: '100%',
                borderRadius: 24, padding: 28, boxShadow: 'var(--shadow-3)',
                border: '1px solid var(--border)', position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99, 102, 241, 0.15)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                      {editingSlotId ? 'Edit Timetable Slot' : 'Issue Timetable Slot'}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Class: {selectedClass?.name}</div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveSlot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                      Day of Week:
                    </label>
                    <select
                      value={slotDay}
                      onChange={e => setSlotDay(Number(e.target.value))}
                      className="input"
                      style={{ borderRadius: 10, width: '100%', height: 40, fontSize: '0.88rem' }}>
                      {DAYS.map(d => (
                        <option key={d.day} value={d.day}>{d.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                      Period Number:
                    </label>
                    <select
                      value={slotPeriod}
                      onChange={e => {
                        const p = Number(e.target.value);
                        setSlotPeriod(p);
                        const pInfo = DEFAULT_PERIODS.find(x => x.p === p);
                        if (pInfo) {
                          setSlotStartTime(pInfo.start);
                          setSlotEndTime(pInfo.end);
                        }
                      }}
                      className="input"
                      style={{ borderRadius: 10, width: '100%', height: 40, fontSize: '0.88rem' }}>
                      {[1, 2, 3, 4, 5, 6, 7].map(p => (
                        <option key={p} value={p}>Period {p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                      Start Time:
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={slotStartTime}
                      onChange={e => setSlotStartTime(e.target.value)}
                      placeholder="09:00"
                      required
                      style={{ borderRadius: 10, width: '100%', height: 40, fontSize: '0.88rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                      End Time:
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={slotEndTime}
                      onChange={e => setSlotEndTime(e.target.value)}
                      placeholder="10:00"
                      required
                      style={{ borderRadius: 10, width: '100%', height: 40, fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                    Subject Course:
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={slotSubject}
                    onChange={e => setSlotSubject(e.target.value)}
                    placeholder="e.g. Data Structures & Algorithms"
                    required
                    style={{ borderRadius: 10, width: '100%', height: 40, fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                      Assign Faculty / Professor:
                    </label>
                    <select
                      value={slotTeacherId}
                      onChange={e => setSlotTeacherId(e.target.value ? Number(e.target.value) : '')}
                      className="input"
                      style={{ borderRadius: 10, width: '100%', height: 40, fontSize: '0.88rem' }}>
                      <option value="">Unassigned</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.department || 'Faculty'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                      Room / Lab Venue:
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={slotRoom}
                      onChange={e => setSlotRoom(e.target.value)}
                      placeholder="e.g. Room 101, Lab 2"
                      style={{ borderRadius: 10, width: '100%', height: 40, fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', fontSize: '0.88rem' }}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !slotSubject.trim()}
                    style={{
                      padding: '8px 24px', borderRadius: 10, border: 'none',
                      background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                      color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: (isSubmitting || !slotSubject.trim()) ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
                    }}>
                    {isSubmitting ? 'Saving...' : editingSlotId ? 'Save Changes' : 'Issue Slot'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
              background: '#10B981', color: '#fff', padding: '12px 20px',
              borderRadius: 14, fontWeight: 700, fontSize: '0.9rem',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
            <CheckCircle size={18} /> {successToast}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
