// ============================================================
//  cart.js — Lógica del carrito de Tienda Mix
//  Depende de: products.js (PRODUCTS debe estar cargado antes)
// ============================================================

const Cart = (() => {
  // ─── Estado interno ──────────────────────────────────────
  let _items = {};  // { [productId]: { ...product, qty } }

  // ─── Privados ────────────────────────────────────────────
  function _getProduct(id) {
    return PRODUCTS.find((p) => p.id === id);
  }

  function _save() {
    try {
      localStorage.setItem("tiendamix_cart", JSON.stringify(_items));
    } catch (e) {
      console.warn("No se pudo guardar el carrito:", e);
    }
  }

  function _load() {
    try {
      const saved = localStorage.getItem("tiendamix_cart");
      if (saved) _items = JSON.parse(saved);
    } catch (e) {
      _items = {};
    }
  }

  // ─── API pública ─────────────────────────────────────────
  function init() {
    _load();
  }

  function add(productId, qty = 1) {
    const p = _getProduct(productId);
    if (!p) return { ok: false, msg: "Producto no encontrado" };
    if (p.stock === 0) return { ok: false, msg: "Producto sin stock" };

    const currentQty = _items[productId]?.qty || 0;
    const toAdd = Math.min(qty, p.stock - currentQty);

    if (toAdd <= 0) return { ok: false, msg: `Máximo disponible: ${p.stock} unidades` };

    if (_items[productId]) {
      _items[productId].qty += toAdd;
    } else {
      _items[productId] = { ...p, qty: toAdd };
    }
    _save();
    return { ok: true, msg: `${toAdd}× ${p.name} agregado`, added: toAdd };
  }

  function remove(productId) {
    if (!_items[productId]) return;
    delete _items[productId];
    _save();
  }

  function setQty(productId, qty) {
    const p = _getProduct(productId);
    if (!p) return;
    if (qty <= 0) {
      remove(productId);
    } else {
      _items[productId] = { ...p, qty: Math.min(qty, p.stock) };
      _save();
    }
  }

  function changeQty(productId, delta) {
    const current = _items[productId]?.qty || 0;
    setQty(productId, current + delta);
  }

  function clear() {
    _items = {};
    _save();
  }

  function getItems() {
    return Object.values(_items);
  }

  function getCount() {
    return Object.values(_items).reduce((sum, i) => sum + i.qty, 0);
  }

  function getSubtotal() {
    return Object.values(_items).reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  function isEmpty() {
    return Object.keys(_items).length === 0;
  }

  // ─── WhatsApp ────────────────────────────────────────────
  function buildWhatsAppMessage(clientInfo = {}) {
    const items = getItems();
    if (!items.length) return null;

    const { name = "", address = "", notes = "" } = clientInfo;
    const lines = [
      "🛒 *COTIZACIÓN — TIENDA MIX*",
      "━━━━━━━━━━━━━━━━━━━━",
    ];

    if (name)    lines.push(`👤 *Cliente:* ${name}`);
    if (address) lines.push(`📍 *Dirección:* ${address}`);
    lines.push("", "*PRODUCTOS:*");

    items.forEach((item) => {
      lines.push(`• ${item.qty}× ${item.name}`);
      lines.push(`  💰 $${item.price} c/u = *$${(item.price * item.qty).toLocaleString()}*`);
    });

    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push(`📦 *TOTAL: $${getSubtotal().toLocaleString()} MXN*`);
    lines.push("", "⏰ Horario: Lun-Vie 10am-7pm | Sáb 10am-6pm");

    if (notes) lines.push("", `📝 *Notas:* ${notes}`);

    lines.push("", "_Precios sujetos a cambio sin previo aviso_");
    return lines.join("\n");
  }

  function sendToWhatsApp(clientInfo = {}) {
    const msg = buildWhatsAppMessage(clientInfo);
    if (!msg) return;
    window.open(`https://wa.me/529612478986?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function exportText(clientInfo = {}) {
    return buildWhatsAppMessage(clientInfo);
  }

  return {
    init, add, remove, setQty, changeQty, clear,
    getItems, getCount, getSubtotal, isEmpty,
    sendToWhatsApp, exportText, buildWhatsAppMessage,
  };
})();
