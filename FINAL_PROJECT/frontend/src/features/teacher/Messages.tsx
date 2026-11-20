import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, User, Clock, Inbox, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { messageApi, classApi, type Message, type ClassInfo, type ClassStudent } from '../../services/api';

export default function Messages() {
  const { user, token } = useAuth();
  
  const [messages, setMessages] = useState<{ sent: Message[]; received: Message[] }>({ sent: [], received: [] });
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'compose'>('received');
  
  // Compose State
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [receiverId, setReceiverId] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  // Fetch messages
  useEffect(() => {
    if (!user) return;
    messageApi.getAll(user.id)
      .then(setMessages)
      .catch(console.error);
  }, [user, activeTab]); // Refresh when tab changes

  // Fetch classes for compose
  useEffect(() => {
    if (!user || activeTab !== 'compose') return;
    classApi.getAll(user.id).then(res => {
      setClasses(res);
      if (res.length > 0) setSelectedClass(res[0].id);
    }).catch(console.error);
  }, [user, activeTab]);

  // Fetch students for selected class
  useEffect(() => {
    if (!selectedClass || activeTab !== 'compose') return;
    classApi.getStudents(selectedClass).then(res => {
      setStudents(res);
      if (res.length > 0) setReceiverId(res[0].id);
    }).catch(console.error);
  }, [selectedClass, activeTab]);

  const handleSend = async () => {
    if (!receiverId || !body || !token) return;
    setSending(true);
    try {
      await messageApi.send({
        receiver_id: receiverId,
        subject: subject || 'No Subject',
        body
      }, token);
      
      setToast('Message sent successfully!');
      setTimeout(() => setToast(''), 3000);
      setSubject('');
      setBody('');
      setActiveTab('sent');
    } catch (err) {
      console.error(err);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32, maxWidth: 1000, margin: '0 auto', height: '100%' }}>
      
      {/* Header */}
      <header className="glass-card" style={{ padding: '32px', borderRadius: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, var(--surface), var(--surface-2))' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 16 }}>
            <MessageSquare size={16} /> Secure Communications
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>Messages</h2>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '1.05rem', maxWidth: 600 }}>
            Communicate directly with your assigned students regarding their risk profiles or academic progress.
          </p>
        </div>
      </header>

      {/* Success Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ background: 'var(--risk-low-soft)', color: 'var(--risk-low)', padding: '16px 24px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, border: '1px solid var(--risk-low)' }}>
            <CheckCircle size={20} /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', gap: 24 }}>
        
        {/* Sidebar */}
        <div style={{ width: 250, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button 
            onClick={() => setActiveTab('compose')}
            className="btn btn-primary"
            style={{ borderRadius: 16, padding: '16px', background: activeTab === 'compose' ? 'var(--accent)' : 'var(--surface-2)', color: activeTab === 'compose' ? '#fff' : 'var(--text)', border: 'none', justifyContent: 'flex-start', fontSize: '1.05rem' }}
          >
            <Send size={18} style={{ marginRight: 12 }} /> Compose
          </button>
          
          <button 
            onClick={() => setActiveTab('received')}
            className="btn"
            style={{ borderRadius: 16, padding: '16px', background: activeTab === 'received' ? 'var(--surface-3)' : 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', justifyContent: 'flex-start', fontSize: '1.05rem' }}
          >
            <Inbox size={18} style={{ marginRight: 12, color: 'var(--accent)' }} /> Inbox
            <span style={{ marginLeft: 'auto', background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 800 }}>{messages.received.length}</span>
          </button>

          <button 
            onClick={() => setActiveTab('sent')}
            className="btn"
            style={{ borderRadius: 16, padding: '16px', background: activeTab === 'sent' ? 'var(--surface-3)' : 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', justifyContent: 'flex-start', fontSize: '1.05rem' }}
          >
            <MessageSquare size={18} style={{ marginRight: 12, color: 'var(--text-muted)' }} /> Sent
          </button>
        </div>

        {/* Main Content Area */}
        <div className="glass-card" style={{ flex: 1, borderRadius: 24, padding: 32, minHeight: 500, background: 'var(--surface)' }}>
          
          {activeTab === 'compose' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 800 }}>New Message</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>1. Select Class</label>
                  <select className="input premium-input" value={selectedClass || ''} onChange={e => setSelectedClass(Number(e.target.value))}>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>2. Select Student</label>
                  <select className="input premium-input" value={receiverId || ''} onChange={e => setReceiverId(Number(e.target.value))}>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} (Roll: {s.id})</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Subject</label>
                <input 
                  type="text" 
                  className="input premium-input" 
                  placeholder="e.g. Discussing recent performance" 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Message Body</label>
                <textarea 
                  className="input premium-input" 
                  placeholder="Type your message here..." 
                  rows={6}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button 
                  onClick={handleSend}
                  disabled={sending || !body || !receiverId}
                  className="btn btn-primary" 
                  style={{ padding: '12px 32px', borderRadius: 16, background: 'var(--accent)' }}
                >
                  {sending ? 'Sending...' : <><Send size={18} style={{ marginRight: 8 }} /> Send Message</>}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab !== 'compose' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.4rem', fontWeight: 800 }}>
                {activeTab === 'received' ? 'Inbox' : 'Sent Messages'}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {messages[activeTab].length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                    <Inbox size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                    <p>No messages found in this folder.</p>
                  </div>
                ) : (
                  messages[activeTab].map(msg => (
                    <div key={msg.id} style={{ padding: 20, borderRadius: 16, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                            <User size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--text)' }}>
                              {activeTab === 'received' ? msg.sender_name : msg.receiver_name}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              {activeTab === 'received' ? 'From' : 'To'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <Clock size={14} /> {formatDate(msg.created_at)}
                        </div>
                      </div>
                      
                      <div style={{ paddingLeft: 52 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{msg.subject || 'No Subject'}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                          {msg.body}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
          
        </div>
      </div>
    </div>
  );
}
