// ══════════════════════════════════════════════
//  ORION — crachas.js
//  Crachás com QR Code — busca direto do Firestore
// ══════════════════════════════════════════════
import { fsGetAll, fsSet } from './firebase.js';

function carregarQRLib() {
  return new Promise(resolve => {
    if(window.QRCode) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload = resolve; document.head.appendChild(s);
  });
}

function carregarJsQR() {
  return new Promise(resolve => {
    if(window.jsQR) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
    s.onload = resolve; document.head.appendChild(s);
  });
}

window.renderPainelCrachas = async function() {
  await Promise.all([carregarQRLib(), carregarJsQR()]);
  const grid = document.getElementById('crachas-grid');
  if(!grid) return;
  grid.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:20px">Carregando crachás...</div>';

  // Busca direto do Firestore
  let todosUsuarios = [];
  try { todosUsuarios = await fsGetAll('usuarios'); } catch(e) {
    grid.innerHTML = '<div style="color:var(--red);padding:20px">Erro ao carregar usuários: ' + e.message + '</div>';
    return;
  }

  const operadores = todosUsuarios.filter(u => u.ativo && u.status !== 'pendente');

  if(!operadores.length) {
    grid.innerHTML = '<div style="color:var(--text-dim);padding:20px">Nenhum usuário ativo cadastrado.</div>';
    return;
  }

  grid.innerHTML = '';

  for(const u of operadores) {
    // Gera e salva qrData se não existir
    if(!u.qrData) {
      u.qrData = `ORION_USER:${u.id}:${u.nome}`;
      try { await fsSet('usuarios', u.id, { qrData: u.qrData }); } catch(e) {}
    }

    const corNivel = u.nivel === 'admin' ? 'var(--red)' : u.nivel === 'operador' ? 'var(--cyan)' : 'var(--green)';
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg2);border:1px solid var(--border);padding:20px 16px;display:flex;flex-direction:column;align-items:center;gap:10px;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))';

    const qrDiv = document.createElement('div');
    qrDiv.id = 'qr-' + u.id;
    qrDiv.style.cssText = 'background:white;padding:8px;border-radius:4px;width:120px;height:120px;display:flex;align-items:center;justify-content:center';

    const info = document.createElement('div');
    info.style.cssText = 'text-align:center;width:100%';
    info.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:2px">${u.nome}</div>
      <div style="font-size:10px;font-weight:700;color:${corNivel};letter-spacing:1px;text-transform:uppercase">${u.nivel}</div>
      <div style="font-size:10px;color:var(--text-dim);margin-top:2px">${u.setor||u.email||''}</div>`;

    const btnPrint = document.createElement('button');
    btnPrint.className = 'hud-btn';
    btnPrint.style.cssText = 'padding:6px 14px;font-size:11px;width:100%;justify-content:center;margin-top:4px';
    btnPrint.innerHTML = '<i class="ti ti-printer"></i>Imprimir crachá';
    btnPrint.onclick = () => imprimirCracha(u);

    card.appendChild(qrDiv);
    card.appendChild(info);
    card.appendChild(btnPrint);
    grid.appendChild(card);

    setTimeout(() => {
      try {
        new QRCode(document.getElementById('qr-' + u.id), {
          text: u.qrData, width: 110, height: 110,
          colorDark: '#000000', colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch(e) { console.error('QR error', u.nome, e); }
    }, 200);
  }
}

function imprimirCracha(u) {
  const canvas = document.querySelector(`#qr-${u.id} canvas`);
  const imgSrc = canvas ? canvas.toDataURL() : '';
  const corNivel = u.nivel === 'admin' ? '#ff3b5c' : u.nivel === 'operador' ? '#00d4ff' : '#00ff88';
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Crachá — ${u.nome}</title>
  <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;700&display=swap" rel="stylesheet">
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Exo 2',sans-serif;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}.cracha{width:8.6cm;height:5.4cm;border:2px solid #050d1a;border-radius:10px;padding:14px 16px;display:flex;gap:14px;align-items:center}.qr-side img{width:110px;height:110px;border:1px solid #eee;border-radius:4px;padding:4px}.info-side{flex:1;display:flex;flex-direction:column;gap:6px}.logo{font-size:18px;font-weight:700;letter-spacing:4px;color:#050d1a}.logo span{color:#ffaa00}.divider{height:1px;background:#e0e0e0}.nome{font-size:14px;font-weight:700;color:#050d1a}.nivel{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${corNivel};padding:2px 6px;border:1px solid ${corNivel};border-radius:3px;display:inline-block}.setor{font-size:10px;color:#888}.inst{font-size:8px;color:#aaa;margin-top:auto}@media print{body{min-height:auto}}</style>
  </head><body><div class="cracha"><div class="qr-side">${imgSrc?`<img src="${imgSrc}">`:'<div style="width:110px;height:110px;background:#f5f5f5"></div>'}</div><div class="info-side"><div class="logo">ORI<span>ON</span></div><div class="divider"></div><div class="nome">${u.nome}</div><div><span class="nivel">${u.nivel.toUpperCase()}</span></div>${u.setor?`<div class="setor">${u.setor}</div>`:''}<div class="inst">Sistema de Organização Inteligente</div></div></div>
  <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  win.document.close();
}

function carregarQRLib() {
  return new Promise(resolve => {
    if(window.QRCode) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload = resolve; document.head.appendChild(s);
  });
}

function carregarJsQR() {
  return new Promise(resolve => {
    if(window.jsQR) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
    s.onload = resolve; document.head.appendChild(s);
  });
}

window.renderPainelCrachas = async function() {
  await Promise.all([carregarQRLib(), carregarJsQR()]);
  const grid = document.getElementById('crachas-grid'); if(!grid) return;
  grid.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:12px">Carregando crachás...</div>';

  // Filtra todos os usuários ativos (exceto o admin fixo)
  const operadores = usuarios.filter(u => u.ativo && u.status !== 'pendente');
  if(!operadores.length) {
    grid.innerHTML = '<div style="color:var(--text-dim);padding:20px">Nenhum usuário ativo cadastrado.</div>';
    return;
  }

  grid.innerHTML = '';

  for(const u of operadores) {
    // Garante que o qrData existe — gera e salva se não tiver
    if(!u.qrData) {
      u.qrData = `ORION_USER:${u.id}:${u.nome}`;
      await fsSet('usuarios', u.id, { qrData: u.qrData });
    }

    const isFixed = u.email === ADMIN_EMAIL;
    const corNivel = u.nivel === 'admin' ? 'var(--red)' : u.nivel === 'operador' ? 'var(--cyan)' : 'var(--green)';

    const card = document.createElement('div');
    card.style.cssText = `background:var(--bg2);border:1px solid ${isFixed?'var(--red)':'var(--border)'};padding:20px 16px;display:flex;flex-direction:column;align-items:center;gap:10px;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))`;

    const qrDiv = document.createElement('div');
    qrDiv.id = 'qr-' + u.id;
    qrDiv.style.cssText = 'background:white;padding:8px;border-radius:4px;width:120px;height:120px;display:flex;align-items:center;justify-content:center';

    const info = document.createElement('div');
    info.style.cssText = 'text-align:center;width:100%';
    info.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:2px">${u.nome}</div>
      <div style="font-size:10px;font-weight:700;color:${corNivel};letter-spacing:1px;text-transform:uppercase">${u.nivel}</div>
      <div style="font-size:10px;color:var(--text-dim);margin-top:2px">${u.setor||u.email||''}</div>`;

    const btnPrint = document.createElement('button');
    btnPrint.className = 'hud-btn';
    btnPrint.style.cssText = 'padding:6px 14px;font-size:11px;width:100%;justify-content:center';
    btnPrint.innerHTML = '<i class="ti ti-printer"></i>Imprimir crachá';
    btnPrint.onclick = () => imprimirCracha(u);

    card.appendChild(qrDiv);
    card.appendChild(info);
    card.appendChild(btnPrint);
    grid.appendChild(card);

    // Gera o QR Code com o qrData do Firestore
    setTimeout(() => {
      try {
        new QRCode(document.getElementById('qr-' + u.id), {
          text: u.qrData,
          width: 110, height: 110,
          colorDark: '#000000', colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch(e) { console.error('QR error', u.nome, e); }
    }, 150);
  }
}

function imprimirCracha(u) {
  const canvas = document.querySelector(`#qr-${u.id} canvas`);
  const imgSrc = canvas ? canvas.toDataURL() : '';
  const corNivel = u.nivel === 'admin' ? '#ff3b5c' : u.nivel === 'operador' ? '#00d4ff' : '#00ff88';
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Crachá — ${u.nome}</title>
  <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;700&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Exo 2',sans-serif;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .cracha{width:8.6cm;height:5.4cm;border:2px solid #050d1a;border-radius:10px;padding:14px 16px;display:flex;gap:14px;align-items:center;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.15)}
    .qr-side img{width:110px;height:110px;border:1px solid #eee;border-radius:4px;padding:4px;background:#fff}
    .info-side{flex:1;display:flex;flex-direction:column;gap:6px}
    .logo{font-size:18px;font-weight:700;letter-spacing:4px;color:#050d1a}
    .logo span{color:#ffaa00}
    .divider{height:1px;background:#e0e0e0}
    .nome{font-size:14px;font-weight:700;color:#050d1a;line-height:1.2}
    .nivel{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${corNivel};padding:2px 6px;border:1px solid ${corNivel};border-radius:3px;display:inline-block}
    .setor{font-size:10px;color:#888;margin-top:2px}
    .inst{font-size:8px;color:#aaa;margin-top:auto}
    @media print{body{min-height:auto}.cracha{box-shadow:none}button{display:none}}
  </style></head><body>
  <div class="cracha">
    <div class="qr-side">${imgSrc?`<img src="${imgSrc}">`:'<div style="width:110px;height:110px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999">QR indisponível</div>'}</div>
    <div class="info-side">
      <div class="logo">ORI<span>ON</span></div>
      <div class="divider"></div>
      <div class="nome">${u.nome}</div>
      <div><span class="nivel">${u.nivel.toUpperCase()}</span></div>
      ${u.setor?`<div class="setor">${u.setor}</div>`:''}
      <div class="inst">Sistema de Organização Inteligente</div>
    </div>
  </div>
  <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script>
  </body></html>`);
  win.document.close();
}
