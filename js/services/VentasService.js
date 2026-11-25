import { db, functions } from "../config/firebase-config.js";
import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
const ventasRef = collection(db, "ventas");
const fechaEnMs = valor => typeof valor?.toDate === "function" ? valor.toDate().getTime() : new Date(valor || 0).getTime();
export class VentasService {
  async listar() { const snap = await getDocs(query(ventasRef, orderBy("fecha", "desc"))); return snap.docs.map(d => ({id:d.id,...d.data()})).sort((a,b)=>fechaEnMs(b.fecha)-fechaEnMs(a.fecha)); }
  async registrarVenta(datos) { return (await httpsCallable(functions, "registrarVenta")(datos)).data; }
  async anular(id, motivo) { return (await httpsCallable(functions, "anularVenta")({ id, motivo })).data; }
}
