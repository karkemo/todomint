// import flyToast from '/node_modules/fly-toast/index.js';

async function loadAvatar() {
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

async function loadUserData() {
  try {
    const response = await fetch('/api/user');
    if (!response.ok) throw new Error('Failed to fetch user data');

    const data = await response.json();

    const id = data.id;
    const email = data.email;
    const created_at = data.created_at;
    const name = data.name;

    const idElement = document.getElementById('id');
    const emailElement = document.getElementById('email');
    const createdAtElement = document.getElementById('createdAt');
    const nameElement = document.getElementById('name');

    if (idElement && emailElement && createdAtElement && nameElement) {
      idElement.textContent = id;
      emailElement.textContent = email;
      createdAtElement.textContent = created_at;
      nameElement.textContent = name;
    }
  } catch (error) {
    console.error('Error loading user data', error)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const deleteBtn = document.getElementById('delete-account-btn');
  const clearTodosBtn = document.getElementById('clear-todos-btn');
  const clearTodosBtnText = document.getElementById('clear-btn-text');

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const confirmed = await showConfirm('Are you sure you want to delete your account? This action cannot be undone.', 'Delete Your account?');
      
      if (!confirmed) return;

      try {
        deleteBtn.disabled = true;
        deleteBtn.innerText = 'Deleting...';

        const response = await fetch('/api/user', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (response.ok && data.success) {
          flyToast('Your account has been deleted.', 'success');
          window.location.href = '/login'; 
        } else {
          alert(data.error || 'Failed to delete account. Please try again.');
          deleteBtn.disabled = false;
          deleteBtn.innerText = 'Delete Account';
        }
      } catch (error) {
        console.error('Error during account deletion:', error);
        alert('A network error occurred. Please try again.');
        deleteBtn.disabled = false;
        deleteBtn.innerText = 'Delete Account';
      }
    });
  }

  if (clearTodosBtn && clearTodosBtnText) {
    clearTodosBtn.addEventListener('click', async () => {
      const confirmed = await showConfirm('Are you sure you want to delete all todos? This action cannot be undone.', 'Delete All Todos?');
      if (!confirmed) return;

      try {
        clearTodosBtn.disabled = true;
        clearTodosBtnText.innerText = 'Clearing...';

        const response = await fetch('/api/todos', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })

        const data = await response.json();

        if (response.ok && data.success) {
          flyToast('Your Todos has been deleted.', 'success');
          clearTodosBtnText.innerText = 'Clear Todos';
          clearTodosBtn.disabled = false;
        } else {
          flyToast(data.error || 'Failed to delete todos. Please try again.', 'error');
          clearTodosBtn.disabled = false;
          clearTodosBtnText.innerText = 'Clear Todos';
        }
      } catch (error) {
        console.error('Error during todos deletion:', error);
        flyToast('A network error occurred. Please try again.', 'error');
        clearTodosBtn.disabled = false;
        clearTodosBtnText.innerText = 'Clear Todos';
      }
    })
  }
  loadAvatar();
  loadUserData();
})