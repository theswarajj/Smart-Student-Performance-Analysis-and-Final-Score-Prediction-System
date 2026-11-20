import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { messageApi, parentApi, type Message, type ParentContact } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, User, CheckCircle, Mail, MailOpen,
  ChevronDown, Inbox, ArrowUpRight, Users, Clock, Shield,
  GraduationCap, Sparkles, AlertCircle
} from 'lucide-react';

type Tab = 'compose' | 'sent' | 'received';

export default function ParentMessages() {
  const { user, token } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('compose');
  const [sent, setSent] = useState<Message[]>([]);
  const [received, setReceived] = useState<Message[]>([]);
  const [teachers, setTeachers] = useState<ParentContact[]>([]);
  const [admins, setAdmins] = useState<ParentContact[]>([]);
  const [contacts, setContacts] = useState<ParentContact[]>([]);
  const [loading, setLoading] = useState(true);

  // Compose state
  const [receiverId, setReceiverId] = useState<number | null>(null);
  const [recipientType, setRecipientType] = useState<'teacher' | 'admin'>('teacher');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadAll = async () => {
      try {
        const [msgData, contactData] = await Promise.all([
          messageApi.getAll(user.id),
          parentApi.getContacts(user.id),
        ]);
        setSent(msgData.sent || []);
        setReceived(msgData.received || []);
        
        const teacherList = contactData.teachers || [];
        const adminList = contactData.admins || [];
        setTeachers(teacherList);
        setAdmins(adminList);
        const allContacts = [...teacherList, ...adminList];
        setContacts(allContacts);

        // Check URL params for recipient preference
        const targetType = searchParams.get('to');
        const targetTeacherId = searchParams.get('teacher_id');
        const initialSubject = searchParams.get('subject');
        if (initialSubject) setSubject(initialSubject);

        if (targetType === 'admin' && adminList.length > 0) {
          setRecipientType('admin');
          setReceiverId(adminList[0].id);
        } else if (targetTeacherId) {
          const match = teacherList.find(t => t.id === Number(targetTeacherId));
          if (match) {
            setRecipientType('teacher');
            setReceiverId(match.id);
          } else if (teacherList.length > 0) {
            setRecipientType('teacher');
            setReceiverId(teacherList[0].id);
          }
        } else if (teacherList.length > 0) {
          setRecipientType('teacher');
          setReceiverId(teacherList[0].id);
        } else if (adminList.length > 0) {
          setRecipientType('admin');
          setReceiverId(adminList[0].id);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [user, searchParams]);

  // Handle switching category
  const selectCategory = (type: 'teacher' | 'admin') => {
    setRecipientType(type);
    if (type === 'teacher' && teachers.length > 0) {
      setReceiverId(teachers[0].id);
    } else if (type === 'admin' && admins.length > 0) {
      setReceiverId(admins[0].id);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !receiverId || !token) return;

    setIsSending(true);
    try {
      await messageApi.send({ receiver_id: receiverId, subject: subject || undefined, body }, token);

      // Refresh messages
      if (user) {
        const msgData = await messageApi.getAll(user.id);
        setSent(msgData.sent || []);
        setReceived(msgData.received || []);
      }

      setBody('');
      setSubject('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3500);
    } catch (err) {
      console.error(err);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const selectedContact = contacts.find(c => c.id === receiverId);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('en-IN', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Quick message templates
  const teacherTemplates = [
    {
      title: 'Academic Progress Inquiry',
      subj: 'Inquiry regarding recent academic performance and ML predictions',
      body: 'Dear Teacher, I noticed the recent score prediction for my child in the AcadIQ portal. Could you provide some guidance on specific topics they should focus on to improve before the next assessment?',
    },
    {
      title: 'Attendance Clarification',
      subj: 'Clarification regarding recent classroom attendance record',
      body: 'Dear Teacher, I am writing to review my child\'s attendance logs. Please let me know if there are any specific missed sessions we should catch up on.',
    },
    {
      title: 'Study Habits & Homework',
      subj: 'Guidance on home study routine and consistency',
      body: 'Dear Teacher, I would appreciate your advice on how many study hours and revision strategies you recommend at home for the current semester syllabus.',
    },
  ];

  const adminTemplates = [
    {
      title: 'Official Academic Transcript',
      subj: 'Request for official student report card and transcript',
      body: 'Dear School Administration, I would like to request an official stamped copy of my child\'s academic marks and performance report for the current term.',
    },
    {
      title: 'Attendance Correction Inquiry',
      subj: 'Administrative inquiry regarding attendance records',
      body: 'Dear Administration, I would like to verify an attendance entry on the parent portal that appears to have an unrecorded excused absence. Kindly advise on the procedure.',
    },
    {
      title: 'Parent Portal Support',
      subj: 'Parent portal account and student linking assistance',
      body: 'Dear Administration, I am writing to confirm our contact information and ensure all student notifications and reports are properly linked to our portal profile.',
    },
    {
      title: 'Fee & Document Verification',
      subj: 'General administrative query regarding documentation',
      body: 'Dear Administration, please provide details regarding the timeline for the upcoming semester registration and required administrative clearances.',
    },
  ];

  const applyTemplate = (tmpl: { subj: string; body: string }) => {
    setSubject(tmpl.subj);
    setBody(tmpl.body);
  };

  if (loading) return (
    <div className="bento-grid"><div className="tile span-12"><div className="skeleton" style={{ height: 400, width: '100%' }} /></div></div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <header className="glass-card" style={{ padding: '32px', borderRadius: 24, background: 'linear-gradient(135deg, var(--surface), var(--surface-2))' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#F97316', background: 'rgba(249, 115, 22, 0.12)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 16 }}>
          <MessageSquare size={16} /> Parent Communication Center
        </div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>Messages</h2>
        <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '1.05rem' }}>
          Connect directly with your child's <strong>Class Teacher</strong> for academic queries, or the <strong>School Administrator</strong> for official records and administration.
        </p>
      </header>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 16, border: '1px solid var(--border)' }}>
        {([
          { id: 'compose' as Tab, icon: <Send size={16} />, label: 'Compose Message', count: 0 },
          { id: 'received' as Tab, icon: <Inbox size={16} />, label: 'Inbox', count: received.filter(m => !m.is_read).length },
          { id: 'sent' as Tab, icon: <ArrowUpRight size={16} />, label: 'Sent History', count: sent.length },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? '#F97316' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 700 : 500, fontSize: '0.92rem', transition: 'all 0.2s',
            }}>
            {tab.icon} {tab.label}
            {tab.count > 0 && (
              <span style={{
                width: 22, height: 22, borderRadius: '50%', fontSize: '0.72rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: activeTab === tab.id ? 'rgba(255,255,255,0.3)' : 'var(--risk-high)',
                color: '#fff',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* COMPOSE TAB */}
        {activeTab === 'compose' && (
          <motion.div key="compose" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="glass-card" style={{ borderRadius: 24, padding: 32, position: 'relative' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Send size={20} color="#F97316" /> Compose New Message
              </h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Select a recipient category below
              </span>
            </div>

            {/* QUICK RECIPIENT SWITCHER: TEACHER VS ADMIN */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                Choose Recipient:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                
                {/* Option 1: Class Teacher */}
                <button
                  type="button"
                  onClick={() => selectCategory('teacher')}
                  style={{
                    padding: '16px 18px',
                    borderRadius: 16,
                    border: recipientType === 'teacher' ? '2px solid #F97316' : '1px solid var(--border)',
                    background: recipientType === 'teacher' ? 'rgba(249, 115, 22, 0.08)' : 'var(--surface-2)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    transition: 'all 0.2s',
                    boxShadow: recipientType === 'teacher' ? '0 4px 16px rgba(249, 115, 22, 0.15)' : 'none',
                  }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: recipientType === 'teacher' ? '#F97316' : 'rgba(249, 115, 22, 0.15)',
                    color: recipientType === 'teacher' ? '#fff' : '#F97316',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <GraduationCap size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text)' }}>Class Teacher</span>
                      {recipientType === 'teacher' && (
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, background: '#F97316', color: '#fff', fontWeight: 700 }}>
                          Selected
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {teachers.length > 0 ? `${teachers[0].name} (${teachers[0].class_name})` : 'Class Academic Advisor'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 600, marginTop: 4 }}>
                      • Academic progress, marks, study guidance
                    </div>
                  </div>
                </button>

                {/* Option 2: School Administrator */}
                <button
                  type="button"
                  onClick={() => selectCategory('admin')}
                  style={{
                    padding: '16px 18px',
                    borderRadius: 16,
                    border: recipientType === 'admin' ? '2px solid #6366F1' : '1px solid var(--border)',
                    background: recipientType === 'admin' ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface-2)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    transition: 'all 0.2s',
                    boxShadow: recipientType === 'admin' ? '0 4px 16px rgba(99, 102, 241, 0.15)' : 'none',
                  }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: recipientType === 'admin' ? '#6366F1' : 'rgba(99, 102, 241, 0.15)',
                    color: recipientType === 'admin' ? '#fff' : '#6366F1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Shield size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text)' }}>School Administrator</span>
                      {recipientType === 'admin' && (
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, background: '#6366F1', color: '#fff', fontWeight: 700 }}>
                          Selected
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {admins.length > 0 ? `${admins[0].name} (Office of Administration)` : 'School Administration Office'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#6366F1', fontWeight: 600, marginTop: 4 }}>
                      • Official records, portal support, inquiries
                    </div>
                  </div>
                </button>

              </div>
            </div>

            {/* Recipient Dropdown (if multiple contacts exist in selected category) */}
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Selected Contact:
                </label>
                {(recipientType === 'teacher' ? teachers : admins).length > 1 && (
                  <button type="button" onClick={() => setContactDropdownOpen(!contactDropdownOpen)}
                    style={{ background: 'none', border: 'none', color: '#F97316', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
                    Change specific recipient
                  </button>
                )}
              </div>

              <button type="button" onClick={() => setContactDropdownOpen(!contactDropdownOpen)}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderRadius: 14, border: '1px solid var(--border)',
                  background: 'var(--surface-2)', cursor: 'pointer', fontSize: '0.92rem', color: 'var(--text)',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: recipientType === 'admin' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                    color: recipientType === 'admin' ? '#6366F1' : '#F97316',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {recipientType === 'admin' ? <Shield size={18} /> : <User size={18} />}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>{selectedContact?.name || 'Select Contact'}</div>
                    {selectedContact && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {selectedContact.role_label} • {selectedContact.class_name} {selectedContact.email ? `(${selectedContact.email})` : ''}
                      </div>
                    )}
                  </div>
                </div>
                <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
              </button>

              {contactDropdownOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: 4,
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
                  boxShadow: 'var(--shadow-3)', overflow: 'hidden', maxHeight: 280, overflowY: 'auto'
                }}>
                  {/* Teachers section */}
                  <div style={{ padding: '8px 14px', background: 'var(--surface-2)', fontSize: '0.75rem', fontWeight: 700, color: '#F97316', textTransform: 'uppercase' }}>
                    Class Teachers & Advisors
                  </div>
                  {teachers.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setReceiverId(c.id); setRecipientType('teacher'); setContactDropdownOpen(false); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                        background: receiverId === c.id ? 'rgba(249, 115, 22, 0.08)' : 'transparent',
                        border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border)',
                      }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(249, 115, 22, 0.12)', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <GraduationCap size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.role_label} • {c.class_name}</div>
                      </div>
                    </button>
                  ))}

                  {/* Admins section */}
                  <div style={{ padding: '8px 14px', background: 'var(--surface-2)', fontSize: '0.75rem', fontWeight: 700, color: '#6366F1', textTransform: 'uppercase' }}>
                    School Administration
                  </div>
                  {admins.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setReceiverId(c.id); setRecipientType('admin'); setContactDropdownOpen(false); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                        background: receiverId === c.id ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border)',
                      }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.role_label} • Office of Administration</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* QUICK TEMPLATES */}
            <div style={{ marginBottom: 18, padding: 14, background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                <Sparkles size={14} color="#F97316" /> Quick Message Topics (Click to Auto-fill):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(recipientType === 'teacher' ? teacherTemplates : adminTemplates).map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyTemplate(tmpl)}
                    style={{
                      padding: '6px 12px', borderRadius: 20, border: '1px solid var(--border)',
                      background: 'var(--surface)', fontSize: '0.78rem', color: 'var(--text)',
                      cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#F97316'; e.currentTarget.style.color = '#F97316'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}
                  >
                    + {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Subject */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Subject:</label>
                <input
                  type="text"
                  className="input"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder={recipientType === 'teacher' ? "e.g. Question regarding recent exam performance" : "e.g. Request for official progress transcript"}
                  style={{ borderRadius: 12, fontSize: '0.92rem', width: '100%', height: 42 }}
                />
              </div>

              {/* Body */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Message Body:</label>
                <textarea
                  className="input premium-input"
                  rows={5}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder={recipientType === 'teacher' ? "Type your academic inquiry or note for the teacher..." : "Type your administrative request or question for school office..."}
                  style={{ resize: 'vertical', minHeight: 120, padding: 16, fontSize: '0.95rem', borderRadius: 12 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={14} color="#10B981" /> Messages are logged securely and notified to the recipient.
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={isSending || !body.trim() || !receiverId}
                  style={{
                    borderRadius: 12, padding: '0 32px', height: 46,
                    background: recipientType === 'admin' ? 'linear-gradient(135deg, #6366F1, #4F46E5)' : 'linear-gradient(135deg, #F97316, #EA580C)',
                    border: 'none', fontWeight: 700, fontSize: '0.95rem',
                    display: 'flex', alignItems: 'center', gap: 8,
                    cursor: (isSending || !body.trim() || !receiverId) ? 'not-allowed' : 'pointer',
                    opacity: (!body.trim() || !receiverId) ? 0.5 : 1,
                    boxShadow: recipientType === 'admin' ? '0 4px 14px rgba(99, 102, 241, 0.3)' : '0 4px 14px rgba(249, 115, 22, 0.3)'
                  }}>
                  {isSending ? 'Sending...' : <><Send size={16} /> Send to {recipientType === 'admin' ? 'Administrator' : 'Class Teacher'}</>}
                </button>
              </div>
            </form>

            <AnimatePresence>
              {showSuccess && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{
                    marginTop: 16,
                    background: 'rgba(16, 185, 129, 0.12)', color: '#10B981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '12px 20px', borderRadius: 14,
                    display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: '0.92rem'
                  }}>
                  <CheckCircle size={18} /> Message delivered successfully! The recipient has been notified.
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}

        {/* INBOX TAB */}
        {activeTab === 'received' && (
          <motion.div key="received" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {received.length === 0 ? (
              <div className="glass-card" style={{ padding: 60, textAlign: 'center', borderRadius: 24 }}>
                <Inbox size={48} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <h4 style={{ margin: '0 0 6px', fontWeight: 700 }}>No Messages in Inbox</h4>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.92rem' }}>
                  Messages from class teachers or administrators will appear here.
                </p>
              </div>
            ) : (
              received.map(msg => (
                <div key={msg.id} className="glass-card"
                  style={{
                    padding: 20, borderRadius: 18, borderLeft: msg.is_read ? '1px solid var(--border)' : '4px solid #F97316',
                    display: 'flex', flexDirection: 'column', gap: 8
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(249, 115, 22, 0.12)', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {msg.is_read ? <MailOpen size={16} /> : <Mail size={16} />}
                      </div>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{msg.sender_name || 'Staff Member'}</span>
                        {msg.subject && (
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>{msg.subject}</div>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} /> {formatDate(msg.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.92rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6, paddingLeft: 44 }}>
                    {msg.body}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* SENT TAB */}
        {activeTab === 'sent' && (
          <motion.div key="sent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sent.length === 0 ? (
              <div className="glass-card" style={{ padding: 60, textAlign: 'center', borderRadius: 24 }}>
                <ArrowUpRight size={48} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <h4 style={{ margin: '0 0 6px', fontWeight: 700 }}>No Sent Messages</h4>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.92rem' }}>
                  Use the compose tab to write to your child's teachers or school administration.
                </p>
              </div>
            ) : (
              sent.map(msg => (
                <div key={msg.id} className="glass-card"
                  style={{
                    padding: 20, borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 8,
                    borderLeft: '4px solid #10B981'
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowUpRight size={16} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>To: </span>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{msg.receiver_name || 'Staff Member'}</span>
                        {msg.subject && (
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>{msg.subject}</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                        background: 'rgba(16, 185, 129, 0.15)', color: '#10B981'
                      }}>
                        <CheckCircle size={11} /> Delivered
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={13} /> {formatDate(msg.created_at)}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.92rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6, paddingLeft: 44 }}>
                    {msg.body}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
