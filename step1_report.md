# Step 1 — Design Tokens, Fonts & Base Styles ✅

## Updated Baseline (Step 0 addendum)

### Backend Tests
| Metric | Count |
|---|---|
| **Test Suites** | 4 passed, 4 failed, **8 total** |
| **Tests** | 107 passed, 7 failed, **114 total** |

> [!NOTE]
> The 7 failures are **pre-existing** (ML service offline → prediction/e2e tests; permission model mismatch → admin tests; CSV import edge case → marks test). These are **not related** to UI changes.

### Frontend
| Metric | Baseline | After Step 1 |
|---|---|---|
| Test files | 0 | 0 (unchanged) |
| Build modules | 2554 | 2554 ✅ |
| Build exit code | 0 | 0 ✅ |
| JS bundle | 959.71 kB | 959.71 kB ✅ (identical) |
| CSS bundle | 60.66 kB | 61.25 kB (+0.59 kB from new tokens) |

---

## Files Changed in Step 1

| File | What changed |
|---|---|
| [index.css](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/index.css) | Complete Ink & Paper tokens: status soft tints, chart palette, focus-visible ring, scrollbar styling, shadow-card utility |
| [tailwind.config.js](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/tailwind.config.js) | Mapped all CSS vars to semantic Tailwind utilities: `status-{attained,borderline,below}-soft`, `chart-{1..4,target}`, `shadow-card` |

### New tokens added (not in previous version)
- `--status-attained-soft`, `--status-borderline-soft`, `--status-below-soft` (soft tint backgrounds)
- `--chart-1` through `--chart-4`, `--chart-target` (chart palette)
- `:focus-visible` global ring (teal)
- Scrollbar styling (subtle paper-tone)
- `shadow-card` utility class

---

## How the App Looks Right Now

The **body background** and **base text color** correctly apply from `index.css` (warm `#FAF7F2` paper background, `#1F2937` text). But every component still uses hard-coded dark-theme classes (`bg-gray-950`, `bg-gray-900`, `text-white`, `border-gray-800`, `bg-indigo-600`), so the UI is still dark/indigo. The tokens are ready; the components need migrating.

---

## Component Audit: Files Using Hard-Coded Dark Theme Classes

### `components/layout/` (Step 2)
| File | Dark-theme patterns |
|---|---|
| [AppLayout.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/components/layout/AppLayout.jsx) | `bg-gray-950`, `bg-gray-900/90`, `bg-gray-900/40`, `text-gray-100`, `border-gray-800`, `bg-indigo-600`, `text-indigo-400`, `text-white` |

### `components/ui/` (Step 2)
| File | Dark-theme patterns |
|---|---|
| [AdminUI.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/components/ui/AdminUI.jsx) | `bg-gray-900/60`, `border-gray-800`, `bg-indigo-600`, `bg-gray-800`, `border-gray-700`, `text-white`, `text-gray-200`, `bg-gray-900` |
| [Toast.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/components/ui/Toast.jsx) | `bg-emerald-950`, `bg-red-950`, `border-emerald-700/50`, `border-red-700/50` |

### `components/marks/` (Step 5)
| File | Dark-theme patterns |
|---|---|
| [MarksGridModal.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/components/marks/MarksGridModal.jsx) | `bg-gray-900`, `border-gray-800`, `bg-indigo-600`, `text-white` |

### `pages/auth/` (Step 3)
| File | Dark-theme patterns |
|---|---|
| [LoginPage.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/pages/auth/LoginPage.jsx) | `bg-gray-950`, `bg-gray-900/80`, `bg-indigo-600`, `border-gray-800`, `text-white`, indigo glow |

### `pages/` (Step 2 — shared pages)
| File | Dark-theme patterns |
|---|---|
| [DashboardPage.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/pages/DashboardPage.jsx) | `bg-gray-900/60`, `border-gray-800`, `bg-indigo-950/40`, `text-white`, `bg-gray-900` |
| [HealthPage.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/pages/HealthPage.jsx) | `bg-gray-950`, `text-white`, `text-indigo-400` |

### `pages/admin/` (Step 4)
| File | Dark-theme patterns |
|---|---|
| [UsersPage.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/pages/admin/UsersPage.jsx) | `bg-gray-900`, `border-gray-800`, `text-white`, `bg-indigo-600` |
| [DepartmentsPage.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/pages/admin/DepartmentsPage.jsx) | `text-white`, dark table rows |
| [CoursesPage.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/pages/admin/CoursesPage.jsx) | `bg-indigo-600`, `text-white`, `bg-gray-900` |
| [EnrollmentPage.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/pages/admin/EnrollmentPage.jsx) | `text-white`, dark patterns |
| [ModelPage.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/pages/admin/ModelPage.jsx) | `bg-gray-900`, `border-gray-800`, `bg-indigo-600`, `text-white` |

### `pages/faculty/` (Step 5)
| File | Dark-theme patterns |
|---|---|
| [MarksEntryPage.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/pages/faculty/MarksEntryPage.jsx) | `bg-gray-900`, `border-gray-800`, `bg-indigo-600`, `text-white` |
| [COAttainmentPage.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/pages/faculty/COAttainmentPage.jsx) | `bg-gray-900`, `border-gray-800`, `bg-indigo-600`, `text-white`, Recharts dark fills |
| [CourseDetailsPage.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/pages/faculty/CourseDetailsPage.jsx) | `bg-gray-900`, `border-gray-800`, `bg-indigo-600`, `text-white` |
| [FacultyReportsPage.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/pages/faculty/FacultyReportsPage.jsx) | `bg-gray-900`, `border-gray-800`, `bg-indigo-600`, `text-white`, Recharts dark fills |
| [EarlyWarningPage.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/pages/faculty/EarlyWarningPage.jsx) | `bg-gray-900`, `border-gray-800`, `bg-indigo-600`, `text-white`, risk badge colours |

### `pages/coordinator/` (Step 6)
| File | Dark-theme patterns |
|---|---|
| [COPOMappingPage.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/pages/coordinator/COPOMappingPage.jsx) | `bg-gray-900`, `border-gray-800`, `text-white` |
| [CurriculumOutcomesPage.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/pages/coordinator/CurriculumOutcomesPage.jsx) | `bg-gray-900`, `border-gray-800`, `bg-indigo-600`, `text-white` |
| [ProgrammeReportPage.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/pages/coordinator/ProgrammeReportPage.jsx) | `bg-gray-900`, `border-gray-800`, `bg-indigo-600`, `text-white`, Recharts fills |

### `routes/` (FORBIDDEN — but noted)
| File | Notes |
|---|---|
| [ProtectedRoute.jsx](file:///c:/Users/dell/OneDrive/Desktop/obePlatform/frontend/src/routes/ProtectedRoute.jsx) | Has `bg-gray-950`, `bg-indigo-500` — className only, needs migration in Step 2 if allowed |

---

## Total: 20 files need className migration across Steps 2–6

### Needs Approval
- **ProtectedRoute.jsx** is in `src/routes/` which was listed as FORBIDDEN. It has presentational className strings only (spinner/loading screen). **Should I migrate its classNames in Step 2, or leave it alone?**
