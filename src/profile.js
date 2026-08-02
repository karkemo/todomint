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
  loadAvatar();
  loadUserData();
})