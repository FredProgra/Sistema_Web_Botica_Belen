import { db, functions } from "../config/firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
import { validarDni } from "../utils/validaciones.js";
export class ClienteService {
  async listar(){const s=await getDocs(collection(db,"cliente"));return s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.apellido).localeCompare(String(b.apellido),"es"));}
  async guardar(d,id=null){const datos={tipo:"cliente",id,dni:validarDni(d.dni),nombre:String(d.nombre||"").trim(),apellido:String(d.apellido||"").trim(),telefono:String(d.telefono||"").trim(),direccion:String(d.direccion||"").trim(),estado:d.estado};if(!datos.nombre||!datos.apellido||!datos.telefono||!datos.direccion)throw new Error("Complete los datos obligatorios del cliente.");return(await httpsCallable(functions,"guardarEntidad")(datos)).data.id;}
}
