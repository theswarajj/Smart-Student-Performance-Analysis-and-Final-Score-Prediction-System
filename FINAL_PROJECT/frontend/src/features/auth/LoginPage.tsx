import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { demoApi, type DemoAccount } from '../../services/api';
import { Eye, EyeOff, GraduationCap, Users, Heart, Shield, Info, ArrowLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const roleConfig: Record<string, { icon: typeof GraduationCap; color: string; soft: string; tagline: string; idLabel: string }> = {
  student: { icon: GraduationCap, color: '#0D9488', soft: '#D5F3EF', tagline: 'Know where you stand. Know how to improve.', idLabel: 'Roll Number / Username' },
  teacher: { icon: Users, color: '#4F46E5', soft: '#E3E1FC', tagline: 'See who needs help before exams do.', idLabel: 'Staff ID / Email' },
  parent: { icon: Heart, color: '#F97316', soft: '#FDE6D3', tagline: "Stay informed about your child's progress.", idLabel: 'Registered Mobile / Email' },
  admin: { icon: Shield, color: '#475569', soft: '#E2E8F0', tagline: 'Manage users, data and model health.', idLabel: 'Email' },
};

export default function LoginPage() {
  const { role: urlRole } = useParams<{ role: string }>();
  const [role, setRole] = useState(urlRole || 'student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const navigate = useNavigate();
  const { login, user } = useAuth();

  useEffect(() => {
    if (user && (!urlRole || user.role === urlRole)) {
      navigate(`/${user.role}`);
    }
  }, [user, urlRole, navigate]);

  useEffect(() => {
    if (urlRole && roleConfig[urlRole]) setRole(urlRole);
  }, [urlRole]);

  useEffect(() => {
    demoApi.getCredentials().then(r => setDemoAccounts(r.accounts)).catch(() => {});
  }, []);

  const config = roleConfig[role] || roleConfig.student;
  const Icon = config.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) { setError('Please enter your username.'); return; }
    if (password.length < 3) { setError('Password is too short.'); return; }

    setLoading(true);
    try {
      await login(username, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc: DemoAccount) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setShowDemo(false);
    setRole(acc.role);
    setError('');
  };

  return (
    <div className="animated-bg" style={{ minHeight: '100vh', display: 'flex' }} data-role={role}>
      
      {/* Top Navigation */}
      <button 
        onClick={() => navigate('/')} 
        style={{ position: 'absolute', top: 24, left: 24, zIndex: 100, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.1)', padding: '8px 16px', borderRadius: 24, cursor: 'pointer', fontWeight: 600, color: 'var(--text)' }}
      >
        <ArrowLeft size={18} /> Back to Home
      </button>

      {/* Left panel – premium illustration */}
      <div className="hide-mobile" style={{
        flex: '0 0 45%', background: `linear-gradient(135deg, ${config.color}22, ${config.color}05)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px', position: 'relative', overflow: 'hidden'
      }}>
        {/* Decorative Background Elements */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%', background: `radial-gradient(circle, ${config.color}44 0%, transparent 70%)`, filter: 'blur(60px)', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60%', height: '60%', background: `radial-gradient(circle, ${config.color}33 0%, transparent 70%)`, filter: 'blur(60px)', zIndex: 0 }} />

        <motion.div key={role} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <div className="floating-element" style={{ width: 140, height: 140, borderRadius: '32px', background: `linear-gradient(135deg, ${config.soft}, #ffffff)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 40px',
            boxShadow: `0 24px 48px ${config.color}33`, border: `1px solid ${config.color}22` }}>
            <Icon size={64} color={config.color} />
          </div>
          
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '16px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {config.tagline}
          </h2>
          <div style={{ fontSize: '1.05rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '380px', lineHeight: 1.6 }}>
            AcadIQ uses academic records and study habits to predict your performance, identify risks early, and recommend personalised improvements.
          </div>
        </motion.div>
      </div>

      {/* Right panel – login form (Glassmorphism) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', position: 'relative', zIndex: 10 }}>
        
        <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '40px', borderRadius: '24px' }}>
          
          {/* Logo */}
          <div style={{ marginBottom: '32px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Sparkles size={24} color={config.color} />
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, margin: 0 }}>
              <span style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}CC)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AcadIQ</span>
            </h1>
          </div>

          {/* Role tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '40px', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '12px' }}>
            {Object.entries(roleConfig).map(([key, cfg]) => (
              <button key={key} onClick={() => { setRole(key); navigate(`/${key}/login`, { replace: true }); setError(''); }}
                style={{
                  flex: 1, padding: '10px 4px', border: 'none', background: role === key ? '#ffffff' : 'transparent',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: role === key ? 700 : 500,
                  color: role === key ? cfg.color : 'var(--text-muted)', borderRadius: '8px',
                  boxShadow: role === key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)', textTransform: 'capitalize',
                }}>
                {key}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={role} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.3 }}>
              
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text)' }}>
                  Welcome back, {role.charAt(0).toUpperCase() + role.slice(1)}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Please enter your details to sign in.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="input-group" style={{ marginBottom: '20px' }}>
                  <label htmlFor="username" style={{ fontSize: '0.85rem', fontWeight: 600, marginLeft: 4 }}>{config.idLabel}</label>
                  <input id="username" className={`input premium-input ${error ? 'input-error' : ''}`} type="text"
                    value={username} onChange={e => { setUsername(e.target.value); setError(''); }}
                    placeholder={`e.g. ${role === 'student' ? 'S1024' : role === 'teacher' ? 'teacher1' : role === 'admin' ? 'admin' : 'P1024'}`}
                    autoComplete="username" autoFocus />
                </div>

                <div className="input-group" style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="password" style={{ fontSize: '0.85rem', fontWeight: 600, marginLeft: 4 }}>Password</label>
                    <span style={{ fontSize: '0.75rem', color: config.color, cursor: 'pointer', fontWeight: 600 }}>Forgot password?</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input id="password" className={`input premium-input ${error ? 'input-error' : ''}`}
                      type={showPassword ? 'text' : 'password'}
                      value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      style={{ paddingRight: '40px' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    style={{ padding: '10px 14px', background: 'var(--risk-high-soft)', color: 'var(--risk-high)',
                      fontSize: '0.85rem', borderRadius: '10px', marginBottom: '20px', fontWeight: 500, border: '1px solid rgba(220, 38, 38, 0.2)' }}>
                    {error}
                  </motion.div>
                )}

                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
                  style={{ width: '100%', marginTop: '8px', background: `linear-gradient(135deg, ${config.color}, ${config.color}DD)`, fontSize: '1rem', fontWeight: 700, borderRadius: '12px', boxShadow: `0 8px 16px ${config.color}44`, border: 'none' }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <span className="skeleton" style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} /> Authenticating...
                    </span>
                  ) : 'Sign in securely'}
                </button>
              </form>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '32px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>

              {/* Demo credentials */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowDemo(!showDemo)} className="btn btn-secondary"
                  style={{ width: '100%', borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: '12px' }}>
                  <Info size={18} style={{ color: config.color }} /> Use Demo Credentials
                </button>
                
                <AnimatePresence>
                  {showDemo && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '12px',
                        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.1)', overflowY: 'auto', maxHeight: '350px', zIndex: 20 }}>
                      
                      <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Select an account to autofill
                      </div>

                      {demoAccounts.filter(acc => acc.role === role).map(acc => (
                        <button key={acc.username} onClick={() => fillDemo(acc)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '12px 16px',
                            background: 'none', border: 'none', borderBottom: '1px solid var(--border)',
                            cursor: 'pointer', fontSize: '0.85rem', transition: 'background 0.2s' }}
                          onMouseOver={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                          onMouseOut={e => (e.currentTarget.style.background = 'none')}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{acc.name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Role: <span style={{ textTransform: 'capitalize' }}>{acc.role}</span></div>
                          </div>
                          <div style={{ background: 'var(--surface)', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                            {acc.username}
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
