import { db, functions } from "../config/firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
import { validarProducto } from "../utils/validaciones.js";
export class ProductoService {
  async listar(){const snap=await getDocs(collection(db,"producto"));return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre),"es"));}
  async guardar(datos,id=null){const limpio=validarProducto(datos);return(await httpsCallable(functions,"gestionarProducto")({id,...limpio})).data.id;}
}
