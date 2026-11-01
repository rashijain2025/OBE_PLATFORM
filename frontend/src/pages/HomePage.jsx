import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Layers,
  BarChart3,
  TrendingUp,
  Building2,
  Users,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  const modules = [
    {
      icon: GraduationCap,
      title: 'Course Outcomes & Attainment',
      description: 'Continuous assessment monitoring, direct and indirect CO attainment calculation.',
    },
    {
      icon: Layers,
      title: 'Curriculum & PO Mapping',
      description: 'Comprehensive CO-PO and PSO correlation matrix with accreditation weightages.',
    },
    {
      icon: BarChart3,
      title: 'Reports & Accreditation',
      description: 'Automated NBA/NAAC-ready compliance reports and program attainment radar analytics.',
    },
    {
      icon: TrendingUp,
      title: 'Early Warning Intelligence',
      description: 'ML-powered student performance forecasting to identify at-risk learners early.',
    },
    {
      icon: Building2,
      title: 'Department Analytics',
      description: 'Department-wide attainment trends, cohort comparisons, and academic insights.',
    },
    {
      icon: Users,
      title: 'Student & Faculty Management',
      description: 'Role-based access, student enrollment tracking, and outcome evaluations.',
    },
  ];

  return (
    <div className="min-h-screen bg-ink text-white flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Subtle background dot pattern adhering to Ink & Paper theme */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #FFFFFF 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top Navigation */}
      <header className="relative z-10 border-b border-white/10 px-6 sm:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white p-1 flex items-center justify-center shadow-md">
            <img
              src="/mits_logo.png"
              alt="MITS Logo"
              className="w-7 h-7 object-contain"
            />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white font-serif">MITS Gwalior</div>
            <div className="text-[11px] text-gray-300">OBE Platform</div>
          </div>
        </div>

        <div>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs sm:text-sm font-semibold transition-all shadow-md"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs sm:text-sm font-semibold transition-all shadow-md"
            >
              <span>Portal Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </header>

      {/* Main Content: Center Branding & 6 Module Cards */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-6 py-8 sm:py-12 flex flex-col items-center justify-center">
        {/* Circular MITS Logo badge */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white p-2.5 flex items-center justify-center shadow-2xl ring-4 ring-white/20 mb-6 transition-transform hover:scale-105 duration-300">
          <img
            src="/mits_logo.png"
            alt="Madhav Institute of Technology & Science"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Title & Subtitle */}
        <div className="text-center mb-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-accent text-xs font-semibold tracking-wider uppercase mb-3 border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Accreditation & Analytics Portal</span>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold font-serif tracking-tight text-white leading-tight">
            Outcome Based Education System
          </h1>
          <p className="mt-3 text-sm sm:text-base text-gray-300 font-medium">
            Madhav Institute of Technology &amp; Science, Gwalior
          </p>
        </div>

        {/* 6 Module Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {modules.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-sm p-5 transition-all duration-200 hover:border-accent/50 hover:shadow-lg flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-accent/15 border border-accent/25 text-accent flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-accent transition-colors flex items-center justify-between">
                    <span>{mod.title}</span>
                  </h3>
                  <p className="mt-1 text-xs text-gray-300 leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Callout */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            to={isAuthenticated ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm shadow-xl transition-all hover:translate-y-[-1px]"
          >
            <span>{isAuthenticated ? 'Open Dashboard' : 'Sign in to OBE Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-accent" />
            <span>Tier-1 / Tier-2 NBA Outcome Framework Aligned</span>
          </div>
        </div>
      </main>

      {/* 4-Line Institutional Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/20 py-4 px-6 text-center text-xs text-gray-300">
        <div className="space-y-1">
          <p className="text-gray-300/90">
            &copy; 2026 MITS Gwalior Outcome Based Education Platform
          </p>
          <p className="text-gray-300">
            Made by{' '}
            <a
              href="https://rashijportfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-accent hover:underline"
            >
              Rashi Jain
            </a>
            {' '}&amp;{' '}
            <span className="font-semibold text-accent">Shashank Nigam</span>
          </p>
          <p className="text-gray-300">
            Under the Guidance of{' '}
            <a
              href="https://web.mitsgwalior.in/faculty-profiles-it-2/neha-bhardwaj"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-accent hover:underline"
            >
              Neha Bhardwaj
            </a>
          </p>
          <p className="text-gray-400 text-[11px] font-medium tracking-wide">
            Powered by <span className="font-semibold text-white">IT Department</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
