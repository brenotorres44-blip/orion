// ══════════════════════════════════════════════
//  ORION — utils.js
//  Estado global, helpers, toast, modal, tick
// ══════════════════════════════════════════════

// ── Estado global ──────────────────────────────
export let usuarioAtual = null;
export let armarios     = [];
export let itens        = [];
export let movimentos   = [];
export let usuarios     = [];
export let pinosConfig  = JSON.parse(localStorage.getItem('dos_pinos') || '{}');
export let espOnline    = false;
export let editandoArmId   = null;
export let editandoItemId  = null;
export let editandoUserId  = null;
export let currentArmId    = null;
export let currentGavId    = null;

export const ADMIN_EMAIL = 'brenotorres44@gmail.com';

export const PERMISSOES = {
  admin:    ['dashboard','armarios','itens','movimentos','historico','voz','esp32','acesso','retiradas','crachas'],
  operador: ['dashboard','armarios','itens','movimentos','historico','voz','retiradas'],
  consulta: ['dashboard','historico','voz','retiradas']
};

// Setters para módulos que precisam atualizar o estado
export function setUsuarioAtual(u)    { usuarioAtual    = u; }
export function setArmarios(a)        { armarios        = a; }
export function setItens(i)           { itens           = i; }
export function setMovimentos(m)      { movimentos      = m; }
export function setUsuarios(u)        { usuarios        = u; }
export function setPinosConfig(p)     { pinosConfig     = p; }
export function setEspOnlineState(v)  { espOnline       = v; }
export function setEditandoArmId(v)   { editandoArmId   = v; }
export function setEditandoItemId(v)  { editandoItemId  = v; }
export function setEditandoUserId(v)  { editandoUserId  = v; }
export function setCurrentArm(a, g)  { currentArmId    = a; currentGavId = g; }

// ── Helpers ────────────────────────────────────
export const uid      = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
export const ts       = () => new Date().toLocaleString('pt-BR');
export const fmtR     = v  => 'R$ ' + Number(v||0).toFixed(2).replace('.',',');
export const armById  = id => armarios.find(a => a.id === id);
export const gavById  = (aId,gId) => armById(aId)?.gavetas?.find(g => g.id === gId);
export const armNome  = id => armById(id)?.nome || '?';
export const gavLabel = (aId,gId) => { const g=gavById(aId,gId); return g ? (g.nome||`Gaveta ${g.num}`) : '?'; };
export const podeAcessar = p => usuarioAtual && (PERMISSOES[usuarioAtual.nivel]||[]).includes(p);

// ── Toast ──────────────────────────────────────
export function toast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'show ' + type;
  clearTimeout(t._t); t._t = setTimeout(() => t.className='', 3200);
}

// ── Modal de confirmação ───────────────────────
export function openModal(title, msg, label, onConfirm) {
  document.getElementById('modal-title-txt').textContent = title;
  document.getElementById('modal-msg').textContent = msg;
  document.getElementById('modal-confirm-btn').innerHTML = '✕ ' + label;
  document.getElementById('modal-confirm-btn').onclick = () => { onConfirm(); closeModal(); };
  document.getElementById('modal-overlay').classList.add('open');
}
export function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

// ── Relógio ────────────────────────────────────
function tick() {
  const n = new Date();
  const el = document.getElementById('clock');
  if(el) el.textContent = String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+':'+String(n.getSeconds()).padStart(2,'0');
}
setInterval(tick, 1000); tick();

// Expõe funções essenciais globalmente (chamadas por onclick no HTML)
window.closeModal = closeModal;
