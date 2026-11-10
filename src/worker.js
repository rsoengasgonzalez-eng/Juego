import {
  buildCase,
  getCycleState,
  getPublicGame,
  scoreAccusation
} from './game-engine.js';
import {
  DEFAULT_EXPECTED_PLAYERS,
  DEFAULT_TEAM_SIZE,
  automaticTeamDefinitions,
  chooseBalancedTeam
} from './team-engine.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff'
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
}

function config(env) {
  return {
    cycleStart: env.CASE_CYCLE_START,
    catalogSize: env.CATALOG_SIZE
  };
}

async function bodyOf(request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, 'El cuerpo de la petición no es JSON válido.', 'INVALID_JSON');
  }
}

class ApiError extends Error {
  constructor(status, message, code = 'REQUEST_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function cleanText(value, min, max, label) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length < min || text.length > max) throw new ApiError(400, `${label} debe tener entre ${min} y ${max} caracteres.`, 'INVALID_FIELD');
  return text;
}

function tokenFrom(request, body = {}) {
  const authorization = request.headers.get('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : String(body.token || '').trim();
}

async function getPlayer(env, token) {
  if (!env.DB || !token) return null;
  return env.DB.prepare('SELECT id, alias FROM players WHERE token = ?').bind(token).first();
}

async function getMembership(env, playerId) {
  if (!env.DB || !playerId) return null;
  return env.DB.prepare(`
    SELECT t.id, t.name, t.invite_code AS inviteCode
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.player_id = ?
  `).bind(playerId).first();
}

async function ensureAutomaticTeams(env, ownerPlayerId, expectedPlayers, teamSize) {
  const createdAt = new Date().toISOString();
  const definitions = automaticTeamDefinitions(expectedPlayers, teamSize);
  await env.DB.batch(definitions.map(team => env.DB.prepare(`
    INSERT OR IGNORE INTO teams (id, name, invite_code, owner_player_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(team.id, team.name, team.inviteCode, ownerPlayerId, createdAt)));
  return definitions;
}

async function automaticTeamRows(env) {
  const rows = await env.DB.prepare(`
    SELECT t.id, t.name, t.invite_code AS inviteCode, COUNT(tm.player_id) AS memberCount
    FROM teams t
    LEFT JOIN team_members tm ON tm.team_id = t.id
    WHERE t.id LIKE 'auto-team-%'
    GROUP BY t.id, t.name, t.invite_code
    ORDER BY t.id ASC
  `).all();
  return rows.results || [];
}

async function autoAssignTeam(env, playerId) {
  const current = await getMembership(env, playerId);
  if (current) return current;
  const teamSize = Math.max(2, Number(env.AUTO_TEAM_SIZE) || DEFAULT_TEAM_SIZE);
  const expectedPlayers = Math.max(teamSize, Number(env.EXPECTED_PLAYERS) || DEFAULT_EXPECTED_PLAYERS);
  await ensureAutomaticTeams(env, playerId, expectedPlayers, teamSize);

  // The conditional INSERT enforces capacity at write time. Even if several
  // players arrive together, D1 serializes the writes and no team exceeds 8.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const teams = await automaticTeamRows(env);
    const candidate = chooseBalancedTeam(teams, teamSize);
    if (!candidate) break;
    await env.DB.prepare(`
      INSERT OR IGNORE INTO team_members (team_id, player_id, joined_at)
      SELECT ?, ?, ?
      WHERE (SELECT COUNT(*) FROM team_members WHERE team_id = ?) < ?
    `).bind(candidate.id, playerId, new Date().toISOString(), candidate.id, teamSize).run();
    const assigned = await getMembership(env, playerId);
    if (assigned) return assigned;
  }

  // More than the expected 80 players: open a new overflow brigade rather
  // than overfilling an existing group.
  const teams = await automaticTeamRows(env);
  const nextSlot = teams.length + 1;
  const suffix = String(nextSlot).padStart(2, '0');
  const overflow = { id: `auto-team-${suffix}`, name: `Brigada ${suffix}`, inviteCode: `AUTO${suffix}` };
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO teams (id, name, invite_code, owner_player_id, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(overflow.id, overflow.name, overflow.inviteCode, playerId, now),
    env.DB.prepare(`
      INSERT OR IGNORE INTO team_members (team_id, player_id, joined_at)
      SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM team_members WHERE team_id = ?) < ?
    `).bind(overflow.id, playerId, now, overflow.id, teamSize)
  ]);
  return getMembership(env, playerId);
}

function inviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map(value => alphabet[value % alphabet.length]).join('');
}

async function createPlayer(request, env) {
  const body = await bodyOf(request);
  const alias = cleanText(body.alias, 2, 24, 'El alias');
  const id = crypto.randomUUID();
  const token = crypto.randomUUID();
  const now = new Date().toISOString();
  if (!env.DB) return json({ player: { id, alias, token }, localMode: true, warning: 'D1 no está conectada; puedes jugar en modo individual.' }, 201);
  try {
    await env.DB.prepare('INSERT INTO players (id, token, alias, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, token, alias, now, now).run();
    const team = await autoAssignTeam(env, id);
    return json({ player: { id, alias, token }, team, localMode: false, assignment: 'automatic-balanced' }, 201);
  } catch (error) {
    console.error('createPlayer', error);
    return json({ player: { id, alias, token }, localMode: true, warning: 'D1 todavía no tiene el esquema. El juego continúa en modo individual.' }, 201);
  }
}

async function createTeam(request, env) {
  if (!env.DB) throw new ApiError(503, 'Conecta D1 para crear equipos.', 'DB_DISABLED');
  const body = await bodyOf(request);
  const token = tokenFrom(request, body);
  const player = await getPlayer(env, token);
  if (!player) throw new ApiError(401, 'Vuelve a registrar tu alias.', 'UNAUTHORIZED');
  if (await getMembership(env, player.id)) throw new ApiError(409, 'Ya perteneces a un equipo.', 'ALREADY_IN_TEAM');
  const name = cleanText(body.name, 2, 32, 'El nombre del equipo');
  const teamId = crypto.randomUUID();
  const now = new Date().toISOString();
  let code = inviteCode();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO teams (id, name, invite_code, owner_player_id, created_at) VALUES (?, ?, ?, ?, ?)').bind(teamId, name, code, player.id, now),
        env.DB.prepare('INSERT INTO team_members (team_id, player_id, joined_at) VALUES (?, ?, ?)').bind(teamId, player.id, now)
      ]);
      return json({ team: { id: teamId, name, inviteCode: code } }, 201);
    } catch (error) {
      if (String(error).includes('UNIQUE') && attempt < 3) { code = inviteCode(); continue; }
      throw error;
    }
  }
  throw new ApiError(500, 'No se pudo crear el equipo.', 'TEAM_CREATE_FAILED');
}

async function joinTeam(request, env) {
  if (!env.DB) throw new ApiError(503, 'Conecta D1 para unirte a equipos.', 'DB_DISABLED');
  const body = await bodyOf(request);
  const token = tokenFrom(request, body);
  const player = await getPlayer(env, token);
  if (!player) throw new ApiError(401, 'Vuelve a registrar tu alias.', 'UNAUTHORIZED');
  if (await getMembership(env, player.id)) throw new ApiError(409, 'Ya perteneces a un equipo.', 'ALREADY_IN_TEAM');
  const code = cleanText(body.inviteCode, 6, 6, 'El código').toUpperCase();
  const team = await env.DB.prepare('SELECT id, name, invite_code AS inviteCode FROM teams WHERE invite_code = ?').bind(code).first();
  if (!team) throw new ApiError(404, 'No existe un equipo con ese código.', 'TEAM_NOT_FOUND');
  await env.DB.prepare('INSERT INTO team_members (team_id, player_id, joined_at) VALUES (?, ?, ?)')
    .bind(team.id, player.id, new Date().toISOString()).run();
  return json({ team });
}

async function profile(request, env) {
  const token = tokenFrom(request);
  const player = await getPlayer(env, token);
  if (!player) return json({ player: null, team: null, localMode: !env.DB });
  const team = await getMembership(env, player.id);
  return json({ player, team, localMode: false });
}

async function submitAccusation(request, env) {
  const body = await bodyOf(request);
  const now = Date.now();
  const cycle = getCycleState(now, env.CASE_CYCLE_START, env.CATALOG_SIZE);
  if (!cycle.started) throw new ApiError(403, 'El expediente aún no ha comenzado.', 'CASE_NOT_STARTED');
  if (!cycle.accusationOpen) {
    return json({ error: 'La acusación se abrirá con la pista 15.', code: 'ACCUSATION_LOCKED', opensAt: new Date(cycle.accusationOpenMs).toISOString() }, 403);
  }
  const mystery = buildCase(cycle.caseIndex);
  const accusation = {
    suspectId: cleanText(body.suspectId, 3, 80, 'La persona sospechosa'),
    motive: cleanText(body.motive, 3, 120, 'El motivo'),
    method: cleanText(body.method, 3, 120, 'El método'),
    location: cleanText(body.location, 3, 160, 'El lugar')
  };
  const result = scoreAccusation(mystery, accusation, cycle.elapsedHours);
  const token = tokenFrom(request, body);
  let persisted = false;
  let team = null;
  let player = null;

  if (env.DB) {
    player = await getPlayer(env, token);
    if (!player) throw new ApiError(401, 'Vuelve a registrar tu alias antes de acusar.', 'UNAUTHORIZED');
    team = await getMembership(env, player.id);
    try {
      await env.DB.prepare(`
        INSERT INTO accusations
          (id, cycle_number, case_index, player_id, team_id, suspect_id, motive, method, location, score, is_correct, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), cycle.cycleNumber, cycle.caseIndex, player.id, team?.id || null,
        accusation.suspectId, accusation.motive, accusation.method, accusation.location,
        result.total, result.isCorrect ? 1 : 0, new Date(now).toISOString()
      ).run();
      persisted = true;
    } catch (error) {
      if (String(error).includes('UNIQUE')) throw new ApiError(409, 'Ya presentaste una acusación para este expediente.', 'ALREADY_SUBMITTED');
      throw error;
    }
  }

  return json({
    result,
    persisted,
    solution: { answer: mystery.answer, explanation: mystery.solution },
    message: persisted ? 'Acusación registrada.' : 'Resultado calculado en modo individual; conecta D1 para guardarlo en el ranking.'
  }, 201);
}

async function ranking(env) {
  if (!env.DB) return json({ ranking: [], localMode: true });
  const cycle = getCycleState(Date.now(), env.CASE_CYCLE_START, env.CATALOG_SIZE);
  try {
    const rows = await env.DB.prepare(`
      SELECT p.alias, t.name AS teamName, a.score, a.is_correct AS isCorrect, a.submitted_at AS submittedAt
      FROM accusations a
      JOIN players p ON p.id = a.player_id
      LEFT JOIN teams t ON t.id = a.team_id
      WHERE a.cycle_number = ?
      ORDER BY a.score DESC, a.submitted_at ASC
      LIMIT 100
    `).bind(cycle.cycleNumber).all();
    return json({ ranking: rows.results || [], localMode: false });
  } catch (error) {
    console.error('ranking', error);
    return json({ ranking: [], localMode: true, warning: 'Aplica la migración D1 para activar el ranking.' });
  }
}

async function health(env) {
  if (!env.DB) return json({ ok: true, game: 'ready', database: 'not-configured', mode: 'solo' });
  try {
    const table = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='players'").first();
    return json({ ok: Boolean(table), game: 'ready', database: table ? 'ready' : 'migration-required', mode: table ? 'shared' : 'solo' }, table ? 200 : 503);
  } catch {
    return json({ ok: false, game: 'ready', database: 'unavailable', mode: 'solo' }, 503);
  }
}

async function api(request, env, pathname) {
  if (request.method === 'GET' && pathname === '/api/game') {
    const payload = getPublicGame(Date.now(), config(env));
    payload.rules.automaticTeams = true;
    payload.rules.expectedPlayers = Math.max(2, Number(env.EXPECTED_PLAYERS) || DEFAULT_EXPECTED_PLAYERS);
    payload.rules.teamSize = Math.max(2, Number(env.AUTO_TEAM_SIZE) || DEFAULT_TEAM_SIZE);
    payload.rules.expectedTeamCount = Math.ceil(payload.rules.expectedPlayers / payload.rules.teamSize);
    return json(payload);
  }
  if (request.method === 'GET' && pathname === '/api/health') return health(env);
  if (request.method === 'GET' && pathname === '/api/profile') return profile(request, env);
  if (request.method === 'GET' && pathname === '/api/ranking') return ranking(env);
  if (request.method === 'POST' && pathname === '/api/players') return createPlayer(request, env);
  if (request.method === 'POST' && pathname === '/api/teams') return createTeam(request, env);
  if (request.method === 'POST' && pathname === '/api/teams/join') return joinTeam(request, env);
  if (request.method === 'POST' && pathname === '/api/accusations') return submitAccusation(request, env);
  return json({ error: 'Ruta no encontrada.', code: 'NOT_FOUND' }, 404);
}

function secure(response) {
  const wrapped = new Response(response.body, response);
  wrapped.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  wrapped.headers.set('x-frame-options', 'DENY');
  wrapped.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  return wrapped;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return secure(await api(request, env, url.pathname));
      if (!env.ASSETS) return new Response('Madrid Mystery: ASSETS binding no configurado.', { status: 503 });
      return secure(await env.ASSETS.fetch(request));
    } catch (error) {
      if (error instanceof ApiError) return secure(json({ error: error.message, code: error.code }, error.status));
      console.error('Unhandled error', error);
      return secure(json({ error: 'Ha ocurrido un error inesperado.', code: 'INTERNAL_ERROR' }, 500));
    }
  }
};
