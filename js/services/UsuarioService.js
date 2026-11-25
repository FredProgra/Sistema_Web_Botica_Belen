import { db, functions } from "../config/firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
export class UsuarioService {
  async listar() { const snap=await getDocs(collection(db,"usuario")); return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre),"es")); }
  async guardar(datos,id=null) { const nombre=String(datos.nombre||"").trim(), username=String(datos.username||"").trim().toLowerCase(), correo=String(datos.correo||"").trim().toLowerCase(); if(!nombre||!username||!correo) throw new Error("Nombre, usuario y correo son obligatorios."); return (await httpsCallable(functions,"gestionarUsuario")({id,nombre,username,correo,rol:datos.rol,estado:datos.estado,password:datos.password||""})).data; }
}
