// ══════════════════════════════════════════════
//  ORION — voz.js
//  Web Speech API + localização por voz
// ══════════════════════════════════════════════
import { itens, armarios, armById, gavById, armNome, gavLabel, espOnline } from './utils.js';
import { toast } from './utils.js';
import { espPost } from './esp32.js';

let recognition = null, voiceOn = false;

function setupRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR) return null;
  const r=new SR(); r.lang='pt-BR'; r.continuous=false; r.interimResults=true;
  r.onstart=()=>{ voiceOn=true; document.getElementById('mic-btn').classList.add('listening'); document.getElementById('voice-status').textContent='● OUVINDO... FALE O NOME DO ITEM'; document.getElementById('voice-status').style.color='var(--red)'; document.getElementById('radar-sweep').classList.add('active'); document.getElementById('voice-transcript').textContent='...'; };
  r.onresult=e=>{ const t=e.results[0][0].transcript; document.getElementById('voice-transcript').textContent=t; if(e.results[0].isFinal) processarVozComESP(t); };
  r.onerror=e=>{stopVoz();if(e.error==='not-allowed')toast('Microfone bloqueado','red');else toast('Erro: '+e.error,'red');};
  r.onend=()=>stopVoz();
  return r;
}

window.toggleVoz = function(){
  if(voiceOn){stopVoz();return;}
  if(!recognition) recognition=setupRecognition();
  if(!recognition){toast('Use Chrome para reconhecimento de voz','amber');return;}
  clearGavetaDisplay();
  document.getElementById('voice-result').style.display='none';
  try{recognition.start();}catch(e){toast('Erro ao iniciar microfone','red');}
}

function stopVoz(){
  voiceOn=false; try{recognition?.stop();}catch(e){}
  document.getElementById('mic-btn').classList.remove('listening');
  document.getElementById('voice-status').textContent='Clique no microfone para iniciar';
  document.getElementById('voice-status').style.color='';
  document.getElementById('radar-sweep').classList.remove('active');
}

function clearGavetaDisplay(){ document.querySelectorAll('.gd-box').forEach(b=>b.classList.remove('lit')); }

function processarVoz(texto){
  const t = texto.toLowerCase().trim();
  document.getElementById('voice-transcript').textContent = '"'+texto+'"';
  const resultados = [];
  itens.forEach(item => {
    const n = item.nome.toLowerCase(); let score = 0;
    n.split(' ').forEach(p => { if(t.includes(p)) score += p.length; });
    t.split(' ').forEach(p => { if(n.includes(p)) score += p.length; });
    if(score >= 2) resultados.push({ item, score });
  });
  resultados.sort((a,b) => b.score - a.score);
  const melhorScore = resultados[0]?.score || 0;
  const encontrados = resultados.filter(r => r.score >= melhorScore * 0.7).map(r => r.item);
  const rv = document.getElementById('voice-result');
  rv.style.display = ''; clearGavetaDisplay();
  if(encontrados.length > 0) {
    document.getElementById('vr-title').innerHTML = `◉ ${encontrados.length > 1 ? encontrados.length+' locais encontrados' : 'Item localizado'}`;
    const cardsHtml = encontrados.map(item => {
      const arm = armById(item.armId); const gav = gavById(item.armId, item.gavId); const cor = arm?.cor || '#00d4ff';
      return `<div style="background:var(--bg3);border:1px solid ${cor}40;padding:12px 16px;margin-bottom:8px;border-left:3px solid ${cor}">
        <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center">
          <div style="font-size:18px;font-weight:700;color:var(--cyan);min-width:120px">${item.nome}</div>
          <div><div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">Armário</div><div style="font-weight:700;color:${cor}">${arm?.nome||'?'}</div></div>
          <div><div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">Gaveta</div><div style="font-weight:700;color:var(--amber)">G${gav?.num||'?'} ${gav?.nome?'· '+gav.nome:''}</div></div>
          <div><div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">Local</div><div style="color:var(--text)">${arm?.local||'—'}</div></div>
          <div><div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">Estoque</div><div style="color:${item.qty>item.min?'var(--green)':'var(--red)'};font-weight:700">${item.qty} unid.</div></div>
        </div>
      </div>`;
    }).join('');
    document.getElementById('vr-content').innerHTML = cardsHtml;
    const armsEncontrados = [...new Set(encontrados.map(i => i.armId))];
    let gavetasHtml = '';
    armsEncontrados.forEach(armId => {
      const arm = armById(armId); const gavIdsTarget = encontrados.filter(i => i.armId === armId).map(i => i.gavId);
      gavetasHtml += `<div style="margin-bottom:12px"><div style="font-size:9px;color:${arm?.cor||'var(--cyan)'};letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;font-weight:700">${arm?.nome||'?'}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">${(arm?.gavetas||[]).map(g=>`<div class="gd-box ${gavIdsTarget.includes(g.id)?'lit':''}"><div class="gd-num">${g.num}</div><div class="gd-label">${g.nome||'Gaveta'}</div><div class="gd-led"></div></div>`).join('')}</div></div>`;
    });
    document.getElementById('gaveta-display').innerHTML = gavetasHtml;
    let frase = encontrados.length === 1
      ? `${encontrados[0].nome} está no armário ${armById(encontrados[0].armId)?.nome||''}, gaveta ${gavById(encontrados[0].armId, encontrados[0].gavId)?.num||''}`
      : `${encontrados[0].nome} foi encontrado em ${encontrados.length} locais`;
    if('speechSynthesis' in window) { speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(frase); u.lang='pt-BR'; u.pitch=0.85; u.rate=0.95; speechSynthesis.speak(u); }
    toast(`${encontrados.length} local(is) encontrado(s)`, '');
    return encontrados;
  } else {
    document.getElementById('vr-title').innerHTML = '✕ Não encontrado';
    document.getElementById('vr-content').innerHTML = `<div style="color:var(--text-dim);font-size:14px">Nenhum item corresponde a "<span style="color:var(--amber)">${texto}</span>".</div>`;
    document.getElementById('gaveta-display').innerHTML = '';
    toast('Item não encontrado', 'amber'); return null;
  }
}

async function processarVozComESP(texto){
  const encontrados = processarVoz(texto);
  if(!encontrados?.length || !espOnline) return;
  for(const item of encontrados) await espPost('/localizar', { armId: item.armId, gavId: item.gavId, abrirTrava: false });
  toast(`◉ ESP32: ${encontrados.length} LED(s) aceso(s) ✓`, '');
}
