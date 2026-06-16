// ══════════════════════════════════════════════
//  ORION — crachas.js
//  Geração de QR Codes para crachás dos operadores
// ══════════════════════════════════════════════
import { usuarios, ADMIN_EMAIL } from './utils.js';

// Carrega a lib QRCode via CDN
function carregarQRLib() {
  return new Promise((resolve) => {
    if(window.QRCode) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload = resolve; document.head.appendChild(s);
  });
}

// Carrega jsQR para leitura de QR pelo scanner
function carregarJsQR() {
  return new Promise((resolve) => {
    if(window.jsQR) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
    s.onload = resolve; document.head.appendChild(s);
  });
}

window.renderPainelCrachas = async function() {
  await Promise.all([carregarQRLib(), carregarJsQR()]);
  const grid = document.getElementById('crachas-grid'); if(!grid) return;
  grid.innerHTML = '';

  const operadores = usuarios.filter(u => u.ativo && u.email !== ADMIN_EMAIL);

  if(!operadores.length) {
    grid.innerHTML = '<div style="color:var(--text-dim);padding:20px">Nenhum operador cadastrado.</div>';
    return;
  }

  operadores.forEach(u => {
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg2);border:1px solid var(--border);padding:20px;display:flex;flex-direction:column;align-items:center;gap:12px;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))';

    const qrData = `ORION_USER:${u.id}:${u.nome}`;
    const qrDiv  = document.createElement('div');
    qrDiv.id = 'qr-'+u.id;
    qrDiv.style.cssText = 'background:white;padding:10px;border-radius:4px';

    card.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:var(--cyan);letter-spacing:1px;text-align:center">${u.nome}</div>
      <div style="font-size:10px;color:var(--text-dim);text-align:center">${u.nivel.toUpperCase()} · ${u.setor||'—'}</div>`;
    card.insertBefore(qrDiv, card.firstChild);

    const btnPrint = document.createElement('button');
    btnPrint.className = 'hud-btn';
    btnPrint.style.cssText = 'padding:6px 14px;font-size:11px;margin-top:4px';
    btnPrint.innerHTML = '<i class="ti ti-printer"></i>Imprimir crachá';
    btnPrint.onclick = () => imprimirCracha(u, qrData);
    card.appendChild(btnPrint);

    grid.appendChild(card);

    // Gera o QR Code
    setTimeout(() => {
      try {
        new QRCode(document.getElementById('qr-'+u.id), {
          text: qrData, width: 120, height: 120,
          colorDark: '#000000', colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch(e) { console.error('QR error:', e); }
    }, 100);
  });
}

function imprimirCracha(u, qrData) {
  const win = window.open('', '_blank');
  const canvas = document.querySelector(`#qr-${u.id} canvas`);
  const imgSrc = canvas ? canvas.toDataURL() : '';
  win.document.write(`
    <!DOCTYPE html><html><head><title>Crachá — ${u.nome}</title>
    <style>
      body{margin:0;font-family:'Exo 2',sans-serif;background:#fff}
      .cracha{width:8.5cm;height:5.5cm;border:2px solid #050d1a;border-radius:8px;padding:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;page-break-inside:avoid}
      .logo{font-size:20px;font-weight:700;letter-spacing:4px;color:#00d4ff}
      .logo span{color:#ffaa00}
      .nome{font-size:14px;font-weight:700;color:#050d1a;text-align:center}
      .nivel{font-size:10px;color:#6ba5bf;letter-spacing:2px;text-transform:uppercase}
      img{width:100px;height:100px}
      @media print{body{margin:0}button{display:none}}
    </style></head><body>
    <div class="cracha">
      <div class="logo">ORI<span>ON</span></div>
      ${imgSrc ? `<img src="${imgSrc}">` : ''}
      <div class="nome">${u.nome}</div>
      <div class="nivel">${u.nivel} ${u.setor?'· '+u.setor:''}</div>
    </div>
    <script>window.onload=()=>window.print()<\/script>
    </body></html>`);
  win.document.close();
}
