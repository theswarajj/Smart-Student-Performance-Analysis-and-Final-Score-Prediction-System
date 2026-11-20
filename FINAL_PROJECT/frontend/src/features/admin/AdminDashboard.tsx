import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { adminApi, type AdminStats } from '../../services/api';
import { Users, Activity, AlertTriangle, ShieldCheck, User, GraduationCap, Briefcase, MessageSquare, Target, BookOpen, Clock } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

function CheckCircleIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
}

const getIconForResource = (resource: string) => {
  switch (resource?.toLowerCase()) {
    case 'marks': return <BookOpen size={20} />;
    case 'intervention': return <Target size={20} />;
    case 'attendance': return <Clock size={20} />;
    case 'goals': return <Target size={20} />;
    case 'messages': return <MessageSquare size={20} />;
    case 'system': return <Activity size={20} />;
    default: return <CheckCircleIcon style={{ width: 20, height: 20 }} />;
  }
};

const formatTimeAgo = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${Math.round(diffHours / 24)} days ago`;
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'teacher' | 'student' | 'parent'>('teacher');

  useEffect(() => {
    if (!user) return;
    adminApi.getStats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  // Group recent activity by role
  const groupedActivity = useMemo(() => {
    const activity = stats?.recentActivity || [];
    return {
      teacher: activity.filter(a => a.user_role === 'teacher'),
      student: activity.filter(a => a.user_role === 'student'),
      parent: activity.filter(a => a.user_role === 'parent'),
    };
  }, [stats?.recentActivity]);

  if (loading) return <div className="bento-grid"><div className="tile span-12"><div className="skeleton" style={{ height: 200 }} /></div></div>;
  if (!stats) return null;

  const roleData = Object.entries(stats.usersByRole).map(([name, value]) => ({ name, value }));
  const riskData = Object.entries(stats.riskDistribution).map(([name, value]) => ({ name, value }));
  const riskColors: Record<string, string> = { High: 'var(--risk-high)', Medium: 'var(--risk-medium)', Low: 'var(--risk-low)' };
  const roleColors: Record<string, string> = { student: '#0D9488', teacher: '#4F46E5', parent: '#F97316', admin: '#475569' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32 }}>
      
      {/* Overview Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>System Overview</h2>
      </div>

      <div className="bento-grid">
        <motion.div className="tile glass-card span-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ borderRadius: 20 }}>
          <div className="kpi-label"><Users size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: -3 }}/>Total Users</div>
          <div className="kpi-value" style={{ marginTop: 8 }}>{Object.values(stats.usersByRole).reduce((a, b) => a + b, 0)}</div>
        </motion.div>
        
        <motion.div className="tile glass-card span-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ borderRadius: 20 }}>
          <div className="kpi-label"><Activity size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: -3 }}/>Total Predictions</div>
          <div className="kpi-value" style={{ marginTop: 8 }}>{stats.totalPredictions}</div>
        </motion.div>

        <motion.div className="tile glass-card span-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ borderRadius: 20 }}>
          <div className="kpi-label"><AlertTriangle size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: -3 }}/>High Risk Overall</div>
          <div className="kpi-value" style={{ marginTop: 8, color: 'var(--risk-high)' }}>{stats.riskDistribution.High || 0}</div>
        </motion.div>

        <motion.div className="tile glass-card span-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ borderRadius: 20 }}>
          <div className="kpi-label"><ShieldCheck size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: -3 }}/>Model Status</div>
          <div className="kpi-value" style={{ marginTop: 8, fontSize: '1.5rem', color: 'var(--success)' }}>Healthy</div>
        </motion.div>

        {/* Charts */}
        <motion.div className="tile glass-card span-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ borderRadius: 24, padding: 32 }}>
          <div className="kpi-label" style={{ marginBottom: 16 }}>Users by Role</div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={roleData} innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                {roleData.map((e, i) => <Cell key={i} fill={roleColors[e.name] || 'var(--accent)'} />)}
              </Pie>
              <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16 }}>
            {roleData.map(r => (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: roleColors[r.name] }} />
                <span style={{ textTransform: 'capitalize' }}>{r.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="tile glass-card span-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ borderRadius: 24, padding: 32 }}>
          <div className="kpi-label" style={{ marginBottom: 16 }}>System-wide Risk Distribution</div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={riskData} innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                {riskData.map((e, i) => <Cell key={i} fill={riskColors[e.name] || 'var(--text-muted)'} />)}
              </Pie>
              <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16 }}>
            {riskData.map(r => (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: riskColors[r.name] }} />
                <span>{r.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Premium Activity Section */}
        <motion.div className="tile glass-card span-12" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} style={{ borderRadius: 24, padding: 32, marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Real-Time Platform Activity</h3>
            
            <div style={{ display: 'flex', background: 'var(--surface-2)', padding: 4, borderRadius: 16, border: '1px solid var(--border)' }}>
              <button 
                onClick={() => setActiveTab('teacher')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'teacher' ? 'var(--accent)' : 'transparent', color: activeTab === 'teacher' ? '#fff' : 'var(--text-muted)' }}
              >
                <Briefcase size={16} /> Faculty ({groupedActivity.teacher.length})
              </button>
              <button 
                onClick={() => setActiveTab('student')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'student' ? 'var(--accent)' : 'transparent', color: activeTab === 'student' ? '#fff' : 'var(--text-muted)' }}
              >
                <GraduationCap size={16} /> Students ({groupedActivity.student.length})
              </button>
              <button 
                onClick={() => setActiveTab('parent')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'parent' ? 'var(--accent)' : 'transparent', color: activeTab === 'parent' ? '#fff' : 'var(--text-muted)' }}
              >
                <Users size={16} /> Parents ({groupedActivity.parent.length})
              </button>
            </div>
          </div>

          <div style={{ minHeight: 150, position: 'relative' }}>
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                {groupedActivity[activeTab].map(act => (
                  <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getIconForResource(act.resource)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem', marginBottom: 4 }}>{act.user_name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{act.action}</div>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                      {formatTimeAgo(act.created_at)}
                    </div>
                  </div>
                ))}
                
                {groupedActivity[activeTab].length === 0 && (
                  <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 16 }}>
                    No recent activity found for this role.
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
        
      </div>
    </div>
  );
}
