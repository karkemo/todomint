document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgot-form');
  const errorEl = document.getElementById('error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const email = document.getElementById('email').value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorEl.textContent = 'Please enter a valid email address.';
      return;
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        errorEl.textContent = data.error || 'Failed to send verification code';
        return;
      }

      // store email in sessionStorage for reset flow and redirect to verify
      sessionStorage.setItem('reset_email', email);
      window.location = '/verify?type=reset';
    } catch (err) {
      console.error(err);
      errorEl.textContent = 'Network error';
    }
  });
});
