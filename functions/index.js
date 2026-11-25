const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

async function obtenerPerfil(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicie sesión.");
  const snap = await db.doc(`usuario/${request.auth.uid}`).get();
  if (!snap.exists || snap.data().estado !== "Activo") throw new HttpsError("permission-denied", "Perfil inactivo o inexistente.");
  return { uid: request.auth.uid, ...snap.data() };
}
function exigirAdmin(perfil) { if (perfil.rol !== "Administrador") throw new HttpsError("permission-denied", "Operación exclusiva del administrador."); }
function texto(valor) { return String(valor || "").trim(); }

exports.registrarVenta = onCall(async request => {
  const perfil = await obtenerPerfil(request);
  const items = Array.isArray(request.data.items) ? request.data.items : [];
  const clave = texto(request.data.claveIdempotencia);
  if (!items.length || !clave) throw new HttpsError("invalid-argument", "Venta incompleta.");
  const ventaRef = db.collection("ventas").doc(clave);

  return db.runTransaction(async tx => {
    if ((await tx.get(ventaRef)).exists) return { id: clave, duplicada: true };
    const solicitados = items.map(item => {
      const cantidad = Number(item.cantidad);
      if (!item.productoId || !Number.isInteger(cantidad) || cantidad < 1) throw new HttpsError("invalid-argument", "Cantidad inválida.");
      return { ref: db.doc(`producto/${item.productoId}`), cantidad };
    });
    const snaps = await Promise.all(solicitados.map(item => tx.get(item.ref)));
    const detalle = [];
    let total = 0;

    snaps.forEach((snap, indice) => {
      if (!snap.exists) throw new HttpsError("not-found", "Producto inexistente.");
      const datos = snap.data();
      const solicitado = solicitados[indice];
      const stock = Number(datos.stock);
      if (datos.estado !== "Activo" || solicitado.cantidad > stock) throw new HttpsError("failed-precondition", `Stock insuficiente de ${datos.nombre}.`);
      const subtotal = Number((Number(datos.precio) * solicitado.cantidad).toFixed(2));
      detalle.push({ productoId: snap.id, codigo: datos.codigo, nombre: datos.nombre, cantidad: solicitado.cantidad, precioUnitario: Number(datos.precio), subtotal });
      total += subtotal;
      tx.update(solicitado.ref, { stock: stock - solicitado.cantidad, fechaActualizacion: FieldValue.serverTimestamp() });
    });

    const codigo = `V-${Date.now().toString(36).toUpperCase()}`;
    tx.create(ventaRef, { codigo, items: detalle, total: Number(total.toFixed(2)), clienteId: request.data.clienteId || null, clienteNombre: texto(request.data.clienteNombre) || "Público general", metodoPago: texto(request.data.metodoPago) || "Efectivo", vendedorId: perfil.uid, vendedor: perfil.nombre, estado: "Confirmada", fecha: FieldValue.serverTimestamp() });
    return { id: ventaRef.id, codigo, total: Number(total.toFixed(2)) };
  });
});

exports.anularVenta = onCall(async request => {
  const perfil = await obtenerPerfil(request); exigirAdmin(perfil);
  const id = texto(request.data.id), motivo = texto(request.data.motivo);
  if (!id || motivo.length < 5) throw new HttpsError("invalid-argument", "Indique un motivo de al menos 5 caracteres.");
  const ventaRef = db.doc(`ventas/${id}`);
  return db.runTransaction(async tx => {
    const ventaSnap = await tx.get(ventaRef);
    if (!ventaSnap.exists) throw new HttpsError("not-found", "Venta inexistente.");
    const venta = ventaSnap.data();
    if (venta.estado === "Anulada") throw new HttpsError("failed-precondition", "La venta ya fue anulada.");
    const items = Array.isArray(venta.items) ? venta.items : [];
    const refs = items.map(item => db.doc(`producto/${item.productoId}`));
    const snaps = await Promise.all(refs.map(ref => tx.get(ref)));
    snaps.forEach((snap, i) => { if (snap.exists) tx.update(refs[i], { stock: Number(snap.data().stock) + Number(items[i].cantidad), fechaActualizacion: FieldValue.serverTimestamp() }); });
    tx.update(ventaRef, { estado: "Anulada", motivoAnulacion: motivo, anuladoPorId: perfil.uid, anuladoPor: perfil.nombre, fechaAnulacion: FieldValue.serverTimestamp() });
    return { id, estado: "Anulada" };
  });
});

exports.gestionarProducto = onCall(async request => {
  const perfil = await obtenerPerfil(request); exigirAdmin(perfil);
  const d = request.data || {}, codigo = texto(d.codigo).toUpperCase();
  if (!codigo || !texto(d.nombre) || !texto(d.categoria) || !["Activo", "Inactivo"].includes(d.estado)) throw new HttpsError("invalid-argument", "Datos del producto incompletos.");
  for (const [campo, minimo] of [["precio", .01], ["precioCompra", 0], ["stock", 0], ["stockMinimo", 0]]) if (!Number.isFinite(Number(d[campo])) || Number(d[campo]) < minimo) throw new HttpsError("invalid-argument", `${campo} inválido.`);
  const ref = d.id ? db.doc(`producto/${d.id}`) : db.collection("producto").doc();
  const unicoRef = db.doc(`unicos/producto_${encodeURIComponent(codigo)}`);
  await db.runTransaction(async tx => {
    const [unico, actual] = await Promise.all([tx.get(unicoRef), d.id ? tx.get(ref) : Promise.resolve(null)]);
    if (unico.exists && unico.data().id !== ref.id) throw new HttpsError("already-exists", "El código ya está registrado.");
    if (actual?.exists && actual.data().codigo !== codigo) tx.delete(db.doc(`unicos/producto_${encodeURIComponent(actual.data().codigo)}`));
    tx.set(ref, { codigo, nombre: texto(d.nombre), categoria: texto(d.categoria), precio: Number(d.precio), precioCompra: Number(d.precioCompra), stock: Number(d.stock), stockMinimo: Number(d.stockMinimo), lote: texto(d.lote), fechaVencimiento: d.fechaVencimiento || null, estado: d.estado, actualizadoPor: perfil.uid, fechaActualizacion: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(unicoRef, { id: ref.id });
  });
  return { id: ref.id };
});

exports.guardarEntidad = onCall(async request => {
  const perfil = await obtenerPerfil(request), d = request.data || {}, tipo = d.tipo;
  if (!["cliente", "proveedor"].includes(tipo)) throw new HttpsError("invalid-argument", "Tipo inválido.");
  if (tipo === "proveedor") exigirAdmin(perfil);
  const valor = tipo === "cliente" ? texto(d.dni) : texto(d.ruc);
  if (!(tipo === "cliente" ? /^\d{8}$/ : /^\d{11}$/).test(valor)) throw new HttpsError("invalid-argument", `${tipo === "cliente" ? "DNI" : "RUC"} inválido.`);
  if (!["Activo", "Inactivo"].includes(d.estado) || !texto(d.nombre || d.razonSocial) || !texto(d.telefono) || !texto(d.direccion)) throw new HttpsError("invalid-argument", "Datos obligatorios incompletos.");
  if (tipo === "proveedor" && !/^\S+@\S+\.\S+$/.test(texto(d.correo))) throw new HttpsError("invalid-argument", "Correo inválido.");
  const ref = d.id ? db.doc(`${tipo}/${d.id}`) : db.collection(tipo).doc();
  const unicoRef = db.doc(`unicos/${tipo}_${valor}`);
  await db.runTransaction(async tx => {
    const [unico, actual] = await Promise.all([tx.get(unicoRef), d.id ? tx.get(ref) : Promise.resolve(null)]);
    if (unico.exists && unico.data().id !== ref.id) throw new HttpsError("already-exists", "El identificador ya está registrado.");
    if (actual?.exists) { const anterior = tipo === "cliente" ? actual.data().dni : actual.data().ruc; if (anterior !== valor) tx.delete(db.doc(`unicos/${tipo}_${anterior}`)); }
    const datos = tipo === "cliente"
      ? { dni: valor, nombre: texto(d.nombre), apellido: texto(d.apellido), telefono: texto(d.telefono), direccion: texto(d.direccion), estado: d.estado }
      : { ruc: valor, razonSocial: texto(d.razonSocial), nombre: texto(d.razonSocial), telefono: texto(d.telefono), correo: texto(d.correo).toLowerCase(), direccion: texto(d.direccion), estado: String(d.estado || "Activo").toLowerCase() };
    tx.set(ref, { ...datos, fechaActualizacion: FieldValue.serverTimestamp(), actualizadoPor: perfil.uid }, { merge: true });
    tx.set(unicoRef, { id: ref.id });
  });
  return { id: ref.id };
});

exports.gestionarUsuario = onCall(async request => {
  const perfil = await obtenerPerfil(request); exigirAdmin(perfil);
  const d = request.data || {}, username = texto(d.username).toLowerCase(), correo = texto(d.correo).toLowerCase();
  if (!texto(d.nombre) || !username || !/^\S+@\S+\.\S+$/.test(correo) || !["Administrador", "Vendedor"].includes(d.rol) || !["Activo", "Inactivo"].includes(d.estado)) throw new HttpsError("invalid-argument", "Datos de usuario inválidos.");
  const unicoRef = db.doc(`unicos/usuario_${username}`);
  const unico = await unicoRef.get();
  if (unico.exists && unico.data().id !== d.id) throw new HttpsError("already-exists", "El nombre de usuario ya existe.");
  let uid = d.id, creado = false;
  try {
    if (!uid) { if (texto(d.password).length < 8) throw new HttpsError("invalid-argument", "La contraseña inicial debe tener 8 caracteres."); uid = (await getAuth().createUser({ email: correo, password: d.password, displayName: texto(d.nombre), disabled: d.estado !== "Activo" })).uid; creado = true; }
    else await getAuth().updateUser(uid, { email: correo, displayName: texto(d.nombre), disabled: d.estado !== "Activo" });
    await db.runTransaction(async tx => { const perfilRef = db.doc(`usuario/${uid}`), anterior = await tx.get(perfilRef); if (anterior.exists && anterior.data().username && anterior.data().username !== username) tx.delete(db.doc(`unicos/usuario_${anterior.data().username}`)); tx.set(perfilRef, { nombre: texto(d.nombre), username, correo, rol: d.rol, estado: d.estado, actualizadoEn: FieldValue.serverTimestamp() }, { merge: true }); tx.set(unicoRef, { id: uid }); });
    return { id: uid };
  } catch (error) { if (creado) await getAuth().deleteUser(uid).catch(() => {}); throw error; }
});

exports.sincronizarAlertaStock = onDocumentWritten("producto/{productoId}", async event => {
  const ref = db.doc(`alertas/${event.params.productoId}`);
  if (!event.data.after.exists) { await ref.delete().catch(() => {}); return; }
  const p = event.data.after.data(), stock = Number(p.stock || 0), minimo = Number(p.stockMinimo || 0);
  if (stock <= minimo) await ref.set({ productoId: event.params.productoId, productoNombre: p.nombre, stock, stockMinimo: minimo, tipo: stock === 0 ? "Agotado" : "Stock bajo", estado: "Pendiente", leida: false, fecha: FieldValue.serverTimestamp() }, { merge: true });
  else await ref.set({ productoId: event.params.productoId, productoNombre: p.nombre, stock, stockMinimo: minimo, tipo: "Resuelta", estado: "Resuelta", leida: true, fechaResolucion: FieldValue.serverTimestamp() }, { merge: true });
});
