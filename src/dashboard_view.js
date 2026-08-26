document.addEventListener('DOMContentLoaded', () => {
  // bars
  const sidebar = document.getElementById('sidebar');
  const bottomBar = document.getElementById('bottom-bar');

  const arrow = document.getElementById('arrow');
  const mainContent = document.getElementById('main-content');
  const showRemainingTrial = document.getElementById('show_remaining_trial');
  const trialTextContainer = document.getElementById('trial-text-container');
  const text = document.getElementById('buymeacoffee');
  
  // Logo elements
  const logoWithText = document.getElementById('full_logo');
  const logoIcon = document.getElementById('icon_only');

  if (!sidebar) return;

  const lgMediaQuery = window.matchMedia('(max-width: 1023px)');
  // Must match the layout wrapper's own "sm:flex-row" breakpoint (640px).
  // Below this, the wrapper is flex-col (stacked); at/above it, flex-row
  // (side-by-side). The bottom bar can only be shown safely while the
  // wrapper is still in column mode, or it ends up squeezed into the
  // same row as #main-content.
  const mdMediaQuery = window.matchMedia('(max-width: 639px)');

  // Updates layout based on screen width
  function syncLayout() {
    const isCollapsed = sidebar.classList.contains('is-collapsed');

    if (mdMediaQuery.matches) {
      // Mobile: hide sidebar, show bottom bar
      // (inline style used because sidebar's static 'flex' class can otherwise
      // beat the toggled 'hidden' class depending on Tailwind's compiled order)
      sidebar.style.display = 'none';
      bottomBar.style.display = 'flex';
    } else {
      // Tablet & Desktop: show sidebar, hide bottom bar
      sidebar.style.display = 'flex';
      bottomBar.style.display = 'none';
    }

    // Toggle Logos based on sidebar state
    if (isCollapsed) {
      if (logoWithText) logoWithText.classList.add('hidden');
      if (logoIcon) logoIcon.classList.remove('hidden');
      if (text) text.classList.add('hidden');
    } else {
      if (logoWithText) logoWithText.classList.remove('hidden');
      if (logoIcon) logoIcon.classList.add('hidden');
      if (text) text.classList.remove('hidden');
    }

    if (mainContent) mainContent.classList.remove('hidden');
    sidebar.classList.remove('w-full');
  }

  function handleScreenChange() {
    if (lgMediaQuery.matches) {
      sidebar.classList.add('is-collapsed');
    } else {
      sidebar.classList.remove('is-collapsed');
    }
    syncLayout();
  }

  // Initial check & resize listeners
  handleScreenChange();
  lgMediaQuery.addEventListener('change', handleScreenChange);
  mdMediaQuery.addEventListener('change', syncLayout);

  // Toggle Collapse on Arrow click
  if (arrow) {
    arrow.addEventListener('click', () => {
      sidebar.classList.toggle('is-collapsed');
      syncLayout();
    });
  }
});