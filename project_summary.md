# OBE Platform — Project Summary

## Overview
Outcome-Based Education (OBE) platform with:
- **Backend**: Node.js / Express / MongoDB (Mongoose)
- **Frontend**: React 18 / Vite / Tailwind CSS / Lucide React
- **ML Service**: Python / FastAPI / Uvicorn (Phase 5+)

---

## Completed Phases

### Phase 0: Project Setup & Health Checks (Completed)
- MongoDB configuration & connection
- Health check endpoints (`/api/health` with mongo status)
- Frontend Vite + Tailwind setup
- JWT authentication scaffolding

---

### Phase 1: Authentication, Authorization & OBE Foundations (Completed)
1. **Authentication API**:
   - `POST /api/auth/login` — Authenticates user, returns JWT and user payload without sensitive fields.
   - `GET /api/auth/me` — Returns current authenticated user profile.
   - `POST /api/auth/register` — Admin-only endpoint to register users with bcrypt hashing (`Password@123`), unique email constraint, and role validation.
2. **Authorization Middleware**:
   - `protect` middleware verifying Bearer tokens and loading user state.
   - `authorize(...roles)` middleware enforcing strict role-based access control with 403 Forbidden on role mismatch.
3. **Official OBE Seed Data**:
   - Seeded Department: Information Technology (`IT`)
   - Seeded Programme: B.Tech Information Technology (`BTECH-IT`)
   - 3 Official PEOs (PEO-I, PEO-II, PEO-III)
   - 12 Official POs (PO1 to PO12 — NBA Graduate Attributes / Washington Accord)
   - 2 Official PSOs (PSO-1: Software System Design, PSO-2: Applied Information Technology)
   - Seeded accounts: Admin, Coordinator (HOD), 2 Faculty, 10 Students.
4. **Automated Test Suite**:
   - `backend/tests/auth.test.js` — 20 test cases covering login, token verification, role permissions (401/403), and register restrictions.

---

### Phase 2: Administrator & Academic Structure Module (Completed)
1. **Backend Architecture**:
   - Standardized 3-tier structure: Routes -> Thin Controllers -> Service Layer -> Mongoose Models.
   - Standard response format: `{ success: true, data: ..., message: ... }`.
2. **Services & Endpoints**:
   - **Users Management** (`/api/users`): Admin-only CRUD, safe password exclusion, admin password resets, soft-deactivation when enrollments exist.
   - **Departments Management** (`/api/departments`): Admin-only create/update/delete, authenticated read.
   - **Programmes Management** (`/api/programmes`): Admin-only create/update/delete, authenticated read, associated with departments.
   - **Courses Management** (`/api/courses`): Admin and Coordinator create/update/delete; faculty get view access scoped to their assigned courses.
   - **Enrollments Management** (`/api/enrollments`): Single student enrollment, bulk enrollment by roll numbers, list by course, and enrollment removal.
   - **Dashboard Analytics** (`/api/dashboard`): Dynamic counts for users by role, departments, programmes, courses, and active enrollments.
3. **Frontend Implementation**:
   - `UsersPage.jsx`: Filter by role, user creation modal, password reset, deactivate/activate, delete.
   - `DepartmentsPage.jsx`: Tabbed view for Departments and Programmes with creation/edit modals.
   - `CoursesPage.jsx`: Filter by programme & semester, course creation/edit modal with faculty assignment.
   - `EnrollmentPage.jsx`: Course selector, enrolled student table with remove option, single enrollment dropdown, and bulk roll-number enrollment.
   - `DashboardPage.jsx`: Live metric cards connected to `/api/dashboard`, activity overview, and role-scoped stats.
   - Shared UI library: `AdminUI.jsx` (cards, badges, modals, form controls, spinners, empty states) and `Toast.jsx` (notifications).
   - Role-based navigation in `AppLayout.jsx` and updated route bindings in `AppRouter.jsx`.
4. **Testing & Quality Assurance**:
   - 50 unit and integration tests covering auth and admin workflows.

---

### Phase 3: Faculty Course Setup Module (Completed)
1. **Backend Course & Ownership Enforcement**:
   - `courseService.getCourseDetails(courseId, user)`: Comprehensive course snapshot returning course info, enrolled student count, COs list, and assessments with question mark summaries.
   - Strict faculty ownership: Faculty A attempting to view or alter Faculty B's courses, COs, assessments, or questions is denied with `403 Forbidden` (`'Forbidden: You are not the assigned faculty for this course'`).
2. **Course Outcomes (COs) Management** (`/api/cos`):
   - CRUD for COs with code format validation (e.g., `CO1`), Bloom's Taxonomy classification (`L1: Remember` to `L6: Create`), target marks %, and attainment goals.
   - Safeguard: Deleting a CO with mapped questions is blocked with `400 Bad Request`.
3. **Assessments Management** (`/api/assessments`):
   - CRUD for course assessments (CIE, Assignment, Quiz, Lab, SEE) with max marks, weightage, and date.
   - Automatic calculation of configured question marks and mismatch warnings.
4. **Questions & Question→CO Mapping** (`/api/questions`):
   - CRUD for individual assessment questions (e.g., Q1a, Q1b, Q2) mapped directly to a CO.
   - **Cross-Course Mapping Prevention**: Validates that mapped CO belongs to the *exact same course*. Attempting to map to a CO from another course fails with `400 Bad Request` (`'Cross-course mapping rejected: Course Outcome does not belong to this course'`).
   - **Marks Sum Validation & Warning**: Checks `sum(questions.maxMarks) == assessment.maxMarks`. Returns warning if mismatch, without silently modifying or corrupting assessment max marks.
5. **Faculty Dashboard**:
   - `GET /api/dashboard` returns live real counts for faculty: `myCourses`, `myStudents`, `myCOs`, `myAssessments`, and `myQuestions`.
6. **Frontend Implementation**:
   - `CourseDetailsPage.jsx`: Tabbed view for Course Outcomes and Assessments & Questions with modals, real-time warning pills, and Question→CO dropdowns.
   - `CoursesPage.jsx`: Added "Setup" action link to directly open Course Details.
   - `DashboardPage.jsx`: Updated faculty dashboard displaying 5 live stat cards.
   - `AppRouter.jsx`: Mounted `/courses/:id` for protected access.
7. **Automated Testing**:
   - `backend/tests/faculty.test.js`: 21 test cases testing ownership checks, cross-course mapping rejection, marks sum warnings, CO CRUD, Assessment CRUD, and real dashboard stats.

---

### Phase 4: Enrollment & Marks Module (Completed)
1. **Enrollment View & Duplicate Prevention**:
   - Authorized faculty, coordinators, and admins to manage course enrollments.
   - Enforce single and bulk enrollment without duplicates; attempts to re-enroll existing students are rejected with `409 Conflict`.
   - Added student enrollment removal with course ownership verification.
2. **Marks Grid & Question-Level Persistence** (`/api/marks`):
   - `GET /api/marks?assessmentId=...`: Generates a dynamic 2D marks grid matching students × questions with existing marks pre-loaded.
   - Saved at question level in `StudentMarks` collection with unique index `{ student, question }`.
3. **Strict Validation Rules**:
   - **Enrolled Student Validation**: Rejects marks entries for students not actively enrolled in the course (`400 Bad Request`).
   - **Assessment Scope Validation**: Rejects questions not belonging to the targeted assessment/course (`400 Bad Request`).
   - **Range Validation**: Requires `0 <= marks <= question.maxMarks` (`400 Bad Request` if `< 0` or `> maxMarks`).
   - **Evaluation State**: Empty/null inputs are stored as `null` representing unevaluated/absent.
   - **Ownership Isolation**: Faculty A cannot view, enter, or bulk-save marks for Faculty B's courses/assessments (`403 Forbidden`).
4. **Bulk Save & CSV Import/Export**:
   - `POST /api/marks/bulk`: Bulk-writes question-level marks using atomic MongoDB upsert operations.
   - `POST /api/marks/csv-import`: Parses raw CSV text or parsed rows, matching question headers (e.g. `RollNo,Q1,Q2`), validating enrollment and marks range, and reporting row-by-row notices.
   - Client CSV template export with pre-filled question headers and enrolled student roll numbers.
5. **Frontend Implementation**:
   - `MarksGridModal.jsx`: Embedded marks spreadsheet accessible directly from each assessment card.
   - `MarksEntryPage.jsx`: Full-page dedicated marks entry interface with course & assessment selector dropdowns.
   - `CourseDetailsPage.jsx`: Added "Enrolled Students" tab (table with single student enroll and bulk roll number enroll).
   - Mounted `/marks` route in `AppRouter.jsx`.
6. **Automated Testing**:
   - `backend/tests/marks.test.js`: 17 test cases verifying enrollment duplicate prevention, marks grid retrieval, every validation rule (enrollment, question scope, score boundaries, empty state), bulk save, and CSV import.
   - Total test suite status: **88/88 tests passing** across all suites (`auth.test.js`, `admin.test.js`, `faculty.test.js`, `marks.test.js`).

---

### Phase 5: CO Attainment + Faculty Reports (COMPLETED)
1. **Mathematical Attainment Engine (`attainmentService.js`)**:
   - **Student CO Attainment**:
     $$\text{Student CO Attainment \%} = \frac{\sum \text{Obtained Marks on Mapped Evaluated Questions}}{\sum \text{Max Marks of those Evaluated Questions}} \times 100$$
   - **Attainment Threshold**: A student attains a CO if $\text{Score \%} \ge \text{target}$ (default 40%).
   - **Class CO Attainment**:
     $$\text{Class CO Attainment \%} = \frac{\text{Number of Evaluated Students Attained}}{\text{Number of Students Evaluated}} \times 100$$
   - **Unevaluated Student Handling**: Unevaluated/absent students (those with no marks entered across all questions mapped to that CO) are strictly excluded from the denominator rather than counted as 0%, preventing artificial downward distortion. Returns coverage metric string: `"x of y evaluated"`.
   - **Gap Analysis**: Computes gap $(\text{Class Attainment} - \text{Target})$ and flags COs falling below the required target threshold.
2. **REST Endpoints (`/api/attainment`)**:
   - `GET /api/attainment/course/:courseId?target=40`: Returns complete CO attainment payload (course metadata, class-wise summary, student-wise matrix, below-target list).
   - `GET /api/attainment/report/:courseId?target=40`: Aggregates faculty report payload for executive review and accreditation documentation.
   - `GET /api/attainment/export-csv/:courseId?target=40`: Generates and streams structured RFC-4180 CSV export containing course metadata, class attainment summary, and student-level marks matrix.
3. **Frontend Implementation**:
   - `COAttainmentPage.jsx` (`/attainment`):
     - Interactive course selector and target threshold input with live re-calculation (default 40%).
     - Class-level metric cards: Average Attainment, Attained COs count, Evaluated Students count.
     - Class-wise CO attainment table with coverage badges (`"x of y evaluated"`) and attainment status chips.
     - Full Student-wise CO matrix showing individual percentage scores and Attained/Not Attained badges.
   - `FacultyReportsPage.jsx` (`/reports`):
     - Course metadata summary header with Department, Academic Year, Semester, and Credits.
     - Executive summary cards with automated accreditation compliance status.
     - Below-Target Alert section highlighting deficit COs, target gaps, and action prompts.
     - Interactive Recharts bar visualization (`BarChart` with dynamic bar colors and dashed `ReferenceLine` at target threshold).
     - One-click CSV Export button with parameterized `?target=` query string.
   - Navigation links added to `AppLayout.jsx` for seamless faculty access.
4. **Automated Testing (`backend/tests/attainment.test.js`)**:
   - **Riya / DBMS Exact Verification**:
     - Deterministic 10-student cohort testing against DBMS course:
       - CO1: 7 students scored $\ge 40\%$ $\rightarrow$ **Class Attainment = 70.0%**.
       - CO2: 7 students scored $\ge 40\%$ $\rightarrow$ **Class Attainment = 70.0%**.
       - CO3: 4 students scored $\ge 40\%$ $\rightarrow$ **Class Attainment = 40.0%**.
     - Target threshold override test: when target set to 50%, CO3 attainment drops to 0% (below target).
   - **Unevaluated Student Exclusion**: Adding an 11th unassessed student verifies that coverage reports `"10 of 11 evaluated"` and attainment remains unpenalized at **70.0%**.
   - **Isolation & Validation**: Cross-course unauthorized access rejected (`403 Forbidden`), unauthenticated access rejected (`401 Unauthorized`), and CSV export stream verified.
   - **Total test suite status**: **95/95 tests passing** across 5 test suites (`auth.test.js`, `admin.test.js`, `faculty.test.js`, `marks.test.js`, `attainment.test.js`).

---

### Phase 6: Coordinator / Programme OBE (COMPLETED)
1. **Curriculum Outcomes Framework (`curriculumService.js`, `/api/curriculum`)**:
   - Full CRUD management for **PEOs**, **POs** (PO1–PO12 Washington Accord Graduate Attributes), and **PSOs** (Program Specific Outcomes).
   - Deletion safety guard: prevents deleting a PO or PSO if active `COPOMapping` or `COPSOMapping` references exist (`400 Bad Request`).
   - Scope authorization: coordinator restricted to programmes within their assigned department (`403 Forbidden` on foreign department access).
2. **CO-PO & CO-PSO Mapping Engine (`mappingService.js`, `/api/mappings`)**:
   - Coordinator picks a course in their programme and maps COs to POs / PSOs with correlation strength 1 (Low), 2 (Medium), 3 (High), or 0 (Unmap).
   - Strict validation:
     - `CO → course`: Rejects mappings if CO belongs to a different course (`400 Bad Request`).
     - `PO/PSO → programme`: Rejects mappings if PO/PSO belongs to a different programme (`400 Bad Request`).
     - Duplicate prevention: atomic upsert ensures unique mappings per outcome pair.
   - Matrix views: returns structured indexed correlation matrices for rapid grid rendering.
3. **Programme Attainment Engine (`programmeAttainmentService.js`, `/api/programme-attainment`)**:
   - **Architectural Requirement**: Strictly consumes `attainmentService.calculateCourseCOAttainment()`; **never recomputes CO attainment**.
   - **Clearly Labeled Default Formula (Swappable)**:
     $$\text{PO / PSO Attainment} = \frac{\sum (\text{CO Attainment} \times \text{Strength})}{\sum \text{Strength}}$$
     calculated strictly over mapped COs with evaluated marks data (`classAttainment !== null`).
   - **Unevaluated / Unmapped Policy**: If no mapped COs have evaluated data, returns `null` with status `"Not mapped / No data"` (**NEVER defaults to 0%**).
   - **Programme Metrics**:
     - Aggregate PO/PSO attainment across all courses in the programme.
     - Accreditation gap analysis with list of below-target outcomes and shortfall percentages.
     - Contributing courses and COs breakdown detailing each course code, CO code, attainment, and correlation strength.
     - Course-wise PO Attainment Matrix (NBA Criterion 3 table format).
     - Parameterized CSV export (`?target=`, `?academicYear=`).
4. **Frontend Implementation**:
   - `CurriculumOutcomesPage.jsx` (`/outcomes`):
     - Tabs for POs, PSOs, and PEOs with graduate attribute badges and detailed statements.
     - Add / Edit modals and delete guards.
   - `COPOMappingPage.jsx` (`/mappings` and `/curriculum`):
     - Course selector dropdown with live programme context.
     - Interactive CO-PO and CO-PSO correlation matrices with visual strength badges (1: Low Amber, 2: Medium Blue, 3: High Emerald).
     - Live row and column average calculations and single-click "Save Matrix" button.
   - `ProgrammeReportPage.jsx` (`/programme-report`):
     - Programme selector, academic year filter, target threshold input (default 60%).
     - Executive summary cards (Average PO Attainment, Average PSO Attainment, Below Target count, Courses count).
     - Accreditation Gap Alert cards for below-target outcomes.
     - **Recharts Visualizations**:
       - Interactive **Bar Chart** with target reference line and color coding.
       - Interactive **Radar / Spider Chart** for PO1–PO12 Washington Accord attribute profile.
     - Collapsible breakdown table of contributing courses and COs.
     - Full Course-wise PO matrix in NBA Criterion 3 format.
     - CSV Export button.
   - Updated `DashboardPage.jsx`: Real coordinator live counts and accreditation workflow shortcut cards.
   - Updated `AppLayout.jsx` & `AppRouter.jsx`: Full navigation and route registration.
5. **Automated Testing (`backend/tests/programme.test.js`)**:
   - **Hand-Calculated Deterministic Example**:
     - Course with CO1 (70.0%), CO2 (80.0%), CO3 (50.0%), and CO4 (unevaluated).
     - PO1 mapped to CO1 (strength 3) & CO2 (strength 2):
       $$\text{PO1} = \frac{70.0 \times 3 + 80.0 \times 2}{3 + 2} = \frac{210 + 160}{5} = \mathbf{74.0\%}$$
     - PO2 mapped to CO3 (strength 1) & CO2 (strength 3):
       $$\text{PO2} = \frac{50.0 \times 1 + 80.0 \times 3}{1 + 3} = \frac{50 + 240}{4} = \mathbf{72.5\%}$$
     - PO3 mapped to unevaluated CO4: returns `null`, status `"Not mapped / No data"` (NEVER 0%).
     - PO4 unmapped: returns `null`, status `"Not mapped / No data"` (NEVER 0%).
     - PSO1 mapped to CO1 (strength 2): $\text{PSO1} = \frac{70.0 \times 2}{2} = \mathbf{70.0\%}$.
     - Target threshold override: when target raised to 75%, CO3 drops to 0%, PO2 attainment shifts to 60.0% (gap 15.0%), and below-target outcomes are accurately detected.
   - **Validation Tests**: Cross-course CO mapping rejected (`400 Bad Request`), cross-programme PO mapping rejected (`400 Bad Request`), deletion of mapped PO blocked (`400 Bad Request`), unauthorized department coordinator blocked (`403 Forbidden`), unauthenticated blocked (`401 Unauthorized`).
   - **Total test suite status**: **103/103 tests passing** across 6 test suites (`auth.test.js`, `admin.test.js`, `faculty.test.js`, `marks.test.js`, `attainment.test.js`, `programme.test.js`).
