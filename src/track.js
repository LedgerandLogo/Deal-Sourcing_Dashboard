import { supabase } from './supabaseClient.js';

// Cookieless tracking: no cookies, no IP address, no personal data. It records
// which page was opened and where the visitor came from, nothing else.

const CAMPAIGN_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'];
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|monitor/i;

function clean(value, max) {
  if (!value) return null;
  const v = String(value).trim().toLowerCase().slice(0, max);
  return v || null;
}

function externalReferrerHost() {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname.replace(/^www\./, '');
    if (!host || host === window.location.hostname.replace(/^www\./, '')) return null;
    return clean(host, 100);
  } catch {
    return null;
  }
}

// Where did this visitor come from? Tagged links (utm_*) win; otherwise the
// referring site; links passed on from our own pages carry it in `ref`.
export function getAttribution() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: clean(params.get('utm_source'), 60),
    utm_medium: clean(params.get('utm_medium'), 60),
    utm_campaign: clean(params.get('utm_campaign'), 80),
    referrer_host: clean(params.get('ref'), 100) || externalReferrerHost(),
  };
}

// "?utm_source=...&ref=..." to add to our internal links, so the source
// is still known when the visitor reaches the registration page.
export function attributionQuery() {
  const a = getAttribution();
  const out = new URLSearchParams();
  CAMPAIGN_KEYS.forEach((k) => { if (a[k]) out.set(k, a[k]); });
  if (a.referrer_host) out.set('ref', a.referrer_host);
  const qs = out.toString();
  return qs ? `?${qs}` : '';
}

export function trackPageView() {
  try {
    const params = new URLSearchParams(window.location.search);
    // Owner switch: open any page once with ?notrack=1 to stop counting your own visits
    // on this device (?notrack=0 turns counting back on).
    if (params.get('notrack') === '1') localStorage.setItem('ll_ignore', '1');
    if (params.get('notrack') === '0') localStorage.removeItem('ll_ignore');
    if (localStorage.getItem('ll_ignore') === '1') return;

    const path = window.location.pathname;
    if (path === '/app' || path.startsWith('/app/')) return;       // private dashboard
    if (navigator.webdriver || BOT_RE.test(navigator.userAgent || '')) return;

    const a = getAttribution();
    supabase.from('page_views').insert({
      path: path.slice(0, 100),
      ...a,
      device: window.matchMedia && window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop',
    }).then(() => {}, () => {});
  } catch {
    /* tracking must never break the site */
  }
}
