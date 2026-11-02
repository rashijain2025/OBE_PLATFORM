import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useToast, ToastContainer } from '../../components/ui/Toast';
import { Lock, Mail, AlertCircle, Loader, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login, loginWithGoogle } = useAuth();
  const { toasts, showToast, dismiss } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const redirectToDashboard = (_role) => {
    // Direct all staff roles to their role-specific dashboard
    const from = location.state?.from?.pathname;
    if (from && from !== '/login') {
      navigate(from, { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleAdminSubmit = async (e) => {
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
      redirectToDashboard(res.user?.role);
    } else {
      setErrorMessage(res.error || 'Invalid credentials');
      showToast(res.error || 'Invalid credentials', 'error');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) return;

    setGoogleSubmitting(true);
    setErrorMessage('');

    const res = await loginWithGoogle(credentialResponse.credential);
    setGoogleSubmitting(false);

    if (res.success) {
      redirectToDashboard(res.user?.role);
    } else {
      const msg = res.error || 'Google login failed';
      setErrorMessage(msg);
      showToast(msg, 'error');
    }
  };

  const handleGoogleError = () => {
    const msg = 'Google Sign In was unsuccessful or cancelled';
    setErrorMessage(msg);
    showToast(msg, 'error');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background text-gray-900">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block group">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white p-2 mb-3 shadow-md border border-border group-hover:scale-105 transition-transform">
              <img
                src="/mits_logo.png"
                alt="MITS Gwalior Logo"
                className="w-12 h-12 object-contain"
              />
            </div>
            <h1 className="font-serif text-2xl font-bold text-ink group-hover:text-accent transition-colors">
              OBE Platform
            </h1>
            <p className="text-muted text-xs mt-1">
              Madhav Institute of Technology &amp; Science, Gwalior
            </p>
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-card">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-ink mb-1">
            Sign in to your account
          </h2>
          <p className="text-muted text-xs sm:text-sm mb-6">
            Institutional access for administrators, coordinators, and faculty
          </p>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-lg bg-status-below-soft border border-status-below/20 flex items-start gap-3 text-status-below text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Admin Email/Password Form */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink border-b-2 border-accent pb-0.5">
                Admin login
              </span>
              <span className="text-[11px] text-muted">Password-based access</span>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-4">
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
                    placeholder="admin@mitsgwalior.in"
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
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In with Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Google Sign-in Section under "or" divider */}
          {googleClientId ? (
            <div>
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <span className="relative px-3 bg-surface text-xs font-semibold uppercase text-muted tracking-wider">
                  or
                </span>
              </div>

              <div className="flex flex-col items-center">
                <GoogleOAuthProvider clientId={googleClientId}>
                  {googleSubmitting ? (
                    <div className="w-full py-2.5 rounded-lg border border-border bg-paper flex items-center justify-center gap-2 text-sm text-ink">
                      <Loader className="w-4 h-4 animate-spin text-accent" />
                      <span>Verifying Google account...</span>
                    </div>
                  ) : (
                    <div className="w-full flex justify-center">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        useOneTap={false}
                        shape="rectangular"
                        theme="outline"
                        size="large"
                        width="100%"
                        text="signin_with"
                      />
                    </div>
                  )}
                </GoogleOAuthProvider>

                <p className="text-xs text-muted mt-2.5 text-center">
                  Coordinators and faculty: use your <span className="font-medium text-ink">@mitsgwalior.in</span> account
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
