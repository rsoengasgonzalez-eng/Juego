const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const tokenKey = 'madrid_mystery_token';
let state = null;
let activeTab = 'expediente';
let timerId;

const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const token = () => localStorage.getItem(tokenKey);

async function api(path, options = {}) {
  const headers = { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) };
  if (token()) headers.authorization = `Bearer ${token()}`;
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({ error: 'Respuesta no válida del servidor.' }));
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(notify.timeout);
  notify.timeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

function formatDate(iso, withDay = false) {
  return new Intl.DateTimeFormat('es-ES', { ...(withDay ? { weekday: 'short', day: '2-digit', month: 'short' } : {}), hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function countdownText(endIso) {
  const diff = Math.max(0, new Date(endIso).getTime() - Date.now());
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${days ? `${days}d ` : ''}${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

function startTimer() {
  clearInterval(timerId);
  const tick = () => {
    const node = document.querySelector('[data-countdown]');
    if (node && state) node.textContent = countdownText(state.cycle.endsAt);
  };
  tick();
  timerId = setInterval(tick, 30000);
}

function hero() {
  const item = state.case;
  return `
    <section class="hero panel">
      <div class="hero-copy">
        <p class="eyebrow">CASO ${state.cycle.number} · ${esc(item.location)}</p>
        <h1>${esc(item.title)}</h1>
        <p class="hero-subtitle">${esc(item.subtitle)}</p>
        <div class="case-meta">
          <span class="meta-chip">Víctima: ${esc(item.victim)}</span>
          <span class="meta-chip">${item.suspects.length} sospechosos</span>
          <span class="meta-chip">Caso de 72 horas</span>
        </div>
      </div>
      <div class="hero-art" aria-hidden="true">${item.cover}</div>
    </section>
    <section class="mission-bar">
      <div>
        <p class="eyebrow">TIEMPO PARA CERRAR EL CASO</p>
        <div class="countdown"><strong data-countdown>--h --m</strong><span>restantes</span></div>
      </div>
      <button class="button whatsapp" data-share>Compartir en WhatsApp</button>
    </section>`;
}

function authGate() {
  const fragment = document.querySelector('#authTemplate').content.cloneNode(true);
  app.replaceChildren(fragment);
  document.querySelector('#aliasForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    try {
      const data = await api('/api/session', { method: 'POST', body: JSON.stringify({ alias: new FormData(event.currentTarget).get('alias') }) });
      localStorage.setItem(tokenKey, data.token);
      await load();
    } catch (error) {
      notify(error.message);
      button.disabled = false;
    }
  });
}

function teamGate() {
  return `
    <section class="team-gate panel">
      <p class="eyebrow">HOLA, ${esc(state.player.alias).toUpperCase()}</p>
      <div class="section-head"><div><h2>Reúne a tu equipo</h2><p>De 2 a 8 detectives. Podéis investigar en momentos distintos.</p></div></div>
      <div class="choice-grid">
        <div class="choice"><h3>Crear equipo</h3><p>Generaremos un código para que lo compartas en WhatsApp.</p>
          <form id="createTeamForm" class="stack-form"><label>Nombre del equipo<input name="name" maxlength="30" placeholder="Los Sabuesos" required /></label><button class="button primary">Crear equipo</button></form>
        </div>
        <div class="choice"><h3>Unirme</h3><p>Introduce el código de seis caracteres que te han enviado.</p>
          <form id="joinTeamForm" class="stack-form"><label>Código<input name="code" maxlength="6" autocomplete="off" placeholder="M4DR1D" required /></label><button class="button secondary">Unirme al equipo</button></form>
        </div>
      </div>
    </section>`;
}

function teamCard() {
  if (!state.team) return '';
  return `<section class="team-card panel">
    <div class="team-top"><div><p class="eyebrow">TU EQUIPO</p><h3>${esc(state.team.name)}</h3><span>${state.team.members.length}/${state.team.maxSize} detectives</span></div><button class="button secondary" data-copy-code><span class="team-code">${esc(state.team.joinCode)}</span><br><small>Copiar código</small></button></div>
    <div class="member-list">${state.team.members.map((member) => `<span class="member">${esc(member.alias)}</span>`).join('')}</div>
  </section>`;
}

function expediente() {
  return `<div class="section-head"><div><h2>Expediente</h2><p>${esc(state.case.synopsis)}</p></div></div>
    <div class="phase-list">${state.case.phases.map((phase) => phase.locked ? lockedPhase(phase) : openPhase(phase)).join('')}</div>`;
}

function lockedPhase(phase) {
  const unlock = new Date(new Date(state.cycle.startsAt).getTime() + phase.availableAfterHours * 3600000).toISOString();
  return `<section class="phase panel"><div class="phase-head"><div><span class="phase-kicker">${esc(phase.kicker)}</span><h3>${esc(phase.title)}</h3></div><span class="lock">🔒 ${formatDate(unlock, true)}</span></div><div class="locked-phase">Las pruebas de esta fase aún están bajo custodia.</div></section>`;
}

function openPhase(phase) {
  return `<section class="phase panel"><div class="phase-head"><div><span class="phase-kicker">${esc(phase.kicker)}</span><h3>${esc(phase.title)}</h3></div><span class="lock">Desbloqueado</span></div><div class="clue-grid">${phase.clues.map(clueCard).join('')}</div></section>`;
}

function clueCard(clue) {
  return `<article class="clue"><div class="clue-top"><span class="clue-icon">${clue.icon}</span><span class="clue-kind">${esc(clue.kind)}</span></div><h4>${esc(clue.title)}</h4><p>${esc(clue.body)}</p>
    ${clue.hintUsed ? `<div class="hint-box"><strong>Pista usada</strong><br>${esc(clue.hintText)}</div>` : `<button class="button ghost" data-hint="${esc(clue.id)}">Usar pista · −50 pts</button>`}
  </article>`;
}

function suspects() {
  return `<div class="section-head"><div><h2>Sospechosos</h2><p>Contrasta cada coartada con las pruebas del expediente.</p></div></div><div class="suspect-grid">${state.case.suspects.map((person) => `<article class="suspect panel"><span class="avatar">${esc(person.avatar)}</span><div><h3>${esc(person.name)}</h3><span class="role">${esc(person.role)}</span></div><p class="alibi">“${esc(person.alibi)}”</p></article>`).join('')}</div>`;
}

function accusation() {
  if (state.submission) return `<section class="accusation submitted panel"><p class="eyebrow">ACUSACIÓN REGISTRADA</p><h2>El expediente está cerrado para vuestro equipo</h2><div class="big-score">${state.submission.score} pts</div><p>La solución completa se publicará cuando termine el ciclo. Mientras tanto, vuestro resultado ya figura en la clasificación.</p></section>`;
  if (!state.case.accusationOpen) {
    const openAt = new Date(new Date(state.cycle.startsAt).getTime() + state.case.accusationAfterHours * 3600000).toISOString();
    return `<section class="closed panel"><div class="closed-icon">🔐</div><h2>La acusación final aún está cerrada</h2><p>Se abrirá el ${formatDate(openAt, true)}. Revisad las pruebas y acordad una teoría.</p></section>`;
  }
  const clues = state.case.availableClues;
  return `<section class="accusation panel"><p class="eyebrow">DECISIÓN DE EQUIPO · NO SE PUEDE CAMBIAR</p><h2>Presentar acusación</h2><form id="accusationForm" class="stack-form">
    <div class="accusation-grid"><label>¿Quién fue?<select name="suspectId" required><option value="">Selecciona…</option>${state.case.suspects.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label>
    <label>¿Cómo lo hizo?<select name="methodId" required><option value="">Selecciona…</option>${state.case.methods.map((x) => `<option value="${x.id}">${esc(x.label)}</option>`).join('')}</select></label></div>
    <label>¿Por qué?<select name="motiveId" required><option value="">Selecciona…</option>${state.case.motives.map((x) => `<option value="${x.id}">${esc(x.label)}</option>`).join('')}</select></label>
    <div><span class="field-label">Pruebas clave (máximo 3)</span><div class="evidence-options">${clues.map((x) => `<label class="check-card"><input type="checkbox" name="evidenceIds" value="${x.id}" /><span><strong>${esc(x.title)}</strong><br>${esc(x.kind)}</span></label>`).join('')}</div></div>
    <label>Vuestra reconstrucción<textarea name="reasoning" maxlength="600" placeholder="Explicad brevemente cómo encajan las pruebas…"></textarea></label>
    <button class="button primary" type="submit">Cerrar el caso y enviar</button>
  </form></section>`;
}

function rankingRows(rows) {
  if (!rows?.length) return '<div class="empty">Todavía no hay equipos clasificados.</div>';
  return rows.map((row, index) => `<div class="rank-row"><span class="rank-number">#${index + 1}</span><span class="rank-name"><strong>${esc(row.name)}</strong><small>${row.members} detectives</small></span><span class="rank-score">${row.score} pts</span></div>`).join('');
}

function ranking() {
  return `<div class="section-head"><div><h2>Clasificación</h2><p>Desempate por hora de entrega. Las pistas usadas restan 50 puntos.</p></div></div><section class="ranking panel">${rankingRows(state.leaderboard)}</section>${previousCase()}`;
}

function previousCase() {
  if (!state.previous) return '';
  const item = state.previous;
  return `<details class="previous panel"><summary>Solución del caso anterior: ${esc(item.title)}</summary><div class="solution"><p><strong>Culpable:</strong> ${esc(item.solution.culprit)}</p><p><strong>Método:</strong> ${esc(item.solution.method)}</p><p><strong>Motivo:</strong> ${esc(item.solution.motive)}</p><p>${esc(item.solution.reveal)}</p><h3>Podio</h3><div class="ranking">${rankingRows(item.leaderboard)}</div></div></details>`;
}

function tabContent() {
  return { expediente, sospechosos: suspects, acusacion: accusation, ranking }[activeTab]();
}

function gameShell() {
  return `${hero()}${!state.team ? teamGate() : `${teamCard()}<div class="dashboard"><nav class="sidebar panel" aria-label="Secciones">
    ${[['expediente','Expediente'],['sospechosos','Sospechosos'],['acusacion','Acusación'],['ranking','Ranking']].map(([id,label]) => `<button class="tab-button ${activeTab === id ? 'active' : ''}" data-tab="${id}"><span class="dot"></span>${label}</button>`).join('')}
    </nav><section class="content">${tabContent()}</section></div>`}`;
}

function bind() {
  document.querySelectorAll('[data-share]').forEach((node) => node.addEventListener('click', share));
  document.querySelectorAll('[data-tab]').forEach((node) => node.addEventListener('click', () => { activeTab = node.dataset.tab; render(); }));
  document.querySelector('[data-copy-code]')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(state.team.joinCode);
    notify('Código de equipo copiado.');
  });
  document.querySelectorAll('[data-hint]').forEach((node) => node.addEventListener('click', async () => {
    if (!confirm('Esta pista restará 50 puntos al equipo. ¿Continuar?')) return;
    try { await api('/api/hints', { method: 'POST', body: JSON.stringify({ clueId: node.dataset.hint }) }); await load(false); notify('Pista desbloqueada.'); } catch (error) { notify(error.message); }
  }));
  document.querySelector('#createTeamForm')?.addEventListener('submit', handleTeamCreate);
  document.querySelector('#joinTeamForm')?.addEventListener('submit', handleTeamJoin);
  document.querySelector('#accusationForm')?.addEventListener('submit', handleAccusation);
  document.querySelectorAll('input[name="evidenceIds"]').forEach((box) => box.addEventListener('change', () => {
    const checked = [...document.querySelectorAll('input[name="evidenceIds"]:checked')];
    if (checked.length > 3) { box.checked = false; notify('Puedes seleccionar un máximo de tres pruebas.'); }
  }));
}

async function handleTeamCreate(event) {
  event.preventDefault();
  try { await api('/api/teams', { method: 'POST', body: JSON.stringify({ name: new FormData(event.currentTarget).get('name') }) }); await load(false); notify('Equipo creado. Comparte el código.'); } catch (error) { notify(error.message); }
}
async function handleTeamJoin(event) {
  event.preventDefault();
  try { await api('/api/teams/join', { method: 'POST', body: JSON.stringify({ code: new FormData(event.currentTarget).get('code') }) }); await load(false); notify('Ya formas parte del equipo.'); } catch (error) { notify(error.message); }
}
async function handleAccusation(event) {
  event.preventDefault();
  if (!confirm('La acusación no se podrá modificar. ¿La enviamos?')) return;
  const form = new FormData(event.currentTarget);
  const payload = { suspectId: form.get('suspectId'), methodId: form.get('methodId'), motiveId: form.get('motiveId'), evidenceIds: form.getAll('evidenceIds'), reasoning: form.get('reasoning') };
  try { await api('/api/accusations', { method: 'POST', body: JSON.stringify(payload) }); await load(false); notify('Acusación registrada.'); } catch (error) { notify(error.message); }
}

function share() {
  const text = `🔎 NUEVO CASO: ${state?.case?.title || 'Madrid Mystery'}\nTenemos 72 horas para resolverlo. Entra aquí: ${location.href}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

document.querySelector('#shareButton').addEventListener('click', share);

function render() {
  if (!state.player) return authGate();
  app.innerHTML = gameShell();
  bind();
  startTimer();
}

async function load(showLoader = true) {
  if (showLoader) app.innerHTML = '<section class="loading-card"><div class="spinner"></div><p>Abriendo el expediente…</p></section>';
  try {
    state = await api('/api/status');
    render();
  } catch (error) {
    app.innerHTML = `<section class="error-card panel"><h2>No hemos podido abrir el expediente</h2><p>${esc(error.message)}</p><button class="button primary" id="retry">Reintentar</button></section>`;
    document.querySelector('#retry').addEventListener('click', () => load());
  }
}

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
load();
