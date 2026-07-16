# ZappoStore

POS + control de producción para taller textil (remeras, gorras, estampado/bordado).
Bimoneda USD/Bs, inspirado en **Fina** (Venezuela), evolucionando hacia un ERP/Kanban de producción con layout fijo para tablet/desktop.

## Correr
```bash
npm install
cp .env.example .env   # completar con las credenciales de tu proyecto Supabase (Settings -> API)
npm run dev
```
Abrí http://localhost:5173

## Login
Login **real** con Supabase Auth (ya no hay credenciales demo hardcodeadas). Hay 2 cuentas sembradas — cédulas `1234567` (master) y `95414372` (vendedor); las claves las tiene el dueño del proyecto (no se documentan acá por seguridad). Nuevos vendedores se dan de alta desde la pantalla "Vendedores" (solo master).

## Qué incluye (v1.0)
- **Login real con Supabase Auth**, roles (`master`/`vendedor`) y sesión persistente (sobrevive a refrescar la página). Login de master en pantalla aparte.
- **Manager de apertura**: el master crea vendedores reales (nombre + cédula + clave) desde la pantalla "Vendedores", vía una Edge Function que corre en el servidor de Supabase — la app nunca maneja la Service Role Key.
- **Layout fijo**: menú lateral es una columna siempre visible (no drawer/hamburguesa), pensado para tablet/desktop en el taller (con módulos "Próximamente": Inventario, Cuentas por cobrar, Gastos).
- **Vender**: carrito con producto simplificado (**Talla + Cantidad + Color libre**, sin formato talle/peso/cantidad ni paleta de colores fija), **zonas de diseño** por pestañas Frente/Espalda/Mangas (visión de espejo, círculos numerados sobre el dibujo + lista para tocar, "Esp. Completa" calculada) con **multi-foto y notas independientes por pestaña** (indicador "Espalda (2 📸)"), 3 desplegables **Operación** (venta directa/presupuesto) / **Taller** (espera, corte, confección, planchado) / **Diseño** (DTF, sublimación, bordado, vinil), estado por producto, cliente con Cédula/RIF y Dirección además de nombre/teléfono, tasa dinámica.
- **Pago mixto por pedido**: ya no hay pago por ítem ni switch junto/fraccionado — se agregan N abonos con métodos distintos (Efectivo $/Bs, Tarjeta, Pago Móvil) hasta cubrir el total, con "Restante por pagar" en tiempo real (USD y Bs) y "Pagado completo" en verde. Cada abono queda vinculado a su evento en el ledger de Caja; si se corrige un pago ya guardado, se genera una reversión automática para que Caja nunca conserve dinero fantasma (auditado con un script de simulación de 8 escenarios de pago sin ninguna fuga).
- **Presupuesto**: si un producto es "presupuesto", el botón de cierre se vuelve **"Imprimir Presupuesto"** — imprime la comanda pero no guarda la venta ni afecta Caja (con guard defensivo también del lado de `saveSale`).
- **Comanda** como hoja de ruta real: checklist de procesos de Taller/Diseño (Check verde si está completado, reloj gris si sigue pendiente), bloque de cliente destacado (nombre, cédula/RIF, teléfono, dirección o "Cliente Ocasional"), bloque de pago detallado (total en USD/Bs, detalle de cada abono, total pagado, "Pagado Completo" en verde o "SALDO PENDIENTE" en rojo con el monto exacto), pestaña **Historial de cambios** (audit log), e **impresión en formato ticket térmico de 58mm** (fuentes achicadas, fotos escaladas, botones ocultos al imprimir) manteniendo el diseño normal en pantalla.
- **Seguimiento** por venta (en curso / en espera de retiro / cerrada) con **Kanban de producción**: cada producto muestra sus procesos de Taller y Diseño como chips clicables (pendiente ↔ completado, auditado); la venta solo cierra si **todos** los productos están cerrados.
- **Clientes** auto-registrados + ficha con total gastado y mini-gráfico.
- **Vendedores** (solo master): alta real (cuenta de Auth + perfil) / activar-desactivar / ficha con mini-gráfico.
- **Edición** de pedidos en cualquier estado, con trazabilidad.
- **Caja**: cada vendedor abre/cierra su turno con fondo inicial en efectivo. El sistema deriva automáticamente —de un ledger de pagos por evento, no de un total que se pisa— cuánto vendió, cuánto cobró por método, cuánto es dinero asegurado (ventas ya cerradas), cuánto son señas (cobros parciales sobre pedidos aún no entregados) y cuánto queda comprometido por cobrar del turno. Al cerrar, compara efectivo esperado vs. contado y muestra sobrante/faltante. El master tiene vista de supervisión global: todos los turnos abiertos ahora + historial de todos los vendedores (día/semana/mes) con detalle de cada cuadre.
- **Resumen Financiero** (solo master): 3 KPIs —Ingresos Totales histórico, Cuentas por Cobrar y Ticket Promedio— más una lista de qué cliente debe qué folio y cuánto.
- **Reportes / Estadísticas** (solo master): gráfico de ingresos de los últimos 6 meses, ranking Top 5 Mejores Clientes y Top 5 Mejores Vendedores por volumen en USD (clicable hacia su ficha).

## Estado actual (16 jul 2026)
**Primera conexión real a Supabase:** login/roles y el alta de vendedores ya son reales (Supabase Auth + Postgres), con una política RLS base que bloquea el acceso anónimo a toda la base. El resto del flujo — Vender → producir/entregar (checklist real de procesos en la comanda) → cobrar (pago mixto por múltiples métodos) → cerrar turno → auditar → ver resumen financiero y reportes — sigue corriendo 100% en memoria (se pierde al refrescar), y es la próxima etapa a migrar. La lógica de pagos ya fue auditada contra fugas de dinero (fraccionado, pago único, corrección de errores) con un script de simulación, y la comanda imprime en formato ticket térmico de 58mm.

**Hecho:** login real (Supabase Auth, sesión persistente) + manager de apertura de vendedores (Edge Function `create-vendor`), layout con sidebar fijo, Vender (producto simplificado + zonas de diseño multi-foto por pestaña + Operación/Taller/Diseño + cliente con cédula/dirección + pago mixto por pedido + Presupuesto — en memoria), Comanda como hoja de ruta con checklist e impresión térmica 58mm, Seguimiento con Kanban de producción (en memoria), Clientes (en memoria), Caja (en memoria), Resumen Financiero y Reportes/Estadísticas (en memoria), `schema.sql` alineado y ya corrido contra el proyecto real (v0.5).
**Sigue (próximo):** terminar el deploy de la Edge Function (`npx supabase login && npx supabase link --project-ref aqtaphhhomlbafelekiz && npx supabase functions deploy create-vendor`), migrar Vender/Seguimiento/Caja/Clientes/pagos de memoria a Supabase, RLS granular por rol para esas tablas, Storage para las fotos de diseño, Inventario/Stock, Gastos/Estadísticas.

Detalle completo de decisiones, modelo de datos y pendientes abiertos: ver `CONTEXTO.md`.

## Backend
`schema.sql` (v0.5) está **alineado al modelo actual de `App.jsx` y ya corrió contra el proyecto real de Supabase**: producto sin `formato`/`peso` (talla+cantidad+color), `operacion_tipo` + `procesos_taller`/`procesos_diseno` (con sus `_done`) en vez del viejo `destino_tipo`, diseño por zona normalizado (`pedido_item_diseno` + `pedido_item_fotos`, con `storage_path` para Supabase Storage), pago mixto por pedido en `pagos` (con `order_payment_id` + `is_reversal` para soportar la reversión sin dejar dinero fantasma), `vendedores.auth_user_id` vinculado a Supabase Auth, y una vista `v_pedido_saldo` que deriva cobrado/balance igual que en memoria. Hay una política **RLS base** activa (bloquea el acceso anónimo a todo; `vendedores` tiene políticas reales de lectura/escritura por rol). `src/lib/supabase.js` tiene el cliente real (Singleton). La Edge Function `supabase/functions/create-vendor` resuelve el alta de vendedores sin exponer la Service Role Key en el navegador. Login y Vendedores ya usan Supabase de verdad; **Vender/Seguimiento/Caja/Clientes siguen en memoria** — se pierden al refrescar, es la próxima etapa.

## Handoff
`CONTEXTO.md` resume decisiones, estado y pendientes para retomar en cualquier momento.
