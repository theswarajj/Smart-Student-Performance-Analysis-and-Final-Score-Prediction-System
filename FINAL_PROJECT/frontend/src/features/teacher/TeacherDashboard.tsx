import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { classApi, teacherApi, interventionApi, messageApi, studentApi, type ClassInfo } from '../../services/api';
import { ShieldAlert, BookOpen, CheckSquare, BarChart2, Bell, ArrowRight, User, X, Send, Target, Eye, AlertCircle, CheckCircle2, GraduationCap, Calendar } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [actionModal, setActionModal] = useState<{ isOpen: boolean; student: any | null; view: 'default' | 'intervention' | 'message' | 'success' }>({ isOpen: false, student: null, view: 'default' });
  const [profileModal, setProfileModal] = useState<{ isOpen: boolean; student: any | null; view: 'default' | 'loading' | 'details' }>({ isOpen: false, student: null, view: 'default' });
  const [academicData, setAcademicData] = useState<{marks: any[], attendance: any} | null>(null);
  
  // Form states
  const [intervType, setIntervType] = useState('Academic');
  const [intervDesc, setIntervDesc] = useState('');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    Promise.all([
      classApi.getAll(user.id),
      teacherApi.getDashboard(user.id)
    ])
    .then(([classesData, dashData]) => {
      setClasses(classesData);
      setDashboardData(dashData);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="bento-grid"><div className="tile span-12"><div className="skeleton" style={{ height: 300, width: '100%', borderRadius: 24 }} /></div></div>;

  const totalClasses = classes.length;
  const totalHighRisk = classes.reduce((acc, c) => acc + (c.riskDistribution?.High || 0), 0);
  
  const riskChartData = classes.map(c => ({
    name: c.name,
    High: c.riskDistribution?.High || 0,
    Medium: c.riskDistribution?.Medium || 0,
    Low: c.riskDistribution?.Low || 0,
  }));

  const getRiskColor = (risk: string) => {
    if (risk === 'High') return 'var(--risk-high)';
    if (risk === 'Medium') return 'var(--risk-medium)';
    return 'var(--risk-low)';
  };

  const needsAttention = dashboardData?.needs_attention || [];
  const todaysClasses = dashboardData?.todays_classes || [];
  const deadlines = dashboardData?.deadlines || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', background: 'linear-gradient(135deg, var(--surface), var(--surface-2))', padding: '32px', borderRadius: 24 }} className="glass-card">
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '1.05rem' }}>Welcome back, <strong style={{ color: 'var(--text)' }}>{user?.name || 'Teacher'}</strong>. Here's your overview.</p>
        </div>
      </header>

      <div className="bento-grid">
        {/* KPI Row */}
        <motion.div className="tile glass-card span-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ borderRadius: 24 }}>
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BookOpen size={18} color="var(--accent)" /> My Classes</div>
          <div className="kpi-value" style={{ marginTop: 8 }}>{totalClasses}</div>
        </motion.div>
        
        <motion.div className="tile glass-card span-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: 'var(--risk-high-soft)', borderColor: 'rgba(239, 68, 68, 0.2)', borderRadius: 24 }}>
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--risk-high)' }}><ShieldAlert size={18} /> High-Risk Students</div>
          <div className="kpi-value" style={{ marginTop: 8, color: 'var(--risk-high)' }}>{totalHighRisk}</div>
        </motion.div>

        <motion.div className="tile glass-card span-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ borderRadius: 24 }}>
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BarChart2 size={18} color="#8b5cf6" /> Avg Predicted Score</div>
          <div className="kpi-value" style={{ marginTop: 8 }}>68.4</div>
        </motion.div>

        <motion.div className="tile glass-card span-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ borderRadius: 24 }}>
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckSquare size={18} color="#059669" /> Open Actions</div>
          <div className="kpi-value" style={{ marginTop: 8 }}>4</div>
        </motion.div>

        {/* Second Row */}
        <motion.div className="tile glass-card span-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ borderRadius: 24, padding: 32 }}>
          <h3 style={{ margin: '0 0 24px', fontSize: '1.2rem', fontWeight: 800 }}>Risk Distribution by Class</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={riskChartData} maxBarSize={40} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} dx={-10} />
              <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
              <Bar dataKey="High" fill="var(--risk-high)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Medium" fill="var(--risk-medium)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Low" fill="var(--risk-low)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="tile glass-card span-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ borderRadius: 24, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--risk-high)', display: 'flex', alignItems: 'center', gap: 8 }}><Bell size={18} /> Needs Attention</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {needsAttention.length > 0 ? needsAttention.map((student: any) => (
              <div key={student.id} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 16, background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <User size={16} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{student.name}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 12, background: `${getRiskColor(student.risk)}20`, color: getRiskColor(student.risk), fontWeight: 700 }}>
                    {student.risk}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 12px 44px' }}>{student.reason}</p>
                <div style={{ display: 'flex', gap: 8, marginLeft: 44 }}>
                  <button 
                    onClick={() => setActionModal({ isOpen: true, student, view: 'default' })}
                    className="btn btn-primary" 
                    style={{ fontSize: '0.8rem', padding: '6px 16px', borderRadius: 12 }}
                  >
                    Action
                  </button>
                  <button 
                    onClick={() => setProfileModal({ isOpen: true, student, view: 'default' })}
                    className="btn btn-ghost" 
                    style={{ fontSize: '0.8rem', padding: '6px 16px', borderRadius: 12, border: '1px solid var(--border)' }}
                  >
                    Profile
                  </button>
                </div>
              </div>
            )) : (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface-2)', borderRadius: 16 }}>
                No students need immediate attention.
              </div>
            )}
          </div>
        </motion.div>

        {/* Third Row */}
        <motion.div className="tile glass-card span-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} style={{ borderRadius: 24, padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Today's Classes</h3>
            <button style={{ background: 'var(--accent-soft)', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', padding: '6px 12px', borderRadius: 12, fontWeight: 700 }}>View Schedule <ArrowRight size={14}/></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {todaysClasses.length > 0 ? todaysClasses.map((cls: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{cls.subject}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Batch: {cls.class}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent)' }}>{cls.time}</div>
              </div>
            )) : (
              <div style={{ padding: 16, color: 'var(--text-muted)' }}>No classes scheduled today.</div>
            )}
          </div>
        </motion.div>

        <motion.div className="tile glass-card span-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} style={{ borderRadius: 24, padding: 32 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '1.2rem', fontWeight: 800 }}>Upcoming Deadlines</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {deadlines.length > 0 ? deadlines.map((dl: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderLeft: '4px solid var(--accent)', background: 'var(--surface-2)', borderRadius: '0 16px 16px 0', borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text)' }}>{dl.title}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{dl.due}</span>
              </div>
            )) : (
              <div style={{ padding: 16, color: 'var(--text-muted)' }}>No upcoming deadlines.</div>
            )}
          </div>
        </motion.div>

      </div>

      {/* Action Modal */}
      <AnimatePresence>
        {actionModal.isOpen && actionModal.student && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setActionModal({ isOpen: false, student: null, view: 'default' })} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-card" style={{ position: 'relative', width: '100%', maxWidth: 450, borderRadius: 24, padding: 32, background: 'var(--surface)' }}>
              <button className="btn btn-ghost" onClick={() => setActionModal({ isOpen: false, student: null, view: 'default' })} style={{ position: 'absolute', top: 24, right: 24, padding: 8 }}><X size={20} /></button>
              
              {actionModal.view === 'default' && (
                <>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 16 }}>
                    <Target size={16} /> Quick Action
                  </div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', color: 'var(--text)' }}>Take Action for {actionModal.student.name}</h3>
                  <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)' }}>Record an intervention or send a message.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button onClick={() => setActionModal({ ...actionModal, view: 'intervention' })} className="btn btn-primary" style={{ padding: '16px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12, fontSize: '1rem' }}>
                      <ShieldAlert size={20} /> Log Intervention
                    </button>
                    <button onClick={() => setActionModal({ ...actionModal, view: 'message' })} className="btn btn-ghost" style={{ padding: '16px', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12, fontSize: '1rem' }}>
                      <Send size={20} /> Message Student/Parent
                    </button>
                  </div>
                </>
              )}

              {actionModal.view === 'intervention' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Log Intervention</h3>
                  <div className="input-group">
                    <label>Intervention Type</label>
                    <select className="input" value={intervType} onChange={e => setIntervType(e.target.value)}>
                      <option>Academic</option>
                      <option>Behavioral</option>
                      <option>Attendance</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Description</label>
                    <textarea className="input" placeholder="Notes on intervention..." value={intervDesc} onChange={e => setIntervDesc(e.target.value)} rows={3} />
                  </div>
                  <button 
                    disabled={isSubmitting || !intervDesc}
                    className="btn btn-primary" 
                    onClick={() => {
                      if (!user) return;
                      setIsSubmitting(true);
                      interventionApi.create({
                        student_id: actionModal.student.id,
                        type: intervType,
                        description: intervDesc
                      }, localStorage.getItem('token') || '')
                      .then(() => {
                        setActionModal({ ...actionModal, view: 'success' });
                        setTimeout(() => setActionModal({ isOpen: false, student: null, view: 'default' }), 2000);
                      })
                      .finally(() => setIsSubmitting(false));
                    }}
                    style={{ width: '100%', padding: '12px', borderRadius: 12 }}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Intervention'}
                  </button>
                </div>
              )}

              {actionModal.view === 'message' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Message {actionModal.student.name}</h3>
                  <div className="input-group">
                    <label>Subject</label>
                    <input className="input" placeholder="Message subject..." value={msgSubject} onChange={e => setMsgSubject(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>Message Body</label>
                    <textarea className="input" placeholder="Type your message here..." value={msgBody} onChange={e => setMsgBody(e.target.value)} rows={4} />
                  </div>
                  <button 
                    disabled={isSubmitting || !msgSubject || !msgBody}
                    className="btn btn-primary" 
                    onClick={() => {
                      if (!user) return;
                      setIsSubmitting(true);
                      messageApi.send({
                        receiver_id: actionModal.student.id,
                        subject: msgSubject,
                        body: msgBody
                      }, localStorage.getItem('token') || '')
                      .then(() => {
                        setActionModal({ ...actionModal, view: 'success' });
                        setTimeout(() => setActionModal({ isOpen: false, student: null, view: 'default' }), 2000);
                      })
                      .finally(() => setIsSubmitting(false));
                    }}
                    style={{ width: '100%', padding: '12px', borderRadius: 12 }}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              )}

              {actionModal.view === 'success' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', textAlign: 'center' }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--risk-low-soft)', color: 'var(--risk-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <CheckCircle2 size={32} />
                  </motion.div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem' }}>Success!</h3>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>Action recorded successfully.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {profileModal.isOpen && profileModal.student && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setProfileModal({ isOpen: false, student: null, view: 'default' })} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-card" style={{ position: 'relative', width: '100%', maxWidth: 500, borderRadius: 24, padding: 32, background: 'var(--surface)' }}>
              <button className="btn btn-ghost" onClick={() => setProfileModal({ isOpen: false, student: null, view: 'default' })} style={{ position: 'absolute', top: 24, right: 24, padding: 8 }}><X size={20} /></button>
              
              {profileModal.view === 'default' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 24, marginTop: 16 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--surface-2)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <User size={40} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', color: 'var(--text)' }}>{profileModal.student.name}</h3>
                      <span style={{ fontSize: '0.85rem', padding: '4px 12px', borderRadius: 12, background: `${getRiskColor(profileModal.student.risk)}20`, color: getRiskColor(profileModal.student.risk), fontWeight: 700 }}>
                        {profileModal.student.risk} Risk Profile
                      </span>
                    </div>
                  </div>

                  <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 16, border: '1px solid var(--border)', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <AlertCircle size={20} color="var(--risk-medium)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text)', display: 'block', marginBottom: 4 }}>Primary Factor</strong>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{profileModal.student.reason}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '14px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '1rem' }}
                    onClick={() => {
                      setProfileModal({ ...profileModal, view: 'loading' });
                      Promise.all([
                        studentApi.getMarks(profileModal.student.id),
                        studentApi.getAttendance(profileModal.student.id)
                      ]).then(([marks, attendance]) => {
                        setAcademicData({ marks, attendance });
                        setProfileModal({ ...profileModal, view: 'details' });
                      }).catch(() => {
                        setProfileModal({ ...profileModal, view: 'default' });
                      });
                    }}
                  >
                    <Eye size={18} /> View Full Academic Profile
                  </button>
                </>
              )}

              {profileModal.view === 'loading' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 16 }}>
                  <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
                  <p style={{ color: 'var(--text-muted)' }}>Loading academic data...</p>
                </div>
              )}

              {profileModal.view === 'details' && academicData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
                      <User size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{profileModal.student.name}</h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Academic Overview</span>
                    </div>
                  </div>

                  {/* Attendance KPI */}
                  <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 16, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: 12, borderRadius: 12 }}>
                      <Calendar size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Overall Attendance</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
                        {academicData.attendance.overallPercentage?.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Recent Marks */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}><GraduationCap size={16} /> Recent Marks</h4>
                    {academicData.marks.slice(0, 4).map((mark: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{mark.subject}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{mark.exam_type}</div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: mark.actual_score < 50 ? 'var(--risk-high)' : 'var(--text)' }}>
                          {mark.actual_score}
                        </div>
                      </div>
                    ))}
                    {academicData.marks.length === 0 && (
                      <div style={{ padding: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No marks recorded.</div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
