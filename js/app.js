// ============================================================
//  app.js — Interfaz de usuario de Tienda Mix
//  Depende de: products.js + cart.js
// ============================================================

let currentFilter   = "todos";
let activeProduct   = null;
let modalQty        = 1;
let selectedFlavor  = null;
let searchQuery     = "";
let productsVisible = 8;

// ─── HELPERS DE SABORES ──────────────────────────────────
function parseFlavors(str) {
  if (!str || !str.includes(" · ")) return [];
  return str.split(" · ").map((s) => s.trim()).filter(Boolean);
}

// Solo esencias, bases y bubbas tienen sabores seleccionables;
// en utensilios y desechables el campo "flavors" son especificaciones.
const FLAVOR_CATS = new Set(["esencias", "bases", "bubbas"]);
function productHasFlavors(p) {
  return FLAVOR_CATS.has(p.cat) && parseFlavors(p.flavors).length > 1;
}

// ─── WISHLIST ─────────────────────────────────────────────
const Wishlist = (() => {
  const KEY = "tiendamix_wishlist";
  let _ids = new Set();

  function _save() { localStorage.setItem(KEY, JSON.stringify([..._ids])); }

  function init() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) _ids = new Set(JSON.parse(raw));
    } catch (_) {}
  }
  function toggle(id) { _ids.has(id) ? _ids.delete(id) : _ids.add(id); _save(); return _ids.has(id); }
  function has(id)    { return _ids.has(id); }
  function remove(id) { _ids.delete(id); _save(); }
  function getAll()   { return [..._ids].map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean); }
  function getCount() { return _ids.size; }

  return { init, toggle, has, remove, getAll, getCount };
})();

// ─── INIT ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadAdminProducts();
  Cart.init();
  Wishlist.init();
  renderProducts("todos");
  renderCategories();
  updateCartBadge();
  updateWishlistBadge();
  initCursorGlow();
  initRevealObserver();
  initNavScroll();
  initEvents();
  initSearch();
  initTheme();
  initParallax();
  initCounters();
  initReviews();
  initHamburger();
});

// ─── SINCRONIZAR STOCK DEL ADMIN ─────────────────────────
// Solo aplica valores de stock desde localStorage; el resto de los datos
// siempre viene de products.js para que los cambios de imagen/precio se reflejen.
function loadAdminProducts() {
  try {
    const raw = localStorage.getItem("tiendamix_admin_products");
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) return;
    const stockMap = {};
    saved.forEach((p) => { if (p.id != null) stockMap[p.id] = p.stock; });
    PRODUCTS.forEach((p) => { if (stockMap[p.id] != null) p.stock = stockMap[p.id]; });
  } catch (_) {}
}

// ─── RESEÑAS ─────────────────────────────────────────────
const REVIEWS_KEY = "tiendamix_reviews";

function getReviews() {
  try { return JSON.parse(localStorage.getItem(REVIEWS_KEY)) || []; }
  catch { return []; }
}

function saveReviews(arr) {
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(arr));
}

function initReviews() {
  renderReviewsGrid();
  initStarInput();

  const submitBtn = document.getElementById("submitReview");
  if (submitBtn) submitBtn.addEventListener("click", submitReview);
}

function renderReviewsGrid() {
  const grid = document.getElementById("reviewsGrid");
  if (!grid) return;
  const approved = getReviews().filter((r) => r.approved);

  if (!approved.length) {
    grid.innerHTML = `<p class="reviews-empty">Sé el primero en dejar una reseña</p>`;
    return;
  }

  grid.innerHTML = approved.map((r) => {
    const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
    return `
      <div class="review-card reveal">
        <div class="rv-top">
          <span class="rv-stars">${stars}</span>
          <span class="rv-date">${r.date}</span>
        </div>
        <p class="rv-text">"${escReview(r.text)}"</p>
        <div class="rv-author">— ${escReview(r.name)}</div>
      </div>`;
  }).join("");

  reObserveReveal();
}

function initStarInput() {
  const container = document.getElementById("starInput");
  if (!container) return;
  const btns = container.querySelectorAll(".star-btn");
  const hidden = document.getElementById("rvRating");

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = +btn.dataset.val;
      if (hidden) hidden.value = val;
      btns.forEach((b) => b.classList.toggle("active", +b.dataset.val <= val));
    });
  });
}

function submitReview() {
  const name   = (document.getElementById("rvName")?.value   || "").trim();
  const text   = (document.getElementById("rvText")?.value   || "").trim();
  const rating = parseInt(document.getElementById("rvRating")?.value || "0");

  if (!name)   { toast("⚠️", "Escribe tu nombre"); return; }
  if (!rating) { toast("⚠️", "Selecciona una calificación"); return; }
  if (!text)   { toast("⚠️", "Escribe tu reseña"); return; }

  const review = {
    id:       Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name, rating, text,
    date:     new Date().toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }),
    approved: false,
  };

  const reviews = getReviews();
  reviews.push(review);
  saveReviews(reviews);

  document.getElementById("rvName").value = "";
  document.getElementById("rvText").value = "";
  document.getElementById("rvRating").value = "0";
  document.querySelectorAll(".star-btn").forEach((b) => b.classList.remove("active"));

  const success = document.getElementById("reviewSuccess");
  if (success) { success.style.display = "block"; setTimeout(() => { success.style.display = "none"; }, 5000); }
}

function escReview(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── EVENTOS ────────────────────────────────────────────
function initEvents() {
  // Carrito
  document.querySelector(".cart-trigger").addEventListener("click", openCartPanel);
  document.getElementById("cartOverlay").addEventListener("click", closeCartPanel);
  document.getElementById("cartClose").addEventListener("click", closeCartPanel);
  document.getElementById("checkoutBtn").addEventListener("click", openCheckoutForm);

  // Wishlist + Tema
  document.getElementById("wishlistTrigger")?.addEventListener("click", openWishlistPanel);
  document.getElementById("wishlistOverlay")?.addEventListener("click", closeWishlistPanel);
  document.getElementById("wishlistClose")?.addEventListener("click", closeWishlistPanel);
  document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);

  // Hero — botones scroll
  document.querySelectorAll("[data-scroll]").forEach((btn) => {
    btn.addEventListener("click", () => scrollToSection(btn.dataset.scroll));
  });

  // Filtros de categoría
  document.getElementById("filterBar").addEventListener("click", (e) => {
    const btn = e.target.closest(".f-btn");
    if (btn) filterProducts(btn.dataset.filter);
  });

  // Tarjetas de categoría
  document.getElementById("catsGrid").addEventListener("click", (e) => {
    const card = e.target.closest(".cat-card");
    if (card) filterProducts(card.dataset.cat);
  });

  // Tarjetas de producto (delegación)
  document.getElementById("prodGrid").addEventListener("click", (e) => {
    // Corazón wishlist
    const wishBtn = e.target.closest(".wish-btn");
    if (wishBtn) {
      e.stopPropagation();
      const id = +wishBtn.dataset.wid;
      const added = Wishlist.toggle(id);
      wishBtn.textContent = added ? "♥" : "♡";
      wishBtn.classList.toggle("active", added);
      wishBtn.style.animation = "none";
      requestAnimationFrame(() => {
        wishBtn.style.animation = added ? "heartbeat 0.5s ease" : "";
      });
      updateWishlistBadge();
      toast(added ? "♥" : "🗑", added ? "Añadido a favoritos" : "Eliminado de favoritos");
      return;
    }

    // Botón +: si tiene sabores, abre modal; si no, agrega directo
    const addBtn = e.target.closest(".add-btn");
    if (addBtn) {
      e.stopPropagation();
      const id = +addBtn.dataset.id;
      const p  = PRODUCTS.find((x) => x.id === id);
      if (p && productHasFlavors(p)) {
        openModal(id);
      } else {
        addToCart(id);
      }
      return;
    }

    // Click en la tarjeta → abre modal
    const card = e.target.closest(".prod-card");
    if (card) openModal(+card.dataset.id);
  });

  // Carrito — controles cantidad y eliminar
  document.getElementById("cartBody").addEventListener("click", (e) => {
    const qtyBtn = e.target.closest(".qty-b");
    const rmBtn  = e.target.closest(".rm-btn");
    if (qtyBtn) { cartChangeQty(qtyBtn.dataset.key, +qtyBtn.dataset.delta); return; }
    if (rmBtn)  { cartRemove(rmBtn.dataset.key); }
  });

  // Wishlist panel — controles
  document.getElementById("wishlistBody")?.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".wi-add");
    const rmBtn  = e.target.closest(".wi-rm");
    if (addBtn) {
      const id = +addBtn.dataset.id;
      const p  = PRODUCTS.find((x) => x.id === id);
      if (p && productHasFlavors(p)) {
        closeWishlistPanel();
        openModal(id);
      } else {
        addToCart(id);
      }
      return;
    }
    if (rmBtn) {
      const id = +rmBtn.dataset.wid;
      Wishlist.remove(id);
      updateWishlistBadge();
      renderWishlistPanel();
      const heart = document.querySelector(`.wish-btn[data-wid="${id}"]`);
      if (heart) { heart.textContent = "♡"; heart.classList.remove("active"); }
    }
  });

  // Modal — cerrar al hacer clic en el fondo
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Modal — imagen: botón cerrar
  document.getElementById("mImg").addEventListener("click", (e) => {
    if (e.target.closest(".modal-close")) closeModal();
  });

  // Mobile bar
  document.getElementById("mbCartBtn")?.addEventListener("click", openCartPanel);
  document.getElementById("mbWishBtn")?.addEventListener("click", openWishlistPanel);

  // Ver más productos
  document.getElementById("loadMoreBtn")?.addEventListener("click", () => {
    productsVisible += 8;
    renderFilteredProducts();
  });

  // Modal — footer sticky: botón agregar
  document.getElementById("mStickyFooter")?.addEventListener("click", (e) => {
    if (e.target.closest(".modal-add-btn")) { modalAddToCart(); }
  });

  // Modal — contenido: sabores, cantidad, agregar, relacionados
  document.getElementById("mContent").addEventListener("click", (e) => {
    // Sabor seleccionado
    const flavorBtn = e.target.closest(".flavor-btn");
    if (flavorBtn) {
      document.querySelectorAll(".flavor-btn").forEach((b) => b.classList.remove("selected"));
      flavorBtn.classList.add("selected");
      selectedFlavor = flavorBtn.dataset.flavor;

      // Cambiar imagen si el producto tiene imagen por sabor
      const imgSrc = activeProduct?.flavorImages?.[selectedFlavor];
      if (imgSrc) {
        const img = document.querySelector(".prod-img-modal");
        if (img) {
          img.style.transition = "opacity 0.18s ease";
          img.style.opacity = "0";
          setTimeout(() => {
            img.src = imgSrc;
            img.style.opacity = "1";
          }, 180);
        }
      }

      // Habilitar botón de agregar
      const addBtn = document.getElementById("modalAddBtn");
      if (addBtn) {
        addBtn.disabled = false;
        addBtn.textContent = "🛒 Agregar al carrito";
      }
      return;
    }

    const mqBtn   = e.target.closest(".mq-btn");
    const addBtn  = e.target.closest(".modal-add-btn");
    const relCard = e.target.closest(".related-card");

    if (mqBtn)   { modalQtyChange(+mqBtn.dataset.delta); return; }
    if (addBtn)  { modalAddToCart(); return; }
    if (relCard) { closeModal(); setTimeout(() => openModal(+relCard.dataset.id), 120); }
  });

  // Checkout
  document.getElementById("cancelBtn").addEventListener("click", closeCheckoutForm);
  document.getElementById("submitBtn").addEventListener("click", submitCheckout);

  // Footer — links de filtro
  document.querySelector("footer").addEventListener("click", (e) => {
    const link = e.target.closest("[data-filter-link]");
    if (link) { e.preventDefault(); filterProducts(link.dataset.filterLink); }
  });
}

// ─── BÚSQUEDA ────────────────────────────────────────────
function initSearch() {
  const input = document.getElementById("searchInput");
  const clear = document.getElementById("searchClear");
  if (!input) return;

  input.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    productsVisible = 8;
    if (clear) clear.style.display = searchQuery ? "flex" : "none";
    renderFilteredProducts();
  });

  clear?.addEventListener("click", () => {
    input.value = "";
    searchQuery = "";
    clear.style.display = "none";
    renderFilteredProducts();
    input.focus();
  });
}

// ─── TEMA CLARO / OSCURO ─────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem("tiendamix_theme") || "dark";
  applyTheme(saved);
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}
function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem("tiendamix_theme", next);
}

// ─── PARALLAX ────────────────────────────────────────────
function initParallax() {
  const heroBg   = document.querySelector(".hero-bg");
  const heroGrid = document.querySelector(".hero-grid");
  if (!heroBg) return;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (y > window.innerHeight) return;
    if (heroBg)   heroBg.style.transform   = `translateY(${y * 0.25}px)`;
    if (heroGrid) heroGrid.style.transform = `translateY(${y * 0.12}px)`;
  }, { passive: true });
}

// ─── CONTADOR ANIMADO (hero stats) ───────────────────────
function initCounters() {
  const stats = document.querySelector(".hero-stats");
  if (!stats) return;
  const obs = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    obs.disconnect();
    document.querySelectorAll(".stat-n").forEach((el) => {
      const text  = el.textContent;
      const match = text.match(/(\d+)/);
      if (!match) return;
      const target = parseInt(match[1]);
      const prefix = text.slice(0, text.indexOf(match[1]));
      const suffix = text.slice(text.indexOf(match[1]) + match[1].length);
      let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 1400, 1);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = prefix + Math.round(eased * target) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });
  obs.observe(stats);
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
  if (stock === 0) return { cls: "s-out", label: "Agotado" };
  if (stock <= 5)  return { cls: "s-low", label: `Últimas ${stock}` };
  return                  { cls: "s-in",  label: "Disponible" };
}

function formatPrice(n) {
  return "$" + n.toLocaleString("es-MX");
}

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
  grid.innerHTML = CATEGORIES.map((c, i) => `
    <div class="cat-card c-${c.color}" data-cat="${c.id}" role="button" tabindex="0" style="transition-delay:${i * 0.08}s">
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
  productsVisible = 8;
  renderFilteredProducts();
}

function renderFilteredProducts() {
  let list = currentFilter === "todos" ? PRODUCTS : PRODUCTS.filter((p) => p.cat === currentFilter);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.flavors.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  const countEl = document.getElementById("searchCount");
  if (countEl) {
    countEl.textContent = searchQuery
      ? `${list.length} resultado${list.length !== 1 ? "s" : ""} para "${searchQuery}"`
      : "";
  }

  const grid = document.getElementById("prodGrid");
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = `<div class="no-results">😕 No hay resultados${searchQuery ? ` para "<strong>${searchQuery}</strong>"` : ""}</div>`;
    updateLoadMore(0, 0);
    return;
  }

  const visible = list.slice(0, productsVisible);
  grid.innerHTML = visible.map((p, i) => buildProductCard(p, i)).join("");
  reObserveReveal();
  updateLoadMore(visible.length, list.length);
}

function updateLoadMore(shown, total) {
  const wrap = document.getElementById("loadMoreWrap");
  const btn  = document.getElementById("loadMoreBtn");
  if (!wrap || !btn) return;
  const remaining = total - shown;
  if (remaining > 0) {
    wrap.style.display = "block";
    btn.textContent = `Ver más productos (${remaining} restantes)`;
  } else {
    wrap.style.display = "none";
  }
}

function buildProductCard(p, index = 0) {
  const s        = stockInfo(p.stock);
  const hasFlavors = productHasFlavors(p);
  // Truncar sabores o mostrar descripción corta
  const short    = p.flavors.length > 72 ? p.flavors.substring(0, 72) + "…" : p.flavors;
  const wished   = Wishlist.has(p.id);
  const delay    = Math.min(index * 0.07, 0.42);

  return `
  <article class="prod-card reveal" data-id="${p.id}" role="button" tabindex="0" aria-label="Ver ${p.name}" style="transition-delay:${delay}s">
    <div class="prod-img-wrap">
      ${productImageHTML(p, "card")}
      <div class="stock-pill ${s.cls}">
        <span class="sdot"></span><span>${s.label}</span>
      </div>
      ${hasFlavors ? `<div class="flavor-pill">${parseFlavors(p.flavors).length} sabores</div>` : ""}
      <button class="wish-btn ${wished ? "active" : ""}" data-wid="${p.id}" aria-label="${wished ? "Quitar de favoritos" : "Añadir a favoritos"}">${wished ? "♥" : "♡"}</button>
      <div class="quick-overlay"><button class="qbtn" tabindex="-1">${hasFlavors ? "Elegir sabor" : "Ver detalle"}</button></div>
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
          title="${p.stock === 0 ? "Sin stock" : hasFlavors ? "Elegir sabor" : "Agregar al carrito"}"
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
  if (el) { el.textContent = n; el.classList.toggle("show", n > 0); }
  const mb = document.getElementById("mbCartCount");
  if (mb) { mb.textContent = n; mb.classList.toggle("show", n > 0); }
}

// ─── WISHLIST — BADGE ────────────────────────────────────
function updateWishlistBadge() {
  const n  = Wishlist.getCount();
  const el = document.getElementById("wishlistCount");
  if (el) { el.textContent = n; el.classList.toggle("show", n > 0); }
  const mb = document.getElementById("mbWishCount");
  if (mb) { mb.textContent = n; mb.classList.toggle("show", n > 0); }
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
        <div class="ci-sub">
          ${categoryLabel(item.cat)}${item.selectedFlavor ? ` · <span class="ci-flavor">${item.selectedFlavor}</span>` : ""}
        </div>
        <div class="ci-price">${formatPrice(item.price * item.qty)}</div>
        <div class="ci-controls">
          <button class="qty-b" data-key="${item._key}" data-delta="-1">−</button>
          <span class="qty-v">${item.qty}</span>
          <button class="qty-b" data-key="${item._key}" data-delta="1">+</button>
          <button class="rm-btn" data-key="${item._key}">🗑</button>
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
function cartChangeQty(key, delta) { Cart.changeQty(key, delta); updateCartBadge(); renderCartPanel(); }
function cartRemove(key)            { Cart.remove(key);           updateCartBadge(); renderCartPanel(); }

// ─── WISHLIST — PANEL ────────────────────────────────────
function openWishlistPanel() {
  document.getElementById("wishlistOverlay")?.classList.add("open");
  document.getElementById("wishlistPanel")?.classList.add("open");
  renderWishlistPanel();
}
function closeWishlistPanel() {
  document.getElementById("wishlistOverlay")?.classList.remove("open");
  document.getElementById("wishlistPanel")?.classList.remove("open");
}
function renderWishlistPanel() {
  const body = document.getElementById("wishlistBody");
  if (!body) return;
  const items = Wishlist.getAll();

  if (!items.length) {
    body.innerHTML = `
      <div class="wishlist-empty">
        <div class="wishlist-empty-icon">♡</div>
        <p>Aún no tienes favoritos</p>
        <p class="hint">Toca el ♡ en cualquier producto</p>
      </div>`;
    return;
  }

  body.innerHTML = items.map((p) => {
    const hasFlavors = parseFlavors(p.flavors).length > 1;
    return `
    <div class="wishlist-item">
      <div class="wi-thumb">
        <img src="${p.image}" alt="${p.name}"
          style="width:100%;height:100%;object-fit:cover;border-radius:6px;"
          onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
        <span style="display:none;font-size:1.5rem;">${p.emoji}</span>
      </div>
      <div class="wi-info">
        <div class="wi-name">${p.name}</div>
        <div class="wi-price">${formatPrice(p.price)}</div>
      </div>
      <div class="wi-actions">
        <button class="wi-add" data-id="${p.id}" ${p.stock === 0 ? "disabled" : ""}>
          ${hasFlavors ? "🍓 Elegir" : "🛒 Añadir"}
        </button>
        <button class="wi-rm" data-wid="${p.id}">✕ Quitar</button>
      </div>
    </div>
  `}).join("");
}

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
  activeProduct  = p;
  modalQty       = 1;
  selectedFlavor = null;

  const flavors = parseFlavors(p.flavors);
  const hasFlavors = productHasFlavors(p);

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

  // Bloque de sabores: selector si hay múltiples, texto si no
  const flavorsBlock = hasFlavors
    ? `<div class="modal-flavors-section">
        <div class="flavors-label">
          Elige tu sabor
          <span class="flavor-req">* requerido</span>
        </div>
        <div class="flavor-grid" id="flavorGrid">
          ${flavors.map((f) => `<button class="flavor-btn" data-flavor="${f}">${f}</button>`).join("")}
        </div>
       </div>`
    : p.flavors
      ? `<div class="modal-flavors-section">
          <div class="flavors-label">Presentación</div>
          <p class="flavors-text">${p.flavors}</p>
         </div>`
      : "";

  // El botón de agregar empieza deshabilitado si requiere sabor
  const addBtnDisabled = p.stock === 0 || hasFlavors;
  const addBtnText = p.stock === 0
    ? "❌ Sin stock disponible"
    : hasFlavors
      ? "Elige un sabor primero"
      : "🛒 Agregar al carrito";

  document.getElementById("mContent").innerHTML = `
    <div class="modal-cat">${categoryLabel(p.cat)}</div>
    <h2 class="modal-name">${p.name}</h2>
    <p class="modal-desc">${p.desc}</p>
    <div class="modal-tags">${tags}</div>
    ${flavorsBlock}
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
    ${buildRelatedHTML(p)}`;

  document.getElementById("mStickyFooter").innerHTML = `
    <button class="modal-add-btn" id="modalAddBtn" ${addBtnDisabled ? "disabled" : ""}>
      ${addBtnText}
    </button>
    <div class="modal-trust-row">
      <span>🔒 Seguro</span><span>💬 WhatsApp</span><span>📍 Tienda física</span>
    </div>`;

  document.getElementById("modalOverlay")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function buildRelatedHTML(product) {
  const related = PRODUCTS.filter((p) => p.cat === product.cat && p.id !== product.id).slice(0, 5);
  if (!related.length) return "";
  return `
    <div class="related-section">
      <div class="related-title">También te puede gustar</div>
      <div class="related-grid">
        ${related.map((p) => `
          <div class="related-card" data-id="${p.id}" role="button" tabindex="0" aria-label="Ver ${p.name}">
            <div class="related-img">
              <img src="${p.image}" alt="${p.name}" loading="lazy"
                onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
              <span style="display:none;font-size:1.8rem;">${p.emoji}</span>
            </div>
            <div class="related-name">${p.name}</div>
            <div class="related-price">${formatPrice(p.price)}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function closeModal() {
  document.getElementById("modalOverlay")?.classList.remove("open");
  document.body.style.overflow = "";
  activeProduct  = null;
  selectedFlavor = null;
}

function modalQtyChange(delta) {
  if (!activeProduct) return;
  modalQty = Math.max(1, Math.min(activeProduct.stock, modalQty + delta));
  const el = document.getElementById("mqVal");
  if (el) el.textContent = modalQty;
}

function modalAddToCart() {
  if (!activeProduct) return;

  const flavors = parseFlavors(activeProduct.flavors);
  if (flavors.length > 1 && !selectedFlavor) {
    toast("⚠️", "Por favor elige un sabor primero");
    // Sacudir el grid de sabores para llamar la atención
    const grid = document.getElementById("flavorGrid");
    if (grid) {
      grid.style.animation = "none";
      requestAnimationFrame(() => { grid.style.animation = "shake 0.45s ease"; });
    }
    return;
  }

  const r = Cart.add(activeProduct.id, modalQty, selectedFlavor || null);
  if (r.ok) {
    updateCartBadge();
    toast("✅", r.msg);
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

// ─── HAMBURGER MENU ──────────────────────────────────────
function initHamburger() {
  const btn = document.getElementById("hamburger");
  const nav = document.getElementById("mobileNav");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    btn.classList.toggle("open", isOpen);
    btn.setAttribute("aria-expanded", isOpen);
    nav.setAttribute("aria-hidden", !isOpen);
  });

  // Cerrar al hacer clic en un enlace
  nav.querySelectorAll(".mnav-link").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      btn.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      nav.setAttribute("aria-hidden", "true");
    });
  });

  // Cerrar al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!btn.contains(e.target) && !nav.contains(e.target)) {
      nav.classList.remove("open");
      btn.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      nav.setAttribute("aria-hidden", "true");
    }
  });
}
