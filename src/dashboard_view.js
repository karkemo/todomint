// document.addEventListener('DOMContentLoaded', () => {
//   const sidebar = document.getElementById('sidebar');
//   const arrow = document.getElementById('arrow');
//   const mainContent = document.getElementById('main-content');
//   if (!sidebar) return;

//   const lgMediaQuery = window.matchMedia('(max-width: 1023px)');
//   const mdMediaQuery = window.matchMedia('(max-width: 767px)');

//   // Updates layout based on screen width without forcing mainContent to hide on tablet sizes
//   function syncLayout() {
//     const isSidebarVisible = !sidebar.classList.contains('hidden');

//     if (mdMediaQuery.matches && isSidebarVisible) {
//       // Mobile screen: Expand sidebar to full width & hide main content
//       sidebar.classList.add('w-full');
//       if (mainContent) mainContent.classList.add('hidden');
//     } else {
//       // Tablet & Desktop screen: Keep normal layout
//       sidebar.classList.remove('w-full');
//       if (mainContent) mainContent.classList.remove('hidden');
//     }
//   }

//   // Update arrow image icon state
//   function updateArrowIcon() {
//     if (!arrow) return;
//     const isHidden = sidebar.classList.contains('hidden');
//     arrow.src = isHidden ? '/assets/right-arrow.svg' : '/assets/down-arrow.svg';
//   }

//   function handleScreenChange() {
//     if (lgMediaQuery.matches) {
//       sidebar.classList.add('hidden');
//     } else {
//       sidebar.classList.remove('hidden');
//     }
//     updateArrowIcon();
//     syncLayout();
//   }

//   // Initial check & resize listeners
//   handleScreenChange();
//   lgMediaQuery.addEventListener('change', handleScreenChange);
//   mdMediaQuery.addEventListener('change', syncLayout);

//   // Arrow click handler
//   if (arrow) {
//     arrow.addEventListener('click', () => {
//       sidebar.classList.toggle('hidden');
//       updateArrowIcon();
//       syncLayout();
//     });
//   }
// });

document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const arrow = document.getElementById('arrow');
  const mainContent = document.getElementById('main-content');
  if (!sidebar) return;

  const lgMediaQuery = window.matchMedia('(max-width: 1023px)');
  const mdMediaQuery = window.matchMedia('(max-width: 767px)');

  // Updates layout based on screen width
  function syncLayout() {
    const isCollapsed = sidebar.classList.contains('is-collapsed');

    if (mdMediaQuery.matches && !isCollapsed) {
      // Mobile screen & expanded: Expand sidebar to full width & hide main content
      sidebar.classList.add('w-full');
      if (mainContent) mainContent.classList.add('hidden');
    } else {
      // Tablet & Desktop screen or collapsed: Keep normal layout
      sidebar.classList.remove('w-full');
      if (mainContent) mainContent.classList.remove('hidden');
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