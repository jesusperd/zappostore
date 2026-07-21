# Contexto rápido — ZappoStore (para Gemini AI)

> Este archivo es un brief autocontenido para que arranques con contexto completo del proyecto sin necesidad de leer el repo entero. Al final te voy a pasar, en el chat, una lista de fixes/cambios puntuales que necesito. Tu tarea con eso: **generar el prompt exacto** (claro, específico, con archivos/comportamiento involucrados) que yo le voy a pasar después a Claude Code para que implemente esos cambios. No implementes vos el código — el output que necesito de vos es el prompt de implementación.

## Qué es el proyecto

**ZappoStore**: POS + control de producción para un taller textil (remeras, gorras, estampado/bordado), inspirado en la app venezolana **Fina**. Bimoneda USD/Bs con tasa de cambio dinámica. Evoluciona hacia un ERP/Kanban de producción, con layout fijo pensado para tablet/desktop en el mostrador del taller (no mobile-first).

Repo: `github.com/jesusperd/zappostore`.

## Stack

- **Frontend**: React 18 (Vite) + Tailwind CSS. Todo vive hoy en `src/App.jsx` (un solo archivo grande, todavía sin separar en `screens/`/`components/` — refactor sugerido pero no hecho).
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions). **100% real, nada en memoria ni localStorage** — ver estado abajo.
- **Icons**: `lucide-react`. Sin librería de gráficos (los mini-gráficos son un `BarChart` SVG propio).
- Archivos clave: `src/lib/supabase.js` (cliente Singleton vía `globalThis`), `schema.sql` (fuente de verdad completa del backend, v0.9), `supabase/functions/create-vendor/` y `supabase/functions/update-vendor/` (Edge Functions de alta/edición de vendedores).

## Estado actual (v2.4, al 2026-07-21)

**La migración completa de memoria/localStorage → Supabase real terminó.** Todo el flujo operativo diario (login, vendedores, clientes, cajas, pedidos, pedido_items, pagos, fotos de diseño, tasa de cambio) corre contra Postgres real con RLS verificada tabla por tabla. Nada se pierde al refrescar la página, nada queda "por navegador".

Módulos y su estado:
| Módulo | Estado |
|---|---|
| Login (Supabase Auth, roles master/vendedor) | ✅ Real |
| Vendedores (alta/edición vía Edge Functions `create-vendor`/`update-vendor`, activar/desactivar lógico) | ✅ Real |
| Clientes (directorio compartido, auto-registro) | ✅ Real |
| Cajas (apertura/cierre de turno con modal de resumen antes de confirmar, cuadre efectivo) | ✅ Real |
| Vender / Seguimiento (pedidos, pedido_items, pagos, Kanban de procesos, delivery+comisión) | ✅ Real. Bloqueado para vendedor sin turno de caja abierto (master exento) |
| Fotos de diseño (Storage, bucket privado `diseno-fotos`, URLs firmadas) | ✅ Real |
| Tasa de cambio USD→Bs (compartida, input con formato venezolano punto-miles/coma-decimal) | ✅ Real |
| Home (dashboard por rol: KPIs de ventas/turnos/comisiones/delivery para master, turno+comisión propia para vendedor) | ✅ Real |
| Resumen Financiero / Reportes (solo master) | ✅ Real, pero histórico global (no filtra por fecha/turno) |
| Inventario/Stock | ⏭️ No empezado (hay ganchos en el schema) |
| Gastos/Marketing | 🔜 No empezado |
| Liquidación de comisiones (marcar una comisión como "pagada al vendedor") | ⏭️ No empezado — hoy solo se ve la suma histórica generada |

**Bloqueado en:** decisión de negocio del cliente (no de código) — confirmar si paga Supabase Pro ($25/mes, backups + sin auto-pausa) antes de encarar el deploy a producción (Vercel/Netlify + dominio).

## Modelo de datos (resumen — `schema.sql` v0.9 es la fuente de verdad completa)

Tablas núcleo: `vendedores` (+`auth_user_id→auth.users`), `clientes` (+`cedula`/`direccion`), `exchange_rates`, `cajas`, `pedidos` (folio autogenerado por trigger/secuencia, + `has_delivery`/`delivery_fee`/`comision_porcentaje`/`comision_monto`), `pedido_items` (talla+cantidad+color, `operacion_tipo`, `procesos_taller`/`procesos_diseno` + sus `_done`), `pedido_item_diseno` (notas por zona Frente/Espalda/Mangas), `pedido_item_fotos` (fotos, `storage_path`), `pagos` (ledger **append-only** con `order_payment_id`+`is_reversal` — solo insert/select, nunca update/delete), `audit_log`, `inventory_movements` (gancho sin usar).

Vistas: `v_historial_cliente`, `v_historial_vendedor`, `v_pedido_saldo`.

RLS: `vendedores`/`clientes`/`audit_log`/`exchange_rates` por rol activo; `cajas`/`pedidos`/`pagos` por dueño-o-master (`my_vendedor_id()`, `is_active_master()`); items/diseño/fotos heredan permiso del pedido padre (`owns_pedido()`).

## Reglas de negocio ya cerradas (no proponer cambiarlas sin que yo lo pida)

- **Roles**: `master` (supervisor, no opera caja propia, ve todo) y `vendedor` (ve solo lo suyo). Login en pantallas separadas.
- **Pago mixto por pedido**: N abonos con métodos distintos hasta cubrir el total. Ledger append-only; corregir/quitar un pago ya guardado genera una **reversión automática** en la misma caja original — nunca update/delete directo. Esta es la lógica más delicada de todo el proyecto (ya auditada y verificada end-to-end dos veces).
- **Presupuesto vs. Venta**: producto marcado "presupuesto" → botón "Imprimir Presupuesto", no crea pedido ni toca Caja. Intencionalmente no queda registrado en ningún lado (no hay forma de recuperar/reimprimir uno viejo todavía).
- **Cierre de venta**: solo cierra cuando **todos** los productos están `cerrado`.
- **Cierre de producto**: un producto solo puede pasar a `cerrado` si ya completó (`*_done`) todos los procesos de Taller/Diseño que eligió (helper `proceduresComplete()`). Si no eligió ninguno, no hay restricción.
- **Cliente obligatorio en venta real**: nombre + teléfono son obligatorios para cerrar una venta (no para un presupuesto).
- **Carrito mixto (Venta + Presupuesto)**: al guardar, NO se guarda ningún producto del pedido (ni los de venta real) — se avisa explícito en la UI.
- **Producto**: Talla (chips) + Cantidad (input simple) + Color libre (texto). Sin formato/peso, sin paleta de colores predefinida.
- **Zonas de diseño**: Frente/Espalda/Mangas, visión de espejo, "Espalda Completa" es un estado calculado (no una zona real), bidireccional.
- **Layout**: sidebar fijo (`<aside>`, no drawer/hamburguesa) — target es tablet/desktop de taller, no mobile.
- **Venta sin caja abierta**: bloqueada solo para el rol vendedor (el master no opera caja propia, queda exento). Se puede seguir editando una venta ya existente sin turno abierto.
- **Comisión por pedido**: se calcula solo sobre el total de productos, sin el delivery. Es un dato interno del vendedor — nunca aparece en la comanda que ve el cliente.
- **Delivery**: se suma al total que paga el cliente y sí aparece en la comanda.
- **Eliminar vendedores**: no existe borrado físico, solo el toggle lógico (`active`) — `vendedores` tiene FKs entrantes desde `pedidos`/`cajas`/`pagos` sin cascade.
- **Borrado de datos de prueba**: `pedidos`/`cajas` no tienen política RLS de DELETE (a propósito, por trazabilidad) — cualquier limpieza de datos de prueba se hace desde el SQL Editor de Supabase, nunca desde la app.

## Gaps conocidos / pendientes reales (candidatos típicos a "fixes")

- **Sin manejo de errores visible al usuario**: si falla una llamada a Supabase (sin internet, error de servidor), hoy solo hay `console.error` — el vendedor no ve ningún aviso en pantalla.
- **Cuadre de caja congelado no se recalcula**: si se edita una venta después de cerrar su turno, el cuadre guardado (`caja.expectedCashUSD`/`varianceUSD`) no se actualiza — puede desalinearse del total en vivo.
- **Resumen/Reportes son histórico global**, no filtran por fecha/turno todavía (aunque `CajaScreen` ya tiene el patrón `inRange`/`PeriodTabs` reusable).
- **2 usuarios demo sembrados** (`1234567` master, `95414372` vendedor, este último renombrado a "Vendedor Principal" durante pruebas) — sin decidir si quedan o se desactivan antes de producción.
- **No probado en dispositivos reales** (tablet) del cliente.
- Inventario/Stock y Gastos/Estadísticas: no implementados.
- Un "Presupuesto" impreso no se puede recuperar/reimprimir ni convertir en venta con un clic.
- **Sin liquidación de comisiones**: no hay forma de marcar una comisión como "ya pagada al vendedor" — el dashboard de master solo suma el histórico generado.

## Cómo correr el proyecto

```bash
npm install
cp .env.example .env   # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
```

## Qué necesito de vos ahora

Te voy a pasar por separado, en este mismo chat, una lista de fixes/cambios puntuales sobre este proyecto. Con ese contexto de arriba ya cargado, quiero que me devuelvas **el prompt de implementación exacto** (en español, concreto, mencionando archivos/comportamiento esperado cuando aplique) para pasárselo tal cual a Claude Code y que ejecute esos cambios. No hace falta que vos escribas el código.
