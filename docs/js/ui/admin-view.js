/**
 * admin-view.js — Interfaz del módulo de ADMINISTRACIÓN
 * Gestión de autenticación, usuarios, sesiones de invitado de 5 min y switch de soporte.
 */

import { showToast } from '../utils/toast.js';
import { ENDPOINTS } from '../config.js?v=2.5';

export class AdminView {
  #currentUser = null;
  #guestTimerInterval = null;

  constructor() {
    this.#loadSession();
    this.#initDOM();
    this.#initEvents();
  }

  #loadSession() {
    try {
      const saved = localStorage.getItem('iot_user');
      if (saved) {
        this.#currentUser = JSON.parse(saved);
      }
    } catch (_) {}
  }

  #initDOM() {
    this.updateUserBadge();
  }

  #initEvents() {
    // Escuchar activación de pestaña administración
    window.addEventListener('view:admin:active', () => {
      this.refreshData();
    });

    // Botón abrir login modal
    const openLoginBtn = document.getElementById('btn-open-login-modal');
    if (openLoginBtn) {
      openLoginBtn.addEventListener('click', () => {
        document.getElementById('loginModal')?.removeAttribute('hidden');
      });
    }

    // Formulario de login
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.#handleLogin(e));
    }

    // Botón logout
    const logoutBtn = document.getElementById('btn-admin-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.#handleLogout());
    }

    // Formulario crear usuario
    const userForm = document.getElementById('form-crear-usuario');
    if (userForm) {
      userForm.addEventListener('submit', (e) => this.#handleCrearUsuario(e));
    }

    // Interruptor de soporte administrativo
    const toggleSupport = document.getElementById('switch-soporte-admin');
    if (toggleSupport) {
      toggleSupport.addEventListener('change', (e) => this.#handleToggleSupport(e.target.checked));
    }

    // Botón iniciar sesión invitado (5 min)
    const btnInvitado = document.getElementById('btn-iniciar-invitado');
    if (btnInvitado) {
      btnInvitado.addEventListener('click', () => this.#handleIniciarInvitado());
    }
  }

  updateUserBadge() {
    const badge = document.getElementById('admin-user-status');
    const loginModalBtn = document.getElementById('btn-open-login-modal');
    const logoutBtn = document.getElementById('btn-admin-logout');
    const adminPanel = document.getElementById('admin-panel-content');
    const loginPrompt = document.getElementById('admin-login-prompt');

    if (this.#currentUser) {
      if (badge) {
        badge.innerHTML = `<i class="bi bi-person-check-fill text-success"></i> ${this.#currentUser.email} (${this.#currentUser.rol || 'USUARIO'})`;
      }
      if (loginModalBtn) loginModalBtn.classList.add('d-none');
      if (logoutBtn) logoutBtn.classList.remove('d-none');
      if (adminPanel) adminPanel.classList.remove('d-none');
      if (loginPrompt) loginPrompt.classList.add('d-none');
    } else {
      if (badge) {
        badge.innerHTML = `<i class="bi bi-person-x text-warning"></i> Sesión no iniciada`;
      }
      if (loginModalBtn) loginModalBtn.classList.remove('d-none');
      if (logoutBtn) logoutBtn.classList.add('d-none');
      if (adminPanel) adminPanel.classList.add('d-none');
      if (loginPrompt) loginPrompt.classList.remove('d-none');
    }
  }

  async #handleLogin(e) {
    e.preventDefault();
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const email = emailInput?.value.trim();
    const password = passInput?.value;

    if (!email || !password) return;

    if (submitBtn) submitBtn.disabled = true;

    try {
      const resp = await fetch(`${ENDPOINTS.HTTP_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Credenciales inválidas');
      }

      const data = await resp.json();
      this.#currentUser = data.usuario;
      localStorage.setItem('iot_user', JSON.stringify(this.#currentUser));
      if (data.token) localStorage.setItem('iot_token', data.token);

      showToast(`Bienvenido ${this.#currentUser.email} (${this.#currentUser.rol})`, 'success');
      this.updateUserBadge();

      // Cerrar modal
      const modalEl = document.getElementById('loginModal');
      if (modalEl) modalEl.setAttribute('hidden', '');
      if (modalEl && window.bootstrap?.Modal) {
        const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
        modalInstance?.hide();
      }

      this.refreshData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  #handleLogout() {
    this.#currentUser = null;
    localStorage.removeItem('iot_user');
    localStorage.removeItem('iot_token');
    if (this.#guestTimerInterval) clearInterval(this.#guestTimerInterval);
    this.updateUserBadge();
    showToast('Sesión cerrada correctamente', 'info');
  }

  async refreshData() {
    if (!this.#currentUser) return;
    await Promise.allSettled([
      this.cargarUsuarios(),
      this.cargarAuditoria()
    ]);
  }

  async cargarUsuarios() {
    const tableBody = document.getElementById('tabla-usuarios-body');
    if (!tableBody) return;

    try {
      const resp = await fetch(`${ENDPOINTS.HTTP_BASE}/admin/usuarios`);
      if (!resp.ok) throw new Error('No se pudo cargar la lista de usuarios');
      const usuarios = await resp.json();

      if (!usuarios || usuarios.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay usuarios registrados</td></tr>';
        return;
      }

      tableBody.innerHTML = usuarios.map(u => `
        <tr>
          <td><strong>#${u.id}</strong></td>
          <td>${u.email}</td>
          <td><span class="badge ${u.rol_id === 1 ? 'bg-danger' : u.rol_id === 2 ? 'bg-primary' : 'bg-secondary'}">${u.rol || (u.rol_id === 1 ? 'ADMIN' : 'USUARIO')}</span></td>
          <td>${u.activo ? '<span class="text-success"><i class="bi bi-check-circle-fill"></i> Activo</span>' : '<span class="text-danger"><i class="bi bi-x-circle-fill"></i> Inactivo</span>'}</td>
          <td>${u.creado_en ? new Date(u.creado_en).toLocaleString() : '—'}</td>
        </tr>
      `).join('');
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${err.message}</td></tr>`;
    }
  }

  async #handleCrearUsuario(e) {
    e.preventDefault();
    const email = document.getElementById('nuevo-usuario-email')?.value.trim();
    const pass = document.getElementById('nuevo-usuario-password')?.value;
    const rolId = parseInt(document.getElementById('nuevo-usuario-rol')?.value, 10);

    if (!email || !pass || !rolId) return;

    try {
      const resp = await fetch(`${ENDPOINTS.HTTP_BASE}/admin/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, rol_id: rolId })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al crear usuario');
      }

      showToast(`Usuario ${email} registrado exitosamente`, 'success');
      e.target.reset();
      this.cargarUsuarios();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  async #handleToggleSupport(habilitado) {
    const statusLabel = document.getElementById('soporte-status-label');
    try {
      const resp = await fetch(`${ENDPOINTS.HTTP_BASE}/admin/soporte/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculo_id: 1,
          habilitado: habilitado,
          motivo: habilitado ? 'Soporte activado por Administrador' : 'Soporte desactivado'
        })
      });

      if (!resp.ok) throw new Error('Fallo al registrar estado de soporte');
      const data = await resp.json();

      if (statusLabel) {
        statusLabel.textContent = habilitado ? 'ACTIVO (Autorizado)' : 'INACTIVO';
        statusLabel.className = habilitado ? 'text-success fw-bold' : 'text-muted';
      }

      showToast(`Soporte técnico ${habilitado ? 'ACTIVADO' : 'DESACTIVADO'}`, habilitado ? 'warning' : 'info');
      this.cargarAuditoria();
    } catch (err) {
      showToast(err.message, 'danger');
      const toggle = document.getElementById('switch-soporte-admin');
      if (toggle) toggle.checked = !habilitado;
    }
  }

  async #handleIniciarInvitado() {
    const timerContainer = document.getElementById('guest-timer-container');
    const timerDisplay = document.getElementById('guest-timer-display');
    const progressBar = document.getElementById('guest-timer-progress');

    try {
      const resp = await fetch(`${ENDPOINTS.HTTP_BASE}/admin/invitado/sesion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehiculo_id: 1, duracion_segundos: 300 })
      });

      if (!resp.ok) throw new Error('No se pudo generar la sesión de prueba');
      const data = await resp.json();

      showToast('Sesión de invitado iniciada: 5 minutos concedidos', 'success');

      if (timerContainer) timerContainer.classList.remove('d-none');

      const duracionTotal = 300;
      let restante = duracionTotal;

      if (this.#guestTimerInterval) clearInterval(this.#guestTimerInterval);

      const updateUI = () => {
        const mins = Math.floor(restante / 60);
        const secs = restante % 60;
        if (timerDisplay) {
          timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        if (progressBar) {
          const pct = Math.max(0, (restante / duracionTotal) * 100);
          progressBar.style.width = `${pct}%`;
          if (pct < 20) {
            progressBar.className = 'progress-bar bg-danger';
          } else if (pct < 50) {
            progressBar.className = 'progress-bar bg-warning';
          } else {
            progressBar.className = 'progress-bar bg-success';
          }
        }

        if (restante <= 0) {
          clearInterval(this.#guestTimerInterval);
          showToast('La sesión de invitado ha expirado (5 minutos completados)', 'warning');
          if (timerDisplay) timerDisplay.textContent = '00:00 (Expirado)';
        }
        restante--;
      };

      updateUI();
      this.#guestTimerInterval = setInterval(updateUI, 1000);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  async cargarAuditoria() {
    const tableBody = document.getElementById('tabla-auditoria-body');
    if (!tableBody) return;

    try {
      const resp = await fetch(`${ENDPOINTS.HTTP_BASE}/admin/auditoria`);
      if (!resp.ok) return;
      const registros = await resp.json();

      if (!registros || registros.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sin eventos de auditoría</td></tr>';
        return;
      }

      tableBody.innerHTML = registros.map(r => `
        <tr>
          <td><small>${r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : '—'}</small></td>
          <td><span class="badge bg-secondary">${r.admin_email || 'admin@iot.com'}</span></td>
          <td><strong>${r.accion}</strong></td>
          <td><small class="text-muted">${r.detalle || ''}</small></td>
        </tr>
      `).join('');
    } catch (_) {}
  }
}
