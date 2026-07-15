# ZappoStore

POS + control de producción para taller textil (remeras, gorras, estampado/bordado).
Bimoneda USD/Bs, inspirado en **Fina** (Venezuela), evolucionando hacia un ERP/Kanban de producción con layout fijo para tablet/desktop.

## Correr
```bash
npm install
npm run dev
```
Abrí http://localhost:5173

## Login demo
- **Supervisor (master):** usuario `master` / clave `master`
- **Vendedor:** cualquier cédula + clave (o `V-1` / `1234`)

## Qué incluye (v0.9)
- Login de vendedor y **login master aparte** con roles y permisos.
- **Layout fijo**: menú lateral es una columna siempre visible (no drawer/hamburguesa), pensado para tablet/desktop en el taller (con módulos "Próximamente": Inventario, Cuentas por cobrar, Gastos).
- **Vender**: carrito con producto simplificado (**Talla + Cantidad + Color libre**, sin formato talle/peso/cantidad ni paleta de colores fija), **zonas de diseño** por pestañas Frente/Espalda/Mangas (visión de espejo, círculos numerados sobre el dibujo + lista para tocar, "Esp. Completa" calculada) con **multi-foto y notas independientes por pestaña** (indicador "Espalda (2 📸)"), 3 desplegables **Operación** (venta directa/presupuesto) / **Taller** (espera, corte, confección, planchado) / **Diseño** (DTF, sublimación, bordado, vinil), estado por producto, cliente con Cédula/RIF y Dirección además de nombre/teléfono, tasa dinámica.
- **Pago mixto por pedido**: ya no hay pago por ítem ni switch junto/fraccionado — se agregan N abonos con métodos distintos (Efectivo $/Bs, Tarjeta, Pago Móvil) hasta cubrir el total, con "Restante por pagar" en tiempo real (USD y Bs) y "Pagado completo" en verde. Cada abono queda vinculado a su evento en el ledger de Caja; si se corrige un pago ya guardado, se genera una reversión automática para que Caja nunca conserve dinero fantasma (auditado con un script de simulación de 8 escenarios de pago sin ninguna fuga).
- **Presupuesto**: si un producto es "presupuesto", el botón de cierre se vuelve **"Imprimir Presupuesto"** — imprime la comanda pero no guarda la venta ni afecta Caja (con guard defensivo también del lado de `saveSale`).
- **Comanda** como hoja de ruta real: checklist de procesos de Taller/Diseño (Check verde si está completado, reloj gris si sigue pendiente), bloque de cliente destacado (nombre, cédula/RIF, teléfono, dirección o "Cliente Ocasional"), bloque de pago detallado (total en USD/Bs, detalle de cada abono, total pagado, "Pagado Completo" en verde o "SALDO PENDIENTE" en rojo con el monto exacto), pestaña **Historial de cambios** (audit log), e **impresión en formato ticket térmico de 58mm** (fuentes achicadas, fotos escaladas, botones ocultos al imprimir) manteniendo el diseño normal en pantalla.
- **Seguimiento** por venta (en curso / en espera de retiro / cerrada) con **Kanban de producción**: cada producto muestra sus procesos de Taller y Diseño como chips clicables (pendiente ↔ completado, auditado); la venta solo cierra si **todos** los productos están cerrados.
- **Clientes** auto-registrados + ficha con total gastado y mini-gráfico.
- **Vendedores** (solo master): alta/edición/activar + ficha con mini-gráfico.
- **Edición** de pedidos en cualquier estado, con trazabilidad.
- **Caja**: cada vendedor abre/cierra su turno con fondo inicial en efectivo. El sistema deriva automáticamente —de un ledger de pagos por evento, no de un total que se pisa— cuánto vendió, cuánto cobró por método, cuánto es dinero asegurado (ventas ya cerradas), cuánto son señas (cobros parciales sobre pedidos aún no entregados) y cuánto queda comprometido por cobrar del turno. Al cerrar, compara efectivo esperado vs. contado y muestra sobrante/faltante. El master tiene vista de supervisión global: todos los turnos abiertos ahora + historial de todos los vendedores (día/semana/mes) con detalle de cada cuadre.
- **Resumen Financiero** (solo master): 3 KPIs —Ingresos Totales histórico, Cuentas por Cobrar y Ticket Promedio— más una lista de qué cliente debe qué folio y cuánto.
- **Reportes / Estadísticas** (solo master): gráfico de ingresos de los últimos 6 meses, ranking Top 5 Mejores Clientes y Top 5 Mejores Vendedores por volumen en USD (clicable hacia su ficha).

## Estado actual (15 jul 2026)
Todo el flujo operativo de ventas anda de punta a punta: tomar pedido → producir/entregar (con checklist real de procesos en la comanda) → cobrar (pago mixto por múltiples métodos) → cerrar turno → auditar → ver resumen financiero y reportes, con lógica de Presupuesto separada de Venta y un Kanban de producción real en Seguimiento. La lógica de pagos fue auditada específicamente contra fugas de dinero (fraccionado, pago único, corrección de errores) y verificada con un script de simulación. La comanda ya imprime en formato ticket térmico de 58mm. **`schema.sql` está alineado al modelo actual (v0.4)** — es el próximo paso natural conectar Supabase de verdad. Corre 100% en memoria (sin backend real todavía), pensado para hacer la demo con el cliente y validar el flujo antes de conectar Supabase.

**Hecho:** login + roles, layout con sidebar fijo, Vender (producto simplificado + zonas de diseño multi-foto por pestaña + Operación/Taller/Diseño + cliente con cédula/dirección + pago mixto por pedido + Presupuesto), Comanda como hoja de ruta con checklist e impresión térmica 58mm, Seguimiento con Kanban de producción, Clientes, Vendedores, Caja (turnos + ledger de pagos con reversión ante correcciones + cuadre), Resumen Financiero y Reportes/Estadísticas (solo master), `schema.sql` alineado (v0.4).
**Sigue (próximo):** Inventario/Stock, luego Gastos/Estadísticas adicionales, correr `schema.sql` contra un Postgres/Supabase real (se validó manualmente pero no se ejecutó todavía, sin `psql`/Docker en este entorno), y conectar Supabase real (auth, Storage, RLS).

Detalle completo de decisiones, modelo de datos y pendientes abiertos: ver `CONTEXTO.md`.

## Backend
`schema.sql` (v0.4) ya está **alineado al modelo actual de `App.jsx`**: producto sin `formato`/`peso` (talla+cantidad+color), `operacion_tipo` + `procesos_taller`/`procesos_diseno` (con sus `_done`) en vez del viejo `destino_tipo`, diseño por zona normalizado (`pedido_item_diseno` + `pedido_item_fotos`, con `storage_path` para Supabase Storage), pago mixto por pedido en `pagos` (con `order_payment_id` + `is_reversal` para soportar la reversión sin dejar dinero fantasma), y una vista `v_pedido_saldo` que deriva cobrado/balance igual que en memoria. Se validó manualmente (sintaxis, balance de paréntesis, orden de dependencias) pero **todavía no se corrió contra un Postgres real** — este entorno no tiene `psql` ni Docker disponibles. Ver `src/lib/supabase.js` para el punto de integración. Hoy la app corre en memoria — nada persiste al refrescar.

## Handoff
`CONTEXTO.md` resume decisiones, estado y pendientes para retomar en cualquier momento.
