// ══════════════════════════════════════════════
//  ORION — movimentos.js
//  Registrar movimento, log, histórico
// ══════════════════════════════════════════════
import { fsSet, fsDeleteAll } from './firebase.js';
import { toast, openModal, uid, ts, itens, movimentos, setMovimentos, podeAcessar } from './utils.js';
import { logHtml, renderDashboard } from './home.js';
import { renderDetalheGaveta } from './itens.js';

export async function adicionarLog(itemId,itemNome,tipo,qty,obs){
  const mov={id:uid(),itemId,itemNome,tipo,qty,obs:obs||'',ts:ts(),usuario:window.usuarioAtual?.nome||''};
  await fsSet('movimentos',mov.id,mov);
  movimentos.unshift(mov);
}

export function populateMovSelect(){
  const sel=document.getElementById('mov-item');
  const { armNome, gavById } = window._utils || {};
  sel.innerHTML=itens.length
    ?itens.map(i=>`<option value="${i.id}">${i.nome} — ${i.armId} G? — Qtd: ${i.qty}</option>`).join('')
    :'<option value="">Nenhum item cadastrado</option>';
  // Reconstruir com nomes corretos via import
  import('./utils.js').then(({armNome, gavById}) => {
    sel.innerHTML=itens.length
      ?itens.map(i=>`<option value="${i.id}">${i.nome} — ${armNome(i.armId)} G${gavById(i.armId,i.gavId)?.num||'?'} — Qtd: ${i.qty}</option>`).join('')
      :'<option value="">Nenhum item cadastrado</option>';
  });
}

window.abrirMovimento = function(id){
  window.showPanel('movimentos'); populateMovSelect();
  document.getElementById('mov-item').value=id;
  document.getElementById('mov-tipo').value='entrada';
}

window.registrarMovimento = async function(){
  const itemId=document.getElementById('mov-item').value;
  const tipo  =document.getElementById('mov-tipo').value;
  const qty   =parseInt(document.getElementById('mov-qty').value)||0;
  const obs   =document.getElementById('mov-obs').value.trim();
  if(!itemId){toast('Selecione um item','red');return;}
  if(qty<=0){toast('Quantidade inválida','red');return;}
  const idx=itens.findIndex(i=>i.id===itemId);
  if(idx<0){toast('Item não encontrado','red');return;}
  if(tipo==='saida'&&itens[idx].qty<qty){toast(`Estoque insuficiente (${itens[idx].qty} disponíveis)`,'red');return;}
  itens[idx].qty+=tipo==='entrada'?qty:-qty;
  await fsSet('itens',itemId,itens[idx]);
  await adicionarLog(itemId,itens[idx].nome,tipo,qty,obs);
  document.getElementById('mov-qty').value='';
  document.getElementById('mov-obs').value='';
  toast(`${tipo.toUpperCase()} registrada: ${qty}× ${itens[idx].nome}`,tipo==='entrada'?'':'amber');
  renderMovLog(); populateMovSelect(); renderDashboard();
  if(document.getElementById('gaveta-detail').classList.contains('open')) renderDetalheGaveta(window._currentArmId, window._currentGavId);
}

export function renderMovLog(){
  const el=document.getElementById('mov-log');
  el.innerHTML=movimentos.length?movimentos.map(m=>logHtml(m)).join('')
    :'<div style="color:var(--text-dim);font-size:12px;padding:16px">Nenhuma movimentação.</div>';
}

window.limparHistorico = function(){
  if(!podeAcessar('movimentos')){toast('Sem permissão','red');return;}
  openModal('Limpar histórico',`Apagar ${movimentos.length} movimentações?`,'Limpar tudo',async()=>{
    await fsDeleteAll('movimentos');
    setMovimentos([]);
    renderMovLog(); renderDashboard();
    toast('Histórico limpo','amber');
  });
}
