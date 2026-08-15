import flyToast from '/external/index.js';

async function loadNavbarUsername() {
  try {
    const response = await fetch('/api/user/name');

    if (!response.ok) throw new Error('Failed to fetch name');

    const data = await response.json();

    const userNameElement = document.getElementById('username');
    const fullUserNameElement = document.getElementById('user-name');
    if (userNameElement && fullUserNameElement) {
      userNameElement.textContent = data.name[0].toUpperCase();
      fullUserNameElement.textContent = data.name
    }
  } catch (error) {
    console.error('Error loading username:', error);
  }
}

/**
 * Initializes the 24-Hour Task Timeline with real-time smooth updates.
 * @param {Array} tasks - List of tasks [{ title: "Code", time: "14:30", completed: false }]
 */
function initLiveDashboardTimeline(tasks = []) {
  __timelineTasksCache = tasks;

  // Clear any previously running timeline timer
  if (window.timelineClockInterval) {
    clearInterval(window.timelineClockInterval);
  }

  const CENTER_X = 400;
  const CENTER_Y = 350;
  const RADIUS_X = 300;
  const RADIUS_Y = 250;

  // Calculates (X, Y) coordinates along the arc for any given decimal hour
  const getCoordinates = (hour) => {
    const angle = Math.PI - (Math.max(0, Math.min(24, hour)) / 24) * Math.PI;
    return {
      x: CENTER_X + RADIUS_X * Math.cos(angle),
      y: CENTER_Y - RADIUS_Y * Math.sin(angle)
    };
  };

  const parseHour = (timeVal) => {
    if (typeof timeVal === 'number') return timeVal;
    if (typeof timeVal === 'string' && timeVal.includes(':')) {
      const [h, m] = timeVal.split(':').map(Number);
      return (h || 0) + (m || 0) / 60;
    }
    return parseFloat(timeVal) || 0;
  };

  // 1. Render Task Nodes (Runs Once per Task List update)
  const renderTasks = (currentDecimalHour) => {
    const taskGroup = document.getElementById('timeline-tasks');
    if (!taskGroup) return;

    taskGroup.innerHTML = ''; // Clear existing task nodes

    tasks.forEach((task) => {
      const hour = parseHour(task.time);
      const pos = getCoordinates(hour);

      const isOverdue = currentDecimalHour > hour && !task.completed;
      const isDelayed = Boolean(task.isDelayed || task.delayed || isOverdue);

      const theme = localStorage.getItem('color-theme');

      let markerColor = '#eab308'; // Yellow = Pending
      let labelColor = theme === 'light' ? '#000' : '#f8fafc';
      let statusText = 'Pending';

      if (task.completed) {
        markerColor = '#22c55e'; // Green = Completed
        statusText = 'Completed';
      } else if (isDelayed) {
        markerColor = '#ef4444'; // Red = Delayed / Overdue
        labelColor = '#f87171';
        statusText = 'Delayed';
      }

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'cursor-pointer group');

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pos.x.toFixed(2));
      circle.setAttribute('cy', pos.y.toFixed(2));
      circle.setAttribute('r', isDelayed ? '8' : '7');
      circle.setAttribute('fill', markerColor);
      circle.setAttribute('stroke', '#0f172a');
      circle.setAttribute('stroke-width', '2');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', pos.x.toFixed(2));
      text.setAttribute('y', (pos.y - 12).toFixed(2));
      text.setAttribute('fill', labelColor);
      text.setAttribute('font-size', '12');
      text.setAttribute('font-weight', '600');
      text.setAttribute('text-anchor', 'middle');
      text.textContent = task.title;

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${task.title} (${task.time}) - Status: ${statusText}`;

      g.appendChild(title);
      g.appendChild(circle);
      g.appendChild(text);
      taskGroup.appendChild(g);
    });
  };


  // 2. Real-Time Clock & Hand Animation (Runs every second)
  const updatePointerAndClock = () => {
    const now = new Date();
    
    // Convert current time including seconds to precise decimal hours
    const currentDecimalHour = now.getHours() + (now.getMinutes() / 60) + (now.getSeconds() / 3600);
    const pos = getCoordinates(currentDecimalHour);

    const timeHand = document.getElementById('time-hand');
    const timeText = document.getElementById('current-time-text');

    // Smoothly update hand end coordinates
    if (timeHand) {
      timeHand.setAttribute('x2', pos.x.toFixed(2));
      timeHand.setAttribute('y2', pos.y.toFixed(2));
    }

    // Live digital clock display with seconds
    if (timeText) {
      timeText.textContent = `Current Time: ${now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      })}`;
    }

    return currentDecimalHour;
  };

  // Initial Execution
  const initialDecimalHour = updatePointerAndClock();
  renderTasks(initialDecimalHour);

  // Set interval to update hand position & clock text every 1000ms (1s)
  window.timelineClockInterval = setInterval(() => {
    const currentHour = updatePointerAndClock();
    
    // Re-check overdue status at the top of every second
    renderTasks(currentHour);
  }, 1000);
}

async function loadTimeLineTodos() {
  try {
    const response = await fetch('/api/todos');
    if (!response.ok) throw new Error('Failed to fetch todos');

    const todos = await response.json();
    const action = await getCompletedTodosPreference();
    const todosForToday = todos.filter((todo) => isTodoDueToday(todo) && shouldShowTodoInActiveViews(todo, action));

    const todos_to_show = todosForToday
      .filter((todo) => Boolean(todo.due_time))
      .map((todo) => ({
        title: todo.title,
        time: todo.due_time,
        completed: isTodoCompleted(todo)
      }));

    initLiveDashboardTimeline(todos_to_show);
    dispatchTodosLoaded(todos);
  } catch (error) {
    console.error('Error loading timeline todos:', error);
  }
}


/**
 * Toggles the timeline component lock state.
 * @param {boolean} isPro - Set to true to unlock, false to heavily blur/lock.
 */
let __timelineIsProCache = false;
let __timelineTasksCache = [];

function setTimelineLockState(isPro) {
  __timelineIsProCache = isPro;

  const content = document.getElementById('timeline-content');
  const overlay = document.getElementById('timeline-overlay');

  if (!content || !overlay) return;

  const lockedClasses = ['blur-2xl', 'opacity-10', 'select-none', 'pointer-events-none'];

  if (isPro) {
    // UNLOCKED STATE
    content.classList.remove(...lockedClasses);
    overlay.classList.add('hidden');
  } else {
    // LOCKED STATE
    content.classList.add(...lockedClasses);
    overlay.classList.remove('hidden');
  }
}

/**
 * Builds and injects the theme-appropriate timeline markup (dark or light)
 * into the #timeline container. Pure DOM swap - no network requests.
 * @param {string} theme - 'light' or 'dark' (anything other than 'light' is treated as dark)
 */
function renderTimelineMarkup(theme) {
  const timeline_parent = document.getElementById('timeline');
  if (!timeline_parent) return;

  const timeline_dark_element = `
      <div class="relative bg-[#0f172a] border border-gray-800 rounded-2xl p-6 w-full mt-6 flex flex-col items-center overflow-hidden">
        <!-- Content Wrapper with HEAVY Blur (blur-2xl) and Low Opacity (opacity-10) -->
        <div id="timeline-content" class="w-full flex flex-col items-center blur-2xl opacity-10 select-none pointer-events-none transition-all duration-300">
          <div class="w-full flex justify-between items-center mb-2">
            <h3 class="text-sm font-semibold text-gray-300">24 Hour Task Timeline</h3>
            <span id="current-time-text" class="text-xs font-mono text-purple-400">00:00</span>
          </div>

          <div class="relative w-full max-w-4xl aspect-2/1">
            <svg viewBox="0 0 800 400" class="w-full h-full overflow-visible">
              <path d="M 100 350 A 300 250 0 0 1 700 350" fill="none" stroke="#1e293b" stroke-width="8" stroke-dasharray="6 6" />
              <path d="M 100 350 A 300 250 0 0 1 700 350" fill="none" stroke="#6366f1" stroke-width="3" opacity="0.5" />
              <line x1="80" y1="350" x2="720" y2="350" stroke="#334155" stroke-width="2" />
              <text x="90" y="380" fill="#64748b" font-size="14" font-weight="bold" text-anchor="middle">00:00</text>
              <text x="400" y="60" fill="#64748b" font-size="14" font-weight="bold" text-anchor="middle">12:00 (Midday)</text>
              <text x="710" y="380" fill="#64748b" font-size="14" font-weight="bold" text-anchor="middle">24:00</text>
              <line id="time-hand" x1="400" y1="350" x2="400" y2="100" stroke="#a855f7" stroke-width="3" stroke-linecap="round" />
              <circle cx="400" cy="350" r="7" fill="#a855f7" />
              <g id="timeline-tasks"></g>
            </svg>
          </div>
        </div>

        <!-- Darker Overlay with backdrop-blur-xl -->
        <div id="timeline-overlay" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0f172a]/85 backdrop-blur-xl">
          <div class="flex flex-col items-center gap-3 p-5 rounded-2xl bg-[#0f172a] border border-purple-500/30 shadow-2xl shadow-purple-500/10">
            
            <div class="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>

            <div class="text-center">
              <p class="text-sm font-bold text-white">Pro Feature</p>
              <p class="text-xs text-gray-400 mt-0.5">Upgrade your plan to unlock 24-Hour Timeline</p>
            </div>

            <button class="btn btn-primary btn-sm rounded-xl px-4 mt-1 text-xs">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    `;

  const timeline_light_element = `
      <div class="relative bg-white border border-slate-200 rounded-2xl p-6 w-full mt-6 flex flex-col items-center overflow-hidden shadow-sm">
        <!-- Subtle Ambient Glows -->
        <div class="absolute -top-24 -left-24 w-72 h-72 bg-purple-200/40 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Content Wrapper (Matching JS and dark mode classes exactly) -->
        <div id="timeline-content" class="w-full flex flex-col items-center blur-2xl opacity-10 select-none pointer-events-none transition-all duration-300">
          <div class="w-full flex justify-between items-center mb-2">
            <h3 class="text-sm font-bold text-slate-800 tracking-wide">24 Hour Task Timeline</h3>
            <span id="current-time-text" class="text-xs font-mono text-purple-700 font-semibold">00:00</span>
          </div>

          <div class="relative w-full max-w-4xl aspect-2/1">
            <svg viewBox="0 0 800 400" class="w-full h-full overflow-visible">
              <!-- Dashed Half-Circle Arc -->
              <path d="M 100 350 A 300 250 0 0 1 700 350" fill="none" stroke="#94a3b8" stroke-width="8" stroke-dasharray="6 6" />
              
              <!-- Progress Arc Line -->
              <path id="progress-arc" d="M 100 350 A 300 250 0 0 1 700 350" fill="none" stroke="#4f46e5" stroke-width="3" opacity="0.9" pathLength="50" stroke-dasharray="50 100" />
              
              <!-- Baseline Divider -->
              <line x1="80" y1="350" x2="720" y2="350" stroke="#64748b" stroke-width="2" />
              
              <!-- Hour Markers Text -->
              <text x="90" y="380" fill="#334155" font-size="14" font-weight="bold" text-anchor="middle">00:00</text>
              <text x="400" y="60" fill="#334155" font-size="14" font-weight="bold" text-anchor="middle">12:00 (Midday)</text>
              <text x="710" y="380" fill="#334155" font-size="14" font-weight="bold" text-anchor="middle">24:00</text>
              
              <!-- Time Hand Line & Center Node -->
              <line id="time-hand" x1="400" y1="350" x2="400" y2="100" stroke="#7c3aed" stroke-width="3" stroke-linecap="round" />
              <circle cx="400" cy="350" r="7" fill="#7c3aed" />

              <g id="timeline-tasks"></g>
            </svg>
          </div>
        </div>

        <!-- Light Mode Glass Overlay Modal -->
        <div id="timeline-overlay" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/40 backdrop-blur-md">
          <div class="flex flex-col items-center gap-3.5 p-6 rounded-2xl bg-white border border-slate-200 shadow-2xl shadow-purple-950/10 max-w-sm w-full mx-4 transition-all">
            <!-- Lock Icon Badge -->
            <div class="relative p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-purple-700 shadow-xs">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>

            <!-- Typography -->
            <div class="text-center">
              <h4 class="text-base font-bold text-slate-900 tracking-tight">Pro Feature</h4>
              <p class="text-xs text-slate-600 mt-1 leading-relaxed">Upgrade your plan to unlock the full 24-Hour Timeline overview.</p>
            </div>

            <!-- CTA Button -->
            <button class="w-full mt-1 py-2.5 px-5 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-purple-500/25 transition-all duration-200 active:scale-95">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    `;

  timeline_parent.innerHTML = theme === 'light' ? timeline_light_element : timeline_dark_element;
}

/**
 * Re-renders the timeline instantly for the current theme (no network calls).
 * Call this right after the theme is toggled so the dark/light timeline
 * swaps immediately instead of waiting for the next full page load.
 */
function refreshTimelineTheme() {
  const theme = localStorage.getItem('color-theme');

  // Rebuild the theme-specific markup (backgrounds, arc colors, overlay, etc.)
  renderTimelineMarkup(theme);

  // Re-apply whatever lock/unlock state we last determined from the trial API,
  // since innerHTML replacement above wiped out the previous overlay state.
  setTimelineLockState(__timelineIsProCache);

  // Re-draw task nodes and restart the clock/hand interval on the fresh SVG.
  initLiveDashboardTimeline(__timelineTasksCache);
}

async function loadRemainingDaysInTrial() {
  try {
    const response = await fetch('/api/user/trial');

    if (!response.ok) throw new Error('Failed to fetch remaining days');

    const data = await response.json();

    const remainingElement = document.getElementById('show_remaining_trial');
    const remainingDaysElement = document.getElementById('remaining_trial');
    const badge = document.getElementById('pro_badge');
    const upgradeBtn = document.getElementById('upgrade-btn');

    const theme = localStorage.getItem('color-theme');

    renderTimelineMarkup(theme);

    if (!remainingElement && !remainingDaysElement && !badge && !upgradeBtn) return;

    if (data.subscriptionStatus === 'active' && data.plan === 'pro') { // if user is subscribed
      badge.classList.remove('hidden');
      setTimelineLockState(true);
      return;
    }
    else if (data.subscriptionStatus === 'trial' && data.plan === 'free') { // if user in a free trial
      setTimelineLockState(true);
      remainingElement.classList.remove('hidden');
      remainingElement.classList.add('flex');

      const endDate = new Date(data.trialEndsAt);
      const now = new Date();
      const diffInMs = endDate - now;
      const remainingDays = Math.max(0, Math.ceil(diffInMs / (1000 * 60 * 60 * 24)));
      remainingDaysElement.textContent = remainingDays;
      return;
    } else { // if user is not subscribed
      upgradeBtn.classList.remove('hidden');
      upgradeBtn.classList.add('flex');
    }
  } catch (error) {
    console.error(error)
  }
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function syncAddTaskModalDate() {
  const dueDateInput = document.getElementById('task-date');
  if (!dueDateInput) return;

  const currentView = getCurrentView();
  if (currentView === 'calendar' && window.selectedCalendarDate) {
    dueDateInput.value = window.selectedCalendarDate;
    return;
  }

  if (currentView === 'today') {
    dueDateInput.value = getTodayDateString();
  }

  if (currentView === 'home') {
    dueDateInput.value = getTodayDateString();
  }
}

function openAddTaskModal() {
  syncAddTaskModalDate();
  const modal = document.getElementById('add_task_modal');
  if (modal) {
    modal.showModal();
  }
}

function openAddListModal() {
  const modal = document.getElementById('add_list_modal');
  if (modal) {
    modal.showModal();
  }
}

function getCurrentListParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('list');
}

function isListActive(list) {
  return getCurrentView() === 'list' && String(getCurrentListParam()) === String(list?.id);
}

function navigateToList(list) {
  const params = new URLSearchParams(window.location.search);
  params.set('view', 'list');
  params.set('list', list?.id != null ? String(list.id) : String(list?.title || ''));

  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({ list: list?.id ?? list?.title ?? '' }, '', nextUrl);
  renderDashboard();
  loadUserLists();
  loadDashboardLists();
}

function formatTodayDateForDisplay() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

function updateShowDate() {
  const showDateElement = document.getElementById('show-date');
  if (showDateElement) {
    showDateElement.textContent = formatTodayDateForDisplay();
  }
}

function isTodoDueToday(todo) {
  if (!todo?.due_date) return false;
  return String(todo.due_date).split('T')[0] === getTodayDateString();
}

function isTodoImportant(todo) {
  return todo?.priority === 'high';
}

function isTodoCompleted(todo) {
  return todo?.is_completed === 1;
}

function dispatchTodosLoaded(todos) {
  document.dispatchEvent(new CustomEvent('todosLoaded', { detail: { todos } }));
}

let completedTodosPreference = 'keep';
let completedTodosPreferenceLoaded = false;

async function getCompletedTodosPreference() {
  if (completedTodosPreferenceLoaded) {
    return completedTodosPreference;
  }

  try {
    const response = await fetch('/api/user');
    if (!response.ok) throw new Error('Failed to load completed preference');

    const data = await response.json();
    completedTodosPreference = data.completed_todos_action || 'keep';
  } catch (error) {
    console.error('Error loading completed todos preference:', error);
    completedTodosPreference = 'keep';
  }

  completedTodosPreferenceLoaded = true;
  return completedTodosPreference;
}

function shouldShowTodoInActiveViews(todo, action = completedTodosPreference) {
  if (action === 'move' && isTodoCompleted(todo)) {
    return false;
  }

  return true;
}

async function loadDashboardTodos() {
  const todosContainer = document.getElementById('todos-list');

  try {
    const response = await fetch('/api/todos');
    if (!response.ok) throw new Error('Failed to fetch todos');

    const todos = await response.json();
    const action = await getCompletedTodosPreference();
    const todosForToday = todos.filter((todo) => isTodoDueToday(todo) && shouldShowTodoInActiveViews(todo, action));

    dispatchTodosLoaded(todos);

    if (!todosContainer) return;

    todosContainer.innerHTML = '';

    if (todosForToday.length === 0) {
      todosContainer.innerHTML = '<div id="no-todos" class="w-full flex flex-col items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0,0,256,256" width="50px" height="50px" fill-rule="nonzero"><g fill="#fcd462" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(5.12,5.12)"><path d="M24.90625,3.96875c-0.04297,0.00781 -0.08594,0.01953 -0.125,0.03125c-0.46484,0.10547 -0.79297,0.52344 -0.78125,1v6c-0.00391,0.35938 0.18359,0.69531 0.49609,0.87891c0.3125,0.17969 0.69531,0.17969 1.00781,0c0.3125,-0.18359 0.5,-0.51953 0.49609,-0.87891v-6c0.01172,-0.28906 -0.10547,-0.56641 -0.3125,-0.76172c-0.21094,-0.19922 -0.49609,-0.29687 -0.78125,-0.26953zM10.65625,9.84375c-0.375,0.06641 -0.67578,0.33984 -0.78125,0.70313c-0.10547,0.36719 0.00391,0.75781 0.28125,1.01563l4.25,4.25c0.24219,0.29688 0.62891,0.43359 1.00391,0.34766c0.37109,-0.08594 0.66406,-0.37891 0.75,-0.75c0.08594,-0.375 -0.05078,-0.76172 -0.34766,-1.00391l-4.25,-4.25c-0.20703,-0.22266 -0.50781,-0.33594 -0.8125,-0.3125c-0.03125,0 -0.0625,0 -0.09375,0zM39.03125,9.84375c-0.22656,0.03125 -0.4375,0.14453 -0.59375,0.3125l-4.25,4.25c-0.29687,0.24219 -0.43359,0.62891 -0.34766,1.00391c0.08594,0.37109 0.37891,0.66406 0.75,0.75c0.375,0.08594 0.76172,-0.05078 1.00391,-0.34766l4.25,-4.25c0.3125,-0.29687 0.40234,-0.76172 0.21875,-1.15234c-0.1875,-0.39453 -0.60156,-0.62109 -1.03125,-0.56641zM25,15c-5.51562,0 -10,4.48438 -10,10c0,5.51563 4.48438,10 10,10c5.51563,0 10,-4.48437 10,-10c0,-5.51562 -4.48437,-10 -10,-10zM4.71875,24c-0.55078,0.07813 -0.9375,0.58984 -0.85937,1.14063c0.07813,0.55078 0.58984,0.9375 1.14063,0.85938h6c0.35938,0.00391 0.69531,-0.18359 0.87891,-0.49609c0.17969,-0.3125 0.17969,-0.69531 0,-1.00781c-0.18359,-0.3125 -0.51953,-0.5 -0.87891,-0.49609h-6c-0.03125,0 -0.0625,0 -0.09375,0c-0.03125,0 -0.0625,0 -0.09375,0c-0.03125,0 -0.0625,0 -0.09375,0zM38.71875,24c-0.55078,0.07813 -0.9375,0.58984 -0.85937,1.14063c0.07813,0.55078 0.58984,0.9375 1.14063,0.85938h6c0.35938,0.00391 0.69531,-0.18359 0.87891,-0.49609c0.17969,-0.3125 0.17969,-0.69531 0,-1.00781c-0.18359,-0.3125 -0.51953,-0.5 -0.87891,-0.49609h-6c-0.03125,0 -0.0625,0 -0.09375,0c-0.03125,0 -0.0625,0 -0.09375,0c-0.03125,0 -0.0625,0 -0.09375,0zM15,33.875c-0.22656,0.03125 -0.4375,0.14453 -0.59375,0.3125l-4.25,4.25c-0.29687,0.24219 -0.43359,0.62891 -0.34766,1.00391c0.08594,0.37109 0.37891,0.66406 0.75,0.75c0.375,0.08594 0.76172,-0.05078 1.00391,-0.34766l4.25,-4.25c0.29688,-0.28516 0.38672,-0.72656 0.22656,-1.10547c-0.15625,-0.37891 -0.53516,-0.62109 -0.94531,-0.61328c-0.03125,0 -0.0625,0 -0.09375,0zM34.6875,33.875c-0.375,0.06641 -0.67578,0.33984 -0.78125,0.70313c-0.10547,0.36719 0.00391,0.75781 0.28125,1.01563l4.25,4.25c0.24219,0.29688 0.62891,0.43359 1.00391,0.34766c0.37109,-0.08594 0.66406,-0.37891 0.75,-0.75c0.08594,-0.375 -0.05078,-0.76172 -0.34766,-1.00391l-4.25,-4.25c-0.1875,-0.19922 -0.44531,-0.30859 -0.71875,-0.3125c-0.03125,0 -0.0625,0 -0.09375,0c-0.03125,0 -0.0625,0 -0.09375,0zM24.90625,37.96875c-0.04297,0.00781 -0.08594,0.01953 -0.125,0.03125c-0.46484,0.10547 -0.79297,0.52344 -0.78125,1v6c-0.00391,0.35938 0.18359,0.69531 0.49609,0.87891c0.3125,0.17969 0.69531,0.17969 1.00781,0c0.3125,-0.18359 0.5,-0.51953 0.49609,-0.87891v-6c0.01172,-0.28906 -0.10547,-0.56641 -0.3125,-0.76172c-0.21094,-0.19922 -0.49609,-0.29687 -0.78125,-0.26953z"></path></g></g></svg><p>No Todos For Today, Enjoy your free time.</p></div>';
      return;
    }

    todosForToday.forEach(todo => {
      const todoElement = createTodoElement(todo);
      todosContainer.appendChild(todoElement);
    });

  } catch (error) {
    console.error('Error loading todos:', error);
    if (todosContainer) {
      todosContainer.innerHTML = '<p class="text-red-500 py-2">Failed to load tasks.</p>';
    }
  }
}

async function loadDashboardLists() {
  const listsContainer = document.getElementById('lists');
  if (!listsContainer) return;

  try {
    const [listsResponse, todosResponse] = await Promise.all([
      fetch('/api/lists'),
      fetch('/api/todos')
    ]);

    if (!listsResponse.ok) throw new Error('Failed to load lists');
    if (!todosResponse.ok) throw new Error('Failed to load todos');

    const lists = await listsResponse.json();
    const todos = await todosResponse.json();
    const action = await getCompletedTodosPreference();
    listsContainer.innerHTML = '';

    if (lists.length === 0) {
      listsContainer.innerHTML = '<p class="text-sm text-gray-500">No lists yet</p>';
      return;
    }

    lists.forEach((list) => {
      const listElement = createListElement(list, todos, action);
      listsContainer.appendChild(listElement);
    });
  } catch (error) {
    console.error('Error loading lists:', error);
    listsContainer.innerHTML = '<p class="text-red-500 py-2">Failed to load lists.</p>';
  }
}

async function loadUserLists(selectedListId = null) {
  const selectElement = document.getElementById('task-list');
  if (!selectElement) return;

  if (selectedListId === null && getCurrentView() === 'list') {
    selectedListId = getCurrentListID();
  }

  try {
    const response = await fetch('/api/lists');
    if (!response.ok) throw new Error('Failed to load lists.');

    const lists = await response.json();

    selectElement.innerHTML = '';

    if (lists.length === 0) {
      selectElement.innerHTML = '<option value="" disabled>No lists found</option>';
      return;
    }

    lists.forEach((list, index) => {
      const option = document.createElement('option');
      option.value = list.id;
      option.textContent = list.title;

      const shouldSelect = selectedListId
        ? Number(option.value) === Number(selectedListId)
        : index === 0;

      if (shouldSelect) option.selected = true;
      selectElement.appendChild(option);
    });
  } catch (err) {
    console.error('Error loading lists', err);
    selectElement.innerHTML = '<option value="" disabled>No lists found</option>';
  }
}

async function addList(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const listTitleInput = document.getElementById('list-title');
  const modal = document.getElementById('add_list_modal');
  const listName = listTitleInput?.value.trim();

  if (!listName) return;

  try {
    const response = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: listName })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create list');
    }

    form.reset();
    if (modal) modal.close();
    await loadUserLists(data.id);
    await loadDashboardLists();
    await loadDashboardTodos();
    await renderCount();
  } catch (error) {
    console.error('Error creating list:', error);
    // alert(error.message || 'Failed to create list');
    flyToast(error.message || 'Failed to create list', 'error');
  }
}

async function handleAddTodoSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const titleInput = document.getElementById('task-title');
  const dueDateInput = document.getElementById('task-date');
  const dueTimeInput = document.getElementById('task-time');
  const priorityInput = document.getElementById('task-priority');
  const listInput = document.getElementById('task-list');
  const modal = document.getElementById('add_task_modal');

  const title = titleInput?.value.trim();
  const dueDate = dueDateInput?.value || null;
  const dueTime = dueTimeInput?.value || null;
  const priority = priorityInput?.value?.toLowerCase() || 'medium';
  const listId = listInput?.value;

  if (!title || !listId) {
    return;
  }

  try {
    const response = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        due_date: dueDate,
        due_time: dueTime,
        priority,
        list_id: Number(listId),
        is_completed: 0
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create todo');
    }

    form.reset();
    if (modal) modal.close();
    await loadDashboardTodos();
    await loadUserLists();
    await loadDashboardLists();
    await loadListTodos();
    await renderCount();
    await loadTimeLineTodos();
  } catch (error) {
    console.error('Error creating todo:', error);
    flyToast(error.message || 'Failed to create todo', 'error');
  }
}

// create new todo
function createTodoElement(todo) {
  const li = document.createElement('li');
  li.className = 'w-full p-4 rounded-xl bg-white dark:bg-[#131f38] border border-gray-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-center justify-between group';

  const isCompleted = todo.is_completed === 1 || todo.is_completed === true || todo.completed === true;
  const isHighPriority = todo.priority === 'high' || todo.isHighPriority;
  const isMediumPriority = todo.priority === 'medium' || todo.isMediumPriority;
  const isLowPriority = todo.priority === 'low' || todo.isLowPriority;

  li.innerHTML = `
    <div class="flex items-center gap-3">
      <input type="checkbox" ${isCompleted ? 'checked' : ''} data-id="${todo.id}" class="todo-checkbox checkbox checkbox-primary checkbox-sm rounded-md" />
      <span class="font-medium text-gray-800 dark:text-gray-100 ${isCompleted ? 'line-through text-gray-400' : ''}">${escapeHTML(todo.title)}</span>
    </div>
    <div class="flex items-center gap-3">
      ${isHighPriority ? '<span class="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/50 px-2.5 py-1 rounded-md font-semibold">High Priority</span>' : ''}
      ${isMediumPriority ? '<span class="text-xs text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 px-2.5 py-1 rounded-md font-semibold">Medium Priority</span>' : ''}
      ${isLowPriority ? '<span class="text-xs text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/50 px-2.5 py-1 rounded-md font-semibold">Low Priority</span>' : ''}
      <button id="delete-btn-${todo.id}" data-id="${todo.id}" class="delete-btn opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  `;

  // on right click
  li.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    showTodoContextMenu(event, todo);
  })

  return li;
}

window.createTodoElement = createTodoElement;
window.syncAddTaskModalDate = syncAddTaskModalDate;

function showTodoContextMenu(event, todo) {
  const menu = document.getElementById('todo-menu');
  if (!menu) return;

  const todoId = todo.id ?? todo._id;
  menu.dataset.selectedTodoId = todoId;
  menu.dataset.selectedTodoTitle = todo.title;

  menu.classList.remove('hidden');

  const menuWidth = menu.offsetWidth;
  const menuHeight = menu.offsetHeight;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  let left = event.clientX;
  let top = event.clientY;

  if (left + menuWidth > windowWidth) {
    left = windowWidth - menuWidth - 10;
  }
  if (top + menuHeight > windowHeight) {
    top = windowHeight - menuHeight - 10;
  }

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function hideTodoContextMenu() {
  const menu = document.getElementById('todo-menu');
  if (menu && !menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideTodoContextMenu();
});

document.addEventListener('click', (e) => {
  const menu = document.getElementById('todo-menu');
  if (menu && !menu.contains(e.target)) {
    hideTodoContextMenu();
  }
});

// create new list
function createListElement(list, todos = [], action = completedTodosPreference) {
  const li = document.createElement('li');
  li.className = 'w-full';

  const isActive = isListActive(list);
  const button = document.createElement('button');
  button.type = 'button';

  const activeClasses = [
    'bg-[#605dff]/15',
    'text-slate-900',
    'font-semibold',
    'dark:bg-[#605dff]/25',
    'dark:text-white'
  ];

  button.className = `btn btn-primary w-full sidebar-list-btn flex items-center justify-between gap-2 transition-colors duration-150 ${isActive ? activeClasses.join(' ') : ''
    }`;

  // list icon
  const svgNS = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(svgNS, 'svg');
  icon.setAttribute('height', '24px');
  icon.setAttribute('width', '24px');
  icon.setAttribute('viewBox', '0 -960 960 960');
  icon.setAttribute('class', 'size-5 shrink-0 fill-current opacity-80');

  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', 'M280-600v-80h560v80H280Zm0 160v-80h560v80H280Zm0 160v-80h560v80H280ZM160-600q-17 0-28.5-11.5T120-640q0-17 11.5-28.5T160-680q17 0 28.5 11.5T200-640q0 17-11.5 28.5T160-600Zm0 160q-17 0-28.5-11.5T120-480q0-17 11.5-28.5T160-520q17 0 28.5 11.5T200-480q0 17-11.5 28.5T160-440Zm0 160q-17 0-28.5-11.5T120-320q0-17 11.5-28.5T160-360q17 0 28.5 11.5T200-320q0 17-11.5 28.5T160-280Z');
  icon.appendChild(path);

  // list name
  const label = document.createElement('span');
  label.className = 'flex-1 text-left truncate';
  label.textContent = list.title;

  // list's todos number
  const countBadge = document.createElement('span');
  countBadge.className = 'text-xs font-normal opacity-70 shrink-0 ml-auto';
  const todoCount = todos.filter((todo) => String(todo.list_id) === String(list.id) && shouldShowTodoInActiveViews(todo, action)).length;
  countBadge.textContent = `(${todoCount})`;

  button.appendChild(icon);
  button.appendChild(label);
  button.appendChild(countBadge);

  button.addEventListener('click', () => {
    navigateToList(list);
  });

  // on right click
  button.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    showListContextMenu(event, list);
  })

  li.appendChild(button);
  return li;
}

// show list context menu
function showListContextMenu(event, list) {
  const menu = document.getElementById('list-menu');
  if (!menu) return;

  const listId = list.id ?? list._id;
  menu.dataset.selectedListId = listId;
  menu.dataset.selectedListTitle = list.title;
  menu.classList.remove('hidden');
  const menuWidth = menu.offsetWidth;
  const menuHeight = menu.offsetHeight;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  let left = event.clientX;
  let top = event.clientY;

  if (left + menuWidth > windowWidth) {
    left = windowWidth - menuWidth - 10;
  }
  if (top + menuHeight > windowHeight) {
    top = windowHeight - menuHeight - 10;
  }

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

// hide list context menu
function hideListContextMenu() {
  const menu = document.getElementById('list-menu');
  if (menu && !menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
  }
}

// hide context menu if clicked outside
document.addEventListener('click', (e) => {
  const menu = document.getElementById('list-menu');
  if (menu && !menu.contains(e.target)) {
    hideListContextMenu();
  }
});

// hide context menu if clicked esc
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideListContextMenu();
});

async function deleteList(listId) {
  if (!listId) return;

  const confirmed = await showConfirm('Are you sure you want to delete this list and its todos?');
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/lists/${listId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete list');
    }

    if (getCurrentView() === 'list' && String(getCurrentListID()) === String(listId)) {
      navigateTo('home');
    } else {
      await renderDashboard();
    }

    await loadUserLists();
    await loadDashboardLists();
    await loadDashboardTodos();
    await renderCount();
  } catch (error) {
    console.error('Error deleting list:', error);
    // alert(error.message || 'Failed to delete list');
    flyToast(error.message || 'Failed to delete list', 'error');
  }
}

// Open rename list modal and prefill data
function openRenameListModal(listId, currentTitle) {
  const modal = document.getElementById('rename_list_modal');
  const titleInput = document.getElementById('list-title-edit');
  const idInput = document.getElementById('rename-list-id');

  if (titleInput && idInput && modal) {
    idInput.value = listId;
    titleInput.value = currentTitle;
    modal.showModal();
  }
}

async function handleRenameListSubmit(event) {
  event.preventDefault();

  const modal = document.getElementById('rename_list_modal');
  const listId = document.getElementById('rename-list-id')?.value;
  const newTitle = document.getElementById('list-title-edit')?.value.trim();

  if (!listId || !newTitle) return;

  try {
    const response = await fetch(`/api/lists/${listId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Failed to rename list');
    }

    if (modal) modal.close();

    await loadUserLists();
    await loadDashboardLists();
    await renderDashboard();
  } catch (error) {
    console.error('Error renaming list:', error);
    // alert(error.message || 'Failed to rename list');
    flyToast(error.message || 'Failed to rename list', 'error');
  }
}



// returns: day/month
function dayMonth() {
  const today = new Date();
  const month = today.getMonth() + 1
  const day = today.getDate()
  const sidebarDate = document.getElementById('today-date');
  if (sidebarDate) {
    sidebarDate.textContent = `(${day}/${month})`;
  }
}

// load important todos only
async function loadImportantTodos() {
  const element = document.getElementById('important-todos');
  if (!element) return;

  try {
    const response = await fetch('/api/todos');
    if (!response.ok) throw new Error('Failed to fetch todos');

    const todos = await response.json();
    const action = await getCompletedTodosPreference();
    const importantTodos = todos.filter((todo) => isTodoImportant(todo) && shouldShowTodoInActiveViews(todo, action));

    dispatchTodosLoaded(todos);

    element.innerHTML = '';

    if (importantTodos.length === 0) {
      element.innerHTML = '<p class="text-gray-500">No important todos found.</p>';
      return;
    }

    importantTodos.forEach(todo => {
      const todoElement = createTodoElement(todo);
      element.appendChild(todoElement);
    });
  } catch (error) {
    console.error('Error loading todos: error');
    element.innerHTML = '<p class="text-red-500 py-2">Failed to load tasks.</p>';
  }
}

function openSubscriptionModal() {
  const modal = document.getElementById('subscription-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeSubscriptionModal() {
  const modal = document.getElementById('subscription-modal');
  if (modal) modal.classList.add('hidden');
}

// load completed todos only
async function loadCompletedTodos() {
  const element = document.getElementById('completed-todos');
  if (!element) return;

  try {
    const response = await fetch('/api/todos');
    if (!response.ok) throw new Error('Failed to fetch todos');

    const todos = await response.json();
    const importantTodos = todos.filter(isTodoCompleted);

    dispatchTodosLoaded(todos);

    element.innerHTML = '';

    if (importantTodos.length === 0) {
      element.innerHTML = '<p class="text-gray-500">No completed todos found.</p>';
      return;
    }

    importantTodos.forEach(todo => {
      const todoElement = createTodoElement(todo);
      element.appendChild(todoElement);
    });
  } catch (error) {
    console.error('Error loading todos: ', error);
    element.innerHTML = '<p class="text-red-500 py-2">Failed to load tasks.</p>';
  }
}

// load todos of a specific list
async function loadListTodos() {
  const element = document.getElementById('todos-list-only');
  const title = document.getElementById('list-name');
  if (!element || !title) return;

  const currentListId = getCurrentListID();
  if (currentListId === null) return;

  try {
    const [listsRes, todosRes] = await Promise.all([
      fetch('/api/lists'),
      fetch('/api/todos')
    ]);

    if (!listsRes.ok || !todosRes.ok) throw new Error('Failed to fetch data');

    const lists = await listsRes.json();
    const todos = await todosRes.json();
    const action = await getCompletedTodosPreference();

    const currentList = lists.find(l => String(l.id ?? l._id) === String(currentListId));
    title.textContent = currentList ? currentList.title : 'List';

    dispatchTodosLoaded(todos);
    element.innerHTML = '';

    const listTodos = todos.filter(todo => String(todo.list_id) === String(currentListId) && shouldShowTodoInActiveViews(todo, action));

    if (listTodos.length === 0) {
      element.innerHTML = '<p class="text-gray-500">No todos found in this list.</p>';
      return;
    }

    listTodos.forEach(todo => {
      const todoElement = createTodoElement(todo);
      element.appendChild(todoElement);
    });
  } catch (error) {
    console.error('Error loading todos: ', error);
    element.innerHTML = '<p class="text-red-500 py-2">Failed to load tasks.</p>';
  }
}

// load any todo
async function loadAllTodos() {
  const element = document.getElementById('all-todos');
  if (!element) return;

  try {
    const response = await fetch('/api/todos');
    if (!response.ok) throw new Error('Failed to fetch todos');

    const todos = await response.json();

    dispatchTodosLoaded(todos);

    element.innerHTML = '';

    if (todos.length === 0) {
      element.innerHTML = '<p class="text-gray-500">No completed todos found.</p>';
      return;
    }

    todos.forEach(todo => {
      const todoElement = createTodoElement(todo);
      element.appendChild(todoElement);
    })
  } catch (error) {
    console.error('Error loading todos: ', error);
    element.innerHTML = '<p class="text-red-500 py-2">Failed to load tasks.</p>';
  }
}

async function renderCount() {
  try {
    const response = await fetch('/api/todos');
    if (!response.ok) return;

    const todos = await response.json();
    const action = await getCompletedTodosPreference();

    const importantTodos = todos.filter(
      (todo) => isTodoImportant(todo) && (action !== 'move' || !isTodoCompleted(todo))
    );
    const todayTodos = todos.filter((todo) => isTodoDueToday(todo) && (action !== 'move' || !isTodoCompleted(todo)));
    const completedTodos = todos.filter(isTodoCompleted);

    const importantCount = document.getElementById('important-count');
    if (importantCount) {
      importantCount.innerHTML = `(${importantTodos.length})`;
    }

    const todayCount = document.getElementById('today-count');
    if (todayCount) {
      todayCount.textContent = `(${todayTodos.length})`;
    }

    const allCount = document.getElementById('todos-count');
    if (allCount) {
      allCount.textContent = `(${todos.length})`;
    }

    const completedCount = document.getElementById('completed-count');
    if (completedCount) {
      completedCount.textContent = `(${completedTodos.length})`;
    }
  } catch (error) {
    console.error('Error in renderCount:', error);
  }
}

function getCurrentView() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('view') || 'home';
}

function getCurrentListID() {
  const urlParams = new URLSearchParams(window.location.search);
  const listParam = urlParams.get('list');
  return listParam ? listParam : null;
}

function navigateTo(viewName) {
  const params = new URLSearchParams(window.location.search);
  params.set('view', viewName);

  if (viewName !== 'list') {
    params.delete('list');
  }

  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({ view: viewName }, '', nextUrl);
  renderDashboard();
  loadDashboardLists();
}

async function renderDashboard() {
  const currentView = getCurrentView();
  const main = document.getElementById('main-content');
  if (!main) return;

  switch (currentView) {
    case 'today':
      main.innerHTML = renderTodayLayout();
      break;
    case 'home':
      main.innerHTML = renderHomeLayout();
      break;
    case 'important':
      main.innerHTML = renderImportantLayout();
      await loadImportantTodos();
      break;
    case 'completed':
      main.innerHTML = renderCompletedLayout();
      await loadCompletedTodos();
      break;
    case 'all':
      main.innerHTML = renderAllLayout();
      await loadAllTodos();
      break;
    case 'calendar':
      main.innerHTML = renderCalendarLayout();
      break;
    case 'list':
      main.innerHTML = renderListLayout();
      await loadListTodos();
      break;
    default:
      main.innerHTML = renderHomeLayout();
      break;
  }

  syncAddTaskModalDate();

  if (typeof window.initCalendar === 'function') {
    window.initCalendar();
  }

  // The home layout's #timeline is just an empty placeholder div - rebuild
  // the actual theme markup (arc/hand/overlay) and repopulate it whenever
  // this view is (re)rendered, e.g. after a checkbox toggle wipes it out.
  if (document.getElementById('timeline')) {
    const theme = localStorage.getItem('color-theme');
    renderTimelineMarkup(theme);
    setTimelineLockState(__timelineIsProCache);
    await loadTimeLineTodos();
  }

  updateShowDate();
  await loadDashboardTodos();
  await renderCount();
}

function renderHomeLayout() {
  return /*html*/`
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
      <!-- Section 1: Todos -->
      <div class="w-full flex flex-col items-start justify-start gap-6">
        <div class="w-fit flex flex-row items-center justify-center gap-2">
          <div class="w-fit flex flex-col items-start justify-center gap-1">
            <h1 class="text-3xl font-bold">Today's Todos</h1>
            <p id="show-date" class="font-semibold text-gray-500 dark:text-gray-400">"Saturday, July 25"</p>
          </div>
        </div>
        
        <!-- FIX 1: Max height + scroll for left list -->
        <ul class="w-full flex flex-col gap-3 max-h-220 overflow-y-auto pr-1 items-center justify-center" id="todos-list">
          <span class="loading loading-spinner loading-xl"></span>
        </ul>
        
        <button onclick="document.getElementById('add_task_modal').showModal()"
          class="btn btn-primary btn-outline w-full">Add Todo +</button>

        <!-- 24 hour Timeline -->
        <div class="w-full" id="timeline"></div>
      </div>

      <!-- Section 2: Calendar -->
      <div class="w-full flex flex-col items-start justify-start gap-6">
        <h2 class="text-3xl font-bold">Calendar</h2>
        <div class="w-full flex flex-col gap-5 p-5 rounded-2xl bg-white dark:bg-[#131f38] border border-gray-200/80 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <h2 id="calendar-month-year" class="text-xl font-bold text-gray-900 dark:text-white">July 2026</h2>
              <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">Monthly Overview</p>
            </div>
            <div class="flex items-center gap-1 bg-gray-100 dark:bg-[#0c1425] p-1 rounded-xl">
              <button id="prev-month-btn" aria-label="Previous month" class="cursor-pointer p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button id="next-month-btn" aria-label="Next month" class="cursor-pointer p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <div class="grid grid-cols-7 text-center text-xs font-semibold text-gray-400 dark:text-gray-500">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>
          <div id="calendar-days-grid" class="grid grid-cols-7 gap-1 text-center text-sm font-medium"></div>
          <div class="flex items-center justify-center text-gray-600 dark:text-gray-400 text-sm">Select a day to view its todos</div>
        </div>

        <div class="w-full flex flex-col gap-3 p-5 rounded-2xl bg-white dark:bg-[#131f38] border border-gray-200/80 dark:border-slate-800 shadow-sm">
          <p id="selected-day-label" class="text-sm font-semibold text-gray-600 dark:text-gray-400">No Todos For Today</p>
          
          <!-- FIX 2: Replaced max-h-[50%] with fixed max-height & scrolling -->
          <div id="selected-day-todos" class="w-full flex flex-col gap-3 max-h-98 overflow-y-auto pr-1"></div>
          
          <button onclick="openAddTaskModal()"
          class="btn btn-primary btn-outline w-full">Add Todo +</button>
        </div>
      </div>
    </div>
  `;
}

function renderTodayLayout() {
  return /*html*/ `
    <div class="w-full max-w-3xl mx-auto flex flex-col gap-6">
      <div class="w-full flex flex-col gap-2 items-center justify-center">
        <h1 class="text-3xl font-bold">Today's Focus</h1>
        <p id="show-date" class="font-semibold text-gray-500 dark:text-gray-400">"Saturday, July 25"</p>
      </div>
      <ul class="w-full flex flex-col items-center justify-center gap-3 max-h-240 overflow-y-auto pr-1" id="todos-list">
        <span class="loading loading-spinner loading-xl"></span>
      </ul>
      <button onclick="openAddTaskModal()" class="btn btn-primary btn-outline w-full">Add Todo +</button>
    </div>
  `;
}

function renderImportantLayout() {
  return /*html*/`
    <div class="w-full max-w-3xl mx-auto flex flex-col gap-6 items-center justify-center">
      <h1 class="text-3xl font-bold">Important Todos</h1>
      <ul class="w-full flex flex-col gap-3 max-h-270 overflow-y-auto pr-1 items-center justify-center" id="important-todos">
        <span class="loading loading-spinner loading-xl"></span>
      </ul>
    </div>
  `
}

function renderCompletedLayout() {
  return /*html*/`
    <div class="w-full max-w-3xl mx-auto flex flex-col gap-6 items-center justify-center">
      <h1 class="text-3xl font-bold">Completed Todos</h1>
      <ul class="w-full flex flex-col gap-3 max-h-265 overflow-y-auto pr-1 items-center justify-center" id="completed-todos">
        <span class="loading loading-spinner loading-xl"></span>
      </ul>
    </div>
  `
}

function renderAllLayout() {
  return /*html*/`
    <div class="w-full max-w-3xl mx-auto flex flex-col gap-6 items-center justify-center">
      <h1 class="text-3xl font-bold">All Todos</h1>
      <ul class="w-full flex flex-col gap-3 max-h-270 overflow-y-auto pr-1 items-center justify-center" id="all-todos">
        <span class="loading loading-spinner loading-xl"></span>
      </ul>
    </div>
  `
}

function renderCalendarLayout() {
  return /*html*/`
    <div class="w-full flex flex-col items-start justify-start gap-6">
      <div class="w-full flex flex-col gap-8 lg:grid lg:grid-cols-[1.7fr_1fr]">
        <div class="w-full flex flex-col gap-5 p-5 rounded-2xl bg-white dark:bg-[#131f38] border border-gray-200/80 dark:border-slate-800 shadow-sm">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-3xl font-bold">Calendar</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">Monthly overview of your todos</p>
            </div>
            <div class="flex items-center gap-1 bg-gray-100 dark:bg-[#0c1425] p-1 rounded-xl">
              <button id="prev-month-btn" aria-label="Previous month" class="cursor-pointer p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button id="next-month-btn" aria-label="Next month" class="cursor-pointer p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h3 id="calendar-month-year" class="text-xl font-bold text-gray-900 dark:text-white">July 2026</h3>
              <span class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">Month</span>
            </div>
            <div class="grid grid-cols-7 text-center text-xs font-semibold text-gray-400 dark:text-gray-500">
              <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
            </div>
            <div id="calendar-days-grid" class="grid grid-cols-7 gap-2 text-center text-sm font-medium"></div>
          </div>

          <div class="flex items-center justify-center text-gray-600 dark:text-gray-400 text-sm">Select a day to view its todos</div>
        </div>

        <div class="w-full flex flex-col gap-4 p-5 rounded-2xl bg-white dark:bg-[#131f38] border border-gray-200/80 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between gap-2">
            <div>
              <p id="selected-day-label" class="text-lg font-semibold text-gray-800 dark:text-gray-100">No Todos For Today</p>
              <!-- <p class="text-sm text-gray-500 dark:text-gray-400">View tasks for the selected date.</p> -->
            </div>
          </div>
          <div id="selected-day-todos" class="w-full flex flex-col gap-3 max-h-240 overflow-y-auto pr-1"></div>
          <button onclick="openAddTaskModal()"
          class="btn btn-primary btn-outline w-full">Add Todo +</button>
        </div>
      </div>
    </div>
  `
}

function renderListLayout() {
  return /*html*/`
    <div class="w-full max-w-3xl mx-auto flex flex-col gap-6 items-center justify-center">
      <h1 id="list-name" class="text-3xl font-bold">
        <span class="loading loading-spinner loading-xl"></span>
      </h1>
      <ul class="w-full flex flex-col gap-3 max-h-250 overflow-y-auto pr-1 items-center justify-center" id="todos-list-only">
        <span class="loading loading-spinner loading-xl"></span>
      </ul>
      <button onclick="openAddTaskModal()" class="btn btn-primary btn-outline w-full">Add Todo +</button>
    </div>
  `
}

function openRenameTodoModal(todoId, currentTitle) {
  const modal = document.getElementById('rename_todo_modal');
  const titleInput = document.getElementById('todo-title-edit');
  const idInput = document.getElementById('rename-todo-id');

  if (titleInput && idInput && modal) {
    idInput.value = todoId;
    titleInput.value = currentTitle;
    modal.showModal();
  }
}

async function handleRenameTodoSubmit(event) {
  event.preventDefault();

  const modal = document.getElementById('rename_todo_modal');
  const todoId = document.getElementById('rename-todo-id')?.value;
  const newTitle = document.getElementById('todo-title-edit')?.value.trim();

  if (!todoId || !newTitle) return;

  try {
    const response = await fetch(`/api/todos/${todoId}/details`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Failed to rename todo');
    }

    if (modal) modal.close();

    await loadDashboardTodos();
    await loadListTodos();
    await renderDashboard();
    await loadTimeLineTodos();
  } catch (error) {
    console.error('Error renaming todo:', error);
    // alert(error.message || 'Failed to rename todo');
    flyToast(error.message || 'Failed to rename todo', 'error');
  }
}

// Update todo title or priority
async function updateTodoDetails(todoId, payload) {
  try {
    const response = await fetch(`/api/todos/${todoId}/details`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update todo');
    }

    await reloadDashboardState();
  } catch (error) {
    console.error('Error updating todo:', error);
    flyToast(error.message || 'Failed to update todo', 'error');
  }
}

// Delete todo item
async function deleteTodoItem(todoId) {
  if (!todoId) return;

  const confirmed = await showConfirm('Are you sure you want to delete this todo?');
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/todos/${todoId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete todo');
    }

    await reloadDashboardState();
  } catch (error) {
    console.error('Error deleting todo:', error);
    flyToast(error.message || 'Failed to delete todo', 'error');
  }
}

// Refresh all dashboard containers safely
async function reloadDashboardState() {
  await loadDashboardTodos();
  await loadDashboardLists();
  await renderDashboard();
  await loadListTodos();
  await renderCount();
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g,
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

window.addEventListener('popstate', renderDashboard);

Object.assign(window, {
  openAddTaskModal,
  openAddListModal,
  navigateTo,
  renderDashboard,
  loadDashboardTodos,
  loadDashboardLists,
  loadUserLists,
  loadListTodos,
  renderCount,
  reloadDashboardState,
  refreshTimelineTheme,
  deleteTodoItem,
  updateTodoDetails,
  openRenameTodoModal,
  openRenameListModal,
  deleteList,
  showTodoContextMenu,
  hideTodoContextMenu,
  hideListContextMenu,
  createTodoElement,
  syncAddTaskModalDate
});

document.addEventListener('DOMContentLoaded', () => {
  const addTaskForm = document.getElementById('add-task-form');
  if (addTaskForm) {
    addTaskForm.addEventListener('submit', handleAddTodoSubmit);
  }

  const addListForm = document.getElementById('add-list-form');
  if (addListForm) {
    addListForm.addEventListener('submit', addList);
  }

  document.getElementById('rename-todo-btn')?.addEventListener('click', async () => {
    const menu = document.getElementById('todo-menu');
    const todoId = Number(menu?.dataset.selectedTodoId);
    const currentTitle = menu?.dataset.selectedTodoTitle || '';

    hideTodoContextMenu();

    if (todoId && currentTitle) {
      openRenameTodoModal(todoId, currentTitle);
    }
  });

  const renameTodoForm = document.getElementById('rename-todo-form');
  if (renameTodoForm) {
    renameTodoForm.addEventListener('submit', handleRenameTodoSubmit);
  }

  // 2. Change Priority Submenu Actions
  const priorityButtons = document.querySelectorAll('#todo-menu [data-priority]');
  priorityButtons.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const priority = e.currentTarget.dataset.priority;
      const menu = document.getElementById('todo-menu');
      const todoId = Number(menu?.dataset.selectedTodoId);

      hideTodoContextMenu();

      if (todoId && priority) {
        await updateTodoDetails(todoId, { priority });
      }
    });
  });

  // 3. Delete Todo Context Menu Action
  document.getElementById('delete-todo-btn')?.addEventListener('click', async () => {
    const menu = document.getElementById('todo-menu');
    const todoId = Number(menu?.dataset.selectedTodoId);

    hideTodoContextMenu();

    if (todoId) {
      await deleteTodoItem(todoId);
    }
  });

  document.getElementById('delete-list-btn')?.addEventListener('click', async () => {
    const menu = document.getElementById('list-menu');
    const listId = menu?.dataset.selectedListId;
    hideListContextMenu();
    await deleteList(listId);
  });

  document.getElementById('rename-list-btn')?.addEventListener('click', () => {
    const menu = document.getElementById('list-menu');
    const listId = menu?.dataset.selectedListId;
    const currentTitle = menu?.dataset.selectedListTitle;

    hideListContextMenu();
    if (listId && currentTitle) {
      openRenameListModal(listId, currentTitle);
    }
  });

  // 2. Attach submit handler for the rename list modal form
  const renameListForm = document.getElementById('rename-list-form');
  if (renameListForm) {
    renameListForm.addEventListener('submit', handleRenameListSubmit);
  }

  document.addEventListener('change', async (event) => {
    const checkbox = event.target;
    if (!checkbox.classList.contains('todo-checkbox')) return;

    const todoId = Number(checkbox.dataset.id);
    if (!todoId) return;

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: checkbox.checked })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update todo');
      }

      await reloadDashboardState();
    } catch (error) {
      console.error('Error updating todo:', error);
      checkbox.checked = !checkbox.checked;
      flyToast(error.message || 'Failed to update todo', 'error');
    }
  });

  document.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('[id^="delete-btn-"]');
    if (!deleteButton) return;

    const todoId = Number(deleteButton.dataset.id);
    if (!todoId) return;

    event.preventDefault();

    const confirmed = await showConfirm('Are you sure you want to delete this todo?');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete todo');
      }

      await reloadDashboardState();
    } catch (error) {
      console.error('Error deleting todo:', error);
      flyToast(error.message || 'Failed to delete todo', 'error');
    }
  });

  loadNavbarUsername();
  loadRemainingDaysInTrial();
  loadUserLists();
  loadDashboardLists();
  renderDashboard();
  renderCount();
  dayMonth();
  loadTimeLineTodos();
});