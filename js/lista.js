// ══════════════════════════════════════════════
//  ORION — lista.js
//  Geração e envio da lista de reposição
// ══════════════════════════════════════════════
import { itens, usuarios, armNome, gavLabel, ts } from './utils.js';
import { toast } from './utils.js';

function gerarTextoLista() {
  const lows = itens.filter(i => i.min > 0 && i.qty < i.min);
  if(!lows.length) return null;
  const dataHora = new Date().toLocaleString('pt-BR');
  const usuario  = window.usuarioAtual?.nome || 'Sistema ORION';
  let texto = `╔══════════════════════════════════════════╗\n`;
  texto    += `║     SOLICITAÇÃO DE REPOSIÇÃO — ORION     ║\n`;
  texto    += `╚══════════════════════════════════════════╝\n\n`;
  texto    += `Data: ${dataHora}\nSolicitado por: ${usuario}\n\n`;
  const obs = document.getElementById('lista-obs')?.value.trim();
  if(obs) texto += `Observação: ${obs}\n\n`;
  texto += `─────────────────────────────────────────\n`;
  texto += ` ITEM                  QTD ATUAL  MÍNIMO  FALTAM\n`;
  texto += `─────────────────────────────────────────\n`;
  lows.forEach(i => {
    const falt = i.min - i.qty;
    const nome = i.nome.padEnd(22).slice(0,22);
    texto += ` ${nome} ${String(i.qty).padStart(9)}  ${String(i.min).padStart(7)}  ${String(falt).padStart(7)}\n`;
    texto += `   📍 ${armNome(i.armId)} · ${gavLabel(i.armId, i.gavId)}\n`;
  });
  texto += `─────────────────────────────────────────\n`;
  texto += `Total de itens críticos: ${lows.length}\n\n`;
  texto += `Por favor, providenciar reposição o mais breve possível.\n`;
  texto += `\n— Sistema ORION de Organização Inteligente`;
  return { texto, lows };
}

window.selecionarPlanejador = function() {
  const sel = document.getElementById('lista-planejador-sel');
  const uid = sel?.value;
  if(!uid) return;
  const u = usuarios.find(u => u.id === uid);
  if(!u) return;
  if(u.plejEmail) document.getElementById('lista-email').value = u.plejEmail;
  if(u.plejWpp)   document.getElementById('lista-wpp').value   = u.plejWpp;
}

window.abrirEnvioLista = function() {
  const lows = itens.filter(i => i.min > 0 && i.qty < i.min);
  if(!lows.length) { toast('Nenhum item crítico no momento ✓', ''); return; }
  const sel = document.getElementById('lista-planejador-sel');
  if(sel) {
    const plejs = usuarios.filter(u => u.planejador && u.ativo);
    sel.innerHTML = '<option value="">— Selecionar planejador cadastrado —</option>' +
      plejs.map(u => `<option value="${u.id}">${u.nome}${u.plejSetor?' · '+u.plejSetor:''}</option>`).join('');
    if(plejs.length === 1) {
      sel.value = plejs[0].id;
      document.getElementById('lista-email').value = plejs[0].plejEmail||'';
      document.getElementById('lista-wpp').value   = plejs[0].plejWpp||'';
    } else {
      document.getElementById('lista-email').value = '';
      document.getElementById('lista-wpp').value   = '';
    }
  }
  const result = gerarTextoLista();
  document.getElementById('lista-preview').textContent = result.texto;
  document.getElementById('modal-lista').style.display = 'flex';
}

window.fecharModalLista = function() { document.getElementById('modal-lista').style.display = 'none'; }

window.copiarLista = function() {
  const result = gerarTextoLista(); if(!result) return;
  navigator.clipboard.writeText(result.texto).then(() => toast('Lista copiada ✓', '')).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = result.texto; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    toast('Lista copiada ✓', '');
  });
}

window.enviarWhatsApp = function() {
  const result = gerarTextoLista(); if(!result) return;
  const wpp     = document.getElementById('lista-wpp')?.value.trim().replace(/\D/g,'');
  const encoded = encodeURIComponent(result.texto);
  if(wpp) { window.open(`https://wa.me/${wpp}?text=${encoded}`, '_blank'); }
  else    { window.open(`https://wa.me/?text=${encoded}`, '_blank'); toast('Dica: cadastre o WhatsApp do planejador para enviar direto!', 'amber'); }
}

window.enviarEmail = function() {
  const result = gerarTextoLista(); if(!result) return;
  const para    = document.getElementById('lista-email')?.value.trim() || '';
  if(!para) { toast('Informe o e-mail do planejador', 'amber'); return; }
  const assunto = encodeURIComponent(document.getElementById('lista-assunto')?.value || 'Solicitação de reposição — ORION');
  const corpo   = encodeURIComponent(result.texto);
  window.open(`mailto:${para}?subject=${assunto}&body=${corpo}`, '_blank');
}
