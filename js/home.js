// ══════════════════════════════════════════════
//  ORION — home.js
//  renderHome, renderDashboard, logHtml
// ══════════════════════════════════════════════
import { armarios, itens, movimentos, usuarios, espOnline,
         fmtR, armById, armNome, gavById, podeAcessar } from './utils.js';
import { updateCounters } from './app.js';

export function renderHome() {
  const hora = new Date().getHours();
  const saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const greet = document.getElementById('home-greeting');
  if(greet) greet.textContent = `${saud}, ${window.usuarioAtual?.nome?.split(' ')[0] || 'Breno'} ✦`;

  const totalItens = itens.length;
  const totalQty   = itens.reduce((a,i)=>a+(i.qty||0),0);
  const totalVal   = itens.reduce((a,i)=>a+(i.qty||0)*(i.preco||0),0);
  const lowCount   = itens.filter(i=>i.min>0&&i.qty<i.min).length;

  const hs = document.getElementById('home-stats');
  if(hs) hs.innerHTML = `
    <div class="stat-box" style="--w:${Math.min(100,armarios.length*20)}%"><div class="stat-label">Armários</div><div class="stat-value">${armarios.length}</div><div class="stat-unit">cadastrados</div></div>
    <div class="stat-box" style="--w:60%"><div class="stat-label">Itens</div><div class="stat-value">${totalItens}</div><div class="stat-unit">cadastrados</div></div>
    <div class="stat-box" style="--w:55%"><div class="stat-label">Unidades</div><div class="stat-value">${totalQty}</div><div class="stat-unit">em estoque</div></div>
    <div class="stat-box" style="--w:70%"><div class="stat-label">Valor total</div><div class="stat-value" style="font-size:20px">${fmtR(totalVal)}</div><div class="stat-unit">inventário</div></div>
    <div class="stat-box" style="--w:${lowCount>0?100:5}%;${lowCount>0?'border-color:var(--red)':''}"><div class="stat-label">Críticos</div><div class="stat-value" style="color:${lowCount>0?'var(--red)':'var(--green)'}">${lowCount}</div><div class="stat-unit">abaixo do mínimo</div></div>`;

  const MODULES = [
    {id:'dashboard', icon:'ti-layout-dashboard', name:'Dashboard',     sub:'Visão geral', amber:true},
    {id:'armarios',  icon:'ti-building-warehouse',name:'Armários',     sub:`${armarios.length} cadastrados`},
    {id:'itens',     icon:'ti-package',           name:'Itens',        sub:`${totalItens} itens`, badge: lowCount>0?`${lowCount} crítico(s)`:''},
    {id:'movimentos',icon:'ti-arrows-exchange',   name:'Movimentos',   sub:'Entradas e saídas'},
    {id:'historico', icon:'ti-report-analytics',  name:'Histórico',    sub:'Relatórios'},
    {id:'voz',       icon:'ti-microphone',        name:'Comando de Voz', sub:'Localizar item'},
    {id:'esp32',     icon:'ti-cpu',               name:'ESP32',        sub: espOnline ? '● Online':'○ Offline'},
    {id:'acesso',    icon:'ti-shield-lock',        name:'Acesso',       sub:`${usuarios.length} usuários`},
  ].filter(m => podeAcessar(m.id) || m.id==='dashboard');

  const hm = document.getElementById('home-modules');
  if(hm) hm.innerHTML = MODULES.map(m=>`
    <div class="home-module${m.amber?' amber-mod':''}" onclick="window.showPanel('${m.id}')">
      <i class="ti ${m.icon} home-mod-icon"></i>
      <div class="home-mod-name">${m.name}</div>
      <div class="home-mod-sub">${m.sub}</div>
      ${m.badge?`<div class="home-mod-badge">${m.badge}</div>`:''}</div>`).join('');
}

export function renderDashboard() {
  updateCounters();
  const totalItens = itens.length;
  const totalQty   = itens.reduce((a,i)=>a+(i.qty||0),0);
  const totalVal   = itens.reduce((a,i)=>a+(i.qty||0)*(i.preco||0),0);
  const lowCount   = itens.filter(i=>i.min>0&&i.qty<i.min).length;

  document.getElementById('stats-row').innerHTML = `
    <div class="stat-box" style="--w:${Math.min(100,armarios.length*20)}%"><div class="stat-label">Armários</div><div class="stat-value">${armarios.length}</div><div class="stat-unit">cadastrados</div></div>
    <div class="stat-box" style="--w:60%"><div class="stat-label">Total de itens</div><div class="stat-value">${totalItens}</div><div class="stat-unit">cadastrados</div></div>
    <div class="stat-box" style="--w:55%"><div class="stat-label">Unidades</div><div class="stat-value">${totalQty}</div><div class="stat-unit">em estoque</div></div>
    <div class="stat-box" style="--w:70%"><div class="stat-label">Valor total</div><div class="stat-value" style="font-size:20px">${fmtR(totalVal)}</div><div class="stat-unit">inventário</div></div>
    <div class="stat-box" style="--w:${lowCount>0?100:5}%;${lowCount>0?'border-color:var(--red)':''}"><div class="stat-label">Críticos</div><div class="stat-value" style="color:${lowCount>0?'var(--red)':'var(--green)'}">${lowCount}</div><div class="stat-unit">abaixo do mínimo</div></div>`;

  document.getElementById('dash-arm-list').innerHTML = armarios.length
    ? armarios.map(arm => {
        const gItens = itens.filter(i=>i.armId===arm.id);
        const cor = arm.cor||'#00d4ff';
        return `<div style="display:flex;align-items:center;gap:12px;font-size:13px;padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="width:10px;height:10px;border-radius:50%;background:${cor};flex-shrink:0;box-shadow:0 0 6px ${cor}60"></span>
          <span style="font-weight:600;flex:1">${arm.nome}</span>
          <span style="color:var(--text-dim);font-size:11px">${arm.numGavetas||0} gav.</span>
          <span style="color:var(--text-dim);font-size:11px">${gItens.length} itens</span>
          <span style="color:${cor};font-size:11px">${gItens.reduce((a,i)=>a+(i.qty||0),0)} unid.</span>
        </div>`;
      }).join('')
    : '<div style="color:var(--text-dim);font-size:13px;padding:12px">Nenhum armário cadastrado.</div>';

  document.getElementById('dash-log').innerHTML = movimentos.slice(0,8).length
    ? movimentos.slice(0,8).map(m=>logHtml(m)).join('')
    : '<div style="color:var(--text-dim);font-size:12px;padding:12px">Nenhuma movimentação.</div>';

  const lows = itens.filter(i=>i.min>0&&i.qty<i.min);
  document.getElementById('low-stock-body').innerHTML = lows.length
    ? lows.map(i=>`<tr>
        <td style="font-weight:600">${i.nome}</td>
        <td><span style="color:${armById(i.armId)?.cor||'var(--cyan)'};font-weight:600">${armNome(i.armId)}</span></td>
        <td><span class="gaveta-badge">G${gavById(i.armId,i.gavId)?.num||'?'}</span></td>
        <td class="qty-low">${i.qty}</td>
        <td style="color:var(--text-dim)">${i.min}</td>
        <td style="color:var(--red);font-weight:700">−${i.min - i.qty}</td>
        <td><button class="hud-btn amber" style="padding:5px 12px;font-size:11px" onclick="window.abrirMovimento('${i.id}')">+ Entrada</button></td>
      </tr>`).join('')
    : '<tr><td colspan="7" style="color:var(--green);text-align:center;padding:16px">✓ Todos os itens estão OK</td></tr>';
}

export function logHtml(m) {
  const item  = itens.find(i=>i.id===m.itemId);
  const nome  = item ? item.nome : (m.itemNome||'?');
  const sinal = m.tipo==='entrada' ? '+' : '−';
  return `<div class="log-item ${m.tipo==='entrada'?'entrada':m.tipo==='edit'?'edit':'saida'}">
    <span class="log-time">${m.ts||''}</span>
    <span class="log-desc">${(m.tipo||'').toUpperCase()} · ${nome}${m.obs?' · '+m.obs:''}</span>
    <span class="log-qty">${sinal}${m.qty}</span>
  </div>`;
}
