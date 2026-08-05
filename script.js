const API_KEY = '5be3c0bbb4207895856dcb562e5d11ec';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_URL = 'https://image.tmdb.org/t/p/w1280';

const genresList = [
  { id: 28, name: "أكشن" },
  { id: 12, name: "مغامرة" },
  { id: 16, name: "أنيميشن" },
  { id: 35, name: "كوميديا" },
  { id: 80, name: "جريمة" },
  { id: 18, name: "دراما" },
  { id: 27, name: "رعب" },
  { id: 10749, name: "رومانسي" },
  { id: 878, name: "خيال علمي" },
  { id: 53, name: "إثارة" }
];

let currentType = 'movie';
let currentMode = 'popular';
let currentPage = 1;
let isLoading = false;
let hasMorePages = true;
let activeGenreId = null;
let searchQuery = '';
let currentActiveItem = null;

const ytParams = "autoplay=1&mute=1&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&enablejsapi=1&loop=1&playlist=";

async function fetchData(endpoint, params = '') {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}?api_key=${API_KEY}&include_adult=false${params}`);
    if (!response.ok) throw new Error();
    return await response.json();
  } catch (error) {
    return null;
  }
}

async function loadContent(isAppend = false) {
  if (isLoading || (!hasMorePages && isAppend)) return;
  isLoading = true;

  const loader = document.getElementById('loader');
  if (loader && isAppend) loader.classList.add('active');

  let endpoint = '';
  let params = `&page=${currentPage}`;

  if (currentMode === 'popular') {
    endpoint = `/${currentType}/popular`;
    params += '&language=ar-SA';
  } else if (currentMode === 'search') {
    endpoint = `/search/${currentType}`;
    params += `&query=${encodeURIComponent(searchQuery)}&language=ar-SA`;
  } else if (currentMode === 'genre') {
    endpoint = `/discover/${currentType}`;
    const sortBy = document.getElementById('sortBySelect')?.value || 'popularity.desc';
    const lang = document.getElementById('langSelect')?.value || '';
    params += `&with_genres=${activeGenreId}&sort_by=${sortBy}&language=ar-SA`;
    if (lang) params += `&with_original_language=${lang}`;
  } else if (currentMode === 'watchlist') {
    renderWatchlistGrid();
    isLoading = false;
    if (loader) loader.classList.remove('active');
    return;
  }

  const data = await fetchData(endpoint, params);
  if (loader) loader.classList.remove('active');
  isLoading = false;

  if (!data || !data.results) return;

  if (currentPage >= data.total_pages) hasMorePages = false;
  const items = data.results;

  if (!isAppend) {
    if (items.length > 0 && currentMode === 'popular') setupHero(items[0]);
    renderGrid(items, false);
  } else {
    renderGrid(items, true);
  }
}

async function setupHero(item) {
  currentActiveItem = item;
  const title = item.title || item.name;
  const backdrop = item.backdrop_path ? `${BACKDROP_URL}${item.backdrop_path}` : '';
  const heroBanner = document.getElementById('heroBanner');
  const videoContainer = document.getElementById('heroVideoContainer');

  if (heroBanner) heroBanner.style.backgroundImage = `url('${backdrop}')`;
  
  const heroTitleEl = document.getElementById('heroTitle');
  const heroDescEl = document.getElementById('heroDesc');
  if (heroTitleEl) heroTitleEl.innerText = title;
  if (heroDescEl) heroDescEl.innerText = item.overview || 'لا يوجد وصف متوفر لهذا العمل.';
  
  const detailsBtn = document.getElementById('heroDetailsBtn');
  if (detailsBtn) {
    detailsBtn.style.display = 'inline-flex';
    detailsBtn.onclick = () => openDetails(item);
  }

  const heroPlayBtn = document.getElementById('heroPlayBtn');
  if (heroPlayBtn) {
    heroPlayBtn.onclick = () => openPlayer(currentType, item.id);
  }

  const trailerKey = await getTrailerKey(currentType, item.id);
  if (trailerKey && heroBanner && videoContainer) {
    heroBanner.style.backgroundImage = 'none';
    videoContainer.innerHTML = `
      <iframe src="https://www.youtube-nocookie.com/embed/${trailerKey}?${ytParams}${trailerKey}" 
              allow="autoplay; encrypted-media">
      </iframe>
    `;
  } else if (videoContainer) {
    videoContainer.innerHTML = '';
  }
}

function renderGrid(items, append = false) {
  const grid = document.getElementById('contentGrid');
  if (!grid) return;
  if (!append) grid.innerHTML = '';

  if (items.length === 0 && !append) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">لم يتم العثور على أي نتائج مطابقة.</p>';
    return;
  }

  items.forEach(item => {
    const title = item.title || item.name;
    const poster = item.poster_path ? `${IMG_URL}${item.poster_path}` : 'https://via.placeholder.com/500x750/18181c/ffffff?text=No+Image';
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    const date = (item.release_date || item.first_air_date || '').split('-')[0];

    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => openDetails(item);

    card.innerHTML = `
      <div class="card-img-wrapper">
        <img src="${poster}" alt="${title}" loading="lazy">
        <div class="card-overlay-badge">★ ${rating}</div>
      </div>
      <div class="card-info">
        <div class="card-title">${title}</div>
        <div class="card-meta">
          <span>${date || 'N/A'}</span>
          <span class="rating">${currentType === 'movie' ? 'فيلم' : 'مسلسل'}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function getTrailerKey(type, id) {
  const dataAr = await fetchData(`/${type}/${id}/videos`, '&language=ar-SA');
  let trailer = dataAr && dataAr.results ? dataAr.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') : null;

  if (!trailer) {
    const dataEn = await fetchData(`/${type}/${id}/videos`, '&language=en-US');
    trailer = dataEn && dataEn.results ? dataEn.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') : null;
  }

  return trailer ? trailer.key : null;
}

async function openDetails(item) {
  currentActiveItem = item;
  const title = item.title || item.name;
  const backdrop = item.backdrop_path ? `${BACKDROP_URL}${item.backdrop_path}` : '';
  const poster = item.poster_path ? `${IMG_URL}${item.poster_path}` : 'https://via.placeholder.com/500x750/18181c/ffffff?text=No+Image';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
  const date = (item.release_date || item.first_air_date || '').split('-')[0];

  const backdropDiv = document.getElementById('modalBackdrop');
  if (backdropDiv) {
    backdropDiv.innerHTML = '<div class="details-hero-overlay"></div>';
    backdropDiv.style.backgroundImage = `url('${backdrop}')`;
  }

  document.getElementById('modalPoster').src = poster;
  document.getElementById('modalTitle').innerText = title;
  document.getElementById('modalMeta').innerText = `★ ${rating} | ${date} | ${item.media_type === 'tv' || currentType === 'tv' ? 'مسلسل' : 'فيلم'}`;
  document.getElementById('modalOverview').innerText = item.overview || 'لا يوجد وصف متوفر لهذا العمل.';

  const watchlistBtn = document.getElementById('modalWatchlistBtn');
  const isSaved = isItemInWatchlist(item.id);
  if (watchlistBtn) {
    watchlistBtn.innerText = isSaved ? '✓ مسح من المفضلة' : '+ إضافة للمفضلة';
    watchlistBtn.onclick = () => {
      toggleWatchlist(item);
      watchlistBtn.innerText = isItemInWatchlist(item.id) ? '✓ مسح من المفضلة' : '+ إضافة للمفضلة';
    };
  }

  document.getElementById('modalPlayBtn').onclick = () => {
    closeModal('detailsModal');
    openPlayer(item.media_type || currentType, item.id);
  };

  document.getElementById('detailsModal').style.display = 'flex';

  const trailerKey = await getTrailerKey(item.media_type || currentType, item.id);
  if (trailerKey && backdropDiv) {
    backdropDiv.style.backgroundImage = 'none';
    backdropDiv.innerHTML = `
      <iframe src="https://www.youtube-nocookie.com/embed/${trailerKey}?${ytParams}${trailerKey}" allow="autoplay; encrypted-media"></iframe>
      <div class="details-hero-overlay"></div>
    `;
  }
}

// نظام المفضلة (Watchlist)
function getWatchlist() {
  try {
    return JSON.parse(localStorage.getItem('cinestream_watchlist')) || [];
  } catch {
    return [];
  }
}

function isItemInWatchlist(id) {
  return getWatchlist().some(i => i.id === id);
}

function toggleWatchlist(item) {
  let list = getWatchlist();
  const index = list.findIndex(i => i.id === item.id);
  if (index > -1) {
    list.splice(index, 1);
  } else {
    list.push(item);
  }
  localStorage.setItem('cinestream_watchlist', JSON.stringify(list));
}

function showWatchlist() {
  document.getElementById('heroBanner').classList.add('hidden');
  document.getElementById('genresSection').style.display = 'none';
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btnWatchlist')?.classList.add('active');
  document.getElementById('sectionTitle').innerText = 'قائمتي المفضلة';
  
  currentMode = 'watchlist';
  loadContent(false);
}

function renderWatchlistGrid() {
  const items = getWatchlist();
  renderGrid(items, false);
}

// مشغل الفيديو الذكي مع معالجة السيرفرات التلقائية
// قائمة السيرفرات مع جعل سيرفر VCR الخاص بك هو الأساسي والأول (Index 0)
let activeServerIndex = 0;
const serversList = [
  // 1. سيرفر VCR الأساسي (الذي قمت بطلبه مع دعم الأفلام والمسلسلات تلقائياً)
  (type, id, s, e) => type === 'movie' 
    ? `https://streamsrcs.2embed.cc/vcr?tmdb=${id}` 
    : `https://streamsrcs.2embed.cc/vcr?tmdb=${id}&season=${s}&episode=${e}`,
  
  // 2. سيرفر احتياطي أول (vidsrc)
  (type, id, s, e) => type === 'movie' 
    ? `https://vidsrc.xyz/embed/movie?tmdb=${id}` 
    : `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
  
  // 3. سيرفر احتياطي ثاني (2embed)
  (type, id, s, e) => type === 'movie' 
    ? `https://www.2embed.cc/embed/${id}` 
    : `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`
];
async function openPlayer(type, id, season = 1, episode = 1) {
  const modal = document.getElementById('videoModal');
  const wrapper = document.getElementById('playerWrapper');
  
  if (!modal || !wrapper) return;
  modal.style.display = 'flex';
  
  renderPlayerContainer(type, id, season, episode);
}

function renderPlayerContainer(type, id, season, episode, serverIdx = 0) {
  const wrapper = document.getElementById('playerWrapper');
  activeServerIndex = serverIdx;

  wrapper.innerHTML = `
    <div class="player-top-bar">
      <div class="server-switcher">
        <span style="font-size: 12px; color: var(--text-muted);">السيرفر النشط:</span>
        <button class="server-btn ${serverIdx === 0 ? 'active' : ''}" onclick="switchServer('${type}', ${id}, ${season}, ${episode}, 0)">السيرفر 1</button>
        <button class="server-btn ${serverIdx === 1 ? 'active' : ''}" onclick="switchServer('${type}', ${id}, ${season}, ${episode}, 1)">السيرفر 2 (احتياطي)</button>
        <button class="server-btn ${serverIdx === 2 ? 'active' : ''}" onclick="switchServer('${type}', ${id}, ${season}, ${episode}, 2)">السيرفر 3 (احتياطي)</button>
      </div>
    </div>
  `;

  if (type === 'tv') {
    fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=ar-SA`)
      .then(res => res.json())
      .then(tvData => {
        const seasons = tvData.seasons ? tvData.seasons.filter(s => s.season_number > 0) : [];
        return fetch(`${BASE_URL}/tv/${id}/season/${season}?api_key=${API_KEY}&language=ar-SA`)
          .then(res => res.json())
          .then(seasonData => {
            const totalEpisodes = seasonData.episodes ? seasonData.episodes.length : 1;
            
            const controlsBar = document.createElement('div');
            controlsBar.className = 'episode-selector-container';
            controlsBar.innerHTML = `
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <label style="font-size: 10px; color: #aaa;">الموسم:</label>
                <select id="seasonSelect" class="custom-select">
                  ${seasons.map(s => `<option value="${s.season_number}" ${s.season_number === season ? 'selected' : ''}>الموسم ${s.season_number}</option>`).join('')}
                </select>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <label style="font-size: 10px; color: #aaa;">الحلقة:</label>
                <select id="episodeSelect" class="custom-select">
                  ${Array.from({ length: totalEpisodes }, (_, i) => i + 1).map(ep => `<option value="${ep}" ${ep === episode ? 'selected' : ''}>الحلقة ${ep}</option>`).join('')}
                </select>
              </div>
            `;
            wrapper.appendChild(controlsBar);

            document.getElementById('seasonSelect').onchange = (e) => openPlayer('tv', id, parseInt(e.target.value), 1);
            document.getElementById('episodeSelect').onchange = (e) => openPlayer('tv', id, season, parseInt(e.target.value));

            appendIframe(type, id, season, episode, wrapper, serverIdx);
          });
      }).catch(() => {
        appendIframe(type, id, season, episode, wrapper, serverIdx);
      });
  } else {
    appendIframe(type, id, season, episode, wrapper, serverIdx);
  }
}

function appendIframe(type, id, season, episode, wrapper, serverIdx) {
  const iframeUrl = serversList[serverIdx](type, id, season, episode);
  const iframe = document.createElement('iframe');
  iframe.src = iframeUrl;
  iframe.width = "100%";
  iframe.height = "100%";
  iframe.frameBorder = "0";
  iframe.allowFullscreen = true;
  iframe.allow = "autoplay; encrypted-media; fullscreen";
  iframe.style.cssText = "width: 100%; flex-grow: 1; border: none; background: #000;";
  
  wrapper.appendChild(iframe);
}

function switchServer(type, id, season, episode, idx) {
  renderPlayerContainer(type, id, season, episode, idx);
}

function closePlayer() {
  document.getElementById('videoModal').style.display = 'none';
  document.getElementById('playerWrapper').innerHTML = '';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePlayer();
    closeModal('detailsModal');
  }
});

window.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  if (scrollTop + clientHeight >= scrollHeight - 300) {
    if (!isLoading && hasMorePages) {
      currentPage++;
      loadContent(true);
    }
  }
});

let searchTimeout;
function handleSearch() {
  clearTimeout(searchTimeout);
  const searchInput = document.getElementById('searchInput');
  const hero = document.getElementById('heroBanner');
  const genresSec = document.getElementById('genresSection');
  const sectionTitle = document.getElementById('sectionTitle');

  if (!searchInput) return;
  const query = searchInput.value.trim();

  if (!query) {
    currentMode = 'popular';
    currentPage = 1;
    hasMorePages = true;
    if (hero) hero.classList.remove('hidden');
    if (genresSec) genresSec.style.display = 'none';
    if (sectionTitle) sectionTitle.innerText = currentType === 'movie' ? 'أحدث الأفلام الشائعة' : 'أحدث المسلسلات الشائعة';
    loadContent(false);
    return;
  }

  if (hero) hero.classList.add('hidden');
  if (genresSec) genresSec.style.display = 'none';

  searchTimeout = setTimeout(() => {
    currentMode = 'search';
    searchQuery = query;
    currentPage = 1;
    hasMorePages = true;
    if (sectionTitle) sectionTitle.innerText = `نتائج البحث عن: ${query}`;
    loadContent(false);
  }, 400);
}

function showGenresView() {
  const hero = document.getElementById('heroBanner');
  const genresSec = document.getElementById('genresSection');
  const btnGenres = document.getElementById('btnGenres');
  const grid = document.getElementById('genresGrid');

  if (hero) hero.classList.add('hidden');
  if (genresSec) genresSec.style.display = 'block';

  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  if (btnGenres) btnGenres.classList.add('active');

  if (grid) {
    grid.innerHTML = '';
    genresList.forEach((genre, idx) => {
      const card = document.createElement('div');
      card.className = `genre-card ${idx === 0 ? 'active' : ''}`;
      card.innerText = genre.name;
      card.onclick = () => {
        document.querySelectorAll('.genre-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectGenre(genre.id, genre.name);
      };
      grid.appendChild(card);
    });
  }

  if (genresList.length > 0) {
    selectGenre(genresList[0].id, genresList[0].name);
  }
}

function selectGenre(genreId, genreName) {
  activeGenreId = genreId;
  currentMode = 'genre';
  currentPage = 1;
  hasMorePages = true;
  const sectionTitle = document.getElementById('sectionTitle');
  if (sectionTitle) sectionTitle.innerText = `تصنيف: ${genreName}`;
  loadContent(false);
}

function applyFilters() {
  if (currentMode === 'genre') {
    currentPage = 1;
    hasMorePages = true;
    loadContent(false);
  }
}

function switchMainTab(type) {
  currentType = type;
  currentMode = 'popular';
  currentPage = 1;
  hasMorePages = true;

  const searchInput = document.getElementById('searchInput');
  const hero = document.getElementById('heroBanner');
  const genresSec = document.getElementById('genresSection');
  const btnMovies = document.getElementById('btnMovies');
  const btnTV = document.getElementById('btnTV');
  const sectionTitle = document.getElementById('sectionTitle');

  if (searchInput) searchInput.value = '';
  if (hero) hero.classList.remove('hidden');
  if (genresSec) genresSec.style.display = 'none';

  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  if (type === 'movie' && btnMovies) btnMovies.classList.add('active');
  if (type === 'tv' && btnTV) btnTV.classList.add('active');

  if (sectionTitle) sectionTitle.innerText = type === 'movie' ? 'أحدث الأفلام الشائعة' : 'أحدث المسلسلات الشائعة';
  loadContent(false);
}

function resetToHome() {
  switchMainTab('movie');
}

loadContent(false);