import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, BookOpen, Moon, Activity, Brain, Home, Users,
  ChevronDown, ChevronUp, Lightbulb, HeartHandshake, Shield,
  Target, Clock, Wifi, MessageSquare, BarChart3, Sparkles
} from 'lucide-react';

interface GuideSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  tips: { heading: string; body: string }[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'overview',
    icon: <Sparkles size={22} />,
    title: 'How AcadIQ Works',
    subtitle: 'Understanding the AI-powered academic prediction system',
    color: '#F97316',
    tips: [
      {
        heading: 'What is AcadIQ?',
        body: 'AcadIQ uses a machine learning model trained on student data — including attendance, exam marks, and behavioral observations from both teachers and parents — to predict academic performance and identify students who may need extra support.'
      },
      {
        heading: 'How are predictions made?',
        body: 'The ML model takes 12 key features (attendance, study hours, sleep, parental involvement, motivation, etc.) and generates a predicted exam score along with a risk level (Low, Medium, or High). The model recomputes predictions every time new data is submitted.'
      },
      {
        heading: 'What does risk level mean?',
        body: 'Low Risk (🟢) means your child is on track. Medium Risk (🟡) means some areas need attention. High Risk (🔴) means the model identifies significant concern — teachers are alerted and interventions may be recommended.'
      },
      {
        heading: 'Your role as a parent',
        body: 'You provide home-side data (sleep hours, study time, parental involvement, learning resources, physical activity) that the model cannot observe in school. This data is crucial for accurate predictions and personalized recommendations.'
      },
    ]
  },
  {
    id: 'sleep',
    icon: <Moon size={22} />,
    title: 'Sleep & Rest',
    subtitle: 'Why adequate sleep directly impacts predicted scores',
    color: '#6366F1',
    tips: [
      {
        heading: 'Optimal Sleep Duration',
        body: 'Research shows 7–8 hours of sleep is ideal for cognitive performance. The ML model factors sleep hours heavily — students with less than 6 hours consistently score lower in predictions.'
      },
      {
        heading: 'Consistent Bedtime',
        body: 'Establishing a regular bedtime routine (same time ±30 minutes) improves memory consolidation during sleep. Inconsistent sleep patterns can reduce focus during school hours.'
      },
      {
        heading: 'Screen Time Before Bed',
        body: 'Reduce screen exposure (phones, tablets, computers) at least 1 hour before bedtime. Blue light disrupts melatonin production, delaying sleep onset and reducing sleep quality.'
      },
      {
        heading: 'Weekend Sleep Patterns',
        body: 'Avoid dramatic differences between weekday and weekend sleep schedules. "Catching up" on sleep on weekends doesn\'t fully compensate for weekday sleep deprivation.'
      },
    ]
  },
  {
    id: 'study',
    icon: <BookOpen size={22} />,
    title: 'Home Study Habits',
    subtitle: 'How daily study hours at home feed into the prediction model',
    color: '#10B981',
    tips: [
      {
        heading: 'Quality Over Quantity',
        body: 'The model tracks hours studied at home. However, 2 hours of focused study with breaks (Pomodoro technique: 25 min focus, 5 min break) is more effective than 4 hours of distracted studying.'
      },
      {
        heading: 'Dedicated Study Space',
        body: 'A quiet, well-lit study area free from distractions (TV, family conversations) significantly improves concentration. This is reflected in the "Access to Resources" factor in the model.'
      },
      {
        heading: 'Revision Strategy',
        body: 'Encourage active recall (testing yourself) rather than passive re-reading. Spaced repetition (reviewing material at increasing intervals) is proven to improve long-term retention.'
      },
      {
        heading: 'Assignment Completion',
        body: 'Regular completion of homework and assignments is tracked by teachers. Consistent assignment submission is a strong indicator of academic success in the model\'s predictions.'
      },
    ]
  },
  {
    id: 'involvement',
    icon: <HeartHandshake size={22} />,
    title: 'Parental Involvement',
    subtitle: 'Your engagement level is a direct model input',
    color: '#EC4899',
    tips: [
      {
        heading: 'What the Model Measures',
        body: 'The "Parental Involvement" factor (rated 1–3) captures how actively you participate in your child\'s education. Level 1 = occasional check-ins, Level 2 = regular monitoring, Level 3 = active daily study supervision.'
      },
      {
        heading: 'Ask About Their Day',
        body: 'Simple daily conversations about what they learned, challenges they faced, and upcoming tests keep you informed and show your child that education matters. Even 10 minutes of discussion makes a difference.'
      },
      {
        heading: 'Monitor, Don\'t Micromanage',
        body: 'Being involved means knowing what\'s happening academically, not doing their homework. Help them create study schedules, check assignment deadlines, and celebrate achievements.'
      },
      {
        heading: 'Parent-Teacher Communication',
        body: 'Use the Messages section to communicate regularly with teachers. Early communication about concerns prevents small issues from becoming larger problems. Teachers appreciate proactive parents.'
      },
    ]
  },
  {
    id: 'resources',
    icon: <Wifi size={22} />,
    title: 'Learning Resources',
    subtitle: 'Access to materials and technology affects predictions',
    color: '#3B82F6',
    tips: [
      {
        heading: 'Internet Access',
        body: 'Reliable internet access for research, online learning platforms, and educational videos is increasingly important. If internet access is limited, public libraries often offer free WiFi and computer access.'
      },
      {
        heading: 'Books & Reference Materials',
        body: 'Access to textbooks, reference guides, and supplementary study materials supports independent learning. Many free resources are available online (Khan Academy, NPTEL, etc.).'
      },
      {
        heading: 'Device Availability',
        body: 'Having a dedicated device (even a shared family computer with scheduled time slots) for educational purposes helps students access digital learning materials and complete online assignments.'
      },
      {
        heading: 'How This Affects the Model',
        body: 'The "Access to Resources" factor (rated 1–3) captures whether your child has the tools needed for academic success. Level 1 = shared/limited, Level 2 = moderate (books + WiFi), Level 3 = dedicated setup.'
      },
    ]
  },
  {
    id: 'physical',
    icon: <Activity size={22} />,
    title: 'Physical Activity & Health',
    subtitle: 'Exercise improves both mood and academic performance',
    color: '#F59E0B',
    tips: [
      {
        heading: 'Daily Exercise',
        body: 'At least 30–60 minutes of physical activity per day improves blood flow to the brain, reduces stress hormones, and enhances focus during study time. This is tracked by the model.'
      },
      {
        heading: 'Sports & Extracurriculars',
        body: 'Organized sports teach discipline, time management, and teamwork. Students who participate in physical activities tend to have better academic outcomes — the model captures this in the "Physical Activity" factor.'
      },
      {
        heading: 'Balanced Nutrition',
        body: 'Proper nutrition (breakfast, balanced meals, adequate hydration) directly impacts concentration and energy levels during school hours. Skipping breakfast is linked to reduced morning focus.'
      },
      {
        heading: 'Mental Well-being',
        body: 'Physical activity is one of the most effective stress-relief methods for students. If your child appears stressed, anxious, or overwhelmed, increasing physical activity and ensuring adequate rest can help.'
      },
    ]
  },
  {
    id: 'communication',
    icon: <MessageSquare size={22} />,
    title: 'Using AcadIQ Communication Tools',
    subtitle: 'How to message teachers and track your child\'s progress',
    color: '#14B8A6',
    tips: [
      {
        heading: 'Messages Feature',
        body: 'Use the "Messages" tab in the sidebar to send comments and feedback directly to your child\'s class advisor and school administration. All messages are logged and visible to the relevant staff.'
      },
      {
        heading: 'Dashboard Overview',
        body: 'The Home dashboard shows your child\'s current predicted score, risk level, real attendance, latest exam marks, and teacher motivation rating — all updated in real-time as new data arrives.'
      },
      {
        heading: 'Home Lifestyle Check-in',
        body: 'On the Home dashboard, use the interactive sliders to report sleep hours, study time, parental involvement, resource access, and physical activity. Submit regularly (weekly or whenever things change) for the most accurate predictions.'
      },
      {
        heading: 'Progress & Marks Pages',
        body: 'The Progress page shows prediction history and trends over time. The Marks page displays all recorded exam scores with grade analysis. The Attendance page shows detailed period-wise attendance logs.'
      },
    ]
  },
];

export default function ParentGuide() {
  const [expandedId, setExpandedId] = useState<string | null>('overview');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <header className="glass-card" style={{ padding: 32, borderRadius: 24, background: 'linear-gradient(135deg, var(--surface), rgba(249, 115, 22, 0.06))' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#F97316', background: 'rgba(249, 115, 22, 0.12)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 16 }}>
          <HelpCircle size={16} /> Parent Resource Center
        </div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
          Parent Guide
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '1.05rem', lineHeight: 1.5 }}>
          Learn how AcadIQ works, understand what factors affect your child's predictions, and get actionable tips to support their academic success.
        </p>

        {/* Quick Stats */}
        <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
          {[
            { icon: <Brain size={16} />, label: '12 ML Features', desc: 'tracked by the model' },
            { icon: <Shield size={16} />, label: '3 Risk Levels', desc: 'Low, Medium, High' },
            { icon: <Target size={16} />, label: '5 Home Factors', desc: 'reported by parents' },
            { icon: <BarChart3 size={16} />, label: 'Real-time', desc: 'predictions updated' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <span style={{ color: '#F97316' }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>{s.label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* Feature Explanation Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {GUIDE_SECTIONS.map((section, si) => {
          const isExpanded = expandedId === section.id;
          return (
            <motion.div key={section.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.04 }}>
              <div
                className="glass-card"
                style={{ borderRadius: 20, overflow: 'hidden', border: isExpanded ? `1px solid ${section.color}40` : '1px solid var(--border)', transition: 'border-color 0.3s' }}>

                {/* Accordion Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : section.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '20px 24px',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: `${section.color}18`, color: section.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {section.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>{section.title}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{section.subtitle}</div>
                  </div>
                  <div style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <ChevronDown size={20} />
                  </div>
                </button>

                {/* Accordion Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {section.tips.map((tip, ti) => (
                          <motion.div key={ti} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ti * 0.06 }}
                            style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <Lightbulb size={16} color={section.color} />
                              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>{tip.heading}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6, opacity: 0.85 }}>
                              {tip.body}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div style={{ padding: '20px 24px', background: 'rgba(249, 115, 22, 0.06)', borderRadius: 16, border: '1px solid rgba(249, 115, 22, 0.2)', textAlign: 'center' }}>
        <Home size={20} color="#F97316" style={{ marginBottom: 8 }} />
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.5 }}>
          <strong>Remember:</strong> AcadIQ is a tool to support — not replace — the human connection between parents, teachers, and students.
          Your involvement, encouragement, and understanding are the most powerful factors in your child's success.
        </p>
      </div>
    </div>
  );
}
