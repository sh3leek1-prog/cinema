// ==========================================
// 1. الإعدادات والتهيئات الأوليّة
// ==========================================
const API_KEY = '5be3c0bbb4207895856dcb562e5d11ec'; // مفتاح TMDB الخاص بك
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

const ytParams = "autoplay=1&mute=1&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&enablejsapi=1&loop=1&playlist=";

// ==========================================
// 2. التواصل مع TMDB API
// ==========================================

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
  }

  const data = await fetchData(endpoint, params);
  if (loader) loader.classList.remove('active');
  isLoading = false;

  if (!data || !data.results) {
    if (!isAppend) {
      const heroTitle = document.getElementById('heroTitle');
      if (heroTitle) heroTitle.innerText = "يرجى التأكد من إضافة مفتاح TMDB API_KEY الصحيح.";
    }
    return;
  }

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
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #aaa;">لم يتم العثور على أي نتائج.</p>';
    return;
  }

  items.forEach(item => {
    const title = item.title || item.name;
    const poster = item.poster_path ? `${IMG_URL}${item.poster_path}` : 'https://via.placeholder.com/500x750';
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    const date = (item.release_date || item.first_air_date || '').split('-')[0];

    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => openDetails(item);

    card.innerHTML = `
      <img src="${poster}" alt="${title}" loading="lazy">
      <div class="card-info">
        <div class="card-title">${title}</div>
        <div class="card-meta">
          <span>${date || 'N/A'}</span>
          <span class="rating">★ ${rating}</span>
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
  const title = item.title || item.name;
  const backdrop = item.backdrop_path ? `${BACKDROP_URL}${item.backdrop_path}` : '';
  const poster = item.poster_path ? `${IMG_URL}${item.poster_path}` : 'https://via.placeholder.com/500x750';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
  const date = (item.release_date || item.first_air_date || '').split('-')[0];

  const backdropDiv = document.getElementById('modalBackdrop');
  if (backdropDiv) {
    backdropDiv.innerHTML = '<div class="details-hero-overlay"></div>';
    backdropDiv.style.backgroundImage = `url('${backdrop}')`;
  }

  const modalPoster = document.getElementById('modalPoster');
  const modalTitle = document.getElementById('modalTitle');
  const modalMeta = document.getElementById('modalMeta');
  const modalOverview = document.getElementById('modalOverview');
  const modalPlayBtn = document.getElementById('modalPlayBtn');
  const detailsModal = document.getElementById('detailsModal');

  if (modalPoster) modalPoster.src = poster;
  if (modalTitle) modalTitle.innerText = title;
  if (modalMeta) modalMeta.innerText = `★ ${rating} | ${date}`;
  if (modalOverview) modalOverview.innerText = item.overview || 'لا يوجد وصف متوفر لهذا العمل.';

  if (modalPlayBtn) {
    modalPlayBtn.onclick = () => {
      closeModal('detailsModal');
      openPlayer(currentType, item.id);
    };
  }

  if (detailsModal) detailsModal.style.display = 'flex';

  const trailerKey = await getTrailerKey(currentType, item.id);
  if (trailerKey && detailsModal && detailsModal.style.display === 'flex' && backdropDiv) {
    backdropDiv.style.backgroundImage = 'none';
    backdropDiv.innerHTML = `
      <iframe src="https://www.youtube-nocookie.com/embed/${trailerKey}?${ytParams}${trailerKey}" 
              allow="autoplay; encrypted-media">
      </iframe>
      <div class="details-hero-overlay"></div>
    `;
  }
}

// ==========================================
// 3. نظام التشغيل التلقائي عبر 2embed (مع دعم المواسم والحلقات)
// ==========================================

async function openPlayer(type, id, season = 1, episode = 1) {
  const modal = document.getElementById('videoModal');
  const wrapper = document.getElementById('playerWrapper');
  
  if (!modal || !wrapper) return;

  modal.style.display = 'flex';
  
  // واجهة التحميل المبدئية
  wrapper.innerHTML = `
    <div class="player-loader" id="playerLoader">
      <div class="spinner"></div>
      <div>جاري جلب المشغل...</div>
    </div>
  `;

  if (type === 'movie') {
    // تشغيل الأفلام مباشرة عبر TMDB ID
    wrapper.innerHTML = `
      <iframe src="https://www.2embed.cc/embed/${id}" 
              width="100%" 
              height="100%" 
              frameborder="0" 
              allowfullscreen 
              allow="autoplay; encrypted-media"
              style="width: 100%; height: 100%; border: none;">
      </iframe>
    `;
  } else if (type === 'tv') {
    // للمسلسلات: جلب تفاصيل المواسم والحلقات تلقائياً عبر TMDB لإنشاء القوائم المنسدلة
    try {
      // 1. جلب معلومات المسلسل (للحصول على قائمة المواسم)
      const tvRes = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=ar-SA`);
      const tvData = await tvRes.json();
      const seasons = tvData.seasons ? tvData.seasons.filter(s => s.season_number > 0) : [];

      // 2. جلب معلومات الموسم الحالي (للحصول على عدد الحلقات بدقة)
      const seasonRes = await fetch(`${BASE_URL}/tv/${id}/season/${season}?api_key=${API_KEY}&language=ar-SA`);
      const seasonData = await seasonRes.json();
      const totalEpisodes = seasonData.episodes ? seasonData.episodes.length : 1;

      // 3. بناء واجهة القوائم المنسدلة ومشغل الـ iframe الخاص بـ 2embed للمسلسلات
      wrapper.innerHTML = `
        <div class="episode-selector-container" style="display: flex; gap: 15px; padding: 12px 20px; background: rgba(20,20,20,0.95); align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); z-index: 10;">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 11px; color: #aaa; font-weight: bold;">الموسم:</label>
            <select id="seasonSelect" class="custom-select" style="background: #1a1a1a; color: #fff; padding: 6px 14px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; outline: none;">
              ${seasons.map(s => `<option value="${s.season_number}" ${s.season_number === season ? 'selected' : ''}>الموسم ${s.season_number}</option>`).join('')}
            </select>
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 11px; color: #aaa; font-weight: bold;">الحلقة:</label>
            <select id="episodeSelect" class="custom-select" style="background: #1a1a1a; color: #fff; padding: 6px 14px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; outline: none;">
              ${Array.from({ length: totalEpisodes }, (_, i) => i + 1).map(ep => `<option value="${ep}" ${ep === episode ? 'selected' : ''}>الحلقة ${ep}</option>`).join('')}
            </select>
          </div>
        </div>

        <iframe src="https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}" 
                width="100%" 
                height="100%" 
                frameborder="0" 
                allowfullscreen 
                allow="autoplay; encrypted-media"
                style="width: 100%; flex-grow: 1; border: none;">
        </iframe>
      `;

      // 4. تفعيل الاستجابة الفورية عند تغيير القيم من القوائم المنسدلة
      const seasonSelect = document.getElementById('seasonSelect');
      const episodeSelect = document.getElementById('episodeSelect');

      if (seasonSelect) {
        seasonSelect.addEventListener('change', (e) => {
          openPlayer('tv', id, parseInt(e.target.value), 1);
        });
      }

      if (episodeSelect) {
        episodeSelect.addEventListener('change', (e) => {
          openPlayer('tv', id, season, parseInt(e.target.value));
        });
      }

    } catch (err) {
      console.error("خطأ في جلب بيانات المسلسل:", err);
      // تشغيل احتياطي مباشر في حال فشل الاتصال بـ API المواسم
      wrapper.innerHTML = `
        <iframe src="https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}" 
                width="100%" height="100%" frameborder="0" allowfullscreen allow="autoplay"
                style="width:100%; height:100%; border:none;">
        </iframe>
      `;
    }
  }
}

// إغلاق المشغل
function closePlayer() {
  const modal = document.getElementById('videoModal');
  const wrapper = document.getElementById('playerWrapper');
  if (modal) modal.style.display = 'none';
  if (wrapper) wrapper.innerHTML = '';
}

// ==========================================
// 4. الأحداث العامة والتنقل بين الصفحات
// ==========================================

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

function closeModal(id) {
  if (id === 'detailsModal') {
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) modalBackdrop.innerHTML = '<div class="details-hero-overlay"></div>';
  }
  const modalEl = document.getElementById(id);
  if (modalEl) modalEl.style.display = 'none';
}

// بدء التحميل التلقائي عند جاهزية الصفحة
loadContent(false);