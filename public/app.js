(function () {
  'use strict';

  // DOM elements
  var quoteText = document.getElementById('quote-text');
  var quoteCharacter = document.getElementById('quote-character');
  var quoteTags = document.getElementById('quote-tags');
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
  var currentQuote = null;

  // =====================
  // Dark Mode (Feature 10)
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

  // Initialize theme
  var storedTheme = getStoredTheme();
  if (storedTheme) {
    setTheme(storedTheme);
  } else {
    themeIcon.textContent = window.matchMedia('(prefers-color-scheme: dark)').matches ? '\u2600' : '\u263D';
  }

  themeToggle.addEventListener('click', toggleTheme);

  // =====================
  // Favorites (Feature 3)
  // =====================

  function getFavorites() {
    try {
      var data = localStorage.getItem('favorites');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavorites(favs) {
    try { localStorage.setItem('favorites', JSON.stringify(favs)); } catch (e) { /* noop */ }
  }

  function isFavorited(id) {
    return getFavorites().some(function (f) { return f.id === id; });
  }

  function updateFavButton() {
    if (!currentQuote) return;
    if (isFavorited(currentQuote.id)) {
      favBtn.innerHTML = '&#9829;';
      favBtn.classList.add('active');
    } else {
      favBtn.innerHTML = '&#9825;';
      favBtn.classList.remove('active');
    }
  }

  function toggleFavorite() {
    if (!currentQuote) return;
    var favs = getFavorites();
    var idx = favs.findIndex(function (f) { return f.id === currentQuote.id; });
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      favs.push({
        id: currentQuote.id,
        quote: currentQuote.quote,
        character: currentQuote.character
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

      var textDiv = document.createElement('div');
      textDiv.className = 'fav-item-text';
      textDiv.textContent = '"' + fav.quote + '"';
      var charSpan = document.createElement('div');
      charSpan.className = 'fav-item-char';
      charSpan.textContent = '\u2014 ' + fav.character;
      textDiv.appendChild(charSpan);

      var removeBtn = document.createElement('button');
      removeBtn.className = 'fav-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.title = 'Remove from favorites';
      removeBtn.addEventListener('click', function () {
        var updated = getFavorites().filter(function (f) { return f.id !== fav.id; });
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
  // Quote display
  // =====================

  function displayQuote(data) {
    currentQuote = data;
    quoteText.textContent = data.quote;
    quoteCharacter.textContent = '\u2014 ' + data.character;

    quoteTags.innerHTML = '';
    if (data.tags && data.tags.length) {
      data.tags.forEach(function (tag) {
        var span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        quoteTags.appendChild(span);
      });
    }

    updateFavButton();
  }

  function fetchQuote(url) {
    randomBtn.disabled = true;
    dailyBtn.disabled = true;

    fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error('Failed to fetch quote');
        return response.json();
      })
      .then(function (data) {
        displayQuote(data);
      })
      .catch(function () {
        quoteText.textContent = 'Failed to load quote. Please try again.';
        quoteCharacter.textContent = '';
        quoteTags.innerHTML = '';
      })
      .finally(function () {
        randomBtn.disabled = false;
        dailyBtn.disabled = false;
      });
  }

  function fetchRandomQuote() {
    fetchQuote('/api/quotes/random');
  }

  function fetchDailyQuote() {
    fetchQuote('/api/quotes/daily');
  }

  randomBtn.addEventListener('click', fetchRandomQuote);
  dailyBtn.addEventListener('click', fetchDailyQuote);

  // =====================
  // Share (Feature 4)
  // =====================

  shareBtn.addEventListener('click', function () {
    if (!currentQuote) return;
    var url = window.location.origin + '/quote/' + currentQuote.id;
    if (navigator.share) {
      navigator.share({
        title: 'Calvin & Hobbes Quote',
        text: '"' + currentQuote.quote + '" \u2014 ' + currentQuote.character,
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
  // Search (Feature 2)
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
          item.addEventListener('click', function () {
            displayQuote(quote);
            searchResults.hidden = true;
            searchInput.value = '';
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });

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
  // Keyboard Shortcuts (Feature 11)
  // =====================

  document.addEventListener('keydown', function (e) {
    // Ignore if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (e.key === 'Escape') {
        e.target.blur();
      }
      return;
    }

    switch (e.key) {
      case ' ':
        e.preventDefault();
        fetchRandomQuote();
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
  fetchRandomQuote();
})();
