function initCalendar() {
  const monthYearLabel = document.getElementById('calendar-month-year');
  const daysGrid = document.getElementById('calendar-days-grid');
  const prevBtn = document.getElementById('prev-month-btn');
  const nextBtn = document.getElementById('next-month-btn');
  const selectedDayLabel = document.getElementById('selected-day-label');
  const selectedDayTodos = document.getElementById('selected-day-todos');

  if (!monthYearLabel || !daysGrid || !prevBtn || !nextBtn || !selectedDayLabel || !selectedDayTodos) return;

  let completedTodosPreference = 'keep';
  let completedTodosPreferenceLoaded = false;
  let currentDate = new Date();
  const today = new Date();
  let allTodos = [];
  let selectedDateKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  window.selectedCalendarDate = selectedDateKey;

  function formatDateKey(year, month, day) {
    const y = year;
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDisplayDate(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  }

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
      console.error('Error loading completed todos preference for calendar:', error);
      completedTodosPreference = 'keep';
    }

    completedTodosPreferenceLoaded = true;
    return completedTodosPreference;
  }

  function shouldShowTodoInCalendar(todo, action = completedTodosPreference) {
    if (action === 'move' && todo?.is_completed === 1) {
      return false;
    }

    return true;
  }

  function getTodosForDate(dateKey) {
    return allTodos.filter(todo => {
      if (!todo?.due_date) return false;
      if (!shouldShowTodoInCalendar(todo)) return false;
      return String(todo.due_date).split('T')[0] === dateKey;
    });
  }

  function updateSelectedDayTodos() {
    const todosForSelectedDay = getTodosForDate(selectedDateKey);
    selectedDayLabel.textContent = todosForSelectedDay.length > 0
      ? `Todos For ${formatDisplayDate(selectedDateKey)}`
      : `No Todos For ${formatDisplayDate(selectedDateKey)}`;

    selectedDayTodos.innerHTML = '';

    if (todosForSelectedDay.length === 0) {
      const emptyState = document.createElement('p');
      emptyState.className = 'text-sm text-gray-500 dark:text-gray-400';
      emptyState.textContent = 'No todos for this day.';
      selectedDayTodos.appendChild(emptyState);
      return;
    }

    todosForSelectedDay.forEach(todo => {
      const todoElement = typeof window.createTodoElement === 'function'
        ? window.createTodoElement(todo)
        : (() => {
          const fallback = document.createElement('div');
          fallback.className = 'rounded-lg border border-gray-200/80 bg-white px-4 py-3 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-gray-200';
          fallback.textContent = todo?.title || 'Todo';
          return fallback;
        })();
      selectedDayTodos.appendChild(todoElement);
    });
  }

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    monthYearLabel.textContent = `${monthName} ${year}`;

    daysGrid.innerHTML = '';

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const lastDayOfPrevMonth = new Date(year, month, 0).getDate();

    for (let i = firstDayIndex; i > 0; i--) {
      const prevDay = lastDayOfPrevMonth - i + 1;
      const span = document.createElement('span');
      span.className = 'py-2.5 text-gray-300 dark:text-gray-700 cursor-default';
      span.textContent = prevDay;
      daysGrid.appendChild(span);
    }

    for (let day = 1; day <= lastDayOfMonth; day++) {
      const button = document.createElement('button');
      const dateKey = formatDateKey(year, month, day);
      const todosForDate = getTodosForDate(dateKey);
      // const hasTodos = todosForDate.length > 0;
      const hasUncheckedTodos = todosForDate.some(todo =>
        todo?.is_completed !== 1 && todo?.is_completed !== true && todo?.completed !== true
      );
      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const isSelected = dateKey === selectedDateKey;

      button.type = 'button';
      button.dataset.date = dateKey;
      button.className = isSelected || isToday
        ? 'py-2.5 rounded-xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20 transition-transform active:scale-95 cursor-pointer'
        : 'py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800/80 transition-colors active:scale-95 text-gray-800 dark:text-gray-200 cursor-pointer';

      button.innerHTML = `
        <div class="flex flex-col items-center justify-center gap-1">
          <span>${day}</span>
          ${hasUncheckedTodos ? '<span class="h-1.5 w-1.5 rounded-full bg-current"></span>' : ''}
        </div>
      `;

      button.addEventListener('click', () => {
        selectedDateKey = dateKey;
        window.selectedCalendarDate = dateKey;
        renderCalendar();
        updateSelectedDayTodos();
        if (typeof window.syncAddTaskModalDate === 'function') {
          window.syncAddTaskModalDate();
        }
      });

      daysGrid.appendChild(button);
    }

    const totalRendered = firstDayIndex + lastDayOfMonth;
    const nextDaysNeeded = (7 - (totalRendered % 7)) % 7;

    for (let j = 1; j <= nextDaysNeeded; j++) {
      const span = document.createElement('span');
      span.className = 'py-2.5 text-gray-300 dark:text-gray-700 cursor-default';
      span.textContent = j;
      daysGrid.appendChild(span);
    }
  };

  prevBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  nextBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  document.addEventListener('todosLoaded', async (event) => {
    const action = await getCompletedTodosPreference();
    allTodos = (event.detail?.todos || []).filter((todo) => shouldShowTodoInCalendar(todo, action));
    renderCalendar();
    updateSelectedDayTodos();
  });

  renderCalendar();
  updateSelectedDayTodos();
}

document.addEventListener('DOMContentLoaded', initCalendar);
window.initCalendar = initCalendar;