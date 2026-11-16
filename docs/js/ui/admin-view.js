/**
 * admin-view.js — Interfaz del módulo de ADMINISTRACIÓN
 * Soporta vistas diferenciadas por ROL (ADMINISTRADOR / USUARIO / INVITADO)
 * y generación de accesos temporales con código QR de 45 segundos.
 */

import { showToast } from '../utils/toast.js';
import { CONFIG } from '../config.js?v=2.5';
import { commandService } from '../domain/commands.js';
import { demoService } from '../domain/demo.js';
import { monitoringService } from '../domain/monitoring.js';

export class AdminView {
  #currentUser = null;
  #guestTimerInterval = null;
  #userGuestTimerInterval = null;
  #guestAccessTimerInterval = null;

  constructor() {
    this.#loadSession();
    this.#initEvents();
    this.renderRoleView();
  }

  #loadSession() {
    try {
      const saved = localStorage.getItem('iot_user');
      if (saved) {
        const user = JSON.parse(saved);
        const expiresAt = new Date(user?.guest_session?.expiracion || 0).getTime();
        if (user?.rol_id === 3 && (!expiresAt || expiresAt <= Date.now())) {
          localStorage.removeItem('iot_user');
          localStorage.removeItem('iot_token');
        } else {
          this.#currentUser = user;
        }
      }
    } catch (_) {}
  }

  #initEvents() {
    // Escuchar activación de pestaña administración desde la barra principal
    window.addEventListener('view:admin:active', () => {
      this.refreshCurrentRoleData();
    });

    // Formulario de login
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.#handleLogin(e));
    }

    // Botón global de cierre de sesión
    const logoutBtn = document.getElementById('btn-global-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.#handleLogout());
    }

    // Navegación de pills en suite de Administrador
    document.querySelectorAll('#admin-role-suite .role-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#admin-role-suite .role-pill-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('#admin-role-suite .admin-sub-section').forEach(s => s.classList.add('d-none'));
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        const targetEl = document.getElementById(targetId);
        if (targetEl) targetEl.classList.remove('d-none');
      });
    });

    // Navegación de pills en suite de Usuario
    document.querySelectorAll('#user-role-suite .role-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#user-role-suite .role-pill-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('#user-role-suite .user-sub-section').forEach(s => s.classList.add('d-none'));
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        const targetEl = document.getElementById(targetId);
        if (targetEl) targetEl.classList.remove('d-none');
      });
    });

    // ─────────────────────────────────────────────────────────────
    // EVENTOS: ADMINISTRADOR
    // ─────────────────────────────────────────────────────────────
    // 1. Crear modelo
    const formModelo = document.getElementById('form-crear-modelo');
    if (formModelo) {
      formModelo.addEventListener('submit', (e) => this.#handleCrearModelo(e));
    }

    // 2. Crear unidad física
    const formUnidad = document.getElementById('form-crear-unidad');
    if (formUnidad) {
      formUnidad.addEventListener('submit', (e) => this.#handleCrearUnidad(e));
    }

    // 3. Crear cliente
    const formCliente = document.getElementById('form-crear-cliente');
    if (formCliente) {
      formCliente.addEventListener('submit', (e) => this.#handleCrearCliente(e));
    }

    // 4. Asignar / reasignar vehículo
    const formAsignar = document.getElementById('form-asignar-vehiculo');
    if (formAsignar) {
      formAsignar.addEventListener('submit', (e) => this.#handleAsignarVehiculo(e));
    }

    // 5. Crear demo de fábrica
    const formDemoFab = document.getElementById('form-crear-demo-fabrica');
    if (formDemoFab) {
      formDemoFab.addEventListener('submit', (e) => this.#handleCrearDemoFabrica(e));
    }

    // 6. Switch soporte
    const switchSoporte = document.getElementById('switch-soporte-admin');
    if (switchSoporte) {
      switchSoporte.addEventListener('change', (e) => this.#handleToggleSupport(e.target.checked));
    }

    // 7. QR Invitado (Admin)
    const btnQrAdmin = document.getElementById('btn-generar-qr-admin');
    if (btnQrAdmin) {
      btnQrAdmin.addEventListener('click', () => {
        const vid = parseInt(document.getElementById('qr-admin-select-vehiculo')?.value || '1', 10);
        this.#iniciarSesionQR(
          vid,
          'qr-admin-display-container',
          'qr-admin-img',
          'qr-admin-countdown',
          'qr-admin-progress',
          'qr-admin-link',
          true
        );
      });
    }

    // ─────────────────────────────────────────────────────────────
    // EVENTOS: USUARIO (COMPRADOR)
    // ─────────────────────────────────────────────────────────────
    // Selector de vehículo asignado
    const userVehSelect = document.getElementById('user-assigned-vehicle-select');
    if (userVehSelect) {
      userVehSelect.addEventListener('change', (e) => {
        const newVid = parseInt(e.target.value, 10);
        this.#cambiarVehiculoUsuario(newVid);
      });
    }

    // Crear demo personalizada
    const formDemoUser = document.getElementById('form-crear-demo-usuario');
    if (formDemoUser) {
      formDemoUser.addEventListener('submit', (e) => this.#handleCrearDemoUsuario(e));
    }

    const demoSelect = document.getElementById('user-demo-select');
    if (demoSelect) {
      demoSelect.addEventListener('change', () => this.#cargarMovimientosDemoUsuario());
    }

    const formMovimientoDemo = document.getElementById('form-agregar-movimiento-demo-usuario');
    if (formMovimientoDemo) {
      formMovimientoDemo.addEventListener('submit', (e) => this.#handleAgregarMovimientoDemoUsuario(e));
    }

    // QR Invitado (Usuario)
    const btnQrUser = document.getElementById('btn-generar-qr-usuario');
    if (btnQrUser) {
      btnQrUser.addEventListener('click', () => {
        const vid = CONFIG.VEHICLE_ID || 1;
        this.#iniciarSesionQR(
          vid,
          'qr-user-display-container',
          'qr-user-img',
          'qr-user-countdown',
          'qr-user-progress',
          'qr-user-link',
          false
        );
      });
    }

  }

  // ─────────────────────────────────────────────────────────────
  // GESTIÓN VISUAL POR ROL
  // ─────────────────────────────────────────────────────────────
  renderRoleView() {
    const loginPrompt = document.getElementById('admin-login-prompt');
    const panelContent = document.getElementById('admin-panel-content');
    const statusText = document.getElementById('admin-user-status');
    const descText = document.getElementById('admin-user-desc');
    const avatarEl = document.getElementById('admin-role-avatar');

    const adminSuite = document.getElementById('admin-role-suite');
    const userSuite = document.getElementById('user-role-suite');
    const guestSuite = document.getElementById('guest-role-suite');
    const logoutBtn = document.getElementById('btn-global-logout');

    // Si NO está logueado: SOLO mostrar formulario de login
    if (!this.#currentUser) {
      if (loginPrompt) loginPrompt.classList.remove('d-none');
      if (panelContent) panelContent.classList.add('d-none');
      if (logoutBtn) logoutBtn.hidden = true;
      window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user: null } }));
      return;
    }

    // Está logueado: Ocultar login y mostrar panel principal
    if (loginPrompt) loginPrompt.classList.add('d-none');
    if (panelContent) panelContent.classList.remove('d-none');
    if (logoutBtn) logoutBtn.hidden = false;

    const rolId = this.#currentUser.rol_id;
    const email = this.#currentUser.email;

    // Actualizar barra de sesión
    if (statusText) {
      const badgeClass = rolId === 1 ? 'bg-danger' : rolId === 2 ? 'bg-primary' : 'bg-secondary';
      statusText.innerHTML = `${email} <span class="badge ${badgeClass}">${this.#currentUser.rol || 'USUARIO'}</span>`;
    }

    if (avatarEl) {
      avatarEl.innerHTML = rolId === 1 ? '🏢' : rolId === 2 ? '🚙' : '👤';
    }

    if (descText) {
      if (rolId === 1) descText.textContent = 'Administración integral de modelos, flota, clientes y auditoría';
      else if (rolId === 2) descText.textContent = 'Control exclusivo, telemetría y demostraciones de tus unidades asignadas';
      else descText.textContent = 'Acceso de prueba y consulta comercial';
    }

    // Mostrar suite según rol
    if (adminSuite) adminSuite.classList.toggle('d-none', rolId !== 1);
    if (userSuite) userSuite.classList.toggle('d-none', rolId !== 2);
    if (guestSuite) guestSuite.classList.toggle('d-none', rolId !== 3);

    window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user: this.#currentUser } }));

    // Cargar datos correspondientes
    this.refreshCurrentRoleData();
    if (rolId === 3) this.#iniciarTemporizadorInvitado();
  }

  async refreshCurrentRoleData() {
    if (!this.#currentUser) return;
    const rolId = this.#currentUser.rol_id;

    if (rolId === 1) {
      // Admin: Cargar stats, modelos, inventario, clientes, demos fábrica, auditoría
      await Promise.allSettled([
        this.cargarStats(),
        this.cargarModelos(),
        this.cargarInventario(),
        this.cargarClientes(),
        this.cargarDemosFabrica(),
        this.cargarAuditoria()
      ]);
    } else if (rolId === 2) {
      // Usuario: Cargar mis vehículos y mis demos
      await Promise.allSettled([
        this.cargarMisVehiculos(),
        this.cargarMisDemos()
      ]);
    } else if (rolId === 3) {
      // Invitado: Cargar catálogo
      await this.cargarCatalogoInvitado();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ACCIONES AUTENTICACIÓN
  // ─────────────────────────────────────────────────────────────
  async #handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!email || !password) return;
    if (submitBtn) submitBtn.disabled = true;

    try {
      const guestToken = new URLSearchParams(window.location.search).get('token');
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, guest_token: guestToken })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Credenciales incorrectas');
      }

      const data = await resp.json();
      this.#currentUser = data.usuario;
      if (data.sesion_invitado) {
        this.#currentUser.guest_session = data.sesion_invitado;
        // El enlace de un solo uso no queda visible ni se comparte al navegar.
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      localStorage.setItem('iot_user', JSON.stringify(this.#currentUser));
      if (data.token) localStorage.setItem('iot_token', data.token);

      showToast(`Bienvenido ${this.#currentUser.email} (${this.#currentUser.rol})`, 'success');
      this.renderRoleView();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async #handleLogout(mensaje = 'Sesión finalizada') {
    const guestToken = this.#currentUser?.guest_session?.token;
    this.#currentUser = null;
    localStorage.removeItem('iot_user');
    localStorage.removeItem('iot_token');
    if (this.#guestTimerInterval) clearInterval(this.#guestTimerInterval);
    if (this.#userGuestTimerInterval) clearInterval(this.#userGuestTimerInterval);
    if (this.#guestAccessTimerInterval) clearInterval(this.#guestAccessTimerInterval);
    this.renderRoleView();
    if (guestToken) {
      fetch(`${CONFIG.API_BASE_URL}/admin/invitado/sesion/${encodeURIComponent(guestToken)}/cerrar`, {
        method: 'POST', keepalive: true
      }).catch(() => {});
    }
    showToast(mensaje, 'info');
  }

  // ─────────────────────────────────────────────────────────────
  // MÓDULO ADMINISTRADOR: MÉTODOS Y SERVICIOS
  // ─────────────────────────────────────────────────────────────
  async cargarStats() {
    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/dashboard/stats`);
      if (!resp.ok) return;
      const data = await resp.json();
      document.getElementById('stat-total-vehiculos').textContent = data.total_vehiculos ?? 0;
      document.getElementById('stat-vehiculos-activos').textContent = data.vehiculos_activos ?? 0;
      document.getElementById('stat-total-clientes').textContent = data.total_clientes ?? 0;
      document.getElementById('stat-total-modelos').textContent = data.total_modelos ?? 0;
      document.getElementById('stat-total-auditorias').textContent = data.total_auditorias ?? 0;
    } catch (_) {}
  }

  async cargarModelos() {
    const tbody = document.getElementById('tabla-modelos-body');
    if (!tbody) return;
    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/modelos`);
      if (!resp.ok) throw new Error('Error al consultar modelos');
      const modelos = await resp.json();

      if (!modelos.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sin modelos registrados</td></tr>';
        return;
      }

      tbody.innerHTML = modelos.map(m => `
        <tr>
          <td><strong>#${m.id}</strong></td>
          <td><strong>${m.nombre}</strong></td>
          <td>${m.descripcion || '—'}</td>
          <td><small class="text-muted">${m.creado_en ? new Date(m.creado_en).toLocaleDateString() : '—'}</small></td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">${err.message}</td></tr>`;
    }
  }

  async #handleCrearModelo(e) {
    e.preventDefault();
    const nombre = document.getElementById('modelo-nombre')?.value.trim();
    const descripcion = document.getElementById('modelo-descripcion')?.value.trim();
    if (!nombre) return;

    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/modelos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, descripcion })
      });
      if (!resp.ok) throw new Error('No se pudo registrar el modelo');
      showToast(`Modelo '${nombre}' creado exitosamente`, 'success');
      e.target.reset();
      this.cargarModelos();
      this.cargarStats();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  async cargarInventario() {
    const tbody = document.getElementById('tabla-inventario-body');
    const selectVehAdmin = document.getElementById('select-asignar-vehiculo');
    const selectQrVeh = document.getElementById('qr-admin-select-vehiculo');
    const selectDemoVeh = document.getElementById('demo-fabrica-vehiculo');

    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/inventario`);
      if (!resp.ok) throw new Error('Error al cargar inventario');
      const vehiculos = await resp.json();

      if (tbody) {
        if (!vehiculos.length) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay unidades en inventario</td></tr>';
        } else {
          tbody.innerHTML = vehiculos.map(v => `
            <tr>
              <td><strong>#${v.id_vehiculo}</strong></td>
              <td>${v.nombre}</td>
              <td>${v.modelo || '—'}</td>
              <td><code>${v.microcontrolador || 'ESP8266'}</code></td>
              <td>${v.cliente_email ? `<span class="badge bg-primary"><i class="bi bi-person"></i> ${v.cliente_email}</span>` : '<span class="badge bg-secondary">Sin asignar</span>'}</td>
              <td>${v.activo ? '<span class="text-success"><i class="bi bi-check-circle-fill"></i> Activo</span>' : '<span class="text-danger"><i class="bi bi-x-circle-fill"></i> Inactivo</span>'}</td>
            </tr>
          `).join('');
        }
      }

      // Llenar selectores
      const optionsHtml = vehiculos.map(v => `<option value="${v.id_vehiculo}">#${v.id_vehiculo} - ${v.nombre} (${v.modelo || 'Estándar'})</option>`).join('');
      if (selectVehAdmin) selectVehAdmin.innerHTML = '<option value="">-- Seleccionar Unidad --</option>' + optionsHtml;
      if (selectQrVeh) selectQrVeh.innerHTML = optionsHtml;
      if (selectDemoVeh) selectDemoVeh.innerHTML = optionsHtml;
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${err.message}</td></tr>`;
    }
  }

  async #handleCrearUnidad(e) {
    e.preventDefault();
    const idInput = document.getElementById('unidad-id')?.value;
    const nombre = document.getElementById('unidad-nombre')?.value.trim();
    const modelo = document.getElementById('unidad-modelo')?.value.trim();
    const mcu = document.getElementById('unidad-mcu')?.value.trim();
    const desc = document.getElementById('unidad-descripcion')?.value.trim();

    if (!nombre) return;

    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/unidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_vehiculo: idInput ? parseInt(idInput, 10) : null,
          nombre,
          modelo,
          microcontrolador: mcu || 'ESP8266',
          descripcion: desc
        })
      });

      if (!resp.ok) throw new Error('No se pudo registrar la unidad física');
      showToast(`Unidad '${nombre}' registrada en inventario`, 'success');
      e.target.reset();
      this.cargarInventario();
      this.cargarStats();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  async cargarClientes() {
    const tbody = document.getElementById('tabla-clientes-body');
    const selectCli = document.getElementById('select-asignar-cliente');

    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/clientes`);
      if (!resp.ok) throw new Error('Error al cargar clientes');
      const clientes = await resp.json();

      if (tbody) {
        if (!clientes.length) {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sin clientes registrados</td></tr>';
        } else {
          tbody.innerHTML = clientes.map(c => `
            <tr>
              <td><strong>#${c.id}</strong></td>
              <td><strong>${c.email}</strong></td>
              <td><span class="badge bg-info">${c.total_vehiculos} unidad(es)</span></td>
              <td>${c.activo ? '<span class="text-success"><i class="bi bi-check-circle-fill"></i> Activo</span>' : '<span class="text-danger">Inactivo</span>'}</td>
              <td><small class="text-muted">${c.creado_en ? new Date(c.creado_en).toLocaleDateString() : '—'}</small></td>
            </tr>
          `).join('');
        }
      }

      if (selectCli) {
        selectCli.innerHTML = '<option value="">-- Desasignar (Dejar libre) --</option>' +
          clientes.map(c => `<option value="${c.id}">Cliente #${c.id} (${c.email})</option>`).join('');
      }
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${err.message}</td></tr>`;
    }
  }

  async #handleCrearCliente(e) {
    e.preventDefault();
    const email = document.getElementById('cliente-email')?.value.trim();
    const pass = document.getElementById('cliente-password')?.value;
    if (!email || !pass) return;

    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, rol_id: 2 })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Fallo al registrar cliente');
      }
      showToast(`Cliente '${email}' registrado exitosamente`, 'success');
      e.target.reset();
      this.cargarClientes();
      this.cargarStats();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  async #handleAsignarVehiculo(e) {
    e.preventDefault();
    const vid = parseInt(document.getElementById('select-asignar-vehiculo')?.value, 10);
    const rawCid = document.getElementById('select-asignar-cliente')?.value;
    const cid = rawCid ? parseInt(rawCid, 10) : null;

    if (!vid) {
      showToast('Selecciona un vehículo', 'warning');
      return;
    }

    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/unidades/${vid}/asignar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: cid })
      });
      if (!resp.ok) throw new Error('Error al actualizar asignación');
      showToast(cid ? `Vehículo #${vid} asignado al cliente #${cid}` : `Vehículo #${vid} liberado`, 'success');
      this.cargarInventario();
      this.cargarClientes();
      this.cargarAuditoria();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  async cargarDemosFabrica() {
    const tbody = document.getElementById('tabla-demos-fabrica-body');
    if (!tbody) return;
    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/demos-fabrica`);
      if (!resp.ok) return;
      const demos = await resp.json();

      if (!demos.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sin demos de fábrica registradas</td></tr>';
        return;
      }

      tbody.innerHTML = demos.map(d => `
        <tr>
          <td>#${d.id_demo}</td>
          <td><strong>${d.nombre}</strong></td>
          <td>${d.vehiculo_nombre || `Vehículo #${d.id_vehiculo}`}</td>
          <td>${d.descripcion || '—'}</td>
          <td><span class="badge bg-warning text-dark"><i class="bi bi-award-fill"></i> Fábrica</span></td>
        </tr>
      `).join('');
    } catch (_) {}
  }

  async #handleCrearDemoFabrica(e) {
    e.preventDefault();
    const vid = parseInt(document.getElementById('demo-fabrica-vehiculo')?.value, 10);
    const nombre = document.getElementById('demo-fabrica-nombre')?.value.trim();
    const desc = document.getElementById('demo-fabrica-desc')?.value.trim();

    if (!nombre || !vid) return;

    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/demos-fabrica`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_vehiculo: vid, nombre, descripcion: desc, es_fabrica: true })
      });
      if (!resp.ok) throw new Error('No se pudo crear demo de fábrica');
      showToast(`Demostración de fábrica '${nombre}' creada`, 'success');
      e.target.reset();
      this.cargarDemosFabrica();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  async #handleToggleSupport(habilitado) {
    const label = document.getElementById('soporte-status-label');
    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/soporte/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculo_id: CONFIG.VEHICLE_ID || 1,
          habilitado,
          motivo: habilitado ? 'Soporte técnico activado por empresa' : 'Soporte técnico desactivado'
        })
      });
      if (!resp.ok) throw new Error('Error al actualizar soporte');
      if (label) {
        label.textContent = habilitado ? 'ACTIVO (Autorizado)' : 'INACTIVO';
        label.className = habilitado ? 'fw-bold text-success' : 'text-muted';
      }
      showToast(habilitado ? 'Soporte técnico ACTIVADO' : 'Soporte técnico DESACTIVADO', habilitado ? 'warning' : 'info');
      this.cargarAuditoria();
    } catch (err) {
      showToast(err.message, 'danger');
      const sw = document.getElementById('switch-soporte-admin');
      if (sw) sw.checked = !habilitado;
    }
  }

  async cargarAuditoria() {
    const tbody = document.getElementById('tabla-auditoria-body');
    if (!tbody) return;
    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/auditoria`);
      if (!resp.ok) return;
      const logs = await resp.json();

      if (!logs.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sin registros de auditoría</td></tr>';
        return;
      }

      tbody.innerHTML = logs.map(l => `
        <tr>
          <td><small>${l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : '—'}</small></td>
          <td><span class="badge bg-secondary">${l.admin_email || 'admin'}</span></td>
          <td><strong>${l.accion}</strong></td>
          <td><small class="text-muted">${l.detalle || ''}</small></td>
        </tr>
      `).join('');
    } catch (_) {}
  }

  // ─────────────────────────────────────────────────────────────
  // MÓDULO USUARIO: MÉTODOS Y SERVICIOS
  // ─────────────────────────────────────────────────────────────
  async cargarMisVehiculos() {
    if (!this.#currentUser) return;
    const select = document.getElementById('user-assigned-vehicle-select');
    if (!select) return;

    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/mis-vehiculos?usuario_id=${this.#currentUser.id}`);
      if (!resp.ok) throw new Error('No se pudieron consultar tus vehículos');
      const vehiculos = await resp.json();

      if (!vehiculos.length) {
        select.innerHTML = '<option value="">No tienes vehículos asignados actualmente</option>';
        showToast('No tienes vehículos asignados. Solicita asignación a la empresa.', 'warning');
        return;
      }

      select.innerHTML = vehiculos.map(v => `
        <option value="${v.id_vehiculo}">#${v.id_vehiculo} - ${v.nombre} (${v.modelo || 'Activo'})</option>
      `).join('');

      // Sincronizar el vehículo actual con el primero asignado si no coincide
      const primerVid = vehiculos[0].id_vehiculo;
      this.#cambiarVehiculoUsuario(primerVid);
    } catch (err) {
      select.innerHTML = `<option value="1">Vehículo por defecto (#1)</option>`;
    }
  }

  #cambiarVehiculoUsuario(vid) {
    if (!vid) return;
    CONFIG.VEHICLE_ID = vid;

    // Actualizar labels en la UI general
    const vlabel = document.getElementById('vehicle-id-label');
    if (vlabel) vlabel.textContent = `Vehículo #${vid}`;

    // Cargar nombre del vehículo en el header
    fetch(`${CONFIG.API_BASE_URL}/vehiculos/${vid}`)
      .then(r => r.json())
      .then(v => {
        const vname = document.getElementById('vehicle-name');
        if (vname && v.nombre) vname.textContent = v.nombre;
      })
      .catch(() => {});

    // Recargar monitoreo de su vehículo
    monitoringService.loadInitialData().catch(() => {});
    this.cargarMisDemos();
    this.#cargarComandosDemoUsuario();
  }

  async cargarMisDemos() {
    if (!this.#currentUser) return;
    const tbody = document.getElementById('tabla-user-demos-body');
    if (!tbody) return;

    try {
      const vid = CONFIG.VEHICLE_ID || 1;
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/mis-demos?usuario_id=${this.#currentUser.id}&vehiculo_id=${vid}`);
      if (!resp.ok) return;
      const demos = await resp.json();

      this.#actualizarSelectorDemosUsuario(demos);

      if (!demos.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aún no has creado demostraciones personalizadas</td></tr>';
        return;
      }

      tbody.innerHTML = demos.map(d => {
        const esPropia = !d.es_fabrica && d.usuario_id === this.#currentUser.id;
        return `
          <tr>
            <td>#${d.id_demo}</td>
            <td><strong>${d.nombre}</strong></td>
            <td>${d.es_fabrica ? '<span class="badge bg-warning text-dark">Fábrica</span>' : '<span class="badge bg-primary">Personalizada</span>'}</td>
            <td>${d.descripcion || '—'}</td>
            <td>
              <button class="btn-outline-custom" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="window.ejecutarDemoUsuario(${d.id_demo})">
                <i class="bi bi-play-fill text-success"></i> Ejecutar
              </button>
              ${esPropia ? `
                <button class="btn-outline-custom text-danger ms-1" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="window.eliminarDemoUsuario(${d.id_demo})">
                  <i class="bi bi-trash"></i>
                </button>
              ` : ''}
            </td>
          </tr>
        `;
      }).join('');

      // Exponer funciones globales para botones inline
      window.ejecutarDemoUsuario = (id_demo) => {
        demoService.execute(id_demo).catch(err => showToast(err.message, 'danger'));
      };
      window.eliminarDemoUsuario = async (id_demo) => {
        if (!confirm('¿Deseas eliminar esta demostración personalizada?')) return;
        try {
          const r = await fetch(`${CONFIG.API_BASE_URL}/admin/mis-demos/${id_demo}?usuario_id=${this.#currentUser.id}`, { method: 'DELETE' });
          if (!r.ok) throw new Error('Error al eliminar demo');
          showToast('Demostración eliminada', 'info');
          this.cargarMisDemos();
        } catch (err) {
          showToast(err.message, 'danger');
        }
      };
    } catch (_) {}
  }

  #actualizarSelectorDemosUsuario(demos) {
    const select = document.getElementById('user-demo-select');
    if (!select) return;
    const previous = select.value;
    const propias = demos.filter(d => !d.es_fabrica && d.usuario_id === this.#currentUser?.id);
    select.innerHTML = propias.length
      ? propias.map(d => `<option value="${d.id_demo}">${d.nombre}</option>`).join('')
      : '<option value="">Crea una demostración propia para agregar movimientos</option>';
    if (propias.some(d => String(d.id_demo) === previous)) select.value = previous;
    this.#cargarMovimientosDemoUsuario();
  }

  async #cargarComandosDemoUsuario() {
    const select = document.getElementById('user-demo-command-select');
    if (!select) return;
    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/vehiculos/${CONFIG.VEHICLE_ID}/comandos`);
      if (!resp.ok) throw new Error();
      const comandos = await resp.json();
      select.innerHTML = comandos
        .filter(comando => comando.activo)
        .map(comando => `<option value="${comando.id_comando}">${comando.nombre}</option>`)
        .join('');
    } catch (_) {
      select.innerHTML = '<option value="">No se pudieron cargar los movimientos</option>';
    }
  }

  async #cargarMovimientosDemoUsuario() {
    const demoId = document.getElementById('user-demo-select')?.value;
    const tbody = document.getElementById('tabla-user-demo-movimientos-body');
    if (!tbody) return;
    if (!demoId) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Selecciona una demostración para configurar sus movimientos.</td></tr>';
      return;
    }
    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/demos/${demoId}/movimientos`);
      if (!resp.ok) throw new Error();
      const movimientos = await resp.json();
      this.#renderMovimientosDemoUsuario(movimientos);
    } catch (_) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">No se pudieron cargar los movimientos.</td></tr>';
    }
  }

  #renderMovimientosDemoUsuario(movimientos) {
    const tbody = document.getElementById('tabla-user-demo-movimientos-body');
    if (!tbody) return;
    if (!movimientos.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Todavía no hay movimientos configurados.</td></tr>';
      return;
    }

    tbody.innerHTML = movimientos.map(m => {
      const movementId = m.id_movimiento ?? m.id_demo_movimiento;
      const commandName = m.nombre || m.comando || `Comando #${m.id_comando}`;
      return `<tr data-movement-id="${movementId}" data-command-id="${m.id_comando}">
        <td><input class="form-control-custom demo-movement-order" type="number" min="1" value="${m.orden}" aria-label="Orden de ${commandName}"></td>
        <td>${commandName}</td>
        <td><input class="form-control-custom demo-movement-duration" type="number" min="0" value="${m.duracion_ms}" aria-label="Duración de ${commandName} en milisegundos"></td>
        <td><input class="form-control-custom demo-movement-pause" type="number" min="0" value="${m.pausa_ms}" aria-label="Pausa de ${commandName} en milisegundos"></td>
        <td><button type="button" class="btn-outline-custom btn-save-demo-movement" title="Guardar cambios"><i class="bi bi-check-lg"></i></button></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.btn-save-demo-movement').forEach(button => {
      button.addEventListener('click', () => this.#actualizarMovimientoDemoUsuario(button.closest('tr')));
    });
  }

  async #actualizarMovimientoDemoUsuario(row) {
    const movementId = Number(row?.dataset.movementId);
    const commandId = Number(row?.dataset.commandId);
    const order = Number(row?.querySelector('.demo-movement-order')?.value);
    const duration = Number(row?.querySelector('.demo-movement-duration')?.value);
    const pause = Number(row?.querySelector('.demo-movement-pause')?.value);
    if (!movementId || !commandId || order < 1 || duration < 0 || pause < 0) {
      showToast('Revisa el orden, la duración y la pausa del movimiento', 'warning');
      return;
    }

    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/demos/movimientos/${movementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_comando: commandId, orden: order, duracion_ms: duration, pausa_ms: pause })
      });
      if (!resp.ok) throw new Error('No se pudo actualizar el movimiento');
      showToast('Movimiento actualizado', 'success');
      this.#cargarMovimientosDemoUsuario();
    } catch (err) {
      showToast(err.message || 'No se pudo actualizar el movimiento', 'danger');
    }
  }

  async #handleAgregarMovimientoDemoUsuario(e) {
    e.preventDefault();
    const demoId = Number(document.getElementById('user-demo-select')?.value);
    const commandId = Number(document.getElementById('user-demo-command-select')?.value);
    const duration = Number(document.getElementById('user-demo-duration')?.value);
    const pause = Number(document.getElementById('user-demo-pause')?.value);
    if (!demoId || !commandId || duration < 0 || pause < 0) return;

    try {
      const current = await fetch(`${CONFIG.API_BASE_URL}/demos/${demoId}/movimientos`).then(r => r.ok ? r.json() : Promise.reject());
      const resp = await fetch(`${CONFIG.API_BASE_URL}/demos/movimientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_demo: demoId, id_comando: commandId, orden: current.length + 1, duracion_ms: duration, pausa_ms: pause })
      });
      if (!resp.ok) throw new Error('No se pudo agregar el movimiento');
      showToast('Movimiento agregado a la demostración', 'success');
      this.#cargarMovimientosDemoUsuario();
    } catch (err) {
      showToast(err.message || 'No se pudo agregar el movimiento', 'danger');
    }
  }

  async #handleCrearDemoUsuario(e) {
    e.preventDefault();
    if (!this.#currentUser) return;
    const nombre = document.getElementById('user-demo-nombre')?.value.trim();
    const desc = document.getElementById('user-demo-desc')?.value.trim();
    const vid = CONFIG.VEHICLE_ID || 1;

    if (!nombre) return;

    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/mis-demos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_vehiculo: vid,
          nombre,
          descripcion: desc,
          usuario_id: this.#currentUser.id,
          es_fabrica: false
        })
      });

      if (!resp.ok) throw new Error('No se pudo registrar la demostración');
      showToast(`Demostración '${nombre}' creada con éxito`, 'success');
      e.target.reset();
      this.cargarMisDemos();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MÓDULO INVITADO (CLIENTE POTENCIAL)
  // ─────────────────────────────────────────────────────────────
  async cargarCatalogoInvitado() {
    const tbody = document.getElementById('tabla-catalogo-invitado-body');
    if (!tbody) return;
    try {
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/modelos`);
      if (!resp.ok) return;
      const modelos = await resp.json();

      tbody.innerHTML = modelos.map(m => `
        <tr>
          <td><strong>${m.nombre}</strong></td>
          <td>${m.descripcion || 'Vehículo IoT de alta precisión con telemetría en tiempo real'}</td>
          <td><span class="badge bg-success"><i class="bi bi-check2"></i> En Catálogo</span></td>
        </tr>
      `).join('');
    } catch (_) {}
  }

  #iniciarTemporizadorInvitado() {
    const container = document.getElementById('guest-direct-timer-container');
    const display = document.getElementById('guest-direct-countdown');
    const bar = document.getElementById('guest-direct-progress');
    const expiracion = new Date(this.#currentUser?.guest_session?.expiracion || 0).getTime();
    if (!expiracion) return this.#handleLogout('La sesión de invitado no es válida');

    if (this.#guestAccessTimerInterval) clearInterval(this.#guestAccessTimerInterval);
    if (container) container.classList.remove('d-none');

    const actualizar = () => {
      const restante = Math.max(0, Math.ceil((expiracion - Date.now()) / 1000));
      if (display) display.textContent = `${restante}s`;
      if (bar) bar.style.width = `${(restante / 45) * 100}%`;
      if (restante > 0) return;

      clearInterval(this.#guestAccessTimerInterval);
      this.#guestAccessTimerInterval = null;
      this.#handleLogout('La sesión de invitado expiró automáticamente');
    };

    actualizar();
    this.#guestAccessTimerInterval = setInterval(actualizar, 250);
  }

  // ─────────────────────────────────────────────────────────────
  // GENERADOR DE CÓDIGO QR PARA INVITADO (45 SEGUNDOS)
  // Utilizado tanto por ADMINISTRADOR como por USUARIO
  // ─────────────────────────────────────────────────────────────
  async #iniciarSesionQR(vehiculoId, containerId, imgId, countdownId, progressId, linkId, isAdmin = false) {
    const container = document.getElementById(containerId);
    const imgEl = document.getElementById(imgId);
    const countdownEl = document.getElementById(countdownId);
    const progressEl = document.getElementById(progressId);
    const linkEl = document.getElementById(linkId);

    try {
      // 1. Solicitar sesión de invitado de 45 segundos al backend
      const resp = await fetch(`${CONFIG.API_BASE_URL}/admin/invitado/sesion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehiculo_id: vehiculoId, duracion_segundos: 45 })
      });

      if (!resp.ok) throw new Error('No se pudo generar la sesión temporal de 45 s');
      const data = await resp.json();

      // 2. Construir URL para el invitado
      const guestUrl = `${window.location.origin}${window.location.pathname}?token=${data.token}&vid=${data.vehiculo_id}`;

      // 3. Generar código QR escaneable
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(guestUrl)}`;

      if (imgEl) imgEl.src = qrApiUrl;
      if (linkEl) {
        linkEl.textContent = guestUrl;
        linkEl.onclick = () => {
          navigator.clipboard.writeText(guestUrl);
          showToast('Enlace de invitado copiado al portapapeles', 'info');
        };
      }

      if (container) container.classList.remove('d-none');
      showToast('Acceso QR de 45 segundos generado exitosamente', 'success');

      // 4. Temporizador regresivo en vivo de 45 segundos
      const duracionTotal = 45;
      let restante = duracionTotal;

      if (isAdmin && this.#guestTimerInterval) clearInterval(this.#guestTimerInterval);
      if (!isAdmin && this.#userGuestTimerInterval) clearInterval(this.#userGuestTimerInterval);

      const updateCountdown = () => {
        if (countdownEl) countdownEl.textContent = `${restante}s`;
        if (progressEl) {
          const pct = Math.max(0, (restante / duracionTotal) * 100);
          progressEl.style.width = `${pct}%`;
          if (pct < 30) {
            progressEl.style.background = 'var(--danger)';
          } else {
            progressEl.style.background = 'var(--warning)';
          }
        }

        if (restante <= 0) {
          if (isAdmin) clearInterval(this.#guestTimerInterval);
          else clearInterval(this.#userGuestTimerInterval);

          if (countdownEl) countdownEl.textContent = '0s (Expirado)';
          showToast('La sesión de invitado (45 s) ha expirado.', 'warning');
        }
        restante--;
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);

      if (isAdmin) this.#guestTimerInterval = interval;
      else this.#userGuestTimerInterval = interval;

    } catch (err) {
      showToast(err.message, 'danger');
    }
  }
}
