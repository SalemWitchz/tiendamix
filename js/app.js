// ============================================================
//  app.js — Interfaz de usuario de Tienda Mix
//  Depende de: products.js + cart.js
// ============================================================

let currentFilter = "todos";
let activeProduct = null;
let modalQty = 1;

// ─── INIT ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  Cart.init();
  renderProducts("todos");
  renderCategories();
  updateCartBadge();
  initCursorGlow();
  initRevealObserver();
  initNavScroll();
  initEvents();
});

// ─── EVENTOS (sin onclick en el HTML) ────────────────────
function initEvents() {
  // Carrito
  document.querySelector(".cart-trigger")
    .addEventListener("click", openCartPanel);
  document.getElementById("cartOverlay")
    .addEventListener("click", closeCartPanel);
  document.getElementById("cartClose")
    .addEventListener("click", closeCartPanel);
  document.getElementById("checkoutBtn")
    .addEventListener("click", openCheckoutForm);

  // Hero — botones con data-scroll="seccionId"
  document.querySelectorAll("[data-scroll]").forEach((btn) => {
    btn.addEventListener("click", () => scrollToSection(btn.dataset.scroll));
  });

  // Filtro de categorías (delegación en la barra de filtros)
  document.getElementById("filterBar").addEventListener("click", (e) => {
    const btn = e.target.closest(".f-btn");
    if (btn) filterProducts(btn.dataset.filter);
  });

  // Tarjetas de categoría (delegación en el grid)
  document.getElementById("catsGrid").addEventListener("click", (e) => {
    const card = e.target.closest(".cat-card");
    if (card) filterProducts(card.dataset.cat);
  });

  // Tarjetas de producto (delegación en el grid)
  document.getElementById("prodGrid").addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-btn");
    if (addBtn) { e.stopPropagation(); addToCart(+addBtn.dataset.id); return; }
    const card = e.target.closest(".prod-card");
    if (card) openModal(+card.dataset.id);
  });

  // Carrito — controles de cantidad y eliminar (delegación en el body del panel)
  document.getElementById("cartBody").addEventListener("click", (e) => {
    const qtyBtn = e.target.closest(".qty-b");
    const rmBtn  = e.target.closest(".rm-btn");
    if (qtyBtn) { cartChangeQty(+qtyBtn.dataset.id, +qtyBtn.dataset.delta); return; }
    if (rmBtn)  { cartRemove(+rmBtn.dataset.id); }
  });

  // Modal producto — cerrar al hacer clic en el fondo
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Modal producto — botón cerrar, cantidad y agregar (delegación)
  document.getElementById("mImg").addEventListener("click", (e) => {
    if (e.target.closest(".modal-close")) closeModal();
  });
  document.getElementById("mContent").addEventListener("click", (e) => {
    const mqBtn  = e.target.closest(".mq-btn");
    const addBtn = e.target.closest(".modal-add-btn");
    if (mqBtn)  { modalQtyChange(+mqBtn.dataset.delta); return; }
    if (addBtn) { modalAddToCart(); }
  });

  // Checkout
  document.getElementById("cancelBtn").addEventListener("click", closeCheckoutForm);
  document.getElementById("submitBtn").addEventListener("click", submitCheckout);

  // Footer — links de filtro con data-filter-link="categoria"
  document.querySelector("footer").addEventListener("click", (e) => {
    const link = e.target.closest("[data-filter-link]");
    if (link) { e.preventDefault(); filterProducts(link.dataset.filterLink); }
  });
}

// ─── CURSOR GLOW ─────────────────────────────────────────
function initCursorGlow() {
  const glow = document.getElementById("cursorGlow");
  if (!glow) return;
  document.addEventListener("mousemove", (e) => {
    glow.style.left = e.clientX + "px";
    glow.style.top  = e.clientY + "px";
  });
}

// ─── NAVBAR SCROLL ───────────────────────────────────────
function initNavScroll() {
  const nav = document.getElementById("mainNav");
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 60);
  });
}

// ─── SCROLL REVEAL ───────────────────────────────────────
function initRevealObserver() {
  observe(document.querySelectorAll(".reveal"));
}
function observe(elements) {
  const obs = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
    }),
    { threshold: 0.07 }
  );
  elements.forEach((el) => obs.observe(el));
}
function reObserveReveal() {
  observe(document.querySelectorAll(".reveal:not(.in)"));
}

// ─── HELPERS ─────────────────────────────────────────────
function categoryLabel(cat) {
  const labels = {
    esencias:    "Esencias & Siropes",
    bases:       "Bases en Polvo",
    bubbas:      "Bubbas & Tapioca",
    desechables: "Vasos & Desechables",
    utensilios:  "Utensilios Bar",
  };
  return labels[cat] || cat;
}

function stockInfo(stock) {
  if (stock === 0)  return { cls: "s-out", label: "Agotado" };
  if (stock <= 5)   return { cls: "s-low", label: `Últimas ${stock}` };
  return                   { cls: "s-in",  label: "Disponible" };
}

function formatPrice(n) {
  return "$" + n.toLocaleString("es-MX");
}

// ─── IMAGEN CON FALLBACK A EMOJI ─────────────────────────
function productImageHTML(p, size = "card") {
  const cls = size === "modal" ? "prod-img-modal" : "prod-img-thumb";
  return `
    <img
      class="${cls}"
      src="${p.image}"
      alt="${p.name}"
      loading="lazy"
      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
    />
    <span class="prod-emoji-fallback" style="display:none;" aria-hidden="true">${p.emoji}</span>
  `;
}

// ─── CATEGORÍAS ──────────────────────────────────────────
function renderCategories() {
  const grid = document.getElementById("catsGrid");
  if (!grid) return;
  grid.innerHTML = CATEGORIES.map((c) => `
    <div class="cat-card c-${c.color}" data-cat="${c.id}" role="button" tabindex="0">
      <span class="cat-emoji">${c.emoji}</span>
      <div class="cat-name">${c.label}</div>
      <div class="cat-count">${c.desc}</div>
      <div class="cat-arrow">→</div>
    </div>
  `).join("");
}

// ─── PRODUCTOS ───────────────────────────────────────────
function renderProducts(filter = "todos") {
  currentFilter = filter;
  const list = filter === "todos" ? PRODUCTS : PRODUCTS.filter((p) => p.cat === filter);
  const grid = document.getElementById("prodGrid");
  if (!grid) return;
  if (!list.length) {
    grid.innerHTML = `<div class="no-results">No hay productos en esta categoría</div>`;
    return;
  }
  grid.innerHTML = list.map((p) => buildProductCard(p)).join("");
  reObserveReveal();
}

function buildProductCard(p) {
  const s     = stockInfo(p.stock);
  const badge = p.badge
    ? `<span class="pbadge pb-${p.badge}">${{ new:"Nuevo", hot:"Popular", sale:"Oferta" }[p.badge]}</span>`
    : "";
  const short = p.flavors.length > 72 ? p.flavors.substring(0, 72) + "…" : p.flavors;

  return `
  <article class="prod-card reveal" data-id="${p.id}" role="button" tabindex="0" aria-label="Ver ${p.name}">
    <div class="prod-img-wrap">
      ${productImageHTML(p, "card")}
      <div class="prod-badges">${badge}</div>
      <div class="stock-pill ${s.cls}">
        <span class="sdot"></span><span>${s.label}</span>
      </div>
      <div class="quick-overlay"><button class="qbtn" tabindex="-1">Ver detalle</button></div>
    </div>
    <div class="prod-body">
      <div class="prod-cat-tag">${categoryLabel(p.cat)}</div>
      <h3 class="prod-name">${p.name}</h3>
      <p class="prod-flavors">${short}</p>
      <div class="prod-foot">
        <div class="prod-price"><span class="price-main">${formatPrice(p.price)}</span></div>
        <button
          class="add-btn"
          data-id="${p.id}"
          ${p.stock === 0 ? "disabled" : ""}
          title="${p.stock === 0 ? "Sin stock" : "Agregar al carrito"}"
        >+</button>
      </div>
    </div>
  </article>`;
}

// ─── FILTROS ─────────────────────────────────────────────
function filterProducts(cat) {
  document.querySelectorAll(".f-btn").forEach((b) => b.classList.remove("on"));
  const btn = document.querySelector(`[data-filter="${cat}"]`);
  if (btn) btn.classList.add("on");
  renderProducts(cat);
  document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" });
}

// ─── CARRITO — BADGE ─────────────────────────────────────
function updateCartBadge() {
  const n  = Cart.getCount();
  const el = document.getElementById("cartCount");
  if (!el) return;
  el.textContent = n;
  el.classList.toggle("show", n > 0);
}

// ─── CARRITO — PANEL ─────────────────────────────────────
function openCartPanel() {
  document.getElementById("cartOverlay")?.classList.add("open");
  document.getElementById("cartPanel")?.classList.add("open");
  renderCartPanel();
}
function closeCartPanel() {
  document.getElementById("cartOverlay")?.classList.remove("open");
  document.getElementById("cartPanel")?.classList.remove("open");
}
function renderCartPanel() {
  const body   = document.getElementById("cartBody");
  const footer = document.getElementById("cartFt");
  const items  = Cart.getItems();
  if (!body || !footer) return;

  if (!items.length) {
    body.innerHTML = `
      <div class="cart-empty-state">
        <div class="cart-empty-icon">🛒</div>
        <p>Tu carrito está vacío</p>
        <p class="hint">Agrega productos para comenzar</p>
      </div>`;
    footer.style.display = "none";
    return;
  }

  footer.style.display = "block";
  body.innerHTML = items.map((item) => `
    <div class="cart-item">
      <div class="ci-thumb">
        <img src="${item.image}" alt="${item.name}"
          style="width:100%;height:100%;object-fit:cover;border-radius:6px;"
          onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
        <span style="display:none;font-size:1.6rem;">${item.emoji}</span>
      </div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-sub">${categoryLabel(item.cat)}</div>
        <div class="ci-price">${formatPrice(item.price * item.qty)}</div>
        <div class="ci-controls">
          <button class="qty-b" data-id="${item.id}" data-delta="-1">−</button>
          <span class="qty-v">${item.qty}</span>
          <button class="qty-b" data-id="${item.id}" data-delta="1">+</button>
          <button class="rm-btn" data-id="${item.id}">🗑</button>
        </div>
      </div>
    </div>`).join("");

  const sub = Cart.getSubtotal();
  document.getElementById("cartSub").textContent      = formatPrice(sub);
  document.getElementById("cartTotalVal").textContent = formatPrice(sub);
}

function addToCart(id) {
  const r = Cart.add(id);
  r.ok ? (updateCartBadge(), toast("✅", r.msg)) : toast("⚠️", r.msg);
}
function cartChangeQty(id, delta) { Cart.changeQty(id, delta); updateCartBadge(); renderCartPanel(); }
function cartRemove(id)            { Cart.remove(id);           updateCartBadge(); renderCartPanel(); }

// ─── CHECKOUT ────────────────────────────────────────────
function openCheckoutForm() {
  if (Cart.isEmpty()) { toast("⚠️", "Tu carrito está vacío"); return; }
  document.getElementById("checkoutModal")?.classList.add("open");
}
function closeCheckoutForm() {
  document.getElementById("checkoutModal")?.classList.remove("open");
}
function submitCheckout() {
  const name    = document.getElementById("clientName")?.value.trim()    || "";
  const address = document.getElementById("clientAddress")?.value.trim() || "";
  const notes   = document.getElementById("clientNotes")?.value.trim()   || "";
  Cart.sendToWhatsApp({ name, address, notes });
  closeCheckoutForm();
  closeCartPanel();
  toast("🎉", "¡Cotización enviada por WhatsApp!");
}

// ─── MODAL PRODUCTO ──────────────────────────────────────
function openModal(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;
  activeProduct = p;
  modalQty = 1;

  const s     = stockInfo(p.stock);
  const sbCls = { "s-in": "msb-in", "s-low": "msb-low", "s-out": "msb-out" }[s.cls];
  const sbTxt = p.stock === 0
    ? "Producto agotado"
    : p.stock <= 5
      ? `¡Solo quedan ${p.stock} unidades!`
      : `En stock · ${p.stock} disponibles`;
  const tags = p.tags.map((t) => `<span class="m-tag">${t}</span>`).join("");

  document.getElementById("mImg").innerHTML = `
    <button class="modal-close">✕</button>
    <div class="modal-img-inner">
      ${productImageHTML(p, "modal")}
    </div>`;

  document.getElementById("mContent").innerHTML = `
    <div class="modal-cat">${categoryLabel(p.cat)}</div>
    <h2 class="modal-name">${p.name}</h2>
    <p class="modal-desc">${p.desc}</p>
    <div class="modal-tags">${tags}</div>
    <div class="modal-flavors-section">
      <div class="flavors-label">Sabores / presentaciones</div>
      <p class="flavors-text">${p.flavors}</p>
    </div>
    <div class="modal-stock-bar ${sbCls}">
      <span class="sdot"></span><span class="msb-text">${sbTxt}</span>
    </div>
    <div class="modal-price-row">
      <span class="mp-main">${formatPrice(p.price)}</span>
      <span class="mp-unit">MXN</span>
    </div>
    ${p.stock > 0 ? `
    <div class="modal-qty-row">
      <span class="mq-label">Cantidad:</span>
      <div class="mq-ctrl">
        <button class="mq-btn" data-delta="-1">−</button>
        <span class="mq-val" id="mqVal">1</span>
        <button class="mq-btn" data-delta="1">+</button>
      </div>
      <span class="mq-max">máx. ${p.stock}</span>
    </div>` : ""}
    <button class="modal-add-btn" ${p.stock === 0 ? "disabled" : ""}>
      ${p.stock === 0 ? "❌ Sin stock disponible" : "🛒 Agregar al carrito"}
    </button>
    <div class="modal-trust-row">
      <span>🔒 Seguro</span><span>💬 WhatsApp</span><span>📍 Tienda física</span>
    </div>`;

  document.getElementById("modalOverlay")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modalOverlay")?.classList.remove("open");
  document.body.style.overflow = "";
  activeProduct = null;
}

function modalQtyChange(delta) {
  if (!activeProduct) return;
  modalQty = Math.max(1, Math.min(activeProduct.stock, modalQty + delta));
  const el = document.getElementById("mqVal");
  if (el) el.textContent = modalQty;
}

function modalAddToCart() {
  if (!activeProduct) return;
  const r = Cart.add(activeProduct.id, modalQty);
  if (r.ok) {
    updateCartBadge();
    toast("✅", `${r.added}× ${activeProduct.name} al carrito`);
    closeModal();
  } else {
    toast("⚠️", r.msg);
  }
}

// ─── TOAST ───────────────────────────────────────────────
function toast(icon, msg, duration = 3500) {
  const c = document.getElementById("toasts");
  if (!c) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 350);
  }, duration);
}

// ─── SCROLL ──────────────────────────────────────────────
function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}
