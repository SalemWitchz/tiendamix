// ============================================================
//  admin.js — Panel de administración Tienda Mix
//
//  CONTRASEÑA: cambia ADMIN_PASSWORD para mayor seguridad.
//  Todos los datos se guardan en localStorage del navegador.
// ============================================================

const ADMIN_PASSWORD = "TiendaMix2026";

const KEYS = {
  products: "tiendamix_admin_products",
  reviews:  "tiendamix_reviews",
  session:  "tiendamix_admin_session",
};

// ─── INIT ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem(KEYS.session) === "ok") {
    showDashboard();
  }

  document.getElementById("loginBtn").addEventListener("click", login);
  document.getElementById("adminPassword").addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("addProductBtn").addEventListener("click", () => openProductModal(null));
  document.getElementById("saveProduct").addEventListener("click", saveProduct);
  document.getElementById("closeModal").addEventListener("click", closeProductModal);
  document.getElementById("cancelModal").addEventListener("click", closeProductModal);

  document.querySelectorAll(".snav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
});

// ─── AUTH ────────────────────────────────────────────────
function login() {
  const pw = document.getElementById("adminPassword").value;
  if (pw === ADMIN_PASSWORD) {
    sessionStorage.setItem(KEYS.session, "ok");
    showDashboard();
  } else {
    const errEl = document.getElementById("loginError");
    const input = document.getElementById("adminPassword");
    errEl.style.display = "block";
    input.style.animation = "none";
    requestAnimationFrame(() => { input.style.animation = "shake 0.45s ease"; });
    input.value = "";
  }
}

function logout() {
  sessionStorage.removeItem(KEYS.session);
  location.reload();
}

function showDashboard() {
  document.getElementById("adminLogin").style.display = "none";
  document.getElementById("adminDashboard").style.display = "flex";
  initProducts();
  renderProducts();
  renderReviews();
}

// ─── PRODUCTOS ───────────────────────────────────────────
function initProducts() {
  const saved = getAdminProducts();
  const stockMap = {};
  saved.forEach((p) => { if (p.id != null) stockMap[p.id] = p.stock; });
  // Siempre re-sincroniza desde products.js para reflejar nuevas imágenes/precios,
  // pero conserva el stock que el admin haya modificado manualmente.
  const merged = PRODUCTS.map((p) => ({ ...p, stock: stockMap[p.id] ?? p.stock }));
  saveAdminProducts(merged);
}

function getAdminProducts() {
  try { return JSON.parse(localStorage.getItem(KEYS.products)) || []; }
  catch { return []; }
}

function saveAdminProducts(arr) {
  localStorage.setItem(KEYS.products, JSON.stringify(arr));
}

let _editingId = null;

function renderProducts() {
  const products = getAdminProducts();
  const el = document.getElementById("productsTable");

  if (!products.length) {
    el.innerHTML = `<p class="empty-state">No hay productos. Añade el primero.</p>`;
    return;
  }

  el.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Categoría</th>
          <th>Precio</th>
          <th>Stock</th>
          <th>Badge</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${products.map((p) => `
          <tr>
            <td>
              <div class="prod-cell">
                <span class="prod-emoji">${p.emoji || "📦"}</span>
                <span class="prod-name">${p.name}</span>
              </div>
            </td>
            <td><span class="cat-chip">${p.cat}</span></td>
            <td>$${p.price}</td>
            <td>
              <div class="stock-edit">
                <button class="stock-btn" onclick="changeStock(${p.id}, -1)">−</button>
                <span class="stock-val" id="sv-${p.id}">${p.stock}</span>
                <button class="stock-btn" onclick="changeStock(${p.id}, 1)">+</button>
                <input type="number" class="stock-input" value="${p.stock}"
                  onchange="setStock(${p.id}, this.value)" id="si-${p.id}" min="0" />
              </div>
            </td>
            <td>${p.badge ? `<span class="badge-chip badge-${p.badge}">${p.badge}</span>` : "—"}</td>
            <td class="action-cell">
              <button class="btn-edit" onclick="openProductModal(${p.id})">Editar</button>
              <button class="btn-delete" onclick="deleteProduct(${p.id})">Eliminar</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>`;
}

function changeStock(id, delta) {
  const products = getAdminProducts();
  const p = products.find((x) => x.id === id);
  if (!p) return;
  p.stock = Math.max(0, p.stock + delta);
  saveAdminProducts(products);
  const sv = document.getElementById(`sv-${id}`);
  const si = document.getElementById(`si-${id}`);
  if (sv) sv.textContent = p.stock;
  if (si) si.value = p.stock;
  showToast(`Stock "${p.name}": ${p.stock}`);
}

function setStock(id, val) {
  const products = getAdminProducts();
  const p = products.find((x) => x.id === id);
  if (!p) return;
  p.stock = Math.max(0, parseInt(val) || 0);
  saveAdminProducts(products);
  const sv = document.getElementById(`sv-${id}`);
  if (sv) sv.textContent = p.stock;
  showToast(`Stock actualizado: ${p.name}`);
}

function deleteProduct(id) {
  if (!confirm("¿Eliminar este producto permanentemente?")) return;
  saveAdminProducts(getAdminProducts().filter((p) => p.id !== id));
  renderProducts();
  showToast("Producto eliminado");
}

function openProductModal(id) {
  _editingId = id;
  document.getElementById("productModal").style.display = "flex";

  if (id !== null) {
    const p = getAdminProducts().find((x) => x.id === id);
    if (!p) return;
    document.getElementById("modalTitle").textContent = "Editar Producto";
    document.getElementById("pName").value    = p.name    || "";
    document.getElementById("pCat").value     = p.cat     || "esencias";
    document.getElementById("pPrice").value   = p.price   || "";
    document.getElementById("pStock").value   = p.stock   ?? 0;
    document.getElementById("pEmoji").value   = p.emoji   || "";
    document.getElementById("pBadge").value   = p.badge   || "";
    document.getElementById("pImage").value   = p.image   || "";
    document.getElementById("pFlavors").value = p.flavors || "";
    document.getElementById("pDesc").value    = p.desc    || "";
    document.getElementById("pTags").value    = (p.tags || []).join(", ");
  } else {
    document.getElementById("modalTitle").textContent = "Nuevo Producto";
    ["pName","pPrice","pEmoji","pImage","pFlavors","pDesc","pTags"].forEach((id) => {
      document.getElementById(id).value = "";
    });
    document.getElementById("pCat").value   = "esencias";
    document.getElementById("pBadge").value = "";
    document.getElementById("pStock").value = 0;
  }
}

function closeProductModal() {
  document.getElementById("productModal").style.display = "none";
  _editingId = null;
}

function saveProduct() {
  const name  = document.getElementById("pName").value.trim();
  const price = parseInt(document.getElementById("pPrice").value);
  const stock = parseInt(document.getElementById("pStock").value) || 0;

  if (!name || !price) { showToast("Nombre y precio son requeridos", "error"); return; }

  const data = {
    name, price, stock,
    cat:     document.getElementById("pCat").value,
    emoji:   document.getElementById("pEmoji").value.trim()   || "📦",
    badge:   document.getElementById("pBadge").value          || null,
    image:   document.getElementById("pImage").value.trim()   || null,
    flavors: document.getElementById("pFlavors").value.trim() || "",
    desc:    document.getElementById("pDesc").value.trim()    || "",
    tags:    document.getElementById("pTags").value.split(",").map((t) => t.trim()).filter(Boolean),
    flavorImages: {},
  };

  const products = getAdminProducts();
  if (_editingId !== null) {
    const idx = products.findIndex((p) => p.id === _editingId);
    if (idx !== -1) products[idx] = { ...products[idx], ...data };
  } else {
    data.id = (products.reduce((m, p) => Math.max(m, p.id || 0), 0)) + 1;
    products.push(data);
  }

  saveAdminProducts(products);
  closeProductModal();
  renderProducts();
  showToast(_editingId !== null ? "Producto actualizado" : "Producto añadido ✓");
}

// ─── RESEÑAS ─────────────────────────────────────────────
function getReviews() {
  try { return JSON.parse(localStorage.getItem(KEYS.reviews)) || []; }
  catch { return []; }
}

function saveReviews(arr) {
  localStorage.setItem(KEYS.reviews, JSON.stringify(arr));
}

function renderReviews() {
  const reviews  = getReviews();
  const pending  = reviews.filter((r) => !r.approved);
  const approved = reviews.filter((r) =>  r.approved);

  document.getElementById("pendingReviews").innerHTML = pending.length
    ? pending.map((r) => reviewCardHTML(r, true)).join("")
    : `<p class="empty-state">No hay reseñas pendientes</p>`;

  document.getElementById("approvedReviews").innerHTML = approved.length
    ? approved.map((r) => reviewCardHTML(r, false)).join("")
    : `<p class="empty-state">No hay reseñas aprobadas aún</p>`;
}

function reviewCardHTML(r, showApprove) {
  const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
  return `
    <div class="review-card-admin">
      <div class="rv-header">
        <span class="rv-name">${escHtml(r.name)}</span>
        <span class="rv-stars">${stars}</span>
        <span class="rv-date">${r.date}</span>
      </div>
      <p class="rv-text">${escHtml(r.text)}</p>
      <div class="rv-actions">
        ${showApprove
          ? `<button class="btn-approve" onclick="approveReview('${r.id}')">✓ Aprobar</button>`
          : ""}
        <button class="btn-delete" onclick="removeReview('${r.id}')">✕ Eliminar</button>
      </div>
    </div>`;
}

function approveReview(id) {
  const reviews = getReviews();
  const r = reviews.find((x) => x.id === id);
  if (r) { r.approved = true; saveReviews(reviews); renderReviews(); showToast("Reseña aprobada ✓"); }
}

function removeReview(id) {
  if (!confirm("¿Eliminar esta reseña?")) return;
  saveReviews(getReviews().filter((r) => r.id !== id));
  renderReviews();
  showToast("Reseña eliminada");
}

// ─── UI ──────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll(".snav-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
  document.querySelector(`[data-tab="${tab}"]`).classList.add("active");
  const map = { productos: "tabProductos", resenas: "tabResenas" };
  document.getElementById(map[tab])?.classList.add("active");
}

function showToast(msg, type = "ok") {
  const el = document.getElementById("adminToast");
  el.textContent = msg;
  el.className = `admin-toast${type === "error" ? " error" : ""}`;
  el.style.display = "block";
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = "none"; }, 2800);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
