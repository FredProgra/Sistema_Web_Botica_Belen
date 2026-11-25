import { AuthService } from "../services/AuthService.js?v=2.0.0-spark";
const authService = new AuthService();
const form = document.getElementById("task-form");
const alerta = document.getElementById("login-alerta");
authService.observarSesion(usuario => { if (usuario) window.location.replace("/pages"); });
form?.addEventListener("submit", async event => {
  event.preventDefault(); const boton = document.getElementById("btn-login"); alerta.classList.add("d-none"); boton.disabled = true; boton.textContent = "Verificando…";
  try { await authService.iniciarSesion(document.getElementById("login-correo").value, document.getElementById("login-pass").value); window.location.replace("/pages"); }
  catch (error) { alerta.textContent = mensajeAutenticacion(error); alerta.classList.remove("d-none"); document.getElementById("login-correo").focus(); }
  finally { boton.disabled = false; boton.textContent = "Iniciar sesión"; }
});
function mensajeAutenticacion(error) { const mapa = { "auth/invalid-credential":"Correo o contraseña incorrectos.", "auth/user-not-found":"Correo o contraseña incorrectos.", "auth/wrong-password":"Correo o contraseña incorrectos.", "auth/network-request-failed":"No se pudo conectar con el servicio. Verifique internet e inténtelo nuevamente.", "auth/too-many-requests":"Demasiados intentos. Espere unos minutos.", "auth/configuration-not-found":"El servicio de acceso no está disponible. Comuníquese con el administrador.", "auth/operation-not-allowed":"El servicio de acceso no está disponible. Comuníquese con el administrador." }; return mapa[error.code] || "No fue posible iniciar sesión. Verifique sus datos e inténtelo nuevamente."; }
