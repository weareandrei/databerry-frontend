/**
 * Viewer country for the demo home greeting.
 *
 * Order of preference:
 *   1. IP geolocation (actual location)
 *   2. Browser IANA timezone map (locale language is NOT used —
 *      `en-GB` would wrongly flag a Romanian visitor as UK)
 */

const TIMEZONE_COUNTRY: Record<string, string> = {
  'Africa/Cairo': 'EG',
  'Africa/Johannesburg': 'ZA',
  'Africa/Lagos': 'NG',
  'Africa/Nairobi': 'KE',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Bogota': 'CO',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Mexico_City': 'MX',
  'America/New_York': 'US',
  'America/Sao_Paulo': 'BR',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'Asia/Bangkok': 'TH',
  'Asia/Dubai': 'AE',
  'Asia/Hong_Kong': 'HK',
  'Asia/Jakarta': 'ID',
  'Asia/Jerusalem': 'IL',
  'Asia/Kolkata': 'IN',
  'Asia/Seoul': 'KR',
  'Asia/Shanghai': 'CN',
  'Asia/Singapore': 'SG',
  'Asia/Tokyo': 'JP',
  'Australia/Melbourne': 'AU',
  'Australia/Sydney': 'AU',
  'Europe/Amsterdam': 'NL',
  'Europe/Athens': 'GR',
  'Europe/Berlin': 'DE',
  'Europe/Brussels': 'BE',
  'Europe/Bucharest': 'RO',
  'Europe/Budapest': 'HU',
  'Europe/Chisinau': 'MD',
  'Europe/Copenhagen': 'DK',
  'Europe/Dublin': 'IE',
  'Europe/Helsinki': 'FI',
  'Europe/Istanbul': 'TR',
  'Europe/Kyiv': 'UA',
  'Europe/Lisbon': 'PT',
  'Europe/London': 'GB',
  'Europe/Madrid': 'ES',
  'Europe/Moscow': 'RU',
  'Europe/Oslo': 'NO',
  'Europe/Paris': 'FR',
  'Europe/Prague': 'CZ',
  'Europe/Rome': 'IT',
  'Europe/Sofia': 'BG',
  'Europe/Stockholm': 'SE',
  'Europe/Vienna': 'AT',
  'Europe/Warsaw': 'PL',
  'Europe/Zurich': 'CH',
  'Pacific/Auckland': 'NZ',
}

function normalizeCountryCode(raw: string | null | undefined): string | null {
  if (!raw) return null
  const code = raw.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(code) ? code : null
}

/** Sync fallback from the system timezone (e.g. Europe/Bucharest → RO). */
export function detectCountryFromTimezone(): string | null {
  if (typeof Intl === 'undefined') return null
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!tz) return null
    if (TIMEZONE_COUNTRY[tz]) return TIMEZONE_COUNTRY[tz]
  } catch {
    // fall through
  }
  return null
}

async function detectCountryFromIp(): Promise<string | null> {
  // ipapi.co returns a bare ISO country code body (`RO`). Lightweight and
  // CORS-friendly for a decorative greeting flag.
  try {
    const res = await fetch('https://ipapi.co/country_code/', {
      signal: AbortSignal.timeout(3500),
    })
    if (!res.ok) return null
    return normalizeCountryCode(await res.text())
  } catch {
    return null
  }
}

/** Resolves the viewer's country: IP first, timezone fallback. */
export async function detectViewerCountryCode(): Promise<string | null> {
  const fromIp = await detectCountryFromIp()
  if (fromIp) return fromIp
  return detectCountryFromTimezone()
}
