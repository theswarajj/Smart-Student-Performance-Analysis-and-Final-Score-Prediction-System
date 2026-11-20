import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getGreeting, getInitials } from '../utils/helpers';
import {
  LayoutDashboard, TrendingUp, Lightbulb, FlaskConical, Target,
  ClipboardCheck, CalendarDays, BookOpen, Clock, MessageSquare,
  Bell, Sun, Moon, LogOut, Menu, X, ChevronDown, User
} from 'lucide-react';

const studentNav = [
  { to: '/student', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/student/performance', icon: TrendingUp, label: 'Performance' },
  { to: '/student/insights', icon: Lightbulb, label: 'Insights' },
  { to: '/student/what-if', icon: FlaskConical, label: 'What-If Lab' },
  { to: '/student/planner', icon: Target, label: 'Planner' },
  { to: '/student/check-in', icon: ClipboardCheck, label: 'Check-in' },
  { to: '/student/attendance', icon: CalendarDays, label: 'Attendance' },
  { to: '/student/marks', icon: BookOpen, label: 'Marks' },
  { to: '/student/timetable', icon: Clock, label: 'Timetable' },
  { to: '/student/messages', icon: MessageSquare, label: 'Messages' },
];

export default function StudentShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('acadiq_theme') as 'light' | 'dark') || 'light';
  });
  const [profileOpen, setProfileOpen] = useState(false);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('acadiq_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="app-shell" data-role="student" data-theme={theme}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--collapsed'}`}>
        <div className="sidebar__header">
          {sidebarOpen && <h2 className="sidebar__logo">AcadIQ</h2>}
          <button className="btn btn-ghost btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)}
                  aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav className="sidebar__nav">
          {studentNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.name}</div>
              <div className="text-muted" style={{ fontSize: '11px', textTransform: 'capitalize' }}>Student</div>
            </div>
          )}
          <button
            className="btn btn-ghost btn-icon"
            title="Sign out"
            id="student-signout-btn"
            onClick={() => { logout(); navigate('/student/login'); }}
            style={{ color: 'var(--danger)', flexShrink: 0 }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-area">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar__left">
            <button className="btn btn-ghost btn-icon sidebar-toggle-mobile" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={20} />
            </button>
            <span className="topbar__greeting">
              {getGreeting()}, <strong>{user?.name?.split(' ')[0]}</strong>
            </span>
          </div>
          <div className="topbar__right">
            <button className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="btn btn-ghost btn-icon topbar__bell" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <div className="topbar__profile" style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setProfileOpen(!profileOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <div className="avatar avatar-sm">{getInitials(user?.name || 'S')}</div>
                {sidebarOpen && <ChevronDown size={14} />}
              </button>
              {profileOpen && (
                <div className="topbar__dropdown">
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600 }}>{user?.name}</div>
                    <div className="text-muted" style={{ fontSize: '12px' }}>{user?.department} · Sem {user?.semester}</div>
                  </div>
                  <button className="topbar__dropdown-item" onClick={() => { setProfileOpen(false); navigate('/student/profile'); }}>
                    <User size={16} /> Profile
                  </button>
                  <button className="topbar__dropdown-item" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content page-enter">
          <Outlet />
        </main>
      </div>

      <style>{shellStyles}</style>
    </div>
  );
}

const shellStyles = `
.app-shell {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}

.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: width var(--dur-base) var(--ease-out);
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 100;
  overflow-x: hidden;
}
.sidebar--open { width: var(--sidebar-w); }
.sidebar--collapsed { width: var(--sidebar-collapsed); }

.sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4);
  min-height: var(--topbar-h);
}
.sidebar__logo {
  font-family: var(--font-heading);
  font-size: var(--fs-h3);
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}

.sidebar__nav {
  flex: 1;
  padding: var(--sp-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.sidebar__link {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-sm);
  color: var(--text-muted);
  font-size: var(--fs-sm);
  font-weight: 500;
  transition: all var(--dur-fast) var(--ease-out);
  text-decoration: none;
  white-space: nowrap;
}
.sidebar__link:hover {
  color: var(--text);
  background: var(--surface-2);
}
.sidebar__link--active {
  color: var(--accent) !important;
  background: var(--accent-soft) !important;
  font-weight: 600;
}

.main-area {
  flex: 1;
  margin-left: var(--sidebar-w);
  transition: margin-left var(--dur-base) var(--ease-out);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.sidebar--collapsed ~ .main-area,
.sidebar--collapsed + .main-area {
  margin-left: var(--sidebar-collapsed);
}

.topbar {
  height: var(--topbar-h);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-6);
  position: sticky;
  top: 0;
  z-index: 50;
}
.topbar__left {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.topbar__right {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.topbar__greeting {
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
.topbar__greeting strong { color: var(--text); }
.topbar__bell { position: relative; }

.topbar__dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-3);
  min-width: 200px;
  z-index: 200;
  overflow: hidden;
}
.topbar__dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  width: 100%;
  padding: var(--sp-3) var(--sp-4);
  background: none;
  border: none;
  font-size: var(--fs-sm);
  color: var(--text);
  cursor: pointer;
  text-align: left;
}
.topbar__dropdown-item:hover { background: var(--surface-2); }

.page-content {
  flex: 1;
  padding: var(--sp-6);
  max-width: var(--content-max);
  width: 100%;
}

.sidebar-toggle-mobile { display: none; }

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    width: var(--sidebar-w) !important;
  }
  .sidebar--open { transform: translateX(0); }
  .main-area { margin-left: 0 !important; }
  .sidebar-toggle-mobile { display: flex; }
  .page-content { padding: var(--sp-4); }
}
`;
