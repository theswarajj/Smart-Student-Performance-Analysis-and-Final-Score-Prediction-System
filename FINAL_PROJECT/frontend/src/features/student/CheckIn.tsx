import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { checkinApi, type CheckinInput } from '../../services/api';
import { ClipboardCheck, ArrowRight, Save, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentCheckIn() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Default values matching typical dataset median/mode
  const [data, setData] = useState<Partial<CheckinInput>>({
    attendance: 80,
    hours_studied: 15,
    previous_scores: 70,
    tutoring_sessions: 0,
    motivation: 1,
    concentration: 1,
    learning_engagement: 1,
    preparation_confidence: 1,
    study_consistency: 1,
    sleep_hours: 7,
    physical_activity: 3,
    parental_involvement: 1,
    peer_influence: 1,
    access_to_resources: 1,
    teacher_quality: 1,
  });

  const update = (key: keyof CheckinInput, val: number) => setData({ ...data, [key]: val });

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await checkinApi.create({ ...data, student_id: user.id } as CheckinInput);
      navigate('/student/dashboard');
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const steps = [
    { title: 'Academic Progress', icon: Activity },
    { title: 'Study Habits', icon: ClipboardCheck },
    { title: 'Wellbeing & Support', icon: ClipboardCheck },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 0' }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Weekly Check-in</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Update your progress so we can provide accurate predictions.</p>

      {/* Progress Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: step > i ? 'var(--accent)' : 'var(--border)', transition: 'background 0.3s' }} />
        ))}
      </div>

      <div className="tile" style={{ padding: 32 }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          {(() => { const Icon = steps[step - 1].icon; return <Icon size={20} color="var(--accent)" />; })()} {steps[step - 1].title}
        </h3>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="input-group">
              <label>Attendance (%)</label>
              <input type="number" className="input" value={data.attendance} onChange={e => update('attendance', Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label>Weekly Study Hours</label>
              <input type="number" className="input" value={data.hours_studied} onChange={e => update('hours_studied', Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label>Average of Previous Scores (0-100)</label>
              <input type="number" className="input" value={data.previous_scores} onChange={e => update('previous_scores', Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label>Tutoring Sessions this month</label>
              <input type="number" className="input" value={data.tutoring_sessions} onChange={e => update('tutoring_sessions', Number(e.target.value))} />
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { key: 'motivation', label: 'How motivated are you feeling?' },
              { key: 'concentration', label: 'How well can you concentrate?' },
              { key: 'learning_engagement', label: 'How engaged are you in class?' },
              { key: 'preparation_confidence', label: 'How confident do you feel about exams?' },
              { key: 'study_consistency', label: 'How consistent is your study routine?' }
            ].map(f => (
              <div key={f.key} className="input-group">
                <label>{f.label}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Low', 'Medium', 'High'].map((lbl, i) => (
                    <button key={i} type="button" 
                      onClick={() => update(f.key as keyof CheckinInput, i)}
                      style={{ flex: 1, padding: '10px', border: '1px solid', borderRadius: 'var(--r-sm)', background: data[f.key as keyof CheckinInput] === i ? 'var(--accent)' : 'transparent', color: data[f.key as keyof CheckinInput] === i ? '#fff' : 'var(--text)', borderColor: data[f.key as keyof CheckinInput] === i ? 'var(--accent)' : 'var(--border)', cursor: 'pointer' }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="input-group">
              <label>Average Sleep (hours/night)</label>
              <input type="number" className="input" value={data.sleep_hours} onChange={e => update('sleep_hours', Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label>Physical Activity (hours/week)</label>
              <input type="number" className="input" value={data.physical_activity} onChange={e => update('physical_activity', Number(e.target.value))} />
            </div>
            {[
              { key: 'parental_involvement', label: 'Support from home' },
              { key: 'peer_influence', label: 'Influence from friends' },
              { key: 'access_to_resources', label: 'Access to learning materials' },
              { key: 'teacher_quality', label: 'Teaching support' }
            ].map(f => (
              <div key={f.key} className="input-group">
                <label>{f.label}</label>
                <select className="input" value={data[f.key as keyof CheckinInput]} onChange={e => update(f.key as keyof CheckinInput, Number(e.target.value))}>
                  <option value={0}>Low</option>
                  <option value={1}>Medium</option>
                  <option value={2}>High</option>
                </select>
              </div>
            ))}
          </motion.div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={step === 1}>Back</button>
          {step < 3 ? (
            <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Next <ArrowRight size={16} /></button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : <><Save size={16} /> Finish & Predict</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
