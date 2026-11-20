import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckCircle, Users, Save, Award, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { classApi, type ClassStudent, type ClassInfo } from '../../services/api';

const EXAMS = ['Mid-Term Examination', 'Final Examination', 'Unit Test 1', 'Unit Test 2'];

export default function DataImport() {
  const { user, token } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedExam, setSelectedExam] = useState(EXAMS[0]);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  
  const [entryMode, setEntryMode] = useState<'marks' | 'attendance'>('marks');

  // Editable Subjects State
  const [subjects, setSubjects] = useState(['Maths III', 'Data Structures', 'Operating Systems', 'Database Systems', 'Computer Networks', 'Software Eng.']);
  
  // Marks State: stuId -> array of 6 marks
  const [marks, setMarks] = useState<Record<string, string[]>>({});
  
  // Attendance State: stuId -> array of 7 booleans
  const [attendance, setAttendance] = useState<Record<string, boolean[]>>({});
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    const teacherId = user.role === 'teacher' ? user.id : undefined;
    classApi.getAll(teacherId).then(res => {
      setClasses(res);
      if (res.length > 0) setSelectedClass(res[0].id);
    }).catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!selectedClass) return;
    
    // Always fetch students
    classApi.getStudents(selectedClass).then(res => {
      setStudents(res);
      
      // Initialize attendance for new students
      const initialAtt: Record<string, boolean[]> = {};
      res.forEach(s => {
        initialAtt[s.id.toString()] = Array(7).fill(true);
      });
      setAttendance(initialAtt);
    }).catch(console.error);
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass || entryMode !== 'marks') return;
    
    classApi.getMarks(selectedClass, selectedExam).then(marksRes => {
      const newMarks: Record<string, string[]> = {};
      
      marksRes.forEach(m => {
        const sId = m.student_id.toString();
        if (!newMarks[sId]) newMarks[sId] = Array(6).fill('');
        
        const idx = subjects.indexOf(m.subject);
        if (idx !== -1) {
          if (newMarks[sId][idx] === '') {
            newMarks[sId][idx] = m.actual_score.toString();
          }
        }
      });
      
      setMarks(newMarks);
    }).catch(console.error);
  }, [selectedClass, selectedExam, subjects, entryMode]);

  const handleMarksChange = (stuId: string, idx: number, val: string) => {
    setMarks(prev => {
      const stuMarks = prev[stuId] ? [...prev[stuId]] : Array(6).fill('');
      stuMarks[idx] = val;
      return { ...prev, [stuId]: stuMarks };
    });
  };

  const handleAttendanceChange = (stuId: string, period: number, present: boolean) => {
    setAttendance(prev => {
      const arr = [...(prev[stuId] || Array(7).fill(true))];
      arr[period] = present;
      return { ...prev, [stuId]: arr };
    });
  };

  const toggleAllPeriod = (period: number) => {
    // check if all are currently present
    const allPresent = students.every(s => attendance[s.id.toString()]?.[period]);
    const newState = !allPresent;
    
    setAttendance(prev => {
      const next = { ...prev };
      students.forEach(s => {
        const arr = [...(next[s.id.toString()] || Array(7).fill(true))];
        arr[period] = newState;
        next[s.id.toString()] = arr;
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedClass || !token) return;
    setIsSaving(true);
    
    try {
      if (entryMode === 'marks') {
        for (let idx = 0; idx < subjects.length; idx++) {
          const subjectName = subjects[idx];
          const results = students
            .map(s => {
              const val = marks[s.id.toString()]?.[idx];
              return {
                student_id: s.id,
                actual_score: val ? parseFloat(val) : NaN
              };
            })
            .filter(r => !isNaN(r.actual_score));
            
          if (results.length > 0) {
            await classApi.saveBulkMarks({
              class_id: selectedClass.toString(),
              subject: subjectName,
              exam_type: selectedExam,
              results
            }, token);
          }
        }
        showToast(`Exam Marks successfully recorded and synced to the prediction model!`);
      } else {
        const records = students.map(s => ({
          student_id: s.id,
          periods: attendance[s.id.toString()] || Array(7).fill(true)
        }));
        
        await classApi.saveBulkAttendance({
          class_id: selectedClass.toString(),
          date: attendanceDate,
          records
        }, token);
        showToast(`Attendance successfully recorded and synced!`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save data.");
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32, maxWidth: 1100, margin: '0 auto' }}>
      
      {/* Header */}
      <header className="glass-card" style={{ padding: '32px', borderRadius: 24, background: 'linear-gradient(135deg, var(--surface), var(--surface-2))' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, marginBottom: 16 }}>
          <FileText size={16} /> Manual Entry Console
        </div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>Academic Data Entry</h2>
        <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '1.05rem', maxWidth: 650 }}>
          Manually input exam marks and attendance. Data entered here immediately updates student risk profiles.
        </p>
      </header>

      {/* Success Popup */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -50, scale: 0.9 }} 
            style={{ 
              position: 'fixed', 
              top: 32, 
              left: '50%', 
              transform: 'translateX(-50%)', 
              background: 'linear-gradient(135deg, var(--risk-low), #059669)', 
              color: '#fff', 
              padding: '16px 32px', 
              borderRadius: 32, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              fontWeight: 700,
              fontSize: '1.05rem',
              boxShadow: '0 12px 32px rgba(16, 185, 129, 0.3)',
              zIndex: 9999
            }}>
            <CheckCircle size={24} color="#fff" /> {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entry Mode Toggle */}
      <div style={{ display: 'flex', gap: 16, background: 'var(--surface-2)', padding: 8, borderRadius: 16, border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
        <button 
          onClick={() => setEntryMode('marks')}
          className="btn"
          style={{ 
            borderRadius: 12, padding: '8px 24px', border: 'none',
            background: entryMode === 'marks' ? 'var(--accent)' : 'transparent', 
            color: entryMode === 'marks' ? '#fff' : 'var(--text-muted)',
            fontWeight: 700
          }}
        >
          <Award size={18} style={{ marginRight: 8 }} /> Exam Marks Entry
        </button>
        <button 
          onClick={() => setEntryMode('attendance')}
          className="btn"
          style={{ 
            borderRadius: 12, padding: '8px 24px', border: 'none',
            background: entryMode === 'attendance' ? 'var(--accent)' : 'transparent', 
            color: entryMode === 'attendance' ? '#fff' : 'var(--text-muted)',
            fontWeight: 700
          }}
        >
          <Clock size={18} style={{ marginRight: 8 }} /> 7-Period Attendance
        </button>
      </div>

      {/* Configuration Panel */}
      <motion.div className="glass-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ borderRadius: 24, padding: 24, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}><Users size={16}/> Target Class</label>
          <select className="input premium-input" value={selectedClass || ''} onChange={e => setSelectedClass(Number(e.target.value))}>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        {entryMode === 'marks' ? (
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}><FileText size={16}/> Exam Category</label>
            <select className="input premium-input" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
              {EXAMS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        ) : (
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}><Clock size={16}/> Date</label>
            <input type="date" className="input premium-input" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
          </div>
        )}
      </motion.div>

      {/* Main Entry Grid */}
      <motion.div className="glass-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ borderRadius: 24, padding: 32 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)' }}>
            {entryMode === 'marks' ? `Entering Marks for ${subjects.length} Subjects` : `Recording 7-Period Attendance`}
          </h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            <Users size={18} /> {students.length} Students
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {entryMode === 'marks' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)', width: 80 }}>Roll</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Student Name</th>
                  
                  {subjects.map((subj, idx) => (
                    <th key={idx} style={{ padding: '16px 8px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center', minWidth: 100 }}>
                      <input
                        value={subj}
                        onChange={e => {
                          const newSubjects = [...subjects];
                          newSubjects[idx] = e.target.value;
                          setSubjects(newSubjects);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          textAlign: 'center',
                          width: '100%',
                          outline: 'none',
                          borderBottom: '1px dashed transparent',
                          transition: 'border 0.2s'
                        }}
                        onFocus={e => e.target.style.borderBottom = '1px dashed var(--accent)'}
                        onBlur={e => e.target.style.borderBottom = '1px dashed transparent'}
                        title="Click to edit subject name"
                      />
                      <div style={{ fontSize: '0.7rem', fontWeight: 400 }}>(/100)</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No students found in this class.</td>
                  </tr>
                ) : students.map((stu, idx, arr) => (
                  <tr key={stu.id} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text)' }}>
                      {stu.name}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 4 }}>ID: {stu.id}</div>
                    </td>
                    
                    {subjects.map((subj, sIdx) => (
                      <td key={sIdx} style={{ padding: '16px 8px', textAlign: 'center' }}>
                        <input 
                          type="number" 
                          min="0" 
                          max="100"
                          placeholder="--"
                          value={marks[stu.id.toString()]?.[sIdx] || ''}
                          onChange={e => handleMarksChange(stu.id.toString(), sIdx, e.target.value)}
                          style={{ 
                            width: 65, padding: '10px', borderRadius: 12, border: '1px solid var(--border)', 
                            background: 'var(--surface-2)', color: 'var(--text)', fontWeight: 700, fontSize: '1rem',
                            textAlign: 'center', outline: 'none', transition: 'border 0.2s'
                          }}
                          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                          onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)', width: 80 }}>Roll</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Student Name</th>
                  
                  {Array.from({length: 7}).map((_, p) => (
                    <th key={p} style={{ padding: '16px 8px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center', minWidth: 60 }}>
                      <div style={{ cursor: 'pointer' }} onClick={() => toggleAllPeriod(p)}>
                        P{p+1}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No students found in this class.</td>
                  </tr>
                ) : students.map((stu, idx, arr) => (
                  <tr key={stu.id} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text)' }}>
                      {stu.name}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 4 }}>ID: {stu.id}</div>
                    </td>
                    
                    {Array.from({length: 7}).map((_, p) => {
                      const isPresent = attendance[stu.id.toString()]?.[p] ?? true;
                      return (
                        <td key={p} style={{ padding: '16px 8px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleAttendanceChange(stu.id.toString(), p, !isPresent)}
                            style={{
                              width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                              background: isPresent ? 'var(--risk-low-soft)' : 'var(--risk-high-soft)',
                              color: isPresent ? 'var(--risk-low)' : 'var(--risk-high)',
                              fontWeight: 800, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                          >
                            {isPresent ? 'P' : 'A'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          <button 
            onClick={handleSave} 
            disabled={isSaving || students.length === 0}
            className="btn btn-primary btn-lg" 
            style={{ borderRadius: 16, padding: '0 40px', background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', border: 'none', boxShadow: '0 8px 24px rgba(13, 148, 136, 0.3)' }}
          >
            {isSaving ? 'Processing...' : <><Save size={20} style={{ marginRight: 8 }} /> Save & Update AI Model</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
