import { db } from "../config/firebase-config.js";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const COLECCION = "proveedores";

const CAMPOS = [
  "ruc",
  "razonSocial",
  "direccion",
  "contacto",
  "telefono",
  "correo",
  "categoria",
  "metodoPago",
  "estado",
  "registradoPor"
];

/**
 * Acceso a la colección "proveedores" de Firestore.
 * No existe borrado físico: el estado se alterna entre activo e inactivo.
 */
export class ProveedorService {
  /** Devuelve todos los proveedores ordenados por razón social. */
  async listar() {
    const snapshot = await getDocs(collection(db, COLECCION));
    return snapshot.docs
      .map((documento) => ({ id: documento.id, ...documento.data() }))
      .sort((a, b) =>
        String(a.razonSocial || "").localeCompare(String(b.razonSocial || ""), "es", {
          sensitivity: "base"
        })
      );
  }

  /** Devuelve un proveedor por id, o null si no existe. */
  async obtener(id) {
    if (!id) return null;
    const snapshot = await getDoc(doc(db, COLECCION, id));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  }

  /** Crea un proveedor y devuelve la referencia del documento creado. */
  async registrar(datos) {
    const limpios = normalizar(datos);
    return addDoc(collection(db, COLECCION), {
      ...limpios,
      estado: limpios.estado || "activo",
      registradoPor: limpios.registradoPor || "Administrador",
      fechaRegistro: serverTimestamp(),
      fechaActualizacion: serverTimestamp()
    });
  }

  /** Actualiza los campos enviados y la fecha de modificación. */
  async actualizar(id, datos) {
    if (!id) throw new Error("Falta el identificador del proveedor.");
    return updateDoc(doc(db, COLECCION, id), {
      ...normalizar(datos),
      fechaActualizacion: serverTimestamp()
    });
  }

  /** Activa o desactiva un proveedor sin borrarlo. */
  async cambiarEstado(id, estado) {
    if (!id) throw new Error("Falta el identificador del proveedor.");
    return updateDoc(doc(db, COLECCION, id), {
      estado: estado === "inactivo" ? "inactivo" : "activo",
      fechaActualizacion: serverTimestamp()
    });
  }

  /**
   * Comprueba si otro proveedor ya usa el RUC indicado.
   * @param {string} ruc
   * @param {string|null} idExcluir id del proveedor que se está editando.
   */
  async existeRuc(ruc, idExcluir = null) {
    const valor = String(ruc ?? "").trim();
    if (!valor) return false;

    const consulta = query(collection(db, COLECCION), where("ruc", "==", valor));
    const snapshot = await getDocs(consulta);
    return snapshot.docs.some((documento) => documento.id !== idExcluir);
  }
}

/**
 * Recorta los textos y normaliza el estado antes de escribir en Firestore.
 * Solo incluye las claves presentes para no borrar datos en actualizaciones
 * parciales.
 */
function normalizar(datos = {}) {
  const limpios = {};

  for (const campo of CAMPOS) {
    if (datos[campo] !== undefined) {
      limpios[campo] = String(datos[campo] ?? "").trim();
    }
  }

  if (limpios.estado && limpios.estado !== "inactivo") {
    limpios.estado = "activo";
  }

  return limpios;
}
