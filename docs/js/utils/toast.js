/**
 * toast.js — Notificaciones emergentes accesibles
 */

export function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }

  const toastEl = document.createElement('div');
  const bgClass = type === 'danger' || type === 'error' ? 'text-bg-danger' :
                  type === 'success' ? 'text-bg-success' :
                  type === 'warning' ? 'text-bg-warning' : 'text-bg-primary';

  toastEl.className = `toast align-items-center ${bgClass} border-0 show mb-2`;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Cerrar"></button>
    </div>
  `;

  toastEl.querySelector('.btn-close').addEventListener('click', () => {
    toastEl.remove();
  });

  container.appendChild(toastEl);

  setTimeout(() => {
    if (toastEl.parentElement) {
      toastEl.classList.remove('show');
      setTimeout(() => toastEl.remove(), 300);
    }
  }, duration);
}
