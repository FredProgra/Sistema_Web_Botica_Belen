import { renderAdminLayout } from "../components/admin-layout.js";
import { ProveedorService } from "../services/ProveedorService.js";
import { CompraService } from "../services/CompraService.js";

renderAdminLayout({ active: "proveedores" });

const proveedorServicio = new ProveedorService();
const compraServicio = new CompraService();

const parametros = new URLSearchParams(location.search);
const id = parametros.get("id");

const contenido = document.getElementById("contenido");
const alerta = document.getElementById("alerta");
const tbodyCompras = document.getElementById("tabla-compras");
const resumenCompras = document.getElementById("resumen-compras");
const modalElemento = document.getElementById("modal-orden");

let proveedorActual = null;
let comprasActuales = [];

if (!id) {
  contenido.classList.add("d-none");
  mostrarAlerta(
    'No se indicó qué proveedor ver. <a href="proveedores.html" class="alert-link">Vuelve al listado</a>.',
    "warning"
  );
} else {
  document.getElementById("btn-editar").href =
    `proveedor-formulario.html?id=${encodeURIComponent(id)}`;

  mostrarMensajeDeExito();
  cargarPantalla();
}

window.addEventListener("pageshow", (evento) => {
  if (evento.persisted && id) cargarPantalla();
});

async function cargarPantalla() {
  try {
    const proveedor = await proveedorServicio.obtener(id);

    if (!proveedor) {
      contenido.classList.add("d-none");
      mostrarAlerta(
        'El proveedor no existe o fue eliminado. <a href="proveedores.html" class="alert-link">Volver al listado</a>.',
        "warning"
      );
      return;
    }

    proveedorActual = proveedor;
    pintarFicha(proveedor);
    await cargarCompras(proveedor);
  } catch (error) {
    contenido.classList.add("d-none");
    mostrarAlerta(
      "No se pudo cargar el proveedor. " + explicarError(error),
      "danger"
    );
  }
}

function pintarFicha(proveedor) {
  texto("det-ruc", proveedor.ruc);
  texto("det-razon", proveedor.razonSocial);
  texto("det-direccion", proveedor.direccion);
  texto("det-contacto", proveedor.contacto);
  texto("det-telefono", proveedor.telefono);
  texto("det-correo", proveedor.correo);
  texto("det-pago", proveedor.metodoPago);

  const estado = estadoDe(proveedor);
  const insignia = document.getElementById("det-estado");
  insignia.className = `badge-estado ${estado} detalle-estado`;
  insignia.textContent = estado === "activo" ? "Activo" : "Inactivo";

  document.getElementById("det-registrado").textContent =
    proveedor.registradoPor || "Administrador";
  document.getElementById("det-fecha").textContent =
    proveedor.fechaRegistro ? ` · ${formatearFecha(proveedor.fechaRegistro)}` : "";

  document.title = `${proveedor.razonSocial || "Proveedor"} | Botica Belén`;
}

async function cargarCompras(proveedor) {
  try {
    comprasActuales = await compraServicio.listarPorProveedor(proveedor.id, {
      ruc: proveedor.ruc
    });
    pintarCompras();
  } catch (error) {
    comprasActuales = [];
    resumenCompras.textContent = "";
    tbodyCompras.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty">
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
          No se pudo cargar el historial. ${escapeHtml(explicarError(error))}
        </td>
      </tr>`;
  }
}

function pintarCompras() {
  if (!comprasActuales.length) {
    resumenCompras.textContent = "";
    tbodyCompras.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty">
          <i class="bi bi-receipt" aria-hidden="true"></i>
          Este proveedor aún no tiene compras o pedidos registrados.
        </td>
      </tr>`;
    return;
  }

  resumenCompras.textContent =
    `${comprasActuales.length} compra${comprasActuales.length === 1 ? "" : "s"} registrada${comprasActuales.length === 1 ? "" : "s"}`;

  tbodyCompras.innerHTML = comprasActuales.map((compra, indice) => {
    const estadoPago = String(compra.estadoPago || "—");
    return `
      <tr>
        <td>${formatearFecha(compra.fecha)}</td>
        <td class="cell-main">${escapeHtml(numeroDocumento(compra))}</td>
        <td class="cell-money">${formatearMoneda(compra.montoTotal)}</td>
        <td>
          <span class="badge-pago ${claseEstadoPago(estadoPago)}">${escapeHtml(estadoPago)}</span>
        </td>
        <td class="cell-actions">
          <button type="button" class="btn btn-sm btn-outline-dark" data-orden="${indice}">
            Ver Orden
          </button>
        </td>
      </tr>`;
  }).join("");
}

tbodyCompras.addEventListener("click", (evento) => {
  const boton = evento.target.closest("button[data-orden]");
  if (!boton) return;

  const compra = comprasActuales[Number(boton.dataset.orden)];
  if (compra) abrirOrden(compra);
});

function abrirOrden(compra) {
  texto("orden-numero", numeroDocumento(compra));
  texto("orden-fecha", formatearFecha(compra.fecha));
  texto("orden-monto", formatearMoneda(compra.montoTotal));
  texto("orden-estado", compra.estadoPago || "—");

  const nombreProveedor = proveedorActual?.razonSocial || "";
  document.getElementById("orden-proveedor").textContent = nombreProveedor
    ? `Proveedor: ${nombreProveedor}`
    : "";

  const detalle = Array.isArray(compra.detalle)
    ? compra.detalle
    : Array.isArray(compra.productos)
      ? compra.productos
      : [];

  const contenedor = document.getElementById("orden-detalle");

  if (!detalle.length) {
    contenedor.innerHTML = `
      <p class="text-muted-sm mb-0">
        Esta orden no tiene el detalle de productos registrado.
      </p>`;
  } else {
    contenedor.innerHTML = `
      <h3 class="h6 fw-bold mb-2">Productos</h3>
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col" class="cell-money">Cant.</th>
              <th scope="col" class="cell-money">Importe</th>
            </tr>
          </thead>
          <tbody>
            ${detalle.map((item) => {
              const cantidad = Number(item.cantidad ?? 1) || 1;
              const precio = numero(item.precio ?? item.precioUnitario ?? 0);
              const importe = item.subtotal ?? item.importe ?? precio * cantidad;

              return `
                <tr>
                  <td>${escapeHtml(item.producto || item.nombre || item.descripcion || "Producto")}</td>
                  <td class="cell-money">${cantidad}</td>
                  <td class="cell-money">${formatearMoneda(importe)}</td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;
  }

  window.bootstrap?.Modal.getOrCreateInstance(modalElemento).show();
}

/* ------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------ */

function mostrarMensajeDeExito() {
  if (parametros.get("creado") === "1") {
    mostrarAlerta("Proveedor registrado correctamente.", "success");
  } else if (parametros.get("actualizado") === "1") {
    mostrarAlerta("Proveedor actualizado correctamente.", "success");
  }
}

function numeroDocumento(compra) {
  return compra.numeroFactura || compra.numeroOrden || compra.factura || compra.id || "—";
}

function estadoDe(proveedor) {
  return String(proveedor.estado || "activo").toLowerCase() === "inactivo"
    ? "inactivo"
    : "activo";
}

function claseEstadoPago(estado) {
  const valor = String(estado || "").toLowerCase();

  if (valor.includes("pagado")) return "pagado";
  if (valor.includes("pendiente")) return "pendiente";
  if (valor.includes("vencido") || valor.includes("mora")) return "vencido";
  return "otro";
}

function formatearFecha(valor) {
  if (!valor) return "—";

  const fecha = typeof valor.toDate === "function"
    ? valor.toDate()
    : valor instanceof Date
      ? valor
      : new Date(valor);

  if (Number.isNaN(fecha.getTime())) return "—";

  return fecha.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatearMoneda(valor) {
  const monto = numero(valor);
  if (!Number.isFinite(monto)) return "—";

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2
  }).format(monto);
}

function numero(valor) {
  if (typeof valor === "number") return valor;

  const limpio = String(valor ?? "").replace(/[^\d,.-]/g, "");
  if (!limpio) return NaN;

  const normalizado = limpio.includes(",") && limpio.includes(".")
    ? limpio.lastIndexOf(",") > limpio.lastIndexOf(".")
      ? limpio.replace(/\./g, "").replace(",", ".")
      : limpio.replace(/,/g, "")
    : limpio.replace(",", ".");

  const convertido = Number(normalizado);
  return Number.isNaN(convertido) ? NaN : convertido;
}

function texto(idElemento, valor) {
  const elemento = document.getElementById(idElemento);
  if (elemento) elemento.textContent = valor || "—";
}

function mostrarAlerta(mensajeHtml, tipo = "danger") {
  alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
  alerta.innerHTML = `
    ${mensajeHtml}
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
