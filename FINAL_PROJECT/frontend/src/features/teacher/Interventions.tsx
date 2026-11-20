import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { interventionApi, type Intervention } from '../../services/api';
import { ClipboardList, Clock, CheckCircle, Target, ArrowRight, User, Calendar, MessageSquare, AlertCircle } from 'lucide-react';

export default function Interventions() {
  const { user } = useAuth();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  // Status mapping
  const STATUSES = [
    { key: 'planned', label: 'Planned', icon: ClipboardList, color: 'var(--text)' },
    { key: 'in_progress', label: 'In Progress', icon: Clock, color: 'var(--risk-medium)' },
    { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'var(--risk-low)' }
  ];

  const fetchInterventions = async () => {
    if (!user) return;
    try {
      const data = await interventionApi.getAll({ teacher_id: user.id });
      setInterventions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterventions();
  }, [user]);

  const updateStatus = async (id: number, newStatus: string) => {
    // Optimistic update
    const previous = [...interventions];
    setInterventions(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus, updated_at: new Date().toISOString() } : inv));
    
    try {
      await interventionApi.update(id, { status: newStatus });
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
      setInterventions(previous); // Revert
    }
  };

  // Grouping
  const getGrouped = (status: string) => interventions.filter(i => i.status === status);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32, height: '100%' }}>
        <div className="skeleton" style={{ width: '30%', height: 60, borderRadius: 12 }} />
        <div style={{ display: 'flex', gap: 24, height: 600 }}>
          <div className="skeleton" style={{ flex: 1, borderRadius: 24 }} />
          <div className="skeleton" style={{ flex: 1, borderRadius: 24 }} />
          <div className="skeleton" style={{ flex: 1, borderRadius: 24 }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32, height: '100%' }}>
      
      {/* Header */}
      <header className="glass-card" style={{ padding: '24px 32px', borderRadius: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, var(--surface), var(--surface-2))' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>
            <Target size={16} /> Strategy Board
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>Interventions</h2>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '1rem', maxWidth: 600 }}>
            Track and manage your planned interventions and support strategies for at-risk students.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'center', background: 'var(--surface)', padding: '12px 24px', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{interventions.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Plans</div>
          </div>
          <div style={{ textAlign: 'center', background: 'var(--risk-low-soft)', padding: '12px 24px', borderRadius: 16, border: '1px solid var(--risk-low)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--risk-low)' }}>{getGrouped('completed').length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--risk-low)', fontWeight: 600 }}>Resolved</div>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, flex: 1, alignItems: 'start' }}>
        {STATUSES.map(col => {
          const items = getGrouped(col.key);
          
          return (
            <div key={col.key} className="glass-card" style={{ padding: 20, borderRadius: 24, minHeight: 400, background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: col.color }}>
                  <col.icon size={18} />
                  {col.label}
                </h3>
                <span style={{ background: 'var(--surface)', padding: '4px 12px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {items.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <AnimatePresence>
                  {items.map(inv => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={inv.id} 
                      style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 12 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '4px 10px', borderRadius: 8 }}>
                          {inv.type}
                        </span>
                        {inv.due_date && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={12} /> {new Date(inv.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <User size={14} color="var(--text-muted)" /> {inv.student_name}
                        </div>
                        {inv.description && (
                          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {inv.description}
                          </p>
                        )}
                      </div>

                      <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                        {col.key === 'planned' && (
                          <button onClick={() => updateStatus(inv.id, 'in_progress')} className="btn" style={{ flex: 1, padding: '8px', fontSize: '0.8rem', background: 'var(--surface-2)', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600 }}>
                            Start <ArrowRight size={14} />
                          </button>
                        )}
                        {col.key === 'in_progress' && (
                          <>
                            <button onClick={() => updateStatus(inv.id, 'planned')} className="btn" style={{ flex: 1, padding: '8px', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, fontWeight: 600 }}>
                              Revert
                            </button>
                            <button onClick={() => updateStatus(inv.id, 'completed')} className="btn" style={{ flex: 1, padding: '8px', fontSize: '0.8rem', background: 'var(--risk-low-soft)', color: 'var(--risk-low)', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700 }}>
                              <CheckCircle size={14} /> Complete
                            </button>
                          </>
                        )}
                        {col.key === 'completed' && (
                          <button onClick={() => updateStatus(inv.id, 'in_progress')} className="btn" style={{ flex: 1, padding: '8px', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, fontWeight: 600 }}>
                            Reopen
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {items.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    <AlertCircle size={32} opacity={0.5} style={{ marginBottom: 12, color: col.color }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>No {col.label.toLowerCase()} interventions</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
