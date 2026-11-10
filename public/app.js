const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const storage = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

let game = null;
let profile = storage.get('mm-profile');
let serverOffset = 0;
let timerHandle = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

async function api(path, options = {}) {
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  if (profile?.token) headers.authorization = `Bearer ${profile.token}`;
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'No se pudo completar la operación.');
    error.code = data.code;
    error.data = data;
    throw error;
  }
  return data;
}

function now() { return Date.now() + serverOffset; }
function pad(value) { return String(Math.max(0, value)).padStart(2, '0'); }
function duration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return days ? `${days} d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
function shortDuration(ms) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours} h ${minutes} min` : `${minutes} min`;
}
function dateTime(value) {
  return new Intl.DateTimeFormat('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'Europe/Madrid' }).format(new Date(value));
}
function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 2600);
}

function setProfileUi() {
  $('#profileInitial').textContent = profile?.alias?.charAt(0).toUpperCase() || '?';
  $('#aliasInput').value = profile?.alias || '';
  $('#profileNote').textContent = profile?.team?.name
    ? `Asignación automática: ${profile.team.name}.`
    : profile?.localMode ? 'Modo individual activo. Conecta D1 para activar la asignación automática de brigadas.' : '';
  if ($('#teamPill')) $('#teamPill').textContent = profile?.team?.name || 'Equipo automático · 8 jugadores';
}

function fillSelect(selector, items, valueKey, labelKey) {
  const select = $(selector);
  select.querySelectorAll('option:not(:first-child)').forEach(option => option.remove());
  items.forEach(item => {
    const option = document.createElement('option');
    option.value = typeof item === 'string' ? item : item[valueKey];
    option.textContent = typeof item === 'string' ? item : item[labelKey];
    select.append(option);
  });
}

function renderGame() {
  const mystery = game.case;
  $('#caseCode').textContent = mystery.code;
  $('#district').textContent = mystery.district;
  $('#caseTitle').textContent = mystery.title;
  $('#caseSynopsis').textContent = mystery.synopsis;
  $('#catalogPill').textContent = `${game.rules.catalogSize.toLocaleString('es-ES')} casos`;
  $('#teamPill').textContent = profile?.team?.name || `${game.rules.expectedTeamCount} brigadas · ${game.rules.teamSize} jugadores`;
  $('#victim').textContent = mystery.victim;
  $('#crimeScene').textContent = mystery.crimeScene;
  $('#locationDetail').textContent = `Distrito: ${mystery.district}. Acceso restringido durante la franja investigada.`;
  $('#caseDates').textContent = `${dateTime(game.cycle.startsAt)} → ${dateTime(game.cycle.endsAt)}`;
  $('#clueBadge').textContent = `${game.cycle.unlockedCount}/${game.rules.clueCount}`;
  $('#clueCount').textContent = `${game.cycle.unlockedCount} de ${game.rules.clueCount} disponibles`;

  $('#suspectGrid').innerHTML = mystery.suspects.map((suspect, index) => `
    <article class="suspect-card" data-index="0${index + 1}">
      <span class="profession">${escapeHtml(suspect.profession)}</span>
      <h3>${escapeHtml(suspect.name)}</h3>
      <p>${escapeHtml(suspect.relation)}</p>
      <dl><dt>Coartada</dt><dd>${escapeHtml(suspect.alibi)}</dd><dt>Credencial</dt><dd>Termina en ${escapeHtml(suspect.badgeSuffix)}</dd><dt>Seña personal</dt><dd>${escapeHtml(suspect.signature)}</dd></dl>
    </article>`).join('');

  $('#clueTimeline').innerHTML = mystery.clues.map(clue => `
    <article class="clue ${clue.unlocked ? 'unlocked' : 'locked'}">
      <span class="clue-number">${pad(clue.number)}</span>
      <div><h3>${escapeHtml(clue.title)}</h3><p>${clue.unlocked ? escapeHtml(clue.content) : 'Contenido protegido hasta la hora de desbloqueo.'}</p></div>
      <span class="clue-time">${clue.unlocked ? 'Disponible' : dateTime(clue.unlockAt)}</span>
    </article>`).join('');

  if (game.previousSolution) {
    const previous = game.previousSolution;
    $('#previousSolution').innerHTML = `<span class="kicker">Caso anterior · ${escapeHtml(previous.code)}</span><h3>${escapeHtml(previous.title)}</h3><p>${escapeHtml(previous.solution)}</p>`;
    $('#previousSolution').classList.remove('hidden');
  }

  fillSelect('#accusedSuspect', mystery.suspects, 'id', 'name');
  fillSelect('#accusedMotive', mystery.choices.motives);
  fillSelect('#accusedMethod', mystery.choices.methods);
  fillSelect('#accusedLocation', mystery.choices.locations);
  updateAccusationState();
  updateTimers();
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = setInterval(updateTimers, 1000);
}

function updateTimers() {
  if (!game) return;
  const current = now();
  const start = new Date(game.cycle.startsAt).getTime();
  const end = new Date(game.cycle.endsAt).getTime();
  const remaining = end - current;
  $('#caseTimer').textContent = duration(remaining);
  const elapsedRatio = Math.min(1, Math.max(0, (current - start) / (end - start)));
  $('#caseProgress').style.width = `${elapsedRatio * 100}%`;

  if (game.cycle.nextClueAt) {
    const next = new Date(game.cycle.nextClueAt).getTime() - current;
    $('#nextClueTimer').textContent = next > 0 ? shortDuration(next) : 'Ya disponible';
    $('#nextClueText').textContent = `La siguiente prueba está programada para ${dateTime(game.cycle.nextClueAt)}.`;
    if (next <= 0) refreshGameSilently();
  } else {
    $('#nextClueTimer').textContent = 'Todas publicadas';
    $('#nextClueText').textContent = 'Ya tienes la cadena completa de pruebas.';
  }

  const accusationAt = new Date(game.cycle.accusationOpenAt).getTime();
  $('#accusationTimer').textContent = current < accusationAt ? `Faltan ${shortDuration(accusationAt - current)}` : 'Acusación abierta';
  if (remaining <= 0) refreshGameSilently();
}

function updateAccusationState() {
  const isOpen = game.cycle.accusationOpen || now() >= new Date(game.cycle.accusationOpenAt).getTime();
  const saved = storage.get(`mm-result-${game.cycle.number}`);
  $('#accusationLocked').classList.toggle('hidden', isOpen);
  $('#accusationForm').classList.toggle('hidden', !isOpen || Boolean(saved));
  if (saved) renderResult(saved);
}

function renderResult(data) {
  const card = $('#accusationResult');
  const result = data.result;
  const answer = data.solution.answer;
  card.innerHTML = `
    <span class="kicker">Resultado registrado</span>
    <div class="score">${result.total} pts</div>
    <h3>${result.isCorrect ? 'Caso resuelto' : 'Teoría incompleta'}</h3>
    <ul><li>Persona: ${result.checks.suspect ? 'correcta' : 'incorrecta'}</li><li>Motivo: ${result.checks.motive ? 'correcto' : 'incorrecto'}</li><li>Método: ${result.checks.method ? 'correcto' : 'incorrecto'}</li><li>Lugar: ${result.checks.location ? 'correcto' : 'incorrecto'}</li></ul>
    <p><b>Solución:</b> ${escapeHtml(data.solution.explanation)}</p>
    <p><b>Responsable:</b> ${escapeHtml(answer.suspectName)} · <b>Motivo:</b> ${escapeHtml(answer.motive)}</p>`;
  card.classList.remove('hidden');
}

async function loadRanking() {
  const rows = $('#rankingRows');
  rows.innerHTML = '<div class="empty-row">Actualizando…</div>';
  try {
    const data = await api('/api/ranking');
    $('#rankingMode').textContent = data.localMode ? 'El juego funciona en modo individual. Activa D1 y aplica la migración para compartir el ranking.' : 'Ranking compartido del expediente actual.';
    rows.innerHTML = data.ranking.length ? data.ranking.map((entry, index) => `
      <div class="ranking-row"><span>${index + 1}</span><span>${escapeHtml(entry.alias)}</span><span>${escapeHtml(entry.teamName || 'Individual')}</span><span class="points">${entry.score}</span></div>`).join('') : '<div class="empty-row">Todavía no hay acusaciones registradas.</div>';
  } catch (error) {
    rows.innerHTML = `<div class="empty-row">${escapeHtml(error.message)}</div>`;
  }
}

async function loadGame() {
  $('#loadingView').classList.remove('hidden');
  $('#errorView').classList.add('hidden');
  $('#gameView').classList.add('hidden');
  try {
    game = await api('/api/game');
    serverOffset = new Date(game.serverNow).getTime() - Date.now();
    renderGame();
    $('#loadingView').classList.add('hidden');
    $('#gameView').classList.remove('hidden');
    if (!profile) setTimeout(() => $('#profileDialog').showModal(), 350);
  } catch (error) {
    $('#loadingView').classList.add('hidden');
    $('#errorMessage').textContent = error.message;
    $('#errorView').classList.remove('hidden');
  }
}

let refreshing = false;
async function refreshGameSilently() {
  if (refreshing) return;
  refreshing = true;
  try {
    const next = await api('/api/game');
    if (!game || next.cycle.number !== game.cycle.number || next.cycle.unlockedCount !== game.cycle.unlockedCount) {
      game = next;
      serverOffset = new Date(game.serverNow).getTime() - Date.now();
      renderGame();
      toast('El expediente se ha actualizado.');
    }
  } finally { refreshing = false; }
}

$$('.tab').forEach(button => button.addEventListener('click', () => {
  $$('.tab').forEach(item => item.classList.toggle('active', item === button));
  $$('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === button.dataset.tab));
  if (button.dataset.tab === 'ranking') loadRanking();
}));

$('#profileButton').addEventListener('click', () => { setProfileUi(); $('#profileDialog').showModal(); });
$('#closeProfile').addEventListener('click', () => $('#profileDialog').close());
$('#retryButton').addEventListener('click', loadGame);
$('#refreshRanking').addEventListener('click', loadRanking);

$('#profileForm').addEventListener('submit', async event => {
  event.preventDefault();
  const alias = $('#aliasInput').value.trim();
  try {
    const data = await api('/api/players', { method:'POST', body:JSON.stringify({ alias }) });
    profile = { ...data.player, team:data.team || null, localMode:data.localMode };
  } catch {
    profile = { id:crypto.randomUUID(), token:crypto.randomUUID(), alias, localMode:true };
  }
  storage.set('mm-profile', profile);
  setProfileUi();
  $('#profileDialog').close();
  toast(`Bienvenido, ${profile.alias}.`);
});

$('#accusationForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!profile) { $('#profileDialog').showModal(); return; }
  const button = event.submitter;
  button.disabled = true;
  button.textContent = 'Registrando…';
  try {
    const payload = {
      suspectId:$('#accusedSuspect').value,
      motive:$('#accusedMotive').value,
      method:$('#accusedMethod').value,
      location:$('#accusedLocation').value
    };
    const data = await api('/api/accusations', { method:'POST', body:JSON.stringify(payload) });
    storage.set(`mm-result-${game.cycle.number}`, data);
    $('#accusationForm').classList.add('hidden');
    renderResult(data);
    toast(data.message);
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; button.textContent = 'Registrar acusación'; }
});

setProfileUi();
loadGame();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
