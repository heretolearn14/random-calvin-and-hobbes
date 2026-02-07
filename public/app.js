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
  var searchInput = document.getElementById('search-input');
  var searchBtn = document.getElementById('search-btn');
  var searchResults = document.getElementById('search-results');
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

  function fetchStrip(url) {
    randomBtn.disabled = true;
    dailyBtn.disabled = true;
    stripLoading.hidden = false;
    stripImg.hidden = true;
    stripError.hidden = true;
    stripDate.textContent = '';

    fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error('Failed to fetch strip');
        return response.json();
      })
      .then(function (data) {
        displayStrip(data);
      })
      .catch(function () {
        stripLoading.hidden = true;
        stripError.hidden = false;
        stripError.textContent = 'Failed to load comic strip. Please try again.';
      })
      .finally(function () {
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
  // Search (quotes)
  // =====================

  function performSearch() {
    var q = searchInput.value.trim();
    if (!q) {
      searchResults.hidden = true;
      return;
    }

    fetch('/api/quotes/search?q=' + encodeURIComponent(q))
      .then(function (response) {
        if (!response.ok) throw new Error('Search failed');
        return response.json();
      })
      .then(function (data) {
        searchResults.hidden = false;
        searchResults.innerHTML = '';

        var heading = document.createElement('h3');
        heading.textContent = data.count + ' result' + (data.count !== 1 ? 's' : '') + ' for "' + q + '"';
        searchResults.appendChild(heading);

        if (data.count === 0) return;

        data.quotes.forEach(function (quote) {
          var item = document.createElement('div');
          item.className = 'search-result-item';

          var qDiv = document.createElement('div');
          qDiv.className = 'result-quote';
          qDiv.textContent = '"' + quote.quote + '"';
          item.appendChild(qDiv);

          var cDiv = document.createElement('div');
          cDiv.className = 'result-character';
          cDiv.textContent = '\u2014 ' + quote.character;
          item.appendChild(cDiv);

          searchResults.appendChild(item);
        });
      })
      .catch(function () {
        searchResults.hidden = false;
        searchResults.innerHTML = '<h3>Search failed. Please try again.</h3>';
      });
  }

  searchBtn.addEventListener('click', performSearch);
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  });

  // =====================
  // Keyboard Shortcuts
  // =====================

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (e.key === 'Escape') {
        e.target.blur();
      }
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
      case '/':
        e.preventDefault();
        searchInput.focus();
        break;
    }
  });

  // =====================
  // Init
  // =====================

  renderFavorites();
  fetchRandomStrip();
})();
