/**
 * Live menu from the admin panel (Supabase, table tonos_menu).
 * The publishable key below is meant to be public: it can only READ the Tonos menu
 * (row-level security lets only Tonos admins change anything).
 */
export const SUPABASE_URL = 'https://iswslfdaeoaxgithwezm.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_0aq8oG73amjgTuWuNW-Ivw_HziVn0QF'
export const PHOTO_BUCKET = 'tonos-photos'
export const MENU_URL = `${SUPABASE_URL}/rest/v1/tonos_menu?id=eq.1&select=data,updated_at`

/**
 * Fetch the latest published menu. Offline (or slow) → the service worker answers from its saved copy,
 * and if there is none at all we return null and the app uses the menu built into the app.
 */
export async function fetchLiveMenu(timeoutMs = 3500): Promise<unknown | null> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetch(MENU_URL, { headers: { apikey: SUPABASE_KEY }, signal: ctl.signal })
    if (!r.ok) return null
    const rows = (await r.json()) as { data: unknown }[]
    return rows[0]?.data ?? null
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}
