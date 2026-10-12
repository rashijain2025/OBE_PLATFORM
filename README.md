# OBE Platform

Full-Stack Outcome-Based Education (OBE) Platform adhering to NBA / Washington Accord standards, featuring:
- **React Frontend**: Modern responsive web application (Vanilla CSS tokens, Recharts dashboards, role-based interfaces).
- **Express / Node.js Backend**: REST API with JWT authentication, role guards, question-level marks entry, continuous CO attainment, CO-PO/PSO matrices, and rate-limited security hardening.
- **FastAPI ML Service**: Continuous Early Warning prediction layer forecasting student-CO attainment using scikit-learn.

Comprehensive architectural documentation and ER diagrams are available in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Quick Start (No Docker)

### Prerequisites

- **Node.js** ≥ 18
- **MongoDB** running locally on port 27017 (or provide a remote connection string)
- **Python** ≥ 3.10 (for the ML service)

---

### 1. Backend (port 5001)

```bash
cd backend
cp .env.example .env   # configure MONGODB_URI, JWT_SECRET, PORT=5001, ML_SERVICE_URL=http://localhost:8000
npm install

# Base seed (department, programme, staff accounts, official PEOs/POs/PSOs)
npm run seed

# OPTIONAL: Comprehensive Demo seed (3 courses, 30 students, realistic marks, CO-PO/PSO mappings)
npm run seed:demo

npm run dev            # starts API server on http://localhost:5001
```

### 2. Frontend (port 5173)

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:5001/api
npm install
npm run dev            # starts Vite dev server on http://localhost:5173
```

### 3. ML Service (port 8000)

```bash
cd ml-service
python -m venv venv
venv\Scripts\activate   # On Windows (or source venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

---

## Testing

### Backend Test Suite (Jest + Supertest)
Runs 8 test suites (including unit, integration, and full end-to-end flow):
```bash
cd backend
npm test
```
*Current count: 8 test suites, 116 tests passing.*

### ML Service Test Suite (Pytest)
```bash
cd ml-service
python -m pytest
```
*Current count: 5 tests passing.*

---

## Seeded User Credentials

The platform has **3 login roles**: `admin`, `coordinator`, and `faculty`. Students do **not** log in (student accounts cannot authenticate and return HTTP 403). Students exist exclusively as academic data records (name, rollNo, department) required for course enrollments, StudentMarks, CO attainment, and ML predictions.

All seeded login accounts use password: `Password@123`

| Role | Name | Email | Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | System Administrator | `admin@obe.edu` | Full user, student records & system management |
| **Coordinator** | Dr. Ramesh Sharma | `coordinator@obe.edu` | OBE Coordinator, IT Dept (Head) |
| **Faculty** | Prof. Rajesh Kumar | `faculty1@obe.edu` | Faculty member, IT Dept (teaches DBMS & OS) |
| **Faculty** | Prof. Anita Verma | `faculty2@obe.edu` | Faculty member, IT Dept (teaches CN) |

*(Student data records are created via `npm run seed` or `npm run seed:demo` with roll numbers `22IT001`–`22IT010` / `2024-IT-001`–`2024-IT-030` and managed under Admin > Student Records).*

---

## Security Hardening (Phase 8)

1. **HTTP Security Headers**: `helmet` applied across all API endpoints.
2. **NoSQL Injection Sanitization**: `express-mongo-sanitize` scrubs prohibited operators (`$` and `.`) from user inputs.
3. **Rate Limiting**:
   - Global rate limiter: 300 requests / 15 minutes.
   - Strict authentication limiter on `POST /api/auth/login`: 10 attempts / 15 minutes.
4. **Self-Service Password Management**: `PATCH /api/auth/change-password` requiring current password verification and minimum 6-character length.
5. **Environment Isolation**: No production secrets committed to git (`.gitignore` enforces `*.env` exemption for `.env.example`).

---

## API Overview

### Authentication & Profiles
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/login` | Public (Rate-limited) | Login with email + password → JWT |
| GET | `/api/auth/me` | Authenticated | Get current user profile |
| POST | `/api/auth/register` | Admin only | Register a new user account |
| PATCH | `/api/auth/change-password` | Authenticated | Change user's own password |

### Admin Module
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET / POST | `/api/users` | List / Create users |
| GET / PUT / DELETE | `/api/users/:id` | Read / Update / Delete user |
| PATCH | `/api/users/:id/reset-password` | Reset student or faculty password |
| PATCH | `/api/users/:id/deactivate` | Deactivate user account |
| GET / POST / PUT / DELETE | `/api/departments` | Department CRUD |
| GET / POST / PUT / DELETE | `/api/programmes` | Programme CRUD |

### Faculty Course Setup & Marks
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| GET / POST | `/api/courses` | Faculty/Admin | List own courses / Create course |
| GET / POST / PUT / DELETE | `/api/cos` | Course Owner | Manage Course Outcomes with Bloom's taxonomy |
| GET / POST / PUT / DELETE | `/api/assessments` | Course Owner | Manage Quizzes, Assignments, CIE, SEE |
| GET / POST / PUT / DELETE | `/api/questions` | Course Owner | Manage Questions & map to COs |
| POST | `/api/enrollments` | Course Owner | Enroll students into course |
| GET / POST | `/api/marks/bulk` | Course Owner | 2D Marks grid entry (Students × Questions) |
| GET | `/api/attainment?courseId=&target=` | Course Owner | Student-wise and class-wise CO attainment |
| GET | `/api/attainment/export?courseId=` | Course Owner | Export course CO attainment report as CSV |

### Coordinator & Programme OBE
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| GET / POST | `/api/curriculum` | Coordinator | View and manage PEOs, POs, PSOs |
| GET / POST | `/api/mappings/matrix/:courseId` | Coordinator | CO-PO and CO-PSO mapping matrix (Strengths 1, 2, 3) |
| GET | `/api/programme-attainment/:programmeId` | Coordinator | Programme-level PO and PSO attainment report |
| GET | `/api/programme-attainment/course/:courseId` | Coordinator | Course-specific PO/PSO contribution breakdown |
| GET | `/api/programme-attainment/export-csv/:programmeId`| Coordinator | Export Programme PO/PSO report to CSV |

### ML Early Warning Service
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| GET | `/api/courses/:id/predictions?target=` | Course Owner | Generate early warning attainment predictions, risk levels, and explainable feature impacts |
| GET | `/api/ml/model-info` | Authenticated | Retrieve active model algorithm, metrics (Accuracy, F1), and training metadata |
| POST | `/api/ml/train` | Admin only | Trigger model retraining across historical dataset |

---

## Known Gaps & Institutional Disclosures

1. **PO / PSO Formula College Confirmation**:
   The current PO/PSO attainment calculation uses the standard NBA default formula:
   $$\text{PO Attainment} = \frac{\sum (\text{CO Attainment} \times \text{Strength})}{\sum \text{Strength}}$$
   This is explicitly isolated in `backend/services/programmeAttainmentService.js` under `calculateDefaultOutcomeAttainment()` and is swappable once the institution's Academic Council confirms its specific policy (e.g., incorporating indirect graduate exit surveys).
   When no COs are mapped or evaluated, outcomes display **`Not mapped / No data`** (never defaulted to 0%).
2. **Synthetic Data Disclosure**:
   The ML prediction layer uses a realistic synthetic dataset (`ml-service/data/synthetic_historical_data.csv`). Real institutional multi-year data can replace this file with zero code changes.
3. **Indirect Surveys**:
   Indirect attainment surveys (employer, alumni, course exit) are not yet integrated; currently attainment is based on continuous direct assessments.
