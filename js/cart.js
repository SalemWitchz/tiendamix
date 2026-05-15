// ============================================================
//  cart.js — Lógica del carrito de Tienda Mix
//  Depende de: products.js (PRODUCTS debe estar cargado antes)
//
//  Clave interna: "productId" o "productId|Sabor"
//  Esto permite tener el mismo producto con distintos sabores
//  como entradas separadas en el carrito.
// ============================================================

const Cart = (() => {
  // _items: { [cartKey]: { ...product, qty, selectedFlavor, _key } }
  let _items = {};

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
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migración: añadir _key si no existe (datos anteriores)
        Object.entries(parsed).forEach(([k, v]) => {
          if (!v._key) v._key = k;
        });
        _items = parsed;
      }
    } catch (e) {
      _items = {};
    }
  }

  // ─── API pública ─────────────────────────────────────────

  function init() {
    _load();
  }

  /**
   * @param {number} productId
   * @param {number} qty
   * @param {string|null} flavor  - Sabor seleccionado (null si no aplica)
   */
  function add(productId, qty = 1, flavor = null) {
    const p = _getProduct(productId);
    if (!p) return { ok: false, msg: "Producto no encontrado" };
    if (p.stock === 0) return { ok: false, msg: "Producto sin stock" };

    const key = flavor ? `${productId}|${flavor}` : String(productId);
    const currentQty = _items[key]?.qty || 0;
    const toAdd = Math.min(qty, p.stock - currentQty);

    if (toAdd <= 0) return { ok: false, msg: `Máximo disponible: ${p.stock} unidades` };

    if (_items[key]) {
      _items[key].qty += toAdd;
    } else {
      _items[key] = { ...p, qty: toAdd, selectedFlavor: flavor || null, _key: key };
    }
    _save();

    const flavorLabel = flavor ? ` (${flavor})` : "";
    return { ok: true, msg: `${toAdd}× ${p.name}${flavorLabel} agregado`, added: toAdd };
  }

  function remove(key) {
    delete _items[key];
    _save();
  }

  function setQty(key, qty) {
    if (!_items[key]) return;
    const p = _getProduct(_items[key].id);
    if (!p) return;
    if (qty <= 0) {
      remove(key);
    } else {
      _items[key].qty = Math.min(qty, p.stock);
      _save();
    }
  }

  function changeQty(key, delta) {
    if (!_items[key]) return;
    setQty(key, _items[key].qty + delta);
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
      if (item.selectedFlavor) lines.push(`  🍓 *Sabor:* ${item.selectedFlavor}`);
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
