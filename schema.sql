-- ============================================================================
-- ZappoStore — Esquema PostgreSQL / Supabase (v0.8)
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
-- Cambios v0.5 (conexión real a Supabase Auth):
--   • vendedores.auth_user_id vincula el perfil/rol con auth.users. El email de
--     Auth es sintético (cedula@zappostore.local); nunca lo ve el usuario.
--   • El master deja de ser un valor hardcodeado en el front — es una fila más
--     en vendedores con role='master'.
-- Cambios v0.6 (migración del núcleo pedidos/pedido_items/pagos a Supabase real):
--   • pedidos.folio ya no lo genera el cliente (era un contador en memoria del
--     navegador, garantizaba colisiones con más de un vendedor) — ahora lo pone
--     un trigger (set_pedido_folio) con una secuencia real de Postgres.
-- Cambios v0.7 (Storage real para fotos de diseño):
--   • Bucket privado "diseno-fotos" (ver sección STORAGE al final) — cada foto
--     sube a {pedido_item_id}/{vista}/{uuid}.jpg y pedido_item_fotos.storage_path
--     guarda ese path. Se sirven con URLs firmadas (createSignedUrls), nunca
--     públicas — solo un vendedor/master activo puede subir/ver/borrar.
-- Cambios v0.8 (tasa de cambio compartida):
--   • exchange_rates pasó de useState local (una tasa distinta por navegador)
--     a compartida de verdad; el cambio pasa por set_active_rate() para que
--     sea atómico entre vendedores.
-- Cambios v0.9 (delivery + comisión por pedido):
--   • pedidos.has_delivery/delivery_fee: delivery opcional, visible para el
--     cliente (se suma al total que paga, aparece en la comanda impresa).
--   • pedidos.comision_porcentaje/comision_monto: comisión interna del
--     vendedor sobre ESA venta, calculada solo sobre el total de productos
--     (sin el delivery) — nunca aparece en la comanda del cliente.
-- Cambios v0.10 (delivery: incluir o no en el total facturado):
--   • pedidos.delivery_incluido_en_total: si hubo delivery pero se cobra
--     aparte (ej. el cliente le paga el flete directo al repartidor), el
--     monto queda registrado para las estadísticas pero NO se suma al total
--     que factura la tienda. Default true (comportamiento de v0.9).
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
-- Login real: el email de Auth es sintético (cedula@zappostore.local, nunca
-- visible para el usuario). auth_user_id vincula la fila de perfil/rol con la
-- cuenta de auth.users creada por supabase.auth.signInWithPassword/signUp.
create table if not exists vendedores (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  cedula       text unique not null,          -- usuario de login
  name         text not null,
  role         user_role not null default 'vendedor',
  active       boolean not null default true,
  created_by   uuid references vendedores(id),
  created_at   timestamptz not null default now()
);
create index if not exists idx_vendedores_auth_user on vendedores (auth_user_id);

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
-- folio: NO lo pone el cliente. Se autogenera con una secuencia real de Postgres
-- (ver trigger set_pedido_folio más abajo) para que sea único aunque dos
-- vendedores guarden una venta al mismo tiempo — un contador en el navegador
-- (como se usaba en memoria) generaría folios duplicados con más de un vendedor.
create sequence if not exists pedidos_folio_seq start 1;

create table if not exists pedidos (
  id           uuid primary key default gen_random_uuid(),
  folio        text unique not null default '',    -- lo completa el trigger antes de insertar (ZS-0001)
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
  updated_at   timestamptz not null default now(),
  -- Delivery: opcional. delivery_fee ya está incluido en "total" SOLO si
  -- delivery_incluido_en_total es true (si se cobra aparte del repartidor,
  -- queda registrado para estadísticas pero no suma al total facturado).
  has_delivery              boolean not null default false,
  delivery_fee              numeric(14,2) not null default 0,
  delivery_incluido_en_total boolean not null default true,
  -- Comisión del vendedor sobre esta venta (interno, nunca en la comanda del
  -- cliente). Calculada solo sobre el total de productos, sin el delivery.
  comision_porcentaje numeric(5,2) not null default 0,
  comision_monto      numeric(14,2) not null default 0
);
create index if not exists idx_pedidos_vendedor on pedidos (vendedor_id, created_at desc);

create or replace function set_pedido_folio() returns trigger
language plpgsql as $$
begin
  if new.folio is null or new.folio = '' then
    new.folio := 'ZS-' || lpad(nextval('pedidos_folio_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_set_pedido_folio on pedidos;
create trigger trg_set_pedido_folio before insert on pedidos for each row execute function set_pedido_folio();
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
-- RLS — políticas reales, aplicadas y verificadas end-to-end (v0.5 a v0.7)
-- Todas las tablas tienen RLS habilitada. Sin política = deny-all para ese
-- rol/operación (default de Postgres). Las funciones de abajo son
-- security definer para evitar el problema clásico de recursión al chequear
-- rol/dueño desde dentro de una política sobre la misma tabla.
-- ============================================================================
create or replace function is_active_master(check_uid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from vendedores where auth_user_id = check_uid and role = 'master' and active);
$$;
create or replace function is_active_vendedor(check_uid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from vendedores where auth_user_id = check_uid and active);
$$;
create or replace function my_vendedor_id() returns uuid
language sql security definer stable set search_path = public as $$
  select id from vendedores where auth_user_id = auth.uid();
$$;
create or replace function owns_pedido(check_pedido_id uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from pedidos where id = check_pedido_id and (vendedor_id = my_vendedor_id() or is_active_master(auth.uid())));
$$;
create or replace function owns_pedido_item(check_item_id uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select owns_pedido((select pedido_id from pedido_items where id = check_item_id));
$$;

alter table vendedores enable row level security;
alter table clientes enable row level security;
alter table exchange_rates enable row level security;
alter table cajas enable row level security;
alter table products enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;
alter table pedido_item_diseno enable row level security;
alter table pedido_item_fotos enable row level security;
alter table pagos enable row level security;
alter table audit_log enable row level security;
alter table inventory_movements enable row level security;

-- vendedores: cada uno lee su propia fila (necesario para el login); un master
-- activo lee/actualiza todas (pantalla Vendedores). El alta real (insert) NO
-- tiene política de INSERT a propósito — solo pasa por la Edge Function
-- create-vendor, que usa la Service Role Key y por lo tanto evade RLS.
do $$ begin create policy "vendedores_select_self" on vendedores for select using (auth_user_id = auth.uid()); exception when duplicate_object then null; end $$;
do $$ begin create policy "vendedores_select_master" on vendedores for select using (is_active_master(auth.uid())); exception when duplicate_object then null; end $$;
do $$ begin create policy "vendedores_update_master" on vendedores for update using (is_active_master(auth.uid())); exception when duplicate_object then null; end $$;

-- clientes: directorio compartido — cualquier vendedor/master activo puede
-- leer/crear/actualizar (evita duplicar el mismo cliente entre vendedores).
do $$ begin create policy "clientes_select_active" on clientes for select using (is_active_vendedor(auth.uid())); exception when duplicate_object then null; end $$;
do $$ begin create policy "clientes_insert_active" on clientes for insert with check (is_active_vendedor(auth.uid())); exception when duplicate_object then null; end $$;
do $$ begin create policy "clientes_update_active" on clientes for update using (is_active_vendedor(auth.uid())); exception when duplicate_object then null; end $$;

-- cajas: cada vendedor ve/abre/cierra solo la suya; el master ve todas pero no
-- opera caja propia (regla de negocio: "el master no opera caja propia").
do $$ begin create policy "cajas_select_own_or_master" on cajas for select using (vendedor_id = my_vendedor_id() or is_active_master(auth.uid())); exception when duplicate_object then null; end $$;
do $$ begin create policy "cajas_insert_own" on cajas for insert with check (vendedor_id = my_vendedor_id()); exception when duplicate_object then null; end $$;
do $$ begin create policy "cajas_update_own" on cajas for update using (vendedor_id = my_vendedor_id()); exception when duplicate_object then null; end $$;

-- pedidos: dueño o master.
do $$ begin create policy "pedidos_select" on pedidos for select using (vendedor_id = my_vendedor_id() or is_active_master(auth.uid())); exception when duplicate_object then null; end $$;
do $$ begin create policy "pedidos_insert" on pedidos for insert with check (vendedor_id = my_vendedor_id()); exception when duplicate_object then null; end $$;
do $$ begin create policy "pedidos_update" on pedidos for update using (vendedor_id = my_vendedor_id() or is_active_master(auth.uid())); exception when duplicate_object then null; end $$;

-- pedido_items / pedido_item_diseno / pedido_item_fotos: heredan el permiso
-- del pedido padre.
do $$ begin create policy "pedido_items_select" on pedido_items for select using (owns_pedido(pedido_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy "pedido_items_insert" on pedido_items for insert with check (owns_pedido(pedido_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy "pedido_items_update" on pedido_items for update using (owns_pedido(pedido_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy "pedido_items_delete" on pedido_items for delete using (owns_pedido(pedido_id)); exception when duplicate_object then null; end $$;

do $$ begin create policy "pedido_item_diseno_select" on pedido_item_diseno for select using (owns_pedido_item(pedido_item_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy "pedido_item_diseno_insert" on pedido_item_diseno for insert with check (owns_pedido_item(pedido_item_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy "pedido_item_diseno_update" on pedido_item_diseno for update using (owns_pedido_item(pedido_item_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy "pedido_item_diseno_delete" on pedido_item_diseno for delete using (owns_pedido_item(pedido_item_id)); exception when duplicate_object then null; end $$;

do $$ begin create policy "pedido_item_fotos_select" on pedido_item_fotos for select using (owns_pedido_item(pedido_item_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy "pedido_item_fotos_insert" on pedido_item_fotos for insert with check (owns_pedido_item(pedido_item_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy "pedido_item_fotos_delete" on pedido_item_fotos for delete using (owns_pedido_item(pedido_item_id)); exception when duplicate_object then null; end $$;

-- pagos: ledger APPEND-ONLY a propósito (ver v0.8/v1.0) — solo select/insert,
-- nunca update/delete. Una corrección se hace con una fila de reversión nueva,
-- no editando ni borrando la original.
do $$ begin create policy "pagos_select" on pagos for select using (owns_pedido(pedido_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy "pagos_insert" on pagos for insert with check (owns_pedido(pedido_id)); exception when duplicate_object then null; end $$;

-- audit_log: abierto a cualquier vendedor/master activo (no es dato financiero
-- sensible, es un registro de actividad).
do $$ begin create policy "audit_log_select" on audit_log for select using (is_active_vendedor(auth.uid())); exception when duplicate_object then null; end $$;
do $$ begin create policy "audit_log_insert" on audit_log for insert with check (is_active_vendedor(auth.uid())); exception when duplicate_object then null; end $$;

-- exchange_rates: tasa USD->Bs COMPARTIDA entre todos los vendedores/master
-- (antes vivía como useState local en el navegador de cada uno, dando totales
-- en Bs inconsistentes entre ventas simultáneas de dos vendedores distintos).
-- Solo lectura directa vía RLS; el cambio de tasa pasa SIEMPRE por
-- set_active_rate() para que "desactivar la vieja + insertar la nueva" sea
-- atómico (evita que dos cambios de tasa al mismo tiempo choquen contra el
-- índice único parcial uq_rate_active).
do $$ begin create policy "exchange_rates_select_active" on exchange_rates for select using (is_active_vendedor(auth.uid())); exception when duplicate_object then null; end $$;

create or replace function set_active_rate(new_rate numeric) returns exchange_rates
language plpgsql security definer set search_path = public as $$
declare
  result exchange_rates;
begin
  if not is_active_vendedor(auth.uid()) then
    raise exception 'No autorizado';
  end if;
  update exchange_rates set is_active = false where is_active = true;
  insert into exchange_rates (usd_to_ves, is_active) values (new_rate, true) returning * into result;
  return result;
end;
$$;

-- products / inventory_movements: RLS habilitada, sin políticas todavía
-- (deny-all) — la app no las usa desde el front hoy.

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
-- STORAGE — fotos de diseño (bucket privado, servido con URLs firmadas)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('diseno-fotos', 'diseno-fotos', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

do $$ begin create policy "diseno_fotos_select" on storage.objects for select using (bucket_id = 'diseno-fotos' and is_active_vendedor(auth.uid())); exception when duplicate_object then null; end $$;
do $$ begin create policy "diseno_fotos_insert" on storage.objects for insert with check (bucket_id = 'diseno-fotos' and is_active_vendedor(auth.uid())); exception when duplicate_object then null; end $$;
do $$ begin create policy "diseno_fotos_delete" on storage.objects for delete using (bucket_id = 'diseno-fotos' and is_active_vendedor(auth.uid())); exception when duplicate_object then null; end $$;

-- ============================================================================
-- SEED mínimo
-- ============================================================================
insert into vendedores (cedula, name, role) values ('master','Supervisor','master')
  on conflict (cedula) do nothing;

-- RLS: ya implementada y verificada (ver comentarios junto a cada tabla arriba).
-- vendedor ve/opera solo lo suyo (my_vendedor_id(), owns_pedido(), owns_pedido_item());
-- master ve todo (is_active_master()); clientes/audit_log/pagos abiertos a cualquier
-- vendedor o master activo (is_active_vendedor()) con el criterio de "directorio /
-- ledger compartido" documentado en CONTEXTO.md.
