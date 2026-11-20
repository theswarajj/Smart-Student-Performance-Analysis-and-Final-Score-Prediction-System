import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { adminApi, type UserCreateInput, type AdminUser } from '../../services/api';
import { UserPlus, Search, User as UserIcon, Upload, MoreVertical, Key, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserManagement() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  
  // Add User Form State
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<UserCreateInput>({
    username: '',
    password: '',
    role: 'student',
    name: '',
    email: '',
    department: '',
    semester: 1
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getUsers(undefined, token || undefined);
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') loadUsers();
  }, [user]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    try {
      await adminApi.createUser(formData, token);
      setIsAdding(false);
      loadUsers();
      setFormData({ username: '', password: '', role: 'student', name: '', email: '', department: '', semester: 1 });
    } catch (err) {
      console.error(err);
      alert('Error adding user. Username may already exist.');
    }
  };

  const filtered = users.filter(u => {
    if (roleFilter !== 'All' && u.role !== roleFilter.toLowerCase()) return false;
    if (search && !(u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  if (loading) return <div className="bento-grid"><div className="tile span-12"><div className="skeleton" style={{ height: 400, width: '100%' }} /></div></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 700, margin: 0 }}>Users</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>Manage access for students, teachers, parents, and admins.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <Upload size={16} /> Bulk Import
          </button>
          <button className="btn btn-primary" onClick={() => setIsAdding(!isAdding)}>
            <UserPlus size={16} /> {isAdding ? 'Cancel' : 'Add User'}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div className="tile" style={{ padding: 24, marginBottom: 16, border: '1px solid var(--accent)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0 0 16px' }}>Create New User</h3>
              <form onSubmit={handleAddSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: 4, display: 'block' }}>Full Name</label>
                  <input type="text" className="input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: 4, display: 'block' }}>Username</label>
                  <input type="text" className="input" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: 4, display: 'block' }}>Role</label>
                  <select className="input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="parent">Parent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: 4, display: 'block' }}>Password</label>
                  <input type="password" className="input" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: 4, display: 'block' }}>Email</label>
                  <input type="email" className="input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                {formData.role === 'student' && (
                  <>
                    <div className="input-group">
                      <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: 4, display: 'block' }}>Department</label>
                      <input type="text" className="input" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: 4, display: 'block' }}>Semester</label>
                      <input type="number" className="input" required min={1} max={10} value={formData.semester} onChange={e => setFormData({...formData, semester: Number(e.target.value)})} />
                    </div>
                  </>
                )}
                {formData.role === 'teacher' && (
                  <div className="input-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: 4, display: 'block' }}>Department</label>
                    <input type="text" className="input" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                  </div>
                )}
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="submit" className="btn btn-primary">Save User</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="tile" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', background: 'var(--surface)' }}>
          <div className="input-group" style={{ flex: 1, minWidth: 250, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="input" placeholder="Search by name or username..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, width: '100%' }} />
          </div>
          
          <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 6, padding: 2 }}>
            {['All', 'Student', 'Teacher', 'Parent', 'Admin'].map(f => (
              <button key={f} onClick={() => setRoleFilter(f)}
                style={{ padding: '6px 16px', fontSize: '0.85rem', borderRadius: 4, border: 'none',
                  background: roleFilter === f ? 'var(--surface)' : 'transparent',
                  color: roleFilter === f ? 'var(--text)' : 'var(--text-muted)',
                  fontWeight: roleFilter === f ? 600 : 400, cursor: 'pointer',
                  boxShadow: roleFilter === f ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>
                {f}
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 24px' }}>User</th>
                <th style={{ padding: '12px 24px' }}>Role</th>
                <th style={{ padding: '12px 24px' }}>Department</th>
                <th style={{ padding: '12px 24px' }}>Status</th>
                <th style={{ padding: '12px 24px' }}>Last Login</th>
                <th style={{ padding: '12px 24px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserIcon size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 24px', textTransform: 'capitalize' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
                      background: u.role === 'admin' ? 'var(--risk-high-soft)' : 
                                  u.role === 'teacher' ? 'var(--risk-medium-soft)' :
                                  u.role === 'student' ? 'var(--risk-low-soft)' : 'var(--surface-2)',
                      color: u.role === 'admin' ? 'var(--risk-high)' : 
                             u.role === 'teacher' ? 'var(--risk-medium)' :
                             u.role === 'student' ? 'var(--risk-low)' : 'var(--text-muted)'
                    }}>{u.role}</span>
                  </td>
                  <td style={{ padding: '12px 24px' }}>
                    {u.department ? (
                      <div>
                        <div>{u.department}</div>
                        {u.semester && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Semester {u.semester}</div>}
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                  </td>
                  <td style={{ padding: '12px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: u.is_active ? 'var(--risk-low)' : 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: u.is_active ? 600 : 400, color: u.is_active ? 'var(--text)' : 'var(--text-muted)' }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {u.last_login ? new Date(u.last_login).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                  </td>
                  <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }} title="Reset Password"><Key size={16} /></button>
                      <button style={{ background: 'none', border: 'none', color: 'var(--risk-high)', cursor: 'pointer', padding: 4 }} title={u.is_active ? 'Deactivate User' : 'Activate User'}><Ban size={16} /></button>
                      <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><MoreVertical size={16} /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>No users found matching filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
