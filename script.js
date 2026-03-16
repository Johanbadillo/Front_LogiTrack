// ══════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════
const API = 'http://http://10.79.213.217:8080/';
let TOKEN = null;
let CURRENT_USER = null;
let CURRENT_ROL = null; // ← NUEVO: almacena el rol del usuario

// ══════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════
function toast(msg, type = 'info') {
    const el = document.getElementById('toast');
    const tieneLineas = msg && msg.includes('\n');
    el.innerHTML = tieneLineas
        ? msg.split('\n').map(l => `<div>${l}</div>`).join('')
        : (msg || '');
    el.className = `show ${type}`;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.className = '', tieneLineas ? 6000 : 3000);
}

function headers() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` };
}

async function api(method, path, body) {
    const opts = { method, headers: headers() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API + path, opts);
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (data.errors && typeof data.errors === 'object') {
            const msgs = Object.entries(data.errors)
                .map(([campo, msg]) => `• ${campo}: ${msg}`)
                .join('\n');
            throw new Error(msgs || data.message || 'Error de validación');
        }
        throw new Error(data.message || data.error || `Error ${res.status}`);
    }
    return data;
}

function fmt(n) { return n?.toLocaleString('es-CO') ?? '—'; }
function fmtMoney(n) { return n ? `$${Number(n).toLocaleString('es-CO')}` : '—'; }

function rolBadge(rol) {
    return rol === 'ADMIN'
        ? `<span class="badge badge-vino">ADMIN</span>`
        : `<span class="badge badge-blue">EMPLEADO</span>`;
}
function tipoBadge(tipo) {
    const map = { ENTRADA: 'badge-green', SALIDA: 'badge-vino', TRANSFERENCIA: 'badge-gold' };
    return `<span class="badge ${map[tipo] || 'badge-blue'}">${tipo}</span>`;
}
function tamanoBadge(t) {
    const map = { PEQUENO: 'badge-blue', MEDIANO: 'badge-gold', GRANDE: 'badge-vino' };
    return `<span class="badge ${map[t] || 'badge-blue'}">${t}</span>`;
}

// ══════════════════════════════════════════
// JWT — DECODIFICAR ROL
// ══════════════════════════════════════════
/**
 * Decodifica el payload de un JWT sin verificar firma.
 * Solo para uso en UI (la verificación real ocurre en el backend).
 */
function decodeJwtPayload(token) {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
            atob(base64).split('').map(c =>
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join('')
        );
        return JSON.parse(json);
    } catch {
        return null;
    }
}

/**
 * Aplica restricciones de UI según el rol:
 * - Oculta el botón "Nuevo Empleado"
 * - Oculta botones editar/eliminar en la tabla de empleados
 * - Deshabilita la pestaña de Empleados para no-admins (opcional: solo oculta acciones)
 */
function aplicarRestriccionesRol() {
    const esAdmin = CURRENT_ROL === 'ADMIN';

    // Mostrar u ocultar pestaña "Empleados" en el header
    const navEmpleados = document.getElementById('nav-empleados');
    if (navEmpleados) {
        navEmpleados.style.display = esAdmin ? '' : 'none';
    }

    // Botón "Nueva Bodega", "Nuevo Producto", etc. → puedes dejarlos visibles o restringirlos también

    // Botón "Nuevo Empleado" (si existe en la página de empleados)
    const btnNuevoEmpleado = document.querySelector('#page-empleados .btn-primary');
    if (btnNuevoEmpleado) {
        btnNuevoEmpleado.style.display = esAdmin ? '' : 'none';
    }

    // Banner informativo en página de empleados para no-admins
    const pageEmpleados = document.getElementById('page-empleados');
    if (pageEmpleados) {
        let banner = document.getElementById('banner-solo-lectura');
        if (!esAdmin) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'banner-solo-lectura';
                banner.className = 'alert warning';
                banner.innerHTML = `
                    <strong>Modo solo lectura</strong><br>
                    Solo los administradores pueden crear, editar o eliminar empleados.
                `;
                const actionsBar = pageEmpleados.querySelector('.actions-bar') || pageEmpleados.firstElementChild;
                pageEmpleados.insertBefore(banner, actionsBar);
            }
        } else if (banner) {
            banner.remove();
        }
    }

    // Opcional: ocultar botones editar/eliminar en la tabla de empleados
    if (!esAdmin && document.getElementById('tbody-empleados')) {
        document.querySelectorAll('#tbody-empleados .actions-cell').forEach(cell => {
            cell.innerHTML = '<span style="color:#888;font-size:12px;">Solo lectura</span>';
        });
    }
}

// ══════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════
document.getElementById('login-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
});
document.getElementById('btn-login').addEventListener('click', doLogin);

async function doLogin() {
    const usuario = document.getElementById('login-usuario').value.trim();
    const contrasena = document.getElementById('login-pass').value;
    const btn = document.getElementById('btn-login');
    const err = document.getElementById('login-error');

    if (!usuario || !contrasena) {
        err.textContent = 'Por favor completa todos los campos.';
        err.classList.add('show');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'VERIFICANDO...';
    err.classList.remove('show');

    try {
        const response = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, contrasena })
        });

        const json = await response.json();

        if (!response.ok) {
            throw new Error(json.message || 'Credenciales inválidas');
        }

        // Guardamos token y usuario
        TOKEN = json.token;
        CURRENT_USER = usuario;

        // ── Obtener el rol ───────────────────────────────────────────────
        let rol = 'EMPLEADO'; // valor por defecto (seguridad)

        // Opción 1: si el backend lo devuelve directamente en la respuesta (recomendado)
        if (json.rol) {
            rol = json.rol;
        }
        // Opción 2: decodificar del JWT (si no viene en json.rol)
        else if (json.token) {
            const payload = decodeJwtPayload(json.token);
            rol = payload?.rol || payload?.role || payload?.authorities?.[0] || 'EMPLEADO';
        }

        CURRENT_ROL = rol;

        // Mostrar nombre + rol con badge bonito en el header
        const headerUser = document.querySelector('.header-user');
        if (headerUser) {
            const colorBg = rol === 'ADMIN' ? 'rgba(107,26,42,0.4)' : 'rgba(59,130,246,0.2)';
            const colorText = rol === 'ADMIN' ? '#A63248' : '#93C5FD';
            const colorBorder = rol === 'ADMIN' ? 'rgba(107,26,42,0.5)' : 'rgba(59,130,246,0.3)';

            headerUser.innerHTML = `
                Sesión: 
                <span id="header-user-name">${usuario}</span>
                <span style="
                    display: inline-block;
                    margin-left: 8px;
                    padding: 2px 8px;
                    border-radius: 2px;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 1px;
                    font-family: 'JetBrains Mono', monospace;
                    background: ${colorBg};
                    color: ${colorText};
                    border: 1px solid ${colorBorder};
                ">${rol}</span>
            `;
        }

        // Ocultar login y mostrar app
        document.getElementById('login-page').classList.add('hide');
        document.getElementById('app').classList.add('visible');

        // Aplicar restricciones de UI según rol
        aplicarRestriccionesRol();

        // Cargar la página inicial
        loadBodegas();

    } catch (e) {
        err.textContent = e.message || 'Error de conexión. Verifica que el servidor esté activo.';
        err.classList.add('show');
    } finally {
        btn.disabled = false;
        btn.textContent = 'INGRESAR AL SISTEMA';
    }
}   

function logout() {
    TOKEN = null;
    CURRENT_USER = null;
    CURRENT_ROL = null; 
    document.getElementById('login-page').classList.remove('hide');
    document.getElementById('app').classList.remove('visible');
    document.getElementById('login-usuario').value = '';
    document.getElementById('login-pass').value = '';
    // Limpiar banner si existe
    const banner = document.getElementById('banner-solo-lectura');
    if (banner) banner.remove();
}

// ══════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════
const PAGE_LOADERS = {
    bodegas: loadBodegas,
    productos: loadProductos,
    empleados: loadEmpleados,
    inventario: loadInventario,
    movimientos: loadMovimientos,
    detalles: loadDetalles
};

function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`page-${name}`).classList.add('active');
    event.currentTarget.classList.add('active');
    if (PAGE_LOADERS[name]) PAGE_LOADERS[name]();
}

// ══════════════════════════════════════════
// FILTER
// ══════════════════════════════════════════
function filterTable(name) {
    const val = document.getElementById(`search-${name}`).value.toLowerCase();
    const rows = document.querySelectorAll(`#tbody-${name} tr`);
    rows.forEach(r => {
        r.style.display = r.textContent.toLowerCase().includes(val) ? '' : 'none';
    });
}

// ══════════════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════════════
function openModal(name) {
    document.getElementById(`modal-${name}`).classList.add('open');
}
function closeModal(name) {
    document.getElementById(`modal-${name}`).classList.remove('open');
}
document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

// ══════════════════════════════════════════
// BODEGAS
// ══════════════════════════════════════════
let bodegasData = [];

async function loadBodegas() {
    const tbody = document.getElementById('tbody-bodegas');
    tbody.innerHTML = '<tr class="loading-row"><td colspan="6">Cargando...</td></tr>';
    try {
        bodegasData = await api('GET', '/api/bodega');
        renderBodegas(bodegasData);
        const total = bodegasData.length;
        const capTotal = bodegasData.reduce((s, b) => s + (b.capacidad || 0), 0);
        const capProm = total ? Math.round(capTotal / total) : 0;
        const encargados = new Set(bodegasData.map(b => b.idEncargado?.id)).size;
        document.getElementById('stat-total-bodegas').textContent = total;
        document.getElementById('stat-cap-total').textContent = fmt(capTotal);
        document.getElementById('stat-cap-prom').textContent = fmt(capProm);
        document.getElementById('stat-encargados').textContent = encargados;
        document.getElementById('count-bodegas').innerHTML = `${total} <small>registros</small>`;
    } catch (e) { toast(e.message, 'error'); tbody.innerHTML = `<tr class="loading-row"><td colspan="6">Error al cargar</td></tr>`; }
}

function renderBodegas(data) {
    const tbody = document.getElementById('tbody-bodegas');
    if (!data.length) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No hay bodegas registradas</p></div></td></tr>`; return; }
    tbody.innerHTML = data.map(b => `
    <tr>
        <td class="id-cell">#${b.id}</td>
        <td><strong>${b.nombre}</strong></td>
        <td>${b.ubicacion}</td>
        <td>
        <div>${fmt(b.capacidad)} u.</div>
        <div class="capacity-bar"><div class="capacity-fill" style="width:${Math.min(100, (b.capacidad / 1000) * 100)}%"></div></div>
        </td>
        <td>${b.idEncargado ? `<span style="color:var(--blanco-2)">${b.idEncargado.nombre || '—'}</span>` : '—'}</td>
        <td><div class="actions-cell">
        <button class="btn-icon btn-edit" onclick="editBodega(${b.id})" title="Editar">✎</button>
        <button class="btn-icon btn-delete" onclick="deleteBodega(${b.id}, '${b.nombre}')" title="Eliminar">✕</button>
        </div></td>
    </tr>`).join('');
}

function editBodega(id) {
    const b = bodegasData.find(x => x.id === id);
    if (!b) return;
    document.getElementById('modal-bodega-title').textContent = 'Editar Bodega';
    document.getElementById('bodega-id').value = b.id;
    document.getElementById('bodega-nombre').value = b.nombre;
    document.getElementById('bodega-ubicacion').value = b.ubicacion;
    document.getElementById('bodega-capacidad').value = b.capacidad;
    document.getElementById('bodega-encargado').value = b.idEncargado?.id || '';
    openModal('bodega');
}

async function saveBodega() {
    const id = document.getElementById('bodega-id').value;
    const body = {
        nombre: document.getElementById('bodega-nombre').value,
        ubicacion: document.getElementById('bodega-ubicacion').value,
        capacidad: parseInt(document.getElementById('bodega-capacidad').value),
        idEncargado: parseInt(document.getElementById('bodega-encargado').value)
    };
    try {
        if (id) await api('PUT', `/api/bodega/${id}`, body);
        else await api('POST', '/api/bodega', body);
        closeModal('bodega');
        clearBodegaForm();
        toast(id ? 'Bodega actualizada' : 'Bodega creada', 'success');
        loadBodegas();
    } catch (e) { toast(e.message, 'error'); }
}

function clearBodegaForm() {
    ['bodega-id', 'bodega-nombre', 'bodega-ubicacion', 'bodega-capacidad', 'bodega-encargado'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('modal-bodega-title').textContent = 'Nueva Bodega';
}

function deleteBodega(id, nombre) {
    document.getElementById('confirm-msg').innerHTML = `¿Eliminar la bodega <strong>${nombre}</strong>? Esta acción no se puede deshacer.`;
    document.getElementById('btn-confirm-delete').onclick = async () => {
        try { await api('DELETE', `/api/bodega/${id}`); closeModal('confirm'); toast('Bodega eliminada', 'success'); loadBodegas(); }
        catch (e) { toast(e.message, 'error'); }
    };
    openModal('confirm');
}

document.getElementById('modal-bodega').querySelector('.btn-primary').addEventListener('click', () => { });
document.getElementById('modal-bodega').querySelector('.modal-close').addEventListener('click', clearBodegaForm);

// ══════════════════════════════════════════
// PRODUCTOS
// ══════════════════════════════════════════
let productosData = [];

async function loadProductos() {
    const tbody = document.getElementById('tbody-productos');
    tbody.innerHTML = '<tr class="loading-row"><td colspan="6">Cargando...</td></tr>';
    try {
        productosData = await api('GET', '/api/producto');
        document.getElementById('count-productos').innerHTML = `${productosData.length} <small>registros</small>`;
        if (!productosData.length) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No hay productos</p></div></td></tr>`; return; }
        tbody.innerHTML = productosData.map(p => `
        <tr>
        <td class="id-cell">#${p.id}</td>
        <td><strong>${p.nombre}</strong></td>
        <td><span class="badge badge-blue">${p.categoria}</span></td>
        <td>${tamanoBadge(p.tamano)}</td>
        <td style="font-family:'JetBrains Mono',monospace;color:var(--gold)">${fmtMoney(p.precioMensual)}</td>
        <td><div class="actions-cell">
            <button class="btn-icon btn-edit" onclick="editProducto(${p.id})">✎</button>
            <button class="btn-icon btn-delete" onclick="deleteProducto(${p.id}, '${p.nombre}')">✕</button>
        </div></td>
        </tr>`).join('');
    } catch (e) { toast(e.message, 'error'); tbody.innerHTML = `<tr class="loading-row"><td colspan="6">Error al cargar</td></tr>`; }
}

function editProducto(id) {
    const p = productosData.find(x => x.id === id);
    if (!p) return;
    document.getElementById('modal-producto-title').textContent = 'Editar Producto';
    document.getElementById('producto-id').value = p.id;
    document.getElementById('producto-nombre').value = p.nombre;
    document.getElementById('producto-categoria').value = p.categoria;
    document.getElementById('producto-tamano').value = p.tamano;
    document.getElementById('producto-precio').value = p.precioMensual;
    openModal('producto');
}

async function saveProducto() {
    const id = document.getElementById('producto-id').value;
    const body = {
        nombre: document.getElementById('producto-nombre').value,
        categoria: document.getElementById('producto-categoria').value,
        tamano: document.getElementById('producto-tamano').value,
        precioMensual: parseFloat(document.getElementById('producto-precio').value)
    };
    try {
        if (id) await api('PUT', `/api/producto/${id}`, body);
        else await api('POST', '/api/producto', body);
        closeModal('producto');
        document.getElementById('producto-id').value = '';
        document.getElementById('modal-producto-title').textContent = 'Nuevo Producto';
        toast(id ? 'Producto actualizado' : 'Producto creado', 'success');
        loadProductos();
    } catch (e) { toast(e.message, 'error'); }
}

function deleteProducto(id, nombre) {
    document.getElementById('confirm-msg').innerHTML = `¿Eliminar el producto <strong>${nombre}</strong>?`;
    document.getElementById('btn-confirm-delete').onclick = async () => {
        try { await api('DELETE', `/api/producto/${id}`); closeModal('confirm'); toast('Producto eliminado', 'success'); loadProductos(); }
        catch (e) { toast(e.message, 'error'); }
    };
    openModal('confirm');
}

// ══════════════════════════════════════════
// EMPLEADOS
// ══════════════════════════════════════════
let empleadosData = [];

async function loadEmpleados() {
    const tbody = document.getElementById('tbody-empleados');
    tbody.innerHTML = '<tr class="loading-row"><td colspan="7">Cargando...</td></tr>';
    try {
        empleadosData = await api('GET', '/api/empleado');
        document.getElementById('count-empleados').innerHTML = `${empleadosData.length} <small>registros</small>`;
        if (!empleadosData.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>No hay empleados</p></div></td></tr>`; return; }

        const esAdmin = CURRENT_ROL === 'ADMIN';

        tbody.innerHTML = empleadosData.map(e => `
        <tr>
        <td class="id-cell">#${e.id}</td>
        <td><strong>${e.nombre}</strong></td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${e.documento}</td>
        <td>${e.correo}</td>
        <td>${e.telefono}</td>
        <td>${rolBadge(e.rol)}</td>
        <td><div class="actions-cell">
            ${esAdmin
                ? `<button class="btn-icon btn-edit" onclick="editEmpleado(${e.id})">✎</button>
                    <button class="btn-icon btn-delete" onclick="deleteEmpleado(${e.id}, '${e.nombre}')">✕</button>`
                : `<span style="font-size:11px;color:var(--gris);letter-spacing:0.5px">— sin acceso —</span>`
            }
        </div></td>
        </tr>`).join('');

        // Re-aplicar restricciones de UI (banner, botón)
        aplicarRestriccionesRol();
    } catch (e) { toast(e.message, 'error'); tbody.innerHTML = `<tr class="loading-row"><td colspan="7">Error al cargar</td></tr>`; }
}

function editEmpleado(id) {
    // Verificación de seguridad en cliente
    if (CURRENT_ROL !== 'ADMIN') {
        toast('Acceso denegado: solo los administradores pueden editar empleados.', 'error');
        return;
    }
    const e = empleadosData.find(x => x.id === id);
    if (!e) return;
    document.getElementById('modal-empleado-title').textContent = 'Editar Empleado';
    document.getElementById('empleado-id').value = e.id;
    document.getElementById('empleado-nombre').value = e.nombre;
    document.getElementById('empleado-documento').value = e.documento;
    document.getElementById('empleado-correo').value = e.correo;
    document.getElementById('empleado-telefono').value = e.telefono;
    document.getElementById('empleado-rol').value = e.rol;
    openModal('empleado');
}

async function saveEmpleado() {
    if (CURRENT_ROL !== 'ADMIN') { toast('Acceso denegado', 'error'); return; }

    const id         = document.getElementById('empleado-id').value;
    const nombre     = document.getElementById('empleado-nombre').value.trim();
    const documento  = document.getElementById('empleado-documento').value.trim();
    const correo     = document.getElementById('empleado-correo').value.trim();
    const telefono   = document.getElementById('empleado-telefono').value.trim();
    const rol        = document.getElementById('empleado-rol').value;
    const usuario    = document.getElementById('empleado-usuario').value.trim();
    const contrasena = document.getElementById('empleado-contrasena').value;

    // Todo va en un solo @RequestBody — EmpleadoCreateRequestDTO
    const body = { nombre, documento, correo, telefono, rol, usuario };
    if (contrasena) body.contrasena = contrasena; // opcional en edicion

    try {
        if (id) await api('PUT',  `/api/empleado/${id}`, body);
        else    await api('POST', '/api/empleado', body);

        closeModal('empleado');
        clearEmpleadoForm();
        toast(id ? 'Empleado actualizado' : 'Empleado creado', 'success');
        loadEmpleados();
    } catch (e) {
        toast(e.message || 'Error al guardar empleado', 'error');
    }
}

function clearEmpleadoForm() {
    ['empleado-id','empleado-nombre','empleado-documento','empleado-correo',
     'empleado-telefono','empleado-usuario','empleado-contrasena'].forEach(
        id => { const el = document.getElementById(id); if (el) el.value = ''; }
    );
    const rol = document.getElementById('empleado-rol');
    if (rol) rol.value = '';
    document.getElementById('modal-empleado-title').textContent = 'Nuevo Empleado';
    const nota = document.getElementById('nota-contrasena');
    if (nota) nota.style.display = 'none';
}


function deleteEmpleado(id, nombre) {
    // ── GUARD: solo ADMIN puede eliminar empleados ─────────────────
    if (CURRENT_ROL !== 'ADMIN') {
        toast('Acceso denegado: solo los administradores pueden eliminar empleados.', 'error');
        return;
    }
    document.getElementById('confirm-msg').innerHTML = `¿Eliminar al empleado <strong>${nombre}</strong>?`;
    document.getElementById('btn-confirm-delete').onclick = async () => {
        try { await api('DELETE', `/api/empleado/${id}`); closeModal('confirm'); toast('Empleado eliminado', 'success'); loadEmpleados(); }
        catch (e) { toast(e.message, 'error'); }
    };
    openModal('confirm');
}

// ══════════════════════════════════════════
// INVENTARIO
// ══════════════════════════════════════════
let inventarioData = [];

async function loadInventario() {
    const tbody = document.getElementById('tbody-inventario');
    tbody.innerHTML = '<tr class="loading-row"><td colspan="5">Cargando...</td></tr>';
    try {
        inventarioData = await api('GET', '/api/inventario');
        document.getElementById('count-inventario').innerHTML = `${inventarioData.length} <small>registros</small>`;
        if (!inventarioData.length) { tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>No hay registros de inventario</p></div></td></tr>`; return; }
        tbody.innerHTML = inventarioData.map(i => `
        <tr>
        <td class="id-cell">#${i.id}</td>
        <td>${i.bodega?.nombre || '—'}</td>
        <td>${i.producto?.nombre || '—'}</td>
        <td><span style="font-family:'JetBrains Mono',monospace;color:var(--gold)">${fmt(i.cantidad)}</span> u.</td>
        <td><div class="actions-cell">
            <button class="btn-icon btn-edit" onclick="editInventario(${i.id})">✎</button>
            <button class="btn-icon btn-delete" onclick="deleteInventario(${i.id})">✕</button>
        </div></td>
        </tr>`).join('');
    } catch (e) { toast(e.message, 'error'); tbody.innerHTML = `<tr class="loading-row"><td colspan="5">Error al cargar</td></tr>`; }
}

function editInventario(id) {
    const i = inventarioData.find(x => x.id === id);
    if (!i) return;
    document.getElementById('modal-inventario-title').textContent = 'Editar Inventario';
    document.getElementById('inventario-id').value = i.id;
    document.getElementById('inventario-bodega').value = i.bodega?.id || '';
    document.getElementById('inventario-producto').value = i.producto?.id || '';
    document.getElementById('inventario-cantidad').value = i.cantidad;
    openModal('inventario');
}

async function saveInventario() {
    const id = document.getElementById('inventario-id').value;
    const body = {
        idBodega: parseInt(document.getElementById('inventario-bodega').value),
        idProducto: parseInt(document.getElementById('inventario-producto').value),
        cantidad: parseInt(document.getElementById('inventario-cantidad').value)
    };
    try {
        if (id) await api('PUT', `/api/inventario/${id}`, body);
        else await api('POST', '/api/inventario', body);
        closeModal('inventario');
        document.getElementById('inventario-id').value = '';
        document.getElementById('modal-inventario-title').textContent = 'Nuevo Registro de Inventario';
        toast(id ? 'Inventario actualizado' : 'Registro creado', 'success');
        loadInventario();
    } catch (e) { toast(e.message, 'error'); }
}

function deleteInventario(id) {
    document.getElementById('confirm-msg').innerHTML = `¿Eliminar el registro de inventario <strong>#${id}</strong>?`;
    document.getElementById('btn-confirm-delete').onclick = async () => {
        try { await api('DELETE', `/api/inventario/${id}`); closeModal('confirm'); toast('Registro eliminado', 'success'); loadInventario(); }
        catch (e) { toast(e.message, 'error'); }
    };
    openModal('confirm');
}

// ══════════════════════════════════════════
// MOVIMIENTOS
// ══════════════════════════════════════════
let movimientosData = [];

async function loadMovimientos() {
    const tbody = document.getElementById('tbody-movimientos');
    tbody.innerHTML = '<tr class="loading-row"><td colspan="7">Cargando...</td></tr>';
    try {
        movimientosData = await api('GET', '/api/movimiento');
        document.getElementById('count-movimientos').innerHTML = `${movimientosData.length} <small>registros</small>`;
        if (!movimientosData.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>No hay movimientos</p></div></td></tr>`; return; }
        tbody.innerHTML = movimientosData.map(m => `
        <tr>
        <td class="id-cell">#${m.id}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${m.fecha || '—'}</td>
        <td>${tipoBadge(m.tipoMovimiento)}</td>
        <td>${m.idEmpleado?.nombre || '—'}</td>
        <td>${m.idBodegaOrigen?.nombre || '—'}</td>
        <td>${m.idBodegaDestino?.nombre || '—'}</td>
        <td><div class="actions-cell">
            <button class="btn-icon btn-edit" onclick="editMovimiento(${m.id})">✎</button>
            <button class="btn-icon btn-delete" onclick="deleteMovimiento(${m.id})">✕</button>
        </div></td>
        </tr>`).join('');
    } catch (e) { toast(e.message, 'error'); tbody.innerHTML = `<tr class="loading-row"><td colspan="7">Error al cargar</td></tr>`; }
}

function editMovimiento(id) {
    const m = movimientosData.find(x => x.id === id);
    if (!m) return;
    document.getElementById('modal-movimiento-title').textContent = 'Editar Movimiento';
    document.getElementById('movimiento-id').value = m.id;
    document.getElementById('movimiento-fecha').value = m.fecha;
    document.getElementById('movimiento-tipo').value = m.tipoMovimiento;
    document.getElementById('movimiento-empleado').value = m.idEmpleado?.id || '';
    document.getElementById('movimiento-origen').value = m.idBodegaOrigen?.id || '';
    document.getElementById('movimiento-destino').value = m.idBodegaDestino?.id || '';
    openModal('movimiento');
}

async function saveMovimiento() {
    const id = document.getElementById('movimiento-id').value;
    const body = {
        fecha: document.getElementById('movimiento-fecha').value,
        tipoMovimiento: document.getElementById('movimiento-tipo').value,
        idEmpleado: parseInt(document.getElementById('movimiento-empleado').value),
        idBodegaOrigen: parseInt(document.getElementById('movimiento-origen').value),
        idBodegaDestino: parseInt(document.getElementById('movimiento-destino').value)
    };
    try {
        if (id) await api('PUT', `/api/movimiento/${id}`, body);
        else await api('POST', '/api/movimiento', body);
        closeModal('movimiento');
        document.getElementById('movimiento-id').value = '';
        document.getElementById('modal-movimiento-title').textContent = 'Nuevo Movimiento';
        toast(id ? 'Movimiento actualizado' : 'Movimiento creado', 'success');
        loadMovimientos();
    } catch (e) { toast(e.message, 'error'); }
}

function deleteMovimiento(id) {
    document.getElementById('confirm-msg').innerHTML = `¿Eliminar el movimiento <strong>#${id}</strong>? Esta acción no se puede deshacer.`;
    document.getElementById('btn-confirm-delete').onclick = async () => {
        try { await api('DELETE', `/api/movimiento/${id}`); closeModal('confirm'); toast('Movimiento eliminado', 'success'); loadMovimientos(); }
        catch (e) { toast(e.message, 'error'); }
    };
    openModal('confirm');
}

// ══════════════════════════════════════════
// DETALLES MOVIMIENTO
// ══════════════════════════════════════════
let detallesData = [];

async function loadDetalles() {
    const tbody = document.getElementById('tbody-detalles');
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">
        <p>Usa el botón <strong>Nuevo Detalle</strong> o busca por ID de movimiento</p>
    </div></td></tr>`;
    document.getElementById('count-detalles').innerHTML = `— <small>registros</small>`;
}

async function buscarDetallesPorMovimiento(idMov) {
    if (!idMov) return;
    const tbody = document.getElementById('tbody-detalles');
    tbody.innerHTML = '<tr class="loading-row"><td colspan="5">Buscando...</td></tr>';
    try {
        detallesData = await api('GET', `/api/detalleMovimiento/movimiento/${idMov}`);
        document.getElementById('count-detalles').innerHTML = `${detallesData.length} <small>registros</small>`;
        if (!detallesData.length) { tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>No hay detalles para este movimiento</p></div></td></tr>`; return; }
        tbody.innerHTML = detallesData.map(d => `
        <tr>
        <td class="id-cell">#${d.id}</td>
        <td><span class="badge badge-vino">#${d.idMovimiento?.id || '—'}</span> ${tipoBadge(d.idMovimiento?.tipoMovimiento || '')}</td>
        <td>${d.idProducto?.nombre || '—'}</td>
        <td style="font-family:'JetBrains Mono',monospace;color:var(--gold)">${fmt(d.cantidad)}</td>
        <td><div class="actions-cell">
            <button class="btn-icon btn-edit" onclick="editDetalle(${d.id})">✎</button>
            <button class="btn-icon btn-delete" onclick="deleteDetalle(${d.id})">✕</button>
        </div></td>
        </tr>`).join('');
    } catch (e) { toast(e.message, 'error'); tbody.innerHTML = `<tr class="loading-row"><td colspan="5">Error al cargar</td></tr>`; }
}

document.getElementById('search-detalles').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const val = e.target.value.trim();
        if (/^\d+$/.test(val)) buscarDetallesPorMovimiento(val);
        else filterTable('detalles');
    }
});
document.getElementById('search-detalles').placeholder = 'ID movimiento + Enter para buscar...';

function editDetalle(id) {
    const d = detallesData.find(x => x.id === id);
    if (!d) return;
    document.getElementById('modal-detalle-title').textContent = 'Editar Detalle';
    document.getElementById('detalle-id').value = d.id;
    document.getElementById('detalle-movimiento').value = d.idMovimiento?.id || '';
    document.getElementById('detalle-producto').value = d.idProducto?.id || '';
    document.getElementById('detalle-cantidad').value = d.cantidad;
    openModal('detalle');
}

async function saveDetalle() {
    const id = document.getElementById('detalle-id').value;
    const body = {
        idMovimiento: parseInt(document.getElementById('detalle-movimiento').value),
        idProducto: parseInt(document.getElementById('detalle-producto').value),
        cantidad: parseInt(document.getElementById('detalle-cantidad').value)
    };
    try {
        if (id) await api('PUT', `/api/detalleMovimiento/${id}`, body);
        else await api('POST', '/api/detalleMovimiento', body);
        closeModal('detalle');
        document.getElementById('detalle-id').value = '';
        document.getElementById('modal-detalle-title').textContent = 'Nuevo Detalle de Movimiento';
        toast(id ? 'Detalle actualizado' : 'Detalle creado', 'success');
        if (body.idMovimiento) buscarDetallesPorMovimiento(body.idMovimiento);
    } catch (e) { toast(e.message, 'error'); }
}

function deleteDetalle(id) {
    document.getElementById('confirm-msg').innerHTML = `¿Eliminar el detalle <strong>#${id}</strong>?`;
    document.getElementById('btn-confirm-delete').onclick = async () => {
        try { await api('DELETE', `/api/detalleMovimiento/${id}`); closeModal('confirm'); toast('Detalle eliminado', 'success'); loadDetalles(); }
        catch (e) { toast(e.message, 'error'); }
    };
    openModal('confirm');
}

// Set today's date for movimiento
document.getElementById('movimiento-fecha').value = new Date().toISOString().split('T')[0];