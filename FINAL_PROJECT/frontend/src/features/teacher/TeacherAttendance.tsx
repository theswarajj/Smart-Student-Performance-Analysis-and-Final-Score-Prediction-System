import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { classApi, type ClassStudent, type ClassInfo } from '../../services/api';

export default function TeacherAttendance() {
  const { user, token } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // State maps studentId -> array of 7 booleans
  const [attendance, setAttendance] = useState<Record<string, boolean[]>>({});

  useEffect(() => {
    if (!user) return;
    classApi.getAll(user.id).then(res => {
      setClasses(res);
      if (res.length > 0) setSelectedClass(res[0].id);
    }).catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!selectedClass) return;
    classApi.getStudents(selectedClass).then(res => {
      setStudents(res);
      setAttendance(res.reduce((acc, student) => ({ ...acc, [student.id]: Array(7).fill(true) }), {}));
    }).catch(console.error);
  }, [selectedClass]);

  const toggleHour = (studentId: string, hourIndex: number) => {
    setAttendance(prev => {
      const updated = [...prev[studentId]];
      updated[hourIndex] = !updated[hourIndex];
      return { ...prev, [studentId]: updated };
    });
  };

  const markAllForStudent = (studentId: string, present: boolean) => {
    setAttendance(prev => ({ ...prev, [studentId]: Array(7).fill(present) }));
  };

  const markEntireClassPresent = () => {
    setAttendance(students.reduce((acc, student) => ({ ...acc, [student.id]: Array(7).fill(true) }), {}));
  };

  const handleSave = async () => {
    if (!selectedClass || !token) return;
    setSaving(true);
    try {
      const records = students.map(s => ({
        student_id: s.id,
        periods: attendance[s.id] || Array(7).fill(true)
      }));

      await classApi.saveBulkAttendance({
        class_id: selectedClass.toString(),
        date,
        records
      }, token);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32 }}>
      
      {/* Success Popup */}
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -50, scale: 0.9 }} 
            style={{ 
              position: 'fixed', 
              top: 32, 
              left: '50%', 
              transform: 'translateX(-50%)', 
              background: 'linear-gradient(135deg, var(--risk-low), #059669)', 
              color: '#fff', 
              padding: '16px 32px', 
              borderRadius: 32, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              fontWeight: 700,
              fontSize: '1.05rem',
              boxShadow: '0 12px 32px rgba(16, 185, 129, 0.3)',
              zIndex: 9999
            }}>
            <CheckCircle size={24} color="#fff" /> Attendance Successfully Saved & Synced!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="glass-card" style={{ padding: '24px 32px', borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '4px 12px', borderRadius: 16, fontSize: '0.8rem', fontWeight: 700, marginBottom: 12 }}>
            <Sparkles size={14} /> Premium Marking
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>Daily Attendance</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.95rem' }}>Track period-by-period presence for accurate behavioural prediction.</p>
        </div>
        
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="input-group">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input premium-input" style={{ width: 180 }} />
          </div>
          <div className="input-group">
            <select value={selectedClass || ''} onChange={e => setSelectedClass(Number(e.target.value))} className="input premium-input" style={{ width: 150 }}>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </header>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <button className="btn btn-primary" onClick={markEntireClassPresent} style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)' }}>
            <Check size={18} /> Mark All Present
          </button>
        </div>
        
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--risk-low)' }} /> Present</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--risk-high)' }} /> Absent</span>
        </div>
      </div>

      {/* Roster Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ borderRadius: 20, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text)', width: 250 }}>Student</th>
              {Array.from({ length: 7 }).map((_, i) => (
                <th key={i} style={{ padding: '16px 8px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <Clock size={16} />
                    <span style={{ fontSize: '0.75rem' }}>Hr {i + 1}</span>
                  </div>
                </th>
              ))}
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>Quick Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {students.length === 0 ? (
                 <tr>
                    <td colSpan={9} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No students found in this class.</td>
                 </tr>
              ) : students.map((student) => {
                const sAttendance = attendance[student.id] || Array(7).fill(true);
                const isRisk = student.risk_level === 'High' || student.risk_level === 'Medium';
                
                return (
                  <motion.tr 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    key={student.id} 
                    style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s', background: 'transparent' }}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', color: 'var(--text-muted)' }}>
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {student.name}
                            {isRisk && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--risk-high)' }} title="At Risk Student" />}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {student.id}</div>
                        </div>
                      </div>
                    </td>

                    {sAttendance.map((isPresent, i) => (
                      <td key={i} style={{ padding: '16px 8px', textAlign: 'center' }}>
                        <button 
                          onClick={() => toggleHour(student.id.toString(), i)}
                          style={{
                            width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            background: isPresent ? 'var(--risk-low-soft)' : 'var(--risk-high-soft)',
                            color: isPresent ? 'var(--risk-low)' : 'var(--risk-high)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isPresent ? <Check size={16} /> : <X size={16} />}
                        </button>
                      </td>
                    ))}

                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {sAttendance.filter(Boolean).length}/7
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => markAllForStudent(student.id.toString(), true)} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--risk-low)', cursor: 'pointer' }}><Check size={16} /></button>
                          <button onClick={() => markAllForStudent(student.id.toString(), false)} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--risk-high)', cursor: 'pointer' }}><X size={16} /></button>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </motion.div>

      {/* Footer Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving || students.length === 0} style={{ borderRadius: 16, padding: '0 32px' }}>
          {saving ? 'Saving...' : <>Save Attendance <ArrowRight size={18} /></>}
        </button>
      </div>

    </div>
  );
}
