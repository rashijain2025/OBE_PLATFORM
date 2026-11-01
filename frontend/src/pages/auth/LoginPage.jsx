import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Lock, Mail, AlertCircle, Loader, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const demoAccounts = [
    { label: 'Admin', email: 'admin@obe.edu', role: 'admin', color: 'border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100' },
    { label: 'Coordinator', email: 'coordinator@obe.edu', role: 'coordinator', color: 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100' },
    { label: 'Faculty', email: 'faculty1@obe.edu', role: 'faculty', color: 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100' },
  ];

  const handleQuickFill = (accEmail) => {
    setEmail(accEmail);
    setPassword('Password@123');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const res = await login(email, password);
    setSubmitting(false);

    if (res.success) {
      navigate(from, { replace: true });
    } else {
      setErrorMessage(res.error || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background text-gray-900">
      {/* Left panel: Navy with dot pattern, tagline, and brand identity */}
      <div className="hidden lg:flex lg:w-5/12 bg-ink text-white relative flex-col justify-between p-12 overflow-hidden">
        {/* Subtle dot pattern background */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #FFFFFF 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent text-white flex items-center justify-center shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="font-serif text-xl font-bold tracking-tight text-white">OBE Platform</div>
              <div className="text-xs text-gray-300">Outcome-Based Education</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 my-auto py-12">
          <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-accent text-xs font-medium tracking-wide uppercase mb-4 border border-white/10">
            Institutional Excellence
          </div>
          <h1 className="font-serif text-4xl xl:text-5xl font-bold leading-tight text-white mb-6">
            Measure outcomes, not just marks.
          </h1>
          <p className="text-gray-300 text-base max-w-md leading-relaxed">
            Continuous curriculum alignment, attainment analytics, and NBA/NAAC-ready compliance intelligence.
          </p>
        </div>

        <div className="relative z-10 text-xs text-gray-400 border-t border-white/10 pt-4 flex justify-between items-center">
          <span>Continuous Quality Improvement</span>
          <span>Tier-1 / Tier-2 Aligned</span>
        </div>
      </div>

      {/* Right panel: Login card on warm paper background */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative">
        {/* Mobile brand header */}
        <div className="lg:hidden text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-ink text-white mb-3 shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-ink">OBE Platform</h1>
          <p className="text-muted text-xs mt-1">Measure outcomes, not just marks</p>
        </div>

        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-surface rounded-2xl border border-border p-8 shadow-card">
            <h2 className="font-serif text-2xl font-bold text-ink mb-1">Sign in to your account</h2>
            <p className="text-muted text-sm mb-6">Enter your institutional credentials to continue</p>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-lg bg-status-below-soft border border-status-below/20 flex items-start gap-3 text-status-below text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@obe.edu"
                    required
                    className="w-full rounded-lg bg-surface border border-border pl-10 pr-4 py-2.5 text-gray-900 placeholder:text-muted/60 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full rounded-lg bg-surface border border-border pl-10 pr-4 py-2.5 text-gray-900 placeholder:text-muted/60 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 px-4 rounded-lg bg-ink hover:bg-ink-dark text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Fill Demo Accounts */}
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 text-center">
                Quick Fill Seeded Roles (Password@123)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleQuickFill(acc.email)}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all hover:shadow-xs active:scale-95 text-center cursor-pointer ${acc.color}`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Credits */}
            <div className="mt-8 pt-4 border-t border-border/60 text-center text-xs text-muted">
              <p className="text-muted/80">
                &copy; 2026 MITS Gwalior Outcome Based Education Platform
              </p>
              <p className="mt-1 text-muted">
                Made by{' '}
                <a
                  href="https://rashijportfolio.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#7B112B] hover:underline"
                >
                  Rashi Jain
                </a>
                {' '}&amp;{' '}
                <span className="font-semibold text-[#7B112B]">Shashank Nigam</span>
                {' '}under the guidance of{' '}
                <span className="font-semibold text-[#7B112B]">Neha Bhardwaj</span>
              </p>
              <p className="mt-1 text-muted/70 text-[11px] font-medium tracking-wide">
                Powered by <span className="font-semibold text-ink">IT Department</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
