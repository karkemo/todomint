// Global default configuration
const globalConfig = {
  duration: 3,
  closeButton: true,
  pauseOnHover: true,
  showIcon: true,
  progressBar: true,
  maxToasts: 5,
  position: null,
  darkMode: undefined,
  backgroundColor: null
};

/**
 * Configure global defaults for all flyToast calls.
 * @param {Object} options - Global configuration options.
 */
function setDefaults(options = {}) {
  Object.assign(globalConfig, options);
}

/**
 * Displays a customizable, accessible, zero-dependency toast notification.
 */
function flyToast(message, type = 'info', time, options = {}) {
  const mergedOptions = { ...globalConfig, ...options };
  const finalTime = (typeof time === 'number' && time > 0) ? time : mergedOptions.duration;
  const durationInMs = finalTime * 1000;

  const {
    closeButton,
    pauseOnHover,
    showIcon,
    progressBar,
    maxToasts,
    backgroundColor,
    position: customPosition,
    darkMode
  } = mergedOptions;

  const isMobile = window.innerWidth <= 640;
  const position = customPosition || (isMobile ? 'top-center' : 'bottom-right');

  const isDark = darkMode !== undefined
    ? darkMode
    : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const icons = {
    info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
  };

  const lightColors = {
    info: '#2563eb',
    success: '#10b981',
    error: '#dc2626',
    warning: '#f59e0b'
  };

  const darkColors = {
    info: '#1e3a8a',
    success: '#065f46',
    error: '#7f1d1d',
    warning: '#78350f'
  };

  const activeColors = isDark ? darkColors : lightColors;
  const bgColor = backgroundColor || activeColors[type] || activeColors.info;

  // 1. Container Logic
  let container = document.querySelector(`.fly-toast-container.${position}`);
  if (!container) {
    container = document.createElement('div');
    container.className = `fly-toast-container ${position}`;
    Object.assign(container.style, {
      position: 'fixed',
      zIndex: '99999',
      display: 'flex',
      flexDirection: position.includes('top') ? 'column' : 'column-reverse',
      gap: '10px',
      pointerEvents: 'none',
      maxWidth: isMobile ? 'calc(100vw - 32px)' : '400px',
      width: '100%'
    });

    if (position.includes('top')) container.style.top = isMobile ? '16px' : '24px';
    else container.style.bottom = isMobile ? '16px' : '24px';

    if (position.includes('center')) {
      container.style.left = '50%';
      container.style.transform = 'translateX(-50%)';
    } else if (position.includes('right')) {
      container.style.right = isMobile ? '16px' : '24px';
    } else if (position.includes('left')) {
      container.style.left = isMobile ? '16px' : '24px';
    }

    document.body.appendChild(container);
  }

  // 2. Safe Max-Toasts Cleanup
  while (container.children.length >= maxToasts) {
    const oldestToast = position.includes('top') ? container.firstElementChild : container.lastElementChild;
    if (oldestToast) {
      if (oldestToast._cleanup) oldestToast._cleanup();
      else oldestToast.remove();
    } else {
      break;
    }
  }

  // 3. Create Toast Element with Accessibility Attributes
  const toast = document.createElement('div');

  const isCritical = type === 'error' || type === 'warning';
  toast.setAttribute('role', isCritical ? 'alert' : 'status');
  toast.setAttribute('aria-live', isCritical ? 'assertive' : 'polite');
  toast.setAttribute('aria-atomic', 'true');

  Object.assign(toast.style, {
    position: 'relative',
    pointerEvents: 'auto',
    padding: '12px 16px',
    borderRadius: '10px',
    color: isDark ? '#f8fafc' : '#ffffff',
    fontSize: '14px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: '500',
    backgroundColor: bgColor,
    border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
    boxShadow: isDark ? '0 10px 25px rgba(0,0,0,0.5)' : '0 10px 25px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    opacity: '0',
    overflow: 'hidden',
    transform: position.includes('top') ? 'translateY(-20px) scale(0.95)' : 'translateY(20px) scale(0.95)',
    transition: 'all 0.25s cubic-bezier(0.21, 1.02, 0.73, 1)'
  });

  if (showIcon && icons[type]) {
    const iconSpan = document.createElement('span');
    iconSpan.style.display = 'inline-flex';
    iconSpan.style.flexShrink = '0';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.innerHTML = icons[type];
    toast.appendChild(iconSpan);
  }

  const textSpan = document.createElement('span');
  textSpan.style.flex = '1';
  textSpan.style.wordBreak = 'break-word';
  textSpan.textContent = message;
  toast.appendChild(textSpan);

  if (closeButton) {
    const closeBtn = document.createElement('button');
    closeBtn.setAttribute('type', 'button');
    closeBtn.setAttribute('aria-label', 'Close Alert');
    closeBtn.innerHTML = `<span aria-hidden="true">✕</span>`;

    Object.assign(closeBtn.style, {
      background: 'transparent',
      border: 'none',
      color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.8)',
      fontSize: '14px',
      cursor: 'pointer',
      padding: '0',
      lineHeight: '1',
      marginLeft: '4px',
      flexShrink: '0'
    });
    closeBtn.onclick = () => dismiss();
    toast.appendChild(closeBtn);
  }

  let progressElement = null;
  if (progressBar) {
    progressElement = document.createElement('div');
    progressElement.setAttribute('aria-hidden', 'true');
    Object.assign(progressElement.style, {
      position: 'absolute',
      bottom: '0',
      left: '0',
      height: '3px',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.4)',
      width: '100%',
      transition: 'width linear'
    });
    toast.appendChild(progressElement);
  }

  if (position.includes('top')) {
    container.appendChild(toast);
  } else {
    container.insertBefore(toast, container.firstChild);
  }

  // 4. Timer & Cleanup
  let startTime = Date.now();
  let remainingTime = durationInMs;

  const startTimer = () => {
    startTime = Date.now();
    toast._timer = setTimeout(dismiss, remainingTime);

    if (progressElement) {
      progressElement.style.transitionDuration = `${remainingTime}ms`;
      progressElement.style.width = '0%';
    }
  };

  const pauseTimer = () => {
    if (toast._timer) clearTimeout(toast._timer);
    remainingTime -= Date.now() - startTime;

    if (progressElement) {
      const computedWidth = getComputedStyle(progressElement).width;
      progressElement.style.transitionDuration = '0ms';
      progressElement.style.width = computedWidth;
    }
  };

  if (pauseOnHover) {
    toast.addEventListener('mouseenter', pauseTimer);
    toast.addEventListener('mouseleave', startTimer);
  }

  const cleanup = () => {
    if (toast._timer) clearTimeout(toast._timer);
    if (pauseOnHover) {
      toast.removeEventListener('mouseenter', pauseTimer);
      toast.removeEventListener('mouseleave', startTimer);
    }
    if (toast.parentNode) toast.remove();
    if (container && container.children.length === 0) {
      container.remove();
    }
  };

  const dismiss = () => {
    if (toast._timer) clearTimeout(toast._timer);
    toast.style.opacity = '0';
    toast.style.transform = position.includes('top') ? 'translateY(-10px) scale(0.95)' : 'translateY(10px) scale(0.95)';

    setTimeout(cleanup, 250);
  };

  toast._cleanup = cleanup;
  toast._dismiss = dismiss;

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0) scale(1)';
    startTimer();
  });

  return dismiss;
}


// new
window.flyToast = flyToast;
window.setDefaults = setDefaults;