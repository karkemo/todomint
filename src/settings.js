

document.addEventListener('DOMContentLoaded', () => {
  const deleteBtn = document.getElementById('delete-account-btn');

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone.');
      
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
          alert('Your account has been deleted.');
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
})