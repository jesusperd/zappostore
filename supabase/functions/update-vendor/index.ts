// Edge Function: update-vendor
// Edición de vendedores existentes (pantalla Vendedores, solo master): nombre,
// cédula y/o contraseña. Corre en el servidor porque la cédula determina el
// email sintético de Auth (cedula@zappostore.local) y la contraseña solo se
// puede resetear con la SERVICE ROLE KEY (nunca viaja al navegador) — mismo
// patrón que create-vendor. Verifica que quien llama sea un master activo.
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

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) throw new Error("No autenticado.");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: caller, error: callerRowErr } = await admin
      .from("vendedores")
      .select("id, role, active")
      .eq("auth_user_id", user.id)
      .single();
    if (callerRowErr || !caller || caller.role !== "master" || !caller.active) {
      throw new Error("Solo un master activo puede editar vendedores.");
    }

    const { id, name, cedula, password } = await req.json();
    if (!id) throw new Error("Falta id del vendedor.");
    if (password && String(password).length < 6) throw new Error("La clave debe tener al menos 6 caracteres.");

    const { data: target, error: targetErr } = await admin
      .from("vendedores")
      .select("id, cedula, auth_user_id")
      .eq("id", id)
      .single();
    if (targetErr || !target) throw new Error("Vendedor no encontrado.");

    const patch: Record<string, unknown> = {};
    if (name && name.trim()) patch.name = name.trim();

    const cedulaNorm = cedula ? String(cedula).trim() : null;
    const cedulaChanged = cedulaNorm && cedulaNorm !== target.cedula;
    if (cedulaChanged) patch.cedula = cedulaNorm;

    if (target.auth_user_id && (cedulaChanged || password)) {
      const authPatch: Record<string, unknown> = {};
      if (cedulaChanged) authPatch.email = `${cedulaNorm!.toLowerCase()}@zappostore.local`;
      if (password) authPatch.password = password;
      const { error: authErr } = await admin.auth.admin.updateUserById(target.auth_user_id, authPatch);
      if (authErr) throw new Error(authErr.message);
    }

    if (Object.keys(patch).length === 0) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const { data: vendedor, error: updateErr } = await admin
      .from("vendedores")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (updateErr) throw new Error(updateErr.message);

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
