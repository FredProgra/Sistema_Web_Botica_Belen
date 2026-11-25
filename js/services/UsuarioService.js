import { deleteApp, initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { createUserWithEmailAndPassword, deleteUser, getAuth, inMemoryPersistence, setPersistence, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { auth, db, firebaseConfig } from "../config/firebase-config.js?v=2.0.0-spark";
import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { claveUnica, datosUsuario, errorDominio } from "../domain/operaciones.js?v=2.0.0-spark";

export class UsuarioService {
  async listar(){const snap=await getDocs(collection(db,"usuario"));return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre),"es"));}

  async guardar(datos,id=null){
    const limpio=datosUsuario(datos);
    if(id===auth.currentUser?.uid&&(limpio.rol!=="Administrador"||limpio.estado!=="Activo"))throw errorDominio("failed-precondition","No puede retirar sus propios permisos de administrador.");
    if(id){
      const activos=await getDocs(query(collection(db,"usuario"),where("rol","==","Administrador"),where("estado","==","Activo")));
      const actual=activos.docs.find(x=>x.id===id);
      if(actual&&activos.size<=1&&(limpio.rol!=="Administrador"||limpio.estado!=="Activo"))throw errorDominio("failed-precondition","Debe permanecer un administrador activo.");
      await this.guardarPerfil(id,limpio,true);
      return{id};
    }
    if(String(datos.password||"").length<8)throw errorDominio("invalid-argument","La contraseña inicial debe tener al menos 8 caracteres.");
    const secundaria=initializeApp(firebaseConfig,`alta-${crypto.randomUUID()}`),authSecundaria=getAuth(secundaria);
    let creado=null;
    try{
      await setPersistence(authSecundaria,inMemoryPersistence);
      creado=await createUserWithEmailAndPassword(authSecundaria,limpio.correo,datos.password);
      await updateProfile(creado.user,{displayName:limpio.nombre});
      await this.guardarPerfil(creado.user.uid,limpio,false);
      return{id:creado.user.uid};
    }catch(error){
      if(creado?.user)await deleteUser(creado.user).catch(()=>{});
      if(error.code==="auth/email-already-in-use")throw errorDominio("already-exists","El correo ya está registrado.");
      throw error;
    }finally{
      await signOut(authSecundaria).catch(()=>{});await deleteApp(secundaria).catch(()=>{});
    }
  }

  async guardarPerfil(uid,limpio,edicion){
    const perfilRef=doc(db,"usuario",uid),reservaRef=doc(db,"unicos",claveUnica("usuario",limpio.username));
    await runTransaction(db,async tx=>{
      const anterior=await tx.get(perfilRef),reserva=await tx.get(reservaRef);
      if(edicion&&!anterior.exists())throw errorDominio("not-found","Usuario inexistente.");
      if(edicion&&String(anterior.data().correo||"").toLowerCase()!==limpio.correo)throw errorDominio("failed-precondition","El correo de acceso no puede cambiarse desde el sistema. Modifíquelo en Firebase Authentication.");
      if(reserva.exists()&&reserva.data().id!==uid)throw errorDominio("already-exists","El nombre de usuario ya existe.");
      if(anterior.exists()&&anterior.data().username!==limpio.username)tx.delete(doc(db,"unicos",claveUnica("usuario",anterior.data().username)));
      tx.set(perfilRef,{...limpio,actualizadoEn:serverTimestamp()},{merge:true});
      tx.set(reservaRef,{tipo:"usuario",valor:limpio.username,id:uid});
    });
  }
}
