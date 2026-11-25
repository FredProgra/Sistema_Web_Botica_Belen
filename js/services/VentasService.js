import { auth, db } from "../config/firebase-config.js?v=2.0.0-spark";
import { collection, doc, getDocs, orderBy, query, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { agruparItems, errorDominio, estadoActivo, huellaVenta, idValido, texto, validarProductoVenta } from "../domain/operaciones.js?v=2.0.0-spark";
import { actualizarAlertaEnTransaccion } from "./FirestoreUtils.js?v=2.0.0-spark";

const ventasRef = collection(db, "ventas");
const fechaEnMs = valor => typeof valor?.toDate === "function" ? valor.toDate().getTime() : new Date(valor || 0).getTime();

export class VentasService {
  async listar() {
    const snap = await getDocs(query(ventasRef, orderBy("fecha", "desc")));
    return snap.docs.map(d => ({id:d.id,...d.data()})).sort((a,b)=>fechaEnMs(b.fecha)-fechaEnMs(a.fecha));
  }

  async registrarVenta(datos) {
    const uid=auth.currentUser?.uid, clave=texto(datos.claveIdempotencia), clienteId=datos.clienteId||null, metodoPago=texto(datos.metodoPago);
    if(!uid)throw errorDominio("unauthenticated","Inicie sesión.");
    if(!idValido(clave)||(clienteId&&!idValido(clienteId))||!["Efectivo","Yape / Plin","Tarjeta"].includes(metodoPago))throw errorDominio("invalid-argument","Venta incompleta.");
    const items=agruparItems(datos.items),huella=huellaVenta({items,clienteId,metodoPago}),ventaRef=doc(db,"ventas",clave);
    return runTransaction(db,async tx=>{
      const previa=await tx.get(ventaRef);
      const perfilSnap=await tx.get(doc(db,"usuario",uid));
      if(!perfilSnap.exists()||!estadoActivo(perfilSnap.data().estado))throw errorDominio("permission-denied","Perfil inactivo o inexistente.");
      const perfil=perfilSnap.data();
      if(previa.exists()){
        const v=previa.data();
        if(v.vendedorId!==uid||v.huella!==huella)throw errorDominio("already-exists","La clave corresponde a otra venta.");
        return{id:clave,codigo:v.codigo,total:v.total,duplicada:true};
      }
      const clienteSnap=clienteId?await tx.get(doc(db,"cliente",clienteId)):null;
      if(clienteId&&(!clienteSnap.exists()||!estadoActivo(clienteSnap.data().estado)))throw errorDominio("failed-precondition","Cliente no disponible.");
      const productoRefs=items.map(x=>doc(db,"producto",x.productoId));
      const productoSnaps=[];for(const ref of productoRefs)productoSnaps.push(await tx.get(ref));
      const alertaSnaps=[];for(const item of items)alertaSnaps.push(await tx.get(doc(db,"alertas",item.productoId)));
      const detalle=[];let total=0;
      items.forEach((item,i)=>{
        const snap=productoSnaps[i];if(!snap.exists())throw errorDominio("not-found","Producto inexistente.");
        const p=snap.data(),validado=validarProductoVenta(p,item.cantidad),stockNuevo=validado.stock-item.cantidad;
        detalle.push({productoId:snap.id,codigo:p.codigo,nombre:p.nombre,cantidad:item.cantidad,precioUnitario:validado.precio,subtotal:validado.subtotal});total+=validado.subtotal;
        const productoNuevo={...p,stock:stockNuevo,fechaActualizacion:serverTimestamp(),ultimaOperacion:clave,version:Number(p.version||0)+1};
        tx.update(productoRefs[i],{stock:stockNuevo,fechaActualizacion:serverTimestamp(),ultimaOperacion:clave,version:productoNuevo.version});
        tx.set(doc(db,"movimientos",`${clave}_${snap.id}`),{operacionId:clave,tipo:"venta",productoId:snap.id,cantidad:item.cantidad,stockAnterior:validado.stock,stockNuevo,vendedorId:uid,precioUnitario:validado.precio,subtotal:validado.subtotal,fecha:serverTimestamp()});
        actualizarAlertaEnTransaccion(tx,snap.id,productoNuevo,alertaSnaps[i]);
      });
      const totalFinal=Number(total.toFixed(2)),codigo=`V-${clave}`;
      tx.set(ventaRef,{codigo,items:detalle,total:totalFinal,clienteId,clienteNombre:clienteSnap?`${clienteSnap.data().nombre} ${clienteSnap.data().apellido}`:"Público general",metodoPago,huella,vendedorId:uid,vendedor:perfil.nombre,estado:"Confirmada",fecha:serverTimestamp()});
      return{id:clave,codigo,total:totalFinal};
    });
  }

  async anular(id,motivo) {
    const uid=auth.currentUser?.uid,ventaId=texto(id),razon=texto(motivo);
    if(!uid)throw errorDominio("unauthenticated","Inicie sesión.");
    if(!idValido(ventaId)||razon.length<5)throw errorDominio("invalid-argument","Ingrese un motivo válido.");
    return runTransaction(db,async tx=>{
      const ventaRef=doc(db,"ventas",ventaId),ventaSnap=await tx.get(ventaRef),perfilSnap=await tx.get(doc(db,"usuario",uid));
      if(!perfilSnap.exists()||!estadoActivo(perfilSnap.data().estado)||texto(perfilSnap.data().rol).toLowerCase()!=="administrador")throw errorDominio("permission-denied","Operación exclusiva del administrador.");
      if(!ventaSnap.exists())throw errorDominio("not-found","Venta inexistente.");
      const venta=ventaSnap.data();if(venta.estado!=="Confirmada")throw errorDominio("failed-precondition","La venta ya fue anulada.");
      const origen=venta.items||venta.detalle||[],items=agruparItems(origen.map(x=>({productoId:x.productoId||x.producto||x.id,cantidad:x.cantidad})),"failed-precondition");
      const refs=items.map(x=>doc(db,"producto",x.productoId)),snaps=[];for(const ref of refs)snaps.push(await tx.get(ref));
      const alertas=[];for(const item of items)alertas.push(await tx.get(doc(db,"alertas",item.productoId)));
      items.forEach((item,i)=>{const snap=snaps[i];if(!snap.exists()||!Number.isSafeInteger(Number(snap.data().stock)))throw errorDominio("failed-precondition","No se puede restituir todo el inventario.");const p=snap.data(),stockAnterior=Number(p.stock),stockNuevo=stockAnterior+item.cantidad,operacionId=`${ventaId}_anulacion`,productoNuevo={...p,stock:stockNuevo,ultimaOperacion:operacionId,version:Number(p.version||0)+1};tx.update(refs[i],{stock:stockNuevo,fechaActualizacion:serverTimestamp(),ultimaOperacion:operacionId,version:productoNuevo.version});tx.set(doc(db,"movimientos",`${operacionId}_${snap.id}`),{operacionId,tipo:"anulacion",ventaId,productoId:snap.id,cantidad:item.cantidad,stockAnterior,stockNuevo,vendedorId:uid,fecha:serverTimestamp()});actualizarAlertaEnTransaccion(tx,snap.id,productoNuevo,alertas[i]);});
      tx.update(ventaRef,{estado:"Anulada",motivoAnulacion:razon,anuladoPorId:uid,anuladoPor:perfilSnap.data().nombre,fechaAnulacion:serverTimestamp()});
      return{id:ventaId,estado:"Anulada"};
    });
  }
}
