# ORION — Sistema de Organização Inteligente

Sistema HUD futurista para gestão de ferramentas em armários e gavetas inteligentes.

**Stack:** Firebase Auth + Firestore · ESP32 · Web Speech API · GitHub Pages

---

## Estrutura do projeto

```
orion/
├── index.html          ← shell HTML + imports CSS/JS
├── css/
│   ├── base.css        ← variáveis, reset, layout
│   ├── components.css  ← botões, cards, tabelas, HUD
│   └── panels.css      ← armários, gavetas, voz, ESP32
└── js/
    ├── firebase.js     ← config + helpers Firestore
    ├── utils.js        ← estado global, toast, modal
    ├── auth.js         ← login, logout, Google, registro
    ├── app.js          ← navegação, carregarDados
    ├── home.js         ← dashboard, contadores
    ├── armarios.js     ← CRUD armários/gavetas
    ├── itens.js        ← CRUD itens, filtros
    ├── movimentos.js   ← entradas/saídas
    ├── historico.js    ← relatório de estoque
    ├── lista.js        ← envio ao planejador
    ├── usuarios.js     ← CRUD usuários, planejador
    ├── esp32.js        ← LEDs, travas, pinos
    └── voz.js          ← Web Speech API
```

## Como usar com Claude

Para pedir ajuda a um módulo específico, cole apenas o arquivo relevante:

- Bug no envio WhatsApp → `js/lista.js`
- Alterar tela de login → `index.html` (só 646 linhas)
- Problema com ESP32 → `js/esp32.js`
- Novo campo no usuário → `js/usuarios.js`

## Deploy no GitHub Pages

1. Push na branch `main`
2. Settings → Pages → Source: `main` / `/ (root)`
3. URL: `https://brenotorres44-blip.github.io/orion/`
