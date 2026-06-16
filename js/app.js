// ══════════════════════════════════════════════
//  ORION — app.js
//  Navegação, carregamento de dados, counters
// ══════════════════════════════════════════════
import { fsGetAll } from './firebase.js';
import { toast, podeAcessar, setArmarios, setItens, setMovimentos, setUsuarios,
         armarios, itens, movimentos, usuarios } from './utils.js';
import { renderHome, renderDashboard }  from './home.js';
import { renderArmarios }               from './armarios.js';
import { populateArmarioSelect, renderTabela } from './itens.js';
import { renderMovLog, populateMovSelect }      from './movimentos.js';
import { renderHistorico }              from './historico.js';
import { initPainelEsp32 }              from './esp32.js';
import { renderTabelaUsuarios }         from './usuarios.js';

const PANEL_NAMES = {
  home:'INÍCIO', dashboard:'DASHBOARD', armarios:'ARMÁRIOS', itens:'ITENS',
  movimentos:'MOVIMENTOS', historico:'HISTÓRICO', voz:'COMANDO DE VOZ',
  esp32:'ESP32', acesso:'ACESSO'
};

// ── Carregamento inicial dos dados ─────────────
export async function carregarDados() {
  try {
    const [a, i, m, u] = await Promise.all([
      fsGetAll('armarios'), fsGetAll('itens'),
      fsGetAll('movimentos'), fsGetAll('usuarios')
    ]);
    setArmarios(a); setItens(i);
    m.sort((x,y) => (y.ts||'').localeCompare(x.ts||''));
    setMovimentos(m); setUsuarios(u);
    updateCounters();
  } catch(e) {
    toast('Erro ao carregar dados: ' + e.message, 'red');
  }
}

// ── Navegação entre painéis ────────────────────
window.showPanel = function(id) {
  if(window.usuarioAtual && !podeAcessar(id) && id !== 'home') { toast('Sem permissão','red'); return; }
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('panel-'+id);
  const btn   = document.querySelector(`[data-panel="${id}"]`);
  if(panel) panel.classList.add('active');
  if(btn)   btn.classList.add('active');
  const bc = document.getElementById('breadcrumb-atual');
  if(bc) bc.textContent = PANEL_NAMES[id] || id.toUpperCase();
  if(id==='home')       renderHome();
  if(id==='dashboard')  renderDashboard();
  if(id==='armarios')   renderArmarios();
  if(id==='itens')      { populateArmarioSelect(); renderTabela(); }
  if(id==='movimentos') { renderMovLog(); populateMovSelect(); }
  if(id==='historico')  renderHistorico();
  if(id==='esp32')      initPainelEsp32();
  if(id==='acesso')     renderTabelaUsuarios();
}

// ── Contadores do topbar ───────────────────────
export function updateCounters() {
  const elA = document.getElementById('total-arm-disp');
  const elG = document.getElementById('total-gav-disp');
  if(elA) elA.textContent = armarios.length;
  if(elG) elG.textContent = armarios.reduce((a,arm)=>a+(arm.gavetas?.length||0),0);
}
