import { auth, authReady, db } from "../config/firebase-config.js";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

export class AuthService {
  async iniciarSesion(correo, password) {
    const email = String(correo || "").trim().toLowerCase();
    if (!email || !password) throw new Error("Ingrese su correo y contraseña.");
    await authReady;
    const credencial = await signInWithEmailAndPassword(auth, email, password);
    try {
      return await this.obtenerPerfilValido(credencial.user);
    } catch (error) {
      await signOut(auth);
      throw error;
    }
  }

  async obtenerPerfilValido(user = auth.currentUser) {
    if (!user) throw new Error("No existe una sesión autenticada.");
    const perfilSnap = await getDoc(doc(db, "usuario", user.uid));
    if (!perfilSnap.exists()) throw new Error("La cuenta no tiene un perfil autorizado.");
    const perfil = perfilSnap.data();
    if (perfil.estado !== "Activo") throw new Error("La cuenta está inactiva. Comuníquese con el administrador.");
    if (!["Administrador", "Vendedor"].includes(perfil.rol)) throw new Error("El perfil no tiene un rol válido.");
    return { id: user.uid, correo: user.email, nombre: perfil.nombre, username: perfil.username || "", rol: perfil.rol, estado: perfil.estado };
  }

  observarSesion(callback) {
    return onAuthStateChanged(auth, async user => {
      if (!user) return callback(null);
      try { callback(await this.obtenerPerfilValido(user)); }
      catch { await this.cerrarSesion(); callback(null); }
    });
  }

  async cerrarSesion() { await signOut(auth); }
}
