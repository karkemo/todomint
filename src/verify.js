document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('verify-form');
  const errorEl = document.getElementById('error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const code = document.getElementById('code').value.trim();
    if (!/^[0-9]{6}$/.test(code)) {
      errorEl.textContent = 'Please enter a valid 6-digit code.';
      return;
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const email = params.get('email');
      if (!email) {
        errorEl.textContent = 'Missing email parameter. Use the verification link sent to your email.';
        return;
      }

      const body = { email, code };

      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.error || 'Verification failed';
        return;
      }

      // redirect on success
      if (data.redirectTo) {
        window.location = data.redirectTo;
      } else {
        window.location = '/dashboard';
      }
    } catch (err) {
      console.error(err);
      errorEl.textContent = 'Network error';
    }
  });
});