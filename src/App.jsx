import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  LogOut, Plus, Trash2, X, Upload, Shirt, Check, ChevronDown,
  ChevronUp, ChevronLeft, User, Phone, CreditCard, Banknote, Smartphone,
  DollarSign, Printer, Receipt, WifiOff, RefreshCw, Palette, Wrench, Tag,
  Lock, Eye, EyeOff, ShoppingBag, Pencil, Clock,
  PackageCheck, CheckCircle2, ClipboardList, Home, Users, UserCog,
  Wallet, Boxes, FileText, BarChart3, History, ShieldCheck, TrendingUp,
  Truck, Percent, AlertTriangle,
} from "lucide-react";

import { FROG_LOGO } from "./assets/logo.js";
import { supabase } from "./lib/supabase.js";

// ===CATALOG_START===
const QUICK_PRODUCTS = [
  { id: "remera", name: "Remera / Franela", emoji: "👕", price: 8 },
  { id: "chemise", name: "Chemise", emoji: "🧥", price: 12 },
  { id: "gorra", name: "Gorra", emoji: "🧢", price: 9 },
  { id: "sudadera", name: "Sudadera", emoji: "🧶", price: 18 },
  { id: "otro", name: "Otro", emoji: "📦", price: 0 },
];
const TALLAS = ["S", "M", "L", "XL", "XXL"];
const TIPOS_OPERACION = [
  { id: "venta", label: "Venta Directa" },
  { id: "presupuesto", label: "Presupuesto" },
];
const PROCESOS_TALLER = [
  { id: "espera", label: "Espera del producto" },
  { id: "corte", label: "Corte" },
  { id: "confeccion", label: "Confección" },
  { id: "planchado", label: "Planchado" },
];
const PROCESOS_DISENO = [
  { id: "dtf", label: "DTF" },
  { id: "sublimacion", label: "Sublimación" },
  { id: "bordado", label: "Bordado" },
  { id: "vinil", label: "Vinil" },
];
const ITEM_STATES = [
  { id: "en_curso", label: "En curso", dot: "bg-blue-500" },
  { id: "en_espera_retiro", label: "Espera retiro", dot: "bg-amber-500" },
  { id: "cerrado", label: "Cerrado", dot: "bg-emerald-500" },
];
const PAY_METHODS = [
  { id: "efectivo_usd", label: "Efectivo $", currency: "USD", icon: DollarSign },
  { id: "efectivo_bs", label: "Efectivo Bs", currency: "VES", icon: Banknote },
  { id: "tarjeta", label: "Tarjeta", currency: "VES", icon: CreditCard },
  { id: "pago_movil", label: "Pago Móvil", currency: "VES", icon: Smartphone, needsRef: true },
];
const DESIGN_VIEWS = {
  frente: {
    label: "Frente",
    zones: [
      { id: "hombro_der", num: 1, label: "Hombro/Sup Der", top: "20%", left: "29%" },
      { id: "hombro_izq", num: 2, label: "Hombro/Sup Izq", top: "20%", left: "71%" },
      { id: "pecho_der", num: 3, label: "Pecho Der", top: "29%", left: "42%" },
      { id: "centro_pecho", num: 4, label: "Centro Pecho", top: "42%", left: "50%" },
      { id: "pecho_izq", num: 5, label: "Pecho Izq", top: "29%", left: "58%" },
      { id: "abdomen", num: 6, label: "Abdomen", top: "70%", left: "50%" },
    ]
  },
  espalda: {
    label: "Espalda",
    zones: [
      { id: "espalda_alta", num: 1, label: "Espalda Alta", top: "30%", left: "50%" },
      { id: "espalda_media", num: 2, label: "Espalda Media", top: "48%", left: "50%" },
      { id: "espalda_baja", num: 3, label: "Espalda Baja", top: "66%", left: "50%" },
    ]
  },
  mangas: {
    label: "Mangas",
    zones: [
      { id: "manga_izq", num: 1, label: "Manga Izquierda", top: "45%", left: "60%" },
      { id: "manga_der", num: 2, label: "Manga Derecha", top: "45%", left: "60%" },
    ]
  }
};
const ESPALDA_PARTS = ["espalda_alta", "espalda_media", "espalda_baja"];
const ZONE_LABELS = Object.fromEntries(
  Object.values(DESIGN_VIEWS).flatMap((v) => v.zones.map((z) => [z.id, z.label]))
);
const SALE_STATES = [
  { id: "en_curso", label: "En curso", dot: "bg-blue-500", chip: "bg-blue-100 text-blue-700", icon: Clock },
  { id: "en_espera_retiro", label: "En espera de retiro", dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700", icon: PackageCheck },
  { id: "cerrada", label: "Cerrada", dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
];
const NAV = [
  { id: "home", label: "Home", icon: Home, roles: ["vendedor", "master"] },
  { id: "sell", label: "Ventas", icon: ShoppingBag, roles: ["vendedor", "master"] }, // <-- Cambiado de "Vender" a "Ventas"
  { id: "seguimiento", label: "Pedidos", icon: ClipboardList, roles: ["vendedor", "master"] },
  { id: "clientes", label: "Clientes", icon: Users, roles: ["vendedor", "master"] },
  { id: "vendedores", label: "Vendedores", icon: UserCog, roles: ["master"] },
  { id: "caja", label: "Caja", icon: Wallet, roles: ["vendedor", "master"] }, // <-- Agregado aquí
  { id: "resumen", label: "Resumen Financiero", icon: BarChart3, roles: ["master"] },
  { id: "reportes", label: "Reportes / Estadísticas", icon: TrendingUp, roles: ["master"] },
];
const NAV_SOON = [
  { id: "inventario", label: "Inventario / Stock", icon: Boxes },
  { id: "cuentas", label: "Cuentas por cobrar", icon: FileText },
  { id: "gastos", label: "Gastos", icon: FileText },
];
// ===CATALOG_END===

// ===HELPERS_START===
const usd = (n) => `$${(n || 0).toFixed(2)}`;
const bs = (n) => `Bs ${(n || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Formato venezolano: punto = miles, coma = decimal (ej. "1.250,50" -> 1250.5).
const formatVEDecimal = (n) => (n || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseVEDecimal = (str) => {
  const cleaned = String(str ?? "").trim().replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};
const uid = () => Math.random().toString(36).slice(2, 9);
// UUID real (no el uid() corto de arriba): lo necesitan las columnas uuid de Postgres,
// como pagos.order_payment_id, generado client-side para poder revertir el pago exacto.
const newUuid = () => crypto.randomUUID();
// Supabase Auth exige email; el login real de la app es por cédula. Este email
// sintético nunca se muestra ni se tipea — solo vincula la cédula con auth.users.
const authEmailFor = (cedula) => `${cedula.trim().toLowerCase()}@zappostore.local`;
const measureOf = (it) => Number(it.cantidad) || 0;
const lineTotal = (it) => measureOf(it) * (Number(it.price) || 0);
const medida = (it) => `Talla ${it.talla} · ${it.cantidad}u`;
const designEntries = (it) => Object.entries(it.designData || {}).filter(([, d]) => (d.photos && d.photos.length > 0) || d.notes);
const payConverted = (pay, rate) => {
  const m = PAY_METHODS.find((x) => x.id === pay.method);
  const paid = Number(pay.paid) || 0;
  return m && m.currency === "VES" ? paid / rate : paid;
};
const fmtTime = (iso) => new Date(iso).toLocaleString("es-VE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const monthKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
function saleStatus(items) {
  if (!items.length) return "en_curso";
  if (items.every((i) => i.estado === "cerrado")) return "cerrada";
  if (items.every((i) => i.estado === "cerrado" || i.estado === "en_espera_retiro")) return "en_espera_retiro";
  return "en_curso";
}
const pendientesCierre = (items) => items.filter((i) => i.estado !== "cerrado").length;
// Un producto solo puede pasar a "Cerrado" si TODOS sus procesos de Taller/Diseño
// elegidos ya están marcados como completados (Kanban). Si no eligió ningún proceso,
// no hay nada que completar y queda libre (every() de un array vacío es true).
const proceduresComplete = (it) =>
  it.procesos_taller.every((p) => it.procesos_taller_done.includes(p)) &&
  it.procesos_diseno.every((p) => it.procesos_diseno_done.includes(p));
function optimizeImage(file, dim = 260) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, dim / Math.max(img.width, img.height));
        const w = Math.round(img.width * s), h = Math.round(img.height * s);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject; img.src = e.target.result;
    };
    r.onerror = reject; r.readAsDataURL(file);
  });
}

// ---- Caja: helpers de pagos y turnos ----
function openCajaOf(cajas, vendorId) { return cajas.find((c) => c.vendorId === vendorId && !c.closedAt) || null; }
function salesOfCaja(sales, cajaId) { return sales.filter((s) => s.cajaId === cajaId); }
function paymentsOfCaja(payments, cajaId) { return payments.filter((p) => p.cajaId === cajaId); }
function cajaTotals(sales, payments, cajaId) {
  const mySales = salesOfCaja(sales, cajaId);
  const myPayments = paymentsOfCaja(payments, cajaId);
  const salesById = Object.fromEntries(mySales.map((s) => [s.id, s]));
  const isClosed = (s) => saleStatus(s.data.items) === "cerrada";
  const vendido = mySales.reduce((s, x) => s + x.data.total, 0);
  const cobrado = myPayments.reduce((s, p) => s + p.amountUSD, 0);
  const porMetodo = PAY_METHODS.reduce((acc, m) => { acc[m.id] = myPayments.filter((p) => p.method === m.id).reduce((s, p) => s + p.amountUSD, 0); return acc; }, {});
  const asegurado = myPayments.filter((p) => salesById[p.saleId] && isClosed(salesById[p.saleId])).reduce((s, p) => s + p.amountUSD, 0);
  const senas = Math.max(0, cobrado - asegurado);
  const comprometido = mySales.filter((s) => !isClosed(s)).reduce((s, x) => s + (x.data.balance || 0), 0);
  return { vendido, cobrado, porMetodo, asegurado, senas, comprometido };
}
// ===HELPERS_END===

function Wordmark({ size = "text-2xl", flicker = false }) {
  return (
    <>
      {flicker && (
        <style>{`
          .zappo-flicker { animation: zappoFlicker 5s infinite; }
          @keyframes zappoFlicker { 0%,18%,20%,52%,54%,100%{opacity:1;} 19%,53%{opacity:0.82;} }
          @media (prefers-reduced-motion: reduce){ .zappo-flicker{ animation:none; } }
        `}</style>
      )}
      <span className={`${size} font-extrabold tracking-tight ${flicker ? "zappo-flicker" : ""}`}
        style={{ color: "#ff6b6b", textShadow: "0 0 3px #ff8f8f, 0 0 7px #ff5c5c, 0 0 14px #e23d3d" }}>
        ZappoStore
      </span>
    </>
  );
}

function BarChart({ data, color = "#10b981" }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = 240 / Math.max(1, data.length);
  return (
    <svg viewBox="0 0 240 84" className="w-full">
      {data.map((d, i) => {
        const h = (d.value / max) * 58;
        return (
          <g key={i}>
            <rect x={i * bw + 5} y={68 - h} width={bw - 10} height={h} rx="2" fill={color} />
            <text x={i * bw + bw / 2} y={80} fontSize="7" textAnchor="middle" fill="#94a3b8">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ShirtSVG() {
  return (
    <svg viewBox="0 0 120 140" className="w-full h-full">
      <path d="M44 8 Q60 22 76 8 L104 26 L94 48 L80 42 L80 128 Q60 134 40 128 L40 42 L26 48 L16 26 Z"
        fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" strokeLinejoin="round" />
      <path d="M44 8 Q60 22 76 8" fill="none" stroke="#cbd5e1" strokeWidth="2" />
    </svg>
  );
}
function ShirtSideSVG() {
  return (
    <svg viewBox="0 0 120 140" className="w-full h-full">
      <path d="M 45 10 Q 35 30 35 130 L 75 130 L 75 10 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" strokeLinejoin="round" />
      <path d="M 40 10 Q 55 15 75 15 L 80 75 Q 60 80 40 75 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function ZonePicker({ selected, onToggle, activeTab, onTabChange, photoCounts = {} }) {
  const view = DESIGN_VIEWS[activeTab];
  return (
    <div className="space-y-2">
      <div className="flex gap-1 justify-center bg-slate-100 rounded-xl p-1">
        {Object.entries(DESIGN_VIEWS).map(([id, v]) => (
          <button key={id} type="button" data-testid={`design-tab-${id}`} onClick={() => onTabChange(id)}
            className={`flex-1 text-xs font-semibold rounded-lg py-1.5 ${activeTab === id ? "bg-white text-slate-800 shadow" : "text-slate-500"}`}>
            {v.label}{photoCounts[id] > 0 ? ` (${photoCounts[id]} 📸)` : ""}
          </button>
        ))}
      </div>
      <div className="relative mx-auto" style={{ width: 140, height: 160 }}>
        {activeTab === "mangas" ? <ShirtSideSVG /> : <ShirtSVG />}
        {activeTab === "mangas" ? (
          <button data-testid="zone-manga_izq" onClick={() => onToggle("manga_izq")}
            style={{ position: "absolute", top: "45%", left: "60%", transform: "translate(-50%,-50%)" }}
            className={`w-6 h-6 flex items-center justify-center rounded-full border-2 text-xs font-bold ${selected.includes("manga_izq") ? "bg-emerald-500 border-emerald-600 text-white" : "bg-white border-slate-300 text-slate-500"}`}>
            1
          </button>
        ) : (
          view.zones.map((z) => {
            const on = selected.includes(z.id);
            return (
              <button key={z.id} data-testid={`zone-${z.id}`} onClick={() => onToggle(z.id)}
                style={{ position: "absolute", top: z.top, left: z.left, transform: "translate(-50%,-50%)" }}
                className={`w-6 h-6 flex items-center justify-center rounded-full border-2 text-xs font-bold ${on ? "bg-emerald-500 border-emerald-600 text-white" : "bg-white border-slate-300 text-slate-500"}`}>
                {z.num}
              </button>
            );
          })
        )}
      </div>
      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold text-slate-400 uppercase">Toca la lista para seleccionar:</span>
        <div className="grid grid-cols-2 gap-2">
          {view.zones.map((z) => {
            const on = selected.includes(z.id);
            return (
              <button key={z.id} type="button" onClick={() => onToggle(z.id)}
                className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-2 py-1.5 border ${on ? "bg-emerald-500 border-emerald-600 text-white" : "bg-white border-slate-300 text-slate-600"}`}>
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${on ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"}`}>{z.num}</span>
                {z.label}
              </button>
            );
          })}
          {activeTab === "espalda" && (() => {
            const on = ESPALDA_PARTS.every((p) => selected.includes(p));
            return (
              <button type="button" onClick={() => onToggle("espalda_completa")}
                className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-2 py-1.5 border ${on ? "bg-emerald-500 border-emerald-600 text-white" : "bg-white border-slate-300 text-slate-600"}`}>
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${on ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"}`}>4</span>
                Esp. Completa
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function Sidebar({ route, setRoute, session, onLogout }) {
  return (
    <aside className="w-72 shrink-0 bg-slate-900 text-white h-full flex flex-col overflow-auto p-4" data-testid="sidebar">
      <div className="flex items-center gap-2 mb-5">
        <img src={FROG_LOGO} alt="" className="w-9 h-9 object-contain" />
        <Wordmark size="text-lg" />
      </div>
      <div className="flex items-center gap-2 bg-slate-800 rounded-xl p-3 mb-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${session.role === "master" ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"}`}>
          {session.role === "master" ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">{session.name}</p>
          <p className="text-[11px] text-slate-400">{session.role === "master" ? "Supervisor" : "Vendedor"} · {session.cedula}</p>
        </div>
      </div>
      <p className="text-[10px] font-semibold text-slate-500 uppercase px-1 mb-1">Módulos</p>
      {NAV.filter((n) => n.roles.includes(session.role)).map((n) => {
        const Icon = n.icon; const on = route === n.id;
        return (
          <button key={n.id} data-testid={`nav-${n.id}`} onClick={() => setRoute(n.id)}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm mb-0.5 ${on ? "bg-emerald-500 text-white" : "text-slate-200 hover:bg-slate-800"}`}>
            <Icon className="w-4 h-4" /> {n.label}
          </button>
        );
      })}
      <p className="text-[10px] font-semibold text-slate-500 uppercase px-1 mt-4 mb-1">Próximamente</p>
      {NAV_SOON.map((n) => {
        const Icon = n.icon;
        return (
          <div key={n.id} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm mb-0.5 text-slate-500">
            <Icon className="w-4 h-4" /> {n.label}
            <span className="ml-auto text-[9px] bg-slate-800 rounded px-1.5 py-0.5">pronto</span>
          </div>
        );
      })}
      <button data-testid="btn-logout" onClick={onLogout} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm mt-4 text-rose-300 hover:bg-slate-800">
        <LogOut className="w-4 h-4" /> Cerrar sesión
      </button>
    </aside>
  );
}

function TopBar({ title, right }) {
  return (
    <header className="bg-slate-900 text-white sticky top-0 z-20">
      <div className="px-4 py-3 flex items-center gap-2">
        <img src={FROG_LOGO} alt="" className="w-7 h-7 object-contain" />
        <p className="text-sm font-bold flex-1">{title}</p>
        {right}
      </div>
    </header>
  );
}

function LoginScreen({ mode, onLogin, onSwitch }) {
  const isMaster = mode === "master";
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!cedula.trim() || !password.trim()) return setError("Completa cédula y contraseña.");
    setLoading(true);
    const res = await onLogin(cedula.trim(), password);
    setLoading(false);
    if (res && res.error) setError(res.error);
  };
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-5" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <img src={FROG_LOGO} alt="ZappoStore" className="w-28 h-28 object-contain mb-1 drop-shadow-xl" />
          <Wordmark size="text-4xl" flicker />
          <p className={`text-sm mt-1 ${isMaster ? "text-rose-300" : "text-slate-400"}`}>
            {isMaster ? "Acceso Supervisor (Master)" : "Login de vendedor"}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">{isMaster ? "Usuario master" : "Cédula"}</label>
            <div className="flex items-center border border-slate-200 rounded-xl px-3">
              {isMaster ? <ShieldCheck className="w-4 h-4 text-slate-400" /> : <User className="w-4 h-4 text-slate-400" />}
              <input data-testid="input-cedula" placeholder={isMaster ? "master" : "V-12345678"} value={cedula}
                onChange={(e) => { setCedula(e.target.value); setError(""); }} className="flex-1 py-3 px-2 text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Contraseña</label>
            <div className="flex items-center border border-slate-200 rounded-xl px-3">
              <Lock className="w-4 h-4 text-slate-400" />
              <input data-testid="input-password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && submit()} className="flex-1 py-3 px-2 text-sm outline-none" />
              <button data-testid="btn-toggle-password" onClick={() => setShowPw((s) => !s)} className="text-slate-400">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p data-testid="login-error" className="text-xs text-rose-500">{error}</p>}
          <button data-testid="btn-login" onClick={submit} disabled={loading}
            className={`w-full text-white font-bold rounded-xl py-3 text-sm disabled:opacity-60 ${isMaster ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"}`}>{loading ? "Ingresando..." : "Ingresar"}</button>
        </div>
        <button data-testid="btn-switch-login" onClick={onSwitch} className="w-full text-center text-slate-400 text-xs mt-4 underline">
          {isMaster ? "Volver a login de vendedor" : "Entrar como Supervisor (Master)"}
        </button>
        {!isMaster && <p className="text-center text-slate-500 text-xs mt-2">El Usuario Es Tu Número de Cédula</p>}
      </div>
    </div>
  );
}

function DashCard({ label, value, sub, icon: Icon, tone = "white", testid, wide }) {
  const tones = {
    white: "bg-white border-slate-200",
    emerald: "bg-emerald-50 border-emerald-200",
    rose: "bg-rose-50 border-rose-200",
  };
  const labelTones = { white: "text-slate-400", emerald: "text-emerald-600", rose: "text-rose-600" };
  const valueTones = { white: "text-slate-800", emerald: "text-emerald-700", rose: "text-rose-700" };
  return (
    <div className={`rounded-xl border p-3 shadow-sm ${tones[tone]} ${wide ? "col-span-2" : ""}`} data-testid={testid}>
      <p className={`text-[10px] uppercase font-semibold flex items-center gap-1 ${labelTones[tone]}`}>{Icon && <Icon className="w-3 h-3" />} {label}</p>
      <p className={`text-xl font-bold mt-0.5 ${valueTones[tone]}`}>{value}</p>
      {sub && <p className={`text-[11px] mt-0.5 ${labelTones[tone]}`}>{sub}</p>}
    </div>
  );
}

// Dashboard gerencial por rol. La navegación operativa (Vender, Seguimiento, Clientes,
// Vendedores) ya vive 1:1 en el Sidebar — este Home ya no la duplica, es solo lectura.
function HomeScreen({ session, sales, payments, cajas }) {
  const isMaster = session.role === "master";
  const todayKey = new Date().toDateString();

  if (isMaster) {
    const ventasHoyUSD = sales.filter((s) => new Date(s.createdAt).toDateString() === todayKey).reduce((s, x) => s + x.data.total, 0);
    const turnosAbiertos = cajas.filter((c) => !c.closedAt).length;
    // "Cuentas por pagar a vendedores": suma histórica de comisiones generadas — todavía
    // no existe un mecanismo de liquidación/"comisión pagada" (fuera de alcance por ahora).
    const comisionesTotal = sales.reduce((s, x) => s + (x.data.comisionMonto || 0), 0);
    const deliverySales = sales.filter((s) => s.data.hasDelivery);
    const deliveryFeeTotal = deliverySales.reduce((s, x) => s + (x.data.deliveryFee || 0), 0);
    return (
      <div className="min-h-screen bg-slate-50" style={{ fontFamily: "system-ui, sans-serif" }}>
        <TopBar title="ZappoStore" right={<Wordmark size="text-base" />} />
        <main className="max-w-lg mx-auto px-4 py-5 space-y-3">
          <p className="text-slate-500 text-sm">Hola, <span className="font-semibold text-slate-800">{session.name}</span>.</p>
          <div className="grid grid-cols-2 gap-3" data-testid="dashboard-master">
            <DashCard testid="kpi-ventas-hoy" label="Ventas del día" value={usd(ventasHoyUSD)} icon={DollarSign} />
            <DashCard testid="kpi-turnos-abiertos" label="Turnos abiertos" value={turnosAbiertos} icon={Wallet} />
            <DashCard testid="kpi-comisiones-pendientes" tone="rose" wide label="Cuentas por pagar a vendedores" value={usd(comisionesTotal)}
              icon={Percent} sub="Comisiones generadas, histórico — sin liquidaciones registradas todavía" />
            <DashCard testid="kpi-delivery" wide label="Delivery" icon={Truck}
              value={`${deliverySales.length} venta(s)`} sub={`${usd(deliveryFeeTotal)} cobrados en delivery`} />
          </div>
        </main>
      </div>
    );
  }

  const mySales = sales.filter((s) => s.vendorId === session.id);
  const myOpenCaja = openCajaOf(cajas, session.id);
  const miTurnoVendido = myOpenCaja ? cajaTotals(sales, payments, myOpenCaja.id).vendido : 0;
  const misComisiones = mySales.reduce((s, x) => s + (x.data.comisionMonto || 0), 0);
  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "system-ui, sans-serif" }}>
      <TopBar title="ZappoStore" right={<Wordmark size="text-base" />} />
      <main className="max-w-lg mx-auto px-4 py-5 space-y-3">
        <p className="text-slate-500 text-sm">Hola, <span className="font-semibold text-slate-800">{session.name}</span>.</p>
        <div className="grid grid-cols-2 gap-3" data-testid="dashboard-vendedor">
          <DashCard testid="kpi-mi-turno" wide label="Vendido en tu turno" icon={Wallet}
            value={myOpenCaja ? usd(miTurnoVendido) : "—"} sub={!myOpenCaja ? "No tenés un turno abierto" : null} />
          <DashCard testid="kpi-mi-comision" wide tone="emerald" label="Tu comisión acumulada" icon={Percent} value={usd(misComisiones)} />
        </div>
      </main>
    </div>
  );
}

function ItemEditForm({ draft, onPatch, onSave, onCancel, isNew }) {
  const fileRef = useRef(null);
  const showDesign = draft.procesos_taller.length > 0 || draft.procesos_diseno.length > 0
    || Object.values(draft.designData).some((d) => d.photos.length > 0 || d.notes);
  const [designOpen, setDesignOpen] = useState(showDesign);
  const [designTab, setDesignTab] = useState("frente");
  const [opOpen, setOpOpen] = useState(false);
  const [tallerOpen, setTallerOpen] = useState(false);
  const [disenoOpen, setDisenoOpen] = useState(false);
  const toggleProcesoTaller = (id) => onPatch({ procesos_taller: draft.procesos_taller.includes(id) ? draft.procesos_taller.filter((x) => x !== id) : [...draft.procesos_taller, id] });
  const toggleProcesoDiseno = (id) => onPatch({ procesos_diseno: draft.procesos_diseno.includes(id) ? draft.procesos_diseno.filter((x) => x !== id) : [...draft.procesos_diseno, id] });
  const toggleZone = (z) => {
    if (z === "espalda_completa") {
      const allOn = ESPALDA_PARTS.every((p) => draft.zones.includes(p));
      const newZones = allOn
        ? draft.zones.filter((x) => !ESPALDA_PARTS.includes(x))
        : [...draft.zones, ...ESPALDA_PARTS.filter((p) => !draft.zones.includes(p))];
      onPatch({ zones: newZones });
      return;
    }
    onPatch({ zones: draft.zones.includes(z) ? draft.zones.filter((x) => x !== z) : [...draft.zones, z] });
  };
  const onDesignPhotos = async (files) => {
    if (!files || !files.length) return;
    const dataUrls = await Promise.all(Array.from(files).map((f) => optimizeImage(f)));
    const imgs = dataUrls.map((url) => ({ path: null, url })); // path null = todavía no subida a Storage (se sube al guardar)
    onPatch({ designData: { ...draft.designData, [designTab]: { ...draft.designData[designTab], photos: [...draft.designData[designTab].photos, ...imgs] } } });
  };
  const removeDesignPhoto = (idx) => {
    onPatch({ designData: { ...draft.designData, [designTab]: { ...draft.designData[designTab], photos: draft.designData[designTab].photos.filter((_, i) => i !== idx) } } });
  };
  const patchDesignNotes = (notes) => onPatch({ designData: { ...draft.designData, [designTab]: { ...draft.designData[designTab], notes } } });
  const canSave = draft.name.trim() && Number(draft.price) >= 0;
  return (
    <div className="space-y-3 pb-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{draft.emoji}</span>
          <input data-testid="edit-name" value={draft.name} placeholder="Nombre del producto"
            onChange={(e) => onPatch({ name: e.target.value })}
            className="flex-1 text-sm font-semibold text-slate-800 outline-none border-b border-transparent focus:border-emerald-400" />
        </div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase mt-3 mb-1.5">Talla</p>
        <div className="flex items-center gap-1" data-testid="talla-selector">
          {TALLAS.map((t) => (
            <button key={t} data-testid={`talla-${t}`} onClick={() => onPatch({ talla: t })}
              className={`text-xs font-medium rounded-lg px-2 py-1 border ${draft.talla === t ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-500"}`}>{t}</button>
          ))}
        </div>
        <div className="mt-3">
          <label className="text-[11px] font-semibold text-slate-400 uppercase mb-1 block">Cantidad</label>
          <input data-testid="input-cantidad" type="number" min="1" value={draft.cantidad}
            onChange={(e) => onPatch({ cantidad: Math.max(1, Number(e.target.value) || 1) })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
        </div>
        <div className="mt-3">
          <label className="text-[11px] font-semibold text-slate-400 uppercase mb-1 block">Color de la prenda</label>
          <input data-testid="input-color" type="text" placeholder="Ej. Gris plomo" value={draft.color}
            onChange={(e) => onPatch({ color: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center border border-slate-200 rounded-lg px-2 flex-1">
            <span className="text-xs text-slate-400">$ / u</span>
            <input data-testid="input-price" type="number" value={draft.price} onChange={(e) => onPatch({ price: e.target.value })} className="flex-1 py-2 px-1 text-sm text-right font-medium outline-none" />
          </div>
          <span className="text-sm font-bold text-slate-800">{usd(lineTotal(draft))}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button type="button" data-testid="toggle-operacion" onClick={() => setOpOpen((o) => !o)} className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Operación · {TIPOS_OPERACION.find((t) => t.id === draft.tipo_operacion).label}</span>
          {opOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {opOpen && (
          <div className="border-t border-slate-100 p-3 bg-slate-50/60">
            <div className="grid grid-cols-2 gap-1.5" data-testid="operacion-selector">
              {TIPOS_OPERACION.map((t) => {
                const on = draft.tipo_operacion === t.id;
                return (
                  <button key={t.id} type="button" data-testid={`operacion-${t.id}`} onClick={() => onPatch({ tipo_operacion: t.id })}
                    className={`rounded-lg py-2 border text-xs font-medium ${on ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button type="button" data-testid="toggle-taller" onClick={() => setTallerOpen((o) => !o)} className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" /> Taller {draft.procesos_taller.length > 0 && `(${draft.procesos_taller.length})`}</span>
          {tallerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {tallerOpen && (
          <div className="border-t border-slate-100 p-3 bg-slate-50/60">
            <div className="grid grid-cols-2 gap-1.5" data-testid="taller-selector">
              {PROCESOS_TALLER.map((p) => {
                const on = draft.procesos_taller.includes(p.id);
                return (
                  <button key={p.id} type="button" data-testid={`taller-${p.id}`} onClick={() => toggleProcesoTaller(p.id)}
                    className={`rounded-lg py-2 px-2 border text-xs font-medium ${on ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button type="button" data-testid="toggle-diseno" onClick={() => setDisenoOpen((o) => !o)} className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" /> Diseño {draft.procesos_diseno.length > 0 && `(${draft.procesos_diseno.length})`}</span>
          {disenoOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {disenoOpen && (
          <div className="border-t border-slate-100 p-3 bg-slate-50/60">
            <div className="grid grid-cols-2 gap-1.5" data-testid="diseno-selector">
              {PROCESOS_DISENO.map((p) => {
                const on = draft.procesos_diseno.includes(p.id);
                return (
                  <button key={p.id} type="button" data-testid={`diseno-${p.id}`} onClick={() => toggleProcesoDiseno(p.id)}
                    className={`rounded-lg py-2 px-2 border text-xs font-medium ${on ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button data-testid="toggle-design" onClick={() => setDesignOpen((o) => !o)} className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5"><Shirt className="w-3.5 h-3.5" /> Diseño y referencias {draft.zones.length > 0 && `(${draft.zones.length})`}</span>
          {designOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {designOpen && (
          <div className="border-t border-slate-100 p-3 bg-slate-50/60 space-y-3">
            <p className="text-xs text-slate-500 text-center">Toca dónde va el diseño</p>
            <ZonePicker selected={draft.zones} onToggle={toggleZone} activeTab={designTab} onTabChange={setDesignTab}
              photoCounts={Object.fromEntries(Object.keys(draft.designData).map((k) => [k, draft.designData[k].photos.length]))} />

            <div className="space-y-2" data-testid={`design-photos-${designTab}`}>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Fotos · {DESIGN_VIEWS[designTab].label}</p>
              {draft.designData[designTab].photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {draft.designData[designTab].photos.map((photo, i) => (
                    <div key={i} className="relative">
                      <img src={photo.url} alt="diseño" className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
                      <button data-testid={`remove-design-photo-${designTab}-${i}`} onClick={() => removeDesignPhoto(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={fileRef} data-testid={`design-file-${designTab}`} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onDesignPhotos(e.target.files)} />
              <button data-testid="btn-attach-design" onClick={() => fileRef.current && fileRef.current.click()} className="w-full border border-dashed border-slate-300 rounded-lg py-2.5 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:border-emerald-400">
                <Upload className="w-3.5 h-3.5" /> Adjuntar foto(s)
              </button>
            </div>

            <textarea data-testid={`design-notes-${designTab}`} placeholder={`Notas para ${DESIGN_VIEWS[designTab].label}`} value={draft.designData[designTab].notes} rows={2}
              onChange={(e) => patchDesignNotes(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-emerald-400 resize-none" />
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Estado de este producto</p>
        {!proceduresComplete(draft) && (
          <p className="text-[11px] text-amber-600 mb-1.5">Faltan procesos de Taller/Diseño por completar (Kanban en Seguimiento) para poder cerrarlo.</p>
        )}
        <div className="grid grid-cols-3 gap-1.5" data-testid="estado-selector">
          {ITEM_STATES.map((s) => {
            const blocked = s.id === "cerrado" && !proceduresComplete(draft);
            return (
            <button key={s.id} data-testid={`estado-${s.id}`} onClick={() => onPatch({ estado: s.id })} disabled={blocked}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-2 border text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed ${draft.estado === s.id ? "border-slate-900 bg-slate-50" : "border-slate-200 text-slate-500"}`}>
              <span className={`w-2 h-2 rounded-full ${s.dot}`} /> {s.label}
            </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 sticky bottom-0 bg-slate-50 pt-1">
        <button data-testid="btn-cancel-edit" onClick={onCancel} className="flex-1 border border-slate-200 rounded-xl py-3 text-sm font-medium text-slate-500">Cancelar</button>
        <button data-testid="btn-save-item" onClick={onSave} disabled={!canSave}
          className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl py-3 text-sm disabled:opacity-40 flex items-center justify-center gap-1.5">
          <Check className="w-4 h-4" /> {isNew ? "Agregar al carrito" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function RateInput({ rate, onChange, onCommit }) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(formatVEDecimal(rate));
  useEffect(() => { if (!focused) setRaw(formatVEDecimal(rate)); }, [rate, focused]);
  return (
    <input
      data-testid="input-rate"
      type="text"
      inputMode="decimal"
      value={focused ? raw : formatVEDecimal(rate)}
      onFocus={() => { setFocused(true); setRaw(formatVEDecimal(rate)); }}
      onChange={(e) => { setRaw(e.target.value); const n = parseVEDecimal(e.target.value); if (n > 0) onChange(n); }}
      onBlur={(e) => { setFocused(false); const n = parseVEDecimal(e.target.value); if (n > 0) { onChange(n); onCommit && onCommit(n); } }}
      className="w-24 bg-transparent text-emerald-400 font-bold text-xs outline-none text-right"
    />
  );
}

function PaymentPanel({ total, rate, payments, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false);
  const [method, setMethod] = useState("efectivo_usd");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");

  const paidUSD = payments.reduce((s, p) => s + p.amountUSD, 0);
  const balance = Math.max(0, total - paidUSD);
  const isPaid = balance <= 0.009;
  const methodObj = PAY_METHODS.find((m) => m.id === method);
  const refMissing = methodObj && methodObj.needsRef && !reference.trim();

  const addPayment = () => {
    const raw = Number(amount) || 0;
    if (raw <= 0 || refMissing) return;
    const amountUSD = payConverted({ method, paid: raw }, rate);
    onAdd({ id: newUuid(), method, paid: raw, reference, amountUSD, currency: methodObj.currency });
    setAmount(""); setReference(""); setAdding(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2" data-testid="order-payment-panel">
      <p className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5" /> Pago</p>
      <div className="flex justify-between items-baseline text-sm">
        <span className="text-slate-500">Total del pedido</span>
        <span className="font-bold text-slate-800" data-testid="payment-total">{usd(total)} · <span className="text-emerald-600">{bs(total * rate)}</span></span>
      </div>

      {payments.length > 0 && (
        <div className="space-y-1" data-testid="payments-list">
          {payments.map((p) => {
            const m = PAY_METHODS.find((x) => x.id === p.method);
            const Icon = m.icon;
            return (
              <div key={p.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2 py-1.5">
                <span className="text-slate-600 flex items-center gap-1"><Icon className="w-3 h-3" /> {m.label}{p.reference ? ` · #${p.reference}` : ""}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">{usd(p.amountUSD)}</span>
                  <button data-testid={`remove-payment-${p.id}`} onClick={() => onRemove(p.id)} className="text-slate-300 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!adding ? (
        <button data-testid="btn-add-payment" onClick={() => setAdding(true)} className="w-full border border-dashed border-slate-300 rounded-lg py-2 text-xs font-medium text-slate-500 hover:border-emerald-400 hover:text-emerald-600 flex items-center justify-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Agregar método de pago
        </button>
      ) : (
        <div className="border border-slate-200 rounded-lg p-2.5 space-y-2 bg-slate-50/60">
          <div className="grid grid-cols-4 gap-1.5" data-testid="new-payment-methods">
            {PAY_METHODS.map((m) => {
              const Icon = m.icon; const on = method === m.id;
              return (
                <button key={m.id} data-testid={`new-payment-${m.id}`} onClick={() => setMethod(m.id)}
                  className={`flex flex-col items-center gap-0.5 rounded-lg py-2 border text-[10px] font-medium ${on ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
                  <Icon className="w-4 h-4" /> {m.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-slate-200 rounded-lg px-3 flex-1">
              <span className="text-xs text-slate-400">{methodObj.currency === "VES" ? "Bs" : "$"}</span>
              <input data-testid="input-new-payment-amount" type="number" placeholder="Monto" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 py-2 px-2 text-sm outline-none" />
            </div>
            <button data-testid="btn-pay-remaining" onClick={() => setAmount(methodObj.currency === "VES" ? (balance * rate).toFixed(2) : balance.toFixed(2))} className="text-xs font-medium bg-slate-900 text-white rounded-lg px-3 py-2">Resto</button>
          </div>
          {methodObj.needsRef && (
            <input data-testid="input-new-payment-reference" placeholder="N° de referencia (obligatorio)" value={reference} onChange={(e) => setReference(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${refMissing ? "border-rose-300" : "border-slate-200 focus:border-emerald-400"}`} />
          )}
          <div className="flex gap-2">
            <button data-testid="btn-cancel-payment" onClick={() => { setAdding(false); setAmount(""); setReference(""); }} className="flex-1 border border-slate-200 rounded-lg py-2 text-xs font-medium text-slate-500">Cancelar</button>
            <button data-testid="btn-confirm-payment" onClick={addPayment} disabled={!amount || Number(amount) <= 0 || refMissing}
              className="flex-[2] bg-emerald-500 text-white font-bold rounded-lg py-2 text-xs disabled:opacity-40">Agregar</button>
          </div>
        </div>
      )}

      <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${isPaid ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`} data-testid="order-balance">
        <span className={`text-xs font-semibold ${isPaid ? "text-emerald-700" : "text-rose-700"}`}>{isPaid ? "Pagado completo" : "Restante por pagar"}</span>
        {isPaid ? <Check className="w-4 h-4 text-emerald-600" /> : (
          <span className="text-right">
            <span className="block text-sm font-bold text-rose-700">{usd(balance)}</span>
            <span className="block text-[11px] text-rose-500">{bs(balance * rate)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function ProductPicker({ onPick, onClose }) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4" onClick={(e) => e.stopPropagation()} data-testid="product-picker">
        <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-slate-800">Elegir producto</h3>
          <button data-testid="btn-close-picker" onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_PRODUCTS.map((p) => (
            <button key={p.id} data-testid={`pick-${p.id}`} onClick={() => onPick(p)} className="flex flex-col items-center gap-1 bg-white border border-slate-200 rounded-xl py-3 hover:border-emerald-400 hover:bg-emerald-50">
              <span className="text-2xl">{p.emoji}</span>
              <span className="text-[11px] font-medium text-slate-600 text-center leading-tight px-1">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CajaRequiredScreen({ onGoCaja }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm text-center space-y-3" data-testid="caja-required-screen">
        <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto"><Wallet className="w-7 h-7" /></div>
        <p className="text-lg font-bold text-slate-800">Abrí tu caja primero</p>
        <p className="text-sm text-slate-500">Para empezar a vender necesitás abrir tu turno de caja. Así queda registrado en qué turno se toma cada pedido.</p>
        <button data-testid="btn-goto-caja" onClick={onGoCaja} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl py-3 text-sm">Ir a Caja</button>
      </div>
    </div>
  );
}

function SellScreen({ session, rate, setRate, onRateBlur, initialSale, onExit, onSaved }) {
  const editingExisting = !!initialSale;
  const [online, setOnline] = useState(true);
  const [items, setItems] = useState(initialSale ? initialSale.data.items : []);
  const [client, setClient] = useState(initialSale ? { name: "", phone: "", cedula: "", direccion: "", ...initialSale.data.client } : { name: "", phone: "", cedula: "", direccion: "" });
  const [orderPayments, setOrderPayments] = useState(initialSale ? (initialSale.data.orderPayments || []) : []);
  const [hasDelivery, setHasDelivery] = useState(initialSale ? !!initialSale.data.hasDelivery : false);
  const [deliveryFee, setDeliveryFee] = useState(initialSale ? (initialSale.data.deliveryFee || 0) : 0);
  const [deliveryInTotal, setDeliveryInTotal] = useState(initialSale ? initialSale.data.deliveryIncludedInTotal !== false : true);
  const [comisionPorcentaje, setComisionPorcentaje] = useState(initialSale ? (initialSale.data.comisionPorcentaje || 0) : 0);
  const [draft, setDraft] = useState(null);
  const [isNew, setIsNew] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [showComanda, setShowComanda] = useState(false);
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => items.reduce((s, i) => s + lineTotal(i), 0), [items]);
  // Delivery lo paga el cliente Y se suma al total SOLO si deliveryInTotal está tildado
  // (si se cobra aparte, ej. directo al repartidor, no debe sumar al total facturado).
  // Comisión es interno del vendedor y se calcula SOLO sobre el total de productos.
  const grandTotal = useMemo(() => total + (hasDelivery && deliveryInTotal ? Number(deliveryFee) || 0 : 0), [total, hasDelivery, deliveryInTotal, deliveryFee]);
  const comisionMonto = useMemo(() => (total * (Number(comisionPorcentaje) || 0)) / 100, [total, comisionPorcentaje]);
  const paidUSD = useMemo(() => orderPayments.reduce((s, p) => s + p.amountUSD, 0), [orderPayments]);
  const balance = Math.max(0, grandTotal - paidUSD);
  const vStatus = saleStatus(items);
  const pend = pendientesCierre(items);
  const hasPresupuesto = items.some((i) => i.tipo_operacion === "presupuesto");
  // Si el carrito mezcla "venta" y "presupuesto", el guard de saveSale corta el guardado
  // COMPLETO (ni siquiera se guardan los productos de venta real) — se avisa explícito
  // porque solo cambiar el botón a "Imprimir Presupuesto" no deja clara esa consecuencia.
  const isMixedCart = hasPresupuesto && items.some((i) => i.tipo_operacion !== "presupuesto");
  // Una venta real necesita nombre + teléfono del cliente (los usa el sistema para
  // identificar/de-duplicar en findOrCreateClient); un presupuesto no se guarda como
  // pedido, así que puede seguir imprimiéndose sin datos de cliente.
  const clientDataMissing = !hasPresupuesto && !(client.name.trim() && client.phone.trim());

  const blank = (p) => ({
    id: uid(), productId: p.id, name: p.id === "otro" ? "" : p.name, emoji: p.emoji,
    talla: "M", cantidad: 1, color: "", price: p.price, tipo_operacion: "venta",
    procesos_taller: [], procesos_diseno: [], procesos_taller_done: [], procesos_diseno_done: [], zones: [],
    designData: { frente: { photos: [], notes: "" }, espalda: { photos: [], notes: "" }, mangas: { photos: [], notes: "" } },
    estado: "en_curso",
  });
  const startNew = (p) => { setDraft(blank(p)); setIsNew(true); setShowPicker(false); };
  const editItem = (it) => { setDraft({ ...it }); setIsNew(false); };
  const patchDraft = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const saveDraft = () => { setItems((prev) => isNew ? [...prev, draft] : prev.map((i) => (i.id === draft.id ? draft : i))); setDraft(null); };
  const removeItem = (id) => setItems((p) => p.filter((i) => i.id !== id));
  const quickEstado = (id, estado) => setItems((p) => p.map((i) => (i.id === id ? { ...i, estado } : i)));
  const addPayment = (p) => setOrderPayments((prev) => [...prev, p]);
  const removePayment = (id) => setOrderPayments((prev) => prev.filter((p) => p.id !== id));

  const buildData = () => ({
    items, client, orderPayments, total: grandTotal, rate, paidUSD, balance,
    hasDelivery, deliveryFee: hasDelivery ? Number(deliveryFee) || 0 : 0,
    deliveryIncludedInTotal: hasDelivery ? deliveryInTotal : true,
    comisionPorcentaje: Number(comisionPorcentaje) || 0, comisionMonto,
  });
  const editing = draft !== null;

  return (
    <div className="min-h-screen bg-slate-50 pb-32" style={{ fontFamily: "system-ui, sans-serif" }}>
      <header className="bg-slate-900 text-white sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center gap-2">
          {editing ? <button data-testid="btn-cancel-header" onClick={() => setDraft(null)} className="text-slate-300"><ChevronLeft className="w-5 h-5" /></button>
            : <button data-testid="btn-exit-sell" onClick={onExit} className="text-slate-300"><ChevronLeft className="w-5 h-5" /></button>}
          <img src={FROG_LOGO} alt="" className="w-7 h-7 object-contain" />
          <div className="flex-1 leading-tight">
            <p className="text-sm font-bold">{editing ? (isNew ? "Nuevo producto" : "Editar producto") : editingExisting ? `Editar ${initialSale.folio}` : "Vender"}</p>
            <p className="text-[11px] text-slate-400">{session.name} · {session.cedula}</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1.5">
            <span className="text-[10px] text-slate-400">$=</span>
            <RateInput rate={rate} onChange={setRate} onCommit={onRateBlur} />
          </div>
          <button data-testid="btn-toggle-online" onClick={() => setOnline((o) => !o)} className={online ? "text-emerald-400" : "text-rose-400"}>{online ? <RefreshCw className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}</button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {editing ? (
          <ItemEditForm draft={draft} onPatch={patchDraft} onSave={saveDraft} onCancel={() => setDraft(null)} isNew={isNew} />
        ) : (
          <div className="space-y-4">
            {items.length === 0 ? (
              <button data-testid="btn-add-first" onClick={() => setShowPicker(true)} className="w-full bg-white border-2 border-dashed border-slate-200 rounded-xl py-10 flex flex-col items-center gap-2 text-slate-400 hover:border-emerald-400">
                <ShoppingBag className="w-7 h-7" /> <span className="text-sm font-medium">Agregar producto</span>
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5"><ShoppingBag className="w-3.5 h-3.5" /> Pedido
                    <span data-testid="cart-count" className="bg-emerald-500 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center">{items.length}</span></p>
                  <span data-testid="venta-estado" className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${SALE_STATES.find((s) => s.id === vStatus).chip}`}>{SALE_STATES.find((s) => s.id === vStatus).label}</span>
                </div>
                <div className="space-y-2" data-testid="cart">
                  {items.map((it) => (
                    <div key={it.id} className="bg-white rounded-xl border border-slate-200 p-3" data-testid={`cart-item-${it.id}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-xl">{it.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{it.name || "Sin nombre"}</p>
                          <p className="text-xs text-slate-500 capitalize">{it.color} · {medida(it)}</p>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {it.tipo_operacion === "presupuesto" && <span className="text-[9px] font-semibold uppercase bg-blue-100 text-blue-600 rounded px-1.5 py-0.5">Presupuesto</span>}
                            {it.procesos_taller.length > 0 && <span className="text-[9px] font-semibold uppercase bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">Taller ({it.procesos_taller.length})</span>}
                            {it.procesos_diseno.length > 0 && <span className="text-[9px] font-semibold uppercase bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">Diseño ({it.procesos_diseno.length})</span>}
                            {it.zones.length > 0 && <span className="text-[9px] text-emerald-600 font-medium">{it.zones.length} zona(s)</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-800">{usd(lineTotal(it))}</p>
                          <div className="flex items-center gap-1 mt-1 justify-end">
                            <button data-testid={`edit-item-${it.id}`} onClick={() => editItem(it)} className="text-slate-400 hover:text-emerald-600"><Pencil className="w-3.5 h-3.5" /></button>
                            <button data-testid={`remove-item-${it.id}`} onClick={() => removeItem(it.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-2 flex-wrap" data-testid={`quick-estado-${it.id}`}>
                        {ITEM_STATES.map((s) => {
                          const blocked = s.id === "cerrado" && !proceduresComplete(it);
                          return (
                            <button key={s.id} data-testid={`quick-estado-${it.id}-${s.id}`} onClick={() => quickEstado(it.id, s.id)} disabled={blocked}
                              title={blocked ? "Faltan procesos de Taller/Diseño por completar" : undefined}
                              className={`flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-1 border disabled:opacity-40 disabled:cursor-not-allowed ${it.estado === s.id ? "border-slate-900 bg-slate-50" : "border-slate-200 text-slate-400"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <button data-testid="btn-add-another" onClick={() => setShowPicker(true)} className="w-full border border-dashed border-slate-300 rounded-xl py-2.5 text-sm font-medium text-slate-500 hover:border-emerald-400 hover:text-emerald-600 flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" /> Agregar otro producto</button>

                <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Cliente
                    {!hasPresupuesto && <span className="text-[10px] font-normal text-slate-400 normal-case">· nombre y teléfono obligatorios para cerrar la venta</span>}
                  </p>
                  <input data-testid="input-client-name" placeholder="Nombre" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${clientDataMissing && !client.name.trim() ? "border-rose-300" : "border-slate-200 focus:border-emerald-400"}`} />
                  <div className={`flex items-center border rounded-lg px-3 focus-within:border-emerald-400 ${clientDataMissing && !client.phone.trim() ? "border-rose-300" : "border-slate-200"}`}>
                    <Phone className="w-4 h-4 text-slate-400" />
                    <input data-testid="input-client-phone" placeholder="WhatsApp / teléfono" value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} className="flex-1 py-2 px-2 text-sm outline-none" />
                  </div>
                  <input data-testid="input-client-cedula" placeholder="Cédula / RIF" value={client.cedula} onChange={(e) => setClient({ ...client, cedula: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                  <input data-testid="input-client-direccion" placeholder="Dirección" value={client.direccion} onChange={(e) => setClient({ ...client, direccion: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2" data-testid="delivery-panel">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Delivery</p>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                      <button type="button" data-testid="delivery-no" onClick={() => setHasDelivery(false)} className={`text-xs font-medium rounded-md px-3 py-1 ${!hasDelivery ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}>No</button>
                      <button type="button" data-testid="delivery-si" onClick={() => setHasDelivery(true)} className={`text-xs font-medium rounded-md px-3 py-1 ${hasDelivery ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}>Sí</button>
                    </div>
                  </div>
                  {hasDelivery && (
                    <>
                      <div className="flex items-center border border-slate-200 rounded-lg px-3">
                        <span className="text-xs text-slate-400">$</span>
                        <input data-testid="input-delivery-fee" type="number" min="0" placeholder="0.00" value={deliveryFee}
                          onChange={(e) => setDeliveryFee(e.target.value)} className="flex-1 py-2 px-2 text-sm outline-none" />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                        <input data-testid="checkbox-delivery-in-total" type="checkbox" checked={deliveryInTotal}
                          onChange={(e) => setDeliveryInTotal(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-500" />
                        Incluir en el total de la factura
                      </label>
                      {!deliveryInTotal && (
                        <p className="text-[11px] text-amber-600">El delivery se cobra aparte (ej. directo al repartidor) — no se suma al total que paga el cliente en esta factura, solo queda registrado para las estadísticas.</p>
                      )}
                    </>
                  )}
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2" data-testid="comision-panel">
                  <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> Comisión (interno, no aparece en la comanda)</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-200 rounded-lg px-3 flex-1">
                      <input data-testid="input-comision-pct" type="number" min="0" max="100" placeholder="0" value={comisionPorcentaje}
                        onChange={(e) => setComisionPorcentaje(e.target.value)} className="flex-1 py-2 px-1 text-sm outline-none" />
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                    <span className="text-sm font-bold text-slate-700" data-testid="comision-monto">{usd(comisionMonto)}</span>
                  </div>
                </div>

                <PaymentPanel total={grandTotal} rate={rate} payments={orderPayments} onAdd={addPayment} onRemove={removePayment} />
              </>
            )}
          </div>
        )}
      </main>

      {!editing && items.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-20 bg-slate-900 text-white">
          <div className="max-w-lg mx-auto px-4 py-3">
            {pend > 0 && <p className="text-[11px] text-amber-400 mb-1.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Faltan {pend} producto(s) por cerrar para cerrar la venta</p>}
            {isMixedCart && <p className="text-[11px] text-amber-400 mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Este pedido mezcla Venta y Presupuesto: al imprimir NO se guarda ningún producto, ni siquiera los de venta directa</p>}
            {clientDataMissing && <p className="text-[11px] text-rose-400 mb-1.5 flex items-center gap-1"><User className="w-3 h-3" /> Completá nombre y teléfono del cliente para cerrar la venta</p>}
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Total</p>
                <div className="flex items-baseline gap-2"><span className="text-xl font-bold" data-testid="total-usd">{usd(grandTotal)}</span><span className="text-sm text-emerald-400 font-semibold" data-testid="total-bs">{bs(grandTotal * rate)}</span></div>
              </div>
              <div className="flex-1" />
              <button data-testid="btn-add-another-bottom" onClick={() => setShowPicker(true)} className="border border-slate-700 text-slate-200 rounded-xl px-3 py-3 text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Producto</button>
              <button data-testid="btn-close-sale" onClick={() => setShowComanda(true)} disabled={clientDataMissing}
                className={`flex items-center gap-2 text-white font-bold rounded-xl px-4 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed ${hasPresupuesto ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-500 hover:bg-emerald-600"}`}>
                {hasPresupuesto ? <><Printer className="w-4 h-4" /> Imprimir Presupuesto</> : <><Check className="w-4 h-4" /> {editingExisting ? "Guardar" : "Cerrar venta"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPicker && <ProductPicker onPick={startNew} onClose={() => setShowPicker(false)} />}
      {showComanda && (
        <ComandaModal session={session} data={buildData()} saleMeta={initialSale} onClose={() => setShowComanda(false)} readOnly={hasPresupuesto}
          saving={saving}
          onFinalize={async () => { setSaving(true); await onSaved(buildData(), initialSale ? initialSale.id : null); setSaving(false); }} />
      )}
    </div>
  );
}

function ProcesoChecklist({ label, Icon, procesos, done, catalog }) {
  if (procesos.length === 0) return null;
  return (
    <div className="mt-1.5">
      <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 zs-ticket-fine"><Icon className="w-3 h-3" /> {label}</p>
      <ul className="space-y-0.5 mt-0.5">
        {procesos.map((p) => {
          const isDone = done.includes(p);
          const plabel = catalog.find((x) => x.id === p).label;
          return (
            <li key={p} className={`flex items-center gap-1.5 text-xs ${isDone ? "text-emerald-600" : "text-slate-500"}`}>
              {isDone ? <Check className="w-3 h-3 shrink-0" /> : <Clock className="w-3 h-3 shrink-0 text-slate-400" />}
              <span>{plabel}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ComandaModal({ session, data, onClose, onFinalize, readOnly, saleMeta, saving }) {
  const { items, client, orderPayments, total, rate, paidUSD, balance, hasDelivery, deliveryFee, deliveryIncludedInTotal } = data;
  const [tab, setTab] = useState("comanda");
  const grupos = [
    { id: "pedido", label: "Pedido", icon: Tag, items },
    { id: "taller", label: "Taller", icon: Wrench, items: items.filter((i) => i.procesos_taller.length > 0) },
    { id: "diseno", label: "Diseño", icon: Palette, items: items.filter((i) => i.procesos_diseno.length > 0) },
  ].filter((g) => g.items.length);
  const orderState = paidUSD <= 0 ? "debe" : balance > 0.009 ? "parcial" : "pagado";
  const vStatus = saleStatus(items);
  const hasClientData = client.name || client.phone || client.cedula || client.direccion;
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-end sm:items-center justify-center">
      <style>{`
        @media print {
          @page { size: 58mm auto; margin: 0; }
          html, body { width: 58mm; }
          body * { visibility: hidden; }
          .zs-print-ticket, .zs-print-ticket * { visibility: visible; }
          .zs-print-ticket {
            position: absolute; top: 0; left: 0;
            width: 58mm; max-width: 58mm;
            margin: 0; padding: 4px 6px;
            background: #fff; color: #000;
          }
          .zs-print-ticket, .zs-print-ticket * { font-size: 10.5px !important; line-height: 1.35 !important; }
          .zs-print-ticket .zs-ticket-title, .zs-print-ticket .zs-ticket-total { font-size: 12px !important; }
          .zs-print-ticket .zs-ticket-fine { font-size: 9px !important; }
          .zs-print-ticket * { max-width: 100%; }
          .zs-print-ticket img { max-width: 36px !important; max-height: 36px !important; width: auto !important; height: auto !important; }
        }
      `}</style>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-auto" data-testid="comanda-modal">
        <div className="sticky top-0 bg-slate-900 text-white px-4 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2"><Receipt className="w-4 h-4 text-emerald-400" /><h3 className="font-bold">Comanda {saleMeta ? `· ${saleMeta.folio}` : ""}</h3></div>
          <button data-testid="btn-close-comanda" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        {saleMeta && (
          <div className="flex border-b border-slate-100 print:hidden" data-testid="comanda-tabs">
            <button data-testid="tab-comanda" onClick={() => setTab("comanda")} className={`flex-1 py-2 text-xs font-medium ${tab === "comanda" ? "text-slate-900 border-b-2 border-emerald-500" : "text-slate-400"}`}>Comanda</button>
            <button data-testid="tab-historial" onClick={() => setTab("historial")} className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 ${tab === "historial" ? "text-slate-900 border-b-2 border-emerald-500" : "text-slate-400"}`}><History className="w-3.5 h-3.5" /> Cambios ({saleMeta.audit.length})</button>
          </div>
        )}

        {tab === "historial" && saleMeta ? (
          <div className="p-4 space-y-2" data-testid="audit-list">
            {saleMeta.audit.slice().reverse().map((a, i) => (
              <div key={i} className="flex gap-2 text-xs border-b border-slate-50 pb-2">
                <History className="w-3.5 h-3.5 text-slate-300 mt-0.5" />
                <div><p className="text-slate-700"><span className="font-semibold">{a.user}</span> · {a.action}</p>
                  {a.detail && <p className="text-slate-400">{a.detail}</p>}
                  <p className="text-[10px] text-slate-400">{fmtTime(a.ts)}</p></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-3 text-sm">
            <div className="zs-print-ticket space-y-3">
              <p className="text-center font-bold text-slate-800 zs-ticket-title">ZappoStore{saleMeta ? ` · ${saleMeta.folio}` : ""}</p>
              <div className="flex justify-between text-xs text-slate-400 zs-ticket-fine">
                <span data-testid="comanda-vendor">Responsable: {(saleMeta && saleMeta.vendorName) || session.name}</span>
                <span>{saleMeta ? fmtTime(saleMeta.createdAt) : new Date().toLocaleString("es-VE")}</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-0.5" data-testid="comanda-cliente">
                {hasClientData ? (
                  <>
                    <p className="font-semibold text-slate-800">{client.name || "Cliente Ocasional"}</p>
                    {client.cedula && <p className="text-xs text-slate-500">Cédula/RIF: {client.cedula}</p>}
                    {client.phone && <p className="text-xs text-slate-500">Tel/WhatsApp: {client.phone}</p>}
                    {client.direccion && <p className="text-xs text-slate-500">Dirección: {client.direccion}</p>}
                  </>
                ) : (
                  <p className="font-semibold text-slate-500">Cliente Ocasional</p>
                )}
              </div>

              <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${SALE_STATES.find((s) => s.id === vStatus).chip}`}>{SALE_STATES.find((s) => s.id === vStatus).label}</span>

              {grupos.map((g) => (
                <div key={g.id} className="border border-slate-100 rounded-xl overflow-hidden" data-testid={`comanda-group-${g.id}`}>
                  <div className="bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 flex items-center gap-1.5"><g.icon className="w-3.5 h-3.5" /> {g.label.toUpperCase()}</div>
                  <div className="divide-y divide-slate-100">
                    {g.items.map((it) => {
                      const est = ITEM_STATES.find((s) => s.id === it.estado);
                      const dEntries = designEntries(it);
                      return (
                        <div key={it.id} className="px-3 py-2">
                          <div className="flex justify-between"><span className="font-medium text-slate-800">{it.name}</span><span className="font-semibold">{usd(lineTotal(it))}</span></div>
                          <p className="text-xs text-slate-500 capitalize">{it.color} · {medida(it)}</p>
                          {it.zones.length > 0 && <p className="text-xs text-emerald-600 font-medium">Diseño: {it.zones.map((z) => ZONE_LABELS[z] || z).join(", ")}</p>}
                          <ProcesoChecklist label="Taller" Icon={Wrench} procesos={it.procesos_taller} done={it.procesos_taller_done} catalog={PROCESOS_TALLER} />
                          <ProcesoChecklist label="Diseño" Icon={Palette} procesos={it.procesos_diseno} done={it.procesos_diseno_done} catalog={PROCESOS_DISENO} />
                          {dEntries.map(([tabId, d]) => (
                            <div key={tabId} className="mt-1">
                              {d.notes && <p className="text-xs text-slate-400 italic">{DESIGN_VIEWS[tabId].label}: {d.notes}</p>}
                              {d.photos.length > 0 && (
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {d.photos.map((p, i) => <img key={i} src={p.url} alt="" className="w-10 h-10 rounded object-cover border border-slate-200" />)}
                                </div>
                              )}
                            </div>
                          ))}
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 mt-0.5"><span className={`w-1.5 h-1.5 rounded-full ${est.dot}`} /> {est.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="border-t border-slate-100 pt-2 space-y-2">
                {hasDelivery && (
                  <div className="flex justify-between text-xs text-slate-500 zs-ticket-fine" data-testid="comanda-delivery">
                    <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Delivery{deliveryIncludedInTotal === false ? " (se cobra aparte)" : ""}</span>
                    <span className="font-medium text-slate-700">{usd(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between zs-ticket-total font-bold text-slate-900">
                  <span>Total Pedido</span>
                  <span>{usd(total)} · <span className="text-emerald-600">{bs(total * rate)}</span></span>
                </div>

                {orderPayments.length > 0 && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase zs-ticket-fine">Detalle de abonos</p>
                    {orderPayments.map((p) => {
                      const m = PAY_METHODS.find((x) => x.id === p.method);
                      return (
                        <div key={p.id} className="flex justify-between text-xs text-slate-500">
                          <span>{m.label}{p.reference ? ` · #${p.reference}` : ""}</span>
                          <span className="font-medium text-slate-700">{usd(p.amountUSD)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-between text-xs font-semibold text-slate-600 border-t border-dashed border-slate-200 pt-1">
                  <span>Total Pagado</span><span>{usd(paidUSD)}</span>
                </div>

                <div className={`rounded-lg px-3 py-2 text-center font-bold ${orderState === "pagado" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`} data-testid="comanda-estado-pago">
                  {orderState === "pagado" ? "Pagado Completo" : (
                    <>
                      SALDO PENDIENTE
                      <div className="text-xs font-semibold mt-0.5">{usd(balance)} · {bs(balance * rate)}</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1 print:hidden">
              <button data-testid="btn-print-comanda" onClick={() => window.print()} className="flex-1 border border-slate-200 rounded-xl py-3 text-sm font-medium text-slate-600 flex items-center justify-center gap-1.5"><Printer className="w-4 h-4" /> Imprimir</button>
              {readOnly ? <button data-testid="btn-close-view" onClick={onClose} className="flex-1 bg-slate-900 text-white font-bold rounded-xl py-3 text-sm">Cerrar</button>
                : <button data-testid="btn-save-sale" onClick={onFinalize} disabled={saving} className="flex-1 bg-emerald-500 text-white font-bold rounded-xl py-3 text-sm disabled:opacity-60">{saving ? "Guardando..." : (saleMeta ? "Guardar cambios" : "Guardar venta")}</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SeguimientoScreen({ session, sales, onSetItemState, onToggleProceso, onView, onEdit }) {
  const [filter, setFilter] = useState("en_curso");
  const [manage, setManage] = useState(null);
  const visible = (session.role === "master" ? sales : sales.filter((s) => s.vendorId === session.id));
  const list = visible.filter((s) => saleStatus(s.data.items) === filter);
  return (
    <div className="min-h-screen bg-slate-50 pb-6" style={{ fontFamily: "system-ui, sans-serif" }}>
      <TopBar title="Pedidos" />
      <div className="bg-slate-900 sticky top-[52px] z-10">
        <div className="flex px-2 pb-2 gap-1 max-w-lg mx-auto" data-testid="history-tabs">
          {SALE_STATES.map((s) => {
            const n = visible.filter((x) => saleStatus(x.data.items) === s.id).length; const on = filter === s.id;
            return (
              <button key={s.id} data-testid={`tab-${s.id}`} onClick={() => setFilter(s.id)} className={`flex-1 rounded-lg py-2 text-[11px] font-medium flex items-center justify-center gap-1 ${on ? "bg-white text-slate-900" : "bg-slate-800 text-slate-300"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label} ({n})
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-xl border border-dashed border-slate-200">No hay ventas en esta área.</div>
        ) : list.map((sale) => {
          const d = sale.data; const pend = pendientesCierre(d.items);
          return (
            <div key={sale.id} className="bg-white rounded-xl border border-slate-200 p-3" data-testid={`sale-${sale.id}`}>
              <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-700">{sale.folio}</span><span className="text-[11px] text-slate-400">{fmtTime(sale.createdAt)}</span></div>
              <div className="flex items-center justify-between mt-1"><span className="text-sm font-semibold text-slate-800">{d.client.name || "Cliente ocasional"}</span><span className="text-sm font-bold text-slate-800">{usd(d.total)}</span></div>
              <p className="text-xs text-slate-500 mt-0.5">{d.items.length} prod. · {d.items.map((i) => i.name).slice(0, 2).join(", ")}{d.items.length > 2 ? "…" : ""}{session.role === "master" ? ` · ${sale.vendorName}` : ""}</p>
              {pend > 0 && <p className="text-[11px] text-amber-600 mt-1">Faltan {pend} por cerrar</p>}
              <div className="flex gap-1.5 mt-2">
                <button data-testid={`manage-${sale.id}`} onClick={() => setManage(manage === sale.id ? null : sale.id)} className="flex-1 border border-slate-200 rounded-lg py-2 text-xs font-medium text-slate-600">Gestionar productos</button>
                <button data-testid={`edit-sale-${sale.id}`} onClick={() => onEdit(sale)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Editar</button>
                <button data-testid={`view-${sale.id}`} onClick={() => onView(sale)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-600"><Receipt className="w-3.5 h-3.5" /></button>
              </div>
              {manage === sale.id && (
                <div className="mt-2 space-y-3 border-t border-slate-100 pt-2" data-testid={`manage-panel-${sale.id}`}>
                  {d.items.map((it) => (
                    <div key={it.id} className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{it.name}</span>
                        {ITEM_STATES.map((s) => {
                          const blocked = s.id === "cerrado" && !proceduresComplete(it);
                          return (
                            <button key={s.id} data-testid={`set-${sale.id}-${it.id}-${s.id}`} onClick={() => onSetItemState(sale.id, it.id, s.id)} disabled={blocked}
                              title={blocked ? "Faltan procesos de Taller/Diseño por completar" : undefined}
                              className={`text-[9px] font-medium rounded-full px-2 py-1 border disabled:opacity-40 disabled:cursor-not-allowed ${it.estado === s.id ? "border-slate-900 bg-slate-50" : "border-slate-200 text-slate-400"}`}>
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot} mr-1`} />{s.label}
                            </button>
                          );
                        })}
                      </div>
                      {(it.procesos_taller.length > 0 || it.procesos_diseno.length > 0) && (
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-lg p-2">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Wrench className="w-3 h-3" /> Taller</p>
                            <div className="flex flex-wrap gap-1">
                              {it.procesos_taller.length === 0 && <span className="text-[10px] text-slate-300 italic">—</span>}
                              {it.procesos_taller.map((p) => {
                                const done = it.procesos_taller_done.includes(p);
                                return (
                                  <button key={p} data-testid={`proceso-taller-${sale.id}-${it.id}-${p}`} onClick={() => onToggleProceso(sale.id, it.id, "taller", p)}
                                    className={`text-[10px] font-medium rounded-full px-2 py-1 border ${done ? "bg-emerald-500 border-emerald-600 text-white" : "bg-white border-slate-300 text-slate-500"}`}>
                                    {PROCESOS_TALLER.find((x) => x.id === p).label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Palette className="w-3 h-3" /> Diseño</p>
                            <div className="flex flex-wrap gap-1">
                              {it.procesos_diseno.length === 0 && <span className="text-[10px] text-slate-300 italic">—</span>}
                              {it.procesos_diseno.map((p) => {
                                const done = it.procesos_diseno_done.includes(p);
                                return (
                                  <button key={p} data-testid={`proceso-diseno-${sale.id}-${it.id}-${p}`} onClick={() => onToggleProceso(sale.id, it.id, "diseno", p)}
                                    className={`text-[10px] font-medium rounded-full px-2 py-1 border ${done ? "bg-emerald-500 border-emerald-600 text-white" : "bg-white border-slate-300 text-slate-500"}`}>
                                    {PROCESOS_DISENO.find((x) => x.id === p).label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}

function ClientesScreen({ session, sales, clients, onOpen }) {
  const visibleSales = session.role === "master" ? sales : sales.filter((s) => s.vendorId === session.id);
  const clientIds = [...new Set(visibleSales.map((s) => s.clientId).filter(Boolean))];
  const list = clients.filter((c) => clientIds.includes(c.id));
  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "system-ui, sans-serif" }}>
      <TopBar title="Clientes" />
      <main className="max-w-lg mx-auto px-4 py-4 space-y-2">
        {list.length === 0 ? <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-xl border border-dashed border-slate-200">Aún no hay clientes registrados.</div>
          : list.map((c) => {
            const cs = visibleSales.filter((s) => s.clientId === c.id);
            const tot = cs.reduce((a, s) => a + s.data.total, 0);
            return (
              <button key={c.id} data-testid={`client-${c.id}`} onClick={() => onOpen(c.id)} className="w-full bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 hover:border-slate-300 text-left">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><User className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{c.name || "Sin nombre"}</p><p className="text-xs text-slate-400">{c.phone} · {cs.length} pedido(s)</p></div>
                <span className="text-sm font-bold text-slate-700">{usd(tot)}</span>
              </button>
            );
          })}
      </main>
    </div>
  );
}

function ClienteDetail({ session, clientId, sales, clients, onBack, onView }) {
  const c = clients.find((x) => x.id === clientId);
  const cs = (session.role === "master" ? sales : sales.filter((s) => s.vendorId === session.id)).filter((s) => s.clientId === clientId);
  const tot = cs.reduce((a, s) => a + s.data.total, 0);
  const vendedores = [...new Set(cs.map((s) => s.vendorName))];
  const chart = useMemo(() => {
    const map = {};
    cs.forEach((s) => { const k = monthKey(s.createdAt); map[k] = (map[k] || 0) + s.data.total; });
    return Object.keys(map).sort().slice(-6).map((k) => ({ label: k.slice(5), value: map[k] }));
  }, [cs]);
  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "system-ui, sans-serif" }}>
      <header className="bg-slate-900 text-white sticky top-0 z-20"><div className="px-4 py-3 flex items-center gap-2">
        <button data-testid="btn-back" onClick={onBack} className="text-slate-300"><ChevronLeft className="w-5 h-5" /></button>
        <p className="text-sm font-bold flex-1">Ficha de cliente</p></div></header>
      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-lg font-bold text-slate-800">{c ? c.name || "Sin nombre" : "—"}</p>
          <p className="text-sm text-slate-500">{c && c.phone}</p>
          {c && c.cedula && <p className="text-xs text-slate-500 mt-0.5">Cédula/RIF: {c.cedula}</p>}
          {c && c.direccion && <p className="text-xs text-slate-500 mt-0.5">Dirección: {c.direccion}</p>}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-slate-50 rounded-lg p-2"><p className="text-[10px] text-slate-400 uppercase">Total gastado</p><p className="text-lg font-bold text-emerald-600">{usd(tot)}</p></div>
            <div className="bg-slate-50 rounded-lg p-2"><p className="text-[10px] text-slate-400 uppercase">Pedidos</p><p className="text-lg font-bold text-slate-700">{cs.length}</p></div>
          </div>
          {vendedores.length > 0 && <p className="text-xs text-slate-500 mt-2">Le vendió: {vendedores.join(", ")}</p>}
        </div>
        {chart.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Gasto por mes</p>
            <BarChart data={chart} />
          </div>
        )}
        <p className="text-xs font-semibold text-slate-400 uppercase">Pedidos</p>
        {cs.map((s) => (
          <button key={s.id} data-testid={`client-sale-${s.id}`} onClick={() => onView(s)} className="w-full bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between text-left">
            <div><p className="text-xs font-bold text-slate-700">{s.folio}</p><p className="text-[11px] text-slate-400">{fmtTime(s.createdAt)} · {SALE_STATES.find((x) => x.id === saleStatus(s.data.items)).label}</p></div>
            <span className="text-sm font-bold text-slate-800">{usd(s.data.total)}</span>
          </button>
        ))}
      </main>
    </div>
  );
}

function VendorEditForm({ vendor, onSave, onCancel }) {
  const [form, setForm] = useState({ name: vendor.name, cedula: vendor.cedula, password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (!form.name.trim() || !form.cedula.trim()) return;
    setSaving(true); setError("");
    const res = await onSave({ id: vendor.id, name: form.name.trim(), cedula: form.cedula.trim(), password: form.password.trim() });
    setSaving(false);
    if (res && res.error) { setError(res.error); return; }
    onCancel();
  };
  return (
    <div className="bg-white rounded-xl border border-emerald-200 p-3 space-y-2" data-testid={`vendor-edit-form-${vendor.id}`}>
      <input data-testid="vendor-edit-name" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
      <input data-testid="vendor-edit-cedula" placeholder="Cédula (usuario)" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
      <input data-testid="vendor-edit-password" placeholder="Nueva contraseña (dejar en blanco para no cambiarla)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
      {error && <p data-testid="vendor-edit-error" className="text-xs text-rose-500">{error}</p>}
      <div className="flex gap-2">
        <button data-testid="btn-cancel-edit-vendor" onClick={onCancel} className="flex-1 border border-slate-200 rounded-lg py-2 text-xs font-medium text-slate-500">Cancelar</button>
        <button data-testid="btn-save-edit-vendor" onClick={save} disabled={saving} className="flex-[2] bg-emerald-500 text-white font-bold rounded-lg py-2 text-sm disabled:opacity-60">{saving ? "Guardando..." : "Guardar cambios"}</button>
      </div>
    </div>
  );
}

function VendedoresScreen({ vendors, sales, onAdd, onToggle, onUpdate, onOpen }) {
  const [form, setForm] = useState({ name: "", cedula: "", password: "" });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const add = async () => {
    if (!form.name.trim() || !form.cedula.trim() || !form.password.trim()) return;
    setSaving(true); setError("");
    const res = await onAdd(form);
    setSaving(false);
    if (res && res.error) { setError(res.error); return; }
    setForm({ name: "", cedula: "", password: "" }); setShowForm(false);
  };
  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "system-ui, sans-serif" }}>
      <TopBar title="Vendedores" right={<button data-testid="btn-add-vendor" onClick={() => { setShowForm((s) => !s); setError(""); }} className="bg-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-medium flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Nuevo</button>} />
      <main className="max-w-lg mx-auto px-4 py-4 space-y-2">
        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2" data-testid="vendor-form">
            <input data-testid="vendor-name" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
            <input data-testid="vendor-cedula" placeholder="Cédula (usuario)" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
            <input data-testid="vendor-password" placeholder="Contraseña (mín. 6 caracteres)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
            {error && <p data-testid="vendor-form-error" className="text-xs text-rose-500">{error}</p>}
            <button data-testid="btn-save-vendor" onClick={add} disabled={saving} className="w-full bg-emerald-500 text-white font-bold rounded-lg py-2 text-sm disabled:opacity-60">{saving ? "Creando..." : "Guardar vendedor"}</button>
          </div>
        )}
        {vendors.map((v) => {
          const vs = sales.filter((s) => s.vendorId === v.id);
          const tot = vs.reduce((a, s) => a + s.data.total, 0);
          if (editingId === v.id) {
            return <VendorEditForm key={v.id} vendor={v} onSave={onUpdate} onCancel={() => setEditingId(null)} />;
          }
          return (
            <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3" data-testid={`vendor-${v.id}`}>
              <button onClick={() => onOpen(v.id)} className="flex items-center gap-3 flex-1 text-left">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><User className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{v.name}</p><p className="text-xs text-slate-400">{v.cedula} · {vs.length} venta(s) · {usd(tot)}</p></div>
              </button>
              <button data-testid={`edit-vendor-${v.id}`} onClick={() => setEditingId(v.id)} className="text-slate-400 hover:text-emerald-600"><Pencil className="w-3.5 h-3.5" /></button>
              <button data-testid={`toggle-vendor-${v.id}`} onClick={() => onToggle(v.id)} className={`text-[10px] font-bold rounded-full px-2 py-1 ${v.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{v.active ? "Activo" : "Inactivo"}</button>
            </div>
          );
        })}
      </main>
    </div>
  );
}

function VendedorDetail({ vendorId, vendors, sales, onBack, onView }) {
  const v = vendors.find((x) => x.id === vendorId);
  const vs = sales.filter((s) => s.vendorId === vendorId);
  const tot = vs.reduce((a, s) => a + s.data.total, 0);
  const clientes = [...new Set(vs.map((s) => s.data.client.name).filter(Boolean))];
  const chart = useMemo(() => {
    const map = {};
    vs.forEach((s) => { const k = monthKey(s.createdAt); map[k] = (map[k] || 0) + s.data.total; });
    return Object.keys(map).sort().slice(-6).map((k) => ({ label: k.slice(5), value: map[k] }));
  }, [vs]);
  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "system-ui, sans-serif" }}>
      <header className="bg-slate-900 text-white sticky top-0 z-20"><div className="px-4 py-3 flex items-center gap-2">
        <button data-testid="btn-back" onClick={onBack} className="text-slate-300"><ChevronLeft className="w-5 h-5" /></button>
        <p className="text-sm font-bold flex-1">Ficha de vendedor</p></div></header>
      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-lg font-bold text-slate-800">{v && v.name}</p>
          <p className="text-sm text-slate-500">{v && v.cedula}</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-slate-50 rounded-lg p-2"><p className="text-[10px] text-slate-400 uppercase">Vendido</p><p className="text-lg font-bold text-emerald-600">{usd(tot)}</p></div>
            <div className="bg-slate-50 rounded-lg p-2"><p className="text-[10px] text-slate-400 uppercase">Ventas</p><p className="text-lg font-bold text-slate-700">{vs.length}</p></div>
          </div>
          {clientes.length > 0 && <p className="text-xs text-slate-500 mt-2">Clientes: {clientes.slice(0, 5).join(", ")}{clientes.length > 5 ? "…" : ""}</p>}
        </div>
        {chart.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Ventas por mes</p>
            <BarChart data={chart} />
          </div>
        )}
        {vs.map((s) => (
          <button key={s.id} data-testid={`vendor-sale-${s.id}`} onClick={() => onView(s)} className="w-full bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between text-left">
            <div><p className="text-xs font-bold text-slate-700">{s.folio}</p><p className="text-[11px] text-slate-400">{fmtTime(s.createdAt)} · {s.data.client.name || "Ocasional"}</p></div>
            <span className="text-sm font-bold text-slate-800">{usd(s.data.total)}</span>
          </button>
        ))}
      </main>
    </div>
  );
}

function CajaOpenForm({ onOpen }) {
  const [cashUSD, setCashUSD] = useState("");
  const [cashVES, setCashVES] = useState("");
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3" data-testid="caja-open-form">
      <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Abrir caja</p>
      <p className="text-xs text-slate-500">Declara el efectivo con el que arrancas el turno (vuelto).</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center border border-slate-200 rounded-lg px-2">
          <span className="text-xs text-slate-400">$</span>
          <input data-testid="input-open-usd" type="number" value={cashUSD} onChange={(e) => setCashUSD(e.target.value)} placeholder="0.00" className="flex-1 py-2 px-1 text-sm text-right outline-none" />
        </div>
        <div className="flex items-center border border-slate-200 rounded-lg px-2">
          <span className="text-xs text-slate-400">Bs</span>
          <input data-testid="input-open-ves" type="number" value={cashVES} onChange={(e) => setCashVES(e.target.value)} placeholder="0,00" className="flex-1 py-2 px-1 text-sm text-right outline-none" />
        </div>
      </div>
      <button data-testid="btn-open-caja" onClick={() => onOpen(cashUSD, cashVES)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl py-3 text-sm">Abrir turno</button>
    </div>
  );
}

function CajaBreakdown({ totals, caja }) {
  const metodoIcon = { efectivo_usd: DollarSign, efectivo_bs: Banknote, tarjeta: CreditCard, pago_movil: Smartphone };
  const cuadra = Math.abs(caja.varianceUSD || 0) < 0.01;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-[10px] text-slate-400 uppercase">Vendido en el turno</p>
          <p className="text-lg font-bold text-slate-800">{usd(totals.vendido)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-[10px] text-slate-400 uppercase">Cobrado (todos los métodos)</p>
          <p className="text-lg font-bold text-slate-800">{usd(totals.cobrado)}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3">
          <p className="text-[10px] text-emerald-600 uppercase font-semibold">Dinero asegurado</p>
          <p className="text-lg font-bold text-emerald-700">{usd(totals.asegurado)}</p>
          <p className="text-[10px] text-emerald-600">Ventas ya cerradas</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-3">
          <p className="text-[10px] text-amber-600 uppercase font-semibold">Señas en curso</p>
          <p className="text-lg font-bold text-amber-700">{usd(totals.senas)}</p>
          <p className="text-[10px] text-amber-600">Cobrado, producto no entregado</p>
        </div>
        <div className="bg-rose-50 rounded-xl border border-rose-200 p-3 col-span-2">
          <p className="text-[10px] text-rose-600 uppercase font-semibold">Comprometido por cobrar</p>
          <p className="text-lg font-bold text-rose-700">{usd(totals.comprometido)}</p>
          <p className="text-[10px] text-rose-600">Saldo pendiente de pedidos del turno sin cerrar</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Por método de pago</p>
        <div className="grid grid-cols-4 gap-1.5">
          {PAY_METHODS.map((m) => {
            const Icon = metodoIcon[m.id];
            return (
              <div key={m.id} className="flex flex-col items-center gap-0.5 rounded-lg py-2 border border-slate-100 bg-slate-50">
                <Icon className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[9px] text-slate-500">{m.label}</span>
                <span className="text-[11px] font-bold text-slate-700">{usd(totals.porMetodo[m.id] || 0)}</span>
              </div>
            );
          })}
        </div>
      </div>
      {caja.closedAt && (
        <div className={`rounded-xl border p-3 ${cuadra ? "bg-slate-50 border-slate-200" : caja.varianceUSD > 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`} data-testid="caja-variance">
          <p className="text-[10px] uppercase font-semibold text-slate-500">Cuadre de efectivo al cierre</p>
          <div className="flex justify-between text-xs mt-1"><span className="text-slate-500">Esperado</span><span className="font-medium">{usd(caja.expectedCashUSD)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-slate-500">Contado</span><span className="font-medium">{usd((Number(caja.closingCashUSD) || 0) + (Number(caja.closingCashVES) || 0) / (caja.rateAtClose || 1))}</span></div>
          <div className="flex justify-between text-xs font-bold mt-1">
            <span>{cuadra ? "Cuadra" : caja.varianceUSD > 0 ? "Sobrante" : "Faltante"}</span>
            <span>{usd(Math.abs(caja.varianceUSD))}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const PERIODS = [["hoy", "Hoy"], ["semana", "Semana"], ["mes", "Mes"], ["todo", "Todo"]];

function PeriodTabs({ value, onChange }) {
  return (
    <div className="flex bg-slate-100 rounded-lg p-0.5" data-testid="caja-period">
      {PERIODS.map(([id, label]) => (
        <button key={id} data-testid={`period-${id}`} onClick={() => onChange(id)} className={`text-[11px] font-medium rounded-md px-2 py-1 ${value === id ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}>{label}</button>
      ))}
    </div>
  );
}

function CajaCloseSummaryModal({ caja, totals, countedUSD, countedVES, rate, onCancel, onConfirm }) {
  const cashInUSD = totals.porMetodo.efectivo_usd || 0;
  const cashInVES = totals.porMetodo.efectivo_bs || 0;
  const expectedCashUSD = caja.openingCashUSD + caja.openingCashVES / (rate || 1) + cashInUSD + cashInVES;
  const countedTotalUSD = (Number(countedUSD) || 0) + (Number(countedVES) || 0) / (rate || 1);
  const varianceUSD = countedTotalUSD - expectedCashUSD;
  const cuadra = Math.abs(varianceUSD) < 0.01;
  const metodoIcon = { efectivo_usd: DollarSign, efectivo_bs: Banknote, tarjeta: CreditCard, pago_movil: Smartphone };
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-auto" data-testid="caja-close-summary-modal">
        <div className="sticky top-0 bg-slate-900 text-white px-4 py-3 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-400" /><h3 className="font-bold flex-1">Resumen de cierre</h3>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Apertura: {fmtTime(caja.openedAt)}</span>
            <span>Cierre: {fmtTime(new Date().toISOString())}</span>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total facturado</span>
            <span className="text-lg font-bold text-slate-800" data-testid="summary-vendido">{usd(totals.vendido)}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Por método de pago</p>
            <div className="grid grid-cols-4 gap-1.5">
              {PAY_METHODS.map((m) => {
                const Icon = metodoIcon[m.id];
                return (
                  <div key={m.id} className="flex flex-col items-center gap-0.5 rounded-lg py-2 border border-slate-100 bg-slate-50">
                    <Icon className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[9px] text-slate-500">{m.label}</span>
                    <span className="text-[11px] font-bold text-slate-700">{usd(totals.porMetodo[m.id] || 0)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={`rounded-xl border p-3 ${cuadra ? "bg-slate-50 border-slate-200" : varianceUSD > 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`} data-testid="summary-cuadre">
            <p className="text-[10px] uppercase font-semibold text-slate-500">Cuadre de efectivo</p>
            <div className="flex justify-between text-xs mt-1"><span className="text-slate-500">Esperado</span><span className="font-medium">{usd(expectedCashUSD)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Contado</span><span className="font-medium">{usd(countedTotalUSD)}</span></div>
            <div className="flex justify-between text-xs font-bold mt-1">
              <span>{cuadra ? "Cuadra" : varianceUSD > 0 ? "Sobrante" : "Faltante"}</span>
              <span>{usd(Math.abs(varianceUSD))}</span>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button data-testid="btn-cancel-summary" onClick={onCancel} className="flex-1 border border-slate-200 rounded-xl py-3 text-sm font-medium text-slate-500">Volver</button>
            <button data-testid="btn-confirm-summary" onClick={onConfirm} className="flex-[2] bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl py-3 text-sm">Confirmar cierre</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CajaScreen({ session, sales, payments, cajas, rate, onOpenCaja, onCloseCaja }) {
  const [closing, setClosing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [countedUSD, setCountedUSD] = useState("");
  const [countedVES, setCountedVES] = useState("");
  const [periodTab, setPeriodTab] = useState("hoy");
  const [detailCaja, setDetailCaja] = useState(null);
  const isMaster = session.role === "master";

  const inRange = (iso) => {
    const d = new Date(iso), now = new Date();
    if (periodTab === "hoy") return d.toDateString() === now.toDateString();
    if (periodTab === "semana") return (now - d) / 86400000 <= 7;
    if (periodTab === "mes") return monthKey(iso) === monthKey(now.toISOString());
    return true;
  };
  const varianceLabel = (c) => (Math.abs(c.varianceUSD) < 0.01 ? "Cuadró" : c.varianceUSD > 0 ? `Sobrante ${usd(c.varianceUSD)}` : `Faltante ${usd(Math.abs(c.varianceUSD))}`);

  const historyBlock = (list, testidPrefix, showVendor) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> {showVendor ? "Historial (todos)" : "Historial de turnos"}</p>
        <PeriodTabs value={periodTab} onChange={setPeriodTab} />
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4 bg-white rounded-xl border border-dashed border-slate-200">Sin turnos cerrados en este período.</p>
      ) : list.map((c) => {
        const t = cajaTotals(sales, payments, c.id);
        return (
          <button key={c.id} data-testid={`${testidPrefix}-${c.id}`} onClick={() => setDetailCaja(detailCaja === c.id ? null : c.id)} className="w-full bg-white border border-slate-200 rounded-xl p-3 mb-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">{showVendor ? c.vendorName : `${fmtTime(c.openedAt)} → ${fmtTime(c.closedAt)}`}</span>
              <span className="text-sm font-bold text-slate-800">{usd(t.cobrado)}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{showVendor ? `${fmtTime(c.openedAt)} → ${fmtTime(c.closedAt)} · ` : `Vendido ${usd(t.vendido)} · `}{varianceLabel(c)}</p>
            {detailCaja === c.id && <div className="mt-2 pt-2 border-t border-slate-100"><CajaBreakdown totals={t} caja={c} /></div>}
          </button>
        );
      })}
    </div>
  );

  if (isMaster) {
    const abiertas = cajas.filter((c) => !c.closedAt);
    const cerradas = cajas.filter((c) => c.closedAt && inRange(c.closedAt)).sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));
    return (
      <div className="min-h-screen bg-slate-50 pb-6" style={{ fontFamily: "system-ui, sans-serif" }}>
        <TopBar title="Caja · Supervisión" />
        <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Turnos abiertos ahora</p>
            {abiertas.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 bg-white rounded-xl border border-dashed border-slate-200">Ningún vendedor tiene caja abierta.</p>
            ) : abiertas.map((c) => {
              const t = cajaTotals(sales, payments, c.id);
              return (
                <button key={c.id} data-testid={`caja-live-${c.id}`} onClick={() => setDetailCaja(detailCaja === c.id ? null : c.id)} className="w-full bg-white border border-slate-200 rounded-xl p-3 mb-2 text-left">
                  <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-800">{c.vendorName}</span><span className="text-sm font-bold text-emerald-600">{usd(t.cobrado)}</span></div>
                  <p className="text-[11px] text-slate-400">Abrió {fmtTime(c.openedAt)} · Comprometido {usd(t.comprometido)}</p>
                  {detailCaja === c.id && <div className="mt-2 pt-2 border-t border-slate-100"><CajaBreakdown totals={t} caja={c} /></div>}
                </button>
              );
            })}
          </div>
          {historyBlock(cerradas, "caja-hist", true)}
        </main>
      </div>
    );
  }

  const current = openCajaOf(cajas, session.id);
  const misCerradas = cajas.filter((c) => c.vendorId === session.id && c.closedAt && inRange(c.closedAt)).sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));
  const currentTotals = current ? cajaTotals(sales, payments, current.id) : null;
  const doClose = () => { onCloseCaja(current.id, countedUSD, countedVES); setShowSummary(false); setClosing(false); setCountedUSD(""); setCountedVES(""); };

  return (
    <div className="min-h-screen bg-slate-50 pb-6" style={{ fontFamily: "system-ui, sans-serif" }}>
      <TopBar title="Caja" />
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {!current ? (
          <CajaOpenForm onOpen={onOpenCaja} />
        ) : (
          <>
            <div className="bg-slate-900 text-white rounded-xl p-3 flex items-center justify-between" data-testid="caja-activa">
              <div><p className="text-xs text-slate-400">Turno abierto</p><p className="text-sm font-bold">{fmtTime(current.openedAt)}</p></div>
              <div className="text-right"><p className="text-xs text-slate-400">Fondo inicial</p><p className="text-sm font-bold">{usd(current.openingCashUSD)} · {bs(current.openingCashVES)}</p></div>
            </div>
            <CajaBreakdown totals={currentTotals} caja={current} />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Ventas del turno</p>
              <div className="space-y-2">
                {salesOfCaja(sales, current.id).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Aún no registras ventas en este turno.</p>
                ) : salesOfCaja(sales, current.id).map((s) => (
                  <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between" data-testid={`caja-sale-${s.id}`}>
                    <div><p className="text-xs font-bold text-slate-700">{s.folio}</p><p className="text-[11px] text-slate-400">{s.data.client.name || "Ocasional"} · {SALE_STATES.find((x) => x.id === saleStatus(s.data.items)).label}</p></div>
                    <span className="text-sm font-bold text-slate-800">{usd(s.data.total)}</span>
                  </div>
                ))}
              </div>
            </div>
            {!closing ? (
              <button data-testid="btn-close-caja" onClick={() => setClosing(true)} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl py-3 text-sm">Cerrar turno</button>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2" data-testid="caja-close-form">
                <p className="text-xs font-semibold text-slate-500">Efectivo contado al cierre</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center border border-slate-200 rounded-lg px-2"><span className="text-xs text-slate-400">$</span>
                    <input data-testid="input-close-usd" type="number" value={countedUSD} onChange={(e) => setCountedUSD(e.target.value)} className="flex-1 py-2 px-1 text-sm text-right outline-none" /></div>
                  <div className="flex items-center border border-slate-200 rounded-lg px-2"><span className="text-xs text-slate-400">Bs</span>
                    <input data-testid="input-close-ves" type="number" value={countedVES} onChange={(e) => setCountedVES(e.target.value)} className="flex-1 py-2 px-1 text-sm text-right outline-none" /></div>
                </div>
                <div className="flex gap-2">
                  <button data-testid="btn-cancel-close" onClick={() => setClosing(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-500">Cancelar</button>
                  <button data-testid="btn-confirm-close" onClick={() => setShowSummary(true)} className="flex-[2] bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl py-2.5 text-sm">Ver resumen y cerrar</button>
                </div>
              </div>
            )}
          </>
        )}
        {historyBlock(misCerradas, "caja-hist", false)}
      </main>
      {showSummary && current && (
        <CajaCloseSummaryModal caja={current} totals={currentTotals} countedUSD={countedUSD} countedVES={countedVES} rate={rate}
          onCancel={() => setShowSummary(false)} onConfirm={doClose} />
      )}
    </div>
  );
}

function ResumenFinancieroScreen({ sales, payments }) {
  const ingresosTotales = payments.reduce((s, p) => s + p.amountUSD, 0);
  const pendientes = sales.filter((s) => (s.data.balance || 0) > 0.009).sort((a, b) => b.data.balance - a.data.balance);
  const cuentasPorCobrar = pendientes.reduce((s, x) => s + (x.data.balance || 0), 0);
  const ticketPromedio = sales.length ? sales.reduce((s, x) => s + x.data.total, 0) / sales.length : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-6" style={{ fontFamily: "system-ui, sans-serif" }}>
      <TopBar title="Resumen Financiero" />
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 col-span-2">
            <p className="text-[10px] text-emerald-600 uppercase font-semibold">Ingresos totales (histórico)</p>
            <p className="text-2xl font-bold text-emerald-700" data-testid="kpi-ingresos-totales">{usd(ingresosTotales)}</p>
          </div>
          <div className="bg-rose-50 rounded-xl border border-rose-200 p-3">
            <p className="text-[10px] text-rose-600 uppercase font-semibold">Cuentas por cobrar</p>
            <p className="text-lg font-bold text-rose-700" data-testid="kpi-cuentas-cobrar">{usd(cuentasPorCobrar)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Ticket promedio</p>
            <p className="text-lg font-bold text-slate-800" data-testid="kpi-ticket-promedio">{usd(ticketPromedio)}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Cuentas por cobrar ({pendientes.length})</p>
          {pendientes.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4 bg-white rounded-xl border border-dashed border-slate-200">No hay saldos pendientes.</p>
          ) : (
            <div className="space-y-2" data-testid="cxc-list">
              {pendientes.map((s) => (
                <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between" data-testid={`cxc-${s.id}`}>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700">{s.folio}</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{s.data.client.name || "Cliente ocasional"}</p>
                  </div>
                  <span className="text-sm font-bold text-rose-600">{usd(s.data.balance)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ReportesScreen({ sales, clients, vendors, onOpenClient, onOpenVendor }) {
  const chart = useMemo(() => {
    const map = {};
    sales.forEach((s) => { const k = monthKey(s.createdAt); map[k] = (map[k] || 0) + s.data.total; });
    return Object.keys(map).sort().slice(-6).map((k) => ({ label: k.slice(5), value: map[k] }));
  }, [sales]);

  const topClientes = useMemo(() => {
    const map = {};
    sales.forEach((s) => { if (!s.clientId) return; map[s.clientId] = (map[s.clientId] || 0) + s.data.total; });
    return Object.entries(map)
      .map(([clientId, total]) => ({ clientId, total, client: clients.find((c) => c.id === clientId) }))
      .sort((a, b) => b.total - a.total).slice(0, 5);
  }, [sales, clients]);

  const topVendedores = useMemo(() => {
    const map = {};
    sales.forEach((s) => { map[s.vendorId] = (map[s.vendorId] || 0) + s.data.total; });
    return Object.entries(map)
      .map(([vendorId, total]) => ({ vendorId, total, vendor: vendors.find((v) => v.id === vendorId) }))
      .sort((a, b) => b.total - a.total).slice(0, 5);
  }, [sales, vendors]);

  return (
    <div className="min-h-screen bg-slate-50 pb-6" style={{ fontFamily: "system-ui, sans-serif" }}>
      <TopBar title="Reportes / Estadísticas" />
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Ingresos · últimos 6 meses</p>
          {chart.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Aún no hay ventas registradas.</p> : <BarChart data={chart} />}
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Mejores clientes</p>
          {topClientes.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4 bg-white rounded-xl border border-dashed border-slate-200">Sin datos todavía.</p>
          ) : (
            <div className="space-y-2" data-testid="top-clientes">
              {topClientes.map((row, i) => (
                <button key={row.clientId} data-testid={`top-cliente-${row.clientId}`} onClick={() => onOpenClient(row.clientId)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 hover:border-slate-300 text-left">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="flex-1 text-sm font-semibold text-slate-800 truncate">{row.client ? row.client.name || "Sin nombre" : "Cliente"}</span>
                  <span className="text-sm font-bold text-slate-700">{usd(row.total)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-1.5"><UserCog className="w-3.5 h-3.5" /> Mejores vendedores</p>
          {topVendedores.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4 bg-white rounded-xl border border-dashed border-slate-200">Sin datos todavía.</p>
          ) : (
            <div className="space-y-2" data-testid="top-vendedores">
              {topVendedores.map((row, i) => (
                <button key={row.vendorId} data-testid={`top-vendedor-${row.vendorId}`} onClick={() => onOpenVendor(row.vendorId)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 hover:border-slate-300 text-left">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="flex-1 text-sm font-semibold text-slate-800 truncate">{row.vendor ? row.vendor.name : "Vendedor"}</span>
                  <span className="text-sm font-bold text-slate-700">{usd(row.total)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [loginMode, setLoginMode] = useState("vendedor");
  const [session, setSession] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [route, setRoute] = useState("home");
  const [rate, setRate] = useState(40.5);
  const [vendors, setVendors] = useState([]);
  const [clients, setClients] = useState([]);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [viewSale, setViewSale] = useState(null);
  const [editSale, setEditSale] = useState(null);
  const [openClient, setOpenClient] = useState(null);
  const [openVendor, setOpenVendor] = useState(null);

  const sessionFromVendedor = (v) => ({ role: v.role, id: v.id, name: v.name, cedula: v.cedula });

  // Restaura la sesión si ya había un login válido de Supabase (sobrevive a refrescar la página).
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession && authSession.user) {
        const { data: vendedor } = await supabase.from("vendedores").select("*").eq("auth_user_id", authSession.user.id).single();
        if (active && vendedor && vendedor.active) {
          setSession(sessionFromVendedor(vendedor));
          setLoginMode(vendedor.role === "master" ? "master" : "vendedor");
        }
      }
      if (active) setSessionChecked(true);
    })();
    return () => { active = false; };
  }, []);

  const loadVendors = async () => {
    const { data, error } = await supabase.from("vendedores").select("*").order("created_at", { ascending: true });
    if (!error) {
      setVendors(data.map((v) => ({ id: v.id, name: v.name, cedula: v.cedula, active: v.active, role: v.role, authUserId: v.auth_user_id, createdBy: v.created_by })));
    }
  };
  useEffect(() => { if (session && session.role === "master") loadVendors(); }, [session]);

  const mapClient = (row) => ({ id: row.id, name: row.name, phone: row.phone, cedula: row.cedula, direccion: row.direccion, createdAt: row.created_at });
  const loadClients = async () => {
    const { data, error } = await supabase.from("clientes").select("*").order("created_at", { ascending: true });
    if (!error) setClients(data.map(mapClient));
  };
  useEffect(() => { if (session) loadClients(); }, [session]);

  const mapCaja = (row) => ({
    id: row.id, vendorId: row.vendedor_id, vendorName: row.vendedores ? row.vendedores.name : "",
    openedAt: row.opened_at, closedAt: row.closed_at,
    openingCashUSD: Number(row.opening_cash_usd) || 0, openingCashVES: Number(row.opening_cash_ves) || 0,
    rateAtOpen: row.rate_open, closingCashUSD: row.closing_cash_usd, closingCashVES: row.closing_cash_ves,
    rateAtClose: row.rate_close, expectedCashUSD: row.expected_cash_usd, varianceUSD: row.variance_usd,
  });
  const loadCajas = async () => {
    const { data, error } = await supabase.from("cajas").select("*, vendedores(name)").order("opened_at", { ascending: false });
    if (!error) setCajas(data.map(mapCaja));
  };
  useEffect(() => { if (session) loadCajas(); }, [session]);

  const mapPedidoItem = (it, photoUrlByPath) => {
    const designData = { frente: { photos: [], notes: "" }, espalda: { photos: [], notes: "" }, mangas: { photos: [], notes: "" } };
    (it.pedido_item_diseno || []).forEach((d) => { if (designData[d.vista]) designData[d.vista].notes = d.notes || ""; });
    (it.pedido_item_fotos || []).forEach((f) => {
      if (designData[f.vista]) designData[f.vista].photos.push({ path: f.storage_path, url: (photoUrlByPath && photoUrlByPath[f.storage_path]) || "" });
    });
    const catalog = QUICK_PRODUCTS.find((p) => p.id === it.product_id);
    return {
      id: it.id, productId: it.product_id, name: it.name, emoji: catalog ? catalog.emoji : "📦",
      talla: it.talla || "M", cantidad: Number(it.cantidad) || 1, color: it.color || "",
      price: Number(it.unit_price) || 0, tipo_operacion: it.operacion_tipo,
      procesos_taller: it.procesos_taller || [], procesos_diseno: it.procesos_diseno || [],
      procesos_taller_done: it.procesos_taller_done || [], procesos_diseno_done: it.procesos_diseno_done || [],
      zones: it.zones || [], designData, estado: it.estado,
    };
  };
  // Reconstruye los abonos VIGENTES desde el ledger append-only: agrupa por order_payment_id
  // y suma amount_usd — un pago revertido netea a ~0 y se excluye (el reverso es una fila
  // aparte con el mismo order_payment_id y amount_usd negativo, ver v0.8).
  const reconstructOrderPayments = (pagoRows) => {
    const groups = {};
    (pagoRows || []).forEach((p) => { (groups[p.order_payment_id] ||= []).push(p); });
    return Object.entries(groups)
      .map(([orderPaymentId, rows]) => {
        const net = rows.reduce((s, r) => s + Number(r.amount_usd), 0);
        const original = rows.find((r) => !r.is_reversal) || rows[0];
        return { id: orderPaymentId, method: original.method, paid: Number(original.amount), reference: original.reference_number || "", amountUSD: net, currency: original.currency };
      })
      .filter((p) => p.amountUSD > 0.009);
  };
  const mapSale = (row, audit, photoUrlByPath) => {
    const items = (row.pedido_items || []).map((it) => mapPedidoItem(it, photoUrlByPath));
    const orderPayments = reconstructOrderPayments(row.pagos);
    const total = Number(row.total);
    const paidUSD = orderPayments.reduce((s, p) => s + p.amountUSD, 0);
    const balance = Math.max(0, total - paidUSD);
    return {
      id: row.id, folio: row.folio, createdAt: row.created_at, vendorId: row.vendedor_id,
      vendorName: row.vendedores ? row.vendedores.name : "", clientId: row.cliente_id, cajaId: row.caja_id,
      data: {
        items,
        client: row.clientes ? { name: row.clientes.name || "", phone: row.clientes.phone || "", cedula: row.clientes.cedula || "", direccion: row.clientes.direccion || "" } : { name: "", phone: "", cedula: "", direccion: "" },
        orderPayments, total, rate: Number(row.rate_snap), paidUSD, balance,
        hasDelivery: !!row.has_delivery, deliveryFee: Number(row.delivery_fee) || 0,
        deliveryIncludedInTotal: row.delivery_incluido_en_total !== false,
        comisionPorcentaje: Number(row.comision_porcentaje) || 0, comisionMonto: Number(row.comision_monto) || 0,
      },
      audit,
    };
  };
  const loadSales = async () => {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*, clientes(name, phone, cedula, direccion), vendedores(name), pedido_items(*, pedido_item_diseno(*), pedido_item_fotos(*)), pagos(*)")
      .order("created_at", { ascending: false });
    if (error) { console.error("loadSales:", error); return; }

    // URLs firmadas en un solo llamado batch (el bucket es privado) para todas las fotos que aparezcan.
    const allPaths = [];
    data.forEach((row) => (row.pedido_items || []).forEach((it) => (it.pedido_item_fotos || []).forEach((f) => allPaths.push(f.storage_path))));
    let photoUrlByPath = {};
    if (allPaths.length) {
      const { data: signed } = await supabase.storage.from("diseno-fotos").createSignedUrls(allPaths, 3600);
      (signed || []).forEach((s) => { if (s.signedUrl) photoUrlByPath[s.path] = s.signedUrl; });
    }

    const pedidoIds = data.map((r) => r.id);
    const { data: auditRows } = pedidoIds.length
      ? await supabase.from("audit_log").select("*").eq("entity", "pedido").in("entity_id", pedidoIds).order("created_at", { ascending: true })
      : { data: [] };
    const auditByPedido = {};
    (auditRows || []).forEach((a) => { (auditByPedido[a.entity_id] ||= []).push({ ts: a.created_at, user: a.user_name, action: a.action, detail: a.detail }); });
    setSales(data.map((row) => mapSale(row, auditByPedido[row.id] || [], photoUrlByPath)));
  };
  useEffect(() => { if (session) loadSales(); }, [session]);

  // payments queda como cache local de la tabla pagos (igual que sales/clients/cajas) para que
  // cajaTotals/CajaBreakdown/Resumen/Reportes sigan funcionando sin cambios — antes se mutaba a
  // mano en memoria, ahora se sincroniza con Supabase vía load* + refetch después de cada guardado.
  const mapPayment = (row) => ({
    id: row.id, saleId: row.pedido_id, itemId: null, orderPaymentId: row.order_payment_id,
    vendorId: row.created_by, vendorName: "", method: row.method, amountUSD: Number(row.amount_usd),
    amountRaw: Number(row.amount), currency: row.currency, rateSnap: Number(row.rate_snap),
    reference: row.reference_number || "", createdAt: row.created_at, cajaId: row.caja_id,
  });
  const loadPayments = async () => {
    const { data, error } = await supabase.from("pagos").select("*").order("created_at", { ascending: true });
    if (!error) setPayments(data.map(mapPayment));
  };
  useEffect(() => { if (session) loadPayments(); }, [session]);

  // Tasa de cambio compartida entre TODOS los vendedores/master (antes era un useState local:
  // cada navegador podía tener una tasa distinta, dando totales en Bs inconsistentes entre ventas
  // simultáneas de dos vendedores). set_active_rate es una función atómica (desactiva la vieja +
  // inserta la nueva en una sola transacción) para que dos cambios de tasa al mismo tiempo no choquen.
  const loadRate = async () => {
    const { data } = await supabase.from("exchange_rates").select("usd_to_ves").eq("is_active", true).maybeSingle();
    if (data) setRate(Number(data.usd_to_ves));
  };
  useEffect(() => { if (session) loadRate(); }, [session]);
  const persistRate = async (newRate) => {
    const { data, error } = await supabase.rpc("set_active_rate", { new_rate: newRate });
    if (error) { console.error("persistRate:", error); return; }
    setRate(Number(data.usd_to_ves));
  };

  const login = async (cedula, password) => {
    const email = authEmailFor(cedula);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Credenciales inválidas." };

    const { data: vendedor, error: vendedorErr } = await supabase.from("vendedores").select("*").eq("auth_user_id", data.user.id).single();
    if (vendedorErr || !vendedor) { await supabase.auth.signOut(); return { error: "No se encontró un perfil para este usuario." }; }
    if (!vendedor.active) { await supabase.auth.signOut(); return { error: "Vendedor inactivo. Contacta al supervisor." }; }
    if (loginMode === "master" && vendedor.role !== "master") { await supabase.auth.signOut(); return { error: "Estas credenciales no son de supervisor." }; }
    if (loginMode === "vendedor" && vendedor.role !== "vendedor") { await supabase.auth.signOut(); return { error: "Usá el acceso de Supervisor para esta cuenta." }; }

    setSession(sessionFromVendedor(vendedor));
    setRoute("home");
  };
  const logout = async () => { await supabase.auth.signOut(); setSession(null); setRoute("home"); };

  const findOrCreateClient = async (c) => {
    const key = (c.phone || "").trim();
    let found = null;
    if (key) {
      const { data } = await supabase.from("clientes").select("*").eq("phone", key).maybeSingle();
      found = data;
    } else if (c.name.trim()) {
      const { data } = await supabase.from("clientes").select("*").ilike("name", c.name.trim()).maybeSingle();
      found = data;
    }
    if (found) {
      const patch = { name: c.name || found.name, phone: c.phone || found.phone, cedula: c.cedula || found.cedula, direccion: c.direccion || found.direccion };
      const { data: updated, error } = await supabase.from("clientes").update(patch).eq("id", found.id).select().single();
      const row = !error && updated ? updated : { ...found, ...patch };
      setClients((p) => p.map((x) => (x.id === found.id ? mapClient(row) : x)));
      return found.id;
    }
    const { data: created, error } = await supabase
      .from("clientes")
      .insert({ name: c.name, phone: c.phone, cedula: c.cedula, direccion: c.direccion })
      .select()
      .single();
    if (error || !created) { console.error("findOrCreateClient:", error); return null; }
    setClients((p) => [...p, mapClient(created)]);
    return created.id;
  };

  const saveSale = async (data, existingId) => {
    // Los presupuestos solo se imprimen: nunca deben tocar sales, payments ni Caja.
    if (data.items.some((i) => i.tipo_operacion === "presupuesto")) return;
    // Guard defensivo (la UI ya bloquea el botón): una venta real necesita nombre + teléfono.
    if (!data.client.name?.trim() || !data.client.phone?.trim()) return;

    const clientId = await findOrCreateClient(data.client);
    const myCaja = openCajaOf(cajas, session.id);
    const oldSale = existingId ? sales.find((s) => s.id === existingId) : null;
    const oldItems = oldSale ? oldSale.data.items : [];
    const oldItemIds = new Set(oldItems.map((i) => i.id));
    const newItemIds = new Set(data.items.map((i) => i.id));
    const oldPayments = oldSale ? oldSale.data.orderPayments : [];
    const oldPaymentIds = new Set(oldPayments.map((p) => p.id));
    const newPaymentIds = new Set(data.orderPayments.map((p) => p.id));

    const itemPayload = (it) => ({
      name: it.name, talla: it.talla, cantidad: it.cantidad, color: it.color, unit_price: it.price,
      line_total: lineTotal(it), operacion_tipo: it.tipo_operacion,
      procesos_taller: it.procesos_taller, procesos_taller_done: it.procesos_taller_done,
      procesos_diseno: it.procesos_diseno, procesos_diseno_done: it.procesos_diseno_done,
      zones: it.zones, estado: it.estado,
    });
    // Sincroniza notas Y fotos de una zona. Las fotos nuevas (path === null, agregadas esta sesión
    // como data URI vía optimizeImage) se suben a Storage recién acá; las que ya no están en la
    // lista pero sí en oldDesignData se borran de Storage + la fila en pedido_item_fotos.
    const syncDesignData = async (pedidoItemId, designData, oldDesignData) => {
      for (const [vista, d] of Object.entries(designData)) {
        if (d.notes && d.notes.trim()) {
          await supabase.from("pedido_item_diseno").upsert({ pedido_item_id: pedidoItemId, vista, notes: d.notes.trim() }, { onConflict: "pedido_item_id,vista" });
        } else if (oldDesignData) {
          await supabase.from("pedido_item_diseno").delete().eq("pedido_item_id", pedidoItemId).eq("vista", vista);
        }

        const oldPhotos = oldDesignData ? oldDesignData[vista].photos : [];
        const newPhotos = d.photos;
        const removedPaths = oldPhotos.filter((p) => p.path && !newPhotos.some((np) => np.path === p.path)).map((p) => p.path);
        if (removedPaths.length) {
          await supabase.storage.from("diseno-fotos").remove(removedPaths);
          await supabase.from("pedido_item_fotos").delete().in("storage_path", removedPaths);
        }
        for (const photo of newPhotos) {
          if (photo.path) continue; // ya estaba subida de un guardado anterior
          try {
            const blob = await (await fetch(photo.url)).blob();
            const path = `${pedidoItemId}/${vista}/${newUuid()}.jpg`;
            const { error: upErr } = await supabase.storage.from("diseno-fotos").upload(path, blob, { contentType: "image/jpeg" });
            if (upErr) { console.error("saveSale: upload foto:", upErr); continue; }
            await supabase.from("pedido_item_fotos").insert({ pedido_item_id: pedidoItemId, vista, storage_path: path });
          } catch (e) { console.error("saveSale: upload foto:", e); }
        }
      }
    };

    let saleId = existingId;
    if (!existingId) {
      const { data: pedidoRow, error: pedidoErr } = await supabase
        .from("pedidos")
        .insert({
          vendedor_id: session.id, cliente_id: clientId, total: data.total, rate_snap: data.rate, caja_id: myCaja ? myCaja.id : null,
          has_delivery: !!data.hasDelivery, delivery_fee: data.deliveryFee || 0,
          delivery_incluido_en_total: data.deliveryIncludedInTotal !== false,
          comision_porcentaje: data.comisionPorcentaje || 0, comision_monto: data.comisionMonto || 0,
        })
        .select()
        .single();
      if (pedidoErr) { console.error("saveSale: insert pedido:", pedidoErr); return; }
      saleId = pedidoRow.id;
    } else {
      const removedItemIds = oldItems.filter((i) => !newItemIds.has(i.id)).map((i) => i.id);
      if (removedItemIds.length) {
        // limpiar Storage de los items que se van, si no quedan archivos huérfanos para siempre
        const { data: orphanFotos } = await supabase.from("pedido_item_fotos").select("storage_path").in("pedido_item_id", removedItemIds);
        const orphanPaths = (orphanFotos || []).map((f) => f.storage_path);
        if (orphanPaths.length) await supabase.storage.from("diseno-fotos").remove(orphanPaths);
        await supabase.from("pedido_items").delete().in("id", removedItemIds);
      }
    }

    // Items: actualizar los que ya existían, crear los agregados durante la edición.
    // Secuencial (no bulk) para poder mapear con certeza cada item local -> su id real en la base.
    for (const it of data.items) {
      const oldItem = oldItems.find((x) => x.id === it.id);
      if (oldItem) {
        await supabase.from("pedido_items").update(itemPayload(it)).eq("id", it.id);
        await syncDesignData(it.id, it.designData, oldItem.designData);
      } else {
        const { data: dbItem, error: itemErr } = await supabase.from("pedido_items").insert({ pedido_id: saleId, ...itemPayload(it) }).select().single();
        if (itemErr) { console.error("saveSale: insert item:", itemErr); continue; }
        await syncDesignData(dbItem.id, it.designData, null);
      }
    }

    // Pagos: mismo diff add/remove de siempre (v0.8), ahora escribiendo contra la tabla pagos real
    // en vez de un array en memoria. Un pago quitado se revierte con un evento negativo en la MISMA
    // caja donde se cobró originalmente — sin esto, Caja conservaría dinero fantasma.
    const newPayments = data.orderPayments.filter((p) => !oldPaymentIds.has(p.id));
    for (const p of newPayments) {
      await supabase.from("pagos").insert({
        pedido_id: saleId, order_payment_id: p.id, method: p.method, amount: p.paid, currency: p.currency,
        amount_usd: p.amountUSD, rate_snap: data.rate, reference_number: p.reference || null,
        caja_id: myCaja ? myCaja.id : null, created_by: session.id,
      });
    }
    const removedPayments = oldPayments.filter((p) => !newPaymentIds.has(p.id));
    for (const p of removedPayments) {
      const { data: original } = await supabase.from("pagos").select("caja_id").eq("pedido_id", saleId).eq("order_payment_id", p.id).eq("is_reversal", false).maybeSingle();
      await supabase.from("pagos").insert({
        pedido_id: saleId, order_payment_id: p.id, is_reversal: true, method: p.method, amount: -p.paid, currency: p.currency,
        amount_usd: -p.amountUSD, rate_snap: data.rate,
        reference_number: p.reference ? `Anulación · ${p.reference}` : "Anulación",
        caja_id: original ? original.caja_id : (myCaja ? myCaja.id : null), created_by: session.id,
      });
    }

    let payDetail = "";
    if (newPayments.length > 0) payDetail += ` · +${newPayments.length} pago(s) (${usd(newPayments.reduce((s, e) => s + e.amountUSD, 0))})`;
    if (removedPayments.length > 0) payDetail += ` · ${removedPayments.length} pago(s) anulado(s) (${usd(removedPayments.reduce((s, e) => s + e.amountUSD, 0))})`;

    if (existingId) {
      await supabase.from("pedidos").update({
        cliente_id: clientId, total: data.total, rate_snap: data.rate, updated_at: new Date().toISOString(),
        has_delivery: !!data.hasDelivery, delivery_fee: data.deliveryFee || 0,
        delivery_incluido_en_total: data.deliveryIncludedInTotal !== false,
        comision_porcentaje: data.comisionPorcentaje || 0, comision_monto: data.comisionMonto || 0,
      }).eq("id", saleId);
      await supabase.from("audit_log").insert({ entity: "pedido", entity_id: saleId, action: "Editó el pedido", detail: `Total ${usd(data.total)} · ${data.items.length} prod.${payDetail}`, user_id: session.id, user_name: session.name });
    } else {
      await supabase.from("audit_log").insert({ entity: "pedido", entity_id: saleId, action: "Creó el pedido", detail: `Total ${usd(data.total)}${payDetail}`, user_id: session.id, user_name: session.name });
    }

    await Promise.all([loadSales(), loadPayments()]);
    setEditSale(null); setRoute("seguimiento");
  };

  const openCaja = async (cashUSD, cashVES) => {
    const { data, error } = await supabase
      .from("cajas")
      .insert({ vendedor_id: session.id, opening_cash_usd: Number(cashUSD) || 0, opening_cash_ves: Number(cashVES) || 0, rate_open: rate })
      .select("*, vendedores(name)")
      .single();
    if (!error) setCajas((p) => [mapCaja(data), ...p]);
  };
  const closeCaja = async (cajaId, countedUSD, countedVES) => {
    const c = cajas.find((x) => x.id === cajaId);
    if (!c) return;
    const myPayments = paymentsOfCaja(payments, cajaId);
    const cashInUSD = myPayments.filter((p) => p.method === "efectivo_usd").reduce((s, p) => s + p.amountUSD, 0);
    const cashInVES = myPayments.filter((p) => p.method === "efectivo_bs").reduce((s, p) => s + p.amountUSD, 0);
    const expectedCashUSD = c.openingCashUSD + (c.openingCashVES / (rate || 1)) + cashInUSD + cashInVES;
    const countedTotalUSD = (Number(countedUSD) || 0) + (Number(countedVES) || 0) / (rate || 1);
    const { data, error } = await supabase
      .from("cajas")
      .update({
        closed_at: new Date().toISOString(), closing_cash_usd: Number(countedUSD) || 0, closing_cash_ves: Number(countedVES) || 0,
        rate_close: rate, expected_cash_usd: expectedCashUSD, variance_usd: countedTotalUSD - expectedCashUSD,
      })
      .eq("id", cajaId)
      .select("*, vendedores(name)")
      .single();
    if (!error) setCajas((prev) => prev.map((x) => (x.id === cajaId ? mapCaja(data) : x)));
  };

  const setItemState = async (saleId, itemId, estado) => {
    const sale = sales.find((s) => s.id === saleId);
    const it = sale && sale.data.items.find((i) => i.id === itemId);
    const { error } = await supabase.from("pedido_items").update({ estado }).eq("id", itemId);
    if (error) { console.error("setItemState:", error); return; }
    const lbl = ITEM_STATES.find((x) => x.id === estado).label;
    const detail = `${it ? it.name : ""} → ${lbl}`;
    await supabase.from("audit_log").insert({ entity: "pedido", entity_id: saleId, action: "Cambió estado de producto", detail, user_id: session.id, user_name: session.name });
    setSales((prev) => prev.map((s) => {
      if (s.id !== saleId) return s;
      const items = s.data.items.map((i) => (i.id === itemId ? { ...i, estado } : i));
      return { ...s, data: { ...s.data, items }, audit: [...s.audit, { ts: new Date().toISOString(), user: session.name, action: "Cambió estado de producto", detail }] };
    }));
  };

  const toggleProceso = async (saleId, itemId, categoria, procesoId) => {
    const sale = sales.find((s) => s.id === saleId);
    const it = sale && sale.data.items.find((i) => i.id === itemId);
    if (!it) return;
    const doneKey = categoria === "taller" ? "procesos_taller_done" : "procesos_diseno_done";
    const list = categoria === "taller" ? PROCESOS_TALLER : PROCESOS_DISENO;
    const isDone = it[doneKey].includes(procesoId);
    const newDone = isDone ? it[doneKey].filter((x) => x !== procesoId) : [...it[doneKey], procesoId];
    const { error } = await supabase.from("pedido_items").update({ [doneKey]: newDone }).eq("id", itemId);
    if (error) { console.error("toggleProceso:", error); return; }
    const lbl = list.find((x) => x.id === procesoId).label;
    const detail = `${it.name} · ${lbl} → ${isDone ? "pendiente" : "completado"}`;
    await supabase.from("audit_log").insert({ entity: "pedido", entity_id: saleId, action: `Proceso de ${categoria}`, detail, user_id: session.id, user_name: session.name });
    setSales((prev) => prev.map((s) => {
      if (s.id !== saleId) return s;
      const items = s.data.items.map((i) => (i.id === itemId ? { ...i, [doneKey]: newDone } : i));
      return { ...s, data: { ...s.data, items }, audit: [...s.audit, { ts: new Date().toISOString(), user: session.name, action: `Proceso de ${categoria}`, detail }] };
    }));
  };

  // Alta real de vendedores ("manager de apertura"): la Edge Function create-vendor
  // hace, del lado del servidor, lo que el navegador nunca podría hacer con la anon
  // key (crear la cuenta de Auth) y valida que quien llama sea un master activo.
  const addVendor = async (v) => {
    const { data, error } = await supabase.functions.invoke("create-vendor", {
      body: { cedula: v.cedula, password: v.password, name: v.name },
    });
    if (error) return { error: error.message || "No se pudo crear el vendedor." };
    if (data && data.error) return { error: data.error };
    await loadVendors();
  };
  const toggleVendor = async (id) => {
    const target = vendors.find((v) => v.id === id);
    if (!target) return;
    const { error } = await supabase.from("vendedores").update({ active: !target.active }).eq("id", id);
    if (!error) setVendors((p) => p.map((v) => (v.id === id ? { ...v, active: !v.active } : v)));
  };
  // Editar vendedor (nombre/cédula/clave): la cédula determina el email sintético
  // de Auth y la clave solo puede resetearse con la Service Role Key — mismo
  // motivo por el que el alta pasa por una Edge Function (update-vendor).
  const updateVendor = async (v) => {
    const { data, error } = await supabase.functions.invoke("update-vendor", {
      body: { id: v.id, name: v.name, cedula: v.cedula, password: v.password || undefined },
    });
    if (error) return { error: error.message || "No se pudo editar el vendedor." };
    if (data && data.error) return { error: data.error };
    await loadVendors();
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Wordmark size="text-2xl" flicker />
      </div>
    );
  }
  if (!session) return <LoginScreen mode={loginMode} onLogin={login} onSwitch={() => setLoginMode((m) => (m === "master" ? "vendedor" : "master"))} />;

  const nav = (id) => { setRoute(id); setOpenClient(null); setOpenVendor(null); };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar route={route} setRoute={nav} session={session} onLogout={logout} />
      <div className="flex-1 overflow-auto">
        {route === "home" && <HomeScreen session={session} sales={sales} payments={payments} cajas={cajas} />}
        {route === "sell" && (
          session.role === "vendedor" && !editSale && !openCajaOf(cajas, session.id)
            ? <CajaRequiredScreen onGoCaja={() => nav("caja")} />
            : <SellScreen session={session} rate={rate} setRate={setRate} onRateBlur={persistRate} initialSale={editSale} onExit={() => { setEditSale(null); setRoute("home"); }} onSaved={saveSale} />
        )}
        {route === "seguimiento" && <SeguimientoScreen session={session} sales={sales} onSetItemState={setItemState} onToggleProceso={toggleProceso} onView={(s) => setViewSale(s)} onEdit={(s) => { setEditSale(s); setRoute("sell"); }} />}
        {route === "clientes" && (openClient
          ? <ClienteDetail session={session} clientId={openClient} sales={sales} clients={clients} onBack={() => setOpenClient(null)} onView={(s) => setViewSale(s)} />
          : <ClientesScreen session={session} sales={sales} clients={clients} onOpen={(id) => setOpenClient(id)} />)}
        {route === "vendedores" && session.role === "master" && (openVendor
          ? <VendedorDetail vendorId={openVendor} vendors={vendors} sales={sales} onBack={() => setOpenVendor(null)} onView={(s) => setViewSale(s)} />
          : <VendedoresScreen vendors={vendors} sales={sales} onAdd={addVendor} onToggle={toggleVendor} onUpdate={updateVendor} onOpen={(id) => setOpenVendor(id)} />)}
        {route === "caja" && <CajaScreen session={session} sales={sales} payments={payments} cajas={cajas} rate={rate} onOpenCaja={openCaja} onCloseCaja={closeCaja} />}
        {route === "resumen" && session.role === "master" && <ResumenFinancieroScreen sales={sales} payments={payments} />}
        {route === "reportes" && session.role === "master" && (
          <ReportesScreen sales={sales} clients={clients} vendors={vendors}
            onOpenClient={(id) => { setOpenClient(id); setRoute("clientes"); }}
            onOpenVendor={(id) => { setOpenVendor(id); setRoute("vendedores"); }} />
        )}
      </div>
      {viewSale && <ComandaModal session={session} data={viewSale.data} saleMeta={viewSale} readOnly onClose={() => setViewSale(null)} />}
    </div>
  );
}
