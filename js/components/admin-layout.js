/**
 * Cabecera y menú lateral compartidos por las pantallas de administración.
 * Cada página debe incluir:
 *
 *   <header id="admin-header" class="admin-header"></header>
 *   <aside id="admin-sidebar" class="admin-sidebar"></aside>
 *
 * y llamar a renderAdminLayout({ active: "proveedores" }).
 */

const NAV_ITEMS = [
  { id: "inicio", label: "Inicio", href: "#", pendiente: true },
  { id: "ventas", label: "Ventas", href: "#", pendiente: true, desplegable: true },
  { id: "inventario", label: "Inventario", href: "#", pendiente: true },
  { id: "productos", label: "Productos", href: "#", pendiente: true },
  { id: "clientes", label: "Clientes", href: "#", pendiente: true },
  { id: "proveedores", label: "Proveedores", href: "proveedores.html" },
  { id: "usuarios", label: "Usuarios", href: "#", pendiente: true }
];

export function renderAdminLayout({ active = "" } = {}) {
  const header = document.getElementById("admin-header");
  const sidebar = document.getElementById("admin-sidebar");
  if (!header || !sidebar) return;

  const nombre = leer("usuarioNombre") || leer("nombreUsuario") || leer("usuario") || "Nombre usuario";
  const rol = leer("usuarioRol") || leer("rolUsuario") || "Administrador";

  header.innerHTML = `
    <a class="brand" href="proveedores.html" aria-label="Botica Belén, ir al directorio de proveedores">
      <span class="brand-icon" aria-hidden="true">
        <i class="bi bi-display"></i>
        <i class="bi bi-plus-lg brand-plus"></i>
      </span>
      <span class="brand-name">BOTICA BELÉN</span>
    </a>

    <div class="user-box">
      <span class="user-avatar" aria-hidden="true"><i class="bi bi-person-fill"></i></span>
      <span class="user-meta">
        <span class="user-name">${escapeHtml(nombre)}</span>
        <span class="user-role">${escapeHtml(rol)}</span>
      </span>
      <a class="logout-btn" href="../login.html" id="btn-salir" title="Cerrar sesión" aria-label="Cerrar sesión">
        <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
      </a>
    </div>`;

  sidebar.innerHTML = `
    <nav class="admin-nav" aria-label="Menú de administración">
      ${NAV_ITEMS.map((item) => {
        const esActivo = item.id === active;
        return `
          <a class="admin-nav-link${esActivo ? " active" : ""}"
             href="${item.href}"
             ${esActivo ? 'aria-current="page"' : ""}
             ${item.pendiente ? 'aria-disabled="true" data-pendiente="true" title="Módulo en desarrollo"' : ""}>
            <span>${item.label}</span>
            ${item.desplegable ? '<i class="bi bi-caret-down-fill caret" aria-hidden="true"></i>' : ""}
          </a>`;
      }).join("")}
    </nav>`;

  // Los módulos que todavía no existen no deben navegar a una página en blanco.
  sidebar.querySelectorAll('[data-pendiente="true"]').forEach((enlace) => {
    enlace.addEventListener("click", (evento) => {
      evento.preventDefault();
      anunciarEnDesarrollo(enlace.textContent.trim());
    });
  });

  document.getElementById("btn-salir")?.addEventListener("click", () => {
    try {
      [
        "usuarioNombre", "nombreUsuario", "usuario", "usuarioRol",
        "rolUsuario", "usuarioCorreo", "correoUsuario", "sesionActiva"
      ].forEach((clave) => localStorage.removeItem(clave));
    } catch {
      /* El almacenamiento puede estar bloqueado; la navegación continúa. */
    }
  });
}

/**
 * Aviso discreto para los enlaces del menú que aún no tienen pantalla.
 * Se usa un toast de Bootstrap si está disponible.
 */
function anunciarEnDesarrollo(modulo) {
  const texto = `${modulo} todavía no está disponible en esta entrega.`;
  let contenedor = document.getElementById("toast-modulo");

  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "toast-modulo";
    contenedor.className = "toast align-items-center text-bg-dark border-0 position-fixed bottom-0 end-0 m-3";
    contenedor.setAttribute("role", "status");
    contenedor.setAttribute("aria-live", "polite");
    contenedor.setAttribute("aria-atomic", "true");
    contenedor.innerHTML = `
      <div class="d-flex">
        <div class="toast-body"></div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto"
                data-bs-dismiss="toast" aria-label="Cerrar"></button>
      </div>`;
    document.body.appendChild(contenedor);
  }

  contenedor.querySelector(".toast-body").textContent = texto;

  if (window.bootstrap?.Toast) {
    window.bootstrap.Toast.getOrCreateInstance(contenedor, { delay: 3200 }).show();
  }
}

function leer(clave) {
  try {
    return (localStorage.getItem(clave) || "").trim();
  } catch {
    return "";
  }
}

function escapeHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[caracter]));
}
