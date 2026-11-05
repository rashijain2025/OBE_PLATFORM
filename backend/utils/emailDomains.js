/**
 * Staff email domains allowed to sign in / be invited, from ALLOWED_EMAIL_DOMAIN (comma-separated).
 * Example: ALLOWED_EMAIL_DOMAIN=mitsgwalior.in,gmail.com
 */
function getAllowedDomains() {
  return (process.env.ALLOWED_EMAIL_DOMAIN || 'mitsgwalior.in')
    .toLowerCase()
    .split(',')
    .map((d) => d.trim().replace(/^@/, ''))
    .filter(Boolean);
}

/**
 * Exact domain match, so look-alikes such as x@mitsgwalior.in.evil.com are rejected
 */
function isAllowedEmail(email) {
  const parts = String(email || '').toLowerCase().trim().split('@');
  return parts.length === 2 && getAllowedDomains().includes(parts[1]);
}

/**
 * "@mitsgwalior.in or @gmail.com" for messages
 */
function describeAllowedDomains() {
  const domains = getAllowedDomains().map((d) => `@${d}`);
  return domains.length <= 1 ? domains.join('') : `${domains.slice(0, -1).join(', ')} or ${domains[domains.length - 1]}`;
}

module.exports = { getAllowedDomains, isAllowedEmail, describeAllowedDomains };
