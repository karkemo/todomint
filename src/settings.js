document.addEventListener('DOMContentLoaded', () => {
  const clearTodosBtn = document.getElementById('clear-todos-btn');
  const deleteBtn = document.getElementById('delete-account-btn');
  const nameForm = document.querySelector('#name-modal form');
  const emailForm = document.querySelector('#email-modal form');
  const passwordForm = document.querySelector('#password-modal form');
  const completedSelect = document.getElementById('completed-todos-action');
  const completedMessage = document.getElementById('completed-action-message');

  function showMessage(message, type = 'info') {
    const existing = document.getElementById('settings-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'settings-toast';
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.padding = '12px 16px';
    toast.style.borderRadius = '12px';
    toast.style.color = '#fff';
    toast.style.zIndex = '9999';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
    toast.style.backgroundColor = type === 'error' ? '#dc2626' : '#2563eb';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

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
          showMessage(result.error || 'Failed to save preference.', 'error');
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
        showMessage('New name is required', 'error');
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
          showMessage(data.error || 'Failed to update name', 'error');
          return;
        }
        showMessage('Name updated successfully', 'success');
        closeModal('name-modal');
      } catch (error) {
        console.error('Name update error:', error);
        showMessage('Network error while updating name.', 'error');
      }
    })
  }

  if (emailForm) {
    emailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newEmail = document.getElementById('new-email').value.trim();
      const currentPassword = document.getElementById('current-email-password').value;

      if (!newEmail || !currentPassword) {
        showMessage('Both new email and current password are required.', 'error');
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
          showMessage(data.error || 'Failed to update email.', 'error');
          return;
        }

        showMessage('Verification code sent to new email.', 'success');
        window.location.href = '/verify?email=' + encodeURIComponent(data.email || newEmail);
      } catch (error) {
        console.error('Email update error:', error);
        showMessage('Network error while updating email.', 'error');
      }
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;

      if (!currentPassword || !newPassword) {
        showMessage('Both current and new password are required.', 'error');
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
          showMessage(data.error || 'Failed to update password.', 'error');
          return;
        }

        showMessage('Password updated successfully.', 'success');
        closeModal('password-modal');
      } catch (error) {
        console.error('Password update error:', error);
        showMessage('Network error while updating password.', 'error');
      }
    });
  }

  if (clearTodosBtn) {
    clearTodosBtn.addEventListener('click', async () => {
      const confirmed = confirm('Are you sure you want to delete all todos? This action cannot be undone.');
      if (!confirmed) return;

      try {
        clearTodosBtn.disabled = true;
        clearTodosBtn.innerText = 'Clearing...';

        const response = await fetch('/api/todos', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })

        const data = await response.json();

        if (response.ok && data.success) {
          showMessage('Your Todos has been deleted.', 'success');
        } else {
          showMessage(data.error || 'Failed to delete todos. Please try again.', 'error');
          clearTodosBtn.disabled = false;
          clearTodosBtn.innerText = 'Clear Todos';
        }
      } catch (error) {
        console.error('Error during todos deletion:', error);
        showMessage('A network error occurred. Please try again.', 'error');
        clearTodosBtn.disabled = false;
        clearTodosBtn.innerText = 'Clear Todos';
      }
    })
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone.');
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
          showMessage('Your account has been deleted.', 'success');
          window.location.href = '/login';
        } else {
          showMessage(data.error || 'Failed to delete account. Please try again.', 'error');
          deleteBtn.disabled = false;
          deleteBtn.innerText = 'Delete Account';
        }
      } catch (error) {
        console.error('Error during account deletion:', error);
        showMessage('A network error occurred. Please try again.', 'error');
        deleteBtn.disabled = false;
        deleteBtn.innerText = 'Delete Account';
      }
    });
  }

  refreshCompletedAction();
});