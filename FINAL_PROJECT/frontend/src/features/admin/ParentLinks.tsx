import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Search, Filter, Plus, CheckCircle, X, ChevronRight, User, Eye } from 'lucide-react';
import { adminApi, type ParentLink } from '../../services/api';

export default function ParentLinks() {
  const [links, setLinks] = useState<ParentLink[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean; link: ParentLink | null }>({ isOpen: false, link: null });

  useEffect(() => {
    adminApi.getLinks().then(setLinks).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filteredLinks = links.filter(l => 
    l.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.parent_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32 }}>
      
      {/* Header */}
      <header className="glass-card" style={{ padding: '32px', borderRadius: 24, background: 'linear-gradient(135deg, var(--surface), var(--surface-2))', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 16 }}>
            <Link2 size={16} /> Directory Access
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>Parent-Student Linking</h2>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '1.05rem', maxWidth: 650 }}>
            Manage access control. Parents can only view data for linked student accounts.
          </p>
        </div>
        <button 
          onClick={() => setIsLinkModalOpen(true)}
          className="btn btn-primary" 
          style={{ borderRadius: 20, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={18} /> Link Student & Parent
        </button>
      </header>

      {/* Toolbar */}
      <div className="glass-card" style={{ padding: '16px 24px', borderRadius: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="input-group" style={{ flex: 1, minWidth: 250 }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input" 
            placeholder="Search by student or parent name..." 
            style={{ paddingLeft: 44, width: '100%', background: 'var(--surface)' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost" style={{ borderRadius: 12, border: '1px solid var(--border)' }}>
          <Filter size={18} style={{ marginRight: 8 }} /> Filter
        </button>
      </div>

      {/* Main Directory Table */}
      <div className="glass-card" style={{ borderRadius: 24, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Student Name</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Parent Name</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)' }}>Link Status</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}/></td>
                </tr>
              ) : filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No parent links found.</td>
                </tr>
              ) : (
                filteredLinks.map((link) => (
                  <motion.tr 
                    key={link.id} 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          <User size={16} />
                        </div>
                        {link.student_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 4, marginLeft: 40 }}>ID: {link.student_id}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{link.parent_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 4 }}>ID: {link.parent_id}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 700,
                        background: 'var(--risk-low-soft)', color: 'var(--risk-low)'
                      }}>
                        <CheckCircle size={14} /> Active
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <button 
                        onClick={() => setDetailsModal({ isOpen: true, link })}
                        className="btn btn-ghost" 
                        style={{ padding: '8px 16px', borderRadius: 12, border: '1px solid var(--border)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Eye size={16} /> View Details
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Link New Modal */}
      <AnimatePresence>
        {isLinkModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card" style={{ width: '100%', maxWidth: 500, padding: 32, borderRadius: 24, position: 'relative' }}
            >
              <button onClick={() => setIsLinkModalOpen(false)} style={{ position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
              
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', color: 'var(--text)' }}>Link Student & Parent</h3>
              <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)' }}>Create a new access link mapping.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Select Student</label>
                  <select className="input" style={{ width: '100%', padding: '12px 16px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--text)' }}>
                    <option>Select a student...</option>
                    <option>S1-S1</option>
                    <option>S1-S2</option>
                    <option>S1-S3</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Select Parent</label>
                  <select className="input" style={{ width: '100%', padding: '12px 16px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--text)' }}>
                    <option>Select a parent...</option>
                    <option>Parent of S1-S1</option>
                    <option>Parent of S1-S2</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                <button onClick={() => setIsLinkModalOpen(false)} className="btn btn-ghost" style={{ borderRadius: 12 }}>Cancel</button>
                <button onClick={() => setIsLinkModalOpen(false)} className="btn btn-primary" style={{ borderRadius: 12 }}>Create Link</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Details Modal */}
      <AnimatePresence>
        {detailsModal.isOpen && detailsModal.link && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card" style={{ width: '100%', maxWidth: 500, padding: 32, borderRadius: 24, position: 'relative' }}
            >
              <button onClick={() => setDetailsModal({ isOpen: false, link: null })} style={{ position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
              
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--risk-low)', background: 'var(--risk-low-soft)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 16 }}>
                <CheckCircle size={16} /> Active Link
              </div>
              <h3 style={{ margin: '0 0 24px 0', fontSize: '1.4rem', color: 'var(--text)' }}>Link Details</h3>
              
              <div style={{ background: 'var(--surface-2)', padding: 24, borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Student</div>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1.05rem' }}>{detailsModal.link.student_name}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {detailsModal.link.student_id}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <Link2 size={24} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Parent</div>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1.05rem' }}>{detailsModal.link.parent_name}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {detailsModal.link.parent_id}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                <button onClick={() => setDetailsModal({ isOpen: false, link: null })} className="btn btn-ghost" style={{ borderRadius: 12 }}>Close</button>
                <button className="btn btn-ghost" style={{ borderRadius: 12, color: 'var(--risk-high)', border: '1px solid var(--risk-high-soft)', background: 'var(--risk-high-soft)' }}>Revoke Access</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
