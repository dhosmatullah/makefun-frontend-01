// A make.fun frontend: the bounty board, a bounty's page, its leaderboard and an
// account's public profile, on hash routes.
//
//   #/                              the board
//   #/bounty/<slug>                 one bounty
//   #/bounty/<slug>/leaderboard     its leaderboard
//   #/u/<handle>                    an account's public profile
//
// Only <main> is re-rendered on a route change; the header and footer stay put.
// window.__shotReady is false while a page loads and true once its data is on screen,
// so a screenshot script knows when to capture.

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { timeLeft } from './format.js';
import {
  LEADERBOARD_PAGE,
  boardView,
  bountyView,
  errorView,
  leaderboardColumns,
  leaderboardRows,
  leaderboardView,
  loadingView,
  profileView,
} from './views.js';

const app = document.getElementById('app');
let navigation = 0;
let leaderboard = null;

function parseRoute(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map((part) => decodeURIComponent(part));
  if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') return { name: 'leaderboard', slug: parts[1] };
  if (parts[0] === 'bounty' && parts[1]) return { name: 'bounty', slug: parts[1] };
  if (parts[0] === 'u' && parts[1]) return { name: 'profile', handle: parts[1] };
  return { name: 'board' };
}

async function render() {
  const mine = (navigation += 1);
  const route = parseRoute(location.hash);
  window.__shotReady = false;
  leaderboard = null;
  app.innerHTML = loadingView('make.fun');
  try {
    if (route.name === 'bounty') {
      const bounty = await getBounty(route.slug);
      if (mine !== navigation) return;
      document.title = `${bounty.title} | make.fun bounties`;
      app.innerHTML = bountyView(bounty);
    } else if (route.name === 'leaderboard') {
      const data = await getLeaderboard(route.slug);
      if (mine !== navigation) return;
      document.title = `Leaderboard · ${data.competition.title} | make.fun bounties`;
      leaderboard = { data, columns: leaderboardColumns(data), shown: Math.min(LEADERBOARD_PAGE, data.entries.length) };
      app.innerHTML = leaderboardView(data);
    } else if (route.name === 'profile') {
      const profile = await getProfile(route.handle);
      if (mine !== navigation) return;
      document.title = `${profile.display_name ?? profile.handle} (@${profile.handle}) | make.fun bounties`;
      app.innerHTML = profileView(profile);
    } else {
      const bounties = await getBounties();
      if (mine !== navigation) return;
      document.title = 'Bounty board | make.fun bounties';
      app.innerHTML = boardView(bounties);
    }
  } catch (error) {
    if (mine !== navigation) return;
    document.title = 'Something went wrong | make.fun bounties';
    app.innerHTML = errorView(`Could not load this page from make.fun. ${error.message}`);
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

// "Show more" on a leaderboard appends the next page of rows to the table in place;
// the rest of the page is not rebuilt.
app.addEventListener('click', (event) => {
  const button = event.target.closest('[data-more]');
  if (!button || !leaderboard) return;
  const { data, columns, shown } = leaderboard;
  const next = Math.min(shown + LEADERBOARD_PAGE, data.entries.length);
  document.getElementById('lb-body').insertAdjacentHTML('beforeend', leaderboardRows(data, columns, shown, next));
  leaderboard.shown = next;
  const note = document.querySelector('[data-more-note]');
  if (note) note.textContent = `Showing ${next} of ${data.entries.length}`;
  if (next >= data.entries.length) button.closest('.more').remove();
});

// Countdowns tick in place: only the text of each [data-deadline] element changes.
setInterval(() => {
  for (const el of document.querySelectorAll('[data-deadline]')) {
    el.textContent = timeLeft(el.dataset.deadline);
  }
}, 20000);

window.addEventListener('hashchange', render);
render();
