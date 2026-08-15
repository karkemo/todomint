// import flyToast from '/node_modules/fly-toast/index.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('report-page-form');
  const submitBtn = document.getElementById('submit-btn');
  const feedbackBox = document.getElementById('form-feedback');

  const resetCategoryCards = () => {
    const cards = document.querySelectorAll('.category-card');
    cards.forEach(c => {
      c.classList.remove('border-indigo-500');
      c.classList.add('border-gray-200', 'dark:border-slate-800');
      c.querySelector('.check-badge').classList.add('hidden');
    });
    const bugCard = document.querySelector('.category-card[data-value="bug"]');
    bugCard.classList.remove('border-gray-200', 'dark:border-slate-800');
    bugCard.classList.add('border-indigo-500');
    bugCard.querySelector('.check-badge').classList.remove('hidden');
    document.getElementById('report-type').value = 'bug';
  };

  const setLoading = (isLoading) => {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle('opacity-60', isLoading);
    submitBtn.classList.toggle('cursor-not-allowed', isLoading);
    submitBtn.textContent = isLoading ? 'Sending...' : 'Send Message';
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const emailInput = document.getElementById('report-email');
    const titleInput = document.getElementById('report-title');
    const descriptionInput = document.getElementById('report-description');
    const typeInput = document.getElementById('report-type');

    const email = emailInput?.value.trim();
    const title = titleInput?.value.trim();
    const description = descriptionInput?.value.trim();
    const type = typeInput?.value;

    if (!email || !title || !description || !type) {
      flyToast('Please fill out all fields before submitting.', 'error');
      return;
    }

    feedbackBox.classList.add('hidden');
    setLoading(true);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ type, email, title, description })
      });

      let data = {};
      try {
        data = await response.json();
      } catch (_) {
        // No JSON body returned — fall through to generic message below.
      }

      if (!response.ok) {
        const message = data?.error || `Something went wrong (status ${response.status}). Please try again.`;
        flyToast(message, 'error');
        return;
      }

      flyToast('Thanks! Your report was submitted successfully.', 'success');
      form.reset();
      resetCategoryCards();
    } catch (error) {
      console.error('Report submission failed:', error);
      flyToast('Network error, please check your connection and try again.', 'error');
    } finally {
      setLoading(false);
    }
  });
});