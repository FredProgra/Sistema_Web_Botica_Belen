const requerido = (valor, nombre) => { const texto = String(valor ?? "").trim(); if (!texto) throw new Error(`${nombre} es obligatorio.`); return texto; };
const numero = (valor, nombre, minimo = 0) => { const n = Number(valor); if (!Number.isFinite(n) || n < minimo) throw new Error(`${nombre} debe ser un número mayor o igual a ${minimo}.`); return n; };
export const validarDni = valor => { const dni = requerido(valor, "El DNI"); if (!/^\d{8}$/.test(dni)) throw new Error("El DNI debe tener 8 dígitos."); return dni; };
export const validarRuc = valor => { const ruc = requerido(valor, "El RUC"); if (!/^\d{11}$/.test(ruc)) throw new Error("El RUC debe tener 11 dígitos."); return ruc; };
export const validarCorreo = valor => { const correo = requerido(valor, "El correo").toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error("Ingrese un correo válido."); return correo; };
export function validarProducto(d = {}) {
  const producto = { codigo: requerido(d.codigo, "El código").toUpperCase(), nombre: requerido(d.nombre, "El nombre"), categoria: requerido(d.categoria, "La categoría"), precioCompra: numero(d.precioCompra, "El precio de compra"), precio: numero(d.precio, "El precio de venta", 0.01), stock: numero(d.stock, "El stock"), stockMinimo: numero(d.stockMinimo, "El stock mínimo"), lote: String(d.lote || "").trim(), fechaVencimiento: d.fechaVencimiento || null, estado: d.estado === "Inactivo" ? "Inactivo" : "Activo" };
  if (!Number.isInteger(producto.stock) || !Number.isInteger(producto.stockMinimo)) throw new Error("El stock debe expresarse en unidades enteras.");
  if (producto.fechaVencimiento) {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(producto.fechaVencimiento);
    const fecha = partes && new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])));
    if (!partes || fecha.getUTCFullYear() !== Number(partes[1]) || fecha.getUTCMonth() !== Number(partes[2]) - 1 || fecha.getUTCDate() !== Number(partes[3])) throw new Error("La fecha de vencimiento no es válida.");
  }
  return producto;
}
