import { db, functions } from "../config/firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
import { validarCorreo, validarRuc } from "../utils/validaciones.js";
export class ProveedorService {
  async listar(){const s=await getDocs(collection(db,"proveedor"));return s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.razonSocial).localeCompare(String(b.razonSocial),"es"));}
  async guardar(d,id=null){const datos={tipo:"proveedor",id,ruc:validarRuc(d.ruc),razonSocial:String(d.nombre||"").trim(),telefono:String(d.telefono||"").trim(),correo:validarCorreo(d.correo),direccion:String(d.direccion||"").trim(),estado:d.estado};if(!datos.razonSocial||!datos.telefono||!datos.direccion)throw new Error("Complete los datos obligatorios del proveedor.");return(await httpsCallable(functions,"guardarEntidad")(datos)).data.id;}
}
