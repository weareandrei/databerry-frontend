import { Style, Avatar } from '@dicebear/core'
import adventurer from '@dicebear/styles/adventurer.json'

/**
 * Deterministic person avatars (DiceBear, `adventurer` style).
 *
 * Why a route instead of storing SVGs: a given seed ALWAYS renders the same
 * avatar, so there's nothing worth persisting. We store NOTHING — no DB
 * column, no Supabase Storage — and generate on demand. The 268 KB style
 * definition is imported here, on the server, and never reaches the client
 * bundle. The immutable cache header below means each unique avatar is
 * generated once and then served from the browser/CDN cache forever, so at
 * 20K+ people the real cost is ~the number of distinct faces ever viewed,
 * not one render per request.
 *
 * Seed = the person's stable `people.id`.
 */
export const runtime = 'nodejs'

// Built once per server instance — pure config. Per-request work is just
// `new Avatar(...).toString()` (string templating, no I/O).
const style = new Style(adventurer)

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ seed: string }> },
) {
  const { seed } = await params
  const svg = new Avatar(style, { seed }).toString()

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
