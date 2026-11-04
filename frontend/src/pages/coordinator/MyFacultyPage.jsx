import { useEffect, useState, useCallback } from 'react';
import {
  listInvitationsApi,
  sendInvitationsApi,
  resendInvitationApi,
  revokeInvitationApi,
  listFacultyApi,
  assignFacultyCoursesApi,
} from '../../api/invitations';
import api from '../../api/axios';
import { useAllowedEmailDomains, describeDomains } from '../../utils/emailDomains';
import {
  PageHeader, Card, PrimaryButton, DangerButton, GhostButton,
  Modal, Spinner, EmptyState,
} from '../../components/ui/AdminUI';
import { useToast, ToastContainer } from '../../components/ui/Toast';
import {
  Users, Mail, Send, RefreshCw, XCircle, CheckCircle2, AlertTriangle,
  Copy, Check, BookOpen, Clock, ShieldCheck, UserCheck, Layers, AlertCircle
} from 'lucide-react';

export default function MyFacultyPage() {
  const allowedDomains = useAllowedEmailDomains();
  const domainText = describeDomains(allowedDomains);
  const [invitations, setInvitations] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [programmeCourses, setProgrammeCourses] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

  // Assign courses modal
  const [assignModalTarget, setAssignModalTarget] = useState(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [savingAssignment, setSavingAssignment] = useState(false);

  // Copied state
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const { toasts, showToast, dismiss } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, facRes, coursesRes] = await Promise.all([
        listInvitationsApi(),
        listFacultyApi(),
        api.get('/courses'),
      ]);
      setInvitations(invRes.data || []);
      setFaculty(facRes.data || []);
      setProgrammeCourses(coursesRes.data?.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load faculty & invitations', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendInvites = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      showToast('Please paste or enter at least one email address', 'error');
      return;
    }

    setSending(true);
    setResults(null);

    try {
      const res = await sendInvitationsApi(emailInput);
      setResults(res.data?.results || []);
      const createdCount = res.data?.summary?.created || 0;
      showToast(`Processed ${res.data?.summary?.total || 0} emails (${createdCount} invitation(s) created)`, 'success');
      setEmailInput('');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send invitations', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (id) => {
    setResendingId(id);
    try {
      const res = await resendInvitationApi(id);
      showToast(res.mailSent ? 'Invitation email resent successfully' : 'Invitation updated (SMTP unconfigured)', 'success');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to resend invitation', 'error');
    } finally {
      setResendingId(null);
    }
  };

  const handleRevoke = async (id) => {
    setRevokingId(id);
    try {
      await revokeInvitationApi(id);
      showToast('Invitation revoked successfully', 'success');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to revoke invitation', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const handleOpenAssignModal = (f) => {
    setAssignModalTarget(f);
    const assignedIds = (f.courses || []).map((c) => String(c._id));
    setSelectedCourseIds(assignedIds);
  };

  const handleSaveCourseAssignments = async () => {
    if (!assignModalTarget) return;
    setSavingAssignment(true);
    try {
      await assignFacultyCoursesApi(assignModalTarget._id, selectedCourseIds);
      showToast('Course assignments saved successfully', 'success');
      setAssignModalTarget(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update course assignments', 'error');
    } finally {
      setSavingAssignment(false);
    }
  };

  const copyLoginLink = () => {
    const link = `${window.location.origin}/login`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    showToast('Login link copied to clipboard', 'success');
  };

  const copyInvitationMessage = () => {
    const msg = `Hello,\n\nYou have been invited to join the MITS Gwalior Outcome Based Education (OBE) Platform. Please sign in with your ${domainText} Google account at:\n${window.location.origin}/login\n\nRegards,\nOBE School / Centre`;
    navigator.clipboard.writeText(msg);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
    showToast('Invitation message copied to clipboard', 'success');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Accepted
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" />
            Revoked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  const getChipStyle = (status) => {
    switch (status) {
      case 'created':
        return 'bg-emerald-50 border-emerald-300 text-emerald-800';
      case 'already_active':
        return 'bg-blue-50 border-blue-300 text-blue-800';
      case 'already_invited':
        return 'bg-amber-50 border-amber-300 text-amber-800';
      case 'domain_rejected':
      case 'invalid':
      default:
        return 'bg-red-50 border-red-300 text-red-800';
    }
  };

  return (
    <div className="space-y-8">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <PageHeader
        title="School / Centre Faculty & Invitations"
        subtitle={`Invite faculty of your school / centre by their ${domainText} email. Invited faculty sign in directly via Google to access their courses and dashboards.`}
      />

      {/* 1. Invite Box Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-accent-soft text-accent">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">Invite School / Centre Faculty</h3>
              <p className="text-xs text-muted">
                Paste single or multiple {domainText} emails (separated by commas or new lines, up to 50 at once)
              </p>
            </div>
          </div>

          {/* Quick Copy Helpers */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={copyLoginLink}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-paper hover:bg-surface text-xs font-medium text-ink transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-status-attained" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
              <span>Copy Login Link</span>
            </button>
            <button
              onClick={copyInvitationMessage}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-paper hover:bg-surface text-xs font-medium text-ink transition-colors cursor-pointer"
            >
              {copiedMsg ? <Check className="w-3.5 h-3.5 text-status-attained" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
              <span>Copy Invite Message</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSendInvites} className="space-y-4">
          <div>
            <textarea
              rows={3}
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="e.g. prof.sharma@mitsgwalior.in, anita.verma@mitsgwalior.in&#10;rajesh.kumar@mitsgwalior.in"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-ink placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors font-mono"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-muted">
              Only <code className="px-1.5 py-0.5 rounded bg-paper font-semibold text-ink">{domainText}</code> addresses are allowed.
            </div>
            <PrimaryButton type="submit" disabled={sending}>
              <Send className="w-4 h-4" />
              <span>{sending ? 'Sending Invites...' : 'Send Invitations'}</span>
            </PrimaryButton>
          </div>
        </form>

        {/* Per-Email Results Chips */}
        {results && results.length > 0 && (
          <div className="mt-6 pt-5 border-t border-border">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
              Invitation Results
            </div>
            <div className="flex flex-wrap gap-2">
              {results.map((r, idx) => (
                <div
                  key={idx}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${getChipStyle(r.status)}`}
                >
                  <span className="font-mono">{r.email}</span>
                  <span className="uppercase text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/70">
                    {r.status.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] opacity-80">({r.message})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 2. Active Department Faculty Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              <span>Active School / Centre Faculty ({faculty.length})</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Faculty members in your school / centre. Assign them courses from your academic programme.
            </p>
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : faculty.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted bg-paper rounded-xl border border-dashed border-border">
            No faculty members have accepted invitations yet. Use the invite form above to invite faculty.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-paper text-xs uppercase tracking-wider text-muted">
                  <th className="py-3 px-4 font-semibold">Faculty Member</th>
                  <th className="py-3 px-4 font-semibold">Courses Assigned</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {faculty.map((f) => (
                  <tr key={f._id} className="hover:bg-paper/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-ink">{f.name}</div>
                      <div className="text-xs text-muted font-mono">{f.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink tabular-nums">{f.coursesAssigned || 0}</span>
                        <span className="text-xs text-muted">course(s)</span>
                      </div>
                      {f.courses && f.courses.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {f.courses.map((c) => (
                            <span
                              key={c._id}
                              className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-paper border border-border text-ink"
                            >
                              {c.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <GhostButton onClick={() => handleOpenAssignModal(f)}>
                        <BookOpen className="w-3.5 h-3.5 text-accent" />
                        <span>Assign Courses</span>
                      </GhostButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 3. Sent Invitations Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              <span>Invitation History ({invitations.length})</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Track status of pending, accepted, and revoked faculty invitations.
            </p>
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : invitations.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted bg-paper rounded-xl border border-dashed border-border">
            No invitations found for your school / centre.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-paper text-xs uppercase tracking-wider text-muted">
                  <th className="py-3 px-4 font-semibold">Invited Email</th>
                  <th className="py-3 px-4 font-semibold">Programme</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Last Sent</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invitations.map((inv) => (
                  <tr key={inv._id} className="hover:bg-paper/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono text-ink font-medium">{inv.email}</div>
                      <div className="text-[11px] text-muted">
                        Invited {new Date(inv.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-ink font-medium">
                        {inv.programme?.name || inv.programme?.code || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted">
                      {inv.lastSentAt ? new Date(inv.lastSentAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {inv.status === 'pending' && (
                          <GhostButton
                            onClick={() => handleResend(inv._id)}
                            disabled={resendingId === inv._id}
                            title="Resend invitation email"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${resendingId === inv._id ? 'animate-spin' : ''}`} />
                            <span>Resend</span>
                          </GhostButton>
                        )}
                        {inv.status !== 'revoked' && (
                          <DangerButton
                            onClick={() => handleRevoke(inv._id)}
                            disabled={revokingId === inv._id}
                            title="Revoke invitation"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Revoke</span>
                          </DangerButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Course Assignment Modal */}
      {assignModalTarget && (
        <Modal
          open={Boolean(assignModalTarget)}
          title={`Assign Courses: ${assignModalTarget.name}`}
          onClose={() => setAssignModalTarget(null)}
        >
          <div className="space-y-4">
            <p className="text-xs text-muted">
              Select the courses from your programme that <strong>{assignModalTarget.name}</strong> will teach.
            </p>

            {programmeCourses.length === 0 ? (
              <p className="text-sm text-status-below">No courses found in your programme.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 border border-border rounded-xl p-3 bg-paper">
                {programmeCourses.map((c) => {
                  const isChecked = selectedCourseIds.includes(String(c._id));
                  return (
                    <label
                      key={c._id}
                      className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-surface border-accent text-ink shadow-xs'
                          : 'bg-surface/50 border-border text-muted hover:bg-surface'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCourseIds((prev) => [...prev, String(c._id)]);
                          } else {
                            setSelectedCourseIds((prev) => prev.filter((id) => id !== String(c._id)));
                          }
                        }}
                        className="mt-1 rounded border-border text-accent focus:ring-accent"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink flex items-center gap-2">
                          <span>{c.code}</span>
                          <span className="text-xs font-normal text-muted">· Sem {c.semester}</span>
                        </div>
                        <div className="text-xs text-muted truncate">{c.name}</div>
                        {c.faculty && String(c.faculty._id) !== String(assignModalTarget._id) && (
                          <div className="text-[11px] text-amber-700 mt-0.5">
                            Currently assigned to: {c.faculty.name || 'Another faculty'}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <GhostButton onClick={() => setAssignModalTarget(null)} disabled={savingAssignment}>
                Cancel
              </GhostButton>
              <PrimaryButton onClick={handleSaveCourseAssignments} disabled={savingAssignment}>
                {savingAssignment ? 'Saving...' : `Save Assignments (${selectedCourseIds.length})`}
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
