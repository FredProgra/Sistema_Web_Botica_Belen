iniciarLayout('nueva');
$('#vendedor').textContent = usuario.nombre;

let carrito = [], cat = 'Todo', texto = '';
const cats = ['Todo', ...new Set(productos.map(p => p.categoria))];
const total = () => carrito.reduce((s, i) => s + i.precio * i.cant, 0);
const enCarrito = id => carrito.find(i => i.id === id)?.cant || 0;

function pintarCats() {
  $('#categorias').innerHTML = cats.map(c =>
    `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${c === cat}">${esc(c)}</button>`).join('');
}

function filtrados() {
  const t = texto.toLowerCase();
  return productos.filter(p => (cat === 'Todo' || p.categoria === cat) && (p.nombre + ' ' + p.codigo).toLowerCase().includes(t));
}

function pintarCatalogo(avisar = false) {
  const l = filtrados();
  $('#catalogo').innerHTML = l.map(p => {
    const disp = p.stock - enCarrito(p.id), n = esc(p.nombre);
    return `<li class="tarjeta">
      <div class="ph" aria-hidden="true">${esc(p.nombre[0])}</div>
      <div class="info">
        <strong>${n}</strong>
        <span>Código ${esc(p.codigo)}</span>
        <span>${disp > 0 ? 'Disponibles: ' + disp : 'Agotado'}</span>
        ${p.receta ? '<span class="etiqueta">Requiere receta médica</span>' : ''}
      </div>
      <span class="precio">${fmt(p.precio)}</span>
      <div class="cant" role="group" aria-label="Cantidad de ${n}">
        <button type="button" data-menos aria-label="Disminuir cantidad de ${n}">−</button>
        <input type="number" min="1" max="${Math.max(disp, 1)}" value="1" data-q aria-label="Cantidad de ${n}">
        <button type="button" data-mas aria-label="Aumentar cantidad de ${n}">+</button>
      </div>
      <button type="button" class="btn" data-add="${p.id}" aria-label="Agregar ${n} al carrito" ${disp < 1 ? 'disabled' : ''}>${disp < 1 ? 'Agotado' : 'Agregar'}</button>
    </li>`;
  }).join('') || '<li>No se encontraron productos.</li>';
  if (avisar) $('#estado-busq').textContent = `${l.length} producto(s) encontrado(s)`;
}

function pintarCarrito() {
  $('#carrito tbody').innerHTML = carrito.map(i => {
    const n = esc(i.nombre);
    return `<tr>
      <th scope="row">${n}</th>
      <td>${fmt(i.precio)}</td>
      <td><div class="cant" role="group" aria-label="Cantidad de ${n}">
        <button type="button" data-cmenos="${i.id}" aria-label="Disminuir cantidad de ${n}">−</button>
        <input type="number" min="1" value="${i.cant}" data-cq="${i.id}" aria-label="Cantidad de ${n}">
        <button type="button" data-cmas="${i.id}" aria-label="Aumentar cantidad de ${n}">+</button></div></td>
      <td>${fmt(i.precio * i.cant)}</td>
      <td><button type="button" class="icono" data-quitar="${i.id}" aria-label="Quitar ${n} de la venta">${ico(ICONOS.papelera)} Quitar</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="5">Aún no hay productos en la venta.</td></tr>';
  $('#subtotal').textContent = fmt(total());
  $('#cantprod').textContent = carrito.reduce((s, i) => s + i.cant, 0);
  $('#confirmar').setAttribute('aria-disabled', carrito.length ? 'false' : 'true');
}

const pintarTodo = () => { pintarCatalogo(); pintarCarrito(); };

function agregar(id, n) {
  const p = productos.find(x => x.id === id);
  const disp = p.stock - enCarrito(id);
  if (!(n >= 1)) return mensaje('Ingrese una cantidad válida (mínimo 1).');
  if (n > disp) return mensaje(`Solo hay ${disp} unidades disponibles de ${p.nombre}.`);
  mensaje('');
  const hacer = () => {
    const it = carrito.find(i => i.id === id);
    it ? it.cant += n : carrito.push({ id, nombre: p.nombre, precio: p.precio, cant: n });
    pintarTodo();
    anunciar(`${p.nombre} agregado. Total: ${fmt(total())}`);
    ($(`[data-add="${id}"]:not([disabled])`) || $('#q')).focus();
  };
  if (!p.receta) return hacer();
  const d = abrirDialogo(`
    <h2 id="dlg-titulo">Receta médica requerida</h2>
    <p><strong>${esc(p.nombre)}</strong> se vende con receta. ¿Verificó la receta del cliente?</p>
    <div class="acciones">
      <button class="btn sec" data-cerrar type="button">Cancelar</button>
      <button class="btn" data-ok type="button">Sí, receta verificada</button>
    </div>`, `[data-add="${id}"]`);
  $('[data-ok]', d).onclick = () => { d.close(); hacer(); };
}

function cambiar(id, nueva, foco) {
  const it = carrito.find(i => i.id === id), p = productos.find(x => x.id === id);
  if (!(nueva >= 1)) nueva = 1;
  if (nueva > p.stock) { nueva = p.stock; mensaje(`Máximo disponible de ${p.nombre}: ${p.stock}.`); } else mensaje('');
  it.cant = nueva;
  pintarTodo();
  anunciar(`${p.nombre}: ${nueva} unidades. Total: ${fmt(total())}`);
  $(foco)?.focus();
}

function quitar(id) {
  const i = carrito.findIndex(x => x.id === id), nombre = carrito[i].nombre;
  carrito.splice(i, 1);
  pintarTodo();
  anunciar(`${nombre} eliminado de la venta`);
  const sig = $$('[data-quitar]')[Math.min(i, carrito.length - 1)];
  (sig || $('#t-venta')).focus();
}

function confirmar() {
  if (!carrito.length) return mensaje('Agregue al menos un producto para confirmar la venta.');
  mensaje('');
  const cliente = $('#cliente').value, pago = $('#pago').value;
  const d = abrirDialogo(`
    <h2 id="dlg-titulo">Confirmar venta</h2>
    <ul>${carrito.map(i => `<li>${i.cant} × ${esc(i.nombre)} — ${fmt(i.precio * i.cant)}</li>`).join('')}</ul>
    <p>Cliente: <strong>${esc(cliente)}</strong><br>Pago: <strong>${esc(pago)}</strong></p>
    <p>Total: <strong>${fmt(total())}</strong></p>
    <div class="acciones">
      <button class="btn sec" data-cerrar type="button">Cancelar</button>
      <button class="btn" data-ok type="button">Registrar venta</button>
    </div>`, '#confirmar');
  $('[data-ok]', d).onclick = () => {
    const num = Math.max(0, ...ventas.map(v => +v.cod.slice(8))) + 1;
    const cod = 'CODVENTA' + String(num).padStart(3, '0');
    ventas.push({ cod, fecha: hoyISO(), hora: new Date().toTimeString().slice(0, 5), cliente,
      vendedorId: usuario.id, vendedor: usuario.nombre, pago, estado: 'Confirmada', motivo: '',
      items: carrito.map(i => ({ ...i })), total: total() });
    carrito.forEach(i => { productos.find(p => p.id === i.id).stock -= i.cant; });
    guardarDatos();
    carrito = [];
    pintarTodo();
    d.close();
    mensaje(`Venta ${cod} registrada correctamente.`, true);
    anunciar(`Venta ${cod} registrada correctamente`);
  };
}

/* ===== Eventos ===== */
$('#categorias').addEventListener('click', e => {
  const b = e.target.closest('[data-cat]'); if (!b) return;
  cat = b.dataset.cat; pintarCats(); pintarCatalogo(true);
  $(`[data-cat="${cat}"]`).focus();
});
$('#f-buscar').addEventListener('submit', e => { e.preventDefault(); texto = $('#q').value; pintarCatalogo(true); });
let t; $('#q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { texto = e.target.value; pintarCatalogo(true); }, 300); });

$('#catalogo').addEventListener('click', e => {
  const li = e.target.closest('li'); if (!li) return;
  const inp = $('[data-q]', li);
  if (e.target.closest('[data-mas]')) inp.value = Math.min(+inp.max, (+inp.value || 0) + 1);
  if (e.target.closest('[data-menos]')) inp.value = Math.max(1, (+inp.value || 2) - 1);
  const add = e.target.closest('[data-add]');
  if (add) agregar(+add.dataset.add, +inp.value);
});

$('#carrito').addEventListener('click', e => {
  const g = a => { const b = e.target.closest(`[${a}]`); return b && +b.getAttribute(a); };
  let id;
  if ((id = g('data-cmas'))) cambiar(id, enCarrito(id) + 1, `[data-cmas="${id}"]`);
  else if ((id = g('data-cmenos'))) cambiar(id, enCarrito(id) - 1, `[data-cmenos="${id}"]`);
  else if ((id = g('data-quitar'))) quitar(id);
});
$('#carrito').addEventListener('change', e => {
  const i = e.target.closest('[data-cq]');
  if (i) cambiar(+i.dataset.cq, +i.value, `[data-cq="${i.dataset.cq}"]`);
});
$('#confirmar').addEventListener('click', confirmar);

pintarCats(); pintarTodo(); pintarCarrito();