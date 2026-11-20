# AcadIQ: Frontend Plan (React) - Version 2
**Smart Student Performance Analysis and Final Score Prediction Using Academic and Behavioural Factors**

> Version 2 adds: Linways feature coverage, building on the existing app, student and teacher management, the full marks upload pipeline, extra academic modules, expanded data model and revised priorities (Sections 21-30). Planning document only. No implementation code. It can be pasted into any tool, report or AI builder as the single source of truth for the frontend.

---

## Table of contents
1. Product overview
2. Research basis (Linways) and differentiation
3. Design principles
4. Design system (colour, type, spacing, layout)
5. Motion system
6. Overlay and popup system
7. Component library
8. Technical architecture
9. Route map and access rules
10. Authentication and login pages
11. Student portal (every page)
12. Teacher portal (every page)
13. Parent portal (every page)
14. Admin portal (every page)
15. ML insight surfaces and data contracts
16. API endpoint list
17. Notifications
18. Responsive, accessibility, performance
19. Empty, loading and error states
20. Testing, build phases, demo script
21. Linways coverage matrix and scope decisions
22. Building on your existing app
23. Student, teacher and class management
24. Exams, marks upload and results
25. Additional academic modules
26. New pages added per role
27. Expanded data model
28. Additional API endpoints
29. New popups, states and notifications
30. Revised priorities, phases and demo

---

## 1. Product overview

**Name (working):** AcadIQ
**Purpose:** A college academic portal with a familiar ERP core (attendance, marks, timetable, messages) and an **Insight Layer** that predicts final score, classifies risk (Low / Medium / High), explains why, simulates "what-if" changes and recommends actions.

**Four roles, four separate experiences**

| Role | Goal in the app | Accent colour | Tone |
|---|---|---|---|
| Student | Understand own performance, improve, plan | Teal | Motivating, personal |
| Teacher | Spot students who need help, act, track outcome | Indigo | Efficient, analytical |
| Parent | Know how the child is doing, stay connected | Orange | Calm, plain language |
| Admin | Set up the system, keep data and model healthy | Slate | Controlled, precise |

**Success criteria**
- A student sees predicted score, risk and top 3 actions within 5 seconds of login.
- A teacher can find and act on all High-risk students in 3 clicks.
- A parent can understand the child's status without any ML jargon.
- Every screen has designed loading, empty and error states.

---

## 2. Research basis (Linways) and differentiation

Linways AMS is a cloud college ERP widely used in Kerala colleges. Public descriptions show these ideas worth borrowing:

- Separate entry points for admin, staff and student.
- Teacher "batch/classroom" view bringing together attendance, performance reports, weak-student identification and assignments.
- Subject communities with the teacher as moderator.
- Lesson planner (teacher) and student planner.
- Parents portal showing attendance and exam reports, plus notifications.
- Timetable, marks publishing, performance graphs, internal messaging.
- Mobile app with push notifications.

**What AcadIQ adds (the project's contribution)**

| Linways-style basics (we replicate the workflow) | AcadIQ Insight Layer (new) |
|---|---|
| Attendance, marks, timetable | Predicted final score with uncertainty range |
| Weak-student list | Explainable risk (which factors help or hurt) |
| Performance graphs | What-if simulator and counterfactual advice |
| Messaging | Intervention tracker with outcome follow-up |
| Parents portal | Plain-language parent summary and early alerts |
| Reports | Learner clusters and trend-based early warning |

---

## 3. Design principles

1. **Role first.** Each role has its own shell, navigation, accent and vocabulary.
2. **Insight over data.** Show what to do next, not only numbers.
3. **Boxy bento.** Structured rectangular tiles in a grid, crisp borders, restrained shadows.
4. **Motion with meaning.** Animation explains change (a score moving, a panel opening); never decoration only.
5. **Calm for sensitive data.** Risk is shown with care. Wording supports, never labels.
6. **Accessible by default.** Contrast, keyboard, screen-reader labels, reduced-motion support.

---

## 4. Design system

### 4.1 Colour tokens

**Neutrals**

| Token | Light | Dark |
|---|---|---|
| `bg` | #F7F6F3 | #0B1020 |
| `surface` | #FFFFFF | #121830 |
| `surface-2` | #F0EEE9 | #1A2140 |
| `border` | #E5E3DD | #232B4A |
| `text` | #14161B | #EEF1FA |
| `text-muted` | #6B7280 | #98A2C3 |

**Role accents** (primary, hover, soft background)

| Role | Primary | Hover | Soft |
|---|---|---|---|
| Student | #0D9488 | #0B7A70 | #D5F3EF |
| Teacher | #4F46E5 | #4038C4 | #E3E1FC |
| Parent | #F97316 | #D9610C | #FDE6D3 |
| Admin | #475569 | #334155 | #E2E8F0 |

**Semantic (same in every role)**

| Token | Value | Use |
|---|---|---|
| `risk-high` | #DC2626 | High risk |
| `risk-medium` | #EAB308 | Medium risk |
| `risk-low` | #16A34A | Low risk |
| `info` | #2563EB | Information |
| `success` / `warning` / `danger` | #16A34A / #D97706 / #DC2626 | Feedback |

Rule: risk is **never colour only**. Every risk chip has an icon (shield-alert, shield, shield-check) and a text label.

### 4.2 Typography
- Headings: **Plus Jakarta Sans** (600-800). Body: **Inter** (400-600). Numbers: Inter with tabular figures.
- Scale (px): 12 caption, 14 body-small, 16 body, 20 h4, 24 h3, 32 h2, 48 KPI, 64 hero score.
- Line height 1.4 body, 1.15 headings. Max line length 70 characters.

### 4.3 Spacing, radius, elevation
- Spacing scale on a 4-px base: 4, 8, 12, 16, 24, 32, 48, 64.
- Radius: `sm` 6, `md` 10 (default tile), `lg` 14 (modal), `xl` 20 (hero).
- Borders 1 px hairline on every tile. Elevation: `e1` subtle (resting tile), `e2` hover lift, `e3` popovers, `e4` modals (with backdrop blur 8 px).

### 4.4 Layout grid
- Shell: left sidebar (264 px, collapses to 76 px icon rail), top bar 64 px, content max-width 1440 px.
- Content uses a **12-column bento grid**, gap 16 px (24 px on wide screens).
- Breakpoints: 480 / 768 / 1024 / 1280 / 1536. Below 768 px the sidebar becomes a bottom tab bar (5 items max) and the grid becomes one column.

### 4.5 Iconography and imagery
- Lucide line icons, 20 px default, 1.75 stroke.
- Illustrations: flat, role-tinted; used only on login, empty states and onboarding.
- Student avatars: initials on a tinted circle if no photo.

### 4.6 Theming
- Light and dark themes via CSS variables; toggle in top bar, preference saved, defaults to system.
- Accent swaps automatically with the role shell.

---

## 5. Motion system

**Library choices:** Framer Motion (UI), Lottie (a few illustrations), chart-library animations (data).

**Tokens**

| Token | Value |
|---|---|
| Duration fast / base / slow / data | 120 / 220 / 320 / 700 ms |
| Ease out (default) | cubic-bezier(0.16, 1, 0.3, 1) |
| Ease in-out | cubic-bezier(0.65, 0, 0.35, 1) |
| Spring (panels, drawers) | stiffness 260, damping 24 |
| Stagger step | 40 ms (cap total at 400 ms) |

**Animation catalogue**

| Moment | Behaviour |
|---|---|
| Route change | Content fades and slides up 12 px (220 ms); sidebar and top bar never re-animate |
| First load of a dashboard | Tiles enter in reading order with stagger |
| KPI numbers | Count up from 0 to value (700 ms) once, when visible |
| Score gauge ring | Sweeps from 0 to value; colour eases to risk colour |
| Charts | Lines draw in, bars grow from baseline, radar expands from centre |
| Hover on tile | Lift 2 px, border brightens to accent, 120 ms |
| Button press | Scale 0.98; loading state morphs label into spinner |
| Sidebar active indicator | Shared-layout pill slides between items |
| Role tab switch (login) | Underline slides; accent colour and illustration cross-fade (320 ms) |
| Value change (what-if) | Number tweens, gauge animates to new value, delta chip appears (+3.2) |
| Risk change | Badge morphs between states; brief ring pulse when improving |
| Goal achieved | Small confetti burst (about 1 s), then check mark |
| Lists | New items slide in; removed items collapse; reordering uses layout animation |
| Skeletons | Soft shimmer sweep, 1.4 s loop |
| Reduced motion | All of the above become instant fades; no movement, no confetti |

---

## 6. Overlay and popup system

All overlays use one visual language: blurred dimmed backdrop, focus trap, `Esc` to close, return focus on close.

| Overlay | Motion | Used for |
|---|---|---|
| **Expanding card modal** | Tile morphs into a large modal via shared-element transition (320 ms spring) | Student 360 view, insight detail, subject detail |
| **Dialog** | Scale 0.96 to 1 and fade, 220 ms; footer actions | Forms, assigning interventions, confirmations |
| **Confirm dialog** | Same as dialog, destructive button in danger colour, requires typing for critical actions | Delete user, retrain model |
| **Side drawer (right)** | Slides in with spring, 480 px wide | Quick student view, filters, notifications |
| **Bottom sheet** | Slides up, draggable, snap points | Mobile equivalent of drawers and dialogs |
| **Popover** | Fade and 4 px rise | Info tips, "why this score?", demo credentials |
| **Toast** | Slide in from bottom-right, stacks up to 3, auto-dismiss 5 s, optional Undo | Saved, sent, error |
| **Command palette** (`Ctrl+K`) | Centered, fast fade, fuzzy search | Jump to student, page or action (teacher, admin) |
| **Onboarding tour** | Spotlight cut-out with step popovers (3-6 steps) | First login for each role |
| **Alert popup** | Gentle slide and icon shake once | New High-risk student, session expiring |
| **Session-expiry dialog** | Appears 2 minutes before logout with countdown | Security |

---

## 7. Component library

Each component needs: default, hover, focus, active, disabled, loading and error states where relevant.

**Primitives:** Button (primary, secondary, ghost, danger, icon), Input, Password input, Select, Multi-select, Slider (with value bubble), Toggle, Checkbox, Radio, Date picker, Textarea, Tabs, Badge, Chip, Tooltip, Avatar, Progress bar, Stepper, Pagination.

**Layout:** AppShell, Sidebar, TopBar, PageHeader (title, breadcrumb, actions), BentoGrid, Tile (sizes S/M/L/XL), SplitPane, Section divider.

**Data display:** KPI tile (value, delta, sparkline), ScoreGauge, RiskBadge, TrendChart, BarChart, RadarChart, Heatmap, Scatter (predicted vs actual), FactorImpactBar (diverging bars), DataTable (sort, filter, sticky header, row selection, density toggle), Timeline, Kanban column and card, Calendar (timetable, attendance), StatusDot.

**Domain components:** StudentCard, StudentRow, RecommendationItem (checkable), InterventionCard, GoalRing, WhatIfSlider panel, QuestionnaireItem (1-5 scale with emoji or labels), ClusterBubble, ParentSummaryCard, AlertCard.

**Feedback:** Toast, Skeleton variants, EmptyState (illustration, message, primary action), ErrorState (retry), InlineBanner.

---

## 8. Technical architecture

| Concern | Choice |
|---|---|
| Build | Vite + React 18 + TypeScript |
| Routing | React Router (nested routes, role guards, lazy loading) |
| Styling | Tailwind CSS with design tokens as CSS variables |
| Accessible primitives | shadcn/ui on Radix (dialog, drawer, popover, tabs, tooltip) |
| Animation | Framer Motion, Lottie |
| Charts | Recharts or ECharts (choose one, wrap in own components) |
| Server state | TanStack Query (caching, retry, optimistic updates) |
| UI state | Zustand (theme, sidebar, active child for parent, command palette) |
| Forms | React Hook Form + Zod schemas |
| Tables | TanStack Table |
| i18n | i18next, English first, Malayalam optional |
| Testing | Vitest, React Testing Library, Playwright |
| Backend contract | FastAPI wrapping the Python ML code, JWT with role claim |

**Folder structure (planned)**
```
src/
  app/          routes, providers, role guards, error boundary
  design/       tokens, themes, motion presets, icons
  components/   ui/  charts/  layout/  domain/  feedback/
  features/
    auth/  student/  teacher/  parent/  admin/  insights/  messages/  notifications/
  layouts/      StudentShell  TeacherShell  ParentShell  AdminShell  AuthLayout
  services/     apiClient, endpoints, types, mappers
  hooks/        useAuth, useRole, useReducedMotion, useBreakpoint
  utils/        formatters, riskHelpers, plainLanguageMap
  mocks/        demo data for offline demo
```

---

## 9. Route map and access rules

| Route prefix | Role | Notes |
|---|---|---|
| `/` | Public | Landing: product intro, "Choose your portal" with four role cards |
| `/student/login`, `/teacher/login`, `/parent/login`, `/admin/login` | Public | Same layout, role-specific copy and fields |
| `/student/*` | student | Guarded |
| `/teacher/*` | teacher | Guarded |
| `/parent/*` | parent | Guarded, only linked children |
| `/admin/*` | admin | Guarded |
| `/403`, `/404`, `/session-expired` | Public | Designed pages |

**Guard behaviour:** unauthenticated users go to the matching login with a "return to" path. A logged-in user opening another role's route sees the 403 page with a button back to their own home. Direct data requests are also enforced by the backend, not only the UI.

**Data visibility rules**
- Student: own records only.
- Parent: only linked children; class comparisons anonymised and shown as ranges.
- Teacher: students in assigned classes only.
- Admin: management data and aggregates; individual academic details only when needed, and every access is logged.

---

## 10. Authentication and login pages

### 10.1 Landing page (`/`)
- Hero: product name, one-line value statement, animated score-ring illustration.
- Four **role cards** (Student, Teacher, Parent, Admin), each with icon, one sentence and "Sign in" button; hover lifts and tints in the role accent.
- Short "How it works" strip: Collect, Predict, Explain, Improve (4 tiles with icons).
- Footer: privacy note, "predictions support students and are not a label".

### 10.2 Login page layout (all roles share this)

```
+---------------------------------------------------------------+
| Logo AcadIQ                                    [Theme] [Help] |
+-----------------------------+---------------------------------+
|                             |   [Student][Teacher][Parent][Admin]
|   Role-tinted illustration  |   ------------------------------
|   (animated, Lottie)        |   Welcome back, <Role>
|                             |   Sub-line in plain language
|   Tagline + 3 benefit bullets|  [ ID field            ]
|   specific to the role      |   [ Password        (eye) ]
|                             |   [x] Remember me   Forgot?
|                             |   [      Sign in        ]
|                             |   ---- or ----
|                             |   Demo credentials (popover)
+-----------------------------+---------------------------------+
| Privacy | Terms | Support                                      |
+---------------------------------------------------------------+
```

### 10.3 Role-specific login details

| Role | Identifier field | Extra | Left-panel copy |
|---|---|---|---|
| Student | Admission / roll number | None | "Know where you stand. Know how to improve." |
| Teacher | Staff ID or email | None | "See who needs help before exams do." |
| Parent | Registered mobile or email | Optional OTP login (future) | "Stay informed about your child's progress." |
| Admin | Email | Optional 2-step verification | "Manage users, data and model health." |

### 10.4 Behaviour and states
- **Role tabs** switch the route and animate accent colour, illustration and copy; focus stays on the first field.
- **Validation (inline, on blur and submit):** identifier required and format-checked; password at least 8 characters on first-login set-up. Messages are short and kind ("Please enter your roll number").
- **Submit:** button shows spinner and disables; on success a short success tick, then redirect to the role home (or the saved return path).
- **Errors:** wrong credentials show a shake on the card and an inline banner ("ID or password is incorrect"). Never reveal which part was wrong.
- **Lockout:** after 5 failed attempts show a banner with a 5-minute countdown.
- **Forgot password:** dialog with 3 steps (enter ID, verify code, set new password) using a stepper; success toast on completion.
- **First login:** forced password change dialog, then the onboarding tour starts.
- **Parent first login:** consent dialog explaining what data parents can see.
- **Demo credentials popover:** one example account per role for viva (hidden in production build).
- **Accessibility:** labels, error text linked via aria-describedby, show/hide password button with label, full keyboard flow.

---

## 11. Student portal

### 11.1 Shell
- Sidebar items: Dashboard, Performance, Insights, What-If Lab, Planner, Check-in, Attendance, Marks, Timetable, Messages.
- Top bar: global search, notifications bell with count, theme toggle, profile menu.
- Accent: teal. Greeting uses first name and time of day.

### 11.2 S1 Dashboard (`/student`)

```
+----------------------+------------------+-----------------+
| SCORE GAUGE (L)      | RISK TILE (M)    | WEEKLY GOAL (S) |
| Predicted 68.4       | Medium  [i]      | ring 3/5 done   |
| range 64 - 72        | "Attendance and  |                 |
| vs last week +1.2    |  study hours are |                 |
|                      |  the main drag"  |                 |
+----------------------+------------------+-----------------+
| TREND (L, 2 cols)                   | TOP 3 ACTIONS (M)   |
| predicted score over time           | checkable items     |
+-------------------------------------+---------------------+
| TODAY'S TIMETABLE (M) | DEADLINES (M) | STREAK + BADGES (S) |
+-----------------------+---------------+---------------------+
```

- **Components:** ScoreGauge, RiskBadge with "why?" popover, GoalRing, TrendChart, RecommendationItem list, Timetable list, streak counter.
- **Data:** latest prediction, previous prediction (for delta), recommendations, timetable, deadlines.
- **Interactions:** "Why this score?" opens the expanding insight modal; checking an action animates a tick and updates the goal ring; "Open What-If Lab" button on the gauge tile.
- **States:** no prediction yet shows an EmptyState with "Complete your first check-in".

### 11.3 S2 Performance (`/student/performance`)
- Tiles: predicted vs actual scatter (when results exist), subject-wise bars, internal marks timeline, assignment completion.
- Filters: semester, subject (drawer on mobile).
- Interaction: clicking a subject bar opens a subject detail modal.

### 11.4 S3 Insights (`/student/insights`)
- **Factor impact** (diverging bars: green helps, red hurts, in marks).
- **Behaviour radar** with a "class average" toggle (anonymised).
- **Weak areas list** sorted by impact, each with recommendation and "add to my plan".
- **Plain-language explanation panel** auto-written from the factors.
- Info popovers explain terms such as "impact".

### 11.5 S4 What-If Lab (`/student/what-if`)

```
+--------------------------+-----------------------------------+
| SLIDERS                  | RESULT                            |
| Attendance   [====o--] 85| Predicted  68.4 -> 72.9  (+4.5)   |
| Study hrs    [===o---] 20| Risk       Medium -> Low          |
| Tutoring     [o------]  2| Gauge animates, delta chip        |
| Sleep        [====o--]  7| "Biggest lever: attendance"       |
| [Reset] [Save as goal]   | before/after bar chart            |
+--------------------------+-----------------------------------+
```
- Sliders start at the student's current values; moving them calls the prediction API (debounced 300 ms) and animates the result.
- "Save as goal" creates a goal in the Planner with a confirmation toast.
- Guard rails: sliders limited to realistic ranges; a note says it is a simulation.

### 11.6 S5 Planner and Goals (`/student/planner`)
- Weekly plan board (Mon-Sun columns) with draggable study blocks.
- Goals list with progress rings; recommendations checklist with completion dates.
- "Generate suggestion" button (optional AI study plan) clearly labelled "AI-generated, edit as needed".
- Celebration animation when a weekly goal is completed.

### 11.7 S6 Weekly Check-in (`/student/check-in`)
- Stepper questionnaire, one question per card with a slide transition: study consistency, concentration, motivation, engagement, preparation confidence (1-5 scale with labels), plus sleep hours and study hours.
- Progress bar, back/next, autosave draft, summary screen before submit.
- On submit: animated "calculating" state, then redirects to the updated dashboard with the new score and delta.

### 11.8 S7 Attendance (`/student/attendance`)
- Overall percentage ring with threshold marker (75%), month calendar heatmap (present, absent, duty leave), subject-wise bars.
- Warning banner if any subject is below threshold, with "classes needed to reach 85%" calculation.

### 11.9 S8 Marks and Assignments (`/student/marks`)
- Table by subject and exam (internal, assignment, series test) with grade chips, trend arrows and rank band (optional).
- Assignment list with due date, status (pending, submitted, graded) and a submit dialog (file upload, drag and drop).

### 11.10 S9 Timetable (`/student/timetable`)
- Week grid with today highlighted, current period pulsing; click a slot for subject and teacher popover.

### 11.11 S10 Messages (`/student/messages`)
- Two-pane: threads list and conversation; tutor messages are pinned; unread badge; attachments; read receipts.

### 11.12 S11 Notifications and S12 Profile
- Notifications: grouped by day, filter chips (Academic, Alerts, Messages), mark all read.
- Profile: personal details, department, semester, theme, language, notification preferences, change password, data download.

---

## 12. Teacher portal

### 12.1 Shell
- Sidebar: Dashboard, My Classes, Risk Board, Interventions, Learner Groups, Attendance, Marks, Reports, Messages.
- Top bar adds the command palette (`Ctrl+K`) and an alerts bell.
- Accent: indigo. Denser layout than student (compact table density option).

### 12.2 T1 Dashboard (`/teacher`)

```
+------------------+------------------+------------------+----------------+
| CLASSES (KPI)    | HIGH-RISK (KPI)  | AVG PREDICTED    | OPEN ACTIONS   |
+------------------+------------------+------------------+----------------+
| RISK DISTRIBUTION (L)               | NEEDS ATTENTION TODAY (L)         |
| stacked bars per class              | list of students + reason + CTA   |
+-------------------------------------+-----------------------------------+
| TODAY'S CLASSES (M)  | RECENT ACTIVITY (M)  | UPCOMING DEADLINES (M)     |
+----------------------+----------------------+----------------------------+
```
- "Needs attention" rows show avatar, name, risk badge, top reason ("attendance fell 12% in 2 weeks") and a quick-action menu (Message, Assign intervention, Open profile).
- Alert popup appears on login if new High-risk students were detected.

### 12.3 T2 My Classes (`/teacher/classes`)
- Grid of class tiles (batch, semester, subject, student count, risk mini-bar, average predicted score).
- Click enters the Class Room.

### 12.4 T3 Class Room (`/teacher/classes/:id`)
A Linways-style batch workspace with tabs:

| Tab | Contents |
|---|---|
| Overview | KPI tiles, risk distribution, attendance trend, average predicted vs actual |
| Students | Searchable table: name, attendance, internals, predicted score, risk, trend, actions; bulk select for messages |
| Attendance | Quick marking grid, period selector, monthly summary |
| Marks | Mark entry table, publish toggle, bulk upload |
| Insights | Class-level feature importance, correlation view, predicted vs actual scatter |
| Groups | Learner clusters (see T9) |

- Student table supports saved filters (for example "High risk and attendance below 75").
- Row click opens the right-side quick drawer; "Open full profile" goes to T5.

### 12.5 T4 Risk Board (`/teacher/risk`)
- Kanban with three columns: High, Medium, Low. Each student card shows avatar, name, predicted score with mini-trend, top reason chip and intervention status icon.
- Cards are not manually draggable between risk levels (risk comes from the model); drag is used to move into an intervention status lane in the Interventions view.
- Toggle between Board and Table views; filter by class, subject and trend (improving, stable, declining).

### 12.6 T5 Student 360 (`/teacher/students/:id`, also opens as expanding modal)

```
+---------------------------------------------------------------+
| Avatar  Name  Roll  Class        [Message][Assign intervention]|
+------------------+----------------+---------------------------+
| PREDICTION       | FACTOR IMPACT  | BEHAVIOUR RADAR           |
| 59.5 (55 - 64)   | diverging bars | 5 axes + class average    |
| Risk High        |                |                           |
+------------------+----------------+---------------------------+
| TREND + ACTUAL RESULTS (L)        | RECOMMENDED ACTIONS (M)    |
+-----------------------------------+----------------------------+
| INTERVENTION TIMELINE (L)         | PARENT COMMUNICATION (M)   |
+-----------------------------------+----------------------------+
```
- "Assign intervention" dialog fields: type (counselling, extra class, mentoring, parent meeting, study plan), due date, notes; creates an entry in the timeline.
- Counterfactual panel: "Smallest changes to reach Medium risk: attendance +9%, study hours +4".

### 12.7 T6 Attendance (`/teacher/attendance`)
- Choose class and period; grid of student toggles (present, absent, late, duty leave), "mark all present" shortcut, keyboard friendly; autosave with toast and undo.
- Copy-from-previous-period button (Linways-style convenience).

### 12.8 T7 Marks and Upload (`/teacher/marks`)
- Editable table with validation (range check, required), row error highlights.
- Bulk upload dialog: drag and drop CSV or Excel, column-mapping step, preview with error count, confirm import with progress.

### 12.9 T8 Intervention Tracker (`/teacher/interventions`)
- Kanban lanes: Planned, In progress, Completed, Reviewed. Cards show student, type, due date, owner.
- "Outcome" dialog on completion: improved, no change, worsened, plus linked score change after 2-4 weeks (auto-computed).
- Summary tiles: interventions done, success rate, average score change.

### 12.10 T9 Learner Groups (`/teacher/groups`)
- Bubble or scatter view of clusters with names (for example "Low attendance, high effort"), group size and typical traits.
- Select a group to see members and suggested group-level action ("run a revision session"); "Message group" action.

### 12.11 T10 Reports (`/teacher/reports`)
- Report builder: choose class, period and sections; live preview; export PDF or CSV; scheduled report option.

### 12.12 T11 Messages and Meetings (`/teacher/messages`)
- Threads with students and parents; template messages ("Attendance concern"); parent meeting requests inbox with accept, propose time, decline.

### 12.13 T12 Profile and settings
- Profile, assigned classes, notification rules (alert when risk rises, when attendance drops by X%), theme, language.

---

## 13. Parent portal

### 13.1 Shell
- Simpler sidebar (6 items): Home, Progress, Attendance, Marks, Messages, Guide.
- Child switcher in the top bar (avatar chips) if more than one child; switching animates a content cross-fade.
- Accent: orange. Larger text defaults, fewer controls, friendly wording.

### 13.2 P1 Home (`/parent`)

```
+---------------------------------------------------------------+
| Hello, <Parent name>      Child: [Rahul v]                    |
+----------------------------------+----------------------------+
| STATUS CARD (L)                  | ATTENTION NEEDED (M)       |
| "Rahul is doing okay."           | 1 thing: attendance 72%    |
| three-light indicator            | [What can we do?]          |
| predicted range 62 - 70          |                            |
+------------------+---------------+----------------------------+
| ATTENDANCE (S)   | LATEST MARKS (S)  | NEXT EVENTS (S)         |
+------------------+-------------------+-------------------------+
| MESSAGE TEACHER (button)  | REQUEST MEETING (button)           |
+---------------------------------------------------------------+
```
- Status sentences are generated from risk level with a gentle tone:
  - Low: "Rahul is on track."
  - Medium: "Rahul is doing okay, with a few areas to strengthen."
  - High: "Rahul could use extra support right now. His teachers are here to help."
- No raw model terms on this screen.

### 13.3 P2 Child Progress (`/parent/progress`)
- Simple trend chart (score band over time), "What is helping" and "What is holding back" lists in plain language, subject strengths.
- Optional "Compare with class range" as a soft band without rankings or names.

### 13.4 P3 Attendance and P4 Marks
- Same data as the student view, simplified: monthly calendar, subject percentages, exam results with plain grade labels.

### 13.5 P5 Messages and Meetings
- Conversation with class tutor; "Request meeting" dialog (preferred dates, topic, note); status chips (requested, confirmed, completed).

### 13.6 P6 Guide (`/parent/guide`)
- Short explainer cards: "How is the predicted score calculated?", "What does risk mean?", "How can I help at home?", plus FAQ. Reinforces that predictions support students and are not a final judgement.

### 13.7 Settings
- Language, notification channels (in-app, email, SMS optional), text size, consent summary.

### 13.8 Plain-language mapping (factor to parent wording)

| Model factor | Parent-friendly text |
|---|---|
| Attendance | Time spent in class |
| Hours studied | Weekly study time |
| Previous scores | Earlier exam results |
| Tutoring sessions | Extra help sessions attended |
| Motivation level | Interest in studies |
| Parental involvement | Support from home |
| Peer influence | Friends' study habits |
| Sleep hours | Sleep routine |
| Physical activity | Exercise routine |

---

## 14. Admin portal

### 14.1 Shell
- Sidebar: Dashboard, Users, Classes and Subjects, Links, Data Import, Model Monitor, Audit Log, Settings.
- Accent: slate. Tables are dense; destructive actions always confirm.

### 14.2 A1 Dashboard
- KPI tiles: users by role, active today, predictions this week, High-risk share, model accuracy.
- Charts: logins over time, risk distribution by department.
- System status tile (API, database, model version).

### 14.3 A2 Users (`/admin/users`)
- Table with role, status, last login; create user dialog (role-based fields), bulk import, reset password, deactivate (confirm), role filter chips.

### 14.4 A3 Classes and Subjects
- Create classes and batches, assign teachers and subjects, set semesters; drag students between classes.

### 14.5 A4 Parent-Student Links
- Search student, attach one or more parent accounts, verification status, unlink with confirm. Shows who has access to what.

### 14.6 A5 Data Import
- Upload wizard (file, map columns, validate, preview errors, commit) for students, attendance and marks; import history with rollback of the last batch.

### 14.7 A6 Model Monitor
- Current model card (name, version, trained on, features list).
- Metrics tiles: MAE, RMSE, R², predicted vs actual scatter on recent results.
- Drift indicator (stable, warning, drifting) with trend chart.
- Global feature importance bars.
- "Retrain" button behind a confirm dialog (type the model name), progress modal, and a version history table with "roll back".

### 14.8 A7 Audit Log
- Searchable table: who, what, when, record type; filter by user and action; export.

### 14.9 A8 Settings
- **Risk thresholds** (High cut-off, Low cut-off) with a live preview of how many students fall into each band.
- Attendance minimum, alert rules, parent consent text, institution branding (logo and colour), data retention.

---

## 15. ML insight surfaces and data contracts

The frontend treats the ML service as an API. Planned response shapes:

**Prediction**
```json
{
  "studentId": "S1023",
  "predictedScore": 68.4,
  "interval": [64.1, 72.7],
  "risk": "Medium",
  "riskProbability": { "High": 0.18, "Medium": 0.55, "Low": 0.27 },
  "delta": 1.2,
  "factors": [
    { "name": "Attendance", "impact": -2.4, "value": 68 },
    { "name": "Hours_Studied", "impact": -1.1, "value": 12 }
  ],
  "recommendations": [
    { "factor": "Attendance", "text": "Improve class attendance. Aim for 85% or higher.", "priority": 1 }
  ],
  "modelVersion": "ridge-v1.3",
  "generatedAt": "2026-10-05T09:30:00Z"
}
```

**What-if request and response**
```json
{ "studentId": "S1023", "changes": { "Attendance": 85, "Hours_Studied": 20 } }
{ "predictedScore": 72.9, "risk": "Low", "delta": 4.5, "topLever": "Attendance" }
```

**Counterfactual:** `{ "target": "Medium", "changes": [{ "factor": "Attendance", "from": 68, "to": 77 }] }`

**Cluster:** `{ "groups": [{ "id": 2, "label": "Low attendance, high effort", "size": 14, "traits": [...], "studentIds": [...] }] }`

**Alert:** `{ "type": "RISK_RISE", "studentId": "S1023", "reason": "Predicted score fell for 2 consecutive check-ins", "createdAt": "..." }`

**UI rules for ML content**
- Always show an uncertainty range next to a point score when available.
- Always pair risk with a reason and an action.
- Label generated text ("AI-generated") and keep rule-based advice as the fallback.
- Include an info popover on every ML tile: "What is this? How is it calculated? What are its limits?"

---

## 16. API endpoint list (planned)

| Area | Endpoint | Roles |
|---|---|---|
| Auth | `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot`, `/auth/reset` | all |
| Me | `GET /me`, `PATCH /me/preferences` | all |
| Student | `GET /students/:id/summary`, `/performance`, `/insights`, `/attendance`, `/marks`, `/timetable` | student, teacher, parent (linked) |
| Predictions | `POST /predict`, `POST /predict/whatif`, `GET /predict/:id/counterfactual` | student, teacher |
| Check-in | `POST /checkins`, `GET /checkins?studentId=` | student |
| Goals | `GET/POST/PATCH /goals` | student |
| Classes | `GET /classes`, `/classes/:id/students`, `/classes/:id/insights`, `/classes/:id/groups` | teacher, admin |
| Attendance | `POST /attendance`, `GET /attendance` | teacher |
| Marks | `POST /marks`, `POST /marks/import` | teacher |
| Interventions | `GET/POST/PATCH /interventions` | teacher |
| Messages | `GET/POST /messages`, `POST /meetings` | teacher, student, parent |
| Notifications | `GET /notifications`, `PATCH /notifications/read` | all |
| Admin | `/users`, `/classes`, `/links`, `/imports`, `/audit`, `/settings` | admin |
| Model | `GET /model/status`, `POST /model/retrain`, `GET /model/metrics` | admin |

Conventions: JSON, pagination (`page`, `pageSize`), consistent error shape (`code`, `message`, `fields`), JWT bearer token with a `role` claim, refresh handled silently, 401 triggers the session-expired page.

---

## 17. Notifications

| Event | Student | Teacher | Parent | Channel |
|---|---|---|---|---|
| New prediction ready | Yes | | | In-app |
| Risk level rose | Yes (gentle) | Yes (alert popup) | Yes (gentle) | In-app, email optional |
| Attendance below threshold | Yes | Yes | Yes | In-app, push optional |
| Assignment due soon | Yes | | | In-app |
| Marks published | Yes | | Yes | In-app |
| Intervention assigned | Yes | Yes | Optional | In-app |
| Meeting requested or confirmed | | Yes | Yes | In-app, email |
| Model retrained | | | | Admin only |

- Bell opens a drawer; items group by day; unread dot; click navigates to the relevant page.
- Tone rule: messages about risk are supportive and action-oriented, never alarmist.

---

## 18. Responsive, accessibility, performance

**Responsive**
- Desktop: sidebar plus bento grid. Tablet: collapsed rail, 2-column grid. Mobile: bottom tab bar, single column, drawers become bottom sheets, tables become card lists.
- Touch targets at least 44 px; sliders have large thumbs and numeric inputs as an alternative.

**Accessibility (target WCAG 2.2 AA)**
- Contrast 4.5:1 for text; check every accent on its soft background.
- Full keyboard operation, visible focus ring in the accent colour, logical tab order, focus trap in overlays.
- Charts include a text summary and a "view as table" toggle.
- Risk and status never rely on colour alone.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Screen reader labels for gauges ("Predicted score 68 out of 100, medium risk").

**Performance targets**
- Route-level code splitting, lazy-load charts and heavy modals.
- First load under 3 s on a mid-range laptop; Lighthouse performance 90+ and accessibility 95+ as report metrics.
- Debounce what-if calls, cache predictions with TanStack Query, optimistic updates for check-ins and goals.
- Virtualise long tables (500+ rows).

---

## 19. Empty, loading and error states

| Screen type | Loading | Empty | Error |
|---|---|---|---|
| Dashboards | Skeleton tiles matching layout | "No prediction yet" with action button | Tile-level retry, rest of page still works |
| Tables | Skeleton rows | "No students match your filters" with clear-filters | Inline banner with retry |
| Charts | Shimmer block | "Not enough data yet (need 2 check-ins)" | Retry link |
| Forms | Disabled submit with spinner | n/a | Field-level and form-level messages |
| What-if | Previous value stays dimmed while updating | n/a | "Couldn't update. Try again." |
| Whole app | Splash with logo pulse | n/a | Error boundary page with "Reload" and support link |
| Offline | Banner "You are offline", read-only cached data | | |

---

## 20. Testing, build phases, demo script

### 20.1 Testing
- Unit tests for formatters, risk helpers and plain-language mapping.
- Component tests for forms, overlays and role guards.
- End-to-end flows with Playwright: login per role, student check-in, what-if, teacher intervention, parent view, admin retrain confirmation.
- Accessibility checks (axe) in CI; visual checks on both themes.
- Role-isolation tests: confirm a student cannot open teacher routes and a parent cannot see unlinked children.

### 20.2 Build phases

| Phase | Deliverables |
|---|---|
| 1. Foundation | Tokens, themes, motion presets, base components, overlay system, Storybook or demo page |
| 2. Auth and shells | Landing, four login pages, role guards, four shells, onboarding tour |
| 3. Student portal | S1-S12 with What-If Lab and Check-in |
| 4. Teacher portal | T1-T12 with Risk Board, Student 360, Intervention Tracker |
| 5. Parent and admin | P1-P7, A1-A8 |
| 6. Integration | Connect to ML API, notifications, real data and mocks toggle |
| 7. Polish | Accessibility pass, performance pass, animations tuning, empty and error states, documentation |

If time is short, cut in this order: AI study plan, learner clusters, admin audit log, Malayalam. Keep student, teacher and parent flows.

### 20.3 Demo accounts (for viva, mock data)
- 1 admin, 2 teachers, 30 students across 2 classes, 6 parents linked to 8 students.
- Curated story students: one High-risk who improves after intervention, one Medium close to Low, one Low stable.

### 20.4 Viva demo script (about 8 minutes)
1. Landing page and role cards (30 s).
2. Student login: dashboard, "why this score?" modal (1.5 min).
3. What-If Lab: raise attendance, show score and risk change (1 min).
4. Weekly check-in, then score update with confetti on goal (1 min).
5. Teacher login: alert popup, Risk Board, open Student 360, assign intervention (2 min).
6. Parent login: plain-language status and meeting request (1 min).
7. Admin: Model Monitor, thresholds setting, accuracy tiles (1 min).
8. Close with the academic-only vs academic + behavioural result as the evidence for the project title.

### 20.5 Definition of done (per screen)
- Matches design tokens and role accent.
- Loading, empty and error states built.
- Responsive at 3 breakpoints, both themes.
- Keyboard and screen-reader checked.
- Animations respect reduced motion.
- Uses real or mock API through the service layer only.
- Role access verified.

---

*Limitations to state in the report: synthetic or self-reported data, small sample sizes, predictions are supportive estimates and not final judgements, and privacy depends on proper consent and access control.*

---
---

# PART 2 (Version 2 additions)

## 21. Linways coverage matrix and scope decisions

Source: Linways public product pages (modules, salient features, mobile app, LMS, analytics, grievance).
Decision key: **Core** = build for sure. **Rec** = recommended if time allows. **Stretch** = only a basic version or mock. **Skip** = mention as future scope.

| Linways feature | Decision | Where it lives in AcadIQ |
|---|---|---|
| Student records, admission data entry | **Core** | Section 23 (add student, bulk import) |
| Teacher and class/subject allocation | **Core** | Section 23 |
| Attendance marking and reports | **Core** | Teacher T6, Section 25.1 |
| Timetable management | **Core** | Section 25.2 |
| Publish marks and performance analysis | **Core** | Section 24 |
| Progress report generation | **Core** | Section 24.9 |
| Parents portal and notifications | **Core** | Part 1 Section 13 |
| SMS, mail and push alerts | **Rec** | Section 29 (in-app and email first) |
| Student leave management | **Rec** | Section 25.3 |
| Course material distribution | **Rec** | Section 25.4 |
| Subject communities and discussion forums | **Rec** | Section 25.5 |
| Lesson planner (planned vs actual) | **Rec** | Section 25.6 |
| Assignments (submit, evaluate, publish) | **Rec** | Section 25.7 |
| Online feedback (students rate teachers and courses) | **Rec** (also feeds ML) | Section 25.9 |
| Polls and surveys | **Rec** | Section 25.9 |
| Grievance redressal | **Rec** | Section 25.10 |
| Notices, events, circulars | **Rec** | Section 25.8 |
| Custom report generator, academic audits | **Rec** | Section 25.12 |
| Role-based access, audit trail, security | **Core** | Part 1 Section 9, Section 25.13 |
| Reports and integration APIs | **Rec** | Section 28 |
| Online exams (MCQ, timer, negative marks) | Stretch | Section 25.7 (quiz) |
| Document repository | Stretch | Section 25.11 |
| Live class link integration | Stretch | Subject community (link field only) |
| Fee management (dues, receipts) | Stretch | View-only tile for student and parent |
| Exam controller (hall tickets, seating, grace and moderation) | Stretch | Section 24.7 (grace and moderation core, rest stretch) |
| Faculty appraisal | Stretch | Built from feedback scores (admin view) |
| Outcome-based education (CO, PO, PSO, Bloom's) | Stretch | Optional attainment tab, Section 24.8 |
| Choice-based credit system (electives) | Stretch | Elective flag on subjects only |
| Admission CRM, social campaigns, alumni, placement, infrastructure, Tally, digital evaluation | Skip | Future scope |

**Positioning line for the report:** "AcadIQ covers the everyday academic workflow of a college ERP and adds a machine-learning insight layer, which Linways-style systems do not publicly describe."

---

## 22. Building on your existing app

You already built the first version from the earlier steps. This plan upgrades it; it does not restart it.

### 22.1 What stays and what changes

| Existing piece | Keep or upgrade |
|---|---|
| `download.py` (training, model comparison) | **Keep.** Becomes the training pipeline; admin "retrain" calls it |
| `models/final_model.pkl`, `processed_students.csv` | **Keep.** Model registry later stores versions |
| `predict.py` (score, risk, explanation, recommendations) | **Keep as the ML module.** Wrap in API endpoints, no logic rewrite |
| Risk thresholds (25th / 75th percentile) | **Move to Admin settings** so they can be edited |
| `app.py` Streamlit: New Prediction page | **Replace.** Inputs now come from stored data plus the weekly check-in, not a manual form |
| `app.py` Student Dashboard page | **Becomes** Student Insights and trend pages |
| `app.py` Class View page | **Becomes** Teacher Class Room and Risk Board |
| SQLite 5 tables (students, academic, behaviour, predictions, results) | **Keep and extend** (Section 27); migrate existing rows |
| Streamlit UI | **Replaced by React**; Streamlit may stay as a quick internal admin demo |

### 22.2 Feature checklist (tick what you already have)

Use this to tell me exactly what exists so the plan can be trimmed.
- [ ] Prediction, risk, explanation, recommendations
- [ ] Student history and trend chart
- [ ] Class risk distribution
- [ ] Actual result entry and predicted-vs-actual
- [ ] Login and roles
- [ ] Student add and import
- [ ] Mark upload
- [ ] Attendance module
- [ ] Parent view
- [ ] React frontend (which pages?)

### 22.3 The key upgrade: ML inputs come from the system

In the old app a user typed every value. In the full system, the model's inputs are collected automatically:

| Model feature | Automatic source in AcadIQ |
|---|---|
| Attendance | Attendance module (overall percentage to date) |
| Previous_Scores | Average of published internal and series-test marks |
| Hours_Studied, Sleep_Hours, Physical_Activity | Weekly student check-in |
| Motivation_Level, Peer_Influence | Weekly check-in questions |
| Tutoring_Sessions | Intervention and extra-class attendance records |
| Parental_Involvement | Class tutor input or parent survey |
| Access_to_Resources, Teacher_Quality | Averaged student feedback survey (Section 25.9) |
| Exam_Score (target) | End-semester result upload (Section 24.10) |

Result: every module you add feeds the predictor, and the project has a clear story: "data from daily college operations drives the prediction".

Caveat to state in the report: the current model was trained on a public dataset, so unit scales (hours per week, 1-3 levels) must be matched by the mapping. When enough real records exist, retrain on the college's own data.

### 22.4 Migration steps
1. Freeze the current database and model; take a backup.
2. Add the new tables (Section 27) and create the user and role tables.
3. Convert existing students into user accounts with temporary passwords.
4. Wrap `predict.py` as an API (prediction, what-if, batch re-predict).
5. Point the new React pages at the API one role at a time.
6. Retire the manual prediction form last.

---

## 23. Student, teacher and class management

### 23.1 Where it lives
Admin: Students, Teachers, Classes. Class tutor and teacher: read-only class lists plus limited edits. Only admin can create, deactivate or promote.

### 23.2 Students page (`/admin/students`)

```
+---------------------------------------------------------------+
| Students              [Import] [Export] [+ Add student]       |
| [Search name / roll / admission no ]  [Dept v][Sem v][Class v][Status v]
+----------+---------+-------+------+--------+--------+--------+
| [] Photo | Name    | Roll  | Class| Attend.| Risk   | Status |...
+----------+---------+-------+------+--------+--------+--------+
| bulk bar (on select): Assign class | Promote | Send credentials | Deactivate | Export
+---------------------------------------------------------------+
```
- Server-side search and pagination, sortable columns, saved filters, density toggle.
- Row click opens a **side drawer** (profile, guardian, class, account status, recent marks) with "Edit" and "Open full profile".
- Status chips: Active, Inactive, Detained, Alumni, Transferred.

### 23.3 Add student (single): 5-step dialog or full page

| Step | Fields | Rules |
|---|---|---|
| 1 Personal | Full name, date of birth, gender, photo (crop tool), phone, email, address, blood group (optional) | Name required; phone 10 digits; email format; age sanity check |
| 2 Academic | Admission number, roll number, university register number, programme, department, batch (admission year), current semester, class/section, admission type (regular, lateral, management), previous qualification and marks | Admission and register numbers unique; class must exist |
| 3 Guardian | Guardian name, relation, phone, email, occupation, second guardian (optional) | At least one contact required; email or phone used to create the parent account |
| 4 Account | Username (defaults to admission number), temporary password (auto), force change on first login, send credentials by email, create parent account, link parent | Preview of what will be created |
| 5 Review | Summary cards with edit links per step | Duplicate check runs here |

**Duplicate detection:** same admission number (hard block); same email, or same phone and date of birth (warning popup "Possible duplicate: view existing record").

**Privacy note in the form:** a small info popover on gender, income-like and similar fields: "Not used for prediction."

**On success (celebration popup):** shows a credential card for student and parent (username, temporary password, copy buttons, print slip) with three actions: *Add another*, *Open profile*, *Back to list*. Temporary passwords are shown once.

### 23.4 Bulk import students (wizard)

```
 (1) Template -> (2) Upload -> (3) Map columns -> (4) Validate -> (5) Review -> (6) Import
```
1. **Template:** download Excel template with dropdowns (department, class, gender), sample row and instructions sheet.
2. **Upload:** drag and drop `.xlsx` or `.csv`, up to 2,000 rows or 5 MB; file type and size errors shown instantly.
3. **Map columns:** auto-matched headers; unmatched columns shown with a select to map or ignore; remembers mapping next time.
4. **Validate:** a table of rows with status chips (Valid, Warning, Error). Errors show the exact cell and reason (for example, "Row 14: phone must have 10 digits"). Inline cell editing to fix. "Download error file" button.
5. **Review:** counts (new, duplicates, errors), duplicate policy select (skip, update existing, stop), toggle "Create parent accounts", toggle "Email credentials".
6. **Import:** progress popup with live counts and animated bar; finishes with a summary dialog and a **credentials sheet download** (password protected or available once).
- **Undo last import** available for 24 hours (admin only, confirm dialog).
- Every import is stored in an **Import history** table with who, when, file name, counts.

### 23.5 Edit, deactivate, promote, transfer
- **Edit:** same form sections, changes logged in the audit trail.
- **Deactivate:** confirm dialog with reason; blocks login but keeps records.
- **Semester promotion wizard:** select class, preview each student (promote, detain, backlog), apply, creates new semester record; results and predictions history are preserved.
- **Class change and transfer:** drag students between classes or use bulk "Assign class".
- **Alumni archive:** completed students move to read-only archive.

### 23.6 Teachers (`/admin/teachers`)
- Add teacher form: staff ID, name, department, designation, qualification, email, phone, joining date, photo.
- **Allocations tab:** assign subjects to classes with a matrix (teacher x subject x class), set **class tutor** per class, set **HOD** per department.
- Bulk import with the same wizard pattern.
- Account actions: reset password, deactivate, resend credentials.

### 23.7 Teacher sub-roles (extra views)

| Sub-role | Extra pages |
|---|---|
| Class tutor | "My Tutor Group" page (all subjects for their class), parent meeting scheduling, tutor remarks, leave approval first stage |
| HOD | Department dashboard (risk by class, attendance, pass percentage), approve marks before publishing, teacher workload view |

### 23.8 Classes, subjects, curriculum (`/admin/classes`)
- Programme, department, batch, semester, class/section records.
- Subject catalogue: code, name, credits, type (theory, lab, elective), max internal and external marks.
- Curriculum mapping: which subjects belong to which semester.
- Timetable builder lives here (Section 25.2).

---

## 24. Exams, marks upload and results

This is the most important data pipeline: published marks feed `Previous_Scores`, and final results feed predicted-vs-actual and model monitoring.

### 24.1 Exam setup (`/admin/exams` and `/teacher/exams`)
Fields: exam name, type (Series Test 1, Series Test 2, Assignment, Lab internal, Model exam, Attendance mark, End semester), class, subject(s), date, maximum marks, pass mark, weightage toward internal total.

**Exam status flow (shown as a stepper chip on every exam):**
`Draft -> Open for entry -> Submitted -> Verified -> Published -> Locked`
- Teacher moves Draft to Submitted; class tutor or HOD verifies; admin or exam cell publishes; Locked prevents changes except through an audited correction.

### 24.2 Mark entry grid (manual entry)

```
+-----------------------------------------------------------------+
| Series Test 1 | Data Structures | CSE-A | Max 50 | Status: Open  |
| [Download template] [Upload marks] [Save draft] [Submit]        |
+------+---------------+--------+----------+-----------+----------+
| Roll | Name          | Marks  | Status   | Remark    | Predicted|
+------+---------------+--------+----------+-----------+----------+
| 01   | Anu K         | [ 42 ] | Present  |           | 66.1     |
| 02   | Rahul S       | [ AB ] | Absent   |           | 59.5     |
+------+---------------+--------+----------+-----------+----------+
| Class average 38.2 | Highest 49 | Below pass: 4 | Missing: 2     |
+-----------------------------------------------------------------+
```
- Keyboard-first: Enter or Tab moves down, arrow keys navigate, paste a column from Excel.
- Accepted entries: number from 0 to max (steps of 0.5), `AB` (absent), `NA` (not applicable).
- Cells below pass mark tint red; invalid entries show a shake and inline message.
- Live footer statistics update as you type.
- **Autosave** every few seconds with a "Saved just now" indicator, "unsaved changes" guard on leaving.
- Version history drawer shows who changed what and when.

### 24.3 Upload marks wizard (`/teacher/marks/upload`)

```
 (1) Select exam -> (2) Download template -> (3) Upload -> (4) Validate -> (5) Review -> (6) Save or submit
```
1. **Select** exam, subject and class (pre-filled if opened from the grid).
2. **Template:** Excel file pre-filled with roll numbers and names so teachers only add marks; locked columns except marks.
3. **Upload:** drag and drop `.xlsx` or `.csv` (max 5 MB).
4. **Validate** (rules below) with a status table and inline fix.
5. **Review:** counts (to be saved, changed, unchanged, errors), side-by-side diff for students whose marks already exist.
6. **Save as draft** or **Submit for verification**.

**Validation rules**

| Rule | Message style |
|---|---|
| File must be `.xlsx` or `.csv`, under 5 MB | "Please upload an Excel or CSV file under 5 MB." |
| Required headers present (Roll, Marks) | "Column 'Marks' not found. Download the template." |
| Roll number exists and belongs to this class | "Roll 57 is not in CSE-A." |
| Marks numeric between 0 and max, or `AB` / `NA` | "Row 9: 55 is above the maximum of 50." |
| No duplicate roll numbers | "Roll 12 appears twice (rows 12 and 31)." |
| Missing students | Warning list: "3 students have no marks." |
| Decimal precision 0.5 only | "Marks must be in steps of 0.5." |
| Overwriting existing marks | Confirmation popup with the diff and a required **reason** if the exam is already Verified or Published |

- Error rows can be downloaded as a file; the user can fix online or re-upload.
- Upload progress popup, then a result card: "48 saved, 2 skipped, 1 warning".
- Every upload is logged in **Upload history** (who, when, file, counts) with a "revert to previous version" action while the exam is not Locked.

### 24.4 Bulk upload for several subjects
- Admin or exam cell can upload one workbook with one sheet per subject (or a single long format with Subject column) for a whole class, using the same wizard with a subject-mapping step.

### 24.5 Verify and publish
- **Verify screen** (tutor or HOD): read-only grid with statistics, flags (outliers, unusually many absentees, class average far from previous exam), approve or send back with comment.
- **Publish dialog:** shows counts, pass percentage, a **student view preview**, a checkbox "Notify students and parents", then a confirm button. After confirming: confetti-free subtle success tick, toast "Marks published".
- **Unpublish** allowed before Locked, with reason.
- **After publish (automatic):** students and parents are notified, and the prediction engine re-runs for the whole class (progress toast "Updating predictions for 58 students").

### 24.6 Result analysis (`/teacher/exams/:id/analysis`, also admin)
Tiles: pass percentage, average, highest, lowest, standard deviation; histogram of marks; grade distribution; toppers (named for teachers, anonymised for students); failed and borderline lists with one-click "Add to risk watch"; comparison with the previous exam; **predicted vs actual** for this exam (new ML touch).
Exports: PDF and Excel.

### 24.7 Moderation, grace marks and normalisation (admin or exam cell)
- Add grace marks per student or class with a reason, a cap and an approver; shown as a separate column, never overwriting the original.
- Optional normalisation (scale internal marks to a target maximum); preview before apply.
- All steps appear in the audit log.

### 24.8 Optional: CO and outcome attainment (stretch)
- Map exam questions to course outcomes; show attainment percentage per outcome as a bar chart. Include only if accreditation relevance is wanted.

### 24.9 Consolidated mark list and progress report
- **Consolidated mark list:** class x subject table with totals, results and grades; Excel and PDF export.
- **Student progress report (PDF):** marks, attendance, predicted vs actual, strengths, improvement areas and recommendations; parent-friendly version with plain wording; bulk generate for a class.

### 24.10 Final result upload (end semester)
- Same wizard as marks upload with exam type "End semester".
- On publish: fills `Actual score`, updates predicted-vs-actual, computes prediction error for the Model Monitor, and offers admin the option "Include in next retraining dataset".

### 24.11 Student and parent marks views
- Student sees only Published marks, with trend arrow, class average band (anonymised), grade, and "view full analysis".
- Parent sees the same in plain language.
- Marks screens never show other students' individual marks.

---

## 25. Additional academic modules

### 25.1 Attendance (extended)
- Period-wise marking, "same as previous period" copy, bulk mark, late and duty leave codes.
- Attendance **condonation** workflow (student requests, tutor and HOD approve).
- **Shortage list** (below 75 percent) with one-click warning messages to student and parent.
- Reports: daily, monthly, subject-wise, student-wise; exports.
- Edit window: teachers can change same-day entries; older changes need tutor approval with reason.

### 25.2 Timetable builder (admin)
- Weekly grid by class: drag subjects and teachers into periods; conflict detection (teacher double-booked, room clash) with warning popup.
- Substitutions: mark teacher absent, suggest free teachers, notify.
- Student and teacher views are read-only copies; current period highlights.

### 25.3 Leave management
- **Student leave:** apply (type, dates, reason, attachment such as medical certificate), status tracker (Pending, Approved, Rejected), tutor approves; approved leave reflects in attendance as duty or medical leave.
- Parent can apply on behalf of the student.
- Teacher leave (optional): apply and approve by HOD.

### 25.4 Course materials and digital library
- Teachers upload files or links per subject with title, unit and tags; students view and download; recently added strip on the student dashboard.
- Simple library page with search and categories. Download count visible to teachers.

### 25.5 Subject communities and discussion forums
- Each subject has a community (teacher as moderator): announcements, materials, discussion threads, polls.
- Threads with replies, mentions, attachments; moderation tools (pin, lock, delete); unread badges.
- Optional "live class" link field that opens an external meeting.

### 25.6 Lesson planner (teacher)
- Plan topics per week against the syllabus; record **actual** delivery; progress ring shows coverage versus plan; HOD can view. Variance report flags subjects falling behind.

### 25.7 Assignments and quizzes
- **Assignments:** create with due date, instructions, attachments, marks; students submit files; teacher evaluates in a grid with comments; publish marks; late submission flag.
- **Quiz (stretch):** MCQ builder, timer, negative marking toggle, auto-grading, result analysis.

### 25.8 Notices, events and calendar
- Admin and teachers post notices (audience: all, department, class, role); pin, expiry date, attachments, read receipts.
- **Academic calendar** with exams, holidays, events and deadlines; dashboards show the next 3 items.

### 25.9 Feedback, polls and surveys
- **Teacher and course feedback** (students rate on a 1-5 scale per question, anonymous), opened by admin for a window.
- Results go to admin and HOD as charts; teachers see their own aggregated, anonymised results.
- Aggregated scores supply `Teacher_Quality` and `Access_to_Resources` features for the model (Section 22.3).
- Generic polls and surveys by admin or teacher with response charts.

### 25.10 Grievance redressal
- Students and parents submit a grievance (category, description, attachment, confidential toggle).
- Routed to the right authority (tutor, HOD, admin, grievance cell); status: Submitted, In review, Action taken, Closed.
- Tracking timeline, response messages, reminder if not handled within a set time, satisfaction rating on closure.
- Admin dashboard: counts by category and turnaround time. This also supports accreditation-style grievance policy.

### 25.11 Document repository (stretch)
- Folder structure for circulars, syllabus, forms and policies with role-based visibility and version labels.

### 25.12 Custom report generator and academic audit
- Report builder: pick data source (attendance, marks, risk, interventions), columns, filters and grouping; live preview; save as template; export PDF, Excel, CSV; schedule by email.
- Prebuilt reports: attendance shortage, class result, subject-wise pass percentage, at-risk summary, intervention outcomes, department comparison.
- **Academic audit** page (admin): checklist and metrics such as marks published on time, attendance entered on time, lesson plan coverage.

### 25.13 Security and compliance features
- Role and permission matrix editor (admin), session management (list and revoke sessions), password policy, optional two-step verification for admin, IP or device note in audit log.
- Data export and deletion requests handled through admin with an audit trail.
- Visible "Who accessed this student record" log for admin.

### 25.14 Fee view (stretch)
- Student and parent see dues, paid history and receipts (PDF) as a simple read-only tile; no payment gateway required for the project.

### 25.15 Installable app experience
- Progressive Web App: install prompt, home-screen icon, offline read-only cache of timetable and last results, push notifications for marks, attendance and alerts. Mirrors the Linways mobile app idea (attendance, timetable, materials, communities).

---

## 26. New pages added per role

| Role | New pages (IDs continue from Part 1) |
|---|---|
| **Admin** | A9 Students, A10 Teachers and Allocations, A11 Classes and Subjects (curriculum), A12 Timetable Builder, A13 Exams and Marks Control (verify, publish, lock, moderation), A14 Result Analysis, A15 Notices and Calendar, A16 Feedback and Surveys, A17 Grievance Cell, A18 Reports and Academic Audit, A19 Roles and Permissions, A20 Import History |
| **Teacher** | T13 Exams (create, status), T14 Mark Entry Grid, T15 Marks Upload Wizard, T16 Result Analysis, T17 Course Materials, T18 Lesson Planner, T19 Assignments, T20 Subject Communities, T21 Leave Approvals, T22 Notices, T23 Feedback Results (own), T24 Tutor Group (class tutor), T25 Department Dashboard (HOD) |
| **Student** | S13 Course Materials, S14 Assignments (submit), S15 Leave Application, S16 Feedback and Polls, S17 Grievance, S18 Notices and Calendar, S19 Subject Communities and Forum, S20 Report Card (PDF), S21 Library, S22 Fee View (stretch) |
| **Parent** | P8 Leave Application, P9 Grievance, P10 Notices and Calendar, P11 Report Card (PDF), P12 Fee View (stretch), P13 Feedback and Polls (if enabled) |

Navigation grouping so menus stay short: sidebar sections **Overview**, **Academics**, **Insights**, **Communication**, **Admin tools**, with collapsible groups and a command palette for everything else.

---

## 27. Expanded data model

Existing tables are kept (students, academic_data, behaviour_data, predictions, results). New and changed entities:

| Group | Tables (key fields) |
|---|---|
| Identity | `users` (id, role, username, password hash, status, must_change_password, last_login), `roles`, `permissions`, `user_roles`, `sessions` |
| People | `students` (adds admission_no, roll_no, register_no, dob, gender, photo, programme, batch, semester, class_id, status), `teachers` (staff_id, department, designation, is_tutor, is_hod), `guardians` (student_id, name, relation, phone, email, user_id) |
| Structure | `departments`, `programmes`, `classes`, `subjects`, `curriculum` (semester x subject), `teacher_allocations` (teacher, subject, class), `timetable_slots` |
| Attendance | `attendance_records` (student, subject, date, period, status), `leave_requests`, `condonation_requests` |
| Exams and marks | `exams` (type, class, subject, max, pass, weight, status), `marks` (exam, student, value, status code, version), `mark_versions` (history), `grace_marks`, `upload_batches` (who, file, counts, status), `results_final` (student, semester, actual_score) |
| Academic content | `materials`, `communities`, `threads`, `posts`, `assignments`, `submissions`, `lesson_plans`, `lesson_actuals`, `quizzes` (stretch) |
| Communication | `notices`, `events`, `messages`, `notifications`, `meetings` |
| Feedback and care | `feedback_forms`, `feedback_responses`, `polls`, `grievances`, `grievance_events`, `interventions` |
| ML | `checkins`, `predictions` (adds model_version, interval, probabilities), `prediction_factors`, `recommendations`, `clusters`, `alerts`, `model_registry`, `settings` (thresholds) |
| Governance | `audit_log`, `import_history`, `report_templates` |

Relationship rules: a parent can link to many students; a student can have many guardians; marks belong to exam and student; a published exam cannot be edited without an audited correction.

---

## 28. Additional API endpoints

| Area | Endpoint (planned) | Roles |
|---|---|---|
| Students | `GET/POST /students`, `PATCH /students/:id`, `POST /students/import/validate`, `POST /students/import/commit`, `POST /students/promote`, `POST /students/:id/deactivate` | admin (teacher read) |
| Teachers | `GET/POST /teachers`, `PUT /allocations`, `POST /teachers/import` | admin |
| Classes | `GET/POST /classes`, `/subjects`, `/curriculum`, `/timetable` | admin |
| Exams | `GET/POST /exams`, `PATCH /exams/:id/status` | admin, teacher |
| Marks | `GET /exams/:id/marks`, `PUT /exams/:id/marks` (grid save), `GET /exams/:id/template`, `POST /exams/:id/marks/upload/validate`, `POST /exams/:id/marks/upload/commit`, `GET /exams/:id/versions`, `POST /exams/:id/verify`, `POST /exams/:id/publish`, `POST /exams/:id/grace` | teacher, tutor, HOD, admin |
| Results | `GET /exams/:id/analysis`, `GET /classes/:id/consolidated`, `POST /results/final/import`, `GET /students/:id/report-card.pdf` | by role |
| Leave | `POST /leaves`, `PATCH /leaves/:id` | student, parent, tutor |
| Content | `/materials`, `/communities`, `/threads`, `/assignments`, `/submissions`, `/lesson-plans` | teacher, student |
| Notices | `/notices`, `/events` | admin, teacher; read for all |
| Feedback | `/feedback/forms`, `/feedback/responses`, `/polls` | admin, student |
| Grievance | `/grievances`, `/grievances/:id/events` | student, parent, authorities |
| Reports | `/reports/templates`, `/reports/run`, `/reports/export` | admin, teacher |
| Jobs | `GET /jobs/:id` (progress of imports, publishing, re-prediction) | requester |

Notes: long actions (import, publish, batch re-prediction) return a job id; the UI shows progress through polling or server events. Validation endpoints never save data. Every write records the actor in the audit log.

---

## 29. New popups, states and notifications

**Popups and overlays for the new modules**

| Moment | Overlay |
|---|---|
| Add student success | Celebration dialog with credential card |
| Possible duplicate | Warning dialog with link to existing record |
| Bulk import and mark upload progress | Progress dialog with animated bar, live counts and cancel |
| Upload validation errors | Full-width results panel plus "download error file" |
| Overwrite existing marks | Diff dialog with required reason |
| Publish marks | Confirm dialog with counts and student-view preview |
| Unpublish or revert version | Danger confirm dialog with reason |
| Promote semester | Wizard drawer with per-student preview |
| Deactivate user | Danger confirm dialog |
| Leave decision | Side drawer with certificate preview and approve or reject |
| Grievance details | Expanding card modal with timeline |
| Materials preview | Modal viewer for PDF and images |
| Unsaved changes | Guard dialog (Stay, Discard, Save draft) |

**New empty states:** "No students yet. Add one or import a file", "No marks uploaded for this exam", "No materials added yet", "No grievances. That's good news".

**New notifications**

| Event | Recipient |
|---|---|
| Marks submitted for verification | Tutor or HOD |
| Marks published | Students, parents |
| Marks corrected after publish | Affected students, parents |
| Leave applied or decided | Tutor, student, parent |
| Assignment posted, due soon, graded | Students |
| Grievance updated | Submitter, authority |
| Notice posted | Target audience |
| Import finished or failed | Requester |
| Attendance shortage | Student, parent, tutor |
| Feedback form opened | Students |

---

## 30. Revised priorities, phases and demo

### 30.1 Priority order for a final-year project
1. **P1 (must):** auth and roles, student and teacher management, classes and subjects, attendance, exams and marks upload with verify and publish, student and teacher dashboards with ML insights, parent view.
2. **P2 (should):** weekly check-in feeding the model, what-if, interventions, result analysis, progress report PDF, notices, leave management, admin model monitor and settings, grievance, feedback.
3. **P3 (could):** materials, communities and forum, lesson planner, assignments, custom report generator, PWA.
4. **P4 (stretch):** quiz, fee view, document repository, CO attainment, live class link.

### 30.2 Revised build phases

| Phase | Deliverables |
|---|---|
| 0. Audit | Complete the checklist in 22.2; freeze and back up the existing app |
| 1. Foundation | Design system, overlays, auth, four shells, role guards |
| 2. People and structure | Students (add, import), teachers, classes, subjects, allocations, parent linking |
| 3. Data pipeline | Attendance, exams, mark entry grid, upload wizard, verify, publish, final result upload |
| 4. Intelligence | API around `predict.py`, check-in, automatic feature mapping, student and teacher insight pages, what-if, risk board, interventions |
| 5. Parent and admin | Parent portal, admin dashboards, model monitor, threshold settings |
| 6. Engagement modules | Notices, leave, feedback, grievance, materials, communities, assignments |
| 7. Polish | Reports and PDFs, PWA, accessibility, performance, documentation |

### 30.3 Additions to the viva demo (extra 3 minutes)
1. Admin adds a student by form, then imports 30 students from Excel, showing validation errors fixed inline.
2. Teacher uploads series-test marks, resolves errors, submits; tutor verifies; admin publishes.
3. Notifications fire, predictions refresh, and the student's score and risk update live.
4. Show a student feedback form feeding the Teacher Quality feature, and a grievance moving to Closed.
5. Final slide: Linways-style coverage matrix (Section 21) next to the ML insight layer.

### 30.4 Updated definition of done
Every new screen also needs: audit log entry for writes, role permission check, validation with clear messages, loading and empty states, import or upload paths tested with a bad file, and a notification where listed in Section 29.

---

*End of Version 2.*
