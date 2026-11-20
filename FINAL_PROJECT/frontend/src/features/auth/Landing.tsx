import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Heart, Shield, BarChart3, Brain, Lightbulb, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Landing() {
  const navigate = useNavigate();

  const roles = [
    { key: 'student', icon: GraduationCap, label: 'Student', desc: 'Track your performance and get personalised tips', color: '#0D9488', soft: '#D5F3EF' },
    { key: 'teacher', icon: Users, label: 'Teacher', desc: 'Spot students who need help before exams do', color: '#4F46E5', soft: '#E3E1FC' },
    { key: 'parent', icon: Heart, label: 'Parent', desc: "Stay informed about your child's progress", color: '#F97316', soft: '#FDE6D3' },
    { key: 'admin', icon: Shield, label: 'Admin', desc: 'Manage users, data and model health', color: '#475569', soft: '#E2E8F0' },
  ];

  const steps = [
    { icon: BarChart3, label: 'Collect', desc: 'Academic & behavioural data' },
    { icon: Brain, label: 'Predict', desc: 'ML-powered score prediction' },
    { icon: Lightbulb, label: 'Explain', desc: 'Factor impact & risk analysis' },
    { icon: TrendingUp, label: 'Improve', desc: 'Personalised recommendations' },
  ];

  return (
    <div className="animated-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header - Glassmorphism */}
      <header className="glass" style={{ position: 'sticky', top: 0, zIndex: 100, padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={24} color="#0D9488" />
          <span style={{ background: 'linear-gradient(135deg, #0D9488, #4F46E5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AcadIQ</span>
        </h1>
        <button className="btn btn-primary" style={{ borderRadius: '24px', padding: '10px 24px' }} onClick={() => navigate('/student/login')}>
          Sign In
        </button>
      </header>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '100px 24px 60px', maxWidth: '900px', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(13, 148, 136, 0.1)', color: '#0D9488', borderRadius: '32px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '32px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0D9488', boxShadow: '0 0 10px #0D9488' }}></span>
            Powered by Advanced Machine Learning
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '24px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
            The Future of <br />
            <span style={{ background: 'linear-gradient(135deg, #0D9488, #4F46E5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Student Success.</span>
          </h2>
          
          <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '680px', margin: '0 auto 50px', lineHeight: 1.6, fontWeight: 400 }}>
            An intelligent ecosystem that combines academic records with behavioural insights to predict outcomes, identify risks early, and provide actionable recommendations.
          </p>
        </motion.div>

        {/* Role Cards - Glass & Hover Effects */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', maxWidth: '960px', margin: '0 auto 80px', position: 'relative', zIndex: 10 }}>
          {roles.map((role, i) => (
            <motion.div key={role.key}
              className="glass-card"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.1, ease: "easeOut" }}
              onClick={() => navigate(`/${role.key}/login`)}
              style={{
                borderRadius: '20px', padding: '32px 24px', cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', textAlign: 'center', position: 'relative', overflow: 'hidden',
              }}
              whileHover={{ y: -8, boxShadow: `0 20px 40px ${role.color}33`, borderColor: role.color }}
            >
              <div className="floating-element" style={{ width: 64, height: 64, borderRadius: '18px', background: `linear-gradient(135deg, ${role.soft}, #ffffff)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: `0 10px 20px ${role.color}15`, border: `1px solid ${role.color}33` }}>
                <role.icon size={32} color={role.color} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '10px', color: 'var(--text)' }}>{role.label}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{role.desc}</p>
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: role.color, fontWeight: 700, fontSize: '0.9rem' }}>
                Enter Portal <ChevronRight size={16} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* How it works */}
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, marginBottom: '32px', color: 'var(--text)' }}>
            The AcadIQ Engine
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
            {steps.map((step, i) => (
              <motion.div key={step.label}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
                style={{ flex: '1 1 200px', padding: '24px', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(13, 148, 136, 0.1)', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <step.icon size={24} />
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '8px', color: 'var(--text)' }}>{step.label}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass" style={{ textAlign: 'center', padding: '32px 24px', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 'auto' }}>
        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 500 }}>
          <Shield size={16} /> Predictions are meant to support students, not to label them.
        </p>
        <p style={{ marginTop: '12px' }}>AcadIQ – Smart Student Performance Analysis © 2026</p>
      </footer>
    </div>
  );
}
