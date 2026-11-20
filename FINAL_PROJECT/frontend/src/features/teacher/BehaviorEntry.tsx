import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Search, SlidersHorizontal, Activity, Users, Target, Save, 
  CheckCircle, BookOpen, Home, Moon, Wifi, Award, AlertCircle, Sparkles
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { 
  classApi, 
  checkinApi, 
  teacherApi, 
  parentApi,
  type ClassStudent, 
  type StudentObservations 
} from '../../services/api';

export default function BehaviorEntry() {
  const { user, token } = useAuth();
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<ClassStudent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Latest academic and observation data
  const [observations, setObservations] = useState<StudentObservations | null>(null);
  const [latestPrediction, setLatestPrediction] = useState<{
    predicted_score: number;
    risk: string;
    interval?: [number, number];
  } | null>(null);

  // Teacher Classroom Factor States
  const [motivation, setMotivation] = useState<number>(3);
  const [peerInfluence, setPeerInfluence] = useState<number>(2);
  const [teacherQuality, setTeacherQuality] = useState<number>(2);
  const [tutoringSessions, setTutoringSessions] = useState<number>(1);
  const [learningEngagement, setLearningEngagement] = useState<number>(3);
  const [studyConsistency, setStudyConsistency] = useState<number>(3);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    classApi.getAll(user.id).then(res => {
      Promise.all(res.map(c => classApi.getStudents(c.id))).then(arrays => {
        const allStudents = arrays.flat();
        const uniqueStudents = Array.from(new Map(allStudents.map(s => [s.id, s])).values());
        setStudents(uniqueStudents);
        if (uniqueStudents.length > 0 && !selectedStudent) {
          setSelectedStudent(uniqueStudents[0]);
        }
      });
    }).catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!selectedStudent) return;
    
    // Fetch latest observation breakdown (both parent home factors & school factors)
    parentApi.getObservations(selectedStudent.id, token || undefined)
      .then(obs => {
        setObservations(obs);
        setMotivation(obs.school_factors.motivation || 3);
        setPeerInfluence(obs.school_factors.peer_influence || 2);
        setTeacherQuality(obs.school_factors.teacher_quality || 2);
        setTutoringSessions(obs.school_factors.tutoring_sessions || 0);
      })
      .catch(console.error);

    // Fetch latest check-in data to get current prediction
    checkinApi.getAll(selectedStudent.id).then(res => {
      if (selectedStudent.predicted_score !== undefined) {
        setLatestPrediction({
          predicted_score: selectedStudent.predicted_score,
          risk: selectedStudent.risk_level || 'Medium',
          interval: selectedStudent.confidence_low && selectedStudent.confidence_high ? 
            [selectedStudent.confidence_low, selectedStudent.confidence_high] : undefined
        });
      }
    }).catch(console.error);
  }, [selectedStudent, token]);

  const handleSave = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    try {
      const res = await teacherApi.submitBehaviour({
        student_id: selectedStudent.id,
        motivation,
        peer_influence: peerInfluence,
        teacher_quality: teacherQuality,
        tutoring_sessions: tutoringSessions,
        study_consistency: studyConsistency,
        learning_engagement: learningEngagement,
      }, token || undefined);

      if (res.prediction) {
        setLatestPrediction({
          predicted_score: res.prediction.predicted_score,
          risk: res.prediction.risk,
          interval: res.prediction.interval,
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err) {
      console.error(err);
      alert('Failed to update classroom behavioral observations.');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.toString().includes(searchTerm)
  );

  const getRiskBadge = (risk?: string) => {
    if (risk === 'High') return { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', text: 'High Risk' };
    if (risk === 'Medium') return { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', text: 'Medium Risk' };
    return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', text: 'Low Risk' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32, maxWidth: 1280, margin: '0 auto', height: '100%' }}>
      
      {/* Header */}
      <header className="glass-card" style={{ padding: '28px 32px', borderRadius: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, var(--surface), var(--surface-2))' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>
            <Brain size={16} /> Teacher Observation Portal
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
            Classroom Behavioral Assessment
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '1rem', maxWidth: 680 }}>
            Input classroom-based factors (motivation, peer influence, faculty mentorship). Home lifestyle factors (sleep, parental support) are automatically integrated from parent portal inputs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ padding: '12px 18px', borderRadius: 16, background: 'var(--surface-2)', border: '1px solid var(--border)', textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ROSTER STUDENTS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)' }}>{students.length}</div>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, flex: 1 }}>
        
        {/* Left Column - Student Selection */}
        <div className="glass-card" style={{ borderRadius: 24, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, height: 'calc(100vh - 270px)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>Class Roster</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{filteredStudents.length} students</span>
          </div>
          
          <div className="input-group">
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search name or ID..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="input premium-input" 
                style={{ paddingLeft: 38, borderRadius: 12, width: '100%', fontSize: '0.9rem' }} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {filteredStudents.map(student => {
              const isSelected = selectedStudent?.id === student.id;
              const badge = getRiskBadge(student.risk_level);
              return (
                <button 
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, 
                    border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)', 
                    cursor: 'pointer', textAlign: 'left',
                    background: isSelected ? 'var(--accent-soft)' : 'var(--surface-2)',
                    transition: 'all 0.15s ease-in-out'
                  }}
                >
                  <div style={{ 
                    width: 36, height: 36, borderRadius: '50%', 
                    background: isSelected ? 'var(--accent)' : 'var(--surface)', 
                    color: isSelected ? '#fff' : 'var(--text)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 
                  }}>
                    {student.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {student.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      ID: {student.id} • Pred: {student.predicted_score ? `${student.predicted_score.toFixed(1)}` : 'N/A'}
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: badge.bg, color: badge.color 
                  }}>
                    {student.risk_level || 'Med'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column - Assessment Form */}
        <div className="glass-card" style={{ borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', position: 'relative', overflowY: 'auto' }}>
          <AnimatePresence mode="wait">
            {selectedStudent ? (
              <motion.div key={selectedStudent.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                {/* Student Header & Model Snapshot */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text)' }}>
                      {selectedStudent.name}
                    </h3>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                      ID: {selectedStudent.id} • Dept: {selectedStudent.department || 'Computer Science'} • Sem: {selectedStudent.semester || 1}
                    </div>
                  </div>

                  {/* Prediction Pill */}
                  {latestPrediction && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface-2)', padding: '10px 18px', borderRadius: 16, border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CURRENT ML PREDICTION</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent)' }}>
                          {latestPrediction.predicted_score.toFixed(1)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 100</span>
                        </div>
                      </div>
                      <div style={{ 
                        padding: '6px 12px', borderRadius: 12, fontWeight: 700, fontSize: '0.85rem',
                        background: getRiskBadge(latestPrediction.risk).bg,
                        color: getRiskBadge(latestPrediction.risk).color,
                      }}>
                        {latestPrediction.risk} Risk
                      </div>
                    </div>
                  )}
                </div>

                {/* Academic & Parent Live Reference Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  <div style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Activity size={14} color="var(--accent)" /> Real Attendance %
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                      {observations?.school_factors?.attendance ? `${observations.school_factors.attendance.toFixed(1)}%` : '80.0%'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>From 7-period daily logs</div>
                  </div>

                  <div style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Award size={14} color="var(--accent)" /> Latest Exam Mark
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                      {observations?.school_factors?.actual_score ?? observations?.school_factors?.previous_scores ?? 75} / 100
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>From examination results</div>
                  </div>

                  <div style={{ padding: '14px 16px', background: 'rgba(249, 115, 22, 0.08)', borderRadius: 16, border: '1px solid rgba(249, 115, 22, 0.25)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#F97316', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Moon size={14} /> Sleep (Parent Reported)
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                      {observations?.parent_factors?.sleep_hours ?? 7.0} hrs/night
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Home factor preserved</div>
                  </div>

                  <div style={{ padding: '14px 16px', background: 'rgba(249, 115, 22, 0.08)', borderRadius: 16, border: '1px solid rgba(249, 115, 22, 0.25)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#F97316', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Home size={14} /> Parent Involvement
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                      {['Low', 'Moderate', 'High'][(observations?.parent_factors?.parental_involvement || 2) - 1]}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>From Parent Portal</div>
                  </div>
                </div>

                {/* Section Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <Sparkles size={18} color="var(--accent)" />
                  <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
                    Teacher Classroom Observations (Feeds Model)
                  </h4>
                </div>

                {/* Teacher Factor Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
                  
                  {/* Motivation */}
                  <div style={{ padding: 20, background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text)' }}>
                        Classroom Motivation Level (1–5)
                      </label>
                      <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1.1rem' }}>
                        {motivation} / 5
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {motivation <= 1 ? '1: Disengaged / Uninterested in lectures' :
                       motivation === 2 ? '2: Below average enthusiasm' :
                       motivation === 3 ? '3: Steady participation & attentive' :
                       motivation === 4 ? '4: High curiosity & proactive' : '5: Exceptional academic drive'}
                    </div>
                    <input 
                      type="range" min={1} max={5} step={1}
                      value={motivation}
                      onChange={e => setMotivation(parseInt(e.target.value))}
                      className="slider"
                      style={{ width: '100%', marginTop: 6 }}
                    />
                  </div>

                  {/* Peer Influence */}
                  <div style={{ padding: 20, background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text)' }}>
                        Class Peer Dynamics (1–3)
                      </label>
                      <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1.1rem' }}>
                        {peerInfluence === 1 ? '1: Distracted' : peerInfluence === 2 ? '2: Neutral' : '3: Positive'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {peerInfluence === 1 ? '1: Off-task peer circle during classroom activities' :
                       peerInfluence === 2 ? '2: Neutral peer interactions' : '3: Active peer study group / positive collaboration'}
                    </div>
                    <input 
                      type="range" min={1} max={3} step={1}
                      value={peerInfluence}
                      onChange={e => setPeerInfluence(parseInt(e.target.value))}
                      className="slider"
                      style={{ width: '100%', marginTop: 6 }}
                    />
                  </div>

                  {/* Teacher Guidance / Mentorship */}
                  <div style={{ padding: 20, background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text)' }}>
                        Faculty Mentorship & Guidance (1–3)
                      </label>
                      <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1.1rem' }}>
                        {teacherQuality === 1 ? '1: Low' : teacherQuality === 2 ? '2: Standard' : '3: Intensive'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {teacherQuality === 1 ? '1: Infrequent 1-on-1 interaction' :
                       teacherQuality === 2 ? '2: Standard lecture support' : '3: Dedicated mentoring & extra doubt resolution'}
                    </div>
                    <input 
                      type="range" min={1} max={3} step={1}
                      value={teacherQuality}
                      onChange={e => setTeacherQuality(parseInt(e.target.value))}
                      className="slider"
                      style={{ width: '100%', marginTop: 6 }}
                    />
                  </div>

                  {/* Tutoring Sessions */}
                  <div style={{ padding: 20, background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text)' }}>
                        Tutoring / Doubt Sessions Attended
                      </label>
                      <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1.1rem' }}>
                        {tutoringSessions} sessions
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Number of remedial / doubt sessions attended this month
                    </div>
                    <input 
                      type="range" min={0} max={8} step={1}
                      value={tutoringSessions}
                      onChange={e => setTutoringSessions(parseInt(e.target.value))}
                      className="slider"
                      style={{ width: '100%', marginTop: 6 }}
                    />
                  </div>

                </div>

                {/* Save Bar */}
                <div style={{ marginTop: 12, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AnimatePresence>
                    {saved && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--risk-low)', fontWeight: 700, fontSize: '0.95rem' }}>
                        <CheckCircle size={18} /> Classroom observations saved & prediction updated
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSave} 
                    disabled={saving}
                    style={{ 
                      borderRadius: 14, padding: '0 32px', marginLeft: 'auto', 
                      background: 'var(--accent)', border: 'none', height: 48, 
                      fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 
                    }}
                  >
                    {saving ? 'Syncing...' : <><Save size={18} /> Save Classroom Factors & Update Prediction</>}
                  </button>
                </div>

              </motion.div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', padding: 60 }}>
                <SlidersHorizontal size={48} opacity={0.4} style={{ marginBottom: 16 }} />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text)' }}>Select a Student</h3>
                <p style={{ maxWidth: 360, fontSize: '0.95rem' }}>Choose any student from your class roster on the left to review their combined profile and input classroom observations.</p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
