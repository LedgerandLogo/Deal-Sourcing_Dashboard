import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
    'Set these as GitHub Actions secrets (never the publishable/anon key here — ' +
    'this script needs the SERVICE ROLE key to insert rows past RLS).'
  );
}

// Service role key bypasses RLS — this must only ever run server-side (GitHub Actions), never in a browser.
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

/**
 * Insert new lots, skipping any that already exist (matched on source_url,
 * which should be unique per listing across all auction houses).
 * Assumes a `source_url` text column exists on `deals`. If it doesn't exist yet,
 * add it in Supabase Table Editor: Database > deals > New column > source_url (text, unique).
 */
export async function insertNewDeals(lots) {
  if (!lots.length) return { inserted: 0, skipped: 0, errors: [] };

  const urls = lots.map(l => l.source_url).filter(Boolean);
  const { data: existing, error: fetchErr } = await supabase
    .from('deals')
    .select('source_url')
    .in('source_url', urls);

  if (fetchErr) {
    console.error('Could not check for existing deals:', fetchErr.message);
    return { inserted: 0, skipped: 0, errors: [fetchErr.message] };
  }

  const existingUrls = new Set((existing || []).map(r => r.source_url));
  const newLots = lots.filter(l => !existingUrls.has(l.source_url));

  if (!newLots.length) {
    return { inserted: 0, skipped: lots.length, errors: [] };
  }

  const { error: insertErr } = await supabase.from('deals').insert(newLots);

  if (insertErr) {
    console.error('Insert failed:', insertErr.message);
    return { inserted: 0, skipped: lots.length - newLots.length, errors: [insertErr.message] };
  }

  return { inserted: newLots.length, skipped: lots.length - newLots.length, errors: [] };
}
