// ══════════════════════════════════════════════
//  ORION — auth.js
//  Login, logout, Google, registro LGPD,
//  esqueci senha, onAuthStateChanged
// ══════════════════════════════════════════════
import { auth, fsSet, fsGetAll, docRef,
         signInWithEmailAndPassword, createUserWithEmailAndPassword,
         signOut, onAuthStateChanged, GoogleAuthProvider,
         signInWithPopup, sendPasswordResetEmail, getDoc } from './firebase.js';
import { toast, openModal, ADMIN_EMAIL, PERMISSOES,
         setUsuarioAtual, usuarioAtual, editandoUserId, usuarios,
         ts } from './utils.js';
import { carregarDados } from './app.js';
import { renderTabelaUsuarios } from './usuarios.js';

// ── Helpers de UI login ────────────────────────
export function mostrarMsgLogin(msg, tipo='') {
  const el = document.getElementById('login-erro');
  const cor = tipo==='green' ? 'var(--green)' : tipo==='red' ? 'var(--red)' : 'var(--amber)';
  if(el) { el.textContent = msg; el.style.display = 'block'; el.style.color = cor; }
}

function mostrarErroLogin(msg) {
  const el = document.getElementById('login-erro');
  el.textContent = msg; el.style.display = 'block';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-pass').focus();
}

export function mostrarLogin() {
  document.getElementById('login-overlay').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('user-info-bar').style.display = 'none';
  document.querySelectorAll('.side-btn').forEach(b => b.style.display = '');
}

// ── Auth state ─────────────────────────────────
onAuthStateChanged(auth, async fireUser => {
  if (fireUser) {
    const perfil = await getDoc(docRef('usuarios', fireUser.uid));
    if (perfil.exists()) {
      const dados = perfil.data();
      if (dados.status === 'pendente') {
        await signOut(auth); mostrarLogin();
        mostrarMsgLogin('⏳ Seu cadastro está aguardando aprovação do administrador.'); return;
      }
      if (!dados.ativo) {
        await signOut(auth); mostrarLogin();
        mostrarMsgLogin('⛔ Sua conta foi desativada. Entre em contato com o administrador.'); return;
      }
      const nivel = fireUser.email === ADMIN_EMAIL ? 'admin' : (dados.nivel || 'operador');
      if (fireUser.email === ADMIN_EMAIL && dados.nivel !== 'admin') {
        await fsSet('usuarios', fireUser.uid, { nivel: 'admin' });
      }
      setUsuarioAtual({ uid: fireUser.uid, email: fireUser.email, ...dados, nivel });
      await fsSet('usuarios', fireUser.uid, { ultimoAcesso: ts() });
    } else {
      const nivel  = fireUser.email === ADMIN_EMAIL ? 'admin'  : 'operador';
      const status = fireUser.email === ADMIN_EMAIL ? 'ativo'  : 'pendente';
      const ativo  = fireUser.email === ADMIN_EMAIL;
      setUsuarioAtual({ uid: fireUser.uid, email: fireUser.email,
        nome: fireUser.displayName || fireUser.email.split('@')[0], nivel });
      await fsSet('usuarios', fireUser.uid, {
        nome: usuarioAtual.nome, email: fireUser.email,
        nivel, ativo, status,
        criado: ts(), ultimoAcesso: ts(), lgpdConsentimento: false
      });
      if(fireUser.email !== ADMIN_EMAIL) {
        await signOut(auth); mostrarLogin();
        mostrarMsgLogin('⏳ Sua conta está aguardando aprovação. Entre em contato com o administrador.'); return;
      }
    }
    mostrarApp();
  } else {
    setUsuarioAtual(null);
    mostrarLogin();
  }
});

// ── Login / Logout ─────────────────────────────
window.fazerLogin = async function() {
  const email = document.getElementById('login-user').value.trim();
  const senha  = document.getElementById('login-pass').value;
  if(!email || !senha) { mostrarErroLogin('Preencha todos os campos'); return; }
  const btn = document.querySelector('#login-overlay .hud-btn');
  btn.innerHTML = '<i class="ti ti-loader"></i>Verificando...'; btn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, email, senha);
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
    document.getElementById('login-erro').style.display = 'none';
  } catch(e) {
    const msgs = {
      'auth/user-not-found':     'Usuário não encontrado',
      'auth/wrong-password':     'Senha incorreta',
      'auth/invalid-email':      'E-mail inválido',
      'auth/invalid-credential': 'E-mail ou senha incorretos',
      'auth/too-many-requests':  'Muitas tentativas. Tente mais tarde.'
    };
    mostrarErroLogin(msgs[e.code] || 'Erro: ' + e.message);
  }
  btn.innerHTML = '<i class="ti ti-login"></i>Entrar no sistema'; btn.disabled = false;
}

window.fazerLogout = async function() { await signOut(auth); }

window.loginGoogle = async function() {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result   = await signInWithPopup(auth, provider);
    const fireUser = result.user;
    const perfil   = await getDoc(docRef('usuarios', fireUser.uid));
    if (perfil.exists()) {
      const dados = perfil.data();
      if (dados.status === 'pendente') { await signOut(auth); mostrarErroLogin('⏳ Seu cadastro está aguardando aprovação do administrador.'); return; }
      if (!dados.ativo)                { await signOut(auth); mostrarErroLogin('⛔ Sua conta foi desativada. Entre em contato com o administrador.'); return; }
      const nivel = fireUser.email === ADMIN_EMAIL ? 'admin' : (dados.nivel || 'operador');
      setUsuarioAtual({ uid: fireUser.uid, email: fireUser.email, ...dados, nivel });
      await fsSet('usuarios', fireUser.uid, { ultimoAcesso: ts() });
    } else {
      if (fireUser.email === ADMIN_EMAIL) {
        const nome = fireUser.displayName || 'Administrador';
        setUsuarioAtual({ uid: fireUser.uid, email: fireUser.email, nome, nivel: 'admin', ativo: true });
        await fsSet('usuarios', fireUser.uid, { nome, email: fireUser.email, nivel: 'admin', ativo: true, status: 'ativo', criado: ts(), ultimoAcesso: ts(), lgpdConsentimento: true });
      } else {
        await signOut(auth);
        mostrarErroLogin('⏳ Sua conta foi criada e está aguardando aprovação do administrador.');
        const nome = fireUser.displayName || fireUser.email.split('@')[0];
        await fsSet('usuarios', fireUser.uid, { nome, email: fireUser.email, nivel: 'operador', ativo: false, status: 'pendente', criado: ts(), ultimoAcesso: '—', lgpdConsentimento: false });
        await fsSet('solicitacoes', fireUser.uid, { uid: fireUser.uid, nome, email: fireUser.email, setor: '', motivo: 'Login via Google', nivel: 'operador', status: 'pendente', criado: ts(), lgpdConsentimento: false });
        return;
      }
    }
    mostrarApp();
  } catch(e) {
    if(e.code !== 'auth/popup-closed-by-user') mostrarErroLogin('Erro ao entrar com Google: ' + (e.message || e.code));
  }
}

// ── Esqueci senha ──────────────────────────────
window.toggleSenhaLogin = function() {
  const inp = document.getElementById('login-pass');
  const btn = document.getElementById('btn-toggle-pass');
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.innerHTML = show ? '<i class="ti ti-eye-off"></i>' : '<i class="ti ti-eye"></i>';
}

window.esqueceuSenha = async function() {
  const emailInput = document.getElementById('login-user');
  const email = emailInput?.value.trim();
  if(!email) { mostrarMsgLogin('Digite seu e-mail acima e clique em "Esqueci minha senha".'); emailInput?.focus(); return; }
  try {
    await sendPasswordResetEmail(auth, email);
    mostrarMsgLogin('✓ E-mail de redefinição enviado para ' + email + '. Verifique sua caixa de entrada.', 'green');
  } catch(e) {
    const msgs = { 'auth/user-not-found':'E-mail não encontrado no sistema.', 'auth/invalid-email':'E-mail inválido.', 'auth/too-many-requests':'Muitas tentativas. Aguarde alguns minutos.' };
    mostrarMsgLogin(msgs[e.code] || 'Erro ao enviar e-mail: ' + e.message);
  }
}

window.resetSenhaUsuario = async function() {
  const user  = editandoUserId ? usuarios.find(u => u.id === editandoUserId) : null;
  const email = user?.email || document.getElementById('ac-login')?.value.trim();
  if(!email) { toast('Salve o usuário primeiro para usar esta função', 'amber'); return; }
  openModal('Redefinir senha', `Enviar e-mail de redefinição de senha para "${email}"?`, 'Enviar e-mail', async () => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast('✓ E-mail de redefinição enviado para ' + email);
    } catch(e) {
      const msgs = { 'auth/user-not-found':'Usuário não encontrado no Firebase Auth.', 'auth/invalid-email':'E-mail inválido.', 'auth/too-many-requests':'Muitas tentativas. Aguarde alguns minutos.' };
      toast(msgs[e.code] || 'Erro: ' + e.message, 'red');
    }
  });
}

// ── Mostrar app após login ─────────────────────
function mostrarApp() {
  document.getElementById('login-overlay').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  const bar = document.getElementById('user-info-bar');
  bar.style.display = 'flex';
  const iniciais = (usuarioAtual.nome||'?').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase();
  const av = document.getElementById('user-avatar');
  if(av) av.textContent = iniciais;
  document.getElementById('user-nome-disp').textContent  = usuarioAtual.nome;
  document.getElementById('user-nivel-disp').textContent = '★ ' + (usuarioAtual.nivel||'').toUpperCase();
  const nivelReal = usuarioAtual.nivelReal || usuarioAtual.nivel;
  usuarioAtual.nivelReal = nivelReal;
  if(nivelReal === 'admin') {
    const mt = document.getElementById('modo-toggle');
    if(mt) mt.style.display = 'flex';
    atualizarBotoesModo(usuarioAtual.nivel);
  }
  aplicarPermissoesNav();
  carregarDados().then(() => window.showPanel('home'));
}

window.alternarModo = function(modo) {
  if(!usuarioAtual) return;
  if(usuarioAtual.nivelReal !== 'admin') { toast('Sem permissão para alternar modo', 'red'); return; }
  usuarioAtual.nivel = modo;
  document.getElementById('user-nivel-disp').textContent = '★ ' + modo.toUpperCase();
  atualizarBotoesModo(modo);
  aplicarPermissoesNav();
  window.showPanel('home');
  toast(`Modo ${modo.toUpperCase()} ativado`, modo==='admin' ? 'red' : '');
}

function atualizarBotoesModo(modo) {
  const btnAdmin = document.getElementById('btn-modo-admin');
  const btnOp    = document.getElementById('btn-modo-op');
  if(!btnAdmin || !btnOp) return;
  if(modo === 'admin') {
    btnAdmin.style.background = 'rgba(255,59,92,0.25)'; btnAdmin.style.color = 'var(--red)'; btnAdmin.style.borderColor = 'rgba(255,59,92,0.7)';
    btnOp.style.background    = 'transparent';          btnOp.style.color    = 'var(--text-dim)'; btnOp.style.borderColor = 'rgba(0,212,255,0.2)';
  } else {
    btnOp.style.background    = 'rgba(0,212,255,0.15)'; btnOp.style.color    = 'var(--cyan)'; btnOp.style.borderColor = 'rgba(0,212,255,0.6)';
    btnAdmin.style.background = 'transparent';          btnAdmin.style.color = 'var(--text-dim)'; btnAdmin.style.borderColor = 'rgba(255,59,92,0.2)';
  }
}

function aplicarPermissoesNav() {
  if(!usuarioAtual) return;
  const permitidos = PERMISSOES[usuarioAtual.nivel] || [];
  document.querySelectorAll('.side-btn[data-panel]').forEach(btn => {
    const p = btn.dataset.panel;
    btn.style.display = (p === 'home' || permitidos.includes(p)) ? '' : 'none';
  });
}

// ── Registro de usuários (LGPD) ────────────────
window.mostrarTelaRegistro = function() {
  document.getElementById('login-overlay').style.display = 'none';
  document.getElementById('registro-overlay').style.display = 'flex';
  iniciarMatrixReg();
}

window.voltarLogin = function() {
  document.getElementById('registro-overlay').style.display = 'none';
  document.getElementById('login-overlay').style.display = 'flex';
  ['reg-nome','reg-email','reg-setor','reg-senha','reg-senha2','reg-motivo'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  const lgpd = document.getElementById('reg-lgpd'); if(lgpd) lgpd.checked = false;
  const err  = document.getElementById('reg-erro');   if(err)  err.style.display = 'none';
  const suc  = document.getElementById('reg-sucesso'); if(suc) suc.style.display = 'none';
}

window.registrarUsuario = async function() {
  const nome   = document.getElementById('reg-nome')?.value.trim();
  const email  = document.getElementById('reg-email')?.value.trim().toLowerCase();
  const setor  = document.getElementById('reg-setor')?.value.trim();
  const senha  = document.getElementById('reg-senha')?.value;
  const senha2 = document.getElementById('reg-senha2')?.value;
  const motivo = document.getElementById('reg-motivo')?.value.trim();
  const lgpd   = document.getElementById('reg-lgpd')?.checked;
  const errEl  = document.getElementById('reg-erro');
  const sucEl  = document.getElementById('reg-sucesso');
  const mostrarErro = msg => { errEl.textContent = msg; errEl.style.display = 'block'; sucEl.style.display = 'none'; };
  if(!nome || !email || !senha)   { mostrarErro('Preencha todos os campos obrigatórios.'); return; }
  if(senha !== senha2)            { mostrarErro('As senhas não conferem.'); return; }
  if(senha.length < 6)            { mostrarErro('A senha deve ter no mínimo 6 caracteres.'); return; }
  if(!lgpd)                       { mostrarErro('Você precisa aceitar os termos da LGPD para continuar.'); return; }
  if(!motivo)                     { mostrarErro('Informe a justificativa de acesso.'); return; }
  const btn = document.querySelector('#registro-overlay .hud-btn.green-btn');
  if(btn) { btn.innerHTML = '<i class="ti ti-loader"></i>Processando...'; btn.disabled = true; }
  try {
    const nivel  = email === ADMIN_EMAIL ? 'admin'  : 'operador';
    const status = email === ADMIN_EMAIL ? 'ativo'  : 'pendente';
    const cred   = await createUserWithEmailAndPassword(auth, email, senha);
    const uid    = cred.user.uid;
    const qrData = `ORION_USER:${uid}:${nome}`;
    await fsSet('usuarios', uid, { nome, email, setor: setor||'', nivel, ativo: email === ADMIN_EMAIL, status, criado: ts(), ultimoAcesso: '—', lgpdConsentimento: true, lgpdData: ts(), qrData });
    if(nivel !== 'admin') await fsSet('solicitacoes', uid, { uid, nome, email, setor: setor||'', motivo, nivel, status: 'pendente', criado: ts(), lgpdConsentimento: true });
    errEl.style.display = 'none';
    sucEl.innerHTML = nivel === 'admin'
      ? `<i class="ti ti-circle-check" style="font-size:20px;display:block;margin-bottom:6px;color:var(--green)"></i><b style="color:var(--green)">Conta criada!</b><br>Faça login para acessar.`
      : `<i class="ti ti-clock" style="font-size:20px;display:block;margin-bottom:6px;color:var(--amber)"></i><b style="color:var(--amber)">Solicitação enviada!</b><br>Aguarde a aprovação do administrador.<br><span style="font-size:10px;color:var(--text-dim)">Você será notificado quando seu acesso for liberado.</span>`;
    sucEl.style.display = 'block';
    if(btn) { btn.innerHTML = '<i class="ti ti-arrow-left"></i>Voltar ao login'; btn.disabled = false; btn.onclick = () => window.voltarLogin(); }
  } catch(e) {
    const msgs = { 'auth/email-already-in-use':'Este e-mail já possui uma conta cadastrada.', 'auth/invalid-email':'E-mail inválido.', 'auth/weak-password':'Senha muito fraca.' };
    mostrarErro(msgs[e.code] || 'Erro ao criar conta: ' + e.message);
    if(btn) { btn.innerHTML = '<i class="ti ti-user-check"></i>Solicitar acesso'; btn.disabled = false; }
  }
}

function iniciarMatrixReg() {
  const canvas = document.getElementById('matrix-canvas-reg');
  if(!canvas || canvas._iniciado) return;
  canvas._iniciado = true;
  const ctx = canvas.getContext('2d');
  const CHARS = 'アイウエオカキクケコ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const FS = 14; let cols, drops;
  function resize() {
    canvas.width  = canvas.offsetWidth  || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    cols  = Math.floor(canvas.width / FS);
    drops = Array.from({length: cols}, () => Math.random() * -100);
  }
  resize(); window.addEventListener('resize', resize);
  setInterval(() => {
    ctx.fillStyle = 'rgba(2,13,26,0.18)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.font = FS + 'px Share Tech Mono,monospace';
    for(let i=0;i<drops.length;i++){
      ctx.fillStyle = Math.random()>0.95 ? '#e0f8ff' : (drops[i]%2===0?'#00d4ff':'#0088aa');
      ctx.globalAlpha = 0.6 + Math.random()*0.4;
      ctx.fillText(CHARS[Math.floor(Math.random()*CHARS.length)], i*FS, drops[i]*FS);
      ctx.globalAlpha = 1;
      if(drops[i]*FS > canvas.height && Math.random()>0.975) drops[i]=0;
      drops[i]+=0.5;
    }
  }, 40);
}
