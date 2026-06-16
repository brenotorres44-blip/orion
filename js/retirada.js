// ══════════════════════════════════════════════
//  ORION — retirada.js
//  Sistema de retirada e devolução de ferramentas
//  com identificação por QR Code do crachá
// ══════════════════════════════════════════════
import { fsSet, fsGetAll, fsDelete } from './firebase.js';
import { toast, uid, ts, itens, usuarios, armById, gavById, armNome, gavLabel } from './utils.js';

// Estado do fluxo atual
let modoAtual    = null; // 'retirar' | 'devolver'
let operadorAtual = null;
let scannerAtivo  = false;
let videoStream   = null;

// ── Abre o modal de retirada ou devolução ──────
window.abrirRetirada = function(modo) {
  modoAtual     = modo;
  operadorAtual = null;
  document.getElementById('ret-modal').style.display = 'flex';
  document.getElementById('ret-step-scan').style.display = '';
  document.getElementById('ret-step-ferramenta').style.display = 'none';
  document.getElementById('ret-step-devolver').style.display = 'none';
  document.getElementById('ret-modal-titulo').textContent = modo === 'retirar' ? '⬆ Retirar Ferramenta' : '⬇ Devolver Ferramenta';
  document.getElementById('ret-modal-titulo').style.color = modo === 'retirar' ? 'var(--amber)' : 'var(--green)';
  document.getElementById('ret-scan-instrucao').textContent = 'Aponte o crachá para a câmera';
  iniciarScanner();
}

window.fecharRetirada = function() {
  pararScanner();
  document.getElementById('ret-modal').style.display = 'none';
  modoAtual = null; operadorAtual = null;
}

// ── Scanner QR Code via câmera ─────────────────
async function iniciarScanner() {
  scannerAtivo = true;
  const video = document.getElementById('ret-video');
  const canvas = document.getElementById('ret-canvas');
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = videoStream;
    video.play();
    requestAnimationFrame(scanFrame);
  } catch(e) {
    document.getElementById('ret-scan-instrucao').textContent = 'Câmera não disponível — use o campo manual abaixo';
    document.getElementById('ret-manual-wrap').style.display = '';
  }
}

function pararScanner() {
  scannerAtivo = false;
  if(videoStream) { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; }
  const video = document.getElementById('ret-video');
  if(video) video.srcObject = null;
}

function scanFrame() {
  if(!scannerAtivo) return;
  const video  = document.getElementById('ret-video');
  const canvas = document.getElementById('ret-canvas');
  if(!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) { requestAnimationFrame(scanFrame); return; }
  const ctx = canvas.getContext('2d');
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = window.jsQR ? window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' }) : null;
    if(code?.data) { processarQR(code.data); return; }
  } catch(e) {}
  requestAnimationFrame(scanFrame);
}

// ── Processa o QR Code lido ────────────────────
function processarQR(dados) {
  pararScanner();
  // Formato esperado: ORION_USER:uid:nome
  if(!dados.startsWith('ORION_USER:')) {
    toast('QR Code inválido — use o crachá do ORION', 'red');
    iniciarScanner(); return;
  }
  const partes = dados.split(':');
  const userId  = partes[1];
  const nome    = partes.slice(2).join(':');
  const user    = usuarios.find(u => u.id === userId);
  if(!user) { toast('Operador não encontrado no sistema', 'red'); iniciarScanner(); return; }
  operadorAtual = user;
  confirmarOperador(user);
}

// Leitura manual do ID (fallback)
window.confirmarManual = function() {
  const val = document.getElementById('ret-manual-input').value.trim();
  if(!val) { toast('Digite o ID do operador', 'amber'); return; }
  const user = usuarios.find(u => u.id === val || u.nome.toLowerCase() === val.toLowerCase());
  if(!user) { toast('Operador não encontrado', 'red'); return; }
  operadorAtual = user;
  confirmarOperador(user);
}

function confirmarOperador(user) {
  document.getElementById('ret-scan-instrucao').textContent = `✓ Identificado: ${user.nome}`;
  document.getElementById('ret-scan-instrucao').style.color = 'var(--green)';
  setTimeout(() => {
    document.getElementById('ret-step-scan').style.display = 'none';
    if(modoAtual === 'retirar') mostrarStepFerramenta();
    else mostrarStepDevolver();
  }, 800);
}

// ── STEP 2A: Busca de ferramenta para retirar ──
function mostrarStepFerramenta() {
  document.getElementById('ret-step-ferramenta').style.display = '';
  document.getElementById('ret-operador-nome').textContent = operadorAtual.nome;
  document.getElementById('ret-busca').value = '';
  document.getElementById('ret-resultados').innerHTML = '';
  document.getElementById('ret-busca').focus();
}

window.buscarFerramenta = function() {
  const q = document.getElementById('ret-busca').value.toLowerCase().trim();
  const res = document.getElementById('ret-resultados');
  if(q.length < 2) { res.innerHTML = ''; return; }
  const found = itens.filter(i => i.nome.toLowerCase().includes(q) && (i.qty > 0));
  if(!found.length) { res.innerHTML = `<div style="color:var(--text-dim);padding:12px;font-size:13px">Nenhuma ferramenta disponível com "${q}"</div>`; return; }
  res.innerHTML = found.map(i => {
    const arm = armById(i.armId); const gav = gavById(i.armId, i.gavId);
    const cor = arm?.cor || 'var(--cyan)';
    return `<div class="ret-item" onclick="window.selecionarFerramenta('${i.id}')" style="padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.2s;display:flex;justify-content:space-between;align-items:center" onmouseover="this.style.background='var(--cyan-glow)'" onmouseout="this.style.background=''">
      <div>
        <div style="font-weight:700;font-size:14px;color:var(--text)">${i.nome}</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:3px"><span style="color:${cor}">${arm?.nome||'?'}</span> · ${gav?.nome||'Gaveta '+gav?.num||'?'} · ${arm?.local||''}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:18px;font-weight:700;color:var(--green)">${i.qty}</div>
        <div style="font-size:10px;color:var(--text-dim)">disponíveis</div>
      </div>
    </div>`;
  }).join('');
}

let ferramentaSelecionada = null;
window.selecionarFerramenta = function(id) {
  const item = itens.find(i => i.id === id); if(!item) return;
  ferramentaSelecionada = item;
  const arm = armById(item.armId); const gav = gavById(item.armId, item.gavId);
  document.getElementById('ret-busca').value = item.nome;
  document.getElementById('ret-resultados').innerHTML = `
    <div style="background:var(--bg3);border:1px solid var(--cyan);padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:700;color:var(--cyan)">${item.nome}</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:3px">${arm?.nome||'?'} · ${gav?.nome||'Gaveta '+gav?.num||'?'}</div>
      </div>
      <span style="color:var(--green);font-weight:700">✓ Selecionada</span>
    </div>`;
  document.getElementById('ret-qty-wrap').style.display = '';
  document.getElementById('ret-qty').max = item.qty;
  document.getElementById('ret-qty').value = 1;
  document.getElementById('ret-qty-max').textContent = `máx: ${item.qty}`;
}

window.confirmarRetirada = async function() {
  if(!ferramentaSelecionada) { toast('Selecione uma ferramenta', 'amber'); return; }
  const qty = parseInt(document.getElementById('ret-qty').value) || 1;
  const obs = document.getElementById('ret-obs').value.trim();
  if(qty < 1 || qty > ferramentaSelecionada.qty) { toast('Quantidade inválida', 'red'); return; }

  const btn = document.getElementById('ret-btn-confirmar');
  btn.innerHTML = '<i class="ti ti-loader"></i>Registrando...'; btn.disabled = true;

  // Registra a retirada
  const retiradaId = uid();
  const retirada = {
    id: retiradaId,
    tipo: 'retirada',
    itemId: ferramentaSelecionada.id,
    itemNome: ferramentaSelecionada.nome,
    armId: ferramentaSelecionada.armId,
    gavId: ferramentaSelecionada.gavId,
    qty,
    operadorId: operadorAtual.id,
    operadorNome: operadorAtual.nome,
    obs,
    saida: ts(),
    retorno: null,
    status: 'aberto'
  };
  await fsSet('retiradas', retiradaId, retirada);

  // Baixa o estoque
  const idx = itens.findIndex(i => i.id === ferramentaSelecionada.id);
  if(idx >= 0) { itens[idx].qty -= qty; await fsSet('itens', ferramentaSelecionada.id, itens[idx]); }

  // Registra no log de movimentos
  await fsSet('movimentos', uid(), {
    id: uid(), itemId: ferramentaSelecionada.id, itemNome: ferramentaSelecionada.nome,
    tipo: 'saida', qty, obs: `Retirada por ${operadorAtual.nome}${obs?' — '+obs:''}`,
    ts: ts(), usuario: operadorAtual.nome
  });

  toast(`✓ Retirada registrada — ${qty}× ${ferramentaSelecionada.nome}`, '');
  mostrarConfirmacaoFinal('retirar', ferramentaSelecionada.nome, qty, operadorAtual.nome);
  btn.innerHTML = '<i class="ti ti-check"></i>Confirmar retirada'; btn.disabled = false;
  ferramentaSelecionada = null;
}

// ── STEP 2B: Devolução ─────────────────────────
async function mostrarStepDevolver() {
  document.getElementById('ret-step-devolver').style.display = '';
  document.getElementById('ret-dev-operador').textContent = operadorAtual.nome;
  const lista = document.getElementById('ret-dev-lista');
  lista.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:12px">Carregando...</div>';

  let retiradas = [];
  try { retiradas = await fsGetAll('retiradas'); } catch(e) {}
  const abertas = retiradas.filter(r => r.operadorId === operadorAtual.id && r.status === 'aberto');

  if(!abertas.length) {
    lista.innerHTML = '<div style="color:var(--text-dim);font-size:14px;padding:20px;text-align:center">Nenhuma ferramenta em aberto para este operador ✓</div>';
    return;
  }

  lista.innerHTML = abertas.map(r => `
    <div style="background:var(--bg3);border:1px solid var(--border);padding:14px 16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:12px">
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px;color:var(--amber)">${r.itemNome}</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:3px">
          ${r.qty} unid. · Saída: ${r.saida}
          ${r.obs?'<br><span style="color:var(--text-dim)">'+r.obs+'</span>':''}
        </div>
      </div>
      <button class="hud-btn green-btn" style="padding:8px 16px;font-size:12px;flex-shrink:0" onclick="window.confirmarDevolucao('${r.id}','${r.itemId}',${r.qty})">
        <i class="ti ti-arrow-back-up"></i>Devolver
      </button>
    </div>`).join('');
}

window.confirmarDevolucao = async function(retiradaId, itemId, qty) {
  const btn = event.target.closest('button');
  btn.innerHTML = '<i class="ti ti-loader"></i>'; btn.disabled = true;

  // Fecha a retirada
  await fsSet('retiradas', retiradaId, { status: 'devolvido', retorno: ts() });

  // Devolve ao estoque
  const idx = itens.findIndex(i => i.id === itemId);
  if(idx >= 0) { itens[idx].qty += qty; await fsSet('itens', itemId, itens[idx]); }

  const r = (await fsGetAll('retiradas')).find(x => x.id === retiradaId);
  // Log de devolução
  await fsSet('movimentos', uid(), {
    id: uid(), itemId, itemNome: r?.itemNome||'?',
    tipo: 'entrada', qty, obs: `Devolução por ${operadorAtual.nome}`,
    ts: ts(), usuario: operadorAtual.nome
  });

  toast(`✓ Devolução registrada — ${qty}× ${r?.itemNome||'item'}`, '');
  mostrarStepDevolver(); // Atualiza a lista
}

// ── Tela de confirmação final ──────────────────
function mostrarConfirmacaoFinal(tipo, nome, qty, operador) {
  document.getElementById('ret-step-ferramenta').style.display = 'none';
  const conf = document.getElementById('ret-step-confirmacao');
  conf.style.display = '';
  conf.innerHTML = `
    <div style="text-align:center;padding:32px 20px">
      <div style="font-size:48px;margin-bottom:16px">${tipo==='retirar'?'⬆':'⬇'}</div>
      <div style="font-size:20px;font-weight:700;color:${tipo==='retirar'?'var(--amber)':'var(--green)'};margin-bottom:8px">
        ${tipo==='retirar'?'Retirada registrada!':'Devolução registrada!'}
      </div>
      <div style="font-size:15px;color:var(--text);margin-bottom:4px">${qty}× <strong>${nome}</strong></div>
      <div style="font-size:13px;color:var(--text-dim);margin-bottom:28px">Operador: ${operador}</div>
      <button class="hud-btn green-btn" style="padding:12px 32px;font-size:13px" onclick="window.fecharRetirada()">
        <i class="ti ti-check"></i>Concluir
      </button>
    </div>`;
}

// ── Painel de retiradas em aberto (para admin) ─
window.renderPainelRetiradas = async function() {
  const tbody = document.getElementById('ret-tabela-body'); if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-dim);text-align:center;padding:16px">Carregando...</td></tr>';
  let retiradas = [];
  try { retiradas = await fsGetAll('retiradas'); } catch(e) {}
  retiradas.sort((a,b) => (b.saida||'').localeCompare(a.saida||''));

  tbody.innerHTML = retiradas.length ? retiradas.map(r => {
    const status = r.status === 'aberto'
      ? '<span style="color:var(--amber);font-weight:600">● Em uso</span>'
      : '<span style="color:var(--green)">✓ Devolvido</span>';
    return `<tr>
      <td style="font-weight:600">${r.itemNome}</td>
      <td style="color:var(--text-dim)">${r.operadorNome}</td>
      <td style="text-align:center">${r.qty}</td>
      <td style="color:var(--text-dim);font-size:12px">${r.saida}</td>
      <td style="color:var(--text-dim);font-size:12px">${r.retorno||'—'}</td>
      <td>${status}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="6" style="color:var(--text-dim);text-align:center;padding:20px">Nenhuma retirada registrada.</td></tr>';
}
