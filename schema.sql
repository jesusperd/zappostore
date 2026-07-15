-- ============================================================================
-- ZappoStore — Esquema PostgreSQL / Supabase (v0.4)
-- Alineado al modelo real de src/App.jsx a la fecha (login+roles, Vender,
-- Seguimiento/Kanban, Clientes, Vendedores, Caja, Resumen/Reportes). Cambios
-- clave respecto a v0.3:
--   • Producto simplificado: se eliminó "formato" (talle/peso/cantidad) — ahora
--     es siempre talla + cantidad + color (texto libre).
--   • "destinos" (venta/taller/diseno) reemplazado por operacion_tipo
--     (venta/presupuesto) + procesos_taller/procesos_diseno (qué aplica) y sus
--     *_done (qué ya se completó, auditado en audit_log).
--   • Diseño: una foto/nota única por producto reemplazada por notas y fotos
--     (multi-carga) INDEPENDIENTES por zona (Frente/Espalda/Mangas).
--   • Pago: ya no es junto/fraccionado por ítem — es MIXTO por pedido (N abonos
--     con métodos distintos). El ledger de pagos soporta REVERSIÓN (corregir un
--     abono ya guardado sin dejar dinero fantasma en el cuadre de Caja).
--   • Clientes: se agregaron cedula (Cédula/RIF) y direccion.
-- ============================================================================
create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
do $$ begin
  create type user_role           as enum ('master','vendedor');
  create type item_estado         as enum ('en_curso','en_espera_retiro','cerrado');
  create type operacion_tipo      as enum ('venta','presupuesto');
  create type proceso_taller_tipo as enum ('espera','corte','confeccion','planchado');
  create type proceso_diseno_tipo as enum ('dtf','sublimacion','bordado','vinil');
  create type design_view_tipo    as enum ('frente','espalda','mangas');
  create type pay_method          as enum ('efectivo_usd','efectivo_bs','tarjeta','pago_movil');
  create type currency_code       as enum ('USD','VES');
exception when duplicate_object then null; end $$;

-- ---------- VENDEDORES (perfil; auth real vía Supabase auth.users) ----------
create table if not exists vendedores (
  id          uuid primary key default gen_random_uuid(),
  cedula      text unique not null,          -- usuario de login
  name        text not null,
  role        user_role not null default 'vendedor',
  active      boolean not null default true,
  created_by  uuid references vendedores(id),
  created_at  timestamptz not null default now()
);

-- ---------- CLIENTES ----------
create table if not exists clientes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,                          -- clave natural para de-duplicar
  cedula      text,                          -- Cédula / RIF
  direccion   text,
  notes       text,
  created_at  timestamptz not null default now()
);
create unique index if not exists uq_clientes_phone on clientes (phone) where phone is not null;

-- ---------- TASA DE CAMBIO ----------
create table if not exists exchange_rates (
  id           uuid primary key default gen_random_uuid(),
  usd_to_ves   numeric(14,4) not null check (usd_to_ves > 0),
  is_active    boolean not null default true,
  effective_at timestamptz not null default now()
);
create unique index if not exists uq_rate_active on exchange_rates (is_active) where is_active;

-- ---------- CAJA (apertura/cierre de turno por vendedor) ----------
create table if not exists cajas (
  id                uuid primary key default gen_random_uuid(),
  vendedor_id       uuid references vendedores(id),
  opened_at         timestamptz not null default now(),
  closed_at         timestamptz,
  opening_cash_usd  numeric(14,2) not null default 0,   -- fondo inicial declarado, efectivo $
  opening_cash_ves  numeric(14,2) not null default 0,   -- fondo inicial declarado, efectivo Bs
  rate_open         numeric(14,4),                      -- tasa vigente al abrir
  closing_cash_usd  numeric(14,2),                       -- efectivo $ contado al cerrar
  closing_cash_ves  numeric(14,2),                       -- efectivo Bs contado al cerrar
  rate_close        numeric(14,4),                       -- tasa vigente al cerrar
  expected_cash_usd numeric(14,2),                       -- fondo + cobrado en efectivo durante el turno
  variance_usd      numeric(14,2)                        -- contado - esperado (cuadre; +sobrante / -faltante)
);

-- ---------- CATÁLOGO DE PRODUCTOS (para stock futuro) ----------
create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  sku           text unique,
  name          text not null,
  base_price    numeric(14,2) not null default 0,
  track_stock   boolean not null default false,   -- gancho de stock (fase próxima)
  current_stock numeric(14,3) not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------- PEDIDOS (una venta) ----------
create table if not exists pedidos (
  id           uuid primary key default gen_random_uuid(),
  folio        text unique not null,               -- ZS-0001
  vendedor_id  uuid references vendedores(id),
  cliente_id   uuid references clientes(id),
  total        numeric(14,2) not null default 0,
  rate_snap    numeric(14,4) not null default 0,    -- tasa usada al guardar
  caja_id      uuid references cajas(id),           -- turno en el que se tomó el pedido (null si no había caja abierta)
  -- Estado de la venta DERIVADO de sus items (en_curso/en_espera_retiro/cerrada).
  -- Regla dura: la venta solo puede pasar a 'cerrada' cuando TODOS los items están 'cerrado'.
  -- El estado de PAGO (pagado/parcial/debe) es independiente del estado de la venta y
  -- se deriva de la tabla "pagos" — ver vista v_pedido_saldo más abajo.
  client_ref   uuid unique,                          -- idempotencia offline
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_pedidos_vendedor on pedidos (vendedor_id, created_at desc);
create index if not exists idx_pedidos_cliente on pedidos (cliente_id, created_at desc);

-- ---------- ITEMS DEL PEDIDO ----------
create table if not exists pedido_items (
  id                    uuid primary key default gen_random_uuid(),
  pedido_id             uuid not null references pedidos(id) on delete cascade,
  product_id            uuid references products(id),
  name                  text not null,
  talla                 text,
  cantidad              numeric(14,3) not null default 1,
  color                 text,                                          -- texto libre (ej. "Gris plomo")
  unit_price            numeric(14,2) not null default 0,
  line_total            numeric(14,2) not null default 0,
  operacion_tipo        operacion_tipo not null default 'venta',       -- reemplaza al viejo "destinos"
  procesos_taller       proceso_taller_tipo[] not null default '{}',   -- qué procesos de taller aplican
  procesos_taller_done  proceso_taller_tipo[] not null default '{}',   -- cuáles ya se completaron
  procesos_diseno       proceso_diseno_tipo[] not null default '{}',   -- qué procesos de diseño aplican
  procesos_diseno_done  proceso_diseno_tipo[] not null default '{}',   -- cuáles ya se completaron
  zones                 text[] not null default '{}',                 -- pecho_izq, espalda_alta, manga_der...
  estado                item_estado not null default 'en_curso'
);
create index if not exists idx_items_pedido on pedido_items (pedido_id);

-- ---------- DISEÑO POR ZONA (Frente / Espalda / Mangas) ----------
-- Reemplaza el viejo par único "photo_path"/"notes" por producto: ahora cada
-- producto tiene notas y fotos (multi-carga) INDEPENDIENTES por cada pestaña.
create table if not exists pedido_item_diseno (
  id              uuid primary key default gen_random_uuid(),
  pedido_item_id  uuid not null references pedido_items(id) on delete cascade,
  vista           design_view_tipo not null,
  notes           text,
  unique (pedido_item_id, vista)
);

create table if not exists pedido_item_fotos (
  id              uuid primary key default gen_random_uuid(),
  pedido_item_id  uuid not null references pedido_items(id) on delete cascade,
  vista           design_view_tipo not null,
  storage_path    text not null,             -- Supabase Storage (hoy en memoria es un data URI optimizado)
  created_at      timestamptz not null default now()
);
create index if not exists idx_fotos_item on pedido_item_fotos (pedido_item_id, vista);

-- ---------- PAGOS (ledger de eventos por pedido — pago MIXTO, no por ítem) ----------
-- Cada abono agregado desde el front genera UNA fila con su propio order_payment_id.
-- Si el vendedor quita un abono ya guardado (corrección/anulación durante una edición),
-- se inserta una fila de REVERSIÓN con el MISMO order_payment_id, amount_usd negativo,
-- y el MISMO caja_id del pago original (no la caja actual de quien edita) — así el
-- cuadre de una caja ya cerrada nunca queda con dinero fantasma. El total cobrado de
-- un pedido es simplemente sum(amount_usd) — los reversos se descuentan solos.
create table if not exists pagos (
  id                uuid primary key default gen_random_uuid(),
  pedido_id         uuid not null references pedidos(id) on delete cascade,
  order_payment_id  uuid not null default gen_random_uuid(),  -- vincula un abono con su eventual reversión
  is_reversal       boolean not null default false,
  method            pay_method not null,
  amount            numeric(14,2) not null check (amount <> 0),      -- negativo si is_reversal
  currency          currency_code not null,
  amount_usd        numeric(14,2) not null check (amount_usd <> 0),  -- negativo si is_reversal
  rate_snap         numeric(14,4) not null,
  reference_number  text,
  caja_id           uuid references cajas(id),           -- turno durante el cual se cobró (o se revirtió)
  created_by        uuid references vendedores(id),
  created_at        timestamptz not null default now(),
  constraint chk_pago_movil_ref
    check (method <> 'pago_movil' or (reference_number is not null and length(trim(reference_number)) > 0))
);
create index if not exists idx_pagos_pedido on pagos (pedido_id);
create index if not exists idx_pagos_order_payment on pagos (order_payment_id);
create index if not exists idx_pagos_caja on pagos (caja_id);

-- ---------- AUDIT LOG (trazabilidad de cambios) ----------
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  entity      text not null,                 -- 'pedido' | 'cliente' | 'vendedor'
  entity_id   uuid not null,
  action      text not null,                 -- 'creo','edito','cambio_estado',...
  detail      text,
  user_id     uuid references vendedores(id),
  user_name   text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_entity on audit_log (entity, entity_id, created_at desc);

-- ---------- MOVIMIENTOS DE STOCK (gancho; fase próxima) ----------
create table if not exists inventory_movements (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id),
  movement_type text not null,               -- entrada/salida/ajuste/consumo
  quantity      numeric(14,3) not null,
  pedido_id     uuid references pedidos(id),
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- VISTAS
-- ============================================================================

-- Historial cliente<->vendedor (relación en dos sentidos, sin duplicar datos)
create or replace view v_historial_cliente as
select p.cliente_id, c.name as cliente, p.vendedor_id, v.name as vendedor,
       p.id as pedido_id, p.folio, p.total, p.created_at
from pedidos p
join clientes c on c.id = p.cliente_id
left join vendedores v on v.id = p.vendedor_id;

create or replace view v_historial_vendedor as
select p.vendedor_id, v.name as vendedor, p.cliente_id, c.name as cliente,
       p.id as pedido_id, p.folio, p.total, p.created_at
from pedidos p
left join vendedores v on v.id = p.vendedor_id
left join clientes c on c.id = p.cliente_id;

-- Saldo por pedido — equivalente a data.paidUSD / data.balance en memoria.
-- cobrado_usd = suma de pagos del pedido (los reversos, al ser negativos, se descuentan solos).
create or replace view v_pedido_saldo as
select p.id as pedido_id, p.total,
       coalesce(sum(pg.amount_usd), 0) as cobrado_usd,
       greatest(p.total - coalesce(sum(pg.amount_usd), 0), 0) as balance_usd
from pedidos p
left join pagos pg on pg.pedido_id = p.id
group by p.id, p.total;

-- ============================================================================
-- SEED mínimo
-- ============================================================================
insert into vendedores (cedula, name, role) values ('master','Supervisor','master')
  on conflict (cedula) do nothing;

-- Nota RLS: habilitar y crear políticas por rol en migración 003
-- (vendedor: solo sus pedidos; master: todo).
