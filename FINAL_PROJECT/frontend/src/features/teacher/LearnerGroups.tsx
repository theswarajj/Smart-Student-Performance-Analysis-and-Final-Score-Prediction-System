import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { classApi, type LearnerGroup, type ClassInfo } from '../../services/api';
import { Users, Layers, TrendingUp, AlertCircle, Sparkles, ChevronDown, ChevronRight, User } from 'lucide-react';

export default function LearnerGroups() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [groups, setGroups] = useState<LearnerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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
    classApi.getGroups(selectedClass).then(data => {
      setGroups(data);
      // Expand all by default
      const exp: Record<string, boolean> = {};
      data.forEach(g => { exp[g.id] = true; });
      setExpandedGroups(exp);
    }).catch(console.error).finally(() => setLoading(false));
  }, [selectedClass]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getGroupIcon = (id: string) => {
    switch (id) {
      case 'high_performer': return <TrendingUp size={20} color="var(--risk-low)" />;
      case 'low_attendance_high_effort': return <Layers size={20} color="var(--risk-medium)" />;
      case 'at_risk': return <AlertCircle size={20} color="var(--risk-high)" />;
      default: return <Users size={20} color="var(--accent)" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32, height: '100%', maxWidth: 1200, margin: '0 auto' }}>
      
      {/* Header */}
      <header className="glass-card" style={{ padding: '32px', borderRadius: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, var(--surface), var(--surface-2))' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Sparkles size={16} /> AI-Powered Clustering
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>Learner Groups</h2>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '1.05rem', maxWidth: 600 }}>
            Automatically cluster students based on behaviour, attendance, and predicted performance to tailor your teaching strategies.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select className="input premium-input" value={selectedClass || ''} onChange={e => setSelectedClass(Number(e.target.value))} style={{ minWidth: 200, fontWeight: 700, fontSize: '1.05rem' }}>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </header>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><span className="skeleton" style={{ width: '100%', height: 400, display: 'block', borderRadius: 24 }} /></div>
      ) : groups.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center', borderRadius: 24 }}>
          <Users size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>No Groups Generated</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>Insufficient data to generate learner clusters for this class.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24, alignItems: 'start' }}>
          {groups.map(group => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
              key={group.id} 
              className="glass-card" 
              style={{ borderRadius: 24, overflow: 'hidden', border: group.id === 'at_risk' ? '1px solid var(--risk-high)' : group.id === 'high_performer' ? '1px solid var(--risk-low)' : '1px solid var(--border)' }}
            >
              <div 
                onClick={() => toggleGroup(group.id)}
                style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'var(--surface-2)', borderBottom: expandedGroups[group.id] ? '1px solid var(--border)' : 'none', transition: 'all 0.2s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    {getGroupIcon(group.id)}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{group.label}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{group.size} Students</div>
                  </div>
                </div>
                {expandedGroups[group.id] ? <ChevronDown size={20} color="var(--text-muted)" /> : <ChevronRight size={20} color="var(--text-muted)" />}
              </div>

              <AnimatePresence>
                {expandedGroups[group.id] && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '24px 32px' }}>
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Shared Traits</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {group.traits.map((t, i) => (
                            <span key={i} style={{ background: 'var(--surface-2)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{t}</span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Members</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {group.members.map(m => (
                            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <User size={14} color="var(--text-muted)" />
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{m.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {m.id}</div>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>{m.score.toFixed(1)}</div>
                                <div style={{ fontSize: '0.75rem', color: m.risk === 'High' ? 'var(--risk-high)' : m.risk === 'Medium' ? 'var(--risk-medium)' : 'var(--risk-low)', fontWeight: 700 }}>
                                  {m.risk} Risk
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
