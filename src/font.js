// font_sync.js

const fontMap = {
  'sans-serif': 'sans-serif',
  'audiowide': "'Audiowide', sans-serif",
  'cursive': "'Cursive', sans-serif"
};

function applyFontLocally(fontKey) {
  const fontValue = fontMap[fontKey] || fontMap['sans-serif'];
  

  localStorage.setItem('preferred-font', fontKey);
  

  document.documentElement.style.setProperty('--user-font', fontValue);
}

const savedFont = localStorage.getItem('preferred-font') || 'sans-serif';
applyFontLocally(savedFont);

document.addEventListener('DOMContentLoaded', () => {
  fetch('/api/user')
    .then(res => (res.ok ? res.json() : null))
    .then(user => {
      if (user && user.preferred_font) {
        applyFontLocally(user.preferred_font);
      }
    })
    .catch(() => {});
});