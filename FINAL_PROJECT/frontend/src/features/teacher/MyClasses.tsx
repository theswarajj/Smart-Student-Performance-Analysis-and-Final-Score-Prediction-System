import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, GraduationCap, ChevronRight, User, AlertCircle, CheckCircle, Search, Filter } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { classApi, type ClassInfo, type ClassStudent } from '../../services/api';

export default function MyClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      classApi.getAll(user.id).then(data => {
        setClasses(data);
        if (data.length > 0) {
          handleSelectClass(data[0]);
        } else {
          setLoading(false);
        }
      }).catch(console.error);
    }
  }, [user?.id]);

  const handleSelectClass = async (cls: ClassInfo) => {
    setSelectedClass(cls);
    setLoadingStudents(true);
    try {
      const data = await classApi.getStudents(cls.id);
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32 }}>
      {/* Header */}
      <header className="glass-card" style={{ padding: '24px 32px', borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, var(--surface), var(--surface-2))' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>
            <GraduationCap size={16} /> Professor Roster
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>My Assigned Classes</h2>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '1rem', maxWidth: 600 }}>
            Welcome, {user?.name}. You can only view details and manage students for the classes assigned to you.
          </p>
        </div>
      </header>

      {classes.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center', borderRadius: 24 }}>
          <AlertCircle size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>No Classes Assigned</h3>
          <p style={{ color: 'var(--text-muted)' }}>You have not been assigned to any classes yet. Please contact the administrator.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          
          {/* Class Sidebar */}
          <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px 8px', color: 'var(--text-muted)' }}>Your Classes</h3>
            {classes.map(cls => (
              <button
                key={cls.id}
                onClick={() => handleSelectClass(cls)}
                className="glass-card hover-lift"
                style={{
                  padding: 20,
                  borderRadius: 16,
                  textAlign: 'left',
                  border: selectedClass?.id === cls.id ? '2px solid var(--accent)' : '2px solid transparent',
                  background: selectedClass?.id === cls.id ? 'var(--accent-soft)' : 'var(--surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>{cls.name}</h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={14} /> {cls.student_count} Students
                  </div>
                </div>
                <ChevronRight size={20} style={{ color: selectedClass?.id === cls.id ? 'var(--accent)' : 'var(--text-muted)' }} />
              </button>
            ))}
          </div>

          {/* Student Roster Area */}
          <div className="glass-card" style={{ flex: 1, borderRadius: 24, padding: 24, minHeight: 400 }}>
            {selectedClass && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>{selectedClass.name} Roster</h3>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Detailed view of your students.</p>
                  </div>
                  
                  <div style={{ position: 'relative', width: 250 }}>
                    <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      placeholder="Search students..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="input"
                      style={{ width: '100%', paddingLeft: 38, borderRadius: 12, background: 'var(--surface-2)', border: 'none' }}
                    />
                  </div>
                </div>

                {loadingStudents ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="skeleton" style={{ width: 30, height: 30, borderRadius: '50%' }} /></div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Student Name</th>
                          <th style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Attendance</th>
                          <th style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>AI Prediction</th>
                          <th style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Risk Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {filteredStudents.map((s, idx) => (
                            <motion.tr 
                              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: idx * 0.05 }}
                              key={s.id} 
                              style={{ borderBottom: '1px solid var(--border)' }}
                            >
                              <td style={{ padding: '16px 12px' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    <User size={16} />
                                  </div>
                                  <div>
                                    {s.name}
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>STU{s.id.toString().padStart(3, '0')}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '16px 12px' }}>
                                <span style={{ fontWeight: 600, color: (s.attendance || 0) < 75 ? 'var(--risk-high)' : 'var(--text)' }}>
                                  {s.attendance ? `${s.attendance.toFixed(1)}%` : 'N/A'}
                                </span>
                              </td>
                              <td style={{ padding: '16px 12px' }}>
                                <span style={{ fontWeight: 700, color: 'var(--text)' }}>{s.predicted_score ? `${s.predicted_score.toFixed(1)}/100` : '--'}</span>
                              </td>
                              <td style={{ padding: '16px 12px' }}>
                                {s.risk_level === 'High' ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--risk-high)', background: 'var(--risk-high-soft)', padding: '4px 10px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700 }}>
                                    <AlertCircle size={14} /> High Risk
                                  </span>
                                ) : s.risk_level === 'Medium' ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--risk-medium)', background: 'var(--risk-medium-soft)', padding: '4px 10px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700 }}>
                                    <AlertCircle size={14} /> Watch
                                  </span>
                                ) : (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--risk-low)', background: 'var(--risk-low-soft)', padding: '4px 10px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700 }}>
                                    <CheckCircle size={14} /> On Track
                                  </span>
                                )}
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                    
                    {filteredStudents.length === 0 && (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No students found matching your search.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
