document.addEventListener('DOMContentLoaded', () => {
  const icon_only = document.getElementById('icon_only'); 
  const full_logo = document.getElementById('full_logo'); 
  const themeToggleBtn = document.getElementById('theme-toggle');

  function updateLogos() {
    const isDark = document.documentElement.classList.contains('dark') || 
                   localStorage.getItem('color-theme') === 'dark';

    if (icon_only) {
      icon_only.src = isDark 
        ? '/assets/logo_icon_dark_theme.png' 
        : '/assets/logo_icon.png';
    }

    if (full_logo) {
      full_logo.src = isDark 
        ? '/assets/logo_icon_with_text_beside_dark_theme.png' 
        : '/assets/logo_icon_with_text_beside.png';
    }
  }

  updateLogos();

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      setTimeout(updateLogos, 0);
    });
  }
});