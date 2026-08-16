document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const arrow = document.getElementById('arrow');
  const mainContent = document.getElementById('main-content');
  const showRemainingTrial = document.getElementById('show_remaining_trial');
  const trialTextContainer = document.getElementById('trial-text-container');
  
  // Logo elements
  const logoWithText = document.getElementById('full_logo');
  const logoIcon = document.getElementById('icon_only');

  if (!sidebar) return;

  const lgMediaQuery = window.matchMedia('(max-width: 1023px)');
  const mdMediaQuery = window.matchMedia('(max-width: 767px)');

  // Updates layout based on screen width
  function syncLayout() {
    const isCollapsed = sidebar.classList.contains('is-collapsed');

    // Toggle Logos based on sidebar state
    if (isCollapsed) {
      if (logoWithText) logoWithText.classList.add('hidden');
      if (logoIcon) logoIcon.classList.remove('hidden');
    } else {
      if (logoWithText) logoWithText.classList.remove('hidden');
      if (logoIcon) logoIcon.classList.add('hidden');
    }

    if (mdMediaQuery.matches && !isCollapsed) {
      // Mobile screen & expanded: Expand sidebar to full width & hide main content
      sidebar.classList.add('w-full');
      if (mainContent) mainContent.classList.add('hidden');
    } else {
      // Tablet & Desktop screen or collapsed: Keep normal layout
      sidebar.classList.remove('w-full');
      if (mainContent) mainContent.classList.remove('hidden');
    }

    // Handle trial card vs standalone green button when sidebar is collapsed
    if (showRemainingTrial) {
      if (isCollapsed) {
        // Hide text and remove outer container box (glow, background, border, padding)
        if (trialTextContainer) trialTextContainer.classList.add('hidden');
        showRemainingTrial.classList.remove('glow-purple', 'dark:bg-[#0f172a]', 'bg-[#efeae6]', 'border', 'dark:border-gray-800', 'border-gray-200', 'p-6', 'rounded-2xl', 'mb-2');
      } else {
        // Show text and restore outer container box styling
        if (trialTextContainer) trialTextContainer.classList.remove('hidden');
        showRemainingTrial.classList.add('glow-purple', 'dark:bg-[#0f172a]', 'bg-[#efeae6]', 'border', 'dark:border-gray-800', 'border-gray-200', 'p-6', 'rounded-2xl', 'mb-2');
      }
    }
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