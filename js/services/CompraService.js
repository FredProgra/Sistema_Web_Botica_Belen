import { db } from "../config/firebase-config.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const COLECCION = "compras";

/**
 * Historial de compras o pedidos asociado a un proveedor.
 *
 * La relación principal es el campo `proveedorId` (id del documento en la
 * colección "proveedores"). Si el sistema de compras de otro módulo guarda el
 * RUC en `proveedorRuc`, se usa como respaldo para no perder el historial.
 */
export class CompraService {
  /**
   * @param {string} proveedorId
   * @param {{ ruc?: string }} opciones
   * @returns {Promise<Array<object>>} compras de la más reciente a la más antigua
   */
  async listarPorProveedor(proveedorId, { ruc = "" } = {}) {
    if (!proveedorId) return [];

    let compras = await this.#consultar("proveedorId", proveedorId);

    if (!compras.length && ruc) {
      compras = await this.#consultar("proveedorRuc", ruc);
    }

    return compras.sort((a, b) => fechaEnMs(b.fecha) - fechaEnMs(a.fecha));
  }

  async #consultar(campo, valor) {
    const consulta = query(collection(db, COLECCION), where(campo, "==", valor));
    const snapshot = await getDocs(consulta);
    return snapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() }));
  }
}

/** Convierte Timestamp de Firestore, Date o texto ISO a milisegundos. */
export function fechaEnMs(valor) {
  if (!valor) return 0;
  if (typeof valor.toDate === "function") return valor.toDate().getTime();
  if (valor instanceof Date) return valor.getTime();

  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? 0 : fecha.getTime();
}
