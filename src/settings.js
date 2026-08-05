import flyToast from '/node_modules/fly-toast/index.js';

document.addEventListener('DOMContentLoaded', () => {
  const clearTodosBtn = document.getElementById('clear-todos-btn');
  const clearTodosBtnText = document.getElementById('clear-btn-text');
  const deleteBtn = document.getElementById('delete-account-btn');
  const nameForm = document.querySelector('#name-modal form');
  const emailForm = document.querySelector('#email-modal form');
  const passwordForm = document.querySelector('#password-modal form');
  const completedSelect = document.getElementById('completed-todos-action');
  const completedMessage = document.getElementById('completed-action-message');

  async function refreshCompletedAction() {
    if (!completedSelect) return;
    try {
      const response = await fetch('/api/user');
      const data = await response.json();
      if (response.ok && data.completed_todos_action) {
        completedSelect.value = data.completed_todos_action;
      }
    } catch (error) {
      console.error('Failed to load completed action preference:', error);
    }
  }

  if (completedSelect) {
    completedSelect.addEventListener('change', async () => {
      const action = completedSelect.value;
      if (completedMessage) {
        completedMessage.textContent = 'Saving preference...';
      }

      try {
        const response = await fetch('/api/settings/completed-action', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        });
        const result = await response.json();
        if (!response.ok) {
          completedMessage.textContent = result.error || 'Failed to save preference.';
          completedMessage.classList.add('text-red-500');
          flyToast(result.error || 'Failed to save preference.', 'error', 4, { position: 'top-right' });
          return;
        }
        completedMessage.textContent = 'Preference saved.';
        completedMessage.classList.remove('text-red-500');
        completedMessage.classList.add('text-emerald-500');
        setTimeout(() => {
          if (completedMessage) completedMessage.textContent = '';
        }, 3000);
      } catch (error) {
        console.error('Error saving completed action preference:', error);
        if (completedMessage) {
          completedMessage.textContent = 'Network error while saving preference.';
          completedMessage.classList.add('text-red-500');
        }
        showMessage('Network error while saving preference.', 'error');
      }
    });
  }

  if (nameForm) {
    nameForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newName = document.getElementById('new-name').value.trim();

      if (!newName) {
        flyToast('New name is required', 'error');
        return;
      }

      try {
        const response = await fetch('/api/settings/name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newName })
        });
        const data = await response.json();
        if (!response.ok) {
          flyToast(data.error || 'Failed to update name', 'error');
          return;
        }
        flyToast('Name updated successfully', 'success');
        closeModal('name-modal');
      } catch (error) {
        console.error('Name update error:', error);
        flyToast('Network error while updating name.', 'error');
      }
    })
  }

  if (emailForm) {
    emailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newEmail = document.getElementById('new-email').value.trim();
      const currentPassword = document.getElementById('current-email-password').value;

      if (!newEmail || !currentPassword) {
        flyToast('Both new email and current password are required.', 'error');
        return;
      }

      try {
        const response = await fetch('/api/settings/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newEmail, currentPassword })
        });
        const data = await response.json();
        if (!response.ok) {
          flyToast(data.error || 'Failed to update email.', 'error');
          return;
        }

        flyToast('Verification code sent to new email.', 'success');
        window.location.href = '/verify?email=' + encodeURIComponent(data.email || newEmail);
      } catch (error) {
        console.error('Email update error:', error);
        flyToast('Network error while updating email.', 'error');
      }
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;

      if (!currentPassword || !newPassword) {
        flyToast('Both current and new password are required.', 'error');
        return;
      }

      try {
        const response = await fetch('/api/settings/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await response.json();
        if (!response.ok) {
          flyToast(data.error || 'Failed to update password.', 'error');
          return;
        }

        flyToast('Password updated successfully.', 'success');
        closeModal('password-modal');
      } catch (error) {
        console.error('Password update error:', error);
        flyToast('Network error while updating password.', 'error');
      }
    });
  }

  if (clearTodosBtn && clearTodosBtnText) {
    clearTodosBtn.addEventListener('click', async () => {
      // const confirmed = confirm('Are you sure you want to delete all todos? This action cannot be undone.'); 
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

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const confirmed = await showConfirm('Are you sure you want to delete your account? This action cannot be undone.', 'Delete Your Account?');
      if (!confirmed) return;

      try {
        deleteBtn.disabled = true;
        deleteBtn.innerText = 'Deleting...';

        const response = await fetch('/api/user', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        if (response.ok && data.success) {
          flyToast('Your account has been deleted.', 'success');
          window.location.href = '/login';
        } else {
          flyToast(data.error || 'Failed to delete account. Please try again.', 'error');
          deleteBtn.disabled = false;
          deleteBtn.innerText = 'Delete Account';
        }
      } catch (error) {
        console.error('Error during account deletion:', error);
        flyToast('A network error occurred. Please try again.', 'error');
        deleteBtn.disabled = false;
        deleteBtn.innerText = 'Delete Account';
      }
    });
  }

  refreshCompletedAction();
});