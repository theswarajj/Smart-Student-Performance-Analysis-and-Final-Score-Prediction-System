import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { classApi, interventionApi, type ClassStudent, type ClassInfo } from '../../services/api';
import { getRiskBadgeClass, formatScore } from '../../utils/helpers';
import { Search, LayoutGrid, List, User, X, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RiskBoard() {
  const { user, token } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');

  // Modal states
  const [interveneStudent, setInterveneStudent] = useState<ClassStudent | null>(null);
  const [profileStudent, setProfileStudent] = useState<ClassStudent | null>(null);
  
  // Intervention form state
  const [iType, setIType] = useState('Academic Support');
  const [iDesc, setIDesc] = useState('');
  const [iDate, setIDate] = useState(new Date().toISOString().split('T')[0]);
  const [iSaving, setISaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    classApi.getAll(user.id).then(res => {
      setClasses(res);
      if (res.length > 0) setSelectedClass(res[0].id);
    }).catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    classApi.getStudents(selectedClass).then(setStudents).catch(console.error).finally(() => setLoading(false));
  }, [selectedClass]);

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interveneStudent || !token) return;
    setISaving(true);
    try {
      await interventionApi.create({
        student_id: interveneStudent.id,
        type: iType,
        description: iDesc,
        due_date: iDate
      }, token);
      setToastMsg('Intervention logged successfully!');
      setTimeout(() => setToastMsg(''), 3000);
      setInterveneStudent(null);
      setIDesc('');
    } catch (err) {
      console.error(err);
      alert('Failed to log intervention');
    } finally {
      setISaving(false);
    }
  };

  const filtered = students.filter(s => {
    if (riskFilter !== 'All' && s.risk_level !== riskFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const highRisk = filtered.filter(s => s.risk_level === 'High');
  const mediumRisk = filtered.filter(s => s.risk_level === 'Medium');
  const lowRisk = filtered.filter(s => s.risk_level === 'Low');

  const StudentCard = ({ student }: { student: ClassStudent }) => (
    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      style={{ padding: 16, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{student.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {student.id}</div>
          </div>
        </div>
        <span className={getRiskBadgeClass(student.risk_level || 'Low')} style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '12px' }}>
          {student.risk_level}
        </span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 8 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Predicted Score</span>
        <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)' }}>{student.predicted_score ? formatScore(student.predicted_score) : '--'}</span>
      </div>
      
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={() => setInterveneStudent(student)} style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, padding: '8px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--accent-hover)'} onMouseOut={e => e.currentTarget.style.background = 'var(--accent)'}>
          Intervene
        </button>
        <button onClick={() => setProfileStudent(student)} style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, padding: '8px', borderRadius: 8, background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--surface-2)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
          Profile
        </button>
      </div>
    </motion.div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32, height: '100%' }}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ position: 'fixed', top: 32, right: 32, background: 'var(--risk-low)', color: '#fff', padding: '12px 24px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
            <CheckCircle size={20} /> {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, margin: 0 }}>Risk Board</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '1.05rem' }}>Identify and support at-risk students across your classes.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select className="input premium-input" value={selectedClass || ''} onChange={e => setSelectedClass(Number(e.target.value))} style={{ minWidth: 180, fontWeight: 600 }}>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="input-group" style={{ position: 'relative', width: 280 }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="input premium-input" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 42, width: '100%' }} />
          </div>
          <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 4 }}>
            {['All', 'High', 'Medium', 'Low'].map(f => (
              <button key={f} onClick={() => setRiskFilter(f)}
                style={{ padding: '6px 16px', fontSize: '0.85rem', borderRadius: 8, border: 'none',
                  background: riskFilter === f ? 'var(--surface-2)' : 'transparent',
                  color: riskFilter === f ? 'var(--text)' : 'var(--text-muted)',
                  fontWeight: riskFilter === f ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 4 }}>
          <button onClick={() => setViewMode('board')} style={{ padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: viewMode === 'board' ? 'var(--surface-2)' : 'transparent', borderRadius: 8, cursor: 'pointer', fontWeight: 600, color: viewMode === 'board' ? 'var(--text)' : 'var(--text-muted)' }}>
            <LayoutGrid size={18} /> Board
          </button>
          <button onClick={() => setViewMode('table')} style={{ padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: viewMode === 'table' ? 'var(--surface-2)' : 'transparent', borderRadius: 8, cursor: 'pointer', fontWeight: 600, color: viewMode === 'table' ? 'var(--text)' : 'var(--text-muted)' }}>
            <List size={18} /> Table
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><span className="skeleton" style={{ width: '100%', height: 400, display: 'block', borderRadius: 24 }} /></div>
      ) : viewMode === 'board' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
          {/* High Risk Column */}
          <div style={{ background: 'var(--risk-high-soft)', borderRadius: 24, padding: 24, border: '1px solid var(--risk-high)', opacity: riskFilter !== 'All' && riskFilter !== 'High' ? 0.3 : 1 }}>
            <h3 style={{ margin: '0 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--risk-high)', fontSize: '1.2rem', fontWeight: 800 }}>
              <span>High Risk</span>
              <span style={{ background: 'var(--surface)', padding: '4px 12px', borderRadius: 16, fontSize: '0.85rem' }}>{highRisk.length}</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AnimatePresence>
                {highRisk.map(s => <StudentCard key={s.id} student={s} />)}
              </AnimatePresence>
              {highRisk.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.95rem' }}>No high risk students</div>}
            </div>
          </div>

          {/* Medium Risk Column */}
          <div style={{ background: 'var(--risk-medium-soft)', borderRadius: 24, padding: 24, border: '1px solid var(--risk-medium)', opacity: riskFilter !== 'All' && riskFilter !== 'Medium' ? 0.3 : 1 }}>
            <h3 style={{ margin: '0 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#92400E', fontSize: '1.2rem', fontWeight: 800 }}>
              <span>Medium Risk</span>
              <span style={{ background: 'var(--surface)', padding: '4px 12px', borderRadius: 16, fontSize: '0.85rem' }}>{mediumRisk.length}</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AnimatePresence>
                {mediumRisk.map(s => <StudentCard key={s.id} student={s} />)}
              </AnimatePresence>
              {mediumRisk.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.95rem' }}>No medium risk students</div>}
            </div>
          </div>

          {/* Low Risk Column */}
          <div style={{ background: 'var(--risk-low-soft)', borderRadius: 24, padding: 24, border: '1px solid var(--risk-low)', opacity: riskFilter !== 'All' && riskFilter !== 'Low' ? 0.3 : 1 }}>
            <h3 style={{ margin: '0 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--risk-low)', fontSize: '1.2rem', fontWeight: 800 }}>
              <span>Low Risk</span>
              <span style={{ background: 'var(--surface)', padding: '4px 12px', borderRadius: 16, fontSize: '0.85rem' }}>{lowRisk.length}</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AnimatePresence>
                {lowRisk.map(s => <StudentCard key={s.id} student={s} />)}
              </AnimatePresence>
              {lowRisk.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.95rem' }}>No low risk students</div>}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 24 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-muted)' }}>Student</th>
                  <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-muted)' }}>Predicted Score</th>
                  <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-muted)' }}>Confidence Interval</th>
                  <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-muted)' }}>Risk Level</th>
                  <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-muted)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={18} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text)' }}>{s.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {s.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)' }}>{s.predicted_score ? formatScore(s.predicted_score) : '--'}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 500 }}>{s.confidence_low && s.confidence_high ? `${s.confidence_low.toFixed(1)} - ${s.confidence_high.toFixed(1)}` : '--'}</td>
                    <td style={{ padding: '16px 24px' }}>
                      {s.risk_level ? (
                        <span className={getRiskBadgeClass(s.risk_level)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem' }}>{s.risk_level}</span>
                      ) : <span style={{ color: 'var(--text-muted)' }}>No data</span>}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setInterveneStudent(s)} className="btn btn-primary" style={{ padding: '6px 16px', borderRadius: 8, fontSize: '0.85rem' }}>Intervene</button>
                        <button onClick={() => setProfileStudent(s)} className="btn btn-secondary" style={{ padding: '6px 16px', borderRadius: 8, fontSize: '0.85rem', background: 'transparent' }}>Profile</button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: '1.1rem' }}>No students found matching filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Intervention Modal */}
      <AnimatePresence>
        {interveneStudent && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} style={{ background: 'var(--surface)', borderRadius: 24, width: '100%', maxWidth: 500, overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>Log Intervention</h3>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>For {interveneStudent.name} (ID: {interveneStudent.id})</p>
                </div>
                <button onClick={() => setInterveneStudent(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)' }}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateIntervention} style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>Intervention Type</label>
                  <select className="input premium-input" value={iType} onChange={e => setIType(e.target.value)} required>
                    <option value="Academic Support">Academic Support</option>
                    <option value="Behavioral Counseling">Behavioral Counseling</option>
                    <option value="Parent Meeting">Parent Meeting</option>
                    <option value="Special Assignment">Special Assignment</option>
                    <option value="Mentorship">Mentorship</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>Description / Plan</label>
                  <textarea className="input premium-input" rows={4} placeholder="Describe the planned intervention..." value={iDesc} onChange={e => setIDesc(e.target.value)} required style={{ resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>Due Date</label>
                  <input type="date" className="input premium-input" value={iDate} onChange={e => setIDate(e.target.value)} required />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <button type="button" onClick={() => setInterveneStudent(null)} className="btn btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: 12 }}>Cancel</button>
                  <button type="submit" disabled={iSaving} className="btn btn-primary" style={{ flex: 2, padding: '12px', borderRadius: 12 }}>
                    {iSaving ? 'Saving...' : 'Save Intervention'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {profileStudent && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} style={{ background: 'var(--surface)', borderRadius: 24, width: '100%', maxWidth: 500, overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>Student Profile</h3>
                </div>
                <button onClick={() => setProfileStudent(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)' }}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={32} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{profileStudent.name}</h2>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>ID: {profileStudent.id} • {profileStudent.department} (Semester {profileStudent.semester})</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 16 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Risk Level</div>
                    <div className={getRiskBadgeClass(profileStudent.risk_level || 'Low')} style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 8, fontSize: '0.9rem' }}>
                      {profileStudent.risk_level}
                    </div>
                  </div>
                  <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 16 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Predicted Score</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>
                      {profileStudent.predicted_score ? formatScore(profileStudent.predicted_score) : '--'}
                    </div>
                  </div>
                  <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 16 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Confidence Interval</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
                      {profileStudent.confidence_low ? `${profileStudent.confidence_low.toFixed(1)} - ${profileStudent.confidence_high?.toFixed(1)}` : '--'}
                    </div>
                  </div>
                  <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 16 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Attendance</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: (profileStudent.attendance || 0) < 75 ? 'var(--risk-high)' : 'var(--text)' }}>
                      {profileStudent.attendance ? `${profileStudent.attendance.toFixed(1)}%` : 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--accent-soft)', padding: 16, borderRadius: 16, border: '1px solid var(--accent)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontWeight: 700, marginBottom: 8 }}>
                    <Sparkles size={18} /> AI Suggestion
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.5 }}>
                    {profileStudent.risk_level === 'High' ? 
                      'Immediate intervention recommended. Focus on core subject fundamentals and arrange a parent meeting.' : 
                     profileStudent.risk_level === 'Medium' ? 
                      'Monitor progress closely. Assign targeted mentorship or extra assignments to boost confidence.' : 
                      'Student is performing well. Provide advanced material to maintain engagement.'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
