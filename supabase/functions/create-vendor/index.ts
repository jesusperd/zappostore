// Edge Function: create-vendor
// Alta de vendedores desde el "manager de apertura" (pantalla Vendedores, solo master).
// Corre en el servidor de Supabase: es el único lugar donde se usa la
// SERVICE ROLE KEY (nunca viaja al navegador). Verifica que quien llama sea
// un master activo antes de crear nada.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Falta el header Authorization.");

    // Cliente con el JWT de quien llama, solo para identificarlo.
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) throw new Error("No autenticado.");

    // Cliente admin (service role) — nunca se expone fuera de este servidor.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: caller, error: callerRowErr } = await admin
      .from("vendedores")
      .select("id, role, active")
      .eq("auth_user_id", user.id)
      .single();
    if (callerRowErr || !caller || caller.role !== "master" || !caller.active) {
      throw new Error("Solo un master activo puede crear vendedores.");
    }

    const { cedula, password, name } = await req.json();
    if (!cedula || !password || !name) throw new Error("Faltan cedula, password o name.");
    if (String(password).length < 6) throw new Error("La clave debe tener al menos 6 caracteres.");

    const cedulaNorm = String(cedula).trim();
    const email = `${cedulaNorm.toLowerCase()}@zappostore.local`;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // email sintético, nunca podría confirmarse por link real
    });
    if (createErr) throw new Error(createErr.message);

    const { data: vendedor, error: insertErr } = await admin
      .from("vendedores")
      .insert({ cedula: cedulaNorm, name, role: "vendedor", active: true, auth_user_id: created.user.id, created_by: caller.id })
      .select()
      .single();
    if (insertErr) {
      // rollback: si falla el insert (ej. cedula duplicada), no dejamos un auth user huérfano
      await admin.auth.admin.deleteUser(created.user.id);
      throw new Error(insertErr.message);
    }

    return new Response(JSON.stringify({ vendedor }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
