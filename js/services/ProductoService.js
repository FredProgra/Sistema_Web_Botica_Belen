import { db } from "../config/firebase-config.js?v=2.3.4";
import { collection, doc, getDocs, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { validarProducto } from "../utils/validaciones.js?v=2.3.4";
import { claveUnica, errorDominio } from "../domain/operaciones.js?v=2.3.4";
import { actualizarAlertaEnTransaccion } from "./FirestoreUtils.js?v=2.3.4";
export class ProductoService {
  async listar(){const snap=await getDocs(collection(db,"producto"));return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre),"es"));}
  async guardar(datos,id=null){
    const limpio=validarProducto(datos), ref=id?doc(db,"producto",id):doc(collection(db,"producto"));
    const reservaRef=doc(db,"unicos",claveUnica("producto",limpio.codigo));
    await runTransaction(db,async tx=>{
      const actual=id?await tx.get(ref):null;
      const reserva=await tx.get(reservaRef);
      const alerta=await tx.get(doc(db,"alertas",ref.id));
      if(reserva.exists()&&reserva.data().id!==ref.id)throw errorDominio("already-exists","El código ya está registrado.");
      if(id&&(!actual.exists()||datos.stockOriginal===null||datos.stockOriginal===undefined||Number(actual.data().stock)!==Number(datos.stockOriginal)))throw errorDominio("aborted","El inventario cambió. Actualice la página y vuelva a editar.");
      if(actual?.exists()&&actual.data().codigo!==limpio.codigo)tx.delete(doc(db,"unicos",claveUnica("producto",actual.data().codigo)));
      const guardado={...limpio,fechaActualizacion:serverTimestamp(),version:Number(actual?.data()?.version||0)+1};
      tx.set(ref,guardado,{merge:true});
      tx.set(reservaRef,{tipo:"producto",valor:limpio.codigo.toLowerCase(),id:ref.id});
      actualizarAlertaEnTransaccion(tx,ref.id,guardado,alerta);
    });
    return ref.id;
  }
}
