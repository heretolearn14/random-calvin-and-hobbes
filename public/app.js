(function () {
  'use strict';

  // DOM elements
  var stripImg = document.getElementById('strip-img');
  var stripDate = document.getElementById('strip-date');
  var stripLoading = document.getElementById('strip-loading');
  var stripError = document.getElementById('strip-error');
  var randomBtn = document.getElementById('random-btn');
  var dailyBtn = document.getElementById('daily-btn');
  var favBtn = document.getElementById('fav-btn');
  var shareBtn = document.getElementById('share-btn');
  var favoritesSection = document.getElementById('favorites-section');
  var favoritesList = document.getElementById('favorites-list');
  var showFavBtn = document.getElementById('show-fav-btn');
  var themeToggle = document.getElementById('theme-toggle');
  var themeIcon = document.getElementById('theme-icon');

  // State
  var currentStrip = null;

  // =====================
  // Dark Mode
  // =====================

  function getStoredTheme() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeIcon.textContent = theme === 'dark' ? '\u2600' : '\u263D';
    try { localStorage.setItem('theme', theme); } catch (e) { /* noop */ }
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var isDark = current === 'dark' ||
      (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setTheme(isDark ? 'light' : 'dark');
  }

  var storedTheme = getStoredTheme();
  if (storedTheme) {
    setTheme(storedTheme);
  } else {
    themeIcon.textContent = window.matchMedia('(prefers-color-scheme: dark)').matches ? '\u2600' : '\u263D';
  }

  themeToggle.addEventListener('click', toggleTheme);

  // =====================
  // Favorites
  // =====================

  function getFavorites() {
    try {
      var data = localStorage.getItem('fav_strips');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavorites(favs) {
    try { localStorage.setItem('fav_strips', JSON.stringify(favs)); } catch (e) { /* noop */ }
  }

  function isFavorited(date) {
    return getFavorites().some(function (f) { return f.date === date; });
  }

  function updateFavButton() {
    if (!currentStrip) return;
    if (isFavorited(currentStrip.date)) {
      favBtn.innerHTML = '&#9829;';
      favBtn.classList.add('active');
    } else {
      favBtn.innerHTML = '&#9825;';
      favBtn.classList.remove('active');
    }
  }

  function toggleFavorite() {
    if (!currentStrip) return;
    var favs = getFavorites();
    var idx = favs.findIndex(function (f) { return f.date === currentStrip.date; });
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      favs.push({
        date: currentStrip.date,
        dateDisplay: currentStrip.dateDisplay,
        imageUrl: currentStrip.imageUrl,
        goComicsUrl: currentStrip.goComicsUrl
      });
    }
    saveFavorites(favs);
    updateFavButton();
    renderFavorites();
  }

  function renderFavorites() {
    var favs = getFavorites();
    if (favs.length === 0) {
      favoritesSection.hidden = true;
      return;
    }

    favoritesSection.hidden = false;
    favoritesList.innerHTML = '';

    favs.forEach(function (fav) {
      var item = document.createElement('div');
      item.className = 'fav-item';
      item.style.cursor = 'pointer';

      var textDiv = document.createElement('div');
      textDiv.className = 'fav-item-text';
      textDiv.style.fontStyle = 'normal';
      textDiv.textContent = fav.dateDisplay;
      textDiv.addEventListener('click', function () {
        displayStrip(fav);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      var removeBtn = document.createElement('button');
      removeBtn.className = 'fav-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.title = 'Remove from favorites';
      removeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var updated = getFavorites().filter(function (f) { return f.date !== fav.date; });
        saveFavorites(updated);
        renderFavorites();
        updateFavButton();
      });

      item.appendChild(textDiv);
      item.appendChild(removeBtn);
      favoritesList.appendChild(item);
    });
  }

  favBtn.addEventListener('click', toggleFavorite);

  var favsVisible = false;
  showFavBtn.addEventListener('click', function () {
    favsVisible = !favsVisible;
    favoritesList.hidden = !favsVisible;
    showFavBtn.textContent = favsVisible ? 'Hide Favorites' : 'Show Favorites';
  });

  // =====================
  // Strip display
  // =====================

  function displayStrip(data) {
    currentStrip = data;
    stripLoading.hidden = true;
    stripError.hidden = true;
    stripImg.hidden = false;
    stripImg.src = data.imageUrl;
    stripImg.alt = 'Calvin and Hobbes - ' + data.dateDisplay;
    stripDate.innerHTML = '<a href="' + data.goComicsUrl + '" target="_blank" rel="noopener">' +
      data.dateDisplay + '</a>';
    updateFavButton();
  }

  function fetchStrip(url, retries) {
    if (retries === undefined) retries = 3;
    randomBtn.disabled = true;
    dailyBtn.disabled = true;
    stripLoading.hidden = false;
    stripImg.hidden = true;
    stripError.hidden = true;
    stripDate.textContent = '';

    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, 10000);

    fetch(url, { signal: controller.signal })
      .then(function (response) {
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('Failed to fetch strip');
        return response.json();
      })
      .then(function (data) {
        displayStrip(data);
        randomBtn.disabled = false;
        dailyBtn.disabled = false;
      })
      .catch(function () {
        clearTimeout(timeoutId);
        if (retries > 0) {
          setTimeout(function () { fetchStrip(url, retries - 1); }, 2000);
          return;
        }
        stripLoading.hidden = true;
        stripError.hidden = false;
        stripError.textContent = 'Failed to load comic strip. Please try again.';
        randomBtn.disabled = false;
        dailyBtn.disabled = false;
      });
  }

  function fetchRandomStrip() {
    fetchStrip('/api/strips/random');
  }

  function fetchDailyStrip() {
    fetchStrip('/api/strips/daily');
  }

  randomBtn.addEventListener('click', fetchRandomStrip);
  dailyBtn.addEventListener('click', fetchDailyStrip);

  // =====================
  // Share
  // =====================

  shareBtn.addEventListener('click', function () {
    if (!currentStrip) return;
    var url = currentStrip.goComicsUrl;
    if (navigator.share) {
      navigator.share({
        title: 'Calvin & Hobbes - ' + currentStrip.dateDisplay,
        url: url
      }).catch(function () { /* user cancelled */ });
    } else {
      navigator.clipboard.writeText(url).then(function () {
        var orig = shareBtn.innerHTML;
        shareBtn.textContent = '\u2713';
        setTimeout(function () { shareBtn.innerHTML = orig; }, 1500);
      });
    }
  });

  // =====================
  // Keyboard Shortcuts
  // =====================

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    switch (e.key) {
      case ' ':
        e.preventDefault();
        fetchRandomStrip();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFavorite();
        break;
      case 's':
      case 'S':
        e.preventDefault();
        shareBtn.click();
        break;
      case 'd':
      case 'D':
        e.preventDefault();
        toggleTheme();
        break;
    }
  });

  // =====================
  // Init
  // =====================

  renderFavorites();
  fetchRandomStrip();
})();
