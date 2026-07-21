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

## Qué incluye (v2.4)
- **Backend 100% real**: login, vendedores, clientes, cajas, pedidos, pagos, fotos de diseño y **tasa de cambio** corren contra Supabase (Postgres + Auth + Storage) — nada del flujo operativo diario se pierde al refrescar la página, y nada queda por-navegador tampoco.
- **Login real con Supabase Auth**, roles (`master`/`vendedor`) y sesión persistente. Login de master en pantalla aparte.
- **Manager de apertura y edición de vendedores**: el master crea vendedores reales (nombre + cédula + clave) y también los **edita** (nombre/cédula/clave) desde la pantalla "Vendedores", vía Edge Functions que corren en el servidor de Supabase — la app nunca maneja la Service Role Key. Desactivar es borrado lógico (no físico, por integridad referencial con pedidos/cajas/pagos).
- **Layout fijo**: menú lateral es una columna siempre visible (no drawer/hamburguesa), pensado para tablet/desktop en el taller (con módulos "Próximamente": Inventario, Cuentas por cobrar, Gastos).
- **Dashboard de Home por rol**: master ve ventas del día, turnos abiertos, cuentas por pagar a vendedores (comisiones) y estadísticas de delivery; vendedor ve lo vendido en su turno y su comisión acumulada. Toda la navegación operativa vive en el Sidebar.
- **Vender**: bloqueado para el rol vendedor si no tiene su turno de caja abierto (el master queda exento, no opera caja propia). Cerrar una venta real exige nombre + teléfono del cliente (Presupuesto no). Carrito con producto simplificado (**Talla + Cantidad + Color libre**), **zonas de diseño** por pestañas Frente/Espalda/Mangas (visión de espejo, notas y **fotos** persistidas en Supabase Storage, bucket privado con URLs firmadas), 3 desplegables **Operación** (venta directa/presupuesto) / **Taller** / **Diseño**, estado por producto (no se puede marcar "Cerrado" con procesos de Taller/Diseño pendientes), cliente con Cédula/RIF y Dirección, **tasa de cambio compartida** entre todos los vendedores con formato venezolano (punto de miles, coma decimal) — todo guardado en Supabase, con folio autogenerado por una secuencia real de Postgres. Aviso explícito si el carrito mezcla Venta y Presupuesto.
- **Delivery y comisión por pedido**: switch de Delivery (Sí/No + monto) que se suma al total que paga el cliente y aparece en la comanda; % de comisión del vendedor (interno, nunca en la comanda) calculado solo sobre el total de productos, sin el delivery.
- **Pago mixto por pedido**: se agregan N abonos con métodos distintos hasta cubrir el total, con "Restante por pagar" en tiempo real y "Pagado completo" en verde. Cada abono queda en el ledger real (`pagos`); si se corrige uno ya guardado, se genera una reversión automática para que Caja nunca conserve dinero fantasma.
- **Presupuesto**: si un producto es "presupuesto", el botón de cierre se vuelve **"Imprimir Presupuesto"** — imprime la comanda pero no guarda la venta ni afecta Caja.
- **Comanda** como hoja de ruta real: checklist de procesos de Taller/Diseño, bloque de cliente destacado, línea de Delivery, bloque de pago detallado, pestaña **Historial de cambios** (audit log real), e **impresión en formato ticket térmico de 58mm**.
- **Seguimiento** por venta con **Kanban de producción**: chips de proceso clicables (pendiente ↔ completado, auditado); la venta solo cierra si **todos** los productos están cerrados.
- **Clientes** con perfil real en Supabase (auto-registro por teléfono) + ficha con total gastado y mini-gráfico.
- **Vendedores** (solo master): alta real (cuenta de Auth + perfil) / editar / activar-desactivar / ficha con mini-gráfico.
- **Edición** de pedidos en cualquier estado, con trazabilidad real.
- **Caja**: abrir/cerrar turno persistido en Supabase; antes de cerrar se muestra un **modal de resumen** (horario, total facturado, desglose por método, cuadre esperado vs. contado) y recién al confirmar se persiste el cierre. Master con vista de supervisión global.
- **Resumen Financiero** y **Reportes / Estadísticas** (solo master): ya leen datos reales de Supabase.

## Estado actual (21 jul 2026)
**Migración a Supabase 100% completa**, más dos tandas de fixes/features de producto en el mismo día: (v2.3) formato venezolano de la tasa de cambio, bloqueo de venta sin caja abierta + modal de resumen al cerrar turno, edición de vendedores (Edge Function `update-vendor`), delivery + comisión por pedido, y un dashboard de Home por rol; (v2.4) cliente obligatorio para cerrar una venta real, bloqueo de "Cerrado" con procesos pendientes, aviso de carrito mixto Venta/Presupuesto, y un fix de un bug real (borrar la tasa de cambio rompía los totales a $0 sin avisar). Todo verificado end-to-end en navegador real contra Supabase (incluida la limpieza de los datos de prueba generados).

**Hecho:** todo lo de arriba, más `schema.sql` alineado (v0.9) y corrido contra el proyecto real.
**Sigue (próximo, de producto):** Inventario/Stock, Gastos/Estadísticas, filtrar Resumen/Reportes por fecha en vez de histórico global, un mecanismo real de liquidación de comisiones (hoy "Cuentas por pagar a vendedores" es solo la suma histórica generada, no hay forma de marcar una comisión como pagada).
**Sigue (próximo, de negocio):** llevar esto a producción real con el cliente — frenado esperando que confirme si paga el plan Pro de Supabase (backups + sin auto-pausa). Cuando se confirme, sigue un deploy guiado del frontend (Vercel/Netlify + dominio).

Detalle completo de decisiones, modelo de datos y pendientes abiertos: ver `CONTEXTO.md`.

## Backend
`schema.sql` (v0.9) está **alineado al modelo actual de `App.jsx`, ya corrió contra el proyecto real de Supabase, y es la fuente de verdad completa** (tablas + RLS + Storage + funciones + seed — alguien podría recrear la base entera desde cero solo con este archivo): producto sin `formato`/`peso` (talla+cantidad+color), `operacion_tipo` + `procesos_taller`/`procesos_diseno` (con sus `_done`) en vez del viejo `destino_tipo`, diseño por zona normalizado (`pedido_item_diseno` para notas, `pedido_item_fotos` con `storage_path` hacia el bucket privado `diseno-fotos`), pago mixto por pedido en `pagos` (con `order_payment_id` + `is_reversal`, tabla append-only — solo select/insert, nunca update/delete), folio autogenerado por trigger (`pedidos_folio_seq`), tasa de cambio compartida vía `exchange_rates` + función atómica `set_active_rate()`, delivery/comisión en `pedidos` (`has_delivery`/`delivery_fee`/`comision_porcentaje`/`comision_monto`), `vendedores.auth_user_id` vinculado a Supabase Auth. RLS activa y verificada en las 9 tablas del núcleo más el bucket de Storage: `vendedores`/`clientes`/`audit_log`/`exchange_rates` por rol activo, `cajas`/`pedidos`/`pagos` por dueño-o-master, `pedido_items`/`pedido_item_diseno`/`pedido_item_fotos` heredan el permiso de su pedido padre. `src/lib/supabase.js` tiene el cliente real (Singleton). Las Edge Functions `supabase/functions/create-vendor` y `supabase/functions/update-vendor` resuelven alta y edición de vendedores sin exponer la Service Role Key en el navegador.

## Handoff
`CONTEXTO.md` resume decisiones, estado y pendientes para retomar en cualquier momento.
