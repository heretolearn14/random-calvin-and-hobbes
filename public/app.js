(function () {
  'use strict';

  var quoteText = document.getElementById('quote-text');
  var quoteCharacter = document.getElementById('quote-character');
  var randomBtn = document.getElementById('random-btn');

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function fetchRandomQuote() {
    randomBtn.disabled = true;

    fetch('/api/quotes/random')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to fetch quote');
        }
        return response.json();
      })
      .then(function (data) {
        quoteText.textContent = data.quote;
        quoteCharacter.textContent = '— ' + data.character;
      })
      .catch(function () {
        quoteText.textContent = 'Failed to load quote. Please try again.';
        quoteCharacter.textContent = '';
      })
      .finally(function () {
        randomBtn.disabled = false;
      });
  }

  randomBtn.addEventListener('click', fetchRandomQuote);

  // Load an initial quote
  fetchRandomQuote();
})();
