import { createClient } from '@supabase/supabase-js';

// Realtime is opt-in: only when both values are present in the frontend .env
// (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY). When they're missing, this is
// null and ChatPanel automatically falls back to a short polling interval, so
// chat keeps working without any Supabase setup.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const realtimeEnabled = Boolean(url && anonKey);

// We use the app's own JWT auth, not Supabase Auth — so disable session
// persistence and only use this client for the Realtime "new message" signal.
export const supabase = realtimeEnabled
  ? createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
