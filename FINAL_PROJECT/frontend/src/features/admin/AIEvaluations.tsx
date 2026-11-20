import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Users, GraduationCap, ArrowRight, Activity, MessageSquare, Send, CheckCircle, X } from 'lucide-react';
import { adminApi } from '../../services/api';

export default function AIEvaluations() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'parents'>('students');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  
  // Messaging Modal State
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; recipientName: string; isBroadcast: boolean }>({ isOpen: false, recipientName: '', isBroadcast: false });
  const [messageText, setMessageText] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    adminApi.getEvaluations()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    // Mock API call
    setTimeout(() => {
      setMessageModal({ isOpen: false, recipientName: '', isBroadcast: false });
      setMessageText('');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 600);
  };

  const openMessageModal = (name: string, isBroadcast: boolean = false) => {
    setMessageModal({ isOpen: true, recipientName: name, isBroadcast });
    setMessageText('');
  };

  // Derive unique classes from students
  const availableClasses = useMemo(() => {
    if (!data) return ['All'];
    const classSet = new Set<string>();
    data.students.forEach((s: any) => {
      if (s.classes) {
        s.classes.split(',').forEach((c: string) => classSet.add(c.trim()));
      }
    });
    return ['All', ...Array.from(classSet).sort()];
  }, [data]);

  // Filter students based on selected class
  const filteredStudents = useMemo(() => {
    if (!data) return [];
    if (selectedClass === 'All') return data.students;
    return data.students.filter((s: any) => s.classes && s.classes.includes(selectedClass));
  }, [data, selectedClass]);

  // Filter parents based on selected class
  const filteredParents = useMemo(() => {
    if (!data) return [];
    if (selectedClass === 'All') return data.parents;
    return data.parents.filter((p: any) => p.children_classes && p.children_classes.includes(selectedClass));
  }, [data, selectedClass]);

  if (loading) {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading AI Evaluations...</div>;
  }

  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32, position: 'relative' }}>
      
      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -50, scale: 0.9 }} 
            style={{ 
              position: 'fixed', top: 32, left: '50%', transform: 'translateX(-50%)', 
              background: 'linear-gradient(135deg, var(--risk-low), #059669)', color: '#fff', 
              padding: '16px 32px', borderRadius: 32, display: 'flex', alignItems: 'center', gap: 12, 
              fontWeight: 700, fontSize: '1.05rem', boxShadow: '0 12px 32px rgba(16, 185, 129, 0.3)', zIndex: 9999
            }}>
            <CheckCircle size={24} color="#fff" /> Message Sent Successfully!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="glass-card" style={{ padding: '32px', borderRadius: 24, background: 'linear-gradient(135deg, var(--surface), var(--surface-2))', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 16 }}>
            <Brain size={16} /> AcadIQ Engine
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>AI Evaluations</h2>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '1.05rem', maxWidth: 650 }}>
            Comprehensive view of all predictive analytics and AI-driven assessments for students, teachers, and parent engagement.
          </p>
        </div>
        <button 
          onClick={() => openMessageModal('All Users (Students, Teachers, Parents)', true)}
          className="btn btn-primary" 
          style={{ borderRadius: 20, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Send size={18} /> Broadcast Message
        </button>
      </header>

      {/* Tabs & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <button 
            onClick={() => setActiveTab('students')}
            style={{ 
              background: activeTab === 'students' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'students' ? '#fff' : 'var(--text-muted)',
              border: 'none', padding: '10px 24px', borderRadius: 20, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
            }}>
            <GraduationCap size={18} /> Student Predictions
          </button>
          <button 
            onClick={() => setActiveTab('teachers')}
            style={{ 
              background: activeTab === 'teachers' ? '#8b5cf6' : 'transparent',
              color: activeTab === 'teachers' ? '#fff' : 'var(--text-muted)',
              border: 'none', padding: '10px 24px', borderRadius: 20, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
            }}>
            <Activity size={18} /> Teacher Analytics
          </button>
          <button 
            onClick={() => setActiveTab('parents')}
            style={{ 
              background: activeTab === 'parents' ? '#f59e0b' : 'transparent',
              color: activeTab === 'parents' ? '#fff' : 'var(--text-muted)',
              border: 'none', padding: '10px 24px', borderRadius: 20, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
            }}>
            <Users size={18} /> Parent Involvement
          </button>
        </div>

        {/* Class Filter (Only visible for students and parents) */}
        {(activeTab === 'students' || activeTab === 'parents') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>Class Filter:</span>
            <select 
              value={selectedClass} 
              onChange={e => setSelectedClass(e.target.value)}
              style={{ padding: '8px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'students' && (
          <div className="glass-card" style={{ borderRadius: 20, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Student</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Classes</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Predicted Score</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Risk Level</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Key Factor</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s: any) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text)' }}>{s.name}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{s.classes || '-'}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--accent)' }}>{s.predicted_score?.toFixed(1) || '-'}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className={`badge badge-${s.risk_level?.toLowerCase() || 'low'}`}>{s.risk_level || 'Low'}</span>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {s.top_factors && Object.keys(s.top_factors).length > 0 
                        ? Object.keys(s.top_factors)[0].replace(/_/g, ' ') 
                        : 'Insufficient Data'}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <button onClick={() => openMessageModal(s.name)} className="btn btn-ghost btn-icon" title={`Message ${s.name}`} style={{ color: 'var(--accent)' }}>
                        <MessageSquare size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No students found in {selectedClass}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'teachers' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {data.teachers.map((t: any) => (
              <div key={t.id} className="glass-card" style={{ padding: 24, borderRadius: 20, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#8b5cf620', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.2rem' }}>
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>{t.name}</h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.department}</span>
                    </div>
                  </div>
                  <button onClick={() => openMessageModal(t.name)} className="btn btn-ghost btn-icon" title={`Message ${t.name}`} style={{ color: '#8b5cf6' }}>
                    <MessageSquare size={18} />
                  </button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'var(--surface-2)', padding: 16, borderRadius: 16, marginTop: 'auto' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Classes Taught</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{t.classes_count || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Avg Class Score</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6' }}>{t.avg_class_score ? t.avg_class_score.toFixed(1) : '-'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'parents' && (
          <div className="glass-card" style={{ borderRadius: 20, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Parent Name</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Children's Classes</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Avg Involvement Score (1-10)</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredParents.map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text)' }}>{p.name}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{p.children_classes || '-'}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 700, color: '#f59e0b' }}>
                      {p.avg_involvement ? p.avg_involvement.toFixed(1) : '-'}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {p.avg_involvement >= 7 ? (
                        <span className="badge badge-low">Highly Engaged</span>
                      ) : p.avg_involvement >= 4 ? (
                        <span className="badge badge-medium">Moderate</span>
                      ) : (
                        <span className="badge badge-high">Needs Attention</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <button onClick={() => openMessageModal(p.name)} className="btn btn-ghost btn-icon" title={`Message ${p.name}`} style={{ color: '#f59e0b' }}>
                        <MessageSquare size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredParents.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No parents found linked to {selectedClass}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
      </AnimatePresence>

      {/* Message Modal Overlay */}
      <AnimatePresence>
        {messageModal.isOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: 500, padding: 32, borderRadius: 24, position: 'relative' }}
            >
              <button 
                onClick={() => setMessageModal({ isOpen: false, recipientName: '', isBroadcast: false })}
                style={{ position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
              
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', color: 'var(--text)' }}>
                {messageModal.isBroadcast ? 'Broadcast Message' : 'Send Message'}
              </h3>
              <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)' }}>
                To: <strong style={{ color: 'var(--text)' }}>{messageModal.recipientName}</strong>
              </p>

              <form onSubmit={handleSendMessage}>
                <textarea 
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Type your message here..."
                  style={{ width: '100%', height: 120, padding: 16, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit', resize: 'none', marginBottom: 24 }}
                  autoFocus
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button type="button" onClick={() => setMessageModal({ isOpen: false, recipientName: '', isBroadcast: false })} className="btn btn-ghost" style={{ borderRadius: 12 }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={!messageText.trim()} style={{ borderRadius: 12, padding: '0 24px' }}>
                    <Send size={16} /> Send
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
