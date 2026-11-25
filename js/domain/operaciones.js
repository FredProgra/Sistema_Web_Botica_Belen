export function errorDominio(codigo, mensaje) {
  const error = new Error(mensaje);
  error.code = codigo;
  return error;
}

export const texto = valor => String(valor ?? "").trim();
export const estadoActivo = valor => texto(valor).toLowerCase() === "activo";
export const idValido = id => typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id);
export const claveUnica = (tipo, valor) => `${tipo}_${encodeURIComponent(texto(valor).toLowerCase())}`;

export function agruparItems(items, codigoError = "invalid-argument") {
  if (!Array.isArray(items) || !items.length || items.length > 100) throw errorDominio(codigoError, "Detalle de venta inválido.");
  const mapa = new Map();
  for (const item of items) {
    const productoId = item?.productoId || item?.producto || item?.id;
    const cantidad = Number(item?.cantidad);
    if (!idValido(productoId) || !Number.isSafeInteger(cantidad) || cantidad < 1) throw errorDominio(codigoError, "Cantidad o producto inválido.");
    const acumulada = (mapa.get(productoId) || 0) + cantidad;
    if (!Number.isSafeInteger(acumulada)) throw errorDominio(codigoError, "Cantidad acumulada inválida.");
    mapa.set(productoId, acumulada);
  }
  return [...mapa].map(([productoId, cantidad]) => ({ productoId, cantidad })).sort((a,b)=>a.productoId.localeCompare(b.productoId));
}

export function huellaVenta({items, clienteId = null, metodoPago}) {
  return JSON.stringify({ items: agruparItems(items), clienteId: clienteId || null, metodoPago: texto(metodoPago) });
}

export function fechaCalendarioValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

export function validarProductoVenta(datos, cantidad) {
  const stock = Number(datos?.stock), precio = Number(datos?.precio);
  if (!estadoActivo(datos?.estado) || !Number.isSafeInteger(stock) || stock < 0 || !Number.isFinite(precio) || precio <= 0 || cantidad > stock) {
    throw errorDominio("failed-precondition", `Stock o precio no disponible para ${texto(datos?.nombre) || "el producto"}.`);
  }
  return { stock, precio, subtotal: Number((precio * cantidad).toFixed(2)) };
}

export function datosUsuario(datos) {
  const nombre = texto(datos?.nombre), username = texto(datos?.username).toLowerCase(), correo = texto(datos?.correo).toLowerCase();
  if (!nombre || !/^[a-z0-9_.-]{1,80}$/.test(username) || !/^\S+@\S+\.\S+$/.test(correo) || !["Administrador", "Vendedor"].includes(datos?.rol) || !["Activo", "Inactivo"].includes(datos?.estado)) {
    throw errorDominio("invalid-argument", "Datos de usuario inválidos.");
  }
  return { nombre, username, correo, rol: datos.rol, estado: datos.estado };
}
