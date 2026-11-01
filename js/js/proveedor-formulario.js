import { renderAdminLayout } from "../components/admin-layout.js";
import { ProveedorService } from "../services/ProveedorService.js";

renderAdminLayout({ active: "proveedores" });

const servicio = new ProveedorService();

const form = document.getElementById("form-proveedor");
const alerta = document.getElementById("alerta");
const btnGuardar = document.getElementById("btn-guardar");
const btnCancelar = document.getElementById("btn-cancelar");
const btnVolver = document.getElementById("btn-volver");
const btnVolverAbajo = document.getElementById("btn-volver-abajo");
const titulo = document.getElementById("titulo-formulario");
const id = new URLSearchParams(location.search).get("id");
const esEdicion = Boolean(id);

let enviando = false;

configurarEntradasNumericas();
configurarLimpiezaDeErrores();
iniciar();

async function iniciar() {
  document.getElementById("registrado-por").textContent = nombreUsuario();

  if (!esEdicion) return;

  titulo.textContent = "Editar Proveedor";
  document.title = "Editar Proveedor | Botica Belén";
  btnGuardar.innerHTML = '<i class="bi bi-save me-1" aria-hidden="true"></i> Actualizar Proveedor';
  btnCancelar.href = `proveedor-detalle.html?id=${encodeURIComponent(id)}`;
  btnVolver.href = `proveedor-detalle.html?id=${encodeURIComponent(id)}`;
  btnVolverAbajo.href = `proveedor-detalle.html?id=${encodeURIComponent(id)}`;

  try {
    const proveedor = await servicio.obtener(id);

    if (!proveedor) {
      bloquearFormulario(
        'El proveedor no existe o fue eliminado. <a href="proveedores.html" class="alert-link">Volver al listado</a>.'
      );
      return;
    }

    rellenar(proveedor);
  } catch (error) {
    bloquearFormulario("No se pudo cargar el proveedor. " + explicarError(error));
  }
}

function rellenar(proveedor) {
  asignar("ruc", proveedor.ruc);
  asignar("razon-social", proveedor.razonSocial);
  asignar("direccion", proveedor.direccion);
  asignar("contacto", proveedor.contacto);
  asignar("telefono", proveedor.telefono);
  asignar("correo", proveedor.correo);
  seleccionar("categoria", proveedor.categoria, "");
  seleccionar("metodo-pago", proveedor.metodoPago, "Efectivo");
  seleccionar("estado", estadoDe(proveedor), "activo");

  const ruc = document.getElementById("ruc");
  ruc.readOnly = true;
  ruc.setAttribute("aria-readonly", "true");
  ruc.classList.add("bg-light");
  document.getElementById("ruc-ayuda").textContent =
    "El RUC no se puede modificar una vez registrado.";

  if (proveedor.registradoPor) {
    document.getElementById("registrado-por").textContent = proveedor.registradoPor;
  }
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (enviando) return;

  limpiarErrores();

  const datos = leerFormulario();
  const error = validar(datos);

  if (error) {
    mostrarAlerta(error.mensaje, "warning");
    marcarCampo(error.campo);
    return;
  }

  enviando = true;
  const contenidoOriginal = btnGuardar.innerHTML;
  btnGuardar.disabled = true;
  btnGuardar.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Guardando…';

  try {
    if (await servicio.existeRuc(datos.ruc, id || null)) {
      mostrarAlerta("Ya existe un proveedor con ese RUC.", "warning");
      marcarCampo("ruc");
      return;
    }

    if (esEdicion) {
      await servicio.actualizar(id, datos);
      location.href =
        `proveedor-detalle.html?id=${encodeURIComponent(id)}&actualizado=1`;
    } else {
      const referencia = await servicio.registrar({
        ...datos,
        registradoPor: nombreUsuario()
      });
      location.href =
        `proveedor-detalle.html?id=${encodeURIComponent(referencia.id)}&creado=1`;
    }
  } catch (errorGuardar) {
    mostrarAlerta(
      "No se pudo guardar el proveedor. " + explicarError(errorGuardar),
      "danger"
    );
  } finally {
    enviando = false;
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = contenidoOriginal;
  }
});

function leerFormulario() {
  const valor = (idElemento) => document.getElementById(idElemento).value.trim();

  return {
    ruc: soloDigitos(valor("ruc")),
    razonSocial: valor("razon-social"),
    direccion: valor("direccion"),
    contacto: valor("contacto"),
    telefono: soloDigitos(valor("telefono")),
    correo: valor("correo"),
    categoria: valor("categoria"),
    metodoPago: valor("metodo-pago"),
    estado: valor("estado") === "inactivo" ? "inactivo" : "activo"
  };
}

function validar(datos) {
  if (!/^\d{11}$/.test(datos.ruc)) {
    return {
      campo: "ruc",
      mensaje: "El RUC debe tener exactamente 11 dígitos."
    };
  }

  if (!datos.razonSocial) {
    return {
      campo: "razon-social",
      mensaje: "La razón social es obligatoria."
    };
  }

  if (!datos.contacto) {
    return {
      campo: "contacto",
      mensaje: "El nombre del contacto o representante es obligatorio."
    };
  }

  if (!/^\d{9}$/.test(datos.telefono)) {
    return {
      campo: "telefono",
      mensaje: "El teléfono debe tener 9 dígitos."
    };
  }

  if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(datos.correo)) {
    return {
      campo: "correo",
      mensaje: "El correo no tiene un formato válido."
    };
  }

  if (!datos.categoria) {
    return {
      campo: "categoria",
      mensaje: "Selecciona una categoría de suministro."
    };
  }

  if (!datos.metodoPago) {
    return {
      campo: "metodo-pago",
      mensaje: "Selecciona un método de pago."
    };
  }

  return null;
}

/* ------------------------------------------------------------
   Utilidades del formulario
   ------------------------------------------------------------ */

function configurarEntradasNumericas() {
  ["ruc", "telefono"].forEach((idElemento) => {
    const entrada = document.getElementById(idElemento);

    entrada.addEventListener("input", () => {
      const limpio = soloDigitos(entrada.value);
      if (entrada.value !== limpio) entrada.value = limpio;
    });
  });
}

function configurarLimpiezaDeErrores() {
  form.querySelectorAll("input, select").forEach((control) => {
    const limpiar = () => {
      control.classList.remove("is-invalid");
      control.removeAttribute("aria-invalid");
    };

    control.addEventListener("input", limpiar);
    control.addEventListener("change", limpiar);
  });
}

function marcarCampo(idElemento) {
  const campo = document.getElementById(idElemento);
  if (!campo) return;

  campo.classList.add("is-invalid");
  campo.setAttribute("aria-invalid", "true");
  campo.focus({ preventScroll: false });
}

function limpiarErrores() {
  form.querySelectorAll(".is-invalid").forEach((campo) => {
    campo.classList.remove("is-invalid");
    campo.removeAttribute("aria-invalid");
  });
}

function bloquearFormulario(mensajeHtml) {
  mostrarAlerta(mensajeHtml, "warning");
  form.querySelectorAll("input, select, button").forEach((control) => {
    control.disabled = true;
  });
}

function asignar(idElemento, valor) {
  const campo = document.getElementById(idElemento);
  if (campo) campo.value = valor ?? "";
}

function seleccionar(idElemento, valor, valorPorDefecto) {
  const select = document.getElementById(idElemento);
  if (!select) return;

  const opciones = [...select.options];

  if (valor && !opciones.some((opcion) => opcion.value === valor)) {
    select.add(new Option(valor, valor));
  }

  select.value = valor || valorPorDefecto;
}

function soloDigitos(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

function estadoDe(proveedor) {
  return String(proveedor.estado || "activo").toLowerCase() === "inactivo"
    ? "inactivo"
    : "activo";
}

function nombreUsuario() {
  try {
    return (
      localStorage.getItem("usuarioNombre") ||
      localStorage.getItem("nombreUsuario") ||
      localStorage.getItem("usuario") ||
      "Administrador"
    ).trim() || "Administrador";
  } catch {
    return "Administrador";
  }
}

function mostrarAlerta(mensajeHtml, tipo = "warning") {
  alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
  alerta.innerHTML = `
    ${mensajeHtml}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>`;
}

function explicarError(error) {
  const mensaje = String(error?.message || error || "");

  if (/permission|insufficient/i.test(mensaje)) {
    return "Firestore rechazó la operación (revisa las reglas de seguridad).";
  }

  return mensaje;
}
