async function loadNavbarUsername() {
  try {
    const response = await fetch('/api/user/name');

    if (!response.ok) throw new Error('Failed to fetch name');

    const data = await response.json();

    const userNameElement = document.getElementById('username');
    if (userNameElement) {
      userNameElement.textContent = data.name[0].toUpperCase();
    }
  } catch (error) {
    console.error('Error loading username:', error);
  }
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function dispatchTodosLoaded(todos) {
  document.dispatchEvent(new CustomEvent('todosLoaded', { detail: { todos } }));
}

async function loadDashboardTodos() {
  const todosContainer = document.getElementById('todos-list');
  if (!todosContainer) return;

  try {
    const response = await fetch('/api/todos');
    if (!response.ok) throw new Error('Failed to fetch todos');

    const todos = await response.json();
    const todosForToday = todos.filter(isTodoDueToday);

    dispatchTodosLoaded(todos);

    todosContainer.innerHTML = '';

    if (todosForToday.length === 0) {
      todosContainer.innerHTML = '<div id="no-todos" class="w-full flex flex-col items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0,0,256,256" width="50px" height="50px" fill-rule="nonzero"><g fill="#fcd462" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(5.12,5.12)"><path d="M24.90625,3.96875c-0.04297,0.00781 -0.08594,0.01953 -0.125,0.03125c-0.46484,0.10547 -0.79297,0.52344 -0.78125,1v6c-0.00391,0.35938 0.18359,0.69531 0.49609,0.87891c0.3125,0.17969 0.69531,0.17969 1.00781,0c0.3125,-0.18359 0.5,-0.51953 0.49609,-0.87891v-6c0.01172,-0.28906 -0.10547,-0.56641 -0.3125,-0.76172c-0.21094,-0.19922 -0.49609,-0.29687 -0.78125,-0.26953zM10.65625,9.84375c-0.375,0.06641 -0.67578,0.33984 -0.78125,0.70313c-0.10547,0.36719 0.00391,0.75781 0.28125,1.01563l4.25,4.25c0.24219,0.29688 0.62891,0.43359 1.00391,0.34766c0.37109,-0.08594 0.66406,-0.37891 0.75,-0.75c0.08594,-0.375 -0.05078,-0.76172 -0.34766,-1.00391l-4.25,-4.25c-0.20703,-0.22266 -0.50781,-0.33594 -0.8125,-0.3125c-0.03125,0 -0.0625,0 -0.09375,0zM39.03125,9.84375c-0.22656,0.03125 -0.4375,0.14453 -0.59375,0.3125l-4.25,4.25c-0.29687,0.24219 -0.43359,0.62891 -0.34766,1.00391c0.08594,0.37109 0.37891,0.66406 0.75,0.75c0.375,0.08594 0.76172,-0.05078 1.00391,-0.34766l4.25,-4.25c0.3125,-0.29687 0.40234,-0.76172 0.21875,-1.15234c-0.1875,-0.39453 -0.60156,-0.62109 -1.03125,-0.56641zM25,15c-5.51562,0 -10,4.48438 -10,10c0,5.51563 4.48438,10 10,10c5.51563,0 10,-4.48437 10,-10c0,-5.51562 -4.48437,-10 -10,-10zM4.71875,24c-0.55078,0.07813 -0.9375,0.58984 -0.85937,1.14063c0.07813,0.55078 0.58984,0.9375 1.14063,0.85938h6c0.35938,0.00391 0.69531,-0.18359 0.87891,-0.49609c0.17969,-0.3125 0.17969,-0.69531 0,-1.00781c-0.18359,-0.3125 -0.51953,-0.5 -0.87891,-0.49609h-6c-0.03125,0 -0.0625,0 -0.09375,0c-0.03125,0 -0.0625,0 -0.09375,0c-0.03125,0 -0.0625,0 -0.09375,0zM38.71875,24c-0.55078,0.07813 -0.9375,0.58984 -0.85937,1.14063c0.07813,0.55078 0.58984,0.9375 1.14063,0.85938h6c0.35938,0.00391 0.69531,-0.18359 0.87891,-0.49609c0.17969,-0.3125 0.17969,-0.69531 0,-1.00781c-0.18359,-0.3125 -0.51953,-0.5 -0.87891,-0.49609h-6c-0.03125,0 -0.0625,0 -0.09375,0c-0.03125,0 -0.0625,0 -0.09375,0c-0.03125,0 -0.0625,0 -0.09375,0zM15,33.875c-0.22656,0.03125 -0.4375,0.14453 -0.59375,0.3125l-4.25,4.25c-0.29687,0.24219 -0.43359,0.62891 -0.34766,1.00391c0.08594,0.37109 0.37891,0.66406 0.75,0.75c0.375,0.08594 0.76172,-0.05078 1.00391,-0.34766l4.25,-4.25c0.29688,-0.28516 0.38672,-0.72656 0.22656,-1.10547c-0.15625,-0.37891 -0.53516,-0.62109 -0.94531,-0.61328c-0.03125,0 -0.0625,0 -0.09375,0zM34.6875,33.875c-0.375,0.06641 -0.67578,0.33984 -0.78125,0.70313c-0.10547,0.36719 0.00391,0.75781 0.28125,1.01563l4.25,4.25c0.24219,0.29688 0.62891,0.43359 1.00391,0.34766c0.37109,-0.08594 0.66406,-0.37891 0.75,-0.75c0.08594,-0.375 -0.05078,-0.76172 -0.34766,-1.00391l-4.25,-4.25c-0.1875,-0.19922 -0.44531,-0.30859 -0.71875,-0.3125c-0.03125,0 -0.0625,0 -0.09375,0c-0.03125,0 -0.0625,0 -0.09375,0zM24.90625,37.96875c-0.04297,0.00781 -0.08594,0.01953 -0.125,0.03125c-0.46484,0.10547 -0.79297,0.52344 -0.78125,1v6c-0.00391,0.35938 0.18359,0.69531 0.49609,0.87891c0.3125,0.17969 0.69531,0.17969 1.00781,0c0.3125,-0.18359 0.5,-0.51953 0.49609,-0.87891v-6c0.01172,-0.28906 -0.10547,-0.56641 -0.3125,-0.76172c-0.21094,-0.19922 -0.49609,-0.29687 -0.78125,-0.26953z"></path></g></g></svg><p>No Todos For Today, Enjoy your free time.</p></div>';
      return;
    }

    todosForToday.forEach(todo => {
      const todoElement = createTodoElement(todo);
      todosContainer.appendChild(todoElement);
    });

    const countElement = document.getElementById('todos-count');
    if (countElement) {
      countElement.textContent = `(${todos.length})`;
    }

  } catch (error) {
    console.error('Error loading todos:', error);
    todosContainer.innerHTML = '<p class="text-red-500 py-2">Failed to load tasks.</p>';
  }
}

async function loadUserLists() {
  const selectElement = document.getElementById('task-list');
  if (!selectElement) return;

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
      if (index === 0) option.selected = true;
      selectElement.appendChild(option);
    })
  } catch (err) {
    console.error('Error loading lists', err);
    selectElement.innerHTML = '<option value="" disabled>No lists found</option>';
  }
}

async function handleAddTodoSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const titleInput = document.getElementById('task-title');
  const dueDateInput = document.getElementById('task-date');
  const priorityInput = document.getElementById('task-priority');
  const listInput = document.getElementById('task-list');
  const modal = document.getElementById('add_task_modal');

  const title = titleInput?.value.trim();
  const dueDate = dueDateInput?.value || null;
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
  } catch (error) {
    console.error('Error creating todo:', error);
    alert(error.message || 'Failed to create todo');
  }
}

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
      <button data-id="${todo.id}" class="delete-btn opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  `;

  return li;
}

function getCurrentView() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('view') || 'home';
}

function navigateTo(viewName) {
  window.history.pushState({ view: viewName }, '', `${window.location.pathname}?view=${viewName}`);
  renderDashboard();
}

async function renderDashboard() {
  const currentView = getCurrentView();
  const main = document.getElementById('main-content');
  if (!main) return;

  switch (currentView) {
    case 'today':
      main.innerHTML = renderTodayLayout();
      const dueDateInput = document.getElementById('task-date');
      if (dueDateInput) {
        dueDateInput.value = getTodayDateString();
      }
      break;
    case 'home':
    default:
      main.innerHTML = renderHomeLayout();
      break;
  }

  if (typeof window.initCalendar === 'function') {
    window.initCalendar();
  }

  updateShowDate();
  await loadDashboardTodos();
}

function renderHomeLayout() {
  return `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
      <!-- Section 1: Todos -->
      <div class="w-full flex flex-col items-start justify-start gap-6">
        <div class="w-fit flex flex-col items-start justify-center gap-1">
          <h1 class="text-3xl font-bold">Today's Todos</h1>
          <p id="show-date" class="font-semibold text-gray-500 dark:text-gray-400">"Saturday, July 25"</p>
        </div>
        <ul class="w-full flex flex-col gap-3" id="todos-list"></ul>
        <button onclick="document.getElementById('add_task_modal').showModal()"
          class="btn btn-primary btn-outline w-full">Add Todo +</button>
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
              <button id="prev-month-btn" aria-label="Previous month" class="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button id="next-month-btn" aria-label="Next month" class="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all">
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
          <div id="selected-day-todos" class="w-full flex flex-col gap-3"></div>
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
      <ul class="w-full flex flex-col gap-3" id="todos-list"></ul>
      <button onclick="document.getElementById('add_task_modal').showModal()" class="btn btn-primary btn-outline w-full">Add Todo +</button>
    </div>
  `;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g,
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

window.addEventListener('popstate', renderDashboard);

document.addEventListener('DOMContentLoaded', () => {
  const addTaskForm = document.getElementById('add-task-form');
  if (addTaskForm) {
    addTaskForm.addEventListener('submit', handleAddTodoSubmit);
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

      await loadDashboardTodos();
    } catch (error) {
      console.error('Error updating todo:', error);
      checkbox.checked = !checkbox.checked;
      alert(error.message || 'Failed to update todo');
    }
  });

  document.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('.delete-btn');
    if (!deleteButton) return;

    const todoId = Number(deleteButton.dataset.id);
    if (!todoId) return;

    event.preventDefault();

    const confirmed = window.confirm('Are you sure you want to delete this todo?');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete todo');
      }

      await loadDashboardTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
      alert(error.message || 'Failed to delete todo');
    }
  });

  loadNavbarUsername();
  loadUserLists();
  renderDashboard();
});