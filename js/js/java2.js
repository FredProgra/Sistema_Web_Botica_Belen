const PRODUCTOS_INICIALES = [
  { codigo: "P001", nombre: "Paracetamol", categoria: "Medicamentos", stock: 50, precio: 2.50, estado: "Activo" },
  { codigo: "P002", nombre: "Amoxicilina", categoria: "Medicamentos", stock: 35, precio: 4.50, estado: "Activo" },
  { codigo: "P003", nombre: "Ibuprofeno", categoria: "Medicamentos", stock: 40, precio: 3.00, estado: "Activo" },
  { codigo: "P004", nombre: "Loratadina", categoria: "Medicamentos", stock: 25, precio: 2.80, estado: "Activo" },
  { codigo: "P005", nombre: "Omeprazol", categoria: "Medicamentos", stock: 30, precio: 3.50, estado: "Activo" },
  { codigo: "P006", nombre: "Cetirizina", categoria: "Medicamentos", stock: 20, precio: 2.50, estado: "Activo" },
  { codigo: "P007", nombre: "Prednisona", categoria: "Medicamentos", stock: 15, precio: 3.80, estado: "Activo" },
  { codigo: "P008", nombre: "Dexametasona", categoria: "Medicamentos", stock: 18, precio: 4.00, estado: "Activo" }
];

const USUARIOS_INICIALES = [
  { id: 1, nombre: "Belen Acuache", username: "bacuache", rol: "Administrador", estado: "Activo" },
  { id: 2, nombre: "Juan Ordoñez", username: "jordoez", rol: "Vendedor", estado: "Activo" },
  { id: 3, nombre: "Jenifer Lopez", username: "jlopez", rol: "Vendedor", estado: "Inactivo" }
];

function cargarDatos(clave, iniciales) {
  const guardado = localStorage.getItem(clave);
  if (guardado === null) {
    localStorage.setItem(clave, JSON.stringify(iniciales));
    return [...iniciales];
  }
  try { return JSON.parse(guardado); }
  catch { return [...iniciales]; }
}

let productos = cargarDatos("boticaBelen_productos", PRODUCTOS_INICIALES);
let usuarios = cargarDatos("boticaBelen_usuarios", USUARIOS_INICIALES);

function guardarProductos() {
  localStorage.setItem("boticaBelen_productos", JSON.stringify(productos));
  actualizarResumen();
}
function guardarUsuarios() {
  localStorage.setItem("boticaBelen_usuarios", JSON.stringify(usuarios));
  actualizarResumen();
}

function mostrarSeccion(nombre) {
  document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
  const destino = document.getElementById(nombre);
  if (destino) destino.classList.remove("hidden");

  document.querySelectorAll(".menu-item").forEach(b => b.classList.toggle("active", b.dataset.section === nombre));

  if (nombre === "inventario") mostrarProductos();
  if (nombre === "usuarios") mostrarUsuarios();
}

function actualizarResumen() {
  document.getElementById("totalProductos").textContent = productos.length;
  document.getElementById("totalUsuarios").textContent = usuarios.length;
}

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[caracter]);
}

function etiquetaEstado(estado) {
  const activo = estado === "Activo";
  return `<span class="status ${activo ? "active" : "inactive"}">${escapar(estado)}</span>`;
}

// ---------------- INVENTARIO ----------------
function mostrarProductos(lista = productos) {
  const tabla = document.getElementById("tablaProductos");
  if (!tabla) return;
  if (!lista.length) {
    tabla.innerHTML = '<tr><td colspan="7" class="empty-row">No se encontraron productos.</td></tr>';
    return;
  }
  tabla.innerHTML = lista.map(p => {
    const indice = productos.indexOf(p);
    return `<tr>
      <td>${escapar(p.codigo)}</td><td>${escapar(p.nombre)}</td><td>${escapar(p.categoria)}</td>
      <td>${Number(p.stock)}</td><td>S/. ${Number(p.precio).toFixed(2)}</td>
      <td>${etiquetaEstado(p.estado)}</td>
      <td><div class="action-group">
        <button class="icon-button edit-button" title="Editar" onclick="editarProducto(${indice})">✎</button>
        <button class="icon-button delete-button" title="Eliminar" onclick="eliminarProducto(${indice})">⌫</button>
      </div></td></tr>`;
  }).join("");
}

function filtrarProductos() {
  const texto = document.getElementById("buscarProducto").value.trim().toLowerCase();
  const categoria = document.getElementById("categoriaFiltro").value;
  const lista = productos.filter(p =>
    (p.nombre.toLowerCase().includes(texto) || p.codigo.toLowerCase().includes(texto)) &&
    (!categoria || p.categoria === categoria)
  );
  mostrarProductos(lista);
}

function abrirModalProducto(indice = "") {
  document.getElementById("formProducto").reset();
  document.getElementById("indiceProducto").value = indice;
  document.getElementById("tituloModalProducto").textContent = indice === "" ? "Nuevo producto" : "Editar producto";
  if (indice !== "") {
    const p = productos[indice];
    document.getElementById("codigo").value = p.codigo;
    document.getElementById("nombreProducto").value = p.nombre;
    document.getElementById("categoria").value = p.categoria;
    document.getElementById("stock").value = p.stock;
    document.getElementById("precio").value = p.precio;
    document.getElementById("estadoProducto").value = p.estado;
  }
  abrirModal("modalProducto");
}
function editarProducto(indice) { abrirModalProducto(String(indice)); }
function cerrarModalProducto() { cerrarModal("modalProducto"); }

document.getElementById("formProducto").addEventListener("submit", event => {
  event.preventDefault();
  const indice = document.getElementById("indiceProducto").value;
  const producto = {
    codigo: document.getElementById("codigo").value.trim(),
    nombre: document.getElementById("nombreProducto").value.trim(),
    categoria: document.getElementById("categoria").value,
    stock: Number(document.getElementById("stock").value),
    precio: Number(document.getElementById("precio").value),
    estado: document.getElementById("estadoProducto").value
  };

  if (productos.some((p, i) => p.codigo.toLowerCase() === producto.codigo.toLowerCase() && String(i) !== indice)) {
    alert("Ya existe un producto con ese código.");
    return;
  }
  if (indice === "") productos.push(producto);
  else productos[Number(indice)] = producto;

  guardarProductos();
  filtrarProductos();
  cerrarModalProducto();
  alert("Producto guardado correctamente.");
});

function eliminarProducto(indice) {
  if (!confirm(`¿Deseas eliminar el producto ${productos[indice].nombre}?`)) return;
  productos.splice(indice, 1);
  guardarProductos();
  filtrarProductos();
}

// ---------------- USUARIOS ----------------
function mostrarUsuarios(lista = usuarios) {
  const tabla = document.getElementById("tablaUsuarios");
  if (!tabla) return;
  if (!lista.length) {
    tabla.innerHTML = '<tr><td colspan="6" class="empty-row">No se encontraron usuarios.</td></tr>';
    return;
  }
  tabla.innerHTML = lista.map(u => {
    const indice = usuarios.indexOf(u);
    return `<tr>
      <td>${Number(u.id)}</td><td>${escapar(u.nombre)}</td><td>${escapar(u.username)}</td>
      <td>${escapar(u.rol)}</td><td>${etiquetaEstado(u.estado)}</td>
      <td><div class="action-group">
        <button class="icon-button edit-button" title="Editar" onclick="editarUsuario(${indice})">✎</button>
        <button class="icon-button delete-button" title="Eliminar" onclick="eliminarUsuario(${indice})">⌫</button>
      </div></td></tr>`;
  }).join("");
}

function filtrarUsuarios() {
  const texto = document.getElementById("buscarUsuario").value.trim().toLowerCase();
  mostrarUsuarios(usuarios.filter(u =>
    u.nombre.toLowerCase().includes(texto) ||
    u.username.toLowerCase().includes(texto) ||
    u.rol.toLowerCase().includes(texto)
  ));
}

function siguienteIdUsuario() {
  return usuarios.length ? Math.max(...usuarios.map(u => Number(u.id))) + 1 : 1;
}

function abrirModalUsuario(indice = "") {
  document.getElementById("formUsuario").reset();
  document.getElementById("indiceUsuario").value = indice;
  document.getElementById("tituloModalUsuario").textContent = indice === "" ? "Nuevo usuario" : "Editar usuario";
  if (indice !== "") {
    const u = usuarios[indice];
    document.getElementById("nombreUsuario").value = u.nombre;
    document.getElementById("username").value = u.username;
    document.getElementById("rol").value = u.rol;
    document.getElementById("estadoUsuario").value = u.estado;
  }
  abrirModal("modalUsuario");
}
function editarUsuario(indice) { abrirModalUsuario(String(indice)); }
function cerrarModalUsuario() { cerrarModal("modalUsuario"); }

document.getElementById("formUsuario").addEventListener("submit", event => {
  event.preventDefault();
  const indice = document.getElementById("indiceUsuario").value;
  const username = document.getElementById("username").value.trim();

  if (usuarios.some((u, i) => u.username.toLowerCase() === username.toLowerCase() && String(i) !== indice)) {
    alert("Ese nombre de usuario ya está registrado.");
    return;
  }

  const usuario = {
    id: indice === "" ? siguienteIdUsuario() : usuarios[Number(indice)].id,
    nombre: document.getElementById("nombreUsuario").value.trim(),
    username,
    rol: document.getElementById("rol").value,
    estado: document.getElementById("estadoUsuario").value
  };

  if (indice === "") usuarios.push(usuario);
  else usuarios[Number(indice)] = usuario;

  guardarUsuarios();
  filtrarUsuarios();
  cerrarModalUsuario();
  alert("Usuario guardado correctamente.");
});

function eliminarUsuario(indice) {
  if (!confirm(`¿Deseas eliminar al usuario ${usuarios[indice].nombre}?`)) return;
  usuarios.splice(indice, 1);
  guardarUsuarios();
  filtrarUsuarios();
}

// ---------------- MODALES ----------------
function abrirModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}
function cerrarModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("click", event => {
    if (event.target === modal) cerrarModal(modal.id);
  });
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    cerrarModalProducto();
    cerrarModalUsuario();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  mostrarProductos();
  mostrarUsuarios();
  actualizarResumen();
});
