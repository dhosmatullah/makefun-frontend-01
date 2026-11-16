// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Every answer is kept in a small revalidation cache: a repeat visit to a view sends the
// stored ETag as If-None-Match, and the API's tags are bound to the minute, so a view
// revisited inside the same minute costs one 304 with no body instead of a full download.
// Identical requests in flight at once share one fetch.

const API = 'https://make.fun/api';

const etagCache = new Map();
const inFlight = new Map();

export async function get(path) {
  const url = API + path;
  if (inFlight.has(url)) return inFlight.get(url);
  const hit = etagCache.get(url);
  const request = (async () => {
    const res = await fetch(url, { headers: hit ? { 'If-None-Match': hit.etag } : {} });
    if (res.status === 304 && hit) return hit.data;
    if (!res.ok) throw new Error(`make.fun answered ${res.status} for ${path}`);
    const data = await res.json();
    const etag = res.headers.get('etag');
    if (etag) etagCache.set(url, { etag, data });
    return data;
  })();
  inFlight.set(url, request);
  try {
    return await request;
  } finally {
    inFlight.delete(url);
  }
}

/** The bounties board: every open bounty, following the list's cursor while it offers one. */
export async function getBounties() {
  const items = [];
  let path = '/competitions?status=open&activity=times&limit=30';
  for (let page = 0; page < 4 && path; page += 1) {
    const data = await get(path);
    items.push(...(data.items ?? []));
    path = data.next_cursor
      ? `/competitions?status=open&activity=times&limit=30&cursor=${encodeURIComponent(data.next_cursor)}`
      : null;
  }
  return items;
}

/** One bounty, by its slug: summary, rules, the live rewards table and recent entries. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: its columns and every ranked entry. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An account's public profile: its record, its entries and its payouts. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);
