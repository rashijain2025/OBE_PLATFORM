import { useEffect, useState } from 'react';
import api from '../api/axios';

/**
 * Staff email domains allowed by the backend (ALLOWED_EMAIL_DOMAIN), fetched once and shared
 */
let cached = null;
let pending = null;

function loadDomains() {
  if (!pending) {
    pending = api
      .get('/auth/config')
      .then((res) => {
        cached = res.data?.data?.allowedEmailDomains || ['mitsgwalior.in'];
        return cached;
      })
      .catch(() => {
        pending = null;
        return ['mitsgwalior.in'];
      });
  }
  return pending;
}

export function useAllowedEmailDomains() {
  const [domains, setDomains] = useState(cached || ['mitsgwalior.in']);
  useEffect(() => {
    if (!cached) loadDomains().then(setDomains);
  }, []);
  return domains;
}

/**
 * "@mitsgwalior.in or @gmail.com"
 */
export function describeDomains(domains) {
  const list = domains.map((d) => `@${d}`);
  return list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} or ${list[list.length - 1]}`;
}

export function isAllowedEmail(email, domains) {
  const parts = String(email || '').toLowerCase().trim().split('@');
  return parts.length === 2 && domains.includes(parts[1]);
}
