/* ═══════════════════════════════════════════════════════
   MovieMan 2019 — Complete Application JavaScript (Upgraded Cloud)
   ═══════════════════════════════════════════════════════ */

// 💡 GitHub Placeholder (Local environment ke liye apni key use karein)
const API_KEY = 'YOUR_TMDB_API_KEY_HERE'; 
const BASE     = 'https://api.themoviedb.org/3';
const IMG      = 'https://image.tmdb.org/t/p/';

/* ── STATE ──────────────────────────────────────────── */
const State = {
  user: null, 
  heroMovies: [],
  heroIndex: 0,
  heroTimer: null,
  heroStart: 0,
  heroProgressTimer: null,
  searchTimer: null,
  searchType: 'movie',
  battleMovies: [null, null],
  battleTimers: [null, null],
  discoverPage: 1,
  discoverParams: {},
  timelinePage: 1,
  timelineDecade: 2010,
  currentCollection: 'watchlist',
  watchlistCache: { watchlist: [], watching: [], watched: [], favorites: [] }
};

/* ── CLOUD WATCHLIST SYSTEM (MySQL REST Fetch Sync) ──── */
const WL = {
  KEYS: ['watchlist', 'watching', 'watched', 'favorites'],
  
  async sync() {
    try {
      const res = await fetch('api/user/watchlist.php');
      const result = await res.json();
      if (result.status === 'success') {
        WL.KEYS.forEach(k => State.watchlistCache[k] = []);
        result.data.forEach(item => {
          const col = item.collection || 'watchlist';
          if (WL.KEYS.includes(col)) {
            State.watchlistCache[col].push({
              id: parseInt(item.movie_id),
              title: item.movie_title,
              poster_path: item.poster_path,
              rating: item.rating,
              year: item.year
            });
          }
        });
      }
    } catch (e) {
      console.error("Watchlist synchronization failed:", e);
    }
  },

  get(col) {
    return State.watchlistCache[col] || [];
  },

  async add(col, movie) {
    if (!State.user) {
      openAuthModal('login');
      showToast('⚠️ Please log in to manage your watchlist!', 'error');
      return false;
    }
    try {
      const response = await fetch('api/user/watchlist.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_id: movie.id,
          movie_title: movie.title,
          poster_path: movie.poster_path || '',
          rating: movie.rating || '—',
          year: movie.year || '',
          collection: col
        })
      });
      const result = await response.json();
      if (result.status === 'success') {
        await WL.sync();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  async remove(col, id) {
    try {
      await fetch('api/user/watchlist.php', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_id: id, collection: col })
      });
      await WL.sync();
    } catch (e) {
      console.error(e);
    }
  },

  has(id) {
    return WL.KEYS.some(k => WL.get(k).find(m => m.id === parseInt(id)));
  },

  whichCollection(id) {
    for (const k of WL.KEYS) {
      if (WL.get(k).find(m => m.id === parseInt(id))) return k;
    }
    return null;
  }
};

/* ── API HELPERS ─────────────────────────────────────── */
async function tmdb(path, params = {}) {
  const qs = new URLSearchParams({ api_key: API_KEY, ...params }).toString();
  const url = `${BASE}${path}?${qs}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDb error ${res.status}: ${path}`);
  return res.json();
}

function posterUrl(path, size = 'w342') {
  return path ? `${IMG}${size}${path}` : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="342" height="513" viewBox="0 0 342 513"><rect width="342" height="513" fill="%231a1a26"/><text x="171" y="270" text-anchor="middle" fill="%23606070" font-size="80">🎬</text></svg>';
}

function backdropUrl(path, size = 'w1280') {
  return path ? `${IMG}${size}${path}` : '';
}

/* ── INIT ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  initKeyboard();
  populateYearFilter();
  await checkUserSession(); 
  loadHome();
});

/* ── AUTH SYSTEM FLOW & CONTROLLERS ────────────────── */
async function checkUserSession() {
  try {
    const res = await fetch('api/auth/login.php', { method: 'GET' });
    const result = await res.json().catch(() => ({ status: 'error' }));
    if (result.status === 'success' && result.user) {
      State.user = result.user;
      renderActiveUserProfileNav();
      await WL.sync();
    }
  } catch (e) {
    State.user = null;
  }
}

function renderActiveUserProfileNav() {
  const navSection = document.getElementById('authNavSection');
  if (!navSection || !State.user) return;
  navSection.innerHTML = `
    <div class="user-profile-menu">
      <button class="user-trigger" onclick="toggleUserDropdown(event)">
        👤 <span>${State.user.username}</span>
      </button>
      <div class="user-dropdown" id="userProfileDropdown">
        <button onclick="showSection('watchlist')">📚 My Space</button>
        <button onclick="handleLogout()">🚪 Sign Out</button>
      </div>
    </div>`;
}

function toggleUserDropdown(e) {
  e.stopPropagation();
  const d = document.getElementById('userProfileDropdown');
  if (d) d.classList.toggle('open');
}

window.addEventListener('click', () => {
  const d = document.getElementById('userProfileDropdown');
  if (d) d.classList.remove('open');
});

function openAuthModal(mode = 'login') {
  const overlay = document.getElementById('authOverlay');
  if (overlay) {
    overlay.classList.add('open');
    switchAuthTab(mode);
  }
}

function closeAuthModal() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.remove('open');
}

function switchAuthTab(mode) {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  if (mode === 'login') {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.classList.add('active');
    formRegister.classList.remove('active');
  } else {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.classList.add('active');
    formLogin.classList.remove('active');
  }
}

function closeAuthIfBackdrop(e) {
  if (e.target.id === 'authOverlay') closeAuthModal();
}

async function handleAuthSubmit(event, mode) {
  event.preventDefault();
  const url = mode === 'login' ? 'api/auth/login.php' : 'api/auth/register.php';
  const payload = mode === 'login' ? {
    username: document.getElementById('loginUser').value,
    password: document.getElementById('loginPass').value
  } : {
    username: document.getElementById('regUser').value,
    email: document.getElementById('regEmail').value,
    password: document.getElementById('regPass').value
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.status === 'success') {
      showToast(result.message, 'success');
      closeAuthModal();
      setTimeout(() => location.reload(), 800);
    } else {
      showToast(result.message, 'error');
    }
  } catch (err) {
    showToast('Authentication pipeline exception error.', 'error');
  }
}

async function handleLogout() {
  try {
    await fetch('api/auth/login.php', { method: 'DELETE' });
    showToast('Logged out successfully.', 'info');
    setTimeout(() => location.reload(), 600);
  } catch (e) {
    location.reload();
  }
}

/* ── NAVBAR ──────────────────────────────────────────── */
function initNavbar() {
  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 30);
  });
}

function toggleMobileMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}

/* ── SECTION NAVIGATION ──────────────────────────────── */
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.section === name);
  });
  document.getElementById('navLinks').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (name === 'discover' && !document.querySelector('#discoverGrid .movie-grid-card')) loadDiscover();
  if (name === 'timeline' && !document.querySelector('#timelineGrid .movie-grid-card')) loadDecade(2010, document.querySelector('.decade-btn.active'));
  if (name === 'watchlist') renderWatchlist();
}

/* ── HOME ────────────────────────────────────────────── */
async function loadHome() {
  try {
    await Promise.all([
      loadHero(),
      loadRow('trendingRow',   '/trending/movie/week'),
      loadRow('nowPlayingRow', '/movie/now_playing'),
      loadRow('topRatedRow',   '/movie/top_rated'),
      loadRow('upcomingRow',   '/movie/upcoming'),
      loadAnimeRow(),
      loadGlobalTab('hi', document.querySelector('.gtab[data-lang="hi"]')),
    ]);
  } catch (e) {
    console.error('Home load error:', e);
  }
}

async function loadHero() {
  const data = await tmdb('/trending/movie/week');
  State.heroMovies = data.results.slice(0, 8);
  buildHeroDots();
  renderHero(0);
  startHeroTimer();
}

function buildHeroDots() {
  const container = document.getElementById('heroDots');
  container.innerHTML = State.heroMovies.map((_, i) => `<div class="hero-dot ${i===0?'active':''}" onclick="goHero(${i})"></div>`).join('');
}

function renderHero(index) {
  const movie = State.heroMovies[index];
  if (!movie) return;
  State.heroIndex = index;

  const bg = document.getElementById('heroBg');
  const title = document.getElementById('heroTitle');
  const tag = document.getElementById('heroTagline');
  const meta = document.getElementById('heroMeta');
  const acts = document.getElementById('heroActions');

  bg.style.backgroundImage = backdropUrl(movie.backdrop_path) ? `url(${backdropUrl(movie.backdrop_path, 'original')})` : `linear-gradient(135deg, #1a1a26, #0a0a0f)`;
  title.textContent = movie.title || movie.name || 'Untitled';
  tag.textContent = movie.overview || '';

  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
  const year = (movie.release_date || '').split('-')[0] || '';

  meta.innerHTML = `<span class="hero-rating">⭐ ${rating}</span><span class="hero-year">${year}</span><span class="hero-genre-tag">🎬 Movie</span>`;
  acts.innerHTML = `<button class="btn-primary" onclick="openMovieDetail(${movie.id})">▶ View Details</button><button class="btn-secondary" onclick="openTrailerFor(${movie.id})">🎬 Trailer</button>`;

  document.querySelectorAll('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === index));
}

function startHeroTimer() {
  clearInterval(State.heroTimer);
  clearInterval(State.heroProgressTimer);
  State.heroStart = Date.now();
  const DURATION = 15000;

  State.heroProgressTimer = setInterval(() => {
    const elapsed = Date.now() - State.heroStart;
    const pct = Math.min((elapsed / DURATION) * 100, 100);
    document.getElementById('heroProgress').style.width = pct + '%';
  }, 100);

  State.heroTimer = setInterval(() => {
    goHero((State.heroIndex + 1) % State.heroMovies.length);
  }, DURATION);
}

function goHero(index) {
  State.heroStart = Date.now();
  renderHero(index);
}

function prevHero() {
  goHero((State.heroIndex - 1 + State.heroMovies.length) % State.heroMovies.length);
  startHeroTimer();
}

function nextHero() {
  goHero((State.heroIndex + 1) % State.heroMovies.length);
  startHeroTimer();
}

/* ── MOVIE ROWS ──────────────────────────────────────── */
async function loadRow(containerId, endpoint, params = {}) {
  const container = document.getElementById(containerId);
  container.innerHTML = '<div class="skeleton-row"></div>';
  const data = await tmdb(endpoint, params);
  container.innerHTML = data.results.slice(0, 20).map(m => movieCardHTML(m)).join('');
}

function movieCardHTML(m) {
  const title = m.title || m.name || 'Untitled';
  const rating = m.vote_average ? m.vote_average.toFixed(1) : '—';
  const year = (m.release_date || m.first_air_date || '').split('-')[0] || '';
  return `
    <div class="movie-card" onclick="openMovieDetail(${m.id}, '${m.media_type || 'movie'}')">
      <img class="movie-card-poster" src="${posterUrl(m.poster_path, 'w342')}" alt="${title}" loading="lazy" />
      <div class="movie-card-info">
        <div class="movie-card-title">${title}</div>
        <div class="movie-card-meta"><span class="movie-card-rating">⭐ ${rating}</span><span>${year}</span></div>
      </div>
      <div class="movie-card-overlay">
        <button class="overlay-btn" onclick="event.stopPropagation();openMovieDetail(${m.id})">Details</button>
        <button class="overlay-btn outline" onclick="event.stopPropagation();quickAddWatchlist(${m.id},'${escapeAttr(title)}','${m.poster_path||''}','${rating}','${year}')">+ Watchlist</button>
      </div>
    </div>`;
}

function movieGridCardHTML(m) {
  const title = m.title || m.name || 'Untitled';
  const rating = m.vote_average ? m.vote_average.toFixed(1) : '—';
  const year = (m.release_date || m.first_air_date || '').split('-')[0] || '';
  const inWL = WL.has(m.id);
  return `
    <div class="movie-grid-card" onclick="openMovieDetail(${m.id})">
      <img class="grid-card-poster" src="${posterUrl(m.poster_path, 'w342')}" alt="${title}" loading="lazy" />
      <div class="grid-card-info">
        <div class="grid-card-title">${title}</div>
        <div class="grid-card-meta"><span class="grid-card-rating">⭐ ${rating}</span><span>${year}</span></div>
      </div>
      <div class="watchlist-badge" title="${inWL ? 'In Watchlist' : 'Add to Watchlist'}" onclick="event.stopPropagation();quickAddWatchlist(${m.id},'${escapeAttr(title)}','${m.poster_path||''}','${rating}','${year}')">${inWL ? '✓' : '+'}</div>
    </div>`;
}

/* ── GLOBAL TABS ─────────────────────────────────────── */
async function loadGlobalTab(lang, el) {
  document.querySelectorAll('.gtab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  const container = document.getElementById('globalRow');
  container.innerHTML = '<div class="skeleton-row"></div>';
  const data = await tmdb('/discover/movie', { with_original_language: lang, sort_by: 'popularity.desc', 'vote_count.gte': 100 });
  container.innerHTML = data.results.slice(0, 20).map(m => movieCardHTML(m)).join('');
}

/* ── ANIME ROW ───────────────────────────────────────── */
async function loadAnimeRow() {
  const data = await tmdb('/discover/tv', { with_genres: '16', with_original_language: 'ja', sort_by: 'popularity.desc', 'vote_count.gte': 200 });
  const container = document.getElementById('animeRow');
  container.innerHTML = data.results.slice(0, 20).map(m => movieCardHTML({ ...m, media_type: 'tv' })).join('');
}

/* ── DISCOVER ────────────────────────────────────────── */
function populateYearFilter() {
  const sel = document.getElementById('filterYear');
  const now = new Date().getFullYear();
  for (let y = now; y >= 1920; y--) sel.innerHTML += `<option value="${y}">${y}</option>`;
}

function applyDiscoverFilters() {
  State.discoverPage = 1;
  const genre = document.getElementById('filterGenre').value;
  const lang = document.getElementById('filterLang').value;
  const year = document.getElementById('filterYear').value;
  const sort = document.getElementById('filterSort').value;
  State.discoverParams = {};
  if (genre) State.discoverParams.with_genres = genre;
  if (lang) State.discoverParams.with_original_language = lang;
  if (year) {
    State.discoverParams['primary_release_date.gte'] = `${year}-01-01`;
    State.discoverParams['primary_release_date.lte'] = `${year}-12-31`;
  }
  if (sort) State.discoverParams.sort_by = sort;
  loadDiscover(true);
}

async function loadDiscover(reset = false) {
  if (reset) {
    State.discoverPage = 1;
    document.getElementById('discoverGrid').innerHTML = '<div class="spinner"></div>';
  }
  const btn = document.getElementById('discoverLoadMore');
  btn.disabled = true;
  const data = await tmdb('/discover/movie', { ...State.discoverParams, page: State.discoverPage, 'vote_count.gte': 20 });
  const grid = document.getElementById('discoverGrid');
  if (reset) grid.innerHTML = '';
  if (!data.results.length) {
    grid.innerHTML = '<p style="color:var(--text2);padding:40px;grid-column:1/-1;text-align:center">No movies found for these filters.</p>';
    return;
  }
  grid.innerHTML += data.results.map(m => movieGridCardHTML(m)).join('');
  btn.disabled = data.page >= data.total_pages;
}

function loadMoreDiscover() {
  State.discoverPage++;
  loadDiscover(false);
}

function resetDiscoverFilters() {
  document.getElementById('filterGenre').value = '';
  document.getElementById('filterLang').value = '';
  document.getElementById('filterYear').value = '';
  document.getElementById('filterSort').value = 'popularity.desc';
  State.discoverParams = {};
  loadDiscover(true);
}

/* ── CINEMAP ──────────────────────────────────────────── */
async function loadCountryFilms(el) {
  document.querySelectorAll('.country-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const country = el.dataset.country;
  const lang = el.dataset.lang;
  const countryName = el.querySelector('.country-name').textContent;

  const resultsDiv = document.getElementById('cinemapResults');
  const grid = document.getElementById('cinemapGrid');
  const title = document.getElementById('cinemapCountryTitle');

  resultsDiv.classList.remove('hidden');
  grid.innerHTML = '<div class="spinner"></div>';
  title.textContent = `Films from ${countryName}`;
  resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const data = await tmdb('/discover/movie', { with_origin_country: country, with_original_language: lang, sort_by: 'popularity.desc', 'vote_count.gte': 50 });
  grid.innerHTML = data.results.map(m => movieGridCardHTML(m)).join('');
}

function closeCinemapResults() {
  document.getElementById('cinemapResults').classList.add('hidden');
  document.querySelectorAll('.country-card').forEach(c => c.classList.remove('active'));
}

/* ── MOOD DISCOVERY ──────────────────────────────────── */
const MOOD_CONFIG = {
  happy: { genres: '35', sort: 'popularity.desc', label: 'Happy Vibes 😄' },
  horror: { genres: '27,53', sort: 'vote_average.desc', label: 'Horror Night 👻', min_votes: 1000 },
  mindblow: { genres: '9648,878,53', sort: 'vote_average.desc', label: 'Mind-Blowing 🤯', min_votes: 500 },
  romance: { genres: '10749', sort: 'popularity.desc', label: 'Romance 💕' },
  adventure: { genres: '12,28', sort: 'popularity.desc', label: 'Adventure 🌍' },
  scifi: { genres: '878', sort: 'popularity.desc', label: 'Sci-Fi 🚀' },
  family: { genres: '10751,16', sort: 'popularity.desc', label: 'Family Night 👨‍👩‍👧' },
  documentary: { genres: '99', sort: 'vote_average.desc', label: 'Documentaries 📽️', min_votes: 200 },
};

async function loadMoodFilms(mood, el) {
  document.querySelectorAll('.mood-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const cfg = MOOD_CONFIG[mood];
  const resultsDiv = document.getElementById('moodResults');
  const grid = document.getElementById('moodGrid');
  const titleEl = document.getElementById('moodResultsTitle');

  resultsDiv.classList.remove('hidden');
  grid.innerHTML = '<div class="spinner"></div>';
  titleEl.textContent = cfg.label;
  resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const data = await tmdb('/discover/movie', { with_genres: cfg.genres, sort_by: cfg.sort, 'vote_count.gte': cfg.min_votes || 100 });
  grid.innerHTML = data.results.map(m => movieGridCardHTML(m)).join('');
}

function closeMoodResults() {
  document.getElementById('moodResults').classList.add('hidden');
  document.querySelectorAll('.mood-card').forEach(c => c.classList.remove('active'));
}

/* ── TIMELINE ─────────────────────────────────────────── */
const ERA_DESCS = {
  1920: 'The silent film era — Charlie Chaplin, Buster Keaton, and the birth of Hollywood.',
  1930: 'The golden age of Hollywood musicals and screwball comedies.',
  1940: 'Film noir, war epics, and the rise of Italian neorealism.',
  1950: 'Widescreen spectacle, science fiction, and the birth of the blockbuster.',
  1960: 'New Wave movements in France and America challenged conventional storytelling.',
  1970: 'The New Hollywood era — Coppola, Scorsese, Kubrick, and Lucas.',
  1980: 'Blockbusters exploded. Star Wars, Spielberg, and the rise of the action hero.',
  1990: 'Independent film thrived alongside digital revolution. Tarantino. Wachowski.',
  2000: 'Franchises took over. Lord of the Rings, Harry Potter, and Marvel begin.',
  2010: 'Streaming disrupted everything. Superhero fatigue set in. A decade of sequels.',
  2020: 'The pandemic changed cinema forever. Streaming became the primary medium.',
};

async function loadDecade(decade, el) {
  document.querySelectorAll('.decade-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  State.timelineDecade = decade;
  State.timelinePage = 1;

  document.getElementById('timelineEraDesc').textContent = ERA_DESCS[decade] || '';
  document.getElementById('timelineGrid').innerHTML = '<div class="spinner"></div>';

  const data = await tmdb('/discover/movie', { 'primary_release_date.gte': `${decade}-01-01`, 'primary_release_date.lte': `${decade + 9}-12-31`, sort_by: 'vote_average.desc', 'vote_count.gte': 500, page: 1 });
  document.getElementById('timelineGrid').innerHTML = data.results.map(m => movieGridCardHTML(m)).join('');
  document.getElementById('timelineLoadMore').disabled = data.page >= data.total_pages;
}

async function loadMoreTimeline() {
  State.timelinePage++;
  const data = await tmdb('/discover/movie', { 'primary_release_date.gte': `${State.timelineDecade}-01-01`, 'primary_release_date.lte': `${State.timelineDecade + 9}-12-31`, sort_by: 'vote_average.desc', 'vote_count.gte': 500, page: State.timelinePage });
  document.getElementById('timelineGrid').innerHTML += data.results.map(m => movieGridCardHTML(m)).join('');
  document.getElementById('timelineLoadMore').disabled = data.page >= data.total_pages;
}

/* ── MOVIE BATTLE ────────────────────────────────────── */
function battleSearchDebounce(slot) {
  clearTimeout(State.battleTimers[slot - 1]);
  State.battleTimers[slot - 1] = setTimeout(() => battleSearch(slot), 350);
}

async function battleSearch(slot) {
  const q = document.getElementById(`battleSearch${slot}`).value.trim();
  const dropdown = document.getElementById(`battleDropdown${slot}`);
  if (!q) { dropdown.classList.remove('open'); return; }
  const data = await tmdb('/search/movie', { query: q, page: 1 });
  const items = data.results.slice(0, 8);
  dropdown.innerHTML = items.map(m => `
    <div class="battle-option" onclick="selectBattleMovie(${slot}, ${m.id})">
      <img src="${posterUrl(m.poster_path, 'w92')}" alt="${m.title}" />
      <div>
        <div class="battle-option-title">${m.title}</div>
        <div class="battle-option-year">${(m.release_date || '').split('-')[0]}</div>
      </div>
    </div>`).join('');
  dropdown.classList.add('open');
}

async function selectBattleMovie(slot, id) {
  document.getElementById(`battleDropdown${slot}`).classList.remove('open');
  const detail = await tmdb(`/movie/${id}`, { append_to_response: 'credits' });
  State.battleMovies[slot - 1] = detail;
  document.getElementById(`battleSearch${slot}`).value = detail.title;
  if (State.battleMovies[0] && State.battleMovies[1]) renderBattle();
}

function renderBattle() {
  const [m1, m2] = State.battleMovies;
  const arena = document.getElementById('battleArena');

  const stats = [
    { label: 'Rating', v1: m1.vote_average, v2: m2.vote_average, max: 10 },
    { label: 'Popularity', v1: m1.popularity, v2: m2.popularity, max: Math.max(m1.popularity, m2.popularity) },
    { label: 'Budget', v1: m1.budget / 1e6, v2: m2.budget / 1e6, max: Math.max(m1.budget, m2.budget) / 1e6 || 1 },
    { label: 'Revenue', v1: m1.revenue / 1e6, v2: m2.revenue / 1e6, max: Math.max(m1.revenue, m2.revenue) / 1e6 || 1 },
    { label: 'Runtime', v1: m1.runtime, v2: m2.runtime, max: Math.max(m1.runtime, m2.runtime) || 1 },
  ];

  let wins1 = 0, wins2 = 0;
  stats.forEach(s => { if (s.v1 > s.v2) wins1++; else if (s.v2 > s.v1) wins2++; });
  const winner = wins1 > wins2 ? 1 : wins2 > wins1 ? 2 : 0;

  function sideHTML(m, side) {
    const isWinner = winner === side;
    const statsForSide = stats.map(s => ({
      label: s.label,
      value: side === 1 ? s.v1 : s.v2,
      pct: Math.round(((side === 1 ? s.v1 : s.v2) / s.max) * 100),
      wins: side === 1 ? s.v1 >= s.v2 : s.v2 >= s.v1,
    }));
    return `
      <div class="battle-side">
        <div class="battle-poster-wrap">
          ${isWinner ? '<div class="battle-winner-crown">👑</div>' : ''}
          <img class="battle-poster" src="${posterUrl(m.poster_path, 'w342')}" alt="${m.title}" />
        </div>
        <div class="battle-movie-title">${m.title}</div>
        <div class="battle-movie-year">${(m.release_date || '').split('-')[0]}</div>
        <div class="battle-score-badge">${side===1 ? wins1 : wins2}</div>
        <div class="battle-stats">
          ${statsForSide.map(s => `
            <div class="battle-stat-row">
              <div class="battle-stat-label">
                <span>${s.label} ${s.wins ? '✓' : ''}</span>
                <span>${typeof s.value === 'number' ? s.value.toFixed(1) : s.value}</span>
              </div>
              <div class="battle-stat-bar-wrap">
                <div class="battle-stat-bar" data-pct="${s.pct}" style="width:0"></div>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  arena.innerHTML = `
    <div class="battle-compare">
      ${sideHTML(m1, 1)}
      <div class="battle-divider">
        <div class="battle-divider-line"></div>
        <div class="battle-vs-small">VS</div>
        <div class="battle-divider-line"></div>
      </div>
      ${sideHTML(m2, 2)}
    </div>`;

  requestAnimationFrame(() => {
    document.querySelectorAll('.battle-stat-bar').forEach(bar => {
      setTimeout(() => { bar.style.width = bar.dataset.pct + '%'; }, 200);
    });
  });
}

/* ── WATCHLIST VIEW INTERFACES ────────────────────────── */
function switchCollection(col, el) {
  State.currentCollection = col;
  document.querySelectorAll('.ctab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderWatchlist();
}

function renderWatchlist() {
  const col = State.currentCollection;
  const items = WL.get(col);
  const grid = document.getElementById('watchlistGrid');
  const empty = document.getElementById('watchlistEmpty');
  renderWatchlistStats();

  if (!items.length) {
    grid.innerHTML = '';
    grid.appendChild(empty);
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = items.map(m => `
    <div class="movie-grid-card">
      <img class="grid-card-poster" src="${posterUrl(m.poster_path, 'w342')}" alt="${m.title}" loading="lazy" onclick="openMovieDetail(${m.id})" />
      <div class="grid-card-info">
        <div class="grid-card-title">${m.title}</div>
        <div class="grid-card-meta"><span class="grid-card-rating">⭐ ${m.rating || '—'}</span><span>${m.year || ''}</span></div>
      </div>
      <div class="watchlist-badge" title="Remove" style="background:var(--accent)" onclick="removeFromWatchlist(${m.id},'${col}')">✕</div>
    </div>`).join('');
}

function renderWatchlistStats() {
  const stats = document.getElementById('watchlistStats');
  if (!stats) return;
  const totals = WL.KEYS.map(k => ({ key: k, count: WL.get(k).length }));
  const labels = { watchlist: 'Want to Watch', watching: 'Watching', watched: 'Watched', favorites: 'Favorites' };
  stats.innerHTML = totals.map(t => `
    <div class="wstat">
      <div class="wstat-num">${t.count}</div>
      <div class="wstat-label">${labels[t.key]}</div>
    </div>`).join('');
}

async function quickAddWatchlist(id, title, poster_path, rating, year) {
  const movie = { id, title, poster_path, rating, year };
  const added = await WL.add('watchlist', movie);
  if (added) {
    showToast(`✅ "${title}" synced to Cloud Watchlist`, 'success');
  } else if (!State.user) {
    return;
  } else {
    showToast(`ℹ️ Already structured in your lists`, 'info');
  }
}

async function removeFromWatchlist(id, col) {
  await WL.remove(col, id);
  renderWatchlist();
  showToast('Removed from cloud container', 'info');
}

async function clearCollection() {
  if (!State.user) return openAuthModal('login');
  if (!confirm(`Clear your entire custom "${State.currentCollection}" records library permanently?`)) return;
  try {
    await fetch('api/user/watchlist.php', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movie_id: null }) 
    });
    await WL.sync();
    renderWatchlist();
    showToast('Collection wiped successfully.', 'success');
  } catch (e) {
    showToast('Failed to clear records.', 'error');
  }
}

/* ── MOVIE DETAIL MODAL ──────────────────────────────── */
async function openMovieDetail(id, type = 'movie') {
  const overlay = document.getElementById('movieModalOverlay');
  const hero = document.getElementById('modalHero');
  const body = document.getElementById('modalBody');

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  hero.innerHTML = '';
  body.innerHTML = '<div class="spinner"></div>';

  const [detail, credits, videos] = await Promise.all([
    tmdb(`/${type}/${id}`),
    tmdb(`/${type}/${id}/credits`),
    tmdb(`/${type}/${id}/videos`),
  ]);

  const title = detail.title || detail.name || 'Untitled';
  const year = (detail.release_date || detail.first_air_date || '').split('-')[0];
  const rating = detail.vote_average ? detail.vote_average.toFixed(1) : 'N/A';
  const runtime = detail.runtime ? `${detail.runtime} min` : '';
  const overview = detail.overview || 'No description available.';
  const genres = (detail.genres || []).map(g => `<span class="modal-genre-tag">${g.name}</span>`).join('');
  const trailer = (videos.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');
  const cast = (credits.cast || []).slice(0, 10);
  const wl = WL.whichCollection(id);

  hero.innerHTML = `<img class="modal-backdrop" src="${backdropUrl(detail.backdrop_path, 'w1280')}" alt="${title}" onerror="this.style.display='none'" /><div class="modal-hero-overlay"></div>`;
  
  body.innerHTML = `
    <div class="modal-title-row">
      <img class="modal-poster" src="${posterUrl(detail.poster_path, 'w342')}" alt="${title}" />
      <div class="modal-title-info">
        <h1 class="modal-title">${title}</h1>
        <div class="modal-meta">
          <span class="modal-rating">⭐ ${rating}</span>
          ${year ? `<span>${year}</span>` : ''}
          ${runtime ? `<span>⏱ ${runtime}</span>` : ''}
          <span>🗳 ${(detail.vote_count || 0).toLocaleString()} votes</span>
        </div>
        <div class="modal-genres">${genres}</div>
        <div class="modal-actions">
          ${trailer ? `<button class="btn-primary" onclick="openTrailer('${trailer.key}')">▶ Watch Trailer</button>` : ''}
          <button class="btn-dna" onclick="openDNA(${id}, '${escapeAttr(title)}')">🧬 Movie DNA</button>
          
          <select class="modal-collection-select" onchange="quickAddWatchlist(${id}, '${escapeAttr(title)}', '${detail.poster_path || ''}', '${rating}', '${year}')">
            <option value="" ${!wl ? 'selected' : ''}>➕ Add to List...</option>
            <option value="watchlist" ${wl === 'watchlist' ? 'selected' : ''}>Want to Watch</option>
            <option value="watching" ${wl === 'watching' ? 'selected' : ''}>Watching</option>
            <option value="watched" ${wl === 'watched' ? 'selected' : ''}>Watched</option>
            <option value="favorites" ${wl === 'favorites' ? 'selected' : ''}>Favorite</option>
          </select>
        </div>
      </div>
    </div>
    <div class="modal-overview-section">
      <h3>Overview</h3>
      <p>${overview}</p>
    </div>`;
}

function closeMovieDetail() {
  const overlay = document.getElementById('movieModalOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// Utility stub for escaping HTML attributes cleanly
function escapeAttr(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
