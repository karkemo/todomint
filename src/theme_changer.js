document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
  const darkIcons = document.querySelectorAll('.theme-toggle-dark-icon');
  const lightIcons = document.querySelectorAll('.theme-toggle-light-icon');

  if (!themeToggleBtns.length || !darkIcons.length || !lightIcons.length) {
    console.error("Theme toggle elements not found!");
    return;
  }

  function syncIcons() {
    const isDark = document.documentElement.classList.contains('dark');
    darkIcons.forEach((icon) => icon.classList.toggle('hidden', isDark));
    lightIcons.forEach((icon) => icon.classList.toggle('hidden', !isDark));
  }

  syncIcons();

  function handleToggle() {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('color-theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('color-theme', 'dark');
    }

    syncIcons();

    if (typeof window.refreshTimelineTheme === 'function') {
      window.refreshTimelineTheme();
    }
  }

  themeToggleBtns.forEach((btn) => btn.addEventListener('click', handleToggle));
});