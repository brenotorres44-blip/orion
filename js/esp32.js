// ══════════════════════════════════════════════
//  ORION — esp32.js
//  Conexão ESP32, LEDs, travas, pinos
// ══════════════════════════════════════════════
import { toast, armarios, armById, pinosConfig, setPinosConfig, setEspOnlineState, espOnline } from './utils.js';

function espUrl(rota){
  const ip   = document.getElementById('esp-ip')?.value.trim()   || localStorage.getItem('esp_ip')   || '192.168.1.50';
  const port = document.getElementById('esp-porta')?.value.trim() || localStorage.getItem('esp_port') || '80';
  return `http://${ip}:${port}${rota}`;
}
function salvarEspConfig() {
  const ip   = document.getElementById('esp-ip')?.value.trim();
  const port = document.getElementById('esp-porta')?.value.trim();
  if(ip)   localStorage.setItem('esp_ip',   ip);
  if(port) localStorage.setItem('esp_port', port);
}
export async function espPost(rota,body){ try{ const r=await fetch(espUrl(rota),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(4000)}); return await r.json(); } catch(e){ return null; } }
async function espGet(rota){ try{ const r=await fetch(espUrl(rota),{signal:AbortSignal.timeout(4000)}); return await r.json(); } catch(e){ return null; } }

function setEspStatus(online,msg=''){ setEspOnlineState(online); const el=document.getElementById('esp32-status'); const box=document.getElementById('esp-conn-status'); if(el){el.textContent=online?'ONLINE':'OFFLINE';el.style.color=online?'var(--green)':'var(--red)';} if(box) box.innerHTML=online?`<span class="led"></span> Conectado — ${msg}`:`<span class="led red"></span> ${msg||'Sem resposta'}`; }

window.testarConexao=async function(){ salvarEspConfig(); const box=document.getElementById('esp-conn-status'); if(box) box.innerHTML=`<span class="led amber"></span> Testando...`; const res=await espGet('/ping'); if(res?.status==='online') setEspStatus(true,`IP ${res.ip} · ${res.gavetas} gavetas`); else setEspStatus(false,'Verifique o IP e se o ESP32 está ligado'); }
window.testarLeds=async function(){ const res=await espGet('/teste'); if(res?.ok) toast('Sequência de LEDs enviada ✓',''); else toast('ESP32 não respondeu','red'); }
window.fecharTodasTravas=async function(){ const res=await espPost('/trava/todas',{}); if(res?.ok) toast('Todas as travas fechadas ✓',''); else toast('ESP32 não respondeu','red'); }

window.renderPinosForm=function(){ const armId=document.getElementById('esp-arm-sel')?.value; const arm=armById(armId); const form=document.getElementById('pinos-form'); if(!arm||!form) return; const PINOS=[4,13,14,16,17,18,19,21,22,23,25,26,27,32,33]; const opts=PINOS.map(p=>`<option value="${p}">GPIO ${p}</option>`).join(''); form.innerHTML=`<div style="display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:8px;margin-bottom:8px"><div style="font-size:10px;color:var(--cyan);text-transform:uppercase;font-weight:700;padding:6px 0">Gaveta</div><div style="font-size:10px;color:var(--cyan);text-transform:uppercase;font-weight:700;padding:6px 0">Pino LED</div><div style="font-size:10px;color:var(--cyan);text-transform:uppercase;font-weight:700;padding:6px 0">Pino trava</div></div>`+(arm.gavetas||[]).map(g=>{ const key=armId+'_'+g.id; return `<div style="display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:8px;margin-bottom:6px;align-items:center"><div style="font-size:13px;font-weight:600;color:var(--amber)">G${g.num} <span style="color:var(--text-dim);font-weight:400;font-size:11px">${g.nome||''}</span></div><select class="hud-select" id="pino-led-${key}" style="padding:8px 10px;font-size:12px"><option value="">— Sem LED</option>${opts}</select><select class="hud-select" id="pino-trv-${key}" style="padding:8px 10px;font-size:12px"><option value="">— Sem trava</option>${opts}</select></div>`; }).join(''); (arm.gavetas||[]).forEach(g=>{ const key=armId+'_'+g.id; const saved=pinosConfig[key]||{}; const ls=document.getElementById('pino-led-'+key); const ts2=document.getElementById('pino-trv-'+key); if(ls&&saved.pinoLed) ls.value=saved.pinoLed; if(ts2&&saved.pinoTrava) ts2.value=saved.pinoTrava; }); renderManualGrid(arm); }

window.salvarPinosLocal=function(){ const armId=document.getElementById('esp-arm-sel')?.value; const arm=armById(armId); if(!arm) return; (arm.gavetas||[]).forEach(g=>{ const key=armId+'_'+g.id; const led=document.getElementById('pino-led-'+key)?.value; const trv=document.getElementById('pino-trv-'+key)?.value; pinosConfig[key]={pinoLed:led?parseInt(led):null,pinoTrava:trv?parseInt(trv):null}; }); localStorage.setItem('dos_pinos',JSON.stringify(pinosConfig)); toast('Pinos salvos ✓',''); }

window.enviarConfigESP32=async function(){ window.salvarPinosLocal(); const payload={gavetas:[]}; armarios.forEach(arm=>{ (arm.gavetas||[]).forEach(g=>{ const key=arm.id+'_'+g.id; const conf=pinosConfig[key]||{}; if(conf.pinoLed) payload.gavetas.push({armId:arm.id,gavId:g.id,pinoLed:conf.pinoLed,pinoTrava:conf.pinoTrava||-1}); }); }); if(!payload.gavetas.length){toast('Configure ao menos um pino LED','amber');return;} const res=await espPost('/configurar',payload); if(res?.ok){setEspStatus(true,`${res.gavetas} gavetas`);toast(`ESP32 configurado: ${res.gavetas} gavetas ✓`,'');} else toast('Falha ao configurar ESP32','red'); }

function renderManualGrid(arm){ const grid=document.getElementById('manual-grid'); if(!grid||!arm) return; grid.innerHTML=(arm.gavetas||[]).map(g=>{ const key=arm.id+'_'+g.id; const conf=pinosConfig[key]||{}; return `<div style="background:var(--bg3);border:1px solid var(--border);padding:14px;display:flex;flex-direction:column;gap:8px"><div style="font-size:13px;font-weight:700;color:var(--amber)">G${g.num} <span style="color:var(--text-dim);font-weight:400;font-size:11px">${g.nome||''}</span></div>${conf.pinoLed?`<div style="font-size:10px;color:var(--text-dim)">LED → GPIO ${conf.pinoLed}</div>`:'<div style="font-size:10px;color:var(--text-dim)">Sem LED</div>'}<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px"><button class="hud-btn" style="padding:5px 10px;font-size:11px" ${conf.pinoLed?'':'disabled'} onclick="window.acionarLedManual('${arm.id}','${g.id}',true)">LED</button><button class="hud-btn danger" style="padding:5px 10px;font-size:11px" ${conf.pinoLed?'':'disabled'} onclick="window.acionarLedManual('${arm.id}','${g.id}',false)">Apagar</button>${conf.pinoTrava?`<button class="hud-btn amber" style="padding:5px 10px;font-size:11px" onclick="window.acionarTravaManual('${arm.id}','${g.id}')">Abrir</button>`:''}</div></div>`; }).join(''); }

window.acionarLedManual=async function(aId,gId,acender){ if(acender){const r=await espPost('/localizar',{armId:aId,gavId:gId,abrirTrava:false});if(r?.ok)toast('LED aceso ✓','');else toast('ESP32 não respondeu','red');} else{const r=await espPost('/apagar',{armId:aId,gavId:gId});if(r?.ok)toast('LED apagado','');else toast('ESP32 não respondeu','red');} }
window.acionarTravaManual=async function(aId,gId){ const r=await espPost('/trava',{armId:aId,gavId:gId,abrir:true}); if(r?.ok) toast('Trava aberta por 3s ✓',''); else toast('ESP32 não respondeu','red'); }

function populateEspArmSelect(){ const sel=document.getElementById('esp-arm-sel'); if(!sel) return; const cur=sel.value; sel.innerHTML=armarios.length?armarios.map(a=>`<option value="${a.id}">${a.nome}</option>`).join(''):'<option value="">Nenhum armário</option>'; if(cur) sel.value=cur; window.renderPinosForm(); }

export function initPainelEsp32(){ populateEspArmSelect(); window.testarConexao(); }

setInterval(async()=>{ const r=await espGet('/ping').catch(()=>null); setEspStatus(!!(r?.status==='online'),r?`IP ${r.ip}`:''); },30000);
