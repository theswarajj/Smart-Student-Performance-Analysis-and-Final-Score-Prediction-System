import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Search, Filter, BookOpen, Users, Building, Calendar, ShieldCheck, X } from 'lucide-react';
import { classApi, type ClassInfo, type ClassStudent } from '../../services/api';

export default function ClassManagement() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Roster Modal State
  const [showRosterModal, setShowRosterModal] = useState<string | null>(null);
  const [roster, setRoster] = useState<ClassStudent[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  useEffect(() => {
    classApi.getAll().then(setClasses).catch(console.error).finally(() => setLoading(false));
  }, []);

  const openRoster = (id: string) => {
    setShowRosterModal(id);
    setLoadingRoster(true);
    classApi.getStudents(Number(id)).then(setRoster).catch(console.error).finally(() => setLoadingRoster(false));
  };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.department && c.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 700, margin: 0 }}>Classrooms</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>Manage academic batches, assigned faculty, and view active rosters.</p>
        </div>
      </header>

      {/* Toolbar */}
      <div className="glass-card" style={{ padding: '16px 24px', borderRadius: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="input-group" style={{ flex: 1, minWidth: 250 }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input" 
            placeholder="Search classes or departments..." 
            style={{ paddingLeft: 44, width: '100%', background: 'var(--surface)' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost" style={{ borderRadius: 12, border: '1px solid var(--border)' }}>
          <Filter size={18} style={{ marginRight: 8 }} /> Filter
        </button>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 400, borderRadius: 20 }} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filteredClasses.map(cls => (
            <motion.div key={cls.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card" style={{ padding: 24, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid var(--border)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'inline-block', padding: '4px 12px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700, marginBottom: 12 }}>
                    Semester {cls.semester}
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{cls.name}</h3>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={24} color="var(--accent)" />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <Building size={16} /> {cls.department}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <Calendar size={16} /> Batch Year: {cls.year}
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button className="btn" onClick={() => openRoster(cls.id.toString())} style={{ borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '0.9rem' }}>
                  <Users size={16} style={{ marginRight: 8 }} /> Roster
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Roster Modal */}
      <AnimatePresence>
        {showRosterModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setShowRosterModal(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-card" style={{ position: 'relative', width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto', borderRadius: 24, padding: 32, background: 'var(--surface)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Class Roster</h3>
                <button className="btn btn-ghost" onClick={() => setShowRosterModal(null)} style={{ padding: 8 }}><X size={24} /></button>
              </div>

              {loadingRoster ? (
                <div style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto' }}/></div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>ID</th>
                      <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Student Name</th>
                      <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Attendance</th>
                      <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Predicted Mark</th>
                      <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Risk Profile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((stu, idx) => (
                      <tr key={stu.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>{stu.id}</td>
                        <td style={{ padding: '16px 20px', fontWeight: 600 }}>{stu.name}</td>
                        <td style={{ padding: '16px 20px', fontWeight: 600 }}>{stu.attendance !== undefined && stu.attendance !== null ? `${stu.attendance}%` : '--'}</td>
                        <td style={{ padding: '16px 20px', fontWeight: 600 }}>{stu.predicted_score !== undefined && stu.predicted_score !== null ? `${stu.predicted_score.toFixed(1)} / 100` : '--'}</td>
                        <td style={{ padding: '16px 20px' }}>
                           <span style={{ 
                             padding: '4px 10px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 700,
                             background: stu.risk_level === 'High' ? 'var(--risk-high-soft)' : stu.risk_level === 'Medium' ? 'var(--risk-medium-soft)' : 'var(--risk-low-soft)',
                             color: stu.risk_level === 'High' ? 'var(--risk-high)' : stu.risk_level === 'Medium' ? 'var(--risk-medium)' : 'var(--risk-low)'
                           }}>
                             {stu.risk_level || 'N/A'}
                           </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
