import { renderAdminLayout } from "../components/admin-layout.js";
import { ProveedorService } from "../services/ProveedorService.js";

renderAdminLayout({ active: "proveedores" });

const servicio = new ProveedorService();

const tbody = document.getElementById("tabla-proveedores");
const alerta = document.getElementById("alerta");
const formFiltros = document.getElementById("form-filtros");
const filtroTexto = document.getElementById("filtro-texto");
const filtroCategoria = document.getElementById("filtro-categoria");
const filtroEstado = document.getElementById("filtro-estado");
const resumenListado = document.getElementById("resumen-listado");

const CATEGORIAS_BASE = ["Distribuidora", "Laboratorio", "Mayorista", "Importador", "Otros"];

let proveedores = [];
let temporizadorBusqueda = null;

formFiltros.addEventListener("submit", (evento) => {
  evento.preventDefault();
  aplicarFiltros();
});

filtroTexto.addEventListener("input", () => {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(aplicarFiltros, 220);
});

filtroCategoria.addEventListener("change", aplicarFiltros);
filtroEstado.addEventListener("change", aplicarFiltros);

tbody.addEventListener("click", (evento) => {
  if (evento.target.closest('[data-accion="limpiar"]')) limpiarFiltros();
});

window.addEventListener("pageshow", (evento) => {
  if (evento.persisted) cargarProveedores();
});

cargarProveedores();

async function cargarProveedores() {
  try {
    proveedores = await servicio.listar();
    poblarCategorias();
    actualizarKpis();
    aplicarFiltros();
  } catch (error) {
    mostrarAlerta(
      "No se pudieron cargar los proveedores. " + explicarError(error),
      "danger"
    );
    tbody.innerHTML = filaMensaje(
      "No se pudo cargar el listado. Revisa tu conexión y los permisos de Firestore.",
      "bi-exclamation-triangle"
    );
    resumenListado.textContent = "";
  }
}

function poblarCategorias() {
  const seleccionada = filtroCategoria.value;
  const categorias = new Set(CATEGORIAS_BASE);

  proveedores.forEach((proveedor) => {
    if (proveedor.categoria) categorias.add(String(proveedor.categoria).trim());
  });

  const ordenadas = [...categorias].filter(Boolean).sort((a, b) => {
    const posicionA = CATEGORIAS_BASE.indexOf(a);
    const posicionB = CATEGORIAS_BASE.indexOf(b);

    if (posicionA !== -1 && posicionB !== -1) return posicionA - posicionB;
    if (posicionA !== -1) return -1;
    if (posicionB !== -1) return 1;
    return a.localeCompare(b, "es", { sensitivity: "base" });
  });

  filtroCategoria.innerHTML = '<option value="">Todas</option>' +
    ordenadas
      .map((categoria) =>
        `<option value="${escapeHtml(categoria)}">${escapeHtml(categoria)}</option>`)
      .join("");

  filtroCategoria.value = ordenadas.includes(seleccionada) ? seleccionada : "";
}

function actualizarKpis() {
  const total = proveedores.length;
  const activos = proveedores.filter((proveedor) => estadoDe(proveedor) === "activo").length;

  document.getElementById("kpi-total").textContent = total;
  document.getElementById("kpi-activos").textContent = activos;
  document.getElementById("kpi-inactivos").textContent = total - activos;
}

function aplicarFiltros() {
  const texto = normalizar(filtroTexto.value.trim());
  const categoria = filtroCategoria.value;
  const estado = filtroEstado.value;

  const lista = proveedores.filter((proveedor) => {
    const coincideTexto = !texto ||
      normalizar(proveedor.ruc).includes(texto) ||
      normalizar(proveedor.razonSocial).includes(texto);

    const coincideCategoria = !categoria || proveedor.categoria === categoria;
    const coincideEstado = !estado || estadoDe(proveedor) === estado;

    return coincideTexto && coincideCategoria && coincideEstado;
  });

  renderTabla(lista);

  if (!proveedores.length) {
    resumenListado.textContent = "Sin registros";
  } else if (lista.length === proveedores.length) {
    resumenListado.textContent =
      `${proveedores.length} proveedor${proveedores.length === 1 ? "" : "es"} registrado${proveedores.length === 1 ? "" : "s"}`;
  } else {
    resumenListado.textContent = `Mostrando ${lista.length} de ${proveedores.length} proveedores`;
  }
}

function renderTabla(lista) {
  if (!lista.length) {
    const hayFiltros = Boolean(filtroTexto.value.trim() || filtroCategoria.value || filtroEstado.value);

    tbody.innerHTML = hayFiltros
      ? filaMensaje(
          'No se encontraron proveedores con esos filtros. <button type="button" class="btn btn-sm btn-outline-dark ms-2" data-accion="limpiar">Limpiar filtros</button>',
          "bi-search"
        )
      : filaMensaje(
          'Aún no hay proveedores registrados. Usa el botón «Nuevo Proveedor» para agregar el primero.',
          "bi-inboxes"
        );
    return;
  }

  tbody.innerHTML = lista.map((proveedor) => {
    const estado = estadoDe(proveedor);
    const nombre = escapeHtml(proveedor.razonSocial || "este proveedor");

    return `
      <tr>
        <td class="cell-main">${escapeHtml(proveedor.ruc)}</td>
        <td>${escapeHtml(proveedor.razonSocial)}</td>
        <td>${escapeHtml(proveedor.contacto)}</td>
        <td>${escapeHtml(proveedor.telefono)}</td>
        <td>${escapeHtml(proveedor.correo)}</td>
        <td>${escapeHtml(proveedor.categoria)}</td>
        <td>
          <span class="badge-estado ${estado}">${estado === "activo" ? "Activo" : "Inactivo"}</span>
        </td>
        <td class="cell-actions">
          <a class="btn btn-sm btn-outline-dark"
             href="proveedor-detalle.html?id=${encodeURIComponent(proveedor.id)}"
             aria-label="Ver detalle de ${nombre}">Ver</a>
          <a class="btn btn-sm btn-brand ms-1"
             href="proveedor-formulario.html?id=${encodeURIComponent(proveedor.id)}"
             aria-label="Editar ${nombre}">Editar</a>
        </td>
      </tr>`;
  }).join("");
}

function limpiarFiltros() {
  filtroTexto.value = "";
  filtroCategoria.value = "";
  filtroEstado.value = "";
  aplicarFiltros();
  filtroTexto.focus();
}

function filaMensaje(mensaje, icono = "bi-info-circle") {
  return `
    <tr>
      <td colspan="8" class="table-empty">
        <i class="bi ${icono}" aria-hidden="true"></i>
        ${mensaje}
      </td>
    </tr>`;
}

function estadoDe(proveedor) {
  return String(proveedor.estado || "activo").toLowerCase() === "inactivo"
    ? "inactivo"
    : "activo";
}

function normalizar(valor) {
  return String(valor ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mostrarAlerta(texto, tipo = "danger") {
  alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
  alerta.innerHTML = `
    ${escapeHtml(texto)}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>`;
}

function explicarError(error) {
  const mensaje = String(error?.message || error || "");
  if (/permission|insufficient/i.test(mensaje)) {
    return "Firestore rechazó la lectura (revisa las reglas de seguridad).";
  }
  return mensaje;
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
