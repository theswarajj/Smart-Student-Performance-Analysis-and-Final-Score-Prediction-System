import { useState } from 'react';
import { Search, Filter, ShieldAlert, Activity, User, FileText, Download } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock data for audit logs
const MOCK_LOGS = [
  { id: 'LOG-001', user: 'Dr. Admin', role: 'Admin', action: 'Update Parent Link', resource: 'Parent Profile', details: 'Updated contact details for Suresh Menon', timestamp: '2026-10-07 10:45 AM', type: 'security' },
  { id: 'LOG-002', user: 'Prof. Meera Nair', role: 'Teacher', action: 'Bulk Data Entry', resource: 'Results', details: 'Entered marks for 5 students in Maths III', timestamp: '2026-10-07 10:30 AM', type: 'data' },
  { id: 'LOG-003', user: 'Prof. Meera Nair', role: 'Teacher', action: 'Attendance Entry', resource: 'Attendance Records', details: 'Submitted 7-period attendance for S5 CSE-A', timestamp: '2026-10-07 09:15 AM', type: 'data' },
  { id: 'LOG-004', user: 'System', role: 'System', action: 'Model Retrain', resource: 'Ridge Regressor', details: 'Triggered automated weights update (v1.1)', timestamp: '2026-10-07 02:00 AM', type: 'system' },
  { id: 'LOG-005', user: 'Dr. Admin', role: 'Admin', action: 'Create Class', resource: 'Classes', details: 'Created class S1 AI-A for 2026 batch', timestamp: '2026-10-06 04:20 PM', type: 'admin' },
  { id: 'LOG-006', user: 'Suresh Menon', role: 'Parent', action: 'Message Sent', resource: 'Messages', details: 'Sent concern regarding Rahul\'s attendance', timestamp: '2026-10-06 01:10 PM', type: 'communication' },
  { id: 'LOG-007', user: 'Rahul Menon', role: 'Student', action: 'Goal Created', resource: 'Goals', details: 'Created goal "Improve Attendance to 85%"', timestamp: '2026-10-05 11:30 AM', type: 'user' },
  { id: 'LOG-008', user: 'Dr. Admin', role: 'Admin', action: 'User Login', resource: 'Auth', details: 'Successful login from 192.168.1.45', timestamp: '2026-10-05 09:00 AM', type: 'security' },
];

export default function AuditLog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  const filteredLogs = MOCK_LOGS.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'All' || log.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getIconForType = (type: string) => {
    switch(type) {
      case 'security': return <ShieldAlert size={16} color="var(--danger)" />;
      case 'data': return <FileText size={16} color="var(--primary)" />;
      case 'system': return <Activity size={16} color="var(--accent)" />;
      case 'admin': return <User size={16} color="var(--warning)" />;
      default: return <FileText size={16} color="var(--text-muted)" />;
    }
  };

  const getBadgeStyle = (type: string) => {
    switch(type) {
      case 'security': return { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' };
      case 'data': return { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' };
      case 'system': return { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)' };
      case 'admin': return { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' };
      default: return { bg: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-muted)' };
    }
  };

  return (
    <div className="fade-in" style={{ padding: '0px 20px', maxWidth: 1200, margin: '0 auto' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Activity size={32} color="var(--accent)" />
            System Audit Log
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: 600 }}>
            Monitor and track all system events, data mutations, and security accesses.
          </p>
        </div>
        
        <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Controls */}
      <div className="card" style={{ padding: 20, marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by user, action, or details..." 
            className="input premium-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: 44 }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={18} color="var(--text-muted)" />
          <select 
            className="input premium-input" 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ minWidth: 150 }}
          >
            <option value="All">All Events</option>
            <option value="security">Security</option>
            <option value="data">Data Entry</option>
            <option value="system">System</option>
            <option value="admin">Admin Actions</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1 }}>Event ID & Time</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1 }}>User / Role</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1 }}>Action</th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, i) => {
                const style = getBadgeStyle(log.type);
                return (
                  <motion.tr 
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{log.id}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{log.timestamp}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {log.user}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{log.role}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                        {getIconForType(log.type)}
                        {log.action}
                      </div>
                      <div style={{ 
                        display: 'inline-block',
                        background: style.bg,
                        color: style.color,
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        marginTop: 6
                      }}>
                        {log.resource}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.5 }}>
                        {log.details}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ShieldAlert size={48} style={{ margin: '0 auto 16px auto', opacity: 0.2 }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No audit logs found matching your criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
