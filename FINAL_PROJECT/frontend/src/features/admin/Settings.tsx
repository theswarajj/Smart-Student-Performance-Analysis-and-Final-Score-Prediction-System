import { useState } from 'react';
import { Settings as SettingsIcon, Brain, Bell, Shield, Save, Check, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Settings State
  const [config, setConfig] = useState({
    academicYear: '2026-2027',
    term: 'Fall Semester',
    institutionName: 'AcadIQ Institute of Technology',
    highRiskThreshold: 50,
    lowRiskThreshold: 75,
    autoRetrain: true,
    retrainFrequency: 'Weekly',
    emailAlerts: true,
    smsAlerts: false,
    parentWeeklyDigest: true,
    teacherDailyDigest: true,
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  return (
    <div className="fade-in" style={{ padding: '0px 20px', maxWidth: 1000, margin: '0 auto' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <SettingsIcon size={32} color="var(--accent)" />
            System Settings
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: 600 }}>
            Configure application behaviour, AI thresholds, and global preferences.
          </p>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140, justifyContent: 'center' }}
        >
          {isSaving ? <RefreshCw size={18} className="spin" /> : (saved ? <Check size={18} /> : <Save size={18} />)}
          {isSaving ? 'Saving...' : (saved ? 'Saved!' : 'Save Changes')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        
        {/* Sidebar Tabs */}
        <div className="card" style={{ padding: 16, width: 250, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { id: 'general', icon: SettingsIcon, label: 'General' },
            { id: 'ai', icon: Brain, label: 'AI & Prediction Model' },
            { id: 'notifications', icon: Bell, label: 'Notifications' },
            { id: 'security', icon: Shield, label: 'Security & Access' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text)',
                border: 'none', borderRadius: 12, cursor: 'pointer',
                fontWeight: 600, fontSize: '0.95rem', transition: 'all 0.2s',
                textAlign: 'left'
              }}
            >
              <tab.icon size={18} color={activeTab === tab.id ? 'white' : 'var(--text-muted)'} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1 }}>
          
          {activeTab === 'general' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card" style={{ padding: 32 }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 24px 0', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>General Configuration</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Institution Name</label>
                  <input type="text" className="input premium-input" value={config.institutionName} onChange={e => setConfig({...config, institutionName: e.target.value})} style={{ width: '100%', maxWidth: 400 }} />
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Academic Year</label>
                    <select className="input premium-input" value={config.academicYear} onChange={e => setConfig({...config, academicYear: e.target.value})} style={{ width: '100%' }}>
                      <option>2025-2026</option>
                      <option>2026-2027</option>
                      <option>2027-2028</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Current Term</label>
                    <select className="input premium-input" value={config.term} onChange={e => setConfig({...config, term: e.target.value})} style={{ width: '100%' }}>
                      <option>Fall Semester</option>
                      <option>Spring Semester</option>
                      <option>Summer Session</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card" style={{ padding: 32 }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 24px 0', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>AI & Prediction Model</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>Automated Model Retraining</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Allow the AI model to update weights automatically as new data flows in.</div>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={config.autoRetrain} onChange={e => setConfig({...config, autoRetrain: e.target.checked})} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  {config.autoRetrain && (
                    <div style={{ marginTop: 12 }}>
                      <select className="input premium-input" value={config.retrainFrequency} onChange={e => setConfig({...config, retrainFrequency: e.target.value})}>
                        <option>Daily at Midnight</option>
                        <option>Weekly on Sunday</option>
                        <option>Monthly</option>
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 24 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>High Risk Threshold (Score &lt; X)</label>
                    <input type="number" className="input premium-input" value={config.highRiskThreshold} onChange={e => setConfig({...config, highRiskThreshold: parseInt(e.target.value)})} style={{ width: '100%' }} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Students predicted below this score will be flagged High Risk.</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Low Risk Threshold (Score &gt; X)</label>
                    <input type="number" className="input premium-input" value={config.lowRiskThreshold} onChange={e => setConfig({...config, lowRiskThreshold: parseInt(e.target.value)})} style={{ width: '100%' }} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Students predicted above this score are deemed Low Risk.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card" style={{ padding: 32 }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 24px 0', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>Communication & Alerts</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { key: 'emailAlerts', title: 'System Email Alerts', desc: 'Send critical system alerts via email.' },
                  { key: 'smsAlerts', title: 'SMS Notifications', desc: 'Send SMS messages to parents for urgent interventions.' },
                  { key: 'parentWeeklyDigest', title: 'Parent Weekly Digest', desc: 'Automatically email parents a summary of student performance.' },
                  { key: 'teacherDailyDigest', title: 'Teacher Daily Brief', desc: 'Send teachers a morning brief on High Risk students.' }
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--surface-2)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{item.title}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={(config as any)[item.key]} 
                        onChange={e => setConfig({...config, [item.key]: e.target.checked})} 
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card" style={{ padding: 32 }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 24px 0', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>Security & Access</h3>
              <p style={{ color: 'var(--text-muted)' }}>Manage API keys, SSO integrations, and session timeouts here.</p>
              
              <div style={{ marginTop: 24 }}>
                <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>Force Logout All Users</button>
              </div>
            </motion.div>
          )}

        </div>
      </div>
      
      {/* Global styles for toggle switch */}
      <style>{`
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        .toggle-switch input { 
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--border);
          transition: .3s;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
        }
        input:checked + .slider {
          background-color: var(--accent);
        }
        input:checked + .slider:before {
          transform: translateX(20px);
        }
        .slider.round {
          border-radius: 24px;
        }
        .slider.round:before {
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}
