import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Landing from './features/auth/Landing';
import LoginPage from './features/auth/LoginPage';
import StudentShell from './layouts/StudentShell';
import TeacherShell from './layouts/TeacherShell';
import ParentShell from './layouts/ParentShell';
import AdminShell from './layouts/AdminShell';

// Student Pages
import StudentDashboard from './features/student/Dashboard';
import StudentInsights from './features/student/Insights';
import StudentWhatIf from './features/student/WhatIfLab';
import StudentPlanner from './features/student/Planner';
import StudentCheckIn from './features/student/CheckIn';
import StudentPerformance from './features/student/Performance';
import StudentAttendance from './features/student/Attendance';
import StudentMarks from './features/student/Marks';
import StudentTimetable from './features/student/Timetable';
import StudentMessages from './features/student/Messages';

// Teacher Pages
import TeacherDashboard from './features/teacher/TeacherDashboard';
import MyClasses from './features/teacher/MyClasses';
import RiskBoard from './features/teacher/RiskBoard';
import Interventions from './features/teacher/Interventions';
import LearnerGroups from './features/teacher/LearnerGroups';
import TeacherAttendance from './features/teacher/TeacherAttendance';
import BehaviorEntry from './features/teacher/BehaviorEntry';
import Reports from './features/teacher/Reports';
import Messages from './features/teacher/Messages';
import TeacherTimetable from './features/teacher/TeacherTimetable';

// Parent Pages
import ParentDashboard from './features/parent/ParentDashboard';
import ParentProgress from './features/parent/ParentProgress';
import ParentAttendance from './features/parent/ParentAttendance';
import ParentMarks from './features/parent/ParentMarks';
import ParentMessages from './features/parent/ParentMessages';
import ParentGuide from './features/parent/ParentGuide';
import ParentTimetable from './features/parent/ParentTimetable';

// Admin Pages
import AdminDashboard from './features/admin/AdminDashboard';
import UserManagement from './features/admin/UserManagement';
import DataImport from './features/admin/DataImport';
import ModelMonitor from './features/admin/ModelMonitor';
import ClassManagement from './features/admin/ClassManagement';
import ParentLinks from './features/admin/ParentLinks';
import AIEvaluations from './features/admin/AIEvaluations';
import AuditLog from './features/admin/AuditLog';
import Settings from './features/admin/Settings';
import AdminTimetable from './features/admin/AdminTimetable';

// Simple component for unimplemented pages
const Placeholder = ({ title }: { title: string }) => (
  <div className="empty-state">
    <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{title}</h3>
    <p>This module is under construction.</p>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole: string }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} /></div>;
  if (!user) return <Navigate to={`/${allowedRole}/login`} replace />;
  if (user.role !== allowedRole) return <Navigate to={`/${user.role}`} replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/:role/login" element={<LoginPage />} />
      
      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute allowedRole="student"><StudentShell /></ProtectedRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="performance" element={<StudentPerformance />} />
        <Route path="insights" element={<StudentInsights />} />
        <Route path="what-if" element={<StudentWhatIf />} />
        <Route path="planner" element={<StudentPlanner />} />
        <Route path="check-in" element={<StudentCheckIn />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="marks" element={<StudentMarks />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="messages" element={<StudentMessages />} />
      </Route>

      {/* Teacher Routes */}
      <Route path="/teacher" element={<ProtectedRoute allowedRole="teacher"><TeacherShell /></ProtectedRoute>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="classes" element={<MyClasses />} />
        <Route path="risk-board" element={<RiskBoard />} />
        <Route path="interventions" element={<Interventions />} />
        <Route path="groups" element={<LearnerGroups />} />
        <Route path="attendance" element={<TeacherAttendance />} />
        <Route path="behavior" element={<BehaviorEntry />} />
        <Route path="marks" element={<DataImport />} />
        <Route path="reports" element={<Reports />} />
        <Route path="timetable" element={<TeacherTimetable />} />
        <Route path="messages" element={<Messages />} />
      </Route>

      {/* Parent Routes */}
      <Route path="/parent" element={<ProtectedRoute allowedRole="parent"><ParentShell /></ProtectedRoute>}>
        <Route index element={<ParentDashboard />} />
        <Route path="progress" element={<ParentProgress />} />
        <Route path="attendance" element={<ParentAttendance />} />
        <Route path="marks" element={<ParentMarks />} />
        <Route path="timetable" element={<ParentTimetable />} />
        <Route path="messages" element={<ParentMessages />} />
        <Route path="guide" element={<ParentGuide />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminShell /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="classes" element={<ClassManagement />} />
        <Route path="timetable" element={<AdminTimetable />} />
        <Route path="links" element={<ParentLinks />} />
        <Route path="import" element={<DataImport />} />
        <Route path="model" element={<ModelMonitor />} />
        <Route path="evaluations" element={<AIEvaluations />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
