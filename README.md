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

## Authentication & Role Architecture

The platform is a **staff-only portal** with **3 login roles**:
1. **Admin**: Dedicated system administrator managing departments, programmes, and coordinator registrations. Authenticates exclusively via email + password configured in `.env`. Admin accounts **never** log in through Google.
2. **Coordinator**: Department OBE Coordinator. Signs in using their official `@mitsgwalior.in` Google account after being pre-registered by the Admin. Manages curriculum outcomes, PEO/PO/PSO mappings, invites department faculty, and assigns programme courses.
3. **Faculty**: Course instructors. Invited by their department coordinator via `@mitsgwalior.in` email. Sign in directly via Google to access their assigned courses, marks entry, and CO attainment.
4. **Students**: Data records only. Student records never authenticate and are rejected with HTTP 403.

---

## Environment & Credential Setup

### 1. Admin Credentials from Environment

Admin credentials are never stored or logged in plain text. On server startup, the backend automatically upserts the admin user from your `.env` configuration:

```env
# backend/.env
ADMIN_EMAIL=admin@mitsgwalior.in
ADMIN_PASSWORD=YourStrongPassword_Minimum_12_Chars
ADMIN_NAME=System Administrator
```

> [!IMPORTANT]
> If `ADMIN_PASSWORD` is omitted or shorter than 12 characters, a warning is logged on startup and the admin account will **not** be created.

---

### 2. Google OAuth 2.0 Setup

To enable institutional Google Sign-In for Coordinators and Faculty:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create or select a project (e.g. `MITS OBE Platform`).
3. Configure the **OAuth Consent Screen**:
   - User Type: **Internal** (recommended for `@mitsgwalior.in` Google Workspace) or **External** (with authorized testing users).
   - Scopes: `email`, `profile`, `openid`.
4. Create an **OAuth Client ID**:
   - Application Type: **Web application**.
   - **Authorized JavaScript origins**:
     - `http://localhost:5173`
     - `http://localhost:5001` (if running frontend served from backend)
     - `https://your-production-domain.edu.in`
   - **Authorized redirect URIs**: (handled via Google Identity Services button).
5. Copy your Client ID and add it to `.env`:

```env
# backend/.env
GOOGLE_CLIENT_ID=804356497266-7pv159hkvrlvfagps6l9p9c5gder1mkd.apps.googleusercontent.com
ALLOWED_EMAIL_DOMAIN=mitsgwalior.in

# frontend/.env
VITE_GOOGLE_CLIENT_ID=804356497266-7pv159hkvrlvfagps6l9p9c5gder1mkd.apps.googleusercontent.com
```

*Note: Look-alike domains (e.g. `evil.com` suffixes) and unverified Google emails are strictly rejected on the backend.*

---

### 3. SMTP Email Setup (Faculty Invitations)

When a coordinator invites faculty members, invitation emails are dispatched via SMTP with the direct platform login link.

Using Gmail / Google Workspace with an **App Password**:
1. Enable **2-Step Verification** on your Google Account.
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords) and create an app password for `Mail / OBE Platform`.
3. Configure in `backend/.env`:

```env
# backend/.env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@mitsgwalior.in
SMTP_PASS=xxxx xxxx xxxx xxxx
MAIL_FROM="MITS OBE Platform" <noreply@mitsgwalior.in>
FRONTEND_URL=http://localhost:5173
```

*Graceful Fallback*: If SMTP is unconfigured or encounters a network issue, invitations are still saved (`mailSent: false`), and coordinators can click **"Copy Login Link"** or **"Copy Invite Message"** in the UI to share access links manually.

---

## System Workflows

### How the Admin Pre-Registers a Coordinator
1. Sign in as Admin at `/login` using the email & password from `.env`.
2. Navigate to **Coordinators** (`/coordinators`) in the sidebar.
3. Click **Add Coordinator** and enter:
   - Full Name (e.g., `Dr. Ramesh Sharma`).
   - Official Email ending in `@mitsgwalior.in` (e.g., `coordinator@mitsgwalior.in`).
   - Department and Academic Programme (e.g., `B.Tech Information Technology`).
4. Each programme can only have **one** assigned coordinator.
5. The coordinator can now log in via Google using that email.

### How the Coordinator Invites Faculty & Assigns Courses
1. Sign in at `/login` with the pre-registered `@mitsgwalior.in` Google account.
2. Navigate to **My Faculty** (`/my-faculty`) in the sidebar.
3. In the invite box, paste single or multiple emails (up to 50 at once, comma or newline separated) and click **Send Invitations**.
4. Check real-time per-email chips (`created`, `already_invited`, `already_active`, `invalid`, `domain_rejected`).
5. When faculty members accept the invite by signing in via Google, they appear in the **Active Department Faculty** table.
6. Click **Assign Courses** next to any faculty member to map courses of your programme to them.

---

## Seed & Demo Flow

To seed base departments, programmes, official PEOs/POs/PSOs, demo coordinator and pending invitations:
```bash
cd backend
npm run seed
```
Demo seeded records:
- **Demo Coordinator**: pre-registered with email defined by `DEMO_COORDINATOR_EMAIL` (default: `coordinator@mitsgwalior.in`)
- **Demo Invitation**: pending invitation for `demo.faculty@mitsgwalior.in`


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
