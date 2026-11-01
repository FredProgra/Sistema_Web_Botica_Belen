iniciarLayout('historial');
const admin = usuario.rol === 'admin';
$('#titulo').textContent = admin ? 'Historial de ventas' : 'Mis ventas';
document.title = $('#titulo').textContent + ' - Botica Belén';

$('#tabla thead').innerHTML = `<tr>
  <th scope="col">Venta</th><th scope="col">Fecha</th><th scope="col">Hora</th><th scope="col">Cliente</th>
  ${admin ? '<th scope="col">Vendedor</th>' : ''}
  <th scope="col">Total</th><th scope="col">Método de pago</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr>`;

if (admin) {
  $('#campo-vend').hidden = false;
  $('#vend').innerHTML = '<option value="">Todos</option>' +
    USUARIOS.filter(u => u.rol === 'vendedor').map(u => `<option value="${u.id}">${esc(u.nombre)}</option>`).join('');
}

const fechaDMA = f => f.split('-').reverse().join('/');

function filtrar() {
  const f = Object.fromEntries(new FormData($('#filtros')));
  if (f.desde && f.hasta && f.desde > f.hasta) {
    mensaje('La fecha "Desde" no puede ser posterior a la fecha "Hasta". Corrija las fechas.');
    $('#desde').focus();
    return null;
  }
  mensaje('');
  return ventas.filter(v =>
    (admin || v.vendedorId === usuario.id) &&
    (!f.num || v.cod.toLowerCase().includes(f.num.trim().toLowerCase())) &&
    (!f.desde || v.fecha >= f.desde) &&
    (!f.hasta || v.fecha <= f.hasta) &&
    (!f.vend || v.vendedorId === f.vend) &&
    (!f.estado || v.estado === f.estado));
}

function pintar(avisar = false) {
  const l = filtrar(); if (!l) return;
  const conf = l.filter(v => v.estado === 'Confirmada');
  $('#s-ops').textContent = l.length;
  $('#s-conf').textContent = conf.length;
  $('#s-anul').textContent = l.length - conf.length;
  $('#s-monto').textContent = fmt(conf.reduce((s, v) => s + v.total, 0));

  $('#tabla tbody').innerHTML = l.map(v => {
    const anul = v.estado === 'Anulada';
    return `<tr>
      <th scope="row">${v.cod}</th>
      <td>${fechaDMA(v.fecha)}</td><td>${v.hora}</td><td>${esc(v.cliente)}</td>
      ${admin ? `<td>${esc(v.vendedor)}</td>` : ''}
      <td>${fmt(v.total)}</td><td>${esc(v.pago)}</td>
      <td><span class="badge ${anul ? 'anul' : 'conf'}"><span aria-hidden="true">${anul ? '✕' : '✓'}</span> ${v.estado}</span></td>
      <td class="acc">
        <button type="button" class="btn sec" data-ver="${v.cod}" aria-label="Ver detalle de ${v.cod}">Ver</button>
        ${admin && !anul ? `<button type="button" class="btn peligro" data-anular="${v.cod}" aria-label="Anular ${v.cod}">Anular</button>` : ''}
      </td></tr>`;
  }).join('') || `<tr><td colspan="${admin ? 9 : 8}">No se encontraron ventas con esos filtros.</td></tr>`;
  if (avisar) anunciar(`${l.length} venta(s) encontrada(s)`);
}

function ver(cod) {
  const v = ventas.find(x => x.cod === cod);
  abrirDialogo(`
    <h2 id="dlg-titulo">Detalle de ${v.cod}</h2>
    <p>Fecha: ${fechaDMA(v.fecha)} ${v.hora}<br>Cliente: ${esc(v.cliente)}<br>Vendedor: ${esc(v.vendedor)}<br>
       Pago: ${esc(v.pago)}<br>Estado: <strong>${v.estado}</strong>${v.motivo ? `<br>Motivo de anulación: ${esc(v.motivo)}` : ''}</p>
    <table><caption class="sr-only">Productos de la venta</caption>
      <thead><tr><th scope="col">Producto</th><th scope="col">Cant.</th><th scope="col">Subtotal</th></tr></thead>
      <tbody>${v.items.map(i => `<tr><th scope="row">${esc(i.nombre)}</th><td>${i.cant}</td><td>${fmt(i.precio * i.cant)}</td></tr>`).join('')}</tbody>
    </table>
    <p>Total: <strong>${fmt(v.total)}</strong></p>
    <div class="acciones"><button class="btn" data-cerrar type="button">Cerrar</button></div>`, `[data-ver="${cod}"]`);
}

function anular(cod) {
  const v = ventas.find(x => x.cod === cod);
  const d = abrirDialogo(`
    <h2 id="dlg-titulo">Anular ${v.cod}</h2>
    <p>Esta acción devolverá el stock de los productos y no se puede deshacer.</p>
    <form id="f-anular" novalidate>
      <label for="motivo">Motivo de la anulación (obligatorio)</label>
      <textarea id="motivo" rows="3" aria-describedby="err-motivo"></textarea>
      <p id="err-motivo" role="alert" class="mensaje error"></p>
      <div class="acciones">
        <button class="btn sec" data-cerrar type="button">Cancelar</button>
        <button class="btn peligro" type="submit">Anular venta</button>
      </div>
    </form>`, `[data-ver="${cod}"]`);
  $('#f-anular', d).addEventListener('submit', e => {
    e.preventDefault();
    const motivo = $('#motivo', d).value.trim();
    if (!motivo) { $('#err-motivo', d).textContent = '⚠ Escriba el motivo de la anulación.'; $('#motivo', d).focus(); return; }
    v.estado = 'Anulada'; v.motivo = motivo;
    v.items.forEach(i => { const p = productos.find(x => x.id === i.id); if (p) p.stock += i.cant; });
    guardarDatos();
    pintar();
    d.close();
    mensaje(`${v.cod} anulada. Stock devuelto.`, true);
    anunciar(`${v.cod} anulada. Stock devuelto.`);
  });
}

$('#filtros').addEventListener('submit', e => { e.preventDefault(); pintar(true); });
$('#tabla').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.ver) ver(b.dataset.ver);
  if (b.dataset.anular) anular(b.dataset.anular);
});
pintar();