// The four surfaces, each a function from API data to HTML: the bounty board, a bounty's
// page, its leaderboard and an account's public profile. Routes live in main.js.

import { date, esc, fileSize, microPct, money, plural, takesEntries, timeLeft } from './format.js';
import { md } from './md.js';

export const bountyPath = (slug) => `#/bounty/${encodeURIComponent(slug)}`;
export const leaderboardPath = (slug) => `#/bounty/${encodeURIComponent(slug)}/leaderboard`;
export const profilePath = (handle) => `#/u/${encodeURIComponent(handle)}`;

/** An avatar image; the API may give a path on make.fun itself, which is resolved
 *  against make.fun's origin, and make.fun's own images ask for crossorigin. */
function avatar(url, name, size) {
  if (!url) return '';
  const src = url.startsWith('/') ? `https://make.fun${url}` : url;
  const cors = src.startsWith('https://make.fun') ? ' crossorigin="anonymous"' : '';
  return `<img class="avatar" src="${esc(src)}"${cors} width="${size}" height="${size}" alt="" loading="lazy">`;
}

/** The live pot: the prize plus every entry fee paid into it so far. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** A countdown the router's ticker refreshes in place from its data-deadline. */
const countdown = (iso) => `<span data-deadline="${esc(iso)}">${timeLeft(iso)}</span>`;

/** One board card for a bounty that still takes entries. */
function bountyCard(b) {
  return `
  <article class="card">
    <p class="card-top"><span class="chip">${esc(b.category ?? 'Bounty')}</span><span class="entries">${plural(b.submissionCount ?? 0, 'entry')}</span></p>
    <h2><a href="${bountyPath(b.slug)}">${esc(b.title)}</a></h2>
    <p class="summary">${esc(b.summary ?? '')}</p>
    <p class="card-facts">
      <span class="pot">${pot(b)} <span class="pot-label">pot</span></span>
      ${b.entryFeeUsd ? `<span class="fee">${money(b.entryFeeUsd)} entry fee</span>` : '<span class="fee free">Free to enter</span>'}
      <span class="time">${countdown(b.deadline)}</span>
    </p>
  </article>`;
}

/** One compact row for a bounty whose deadline has passed. */
function closedRow(b) {
  return `
  <li class="closed-row">
    <a href="${bountyPath(b.slug)}">${esc(b.title)}</a>
    <span>${pot(b)} pot</span>
    <span>${plural(b.submissionCount ?? 0, 'entry')}</span>
    <span>ended ${date(b.deadline)}</span>
  </li>`;
}

export function boardView(bounties) {
  const live = bounties.filter((b) => takesEntries(b)).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const closed = bounties.filter((b) => !takesEntries(b)).sort((a, b) => new Date(b.deadline) - new Date(a.deadline));
  return `
  <h1>Bounty board</h1>
  <p class="lede">Live bounties on make.fun. The pot is the prize plus every entry fee paid in so far, and the clock is each bounty's real deadline.</p>
  <section aria-labelledby="live-heading">
    <h2 id="live-heading">Taking entries (${live.length})</h2>
    ${live.length ? `<div class="grid">${live.map(bountyCard).join('')}</div>` : '<p>No bounty is taking entries right now.</p>'}
  </section>
  ${closed.length ? `<section aria-labelledby="closed-heading"><h2 id="closed-heading">Closed, results pending (${closed.length})</h2><ul class="closed">${closed.map(closedRow).join('')}</ul></section>` : ''}`;
}

/** The rewards table: every paid place with its live amount (base prize + share of fees). */
function rewardsTable(b) {
  const rows = (b.rewardsNow ?? []).map(
    (r) => `<tr><td>${r.place}</td><td class="num">${money(r.amountUsd)}</td><td class="num">${money(r.baseUsd)}</td><td class="num">${money(r.feeShareUsd)}</td></tr>`,
  );
  if (!rows.length && b.rewards) {
    for (const [place, amount] of Object.entries(b.rewards)) {
      rows.push(`<tr><td>${esc(place)}</td><td class="num">${money(amount)}</td><td class="num">${money(amount)}</td><td class="num">${money(0)}</td></tr>`);
    }
  }
  if (!rows.length) return '';
  return `
  <h2>Rewards</h2>
  <div class="table-scroll"><table class="rewards">
    <thead><tr><th scope="col">Place</th><th scope="col" class="num">Prize now</th><th scope="col" class="num">Base</th><th scope="col" class="num">Fee share</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table></div>
  <p class="note">The prize now is the base prize plus this place's share of the entry fees in the pot (${pot(b)}).</p>`;
}

/** Recent entries on a bounty page, each entrant linking to their profile. */
function recentEntries(b) {
  const subs = (b.submissions ?? []).slice(0, 10);
  if (!subs.length) return '';
  const items = subs
    .map(
      (s) => `<li><a href="${profilePath(s.hunter)}">${esc(s.hunter)}</a> <span class="entry-title">${esc(s.title ?? '')}</span> <time datetime="${esc(s.createdAt)}">${date(s.createdAt)}</time></li>`,
    )
    .join('');
  return `<h2>Recent entries</h2><ul class="recent">${items}</ul>`;
}

export function bountyView(b) {
  const open = takesEntries(b);
  return `
  <p class="crumbs"><a href="#/">← Bounty board</a> <a class="button" href="${leaderboardPath(b.slug)}">Leaderboard</a></p>
  <h1>${esc(b.title)}</h1>
  <p class="lede">${esc(b.summary ?? '')}</p>
  <p class="status ${open ? 'open' : 'closed'}">${open ? `Taking entries · ${countdown(b.deadline)}` : `Closed · deadline was ${date(b.deadline)}`}</p>
  <dl class="facts">
    <div><dt>Live pot</dt><dd class="big">${pot(b)}</dd></div>
    <div><dt>Base reward</dt><dd>${money(b.rewardAmount)}</dd></div>
    ${b.entryFeeUsd ? `<div><dt>Entry fee</dt><dd>${money(b.entryFeeUsd)}</dd></div><div><dt>Fees paid in</dt><dd>${money(b.entryFeesUsd ?? 0)} from ${plural(b.entryFeePayers ?? 0, 'entrant')}</dd></div>` : '<div><dt>Entry fee</dt><dd>Free</dd></div>'}
    <div><dt>Deadline</dt><dd>${date(b.deadline)}</dd></div>
    <div><dt>Opened</dt><dd>${date(b.opensAt ?? b.publishedAt)}</dd></div>
    <div><dt>Entries</dt><dd>${b.submissionCount ?? 0}</dd></div>
    <div><dt>Category</dt><dd>${esc(b.category ?? '—')}</dd></div>
    <div><dt>Sponsor</dt><dd>${esc(b.sponsor?.name ?? 'make.fun')}</dd></div>
  </dl>
  ${rewardsTable(b)}
  <h2>About this bounty</h2>
  <div class="prose">${md(b.description ?? '')}</div>
  ${b.rules && b.rules !== b.description ? `<details><summary>Full rules</summary><div class="prose">${md(b.rules)}</div></details>` : ''}
  ${recentEntries(b)}`;
}

/** The metric columns worth a table column: visible ones, minus display-only extras. */
export function leaderboardColumns(lb) {
  return (lb.columns ?? [])
    .filter((c) => !c.hidden && !/display only/i.test(c.title))
    .slice(0, 6);
}

/** One leaderboard cell, formatted by what its column counts. */
function cell(entry, column) {
  const value = entry.values?.[column.key];
  if (value === null || value === undefined) return '—';
  if (column.key === 'valid') return value ? '✓' : '✗';
  if ((column.source ?? '').includes('win_rate_micro')) return microPct(value);
  if (column.key === 'bytes') return fileSize(value);
  return esc(entry.display?.[column.key] ?? value);
}

/** Leaderboard rows for a slice of the entries, so a long board renders a page at a time. */
export function leaderboardRows(lb, columns, from, to) {
  return (lb.entries ?? [])
    .slice(from, to)
    .map(
      (e) => `<tr>
      <td class="num">${e.rank}</td>
      <td><span class="entrant">${avatar(e.image, e.handle, 24)}<a href="${profilePath(e.handle)}">${esc(e.handle)}</a>${e.house ? ' <span class="chip">house</span>' : ''}</span></td>
      <td class="entry-title">${esc(e.title ?? '')}</td>
      ${columns.map((c) => `<td class="num col-${esc(c.key)}">${cell(e, c)}</td>`).join('')}
    </tr>`,
    )
    .join('');
}

export const LEADERBOARD_PAGE = 50;

export function leaderboardView(lb) {
  const columns = leaderboardColumns(lb);
  const total = (lb.entries ?? []).length;
  const shown = Math.min(LEADERBOARD_PAGE, total);
  return `
  <p class="crumbs"><a href="${bountyPath(lb.competition.slug)}">← ${esc(lb.competition.title)}</a></p>
  <h1>Leaderboard</h1>
  <p class="lede">${esc(lb.competition.title)} · ${esc(lb.phase?.title ?? '')} phase${lb.phase?.placements_held ? ' · places are provisional while judging runs' : ''}</p>
  <div class="table-scroll"><table class="leaderboard">
    <thead><tr><th scope="col">#</th><th scope="col">Entrant</th><th scope="col">Entry</th>${columns.map((c) => `<th scope="col" class="num col-${esc(c.key)}">${esc(c.title)}</th>`).join('')}</tr></thead>
    <tbody id="lb-body">${leaderboardRows(lb, columns, 0, shown)}</tbody>
  </table></div>
  ${total > shown ? `<p class="more"><button type="button" data-more>Show more entries</button> <span data-more-note>Showing ${shown} of ${total}</span></p>` : `<p class="note">${plural(total, 'ranked entry')}</p>`}`;
}

/** One of a profile's entries: the bounty it entered, its score and any place or prize. */
function solutionRow(s) {
  const score = s.score
    ? (s.score.column?.source ?? '').includes('win_rate_micro')
      ? microPct(s.score.value)
      : esc(s.score.display ?? s.score.value)
    : '';
  return `
  <li>
    <a href="${bountyPath(s.competition.slug)}">${esc(s.competition.title)}</a>
    <span class="entry-title">${esc(s.title ?? '')}</span>
    ${s.placement ? `<span class="chip">placed #${s.placement}</span>` : ''}
    ${s.prize_usd ? `<span class="fee">${money(s.prize_usd)} won</span>` : ''}
    ${score ? `<span>${esc(s.score.column?.title ?? 'Score')}: ${score}</span>` : ''}
    <time datetime="${esc(s.entered_at)}">${date(s.entered_at)}</time>
  </li>`;
}

export function profileView(p) {
  const record = p.record ?? {};
  const payouts = (p.payouts ?? [])
    .map(
      (pay) => `<li><strong>${money(pay.amount_usd)}</strong> for placing #${pay.place} in <a href="${bountyPath(pay.competition.slug)}">${esc(pay.competition.title)}</a> · ${date(pay.paid_at)} · <a href="${esc(pay.explorer_url)}" rel="noopener">transaction</a></li>`,
    )
    .join('');
  return `
  <p class="crumbs"><a href="#/">← Bounty board</a></p>
  <div class="profile-head">
    ${avatar(p.image ?? p.avatar, p.handle, 64)}
    <div>
      <h1>${esc(p.display_name ?? p.handle)}</h1>
      <p class="handle">@${esc(p.handle)}${p.house ? ' · house account' : ''} · joined ${date(p.joined_at)}</p>
      ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
      <p class="profile-links">
        ${p.github_login ? `<a href="https://github.com/${encodeURIComponent(p.github_login)}" rel="noopener">GitHub</a>` : ''}
        ${p.wallet?.address ? `<a href="${esc(p.wallet.explorer_url)}" rel="noopener">Wallet ${esc(p.wallet.address.slice(0, 4))}…${esc(p.wallet.address.slice(-4))}</a>` : ''}
      </p>
    </div>
  </div>
  <dl class="facts">
    <div><dt>Entered</dt><dd class="big">${record.competitions_entered ?? 0}</dd></div>
    <div><dt>Placed</dt><dd>${record.competitions_placed ?? 0}</dd></div>
    <div><dt>Won</dt><dd>${record.competitions_won ?? 0}</dd></div>
    <div><dt>Podiums</dt><dd>${record.podium_finishes ?? 0}</dd></div>
    <div><dt>Best place</dt><dd>${record.best_placement ? `#${record.best_placement}` : '—'}</dd></div>
    <div><dt>Prizes won</dt><dd>${money(record.prize_usd ?? 0)}</dd></div>
  </dl>
  <h2>Entries (${(p.solutions ?? []).length})</h2>
  <ul class="recent">${(p.solutions ?? []).map(solutionRow).join('') || '<li>No entries yet.</li>'}</ul>
  ${payouts ? `<h2>Payouts</h2><ul class="recent">${payouts}</ul>` : ''}`;
}

export function errorView(message) {
  return `
  <h1>Something went wrong</h1>
  <p role="alert">${esc(message)}</p>
  <p><a href="#/">Back to the bounty board</a></p>`;
}

export function loadingView(label) {
  return `<p class="loading" role="status">Loading ${esc(label)}…</p>`;
}
