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

## Qué incluye (v2.0)
- **Backend real de punta a punta**: login, vendedores, clientes, cajas, pedidos y pagos corren contra Supabase (Postgres + Auth) — nada del flujo operativo diario se pierde al refrescar la página. Solo las fotos de diseño siguen sin persistir (Storage, próximo paso).
- **Login real con Supabase Auth**, roles (`master`/`vendedor`) y sesión persistente. Login de master en pantalla aparte.
- **Manager de apertura**: el master crea vendedores reales (nombre + cédula + clave) desde la pantalla "Vendedores", vía una Edge Function que corre en el servidor de Supabase — la app nunca maneja la Service Role Key.
- **Layout fijo**: menú lateral es una columna siempre visible (no drawer/hamburguesa), pensado para tablet/desktop en el taller (con módulos "Próximamente": Inventario, Cuentas por cobrar, Gastos).
- **Vender**: carrito con producto simplificado (**Talla + Cantidad + Color libre**), **zonas de diseño** por pestañas Frente/Espalda/Mangas (visión de espejo, notas por pestaña persistidas — las fotos todavía no), 3 desplegables **Operación** (venta directa/presupuesto) / **Taller** / **Diseño**, estado por producto, cliente con Cédula/RIF y Dirección, tasa dinámica — todo guardado en Supabase, con folio autogenerado por una secuencia real de Postgres (ya no un contador del navegador, que colisionaba con más de un vendedor).
- **Pago mixto por pedido**: se agregan N abonos con métodos distintos hasta cubrir el total, con "Restante por pagar" en tiempo real y "Pagado completo" en verde. Cada abono queda en el ledger real (`pagos`); si se corrige uno ya guardado, se genera una reversión automática para que Caja nunca conserve dinero fantasma — verificado con un script end-to-end que crea una venta, la edita corrigiendo un pago mal cargado, y confirma que el neto sigue exacto.
- **Presupuesto**: si un producto es "presupuesto", el botón de cierre se vuelve **"Imprimir Presupuesto"** — imprime la comanda pero no guarda la venta ni afecta Caja.
- **Comanda** como hoja de ruta real: checklist de procesos de Taller/Diseño, bloque de cliente destacado, bloque de pago detallado, pestaña **Historial de cambios** (audit log real), e **impresión en formato ticket térmico de 58mm**.
- **Seguimiento** por venta con **Kanban de producción**: chips de proceso clicables (pendiente ↔ completado, auditado); la venta solo cierra si **todos** los productos están cerrados.
- **Clientes** con perfil real en Supabase (auto-registro por teléfono) + ficha con total gastado y mini-gráfico.
- **Vendedores** (solo master): alta real (cuenta de Auth + perfil) / activar-desactivar / ficha con mini-gráfico.
- **Edición** de pedidos en cualquier estado, con trazabilidad real.
- **Caja**: abrir/cerrar turno persistido en Supabase; el cuadre (efectivo esperado vs. contado) ya lee el ledger real de pagos, no memoria. Master con vista de supervisión global.
- **Resumen Financiero** y **Reportes / Estadísticas** (solo master): ya leen datos reales de Supabase.

## Estado actual (17 jul 2026)
**Migración del núcleo completa.** Login, vendedores (con manager de apertura), clientes, cajas, y pedidos+pagos (Vender/Seguimiento/edición) corren 100% contra Supabase real, con RLS verificada tabla por tabla. La lógica de pagos con reversión (la parte más delicada de todo el proyecto) fue re-verificada end-to-end contra la base real después de la migración, con el mismo escenario crítico que se auditó en memoria (corregir un pago mal cargado sin dejar dinero fantasma). Durante la migración se encontró y corrigió un bug real (un id generado client-side que no era un UUID válido, hubiera roto el guardado de pagos en producción) — lo atrapó el test automatizado, no una revisión visual.

**Hecho:** todo lo de arriba, más `schema.sql` alineado (v0.6) y corrido contra el proyecto real.
**Sigue (próximo):** Storage real para las fotos de diseño (hoy solo persisten las notas), Inventario/Stock, Gastos/Estadísticas, filtrar Resumen/Reportes por fecha en vez de histórico global.

Detalle completo de decisiones, modelo de datos y pendientes abiertos: ver `CONTEXTO.md`.

## Backend
`schema.sql` (v0.6) está **alineado al modelo actual de `App.jsx` y ya corrió contra el proyecto real de Supabase**: producto sin `formato`/`peso` (talla+cantidad+color), `operacion_tipo` + `procesos_taller`/`procesos_diseno` (con sus `_done`) en vez del viejo `destino_tipo`, diseño por zona normalizado (`pedido_item_diseno` para notas, `pedido_item_fotos` lista para cuando se conecte Storage), pago mixto por pedido en `pagos` (con `order_payment_id` + `is_reversal`, tabla append-only — solo tiene políticas de select/insert, nunca update/delete), folio autogenerado por trigger (`pedidos_folio_seq`), `vendedores.auth_user_id` vinculado a Supabase Auth. RLS activa y verificada en las 8 tablas que usa la app hoy: `vendedores`/`clientes` por rol activo, `cajas`/`pedidos`/`pagos` por dueño-o-master, `pedido_items`/`pedido_item_diseno` heredan el permiso de su pedido padre. `src/lib/supabase.js` tiene el cliente real (Singleton). La Edge Function `supabase/functions/create-vendor` resuelve el alta de vendedores sin exponer la Service Role Key en el navegador. Lo único que falta conectar es Supabase Storage para las fotos de diseño.

## Handoff
`CONTEXTO.md` resume decisiones, estado y pendientes para retomar en cualquier momento.
