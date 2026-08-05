document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('email');
  const form = document.getElementById('create-password-form');
  const errorEl = document.getElementById('error');

  const storedEmail = sessionStorage.getItem('reset_email');
  if (!storedEmail) {
    // nothing to do, send user back to login
    window.location = '/login';
    return;
  }

  emailInput.value = storedEmail;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const newPassword = document.getElementById('new-password').value;
    if (!newPassword || newPassword.trim().length < 6) {
      errorEl.textContent = 'Password must be at least 6 characters.';
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: storedEmail, newPassword })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        errorEl.textContent = data.error || 'Failed to reset password';
        return;
      }

      // clear stored email and redirect to login
      sessionStorage.removeItem('reset_email');
      window.location = '/login';
    } catch (err) {
      console.error(err);
      errorEl.textContent = 'Network error';
    }
  });
});
