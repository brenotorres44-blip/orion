// ══════════════════════════════════════════════
//  ORION — historico.js
//  Relatório de estoque por armário/gaveta
// ══════════════════════════════════════════════
import { itens, armarios, fmtR, armById, armNome, gavById } from './utils.js';

export function renderHistorico(){
  populateHistArmSelect();
  const q =document.getElementById('hist-search').value.toLowerCase();
  const af=document.getElementById('hist-arm').value;
  const filtered=itens.filter(i=>(!q||i.nome.toLowerCase().includes(q)||(i.cat||'').toLowerCase().includes(q))&&(!af||i.armId===af));
  const tbody=document.getElementById('hist-body');
  tbody.innerHTML=filtered.map(i=>{
    const low=i.min>0&&i.qty<i.min;
    const status=i.qty===0?'<span style="color:var(--red)">SEM ESTOQUE</span>':low?'<span style="color:var(--amber)">BAIXO</span>':'<span style="color:var(--green)">OK</span>';
    const cor=armById(i.armId)?.cor||'var(--cyan)';
    return `<tr>
      <td style="font-weight:600">${i.nome}</td>
      <td><span style="color:${cor};font-weight:600;font-size:12px">${armNome(i.armId)}</span></td>
      <td><span class="gaveta-badge">G${gavById(i.armId,i.gavId)?.num||'?'}</span></td>
      <td style="color:var(--text-dim)">${i.cat||'—'}</td>
      <td class="${low?'qty-low':'qty-ok'}">${i.qty}</td>
      <td style="color:var(--text-dim)">${i.min}</td>
      <td>${fmtR(i.preco)}</td>
      <td style="color:var(--cyan)">${fmtR((i.qty||0)*(i.preco||0))}</td>
      <td>${status}</td>
    </tr>`;
  }).join('')||'<tr><td colspan="9" style="color:var(--text-dim);text-align:center;padding:20px">Nenhum resultado.</td></tr>';
  const totVal=filtered.reduce((a,i)=>a+(i.qty||0)*(i.preco||0),0);
  const totQty=filtered.reduce((a,i)=>a+(i.qty||0),0);
  document.getElementById('hist-totais').innerHTML=`
    <span>Itens: <b style="color:var(--cyan)">${filtered.length}</b></span>
    <span>Unidades: <b style="color:var(--cyan)">${totQty}</b></span>
    <span>Valor: <b style="color:var(--amber)">${fmtR(totVal)}</b></span>`;
}

function populateHistArmSelect(){
  const sel=document.getElementById('hist-arm'); if(!sel)return;
  const cur=sel.value;
  sel.innerHTML='<option value="">Todos os armários</option>'+armarios.map(a=>`<option value="${a.id}">${a.nome}</option>`).join('');
  sel.value=cur;
}
