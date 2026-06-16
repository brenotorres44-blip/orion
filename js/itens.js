// ══════════════════════════════════════════════
//  ORION — itens.js
//  CRUD de itens, busca, filtros, gaveta detail
// ══════════════════════════════════════════════
import { fsSet, fsDelete } from './firebase.js';
import { toast, openModal, uid, ts, fmtR, armById, gavById, armNome,
         itens, armarios, setItens, editandoItemId, setEditandoItemId } from './utils.js';
import { adicionarLog } from './movimentos.js';
import { renderDashboard } from './home.js';

export function populateArmarioSelect(selectedArmId='') {
  const sel=document.getElementById('f-armario');
  if(!sel) return;
  sel.innerHTML=armarios.length
    ?armarios.map(a=>`<option value="${a.id}"${a.id===selectedArmId?' selected':''}>${a.nome}</option>`).join('')
    :'<option value="">Nenhum armário</option>';
  populateGavetasSelect(sel.value,'f-gaveta','');
}

export function populateGavetasSelect(armId, gavSelId='f-gaveta', selectedGavId='') {
  const useArmId=armId||document.getElementById('f-armario')?.value;
  const sel=document.getElementById(gavSelId||'f-gaveta');
  if(!sel) return;
  const arm=armById(useArmId);
  sel.innerHTML=arm&&arm.gavetas?.length
    ?arm.gavetas.map(g=>`<option value="${g.id}"${g.id===selectedGavId?' selected':''}>${g.nome||'Gaveta '+g.num}</option>`).join('')
    :'<option value="">Selecione um armário</option>';
}

window.salvarItem = async function(){
  const nome =document.getElementById('f-nome').value.trim();
  const armId=document.getElementById('f-armario').value;
  const gavId=document.getElementById('f-gaveta').value;
  const qty  =parseInt(document.getElementById('f-qty').value)||0;
  const min  =parseInt(document.getElementById('f-min').value)||0;
  const preco=parseFloat(document.getElementById('f-preco').value)||0;
  const cat  =document.getElementById('f-cat').value.trim();
  if(!nome||!armId||!gavId){toast('Preencha nome, armário e gaveta','red');return;}
  if(editandoItemId){
    const idx=itens.findIndex(i=>i.id===editandoItemId);
    const upd={...itens[idx],nome,armId,gavId,min,preco,cat};
    await fsSet('itens',editandoItemId,upd);
    itens[idx]=upd;
    await adicionarLog(editandoItemId,nome,'edit',0,'Dados editados');
    toast('Item atualizado ✓'); setEditandoItemId(null);
  } else {
    const novo={id:uid(),nome,armId,gavId,qty,min,preco,cat,criado:ts()};
    await fsSet('itens',novo.id,novo);
    itens.push(novo);
    if(qty>0) await adicionarLog(novo.id,nome,'entrada',qty,'Cadastro inicial');
    toast('Item cadastrado ✓');
  }
  cancelarEdicaoItem(); renderTabela();
  if(document.getElementById('gaveta-detail').classList.contains('open')) renderDetalheGaveta(window._currentArmId, window._currentGavId);
  renderDashboard();
}

export function editarItem(id){
  const item=itens.find(i=>i.id===id); if(!item)return;
  setEditandoItemId(id);
  document.getElementById('f-nome').value=item.nome;
  populateArmarioSelect(item.armId);
  populateGavetasSelect(item.armId,'f-gaveta',item.gavId);
  document.getElementById('f-qty').value=item.qty;
  document.getElementById('f-qty').disabled=true;
  document.getElementById('f-min').value=item.min;
  document.getElementById('f-preco').value=item.preco;
  document.getElementById('f-cat').value=item.cat||'';
  document.getElementById('form-title-itens').innerHTML='✎ Editando: '+item.nome;
  document.getElementById('btn-cancelar-edit').style.display='';
  window.showPanel('itens');
  window.scrollTo({top:0,behavior:'smooth'});
}
window.editarItem = editarItem;

window.excluirItem = function(id){
  const item=itens.find(i=>i.id===id);
  openModal('Excluir item',`Excluir "${item?.nome}"?`,'Excluir',async()=>{
    await fsDelete('itens',id);
    setItens(itens.filter(i=>i.id!==id));
    renderTabela(); renderDetalheGaveta(window._currentArmId, window._currentGavId); renderDashboard();
    toast('Item excluído','amber');
  });
}

function cancelarEdicaoItem(){
  setEditandoItemId(null);
  ['f-nome','f-qty','f-min','f-preco','f-cat'].forEach(id=>{ const el=document.getElementById(id); el.value=''; el.disabled=false; });
  document.getElementById('form-title-itens').innerHTML='+ Cadastrar item';
  document.getElementById('btn-cancelar-edit').style.display='none';
}
window.cancelarEdicaoItem = cancelarEdicaoItem;

export function renderTabela(){
  populateArmFilterSelect();
  const q =document.getElementById('search-itens').value.toLowerCase();
  const af=document.getElementById('filter-arm').value;
  const gf=document.getElementById('filter-gav').value;
  const filtered=itens.filter(i=>(!q||i.nome.toLowerCase().includes(q)||(i.cat||'').toLowerCase().includes(q))&&(!af||i.armId===af)&&(!gf||i.gavId===gf));
  const tbody=document.getElementById('tabela-itens');
  tbody.innerHTML=filtered.length?filtered.map(i=>{
    const low=i.min>0&&i.qty<i.min;
    const cor=armById(i.armId)?.cor||'var(--cyan)';
    return `<tr>
      <td style="font-weight:600;color:${low?'var(--red)':'var(--text)'}">${i.nome}${low?'<span class="led red" style="width:6px;height:6px;margin-left:6px"></span>':''}</td>
      <td><span style="color:${cor};font-weight:600;font-size:12px">${armNome(i.armId)}</span></td>
      <td><span class="gaveta-badge">G${gavById(i.armId,i.gavId)?.num||'?'} ${gavById(i.armId,i.gavId)?.nome?'· '+gavById(i.armId,i.gavId).nome:''}</span></td>
      <td class="${low?'qty-low':'qty-ok'}">${i.qty}</td>
      <td style="color:var(--text-dim)">${i.min}</td>
      <td>${fmtR(i.preco)}</td>
      <td style="color:var(--text-dim)">${i.cat||'—'}</td>
      <td><div class="action-btns">
        <button class="hud-btn" style="padding:5px 9px" onclick="window.editarItem('${i.id}')">✎</button>
        <button class="hud-btn amber" style="padding:5px 9px" onclick="window.abrirMovimento('${i.id}')">⇅</button>
        <button class="hud-btn danger" style="padding:5px 9px" onclick="window.excluirItem('${i.id}')">✕</button>
      </div></td>
    </tr>`;
  }).join(''):'<tr><td colspan="8" style="color:var(--text-dim);text-align:center;padding:20px">Nenhum item encontrado.</td></tr>';
}

export function renderDetalheGaveta(armId, gavId){
  if(!armId||!gavId) return;
  const gavItens=itens.filter(i=>i.armId===armId&&i.gavId===gavId);
  const tbody=document.getElementById('detail-tbody');
  tbody.innerHTML=gavItens.length?gavItens.map(i=>{
    const low=i.min>0&&i.qty<i.min;
    return `<tr>
      <td style="font-weight:600;color:${low?'var(--red)':'var(--text)'}">${i.nome}</td>
      <td class="${low?'qty-low':'qty-ok'}">${i.qty}</td>
      <td style="color:var(--text-dim)">${i.min}</td>
      <td>${fmtR(i.preco)}</td>
      <td style="color:var(--text-dim)">${i.cat||'—'}</td>
      <td><div class="action-btns">
        <button class="hud-btn" style="padding:5px 10px" onclick="window.editarItem('${i.id}')">✎</button>
        <button class="hud-btn amber" style="padding:5px 10px" onclick="window.abrirMovimento('${i.id}')">⇅</button>
        <button class="hud-btn danger" style="padding:5px 10px" onclick="window.excluirItem('${i.id}')">✕</button>
      </div></td>
    </tr>`;
  }).join('')
  :'<tr><td colspan="6" style="color:var(--text-dim);text-align:center;padding:20px">Gaveta vazia</td></tr>';
}

function populateArmFilterSelect(){
  const sel=document.getElementById('filter-arm'); if(!sel)return;
  const cur=sel.value;
  sel.innerHTML='<option value="">Todos os armários</option>'+armarios.map(a=>`<option value="${a.id}">${a.nome}</option>`).join('');
  sel.value=cur; updateGavFilter();
}
function updateGavFilter(){
  const armId=document.getElementById('filter-arm')?.value;
  const sel=document.getElementById('filter-gav'); if(!sel)return;
  const cur=sel.value;
  if(!armId){sel.innerHTML='<option value="">Todas as gavetas</option>';return;}
  const arm=armById(armId);
  sel.innerHTML='<option value="">Todas as gavetas</option>'+(arm?.gavetas?.map(g=>`<option value="${g.id}">${g.nome||'Gaveta '+g.num}</option>`).join('')||'');
  sel.value=cur;
}
document.getElementById('filter-arm')?.addEventListener('change',()=>{updateGavFilter();renderTabela();});
