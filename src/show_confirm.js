function injectConfirmModalStyles() {
  if (document.getElementById('custom-confirm-modal-styles')) return;

  const style = document.createElement('style');
  style.id = 'custom-confirm-modal-styles';
  style.textContent = /*css*/`
    #confirm-cancel-btn {
      transition: background-color 150ms ease, color 150ms ease, transform 150ms ease;
    }
    #confirm-cancel-btn:hover {
      background-color: #f8fafc;
    }
    .dark #confirm-cancel-btn:hover {
      background-color: #111d41;
    }
    #confirm-ok-btn {
      transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
    }
    #confirm-ok-btn:hover {
      transform: translateY(-1px) scale(1.03);
      box-shadow: 0 16px 36px rgba(220, 38, 38, 0.22);
      background-color: #c26579;
      color: #fff;
    }
    .dark #confirm-ok-btn:hover {
      background-color: #f56565;
    }
  `;
  document.head.appendChild(style);
}

function createModalDOM() {
  injectConfirmModalStyles();
  if (document.getElementById('custom-confirm-modal')) return;

  const modalHtml = /*html*/`
    <div id="custom-confirm-modal" class="fixed inset-0 z-1020 hidden items-center justify-center bg-black/0 backdrop-blur-none transition-opacity duration-200 ease-out opacity-0 font-sans">
      <div id="custom-confirm-box" class="bg-white dark:bg-[#131f38] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm shadow-2xl space-y-4 m-4 transform scale-95 opacity-0 transition-transform duration-200 ease-out">
        
        <div class="space-y-1.5">
          <h3 id="confirm-title" class="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Attention</h3>
          <p id="confirm-message" class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Are you sure?</p>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3">
          <button id="confirm-cancel-btn" type="button" class="px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 cursor-pointer transition-colors duration-150">
            Cancel
          </button>
          <button id="confirm-ok-btn" type="button" class="px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-600 dark:hover:bg-slate-800 active:scale-95 cursor-pointer transition-colors duration-150">
            Confirm
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function showConfirm(message, title = 'Are you sure?') {
  createModalDOM();

  return new Promise((resolve) => {
    const modal = document.getElementById('custom-confirm-modal');
    const box = document.getElementById('custom-confirm-box');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');

    titleEl.innerText = title;
    messageEl.innerText = message;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    requestAnimationFrame(() => {
      modal.classList.remove('bg-black/0', 'backdrop-blur-none', 'opacity-0');
      modal.classList.add('bg-black/40', 'backdrop-blur-sm', 'opacity-100');
      
      box.classList.remove('scale-95', 'opacity-0');
      box.classList.add('scale-100', 'opacity-100');
    });

    const cleanup = (result) => {
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', handleCancel);

      modal.classList.remove('bg-black/40', 'backdrop-blur-sm', 'opacity-100');
      modal.classList.add('bg-black/0', 'backdrop-blur-none', 'opacity-0');

      box.classList.remove('scale-100', 'opacity-100');
      box.classList.add('scale-95', 'opacity-0');

      setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        resolve(result);
      }, 200);
    };

    const handleOk = () => cleanup(true);
    const handleCancel = () => cleanup(false);

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
  });
}