import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { goalApi, type Goal, type GoalInput } from '../../services/api';
import { Target, Plus, CheckCircle2, Circle, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentPlanner() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', factor: '' });

  useEffect(() => {
    if (!user) return;
    fetchGoals();
  }, [user]);

  const fetchGoals = () => {
    if (!user) return;
    goalApi.getAll(user.id).then(setGoals).catch(console.error).finally(() => setLoading(false));
  };

  const handleToggle = async (id: number, currentStatus: number) => {
    await goalApi.update(id, { is_completed: !currentStatus });
    fetchGoals();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGoal.title) return;
    await goalApi.create({ student_id: user.id, title: newGoal.title, factor: newGoal.factor });
    setShowModal(false);
    setNewGoal({ title: '', factor: '' });
    fetchGoals();
  };

  if (loading) return <div className="bento-grid"><div className="tile span-12"><div className="skeleton" style={{ height: 200 }} /></div></div>;

  const active = goals.filter(g => !g.is_completed);
  const completed = goals.filter(g => g.is_completed);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700 }}>Action Planner</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Goal
        </button>
      </div>

      <div className="bento-grid">
        <div className="tile span-8" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="kpi-label">Active Goals ({active.length})</div>
          {active.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}><Target size={32} /><p>No active goals. Set one to start improving!</p></div>
          ) : (
            active.map((g, i) => (
              <motion.div key={g.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }}>
                <button className="btn-ghost btn-icon" onClick={() => handleToggle(g.id, g.is_completed)} style={{ color: 'var(--text-muted)' }}>
                  <Circle size={24} />
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{g.title}</div>
                  {g.factor && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Focus: {g.factor}</div>}
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="tile span-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="kpi-label">Completed ({completed.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {completed.map(g => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', opacity: 0.7 }}>
                <CheckCircle2 size={16} className="text-muted" />
                <span style={{ textDecoration: 'line-through', fontSize: '0.9rem' }}>{g.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <form onSubmit={handleAdd}>
              <div className="modal-header">
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add New Goal</h3>
                <button type="button" className="btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="input-group">
                  <label>I will...</label>
                  <input className="input" autoFocus placeholder="e.g. Study for 2 extra hours this weekend" value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Related Factor (optional)</label>
                  <select className="input" value={newGoal.factor} onChange={e => setNewGoal({ ...newGoal, factor: e.target.value })}>
                    <option value="">None</option>
                    <option value="Hours_Studied">Study Hours</option>
                    <option value="Attendance">Attendance</option>
                    <option value="Sleep_Hours">Sleep</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!newGoal.title}>Save Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
