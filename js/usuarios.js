// ══════════════════════════════════════════════
//  ORION — usuarios.js
//  CRUD usuários, planejador, solicitações
// ══════════════════════════════════════════════
import { auth, fsSet, fsDelete, fsGetAll } from './firebase.js';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from './firebase.js';
import { toast, openModal, ts, usuarios, setUsuarios,
         editandoUserId, setEditandoUserId, ADMIN_EMAIL } from './utils.js';

// ── Aba de acesso ──────────────────────────────
window.trocarTabAcesso = function(tab) {
  document.getElementById('sub-usuarios').style.display      = tab==='usuarios' ? '' : 'none';
  document.getElementById('sub-solicitacoes').style.display  = tab==='solicitacoes' ? '' : 'none';
  document.getElementById('tab-usuarios').classList.toggle('active',   tab==='usuarios');
  document.getElementById('tab-solicitacoes').classList.toggle('active', tab==='solicitacoes');
  if(tab === 'solicitacoes') renderTabelaSolicitacoes();
}

// ── Solicitações ───────────────────────────────
async function renderTabelaSolicitacoes() {
  const tbody = document.getElementById('tabela-solicitacoes'); if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="color:var(--text-dim);text-align:center;padding:16px">Carregando...</td></tr>';
  let sols = []; try { sols = await fsGetAll('solicitacoes'); } catch(e) {}
  sols.sort((a,b) => (b.criado||'').localeCompare(a.criado||''));
  const pendentes = sols.filter(s => s.status === 'pendente').length;
  const badge = document.getElementById('badge-sol');
  if(badge) { badge.textContent = pendentes; badge.style.display = pendentes > 0 ? '' : 'none'; }
  tbody.innerHTML = sols.length ? sols.map(s => {
    const statusEl = s.status === 'pendente' ? `<span style="color:var(--amber);font-weight:600">● Pendente</span>` : s.status === 'aprovado'||s.status === 'aprovado_auto' ? `<span style="color:var(--green);font-weight:600">✓ Aprovado</span>` : `<span style="color:var(--red);font-weight:600">✕ Rejeitado</span>`;
    const acoes = s.status === 'pendente' ? `<div class="action-btns"><button class="hud-btn green-btn" style="padding:5px 10px;font-size:11px" onclick="window.aprovarSolicitacao('${s.uid}','${s.nome}')"><i class="ti ti-check"></i>Aprovar</button><button class="hud-btn danger" style="padding:5px 10px;font-size:11px" onclick="window.rejeitarSolicitacao('${s.uid}','${s.nome}')"><i class="ti ti-x"></i>Rejeitar</button></div>` : `<span style="color:var(--text-dim);font-size:11px">${s.status==='aprovado_auto'?'Auto-aprovado':''}</span>`;
    return `<tr><td style="font-weight:600">${s.nome}</td><td style="font-family:var(--mono);font-size:12px;color:var(--text-dim)">${s.email}</td><td style="color:var(--text-dim)">${s.setor||'—'}</td><td style="font-size:11px;color:var(--text-dim);max-width:180px">${s.motivo||'—'}</td><td style="font-size:11px;color:var(--text-dim)">${s.criado||'—'}</td><td>${statusEl}</td><td>${acoes}</td></tr>`;
  }).join('') : '<tr><td colspan="7" style="color:var(--text-dim);text-align:center;padding:20px">Nenhuma solicitação ainda.</td></tr>';
}

window.aprovarSolicitacao = async function(uid, nome) {
  await fsSet('usuarios', uid, { ativo: true, nivel: 'operador' });
  await fsSet('solicitacoes', uid, { status: 'aprovado', aprovadoPor: window.usuarioAtual?.nome, aprovadoEm: ts() });
  toast(`${nome} aprovado(a) como Operador ✓`, '');
  renderTabelaSolicitacoes(); renderTabelaUsuarios();
}

window.rejeitarSolicitacao = async function(uid, nome) {
  openModal('Rejeitar solicitação', `Rejeitar acesso de "${nome}"?`, 'Rejeitar', async () => {
    await fsSet('usuarios', uid, { ativo: false, status: 'rejeitado' });
    await fsSet('solicitacoes', uid, { status: 'rejeitado', rejeitadoPor: window.usuarioAtual?.nome, rejeitadoEm: ts() });
    toast(`Solicitação de ${nome} rejeitada`, 'amber'); renderTabelaSolicitacoes();
  });
}

// ── Tabela de usuários ─────────────────────────
export async function renderTabelaUsuarios() {
  const tbody = document.getElementById('tabela-usuarios'); if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="color:var(--text-dim);text-align:center;padding:16px">Carregando...</td></tr>';
  setUsuarios(await fsGetAll('usuarios'));

  // Busca usuarioAtual de todas as fontes possíveis
  const { usuarioAtual: uAtual } = await import('./utils.js');
  const me = uAtual || window.usuarioAtual;
  const isAdmin = me?.nivel === 'admin' || me?.nivelReal === 'admin';

  try { const sols = await fsGetAll('solicitacoes'); const pend = sols.filter(s => s.status === 'pendente').length; const badge = document.getElementById('badge-sol'); if(badge) { badge.textContent = pend; badge.style.display = pend > 0 ? '' : 'none'; } } catch(e) {}

  tbody.innerHTML = usuarios.length ? usuarios.map(u => {
    const isSelf  = u.id === me?.uid;
    const isFixed = u.email === ADMIN_EMAIL;
    const isPend  = u.status === 'pendente';
    if(isPend && !isAdmin) return '';

    const plejCell = u.planejador
      ? `<span style="color:var(--green);font-size:11px;font-weight:700">✓ ${u.plejSetor||'Sim'}</span>`
      : `<span style="color:var(--text-dim);font-size:11px">—</span>`;

    // Botões de ação
    let acoes = '';
    if(isFixed) {
      acoes = '<span style="color:var(--red);font-size:10px;letter-spacing:1px">★ PROTEGIDO</span>';
    } else if(isAdmin) {
      const btnEditar  = `<button class="hud-btn" style="padding:5px 12px;font-size:11px" onclick="window.editarUsuario('${u.id}')"><i class="ti ti-pencil"></i>Editar</button>`;
      const btnStatus  = `<button class="hud-btn amber" style="padding:5px 12px;font-size:11px" onclick="window.toggleStatusUsuario('${u.id}',${u.ativo})" title="${u.ativo?'Desativar usuário':'Ativar usuário'}"><i class="ti ti-${u.ativo?'player-pause':'player-play'}"></i>${u.ativo?'Desativar':'Ativar'}</button>`;
      const btnExcluir = !isSelf ? `<button class="hud-btn danger" style="padding:5px 12px;font-size:11px" onclick="window.excluirUsuario('${u.id}')"><i class="ti ti-trash"></i>Excluir</button>` : '';
      acoes = btnEditar + btnStatus + btnExcluir;
    } else {
      acoes = '<span style="color:var(--text-dim);font-size:11px">—</span>';
    }

    return `<tr style="${isPend?'opacity:0.7':''}">
      <td style="font-weight:600">
        ${u.nome}
        ${isSelf  ? '<span style="color:var(--cyan);font-size:10px;margin-left:4px">(você)</span>'    : ''}
        ${isFixed ? '<span style="color:var(--red);font-size:10px;margin-left:4px">★ ADMIN</span>'   : ''}
        ${isPend  ? '<span style="color:var(--amber);font-size:10px;margin-left:4px">⏳ pendente</span>' : ''}
      </td>
      <td style="font-family:var(--mono);color:var(--text-dim);font-size:12px">${u.email||'—'}</td>
      <td style="color:var(--text-dim);font-size:12px">${u.setor||'—'}</td>
      <td><span class="nivel-badge nivel-${u.nivel}">${u.nivel}</span></td>
      <td>${plejCell}</td>
      <td><span class="${u.ativo?'status-ativo':'status-inativo'}">${u.ativo?'● Ativo':'○ Inativo'}</span></td>
      <td style="color:var(--text-dim);font-size:12px">${u.ultimoAcesso||'—'}</td>
      <td><div class="action-btns" style="gap:6px;flex-wrap:wrap">${acoes}</div></td>
    </tr>`;
  }).filter(Boolean).join('') : '<tr><td colspan="8" style="color:var(--text-dim);text-align:center;padding:20px">Nenhum usuário.</td></tr>';
}

// ── Form usuário ───────────────────────────────
window.togglePlanejadorFields = function() {
  const v = document.getElementById('ac-planejador')?.value === '1';
  ['ac-plej-setor-wrap','ac-plej-email-wrap','ac-plej-wpp-wrap'].forEach(id => { const el=document.getElementById(id); if(el) el.style.display = v ? '' : 'none'; });
}

window.abrirFormUsuario = function(){
  setEditandoUserId(null);
  ['ac-nome','ac-login','ac-senha','ac-senha2','ac-plej-setor','ac-plej-email','ac-plej-wpp'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('ac-nivel').value='operador';
  document.getElementById('ac-status').value='ativo';
  document.getElementById('ac-planejador').value='0';
  window.togglePlanejadorFields();
  document.getElementById('ac-senha').placeholder='mínimo 6 caracteres';
  document.getElementById('ac-senha-hint').textContent='';
  document.getElementById('form-usuario-title').innerHTML='<i class="ti ti-user-plus"></i>Novo usuário';
  document.getElementById('btn-reset-senha').style.display='none';
  document.getElementById('form-usuario-wrap').style.display='';
  document.getElementById('ac-nome').focus();
  document.getElementById('form-usuario-wrap').scrollIntoView({behavior:'smooth',block:'nearest'});
}

window.editarUsuario = async function(id){
  const user=usuarios.find(u=>u.id===id); if(!user)return;
  setEditandoUserId(id);
  document.getElementById('ac-nome').value=user.nome;
  document.getElementById('ac-login').value=user.email||'';
  document.getElementById('ac-senha').value='';
  document.getElementById('ac-senha2').value='';
  document.getElementById('ac-nivel').value=user.nivel;
  document.getElementById('ac-status').value=user.ativo?'ativo':'inativo';
  document.getElementById('ac-senha').placeholder='deixe vazio para não alterar';
  document.getElementById('ac-senha-hint').textContent='(opcional)';
  document.getElementById('ac-planejador').value=user.planejador?'1':'0';
  document.getElementById('ac-plej-setor').value=user.plejSetor||'';
  document.getElementById('ac-plej-email').value=user.plejEmail||'';
  document.getElementById('ac-plej-wpp').value=user.plejWpp||'';
  window.togglePlanejadorFields();
  document.getElementById('form-usuario-title').innerHTML=`<i class="ti ti-pencil"></i>Editando: ${user.nome}`;
  document.getElementById('btn-reset-senha').style.display='';
  document.getElementById('form-usuario-wrap').style.display='';
  document.getElementById('form-usuario-wrap').scrollIntoView({behavior:'smooth',block:'nearest'});
}

window.salvarUsuario = async function(){
  const nome  = document.getElementById('ac-nome').value.trim();
  const email = document.getElementById('ac-login').value.trim().toLowerCase();
  const senha = document.getElementById('ac-senha').value;
  const senha2= document.getElementById('ac-senha2').value;
  const nivel = email === ADMIN_EMAIL ? 'admin' : document.getElementById('ac-nivel').value;
  const ativo = document.getElementById('ac-status').value === 'ativo';
  if(!nome||!email){toast('Nome e e-mail são obrigatórios','red');return;}
  if(senha&&senha!==senha2){toast('Senhas não conferem','red');return;}
  if(senha&&senha.length<6){toast('Senha mínimo 6 caracteres','red');return;}
  const planejador = document.getElementById('ac-planejador')?.value === '1' ? 1 : 0;
  const plejSetor  = planejador ? (document.getElementById('ac-plej-setor')?.value.trim()||'') : '';
  const plejEmail  = planejador ? (document.getElementById('ac-plej-email')?.value.trim()||'') : '';
  const plejWpp    = planejador ? (document.getElementById('ac-plej-wpp')?.value.trim().replace(/\D/g,'')||'') : '';
  if(editandoUserId){
    const userAtual = usuarios.find(u => u.id === editandoUserId);
    const qrData = userAtual?.qrData || `ORION_USER:${editandoUserId}:${nome}`;
    const upd={nome,nivel,ativo,status:'ativo',planejador,plejSetor,plejEmail,plejWpp,qrData};
    await fsSet('usuarios',editandoUserId,upd);
    const idx=usuarios.findIndex(u=>u.id===editandoUserId);
    if(idx>=0) usuarios[idx]={...usuarios[idx],...upd};
    toast('Usuário atualizado ✓');
  } else {
    if(!senha){toast('Informe uma senha','red');return;}
    try{
      const cred=await createUserWithEmailAndPassword(auth,email,senha);
      const novoId = cred.user.uid;
      const qrData = `ORION_USER:${novoId}:${nome}`;
      await fsSet('usuarios',novoId,{
        nome,email,nivel,ativo:true,status:'ativo',
        criado:ts(),ultimoAcesso:'—',lgpdConsent:false,
        planejador,plejSetor,plejEmail,plejWpp,qrData
      });
      usuarios.push({id:novoId,nome,email,nivel,ativo:true,status:'ativo',criado:ts(),planejador,plejSetor,plejEmail,plejWpp,qrData});
      toast('Usuário cadastrado ✓ · QR Code gerado · E-mail: '+email);
    }catch(e){ const msgs={'auth/email-already-in-use':'E-mail já cadastrado','auth/invalid-email':'E-mail inválido','auth/weak-password':'Senha muito fraca'}; toast(msgs[e.code]||'Erro: '+e.message,'red'); return; }
  }
  window.cancelarEdicaoUsuario(); renderTabelaUsuarios();
}

window.cancelarEdicaoUsuario = function(){
  setEditandoUserId(null);
  ['ac-nome','ac-login','ac-senha','ac-senha2','ac-plej-setor','ac-plej-email','ac-plej-wpp'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('ac-nivel').value='operador';
  document.getElementById('ac-status').value='ativo';
  document.getElementById('ac-planejador').value='0';
  window.togglePlanejadorFields();
  document.getElementById('ac-senha').placeholder='mínimo 6 caracteres';
  document.getElementById('btn-reset-senha').style.display='none';
  document.getElementById('form-usuario-wrap').style.display='none';
}

window.excluirUsuario = function(id){ if(id===window.usuarioAtual?.uid){toast('Não pode excluir o próprio usuário','red');return;} const user=usuarios.find(u=>u.id===id); openModal('Excluir usuário',`Excluir "${user?.nome}"?`,'Excluir',async()=>{ await fsDelete('usuarios',id); setUsuarios(usuarios.filter(u=>u.id!==id)); renderTabelaUsuarios(); toast('Usuário excluído','amber'); }); }

window.toggleStatusUsuario = async function(id,ativoAtual){ if(id===window.usuarioAtual?.uid){toast('Não pode desativar o próprio usuário','red');return;} const novoAtivo=!ativoAtual; await fsSet('usuarios',id,{ativo:novoAtivo}); const idx=usuarios.findIndex(u=>u.id===id); if(idx>=0) usuarios[idx].ativo=novoAtivo; renderTabelaUsuarios(); toast(novoAtivo?'Usuário ativado ✓':'Usuário desativado','amber'); }
