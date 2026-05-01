# 📘 GUÍA COMPLETA — TIENDA MIX
## De proyecto local a negocio real en internet

---

## 1. ARQUITECTURA DEL PROYECTO

```
tienda-mix/
├── index.html     ← Estructura HTML + conecta todo
├── styles.css     ← Todo el diseño visual (cyberpunk/neon)
├── products.js    ← SOLO datos (productos, categorías)
├── cart.js        ← SOLO lógica del carrito
└── app.js         ← SOLO lógica de interfaz (UI)
```

### ¿Qué va en cada archivo?

| Archivo | Responsabilidad | Modifica cuando... |
|---|---|---|
| `index.html` | Estructura HTML semántica | Cambias secciones, agregas páginas |
| `styles.css` | Todos los estilos visuales | Cambias colores, tamaños, animaciones |
| `products.js` | Array de productos y categorías | Agregas/editas/eliminas productos |
| `cart.js` | Lógica de carrito (agregar, quitar, calcular) | Cambias cómo funciona el carrito |
| `app.js` | Renderizado, modales, toasts, filtros | Cambias comportamientos de UI |

### Cómo se conectan (orden en index.html):
```html
<!-- Al final del <body>, en este orden exacto: -->
<script src="products.js"></script>  <!-- 1° Define PRODUCTS[] y CATEGORIES[] -->
<script src="cart.js"></script>       <!-- 2° Lee PRODUCTS[], define Cart{} -->
<script src="app.js"></script>        <!-- 3° Usa PRODUCTS[] y Cart{}, maneja la UI -->
```
**El orden es crítico.** Si cargas app.js antes que cart.js, habrá errores.

---

## 2. CÓMO AGREGAR UN PRODUCTO NUEVO

Solo edita `products.js`. Agrega al array PRODUCTS:

```javascript
{
  id: 29,                    // ID único (nunca repetir)
  name: "Nombre del producto",
  cat: "esencias",           // esencias | bases | bubbas | desechables | utensilios
  emoji: "🍋",               // Reemplazar con imagen después
  price: 150,                // Precio en MXN (número, sin $)
  badge: "new",              // "new" | "hot" | "sale" | null
  stock: 20,                 // Cantidad en inventario
  flavors: "Sabor 1 · Sabor 2",
  desc: "Descripción del producto.",
  tags: ["Tag1", "Tag2", "Tag3"],
},
```

---

## 3. SISTEMA DE COTIZACIÓN POR WHATSAPP

### Cómo funciona actualmente:
1. Usuario agrega productos al carrito
2. Hace clic en "Enviar cotización"
3. Llena nombre, dirección y notas (opcionales)
4. Se abre WhatsApp con este mensaje pre-formateado:

```
🛒 *COTIZACIÓN — TIENDA MIX*
━━━━━━━━━━━━━━━━━━━━
👤 *Cliente:* María García
📍 *Dirección:* Col. Centro, Tuxtla

*PRODUCTOS:*
• 2× Esencias Verona Frutal
  💰 $155 c/u = *$310*
• 1× Bubbas Neón
  💰 $240 c/u = *$240*
━━━━━━━━━━━━━━━━━━━━
📦 *TOTAL: $550 MXN*

⏰ Horario: Lun-Vie 10am-7pm | Sáb 10am-6pm
📝 *Notas:* ¿Tienen descuento por volumen?
```

### Para cambiar el número de WhatsApp:
En `cart.js`, línea con `wa.me/529612478986`, cambia el número.
Formato: `52` (código México) + 10 dígitos del celular.

---

## 4. PAGOS REALES — CUÁL USAR EN MÉXICO

### Comparativa rápida:

| Servicio | Comisión | Mejor para | Dificultad |
|---|---|---|---|
| **MercadoPago** | ~3.29% + IVA | México, rápido de integrar | ⭐ Fácil |
| **Clip** | ~3.6% | Pagos presenciales también | ⭐ Fácil |
| **Conekta** | ~2.9% + $3 MXN | Negocios medianos | ⭐⭐ Medio |
| **Stripe** | ~3.6% (MX) | Internacional, muy completo | ⭐⭐ Medio |
| **PayPal** | ~4.4% + fijo | Ya lo conoce el cliente | ⭐ Fácil |

### 🏆 RECOMENDACIÓN para Tienda Mix: MercadoPago
- Aceptan tarjetas, OXXO, transferencia SPEI
- El cliente mexicano ya lo conoce y confía
- Integración rápida con un botón de pago
- Depósitos en 1-2 días hábiles

### Pasos para integrar MercadoPago:
```
1. Crear cuenta en mercadopago.com.mx (es gratis)
2. Verificar identidad con INE y datos bancarios
3. Ir a: Tu cuenta → Desarrolladores → Credenciales
4. Copiar el "Access Token" de producción
5. Instalar backend (Node.js o usar Checkout Pro)
```

### Ejemplo básico con MercadoPago Checkout Pro:
```javascript
// En tu servidor (Node.js con Express):
const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({
  accessToken: 'TU_ACCESS_TOKEN_AQUI'
});

app.post('/crear-pago', async (req, res) => {
  const { items, customerName } = req.body;

  const preference = new Preference(client);
  const result = await preference.create({
    body: {
      items: items.map(item => ({
        title: item.name,
        unit_price: item.price,
        quantity: item.qty,
        currency_id: 'MXN'
      })),
      payer: { name: customerName },
      back_urls: {
        success: 'https://tudominio.com/gracias',
        failure: 'https://tudominio.com/error',
      },
      auto_return: 'approved',
    }
  });

  res.json({ init_point: result.init_point });
});
```

### ⚠️ IMPORTANTE:
Para procesar pagos reales necesitas un **backend** (servidor).
Una página HTML pura NO puede procesar pagos de forma segura
porque el Access Token quedaría expuesto al público.

**Opciones de backend:**
- Node.js + Express en Render.com (gratis)
- Firebase Functions (gratis hasta cierto límite)
- PHP en hosting compartido (GoDaddy, HostGator, SiteGround)

---

## 5. HOSTING Y PUBLICACIÓN — PASO A PASO

### OPCIÓN A: GitHub Pages (GRATIS, recomendada para empezar)

```bash
# 1. Instala Git: https://git-scm.com/
# 2. Crea cuenta en github.com
# 3. Crea repositorio nuevo (público, nombre: tienda-mix)

# 4. Desde tu carpeta del proyecto:
git init
git add .
git commit -m "primera versión"
git remote add origin https://github.com/TU_USUARIO/tienda-mix.git
git push -u origin main

# 5. En GitHub: Settings → Pages → Source: main → /root
# 6. Tu página estará en: https://tu-usuario.github.io/tienda-mix/
```
**Limitación:** No puedes tener backend (solo HTML/CSS/JS).

---

### OPCIÓN B: Netlify (GRATIS, recomendada ⭐)

```bash
# Método arrastra-y-suelta (sin código):
1. Ve a app.netlify.com y crea cuenta gratis
2. En el dashboard: "Add new site" → "Deploy manually"
3. Arrastra tu carpeta tienda-mix/ al área indicada
4. En segundos tienes URL como: tienda-mix-abc123.netlify.app
5. Puedes renombrar el subdominio gratis

# Con Git (actualización automática):
1. Conecta tu repositorio de GitHub
2. Cada vez que hagas git push, Netlify actualiza la página
```
**Ventaja:** Formularios, redirecciones y funciones serverless incluidas.

---

### OPCIÓN C: Vercel (GRATIS, mejor para proyectos con backend)

```bash
# Instala Vercel CLI:
npm install -g vercel

# Desde tu carpeta:
vercel

# Sigue las instrucciones. Tu URL: tienda-mix.vercel.app
```
**Ventaja:** Excelente para cuando agregues backend (Node.js/Next.js).

---

### Conectar dominio propio (.com o .mx):

```
1. Compra el dominio en:
   - Namecheap (~$10 USD/año para .com)
   - Hostinger (~$8 USD/año)
   - Godaddy (~$12 USD/año)

2. En tu hosting (ej. Netlify):
   Settings → Domain management → Add custom domain
   Escribe: tiendamix.com

3. En tu proveedor de dominio, apunta los DNS:
   Tipo A   → 75.2.60.5       (IP de Netlify)
   CNAME    → apex-loadbalancer.netlify.com

4. Espera 15-60 minutos para que propague.
5. Netlify agrega HTTPS gratis automáticamente.
```

---

## 6. RECOMENDACIONES PROFESIONALES

### ✅ HACER:
- **Guarda el carrito en localStorage** (ya está implementado en cart.js)
- **Usa imágenes WebP** para productos — son 30% más ligeras que JPG
- **Comprime imágenes** antes de subir: squoosh.app
- **Instala Google Analytics** gratis para ver cuánta gente visita tu tienda
- **Agrega WhatsApp widget** flotante para contacto inmediato
- **Responde en menos de 1 hora** en WhatsApp — aumenta conversión 60%
- **Actualiza el stock regularmente** en products.js

### ❌ ERRORES COMUNES:
- **Poner el Access Token de pagos en el HTML/JS** — es un riesgo de seguridad grave
- **No tener HTTPS** — los navegadores marcan la web como insegura
- **Fotos de mala calidad** — bajan la percepción de profesionalismo
- **Precios desactualizados** — genera desconfianza y cancelaciones
- **No tener política de devoluciones visible** — frena compras
- **No mobile-first** — el 80% del tráfico viene de celulares en México

### 📊 MÉTRICAS A SEGUIR:
1. Visitas por semana (Google Analytics)
2. % de personas que abren el carrito vs. que compran (tasa de conversión)
3. Productos más vistos
4. Horario de mayor tráfico

---

## 7. ROADMAP PARA HACERLO UN NEGOCIO REAL

```
FASE 1 — Ya está listo ✅
  - Catálogo con precios reales
  - Carrito funcional
  - Sistema de cotización WhatsApp
  - Diseño profesional móvil/desktop

FASE 2 — Próximos 30 días
  - Subir a Netlify con dominio propio
  - Agregar imágenes reales de productos
  - Instalar Google Analytics
  - Crear cuenta de Google My Business

FASE 3 — Próximos 90 días
  - Agregar pasarela de pago (MercadoPago)
  - Sistema de inventario básico (Airtable o Google Sheets)
  - Email de confirmación de pedidos
  - Reseñas de clientes

FASE 4 — Largo plazo
  - Backend propio (Node.js)
  - Base de datos de clientes
  - Programa de puntos / lealtad
  - App móvil (React Native)
```

---

## 8. ESTRUCTURA DE ARCHIVOS COMPLETA

```
tienda-mix/
├── index.html       ← Abre con doble clic para ver en el navegador
├── styles.css       ← Edita para cambiar colores y diseño
├── products.js      ← Edita para agregar/quitar productos
├── cart.js          ← No tocar a menos que quieras cambiar la lógica
├── app.js           ← Edita para cambiar comportamientos de UI
├── GUIA-COMPLETA.md ← Esta guía
└── assets/          ← (crear) Carpeta para imágenes
    ├── logo.png
    ├── productos/
    │   ├── esencias-verona.webp
    │   └── ...
    └── og-image.jpg ← Imagen para redes sociales
```

---

*Guía creada para Tienda Mix — Tuxtla Gutiérrez, Chiapas*
*Versión 2.0 — Marzo 2026*
