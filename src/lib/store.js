// Persistencia local opcional (para la demo sin backend).
// En el artifact de chat NO se usa localStorage; en Vite si funciona.
// Ejemplo de uso futuro: envolver el estado de App con estas utilidades.
const KEY = "zappostore_state_v1";
export function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
