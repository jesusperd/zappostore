// Cliente Supabase — Singleton.
//
// Se guarda en globalThis (no en una variable de módulo simple) porque el HMR
// de Vite puede re-evaluar este módulo en desarrollo; sin esto, cada hot-reload
// crearía un nuevo GoTraeClient/cliente y el SDK tira warnings de múltiples
// instancias conviviendo. globalThis persiste entre esas re-evaluaciones.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function createSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      "[supabase] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
      "Copiá .env.example a .env y completá los valores de tu proyecto (Settings -> API)."
    );
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const globalKey = "__zappostore_supabase_client__";
export const supabase = globalThis[globalKey] ?? (globalThis[globalKey] = createSupabaseClient());

// Mapeo de datos (in-memory en App.jsx) -> tablas (ver schema.sql v0.4):
//   vendors        -> vendedores (+ auth_user_id -> auth.users, ver plan de login)
//   clients        -> clientes
//   sales          -> pedidos (+ pedido_items, pagos)
//   sale.audit     -> audit_log
//   payments       -> pagos (ledger, con order_payment_id + is_reversal)
//   cajas          -> cajas
//   item.designData-> pedido_item_diseno + pedido_item_fotos
// La migración de App.jsx todavía no se hizo — este archivo es el punto de
// integración; App.jsx sigue 100% en memoria hasta que se apruebe el plan.
