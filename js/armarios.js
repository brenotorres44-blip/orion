// ══════════════════════════════════════════════
//  ORION — armarios.js
//  CRUD armários e gavetas
// ══════════════════════════════════════════════
import { fsSet, fsDelete } from './firebase.js';
import { toast, openModal, uid, ts, fmtR, armById, gavById,
         armarios, itens, setArmarios, setItens,
         editandoArmId, setEditandoArmId } from './utils.js';
import { updateCounters } from './app.js';
import { renderDashboard } from './home.js';

document.getElementById('arm-ngav').addEventListener('input', buildGavNames);
document.getElementById('arm-cor').addEventListener('input', e => {
  document.getElementById('arm-cor-preview').textContent = e.target.value;
});

function buildGavNames() {
  const n    = parseInt(document.getElementById('arm-ngav').value)||0;
  const wrap = document.getElementById('gav-names-wrap');
  const grid = document.getElementById('gav-names-grid');
  if(n<1){wrap.style.display='none';return;}
  wrap.style.display='';
  const old = [...grid.querySelectorAll('input')].map(i=>i.value);
  grid.innerHTML='';
  for(let i=1;i<=n;i++){
    grid.innerHTML+=`<div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:11px;color:var(--amber);font-weight:600;width:24px;flex-shrink:0">G${i}</span>
      <input class="hud-input" id="gname-${i}" placeholder="Nome da gaveta ${i}" value="${old[i-1]||''}">
    </div>`;
  }
}
buildGavNames();

window.salvarArmario = async function() {
  const nome = document.getElementById('arm-nome').value.trim();
  const local= document.getElementById('arm-local').value.trim();
  const n    = parseInt(document.getElementById('arm-ngav').value)||0;
  const cor  = document.getElementById('arm-cor').value;
  if(!nome){toast('Informe o nome','red');return;}
  if(n<1||n>30){toast('Gavetas: 1 a 30','red');return;}
  const gavetas=[];
  for(let i=1;i<=n;i++){
    const nomeG=document.getElementById('gname-'+i)?.value.trim()||'';
    if(editandoArmId){ const arm=armById(editandoArmId); const ex=arm?.gavetas?.find(g=>g.num===i); gavetas.push({id:ex?.id||uid(),num:i,nome:nomeG}); }
    else gavetas.push({id:uid(),num:i,nome:nomeG});
  }
  const armId = editandoArmId || uid();
  const dados = {id:armId,nome,local,numGavetas:n,gavetas,cor,criado:editandoArmId?(armById(editandoArmId)?.criado||ts()):ts()};
  await fsSet('armarios', armId, dados);
  if(editandoArmId){ const idx=armarios.findIndex(a=>a.id===editandoArmId); if(idx>=0) armarios[idx]=dados; else armarios.push(dados); toast('Armário atualizado ✓'); setEditandoArmId(null); }
  else { armarios.push(dados); toast('Armário cadastrado ✓'); }
  updateCounters(); limparFormArmario(); renderArmarios();
}

window.editarArmario = function(id) {
  const arm=armById(id); if(!arm)return;
  setEditandoArmId(id);
  document.getElementById('arm-nome').value=arm.nome;
  document.getElementById('arm-local').value=arm.local||'';
  document.getElementById('arm-ngav').value=arm.numGavetas;
  document.getElementById('arm-cor').value=arm.cor||'#00d4ff';
  document.getElementById('arm-cor-preview').textContent=arm.cor||'#00d4ff';
  buildGavNames();
  arm.gavetas?.forEach(g=>{ const inp=document.getElementById('gname-'+g.num); if(inp) inp.value=g.nome||''; });
  document.getElementById('arm-form-title').innerHTML='✎ Editando: '+arm.nome;
  document.getElementById('btn-cancel-arm').style.display='';
  window.showPanel('armarios');
  window.scrollTo({top:0,behavior:'smooth'});
}

window.excluirArmario = function(id) {
  const arm=armById(id);
  openModal('Excluir armário',`Excluir "${arm?.nome}"? Todos os itens dentro serão removidos.`,'Excluir tudo', async()=>{
    const itensBraco = itens.filter(i=>i.armId===id);
    for(const it of itensBraco) await fsDelete('itens', it.id);
    await fsDelete('armarios', id);
    setItens(itens.filter(i=>i.armId!==id));
    setArmarios(armarios.filter(a=>a.id!==id));
    updateCounters(); renderArmarios(); renderDashboard();
    toast('Armário excluído','amber');
  });
}

window.cancelarArmario = function() { limparFormArmario(); }

function limparFormArmario(){
  setEditandoArmId(null);
  ['arm-nome','arm-local'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('arm-ngav').value='5';
  document.getElementById('arm-cor').value='#00d4ff';
  document.getElementById('arm-cor-preview').textContent='Ciano padrão';
  buildGavNames();
  document.getElementById('arm-form-title').innerHTML='+ Adicionar armário';
  document.getElementById('btn-cancel-arm').style.display='none';
}

export function renderArmarios(){
  const grid=document.getElementById('armario-grid');
  const empty=document.getElementById('arm-empty');
  if(!armarios.length){grid.innerHTML='';empty.style.display='';return;}
  empty.style.display='none';
  grid.innerHTML=armarios.map(arm=>{
    const nItens=itens.filter(i=>i.armId===arm.id).length;
    const nQty=itens.filter(i=>i.armId===arm.id).reduce((a,i)=>a+(i.qty||0),0);
    const cor=arm.cor||'#00d4ff';
    const gavetasHtml=(arm.gavetas||[]).map(g=>{
      const gItens=itens.filter(i=>i.armId===arm.id&&i.gavId===g.id);
      const gLow=gItens.some(i=>i.min>0&&i.qty<i.min);
      const nomeGav=g.nome?`<span class="gav-name">${g.nome}</span>`:'';
      return `<div class="gav-chip" onclick="window.abrirGaveta('${arm.id}','${g.id}')" title="${g.nome||'Gaveta '+g.num}">
        ${gLow?'<div class="gav-alert"></div>':''}
        <span class="gav-num">G${g.num}</span>${nomeGav}
        <span class="gav-count">(${gItens.length})</span>
      </div>`;
    }).join('');
    return `<div class="armario-card" id="acard-${arm.id}">
      <div class="armario-header">
        <div>
          <div class="armario-nome" style="color:${cor}">${arm.nome}</div>
          <div class="armario-local">${arm.local?'📍 '+arm.local:''}</div>
        </div>
        <div class="armario-actions">
          <button class="icon-btn" onclick="window.editarArmario('${arm.id}')">✎</button>
          <button class="icon-btn danger" onclick="window.excluirArmario('${arm.id}')">✕</button>
        </div>
      </div>
      <div class="armario-body">
        <div class="gavetas-row">${gavetasHtml}</div>
        <div class="armario-meta"><span>${arm.numGavetas} gavetas</span><span>${nItens} itens</span><span>${nQty} unid.</span></div>
      </div>
    </div>`;
  }).join('');
}

// Gaveta detail
window.abrirGaveta = function(armId, gavId){
  import('./itens.js').then(m => {
    window._currentArmId=armId; window._currentGavId=gavId;
    const arm=armById(armId); const gav=gavById(armId,gavId);
    if(!arm||!gav) return;
    document.getElementById('detail-title').textContent=`${arm.nome}  ·  ${gav.nome||'Gaveta '+gav.num}`;
    document.getElementById('detail-sub').textContent=`${arm.local||''} · Clique num item para editar`;
    m.renderDetalheGaveta(armId, gavId);
    const d=document.getElementById('gaveta-detail');
    d.classList.add('open');
    document.querySelectorAll('.gav-chip').forEach(c=>c.classList.remove('selected-gav'));
    const ac=document.getElementById('acard-'+armId);
    if(ac){ const chips=[...ac.querySelectorAll('.gav-chip')]; const idx=(arm.gavetas||[]).findIndex(g=>g.id===gavId); if(chips[idx]) chips[idx].classList.add('selected-gav'); }
    d.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
}

window.fecharDetalhe = function(){
  document.getElementById('gaveta-detail').classList.remove('open');
  document.querySelectorAll('.gav-chip').forEach(c=>c.classList.remove('selected-gav'));
  window._currentArmId=null; window._currentGavId=null;
}

window.abrirFormItem = function(itemId, preArmId, preGavId){
  import('./itens.js').then(m => {
    window.showPanel('itens');
    m.populateArmarioSelect(preArmId||'');
    if(preArmId) m.populateGavetasSelect(preArmId,'f-gaveta',preGavId||'');
    if(itemId) m.editarItem(itemId);
    window.scrollTo({top:0,behavior:'smooth'});
  });
}
