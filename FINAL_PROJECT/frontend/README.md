# AcadIQ Frontend — React 19 + TypeScript + Vite

This is the official client interface for **AcadIQ (Smart Student Performance Analysis & Final Score Prediction System)**. Built with React 19, TypeScript, Vite, Framer Motion, and Recharts, it provides role-tailored dashboards and analytical workspaces for Administrators, Teachers, Parents, and Students.

---

## ⚡ Tech Stack & Libraries

- **Framework**: React 19 (`react`, `react-dom`)
- **Language**: TypeScript (`~6.0.2`)
- **Build Tool**: Vite (`^8.3.0`)
- **Routing**: React Router DOM (`v7`) with protected role-based shells
- **Data Visualization**: Recharts (`v3.10.1`) for interactive charts and score distribution graphs
- **Motion & Animations**: Framer Motion (`v14.0.0`) for smooth card transitions and tab animations
- **Iconography**: Lucide React (`v1.52.0`)
- **Linter**: Oxlint

---

## 🧭 Project Architecture

```
src/
├── assets/          # Static logos, hero graphics, and vectors
├── features/        # Domain-driven feature modules
│   ├── admin/       # Dashboard, Class/User Management, Model Retrain Monitor, Audit Log
│   ├── auth/        # Landing page and Unified Login
│   ├── parent/      # Progress Tracker, Marks, Attendance, Parent Action Guide, Messaging
│   ├── student/     # Student Dashboard, Insights (SHAP), What-If Lab, Planner, Daily Check-in
│   └── teacher/     # Class Roster, Risk Board, Interventions, Behavior Entry, Attendance
├── hooks/           # useAuth hook with PBKDF2 JWT token handling & role authorization
├── layouts/         # Role Shells: AdminShell, TeacherShell, ParentShell, StudentShell
├── services/        # api.ts (Central Axios / Fetch abstraction with bearer auth)
├── utils/           # Helper utilities, date formatters, and score converters
├── App.tsx          # Master routing configuration with ProtectedRoute guards
└── index.css        # Bento-grid styling, glassmorphism card theme, and color tokens
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
The app will be available at: `http://localhost:5173`

> **Note**: Ensure the FastAPI backend is running at `http://127.0.0.1:8000` before logging in.

### 3. Build for Production
```bash
npm run build
```
The compiled static assets will be output to the `dist/` directory.

---

## 🎨 Role Portals Overview

- **🎓 Student Portal**: Live score prediction, risk classification badge, SHAP feature impact breakdown, and interactive **What-If Lab** to simulate score changes based on study hour and sleep adjustments.
- **👩‍🏫 Teacher Portal**: Classroom roster, **Risk Board** highlighting at-risk students, behavioural score entry, marks recording, and remedial intervention tracker.
- **👨‍👩‍👧 Parent Portal**: Plain-language student summary, attendance tracking, early warning notifications, and personalized action guides without machine-learning jargon.
- **⚙️ Admin Portal**: System administration, user/class enrollment management, timetable publishing, audit log viewer, and **Model Retraining & Monitoring Console**.
