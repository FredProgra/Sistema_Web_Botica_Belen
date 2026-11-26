import { db } from "../config/firebase-config.js?v=2.3.4";
import { doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { estadoActivo } from "../domain/operaciones.js?v=2.3.4";

export function actualizarAlertaEnTransaccion(tx, productoId, producto, alertaSnap) {
  const alertaRef = doc(db, "alertas", productoId);
  const anterior = alertaSnap?.exists() ? alertaSnap.data() : null;
  const stock = Number(producto.stock), stockMinimo = Number(producto.stockMinimo || 0);
  if (estadoActivo(producto.estado) && stock <= stockMinimo) {
    const tipo = stock === 0 ? "Agotado" : "Stock bajo";
    const nueva = !anterior || anterior.estado !== "Pendiente" || anterior.tipo !== tipo;
    tx.set(alertaRef, {
      productoId, productoNombre: producto.nombre, stock, stockMinimo, tipo,
      estado: "Pendiente", leida: nueva ? false : Boolean(anterior?.leida),
      fecha: nueva || !anterior?.fecha ? serverTimestamp() : anterior.fecha
    });
  } else if (anterior?.estado === "Pendiente") {
    tx.update(alertaRef, { stock, stockMinimo, estado: "Resuelta", leida: true, fechaResolucion: serverTimestamp() });
  }
}
