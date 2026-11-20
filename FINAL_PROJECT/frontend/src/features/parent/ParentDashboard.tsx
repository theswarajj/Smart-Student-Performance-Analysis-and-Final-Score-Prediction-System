import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { parentApi, messageApi, type ChildInfo, type ParentContact } from '../../services/api';
import { formatScore } from '../../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HeartHandshake, Calendar, MessageSquare, GraduationCap, AlertCircle, 
  Clock, CheckCircle2, Home, Moon, BookOpen, Activity, Wifi, Save, Sparkles, School,
  X, Send, Shield, Users, Video, Phone, CheckCircle, ExternalLink, MapPin
} from 'lucide-react';

export default function ParentDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [contacts, setContacts] = useState<{ teachers: ParentContact[]; admins: ParentContact[] }>({ teachers: [], admins: [] });
  const [loading, setLoading] = useState(true);

  // Home Factor Form State for active child
  const [parentalInvolvement, setParentalInvolvement] = useState<number>(2);
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [hoursStudied, setHoursStudied] = useState<number>(3.5);
  const [accessToResources, setAccessToResources] = useState<number>(2);
  const [physicalActivity, setPhysicalActivity] = useState<number>(1.5);
  const [notes, setNotes] = useState<string>('');

  const [savingHome, setSavingHome] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Modal 1: Quick Message Modal
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [msgRecipientType, setMsgRecipientType] = useState<'teacher' | 'admin'>('teacher');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [msgSentSuccess, setMsgSentSuccess] = useState(false);

  // Modal 2: Schedule Meeting Modal
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  const [meetingDate, setMeetingDate] = useState(defaultDateStr);
  const [meetingTimeSlot, setMeetingTimeSlot] = useState('09:30 AM - 10:00 AM');
  const [meetingMode, setMeetingMode] = useState('In-Person (School Campus)');
  const [meetingAgenda, setMeetingAgenda] = useState('Academic Score & ML Prediction');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [isSchedulingMeeting, setIsSchedulingMeeting] = useState(false);
  const [meetingSuccessDetails, setMeetingSuccessDetails] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      parentApi.getChildren(user.id),
      parentApi.getContacts(user.id),
    ]).then(([resChildren, resContacts]) => {
      setChildren(resChildren);
      setContacts(resContacts);
      if (resChildren.length > 0) {
        setSelectedChildId(resChildren[0].id);
        initChildFactors(resChildren[0]);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  const initChildFactors = (c: ChildInfo) => {
    if (c.home_factors) {
      setParentalInvolvement(c.home_factors.parental_involvement || 2);
      setSleepHours(c.home_factors.sleep_hours || 7.5);
      setHoursStudied(c.home_factors.hours_studied || 3.5);
      setAccessToResources(c.home_factors.access_to_resources || 2);
      setPhysicalActivity(c.home_factors.physical_activity || 1.5);
    }
  };

  const handleChildSelect = (childId: number) => {
    setSelectedChildId(childId);
    const target = children.find(c => c.id === childId);
    if (target) initChildFactors(target);
  };

  const handleSaveHomeFactors = async () => {
    const activeChild = children.find(c => c.id === selectedChildId) || children[0];
    if (!activeChild) return;

    setSavingHome(true);
    try {
      await parentApi.submitObservation({
        student_id: activeChild.id,
        parental_involvement: parentalInvolvement,
        sleep_hours: sleepHours,
        hours_studied: hoursStudied,
        access_to_resources: accessToResources,
        physical_activity: physicalActivity,
        notes: notes || undefined,
      }, token || undefined);

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);

      // Refresh children data to reflect new prediction
      if (user) {
        const refreshed = await parentApi.getChildren(user.id);
        setChildren(refreshed);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save home observations.');
    } finally {
      setSavingHome(false);
    }
  };

  // Open Message Modal
  const handleOpenMessageModal = () => {
    const activeChild = children.find(c => c.id === selectedChildId) || children[0];
    setMsgRecipientType('teacher');
    setMsgSubject(`Inquiry regarding ${activeChild?.name || 'student'}'s academic progress`);
    setMsgBody('');
    setMsgSentSuccess(false);
    setShowMessageModal(true);
  };

  // Send message from modal
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgBody.trim() || !token) return;

    const activeChild = children.find(c => c.id === selectedChildId) || children[0];
    const targetTeacherId = activeChild?.teacher_id || (contacts.teachers[0]?.id ?? 2);
    const targetAdminId = contacts.admins[0]?.id ?? 1;
    const recipientId = msgRecipientType === 'teacher' ? targetTeacherId : targetAdminId;

    setIsSendingMsg(true);
    try {
      await messageApi.send({
        receiver_id: recipientId,
        subject: msgSubject || undefined,
        body: msgBody,
      }, token);

      setMsgSentSuccess(true);
      setTimeout(() => {
        setShowMessageModal(false);
        setMsgSentSuccess(false);
      }, 2500);
    } catch (err) {
      console.error(err);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSendingMsg(false);
    }
  };

  // Open Meeting Modal
  const handleOpenMeetingModal = () => {
    setMeetingSuccessDetails(null);
    setShowMeetingModal(true);
  };

  // Submit Meeting Request
  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const activeChild = children.find(c => c.id === selectedChildId) || children[0];
    const teacherId = activeChild?.teacher_id || (contacts.teachers[0]?.id ?? 2);

    setIsSchedulingMeeting(true);
    try {
      const res = await parentApi.requestMeeting({
        student_id: activeChild.id,
        teacher_id: teacherId,
        preferred_date: meetingDate,
        time_slot: meetingTimeSlot,
        mode: meetingMode,
        agenda: meetingAgenda,
        notes: meetingNotes || undefined,
      }, token);

      setMeetingSuccessDetails({
        teacherName: activeChild?.teacher_name || 'Class Advisor',
        date: meetingDate,
        timeSlot: meetingTimeSlot,
        mode: meetingMode,
        agenda: meetingAgenda,
        status: 'Pending Advisor Confirmation',
      });
    } catch (err) {
      console.error(err);
      alert('Failed to submit meeting request. Please try again.');
    } finally {
      setIsSchedulingMeeting(false);
    }
  };

  if (loading) return <div className="bento-grid"><div className="tile span-12"><div className="skeleton" style={{ height: 400, width: '100%' }} /></div></div>;

  if (children.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 64, textAlign: 'center' }}>
        <HeartHandshake size={64} style={{ color: '#F97316', margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 12px' }}>Welcome to AcadIQ!</h3>
        <p style={{ color: 'var(--text-muted)' }}>Please contact the school administrator to link your child's account to your profile.</p>
      </div>
    );
  }

  const child = children.find(c => c.id === selectedChildId) || children[0];

  const getStatusText = (risk?: string, name?: string) => {
    if (risk === 'High') return `${name} could use extra support right now. Their teachers and home habits are being monitored.`;
    if (risk === 'Medium') return `${name} is doing okay, with a few areas to strengthen.`;
    if (risk === 'Low') return `${name} is on track and doing well.`;
    return `Waiting for ${name}'s latest check-in data.`;
  };

  const getRiskColor = (risk?: string) => {
    if (risk === 'High') return 'var(--risk-high)';
    if (risk === 'Medium') return 'var(--risk-medium)';
    if (risk === 'Low') return 'var(--risk-low)';
    return 'var(--text-muted)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, maxWidth: 1200, margin: '0 auto' }}>
      
      {/* Header and Child Switcher */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#F97316', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
            <Sparkles size={16} /> Parent Portal & Machine Learning Insights
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 700, margin: 0 }}>
            {child.name}'s Academic Dashboard
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.95rem' }}>
            Class: <strong>{child.class_name}</strong> • Class Advisor: <strong>{child.teacher_name}</strong>
          </p>
        </div>

        {children.length > 1 && (
          <div style={{ display: 'flex', gap: 8, background: 'var(--surface-2)', padding: 4, borderRadius: 24, border: '1px solid var(--border)' }}>
            {children.map(c => (
              <button 
                key={c.id} 
                onClick={() => handleChildSelect(c.id)}
                style={{
                  padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: selectedChildId === c.id ? 700 : 500,
                  background: selectedChildId === c.id ? '#F97316' : 'transparent',
                  color: selectedChildId === c.id ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s'
                }}>
                {c.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Content Bento */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={child.id}
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -15 }}
          className="bento-grid"
        >
          {/* Tile 1: Status & Predicted Score */}
          <div className="tile span-8 glass-card" style={{ padding: 28, borderRadius: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }} />
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 16, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 600 }}>
                  <GraduationCap size={14} color="#F97316" /> Academic Status Overview
                </div>
                {child.prediction && (
                  <span style={{ 
                    padding: '6px 14px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700,
                    background: `${getRiskColor(child.prediction.risk)}22`, 
                    color: getRiskColor(child.prediction.risk),
                    border: `1px solid ${getRiskColor(child.prediction.risk)}44`
                  }}>
                    {child.prediction.risk} Risk Profile
                  </span>
                )}
              </div>

              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 700, margin: '0 0 8px', color: 'var(--text)' }}>
                  {child.statusText || getStatusText(child.prediction?.risk, child.name)}
                </h3>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem', lineHeight: 1.6 }}>
                  Our AI continuously updates this outlook based on classroom engagement, attendance records, and your home habit inputs below.
                </p>
              </div>
            </div>

            {/* Score & Prediction Meter */}
            <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div style={{ padding: 18, background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>ML Predicted Final Score</div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#F97316', margin: '4px 0' }}>
                  {child.prediction ? `${formatScore(child.prediction.predictedScore)}%` : 'Pending'}
                </div>
                {child.prediction && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Expected Range: {child.prediction.interval[0]}% – {child.prediction.interval[1]}%
                  </div>
                )}
              </div>

              <div style={{ padding: 18, background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Recent Exam Benchmark</div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text)', margin: '4px 0' }}>
                  {child.actual_score ? `${child.actual_score}%` : 'N/A'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Subject: {child.subject || 'General Coursework'}
                </div>
              </div>
            </div>
          </div>

          {/* Tile 2: Quick Metrics Pill */}
          <div className="tile span-4 glass-card" style={{ padding: 28, borderRadius: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>
                Classroom Indicators
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Clock size={18} color="#F97316" />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Attendance</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>College requirement &gt;75%</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: (child.attendance || 0) < 75 ? 'var(--risk-high)' : 'var(--risk-low)' }}>
                    {child.attendance ? `${child.attendance}%` : 'N/A'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BookOpen size={18} color="#F97316" />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Class Engagement</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rated by teacher (1-5)</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F97316' }}>
                    {child.school_factors?.learning_engagement || child.school_factors?.motivation || 3}/5
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <School size={18} color="#F97316" />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Enrolled Department</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{child.department}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                    Sem {child.semester}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Want detailed progress history?</span>
              <button 
                onClick={() => navigate('/parent/progress')} 
                style={{ background: 'none', border: 'none', color: '#F97316', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                View Charts <ExternalLink size={13} />
              </button>
            </div>
          </div>

          {/* Tile 3: Interactive Home Lifestyle Check-in Form */}
          <div className="tile span-12 glass-card" style={{ padding: 32, borderRadius: 24, position: 'relative' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#F97316', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>
                  <Home size={15} /> Model Feature Inputs (Parent's Role)
                </div>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                  Home Lifestyle & Well-being Check-in
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0' }}>
                  Your input here updates your child's home behavioral factors in the AcadIQ machine learning model.
                </p>
              </div>

              {savedSuccess && (
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '6px 16px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} /> Inputs synced to ML Model!
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
              
              {/* Parental Involvement */}
              <div style={{ padding: 18, background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>
                    Parental Study Support (1–3)
                  </label>
                  <span style={{ fontWeight: 800, color: '#F97316' }}>
                    {parentalInvolvement === 1 ? 'Low' : parentalInvolvement === 2 ? 'Moderate' : 'High'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {parentalInvolvement === 1 ? '1: Busy / minimal check-in' : parentalInvolvement === 2 ? '2: Regular encouragement & review' : '3: Active daily study supervision'}
                </div>
                <input 
                  type="range" min={1} max={3} step={1}
                  value={parentalInvolvement}
                  onChange={e => setParentalInvolvement(parseInt(e.target.value))}
                  className="slider"
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>

              {/* Nightly Sleep */}
              <div style={{ padding: 18, background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Moon size={15} color="#F97316" /> Nightly Sleep Hours
                  </label>
                  <span style={{ fontWeight: 800, color: '#F97316' }}>
                    {sleepHours} hrs
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Target: 7–8 hours for optimal memory retention
                </div>
                <input 
                  type="range" min={4} max={10} step={0.5}
                  value={sleepHours}
                  onChange={e => setSleepHours(parseFloat(e.target.value))}
                  className="slider"
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>

              {/* Home Study Hours */}
              <div style={{ padding: 18, background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BookOpen size={15} color="#F97316" /> Daily Home Study Hours
                  </label>
                  <span style={{ fontWeight: 800, color: '#F97316' }}>
                    {hoursStudied} hrs/day
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Self-study, assignments, and exam revision at home
                </div>
                <input 
                  type="range" min={0} max={10} step={0.5}
                  value={hoursStudied}
                  onChange={e => setHoursStudied(parseFloat(e.target.value))}
                  className="slider"
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>

              {/* Access to Resources */}
              <div style={{ padding: 18, background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Wifi size={15} color="#F97316" /> Home Learning Resources (1–3)
                  </label>
                  <span style={{ fontWeight: 800, color: '#F97316' }}>
                    {accessToResources === 1 ? 'Basic' : accessToResources === 2 ? 'Adequate' : 'Dedicated / High'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {accessToResources === 1 ? '1: Shared device / intermittent internet' : accessToResources === 2 ? '2: Books + standard WiFi' : '3: Quiet study room + personal PC + high-speed internet'}
                </div>
                <input 
                  type="range" min={1} max={3} step={1}
                  value={accessToResources}
                  onChange={e => setAccessToResources(parseInt(e.target.value))}
                  className="slider"
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>

              {/* Physical Activity */}
              <div style={{ padding: 18, background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Activity size={15} color="#F97316" /> Sports & Exercise
                  </label>
                  <span style={{ fontWeight: 800, color: '#F97316' }}>
                    {physicalActivity} hrs/day
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Recreation, sports, or physical activity outside school
                </div>
                <input 
                  type="range" min={0} max={4} step={0.5}
                  value={physicalActivity}
                  onChange={e => setPhysicalActivity(parseFloat(e.target.value))}
                  className="slider"
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>

              {/* Notes */}
              <div style={{ padding: 18, background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>
                  Home Notes for Class Teacher
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Attending online tutorial on weekends..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="input"
                  style={{ borderRadius: 10, fontSize: '0.85rem', width: '100%', height: 38 }}
                />
              </div>

            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button 
                className="btn" 
                onClick={handleSaveHomeFactors}
                disabled={savingHome}
                style={{ 
                  background: '#F97316', color: '#fff', border: 'none', padding: '12px 28px', 
                  borderRadius: 14, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(249, 115, 22, 0.3)' 
                }}
              >
                {savingHome ? 'Saving & Recomputing...' : <><Save size={18} /> Submit Home Observations to ML Model</>}
              </button>
            </div>
          </div>

          {/* ACTIVE ACTION BUTTONS: MESSAGE CLASS TEACHER & SCHEDULE MEETING */}
          <div className="span-12" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <button 
              className="btn"
              onClick={handleOpenMessageModal}
              style={{ 
                flex: 1, minWidth: 260, padding: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, 
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
                fontSize: '0.98rem', fontWeight: 700, color: 'var(--text)', cursor: 'pointer',
                transition: 'all 0.2s', boxShadow: 'var(--shadow-1)'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#F97316'; e.currentTarget.style.color = '#F97316'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}
            >
              <MessageSquare size={20} color="#F97316" /> Message Class Teacher ({child.teacher_name})
            </button>
            
            <button 
              className="btn"
              onClick={handleOpenMeetingModal}
              style={{ 
                flex: 1, minWidth: 260, padding: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, 
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08), rgba(249, 115, 22, 0.03))',
                border: '1px solid #F97316', borderRadius: 16,
                fontSize: '0.98rem', fontWeight: 700, color: '#F97316', cursor: 'pointer',
                transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(249, 115, 22, 0.15)'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F97316'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(249, 115, 22, 0.08), rgba(249, 115, 22, 0.03))'; e.currentTarget.style.color = '#F97316'; }}
            >
              <Calendar size={20} /> Request Parent-Teacher Meeting
            </button>
          </div>

        </motion.div>
      </AnimatePresence>

      {/* ── MODAL 1: MESSAGE CLASS TEACHER / ADMIN ────────────────── */}
      <AnimatePresence>
        {showMessageModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20
          }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card"
              style={{
                background: 'var(--surface)', maxWidth: 580, width: '100%',
                borderRadius: 24, padding: 28, boxShadow: 'var(--shadow-3)',
                border: '1px solid var(--border)', position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(249, 115, 22, 0.15)', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Quick Message</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Regarding {child.name} • {child.class_name}</div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMessageModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>

              {/* Recipient switcher */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Recipient:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setMsgRecipientType('teacher')}
                    style={{
                      padding: '10px 14px', borderRadius: 12, border: msgRecipientType === 'teacher' ? '2px solid #F97316' : '1px solid var(--border)',
                      background: msgRecipientType === 'teacher' ? 'rgba(249, 115, 22, 0.08)' : 'var(--surface-2)',
                      cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                      fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)'
                    }}>
                    <GraduationCap size={16} color="#F97316" />
                    <div>
                      <div>Teacher</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{child.teacher_name}</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMsgRecipientType('admin')}
                    style={{
                      padding: '10px 14px', borderRadius: 12, border: msgRecipientType === 'admin' ? '2px solid #6366F1' : '1px solid var(--border)',
                      background: msgRecipientType === 'admin' ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface-2)',
                      cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                      fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)'
                    }}>
                    <Shield size={16} color="#6366F1" />
                    <div>
                      <div>School Admin</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Dr. Admin (Office)</div>
                    </div>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                    Subject:
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={msgSubject}
                    onChange={e => setMsgSubject(e.target.value)}
                    required
                    style={{ borderRadius: 10, width: '100%', height: 40, fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                    Message:
                  </label>
                  <textarea
                    className="input premium-input"
                    rows={4}
                    value={msgBody}
                    onChange={e => setMsgBody(e.target.value)}
                    placeholder={msgRecipientType === 'teacher' ? `Ask ${child.teacher_name} about study habits, attendance, or upcoming tests...` : "Submit administrative inquiry or report request..."}
                    required
                    style={{ borderRadius: 12, width: '100%', padding: 12, fontSize: '0.9rem', resize: 'vertical' }}
                  />
                </div>

                {msgSentSuccess ? (
                  <div style={{
                    padding: '12px 16px', borderRadius: 12,
                    background: 'rgba(16, 185, 129, 0.15)', color: '#10B981',
                    fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <CheckCircle size={18} /> Message delivered successfully! Notified to recipient.
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => { setShowMessageModal(false); navigate(`/parent/messages?to=${msgRecipientType}`); }}
                      style={{ background: 'none', border: 'none', color: '#F97316', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                      Open full message center
                    </button>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => setShowMessageModal(false)}
                        style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', fontSize: '0.88rem' }}>
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSendingMsg || !msgBody.trim()}
                        style={{
                          padding: '8px 22px', borderRadius: 10, border: 'none',
                          background: msgRecipientType === 'admin' ? 'linear-gradient(135deg, #6366F1, #4F46E5)' : 'linear-gradient(135deg, #F97316, #EA580C)',
                          color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: (isSendingMsg || !msgBody.trim()) ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6
                        }}>
                        {isSendingMsg ? 'Sending...' : <><Send size={15} /> Send Message</>}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: SCHEDULE PARENT-TEACHER MEETING ──────────────── */}
      <AnimatePresence>
        {showMeetingModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20
          }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card"
              style={{
                background: 'var(--surface)', maxWidth: 620, width: '100%',
                borderRadius: 24, padding: 28, boxShadow: 'var(--shadow-3)',
                border: '1px solid var(--border)', position: 'relative',
                maxHeight: '90vh', overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(249, 115, 22, 0.15)', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Schedule Parent-Teacher Consultation</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Advisor: <strong>{child.teacher_name}</strong> • Student: <strong>{child.name}</strong> ({child.class_name})
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMeetingModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>

              {meetingSuccessDetails ? (
                /* Success View */
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '16px 0' }}>
                  <div style={{
                    padding: 24, borderRadius: 20, background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center'
                  }}>
                    <CheckCircle size={48} color="#10B981" style={{ margin: '0 auto 12px' }} />
                    <h4 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>
                      Meeting Request Submitted!
                    </h4>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                      A formal meeting consultation invitation has been sent to <strong>{meetingSuccessDetails.teacherName}</strong>.
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div style={{ padding: 18, background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Requested Date:</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{meetingSuccessDetails.date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Time Slot:</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{meetingSuccessDetails.timeSlot}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Format:</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{meetingSuccessDetails.mode}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Discussion Agenda:</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F97316' }}>{meetingSuccessDetails.agenda}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, padding: '2px 8px', borderRadius: 8, background: 'rgba(249, 115, 22, 0.15)', color: '#F97316' }}>
                        {meetingSuccessDetails.status}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                    This meeting request has been added to the advisor's support log and your message history.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                    <button
                      onClick={() => { setShowMeetingModal(false); navigate('/parent/messages'); }}
                      style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>
                      View in Messages
                    </button>
                    <button
                      onClick={() => setShowMeetingModal(false)}
                      style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: '#F97316', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem' }}>
                      Done
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Schedule Form */
                <form onSubmit={handleScheduleMeeting} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  
                  {/* Preferred Date */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                      Preferred Date:
                    </label>
                    <input
                      type="date"
                      min={todayStr}
                      value={meetingDate}
                      onChange={e => setMeetingDate(e.target.value)}
                      required
                      className="input"
                      style={{ borderRadius: 12, width: '100%', height: 42, fontSize: '0.92rem' }}
                    />
                  </div>

                  {/* Time Slot Picker */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                      Preferred Time Slot:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        '09:30 AM - 10:00 AM (Morning)',
                        '11:30 AM - 12:00 PM (Mid-day)',
                        '02:30 PM - 03:00 PM (Afternoon)',
                        '04:00 PM - 04:30 PM (Post-Class)'
                      ].map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setMeetingTimeSlot(slot.split(' (')[0])}
                          style={{
                            padding: '10px 12px', borderRadius: 10, border: meetingTimeSlot === slot.split(' (')[0] ? '2px solid #F97316' : '1px solid var(--border)',
                            background: meetingTimeSlot === slot.split(' (')[0] ? 'rgba(249, 115, 22, 0.08)' : 'var(--surface-2)',
                            color: 'var(--text)', fontSize: '0.82rem', fontWeight: meetingTimeSlot === slot.split(' (')[0] ? 700 : 500,
                            cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s'
                          }}>
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Meeting Mode */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                      Meeting Format:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {[
                        { mode: 'In-Person (School Campus)', icon: <MapPin size={15} />, label: 'In-Person' },
                        { mode: 'Online Video (Google Meet)', icon: <Video size={15} />, label: 'Video Call' },
                        { mode: 'Phone Consultation', icon: <Phone size={15} />, label: 'Phone Call' },
                      ].map(m => (
                        <button
                          key={m.mode}
                          type="button"
                          onClick={() => setMeetingMode(m.mode)}
                          style={{
                            padding: '10px', borderRadius: 10, border: meetingMode === m.mode ? '2px solid #F97316' : '1px solid var(--border)',
                            background: meetingMode === m.mode ? 'rgba(249, 115, 22, 0.08)' : 'var(--surface-2)',
                            color: meetingMode === m.mode ? '#F97316' : 'var(--text)',
                            fontSize: '0.84rem', fontWeight: meetingMode === m.mode ? 700 : 500,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            transition: 'all 0.15s'
                          }}>
                          {m.icon} {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Discussion Agenda */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                      Discussion Focus:
                    </label>
                    <select
                      value={meetingAgenda}
                      onChange={e => setMeetingAgenda(e.target.value)}
                      className="input"
                      style={{ borderRadius: 12, width: '100%', height: 42, fontSize: '0.92rem', padding: '0 12px' }}
                    >
                      <option value="Academic Score & ML Prediction">Academic Score & ML Prediction Review</option>
                      <option value="Attendance & Punctuality">Attendance & Punctuality Support</option>
                      <option value="Classroom Engagement & Motivation">Classroom Engagement & Motivation</option>
                      <option value="Home Study Routine & Sleep Habits">Home Study Routine & Sleep Habits</option>
                      <option value="Upcoming Final Exam Preparation">Upcoming Final Exam Preparation Strategy</option>
                      <option value="Comprehensive Progress Consultation">Comprehensive Semester Review</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                      Specific Questions or Notes for Teacher (Optional):
                    </label>
                    <textarea
                      rows={3}
                      value={meetingNotes}
                      onChange={e => setMeetingNotes(e.target.value)}
                      placeholder="e.g. Would like to discuss math test scores and extra tutoring sessions..."
                      className="input premium-input"
                      style={{ borderRadius: 12, width: '100%', padding: 12, fontSize: '0.9rem', resize: 'vertical' }}
                    />
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      onClick={() => setShowMeetingModal(false)}
                      style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSchedulingMeeting}
                      style={{
                        padding: '10px 28px', borderRadius: 12, border: 'none',
                        background: 'linear-gradient(135deg, #F97316, #EA580C)',
                        color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: isSchedulingMeeting ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(249, 115, 22, 0.3)'
                      }}>
                      {isSchedulingMeeting ? 'Submitting...' : <><Calendar size={18} /> Request Meeting</>}
                    </button>
                  </div>

                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
