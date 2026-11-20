const API_BASE = 'http://localhost:8000/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const url = new URL(`${API_BASE}${endpoint}`);
  if (token) url.searchParams.set('token', token);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const config: RequestInit = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const res = await fetch(url.toString(), config);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { username, password } }),
  logout: (token: string) =>
    request('/auth/logout', { method: 'POST', token }),
  getMe: (token: string) =>
    request<User>('/me', { token }),
};

// Students
export const studentApi = {
  getSummary: (studentId: number) =>
    request<StudentSummary>(`/students/${studentId}/summary`),
  getPerformance: (studentId: number) =>
    request<PerformanceData>(`/students/${studentId}/performance`),
  getInsights: (studentId: number) =>
    request<InsightsData>(`/students/${studentId}/insights`),
  getAttendance: (studentId: number) =>
    request<AttendanceData>(`/students/${studentId}/attendance`),
  getMarks: (studentId: number) =>
    request<MarkEntry[]>(`/students/${studentId}/marks`),
  getTimetable: (studentId: number) =>
    request<TimetableEntry[]>(`/students/${studentId}/timetable`),
  getContacts: (studentId: number) =>
    request<{ teachers: ParentContact[]; admins: ParentContact[] }>(`/students/${studentId}/contacts`),
};

// Predictions
export const predictionApi = {
  predict: (data: PredictionInput) =>
    request<PredictionResult>('/predict', { method: 'POST', body: data }),
  whatIf: (data: WhatIfInput) =>
    request<WhatIfResult>('/predict/whatif', { method: 'POST', body: data }),
  getCounterfactual: (studentId: number, target?: string) =>
    request<CounterfactualResult>(`/predict/${studentId}/counterfactual${target ? `?target=${target}` : ''}`),
};

// Check-ins
export const checkinApi = {
  create: (data: CheckinInput) =>
    request<PredictionResult>('/checkins', { method: 'POST', body: data }),
  getAll: (studentId: number) =>
    request<{ academic: AcademicEntry[]; behaviour: BehaviourEntry[] }>(`/checkins?student_id=${studentId}`),
};

// Goals
export const goalApi = {
  getAll: (studentId: number) =>
    request<Goal[]>(`/goals?student_id=${studentId}`),
  create: (data: GoalInput) =>
    request<{ id: number }>('/goals', { method: 'POST', body: data }),
  update: (goalId: number, data: { current_value?: number; is_completed?: boolean }) =>
    request(`/goals/${goalId}?${new URLSearchParams(data as Record<string, string>).toString()}`, { method: 'PATCH' }),
};

// Classes
export const classApi = {
  getAll: (teacherId?: number) =>
    request<ClassInfo[]>(`/classes${teacherId ? `?teacher_id=${teacherId}` : ''}`),
  getStudents: (classId: number) =>
    request<ClassStudent[]>(`/classes/${classId}/students`),
  getInsights: (classId: number) =>
    request<ClassInsights>(`/classes/${classId}/insights`),
  getGroups: (classId: number) =>
    request<LearnerGroup[]>(`/classes/${classId}/groups`),
  saveBulkAttendance: (data: { class_id: string; date: string; records: { student_id: number; periods: boolean[] }[] }, token: string) =>
    request<{ status: string }>('/attendance/bulk-7period', { method: 'POST', body: data, token }),
  saveBulkMarks: (data: { class_id: string; subject: string; exam_type: string; results: { student_id: number; actual_score: number }[] }, token: string) =>
    request<{ status: string }>('/marks/bulk', { method: 'POST', body: data, token }),
  getMarks: (classId: number, examType?: string) =>
    request<any[]>(`/classes/${classId}/marks${examType ? `?exam_type=${encodeURIComponent(examType)}` : ''}`),
};

// Timetable
export const timetableApi = {
  getAll: (params?: { class_id?: number; teacher_id?: number }) => {
    const q = new URLSearchParams();
    if (params?.class_id) q.set('class_id', String(params.class_id));
    if (params?.teacher_id) q.set('teacher_id', String(params.teacher_id));
    const qs = q.toString();
    return request<TimetableEntry[]>(`/timetable${qs ? `?${qs}` : ''}`);
  },
  createSlot: (data: TimetableSlotInput, token: string) =>
    request<{ id: number; status: string }>('/timetable', { method: 'POST', body: data, token }),
  updateSlot: (slotId: number, data: TimetableSlotInput, token: string) =>
    request<{ status: string }>(`/timetable/${slotId}`, { method: 'PUT', body: data, token }),
  deleteSlot: (slotId: number, token: string) =>
    request<{ status: string }>(`/timetable/${slotId}`, { method: 'DELETE', token }),
};

// Interventions
export const interventionApi = {
  getAll: (params?: { teacher_id?: number; student_id?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.teacher_id) searchParams.set('teacher_id', String(params.teacher_id));
    if (params?.student_id) searchParams.set('student_id', String(params.student_id));
    if (params?.status) searchParams.set('status', params.status);
    return request<Intervention[]>(`/interventions?${searchParams.toString()}`);
  },
  create: (data: InterventionInput, token: string) =>
    request<{ id: number }>('/interventions', { method: 'POST', body: data, token }),
  update: (id: number, data: InterventionUpdate) =>
    request(`/interventions/${id}`, { method: 'PATCH', body: data }),
};

// Messages
export const messageApi = {
  getAll: (userId: number) =>
    request<{ sent: Message[]; received: Message[] }>(`/messages?user_id=${userId}`),
  send: (data: MessageInput, token: string) =>
    request<{ id: number }>('/messages', { method: 'POST', body: data, token }),
};

// Notifications
export const notificationApi = {
  getAll: (userId: number) =>
    request<Notification[]>(`/notifications?user_id=${userId}`),
  markRead: (userId: number, ids?: number[]) =>
    request('/notifications/read', { method: 'PATCH', body: { user_id: userId, notification_ids: ids } }),
};

// Parent
export const parentApi = {
  getChildren: (parentId: number) =>
    request<ChildInfo[]>(`/parent/${parentId}/children`),
  submitObservation: (data: ParentObservationInput, token?: string) =>
    request<{ status: string; message: string; prediction?: any }>('/parent/observations', { method: 'POST', body: data, token }),
  getObservations: (studentId: number, token?: string) =>
    request<StudentObservations>(`/parent/student/${studentId}/observations`, { token }),
  getContacts: (parentId: number) =>
    request<{ teachers: ParentContact[]; admins: ParentContact[] }>(`/parent/${parentId}/contacts`),
  requestMeeting: (data: MeetingRequestInput, token: string) =>
    request<{ status: string; message: string; message_id?: number; intervention_id?: number }>('/parent/meeting-request', { method: 'POST', body: data, token }),
};

// Teacher
export const teacherApi = {
  getDashboard: (teacherId: number) =>
    request<any>(`/teacher/${teacherId}/dashboard`),
  submitBehaviour: (data: TeacherBehaviourInput, token?: string) =>
    request<{ status: string; message: string; prediction?: any }>('/teacher/behaviour', { method: 'POST', body: data, token }),
};

// Admin
export const adminApi = {
  getStats: () => request<AdminStats>('/admin/stats'),
  getUsers: (role?: string, token?: string) =>
    request<AdminUser[]>(`/users${role ? `?role=${role}` : ''}`, { token: token || '' }),
  createUser: (data: UserCreateInput, token: string) =>
    request<{ id: number }>('/users', { method: 'POST', body: data, token }),
  getModelStatus: () => request<ModelStatus>('/model/status'),
  getSettings: () => request<Record<string, string>>('/settings'),
  updateSettings: (data: Record<string, string>, token: string) =>
    request('/settings', { method: 'PATCH', body: data, token }),
  getAuditLog: (page: number, token: string) =>
    request<{ total: number; data: AuditEntry[] }>(`/audit?page=${page}`, { token }),
  getLinks: () => request<ParentLink[]>('/admin/links'),
  getEvaluations: () => request<any>('/admin/evaluations'),

  // Model retraining & benchmarking
  retrainModel: (data: { model_type: string; include_base_data: boolean; student_weight?: number; feature_set?: string; notes?: string }, token: string) =>
    request<RetrainResult>('/model/retrain', { method: 'POST', body: data, token }),

  compareModels: (data: { candidate_models: string[]; include_base_data: boolean; student_weight: number; feature_set?: string }, token: string) =>
    request<ModelCompareResult>('/model/compare', { method: 'POST', body: data, token }),

  retrainWithUpload: async (file: File, modelType: string, includeBase: boolean, notes: string, token: string): Promise<RetrainResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const params = new URLSearchParams({
      model_type: modelType,
      include_base: String(includeBase),
      token,
    });
    if (notes) params.set('notes', notes);
    const res = await fetch(`${API_BASE}/model/retrain-upload?${params.toString()}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

  activateVersion: (version: string, token: string) =>
    request<{ status: string; version: string; message: string; thresholds: any }>('/model/activate-version', { method: 'POST', body: { version }, token }),

  getTrainingHistory: (token: string) =>
    request<{ history: TrainingLogEntry[] }>('/model/history', { token }),

  restoreModel: (token: string) =>
    request<{ status: string; message: string; thresholds: any }>('/model/restore', { method: 'POST', token }),

  getTrainingDataPreview: (token: string) =>
    request<TrainingDataPreview>('/model/training-data-preview', { token }),

  importActualScores: async (file: File, token: string): Promise<ActualScoresImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/model/import-actual-scores?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Import failed' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

  getActualScoresTemplateUrl: (token: string) =>
    `${API_BASE}/model/actual-scores-template?token=${encodeURIComponent(token)}`,
};


// Demo
export const demoApi = {
  getCredentials: () =>
    request<{ accounts: DemoAccount[] }>('/demo/credentials'),
};

// Health
export const healthApi = {
  check: () => request<{ status: string }>('/health'),
};

// ── Type definitions ──────────────────────────────────────────
export interface User {
  id: number;
  username: string;
  role: 'student' | 'teacher' | 'parent' | 'admin';
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  semester?: number;
}

export interface StudentSummary {
  student: { id: number; name: string; department?: string; semester?: number };
  prediction: PredictionResult | null;
  predictionCount: number;
  goals: { total: number; completed: number };
  features: Record<string, number> | null;
}

export interface PredictionResult {
  studentId?: number;
  predictedScore: number;
  interval: [number, number];
  risk: 'High' | 'Medium' | 'Low';
  delta: number;
  factors: FactorImpact[];
  recommendations: Recommendation[];
  modelVersion?: string;
  generatedAt?: string;
  date?: string;
}

export interface FactorImpact {
  name: string;
  impact: number;
  value: number;
}

export interface Recommendation {
  factor: string;
  text: string;
  priority: number;
  impact?: number;
}

export interface PerformanceData {
  predictions: { date: string; predicted_score: number; confidence_low: number; confidence_high: number; risk_level: string }[];
  results: { actual_score: number; subject: string; exam_type: string; date: string; predicted_score: number }[];
  academic: AcademicEntry[];
  thresholds: { high: number; low: number };
}

export interface InsightsData {
  factorImpacts: FactorImpact[];
  radarData: Record<string, number>;
  classAverage: Record<string, number>;
  recommendations: Recommendation[];
  explanation: string;
  predictedScore: number;
  risk: string;
}

export interface AttendanceData {
  overallPercentage: number;
  records: AttendanceRecord[];
  monthly: { month: string; present: number; total: number }[];
  threshold: number;
}

export interface AttendanceRecord {
  date: string;
  period: number;
  status: string;
}

export interface MarkEntry {
  id: number;
  actual_score: number;
  subject?: string;
  exam_type: string;
  date: string;
  predicted_score?: number;
}

export interface TimetableEntry {
  id?: number;
  class_id?: number;
  class_name?: string;
  day_of_week: number;
  period: number;
  start_time: string;
  end_time: string;
  subject: string;
  teacher_id?: number;
  teacher_name?: string;
  room?: string;
}

export interface TimetableSlotInput {
  class_id: number;
  day_of_week: number;
  period: number;
  start_time: string;
  end_time: string;
  subject: string;
  teacher_id?: number;
  room?: string;
}

export interface PredictionInput {
  student_id: number;
  attendance: number;
  hours_studied: number;
  previous_scores: number;
  tutoring_sessions: number;
  motivation_level: number;
  parental_involvement: number;
  peer_influence: number;
  sleep_hours: number;
  access_to_resources: number;
  teacher_quality: number;
  physical_activity: number;
}

export interface WhatIfInput {
  student_id: number;
  changes: Record<string, number>;
}

export interface WhatIfResult {
  currentScore: number;
  predictedScore: number;
  risk: string;
  previousRisk: string;
  delta: number;
  topLever: string | null;
  leverDeltas: Record<string, number>;
  factors: FactorImpact[];
}

export interface CounterfactualResult {
  target: string;
  targetScore: number;
  currentScore: number;
  changes: { factor: string; from: number; to: number; scoreGain: number }[];
  message?: string;
}

export interface CheckinInput {
  student_id: number;
  attendance: number;
  hours_studied: number;
  previous_scores: number;
  tutoring_sessions: number;
  motivation: number;
  concentration: number;
  learning_engagement: number;
  preparation_confidence: number;
  study_consistency: number;
  sleep_hours: number;
  physical_activity: number;
  parental_involvement: number;
  peer_influence: number;
  access_to_resources: number;
  teacher_quality: number;
}

export interface AcademicEntry {
  date: string;
  attendance: number;
  hours_studied: number;
  previous_scores: number;
  tutoring_sessions: number;
}

export interface BehaviourEntry {
  date: string;
  motivation: number;
  parental_involvement: number;
  peer_influence: number;
  sleep_hours: number;
  access_to_resources: number;
  teacher_quality: number;
  physical_activity: number;
}

export interface Goal {
  id: number;
  title: string;
  description?: string;
  target_value?: number;
  current_value: number;
  factor?: string;
  is_completed: number;
  created_at: string;
  completed_at?: string;
}

export interface GoalInput {
  student_id: number;
  title: string;
  description?: string;
  target_value?: number;
  factor?: string;
}

export interface ClassInfo {
  id: number;
  name: string;
  department?: string;
  semester?: number;
  year?: string;
  teacher_id?: number;
  teacher_name?: string;
  student_count: number;
  riskDistribution: Record<string, number>;
}

export interface ClassStudent {
  id: number;
  name: string;
  department?: string;
  semester?: number;
  predicted_score?: number;
  risk_level?: string;
  confidence_low?: number;
  confidence_high?: number;
  attendance?: number;
  trend?: string;
  prediction_date?: string;
}

export interface ClassInsights {
  riskDistribution: Record<string, number>;
  averageScore: number;
  predictedVsActual: { name: string; predicted_score: number; actual_score: number }[];
  featureImportance: { name: string; importance: number; direction: string }[];
  studentCount: number;
}

export interface LearnerGroup {
  id: string;
  label: string;
  size: number;
  traits: string[];
  members: { id: number; name: string; score: number; risk: string }[];
}

export interface Intervention {
  id: number;
  student_id: number;
  teacher_id: number;
  student_name: string;
  teacher_name?: string;
  type: string;
  description?: string;
  status: string;
  due_date?: string;
  outcome?: string;
  score_change?: number;
  created_at: string;
  updated_at: string;
}

export interface InterventionInput {
  student_id: number;
  type: string;
  description?: string;
  due_date?: string;
}

export interface InterventionUpdate {
  status?: string;
  outcome?: string;
  score_change?: number;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  sender_name?: string;
  receiver_name?: string;
  subject?: string;
  body: string;
  is_read: number;
  created_at: string;
}

export interface MessageInput {
  receiver_id: number;
  subject?: string;
  body: string;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  body?: string;
  link?: string;
  is_read: number;
  created_at: string;
}

export interface ChildInfo {
  id: number;
  name: string;
  department?: string;
  semester?: number;
  class_name?: string;
  teacher_id?: number;
  teacher_name?: string;
  prediction: (PredictionResult & { recommendations?: { factor: string; text: string; priority: number }[]; factors?: any[] }) | null;
  statusText: string;
  statusLevel: string;
  attendance?: number;
  previous_scores?: number;
  actual_score?: number;
  subject?: string;
  hours_studied?: number;
  home_factors?: {
    parental_involvement: number;
    sleep_hours: number;
    access_to_resources: number;
    physical_activity: number;
    hours_studied: number;
  };
  school_factors?: {
    motivation: number;
    peer_influence: number;
    teacher_quality: number;
    study_consistency?: number;
    concentration?: number;
    learning_engagement?: number;
    tutoring_sessions?: number;
    attendance?: number;
    previous_scores?: number;
  };
}

export interface ParentObservationInput {
  student_id: number;
  parental_involvement: number;
  sleep_hours: number;
  hours_studied: number;
  access_to_resources: number;
  physical_activity: number;
  notes?: string;
}

export interface TeacherBehaviourInput {
  student_id: number;
  motivation: number;
  peer_influence: number;
  teacher_quality: number;
  tutoring_sessions?: number;
  study_consistency?: number;
  concentration?: number;
  learning_engagement?: number;
  notes?: string;
}

export interface StudentObservations {
  student_id: number;
  parent_factors: {
    parental_involvement: number;
    sleep_hours: number;
    access_to_resources: number;
    physical_activity: number;
    hours_studied: number;
  };
  school_factors: {
    motivation: number;
    peer_influence: number;
    teacher_quality: number;
    tutoring_sessions: number;
    attendance: number;
    previous_scores: number;
    actual_score?: number;
  };
}

export interface ParentContact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role_label: string;
  class_name: string;
  child_name: string;
}

export interface MeetingRequestInput {
  student_id: number;
  teacher_id: number;
  preferred_date: string;
  time_slot: string;
  mode: string;
  agenda: string;
  notes?: string;
}

export interface AdminStats {
  usersByRole: Record<string, number>;
  totalPredictions: number;
  riskDistribution: Record<string, number>;
  recentLogins: number;
  recentActivity?: any[];
}

export interface AdminUser {
  id: number;
  username: string;
  role: string;
  name: string;
  email?: string;
  department?: string;
  semester?: number;
  is_active: number;
  created_at: string;
  last_login?: string;
}

export interface UserCreateInput {
  username: string;
  password: string;
  role: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  semester?: number;
}

export interface ModelStatus {
  modelName: string;
  version: string;
  features: string[];
  featureImportance: { name: string; coefficient: number; importance: number }[];
  intercept: number;
  thresholds: { high: number; low: number };
  metrics: { mae?: number; rmse?: number; r2?: number; sampleSize?: number };
  drift: string;
}

export interface AuditEntry {
  id: number;
  user_id: number;
  user_name?: string;
  action: string;
  resource?: string;
  details?: string;
  created_at: string;
}

export interface ParentLink {
  id: number;
  parent_id: number;
  student_id: number;
  parent_name: string;
  student_name: string;
}

export interface DemoAccount {
  role: string;
  username: string;
  password: string;
  name: string;
}

export interface RetrainResult {
  status: string;
  version: string;
  modelType: string;
  source: string;
  metrics: { mae: number; rmse: number; r2: number; real_mae?: number | null };
  samples: number;
  features: string[];
  thresholds: { features: string[]; high_cutoff: number; low_cutoff: number };
  details?: {
    studentsTotal: number;
    studentsWithActual: number;
    studentsWithPredicted: number;
    studentWeight: number;
  };
}

export interface TrainingLogEntry {
  id: number;
  version: string;
  model_name: string;
  source: string;
  n_samples: number;
  n_features: number;
  mae: number | null;
  rmse: number | null;
  r2: number | null;
  trained_by: number;
  trained_by_name: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface StudentRosterItem {
  student_id: number;
  name: string;
  username: string;
  department: string;
  semester: number;
  attendance: number;
  hours_studied: number;
  previous_scores: number;
  tutoring_sessions?: number;
  motivation?: number;
  peer_influence?: number;
  teacher_quality?: number;
  parental_involvement?: number;
  sleep_hours?: number;
  access_to_resources?: number;
  physical_activity?: number;
  target_score: number;
  target_type: 'actual' | 'predicted';
  has_actual: boolean;
  weight: number;
}

export interface TrainingDataPreview {
  totalStudents: number;
  studentsWithResults: number;
  studentsWithPredicted: number;
  studentsNoData: number;
  totalResults: number;
  baseDatasetSize: number;
  currentVersion: string;
  currentFeatures: string[];
  hasInitialBackup: boolean;
  studentRoster: StudentRosterItem[];
  sampleData: Record<string, any>[];
}

export interface CandidateBenchmark {
  model: string;
  cv_r2: number;
  test_r2: number;
  test_mae: number;
  test_rmse: number;
  real_student_mae: number | null;
  real_in_test: number;
  is_best: boolean;
}

export interface ModelCompareResult {
  status: string;
  results: CandidateBenchmark[];
  source: string;
  totalSamples: number;
  classSamples: number;
  withActual: number;
  withPredicted: number;
  studentWeight: number;
}

export interface ActualScoresImportResult {
  status: string;
  imported: number;
  updated: number;
  notFound: string[];
  invalid: string[];
  totalProcessed: number;
}

