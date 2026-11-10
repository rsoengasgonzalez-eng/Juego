import { CASES } from './cases.js';
import { getCycleState, visibleCase, scoreSubmission, nextUnlock } from './game.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function fail(message, status = 400, code = 'BAD_REQUEST') {
  return json({ ok: false, error: message, code }, status);
}

function cleanText(value, max = 80) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

async function bodyJson(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('El cuerpo debe enviarse como JSON.');
  return request.json();
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function createToken() {
  const random = crypto.getRandomValues(new Uint8Array(24));
  const encoded = btoa(String.fromCharCode(...random)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `mm_${encoded}`;
}

function createJoinCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('');
}

function config(env) {
  return {
    start: env.CASE_CYCLE_START || '2026-11-10T09:00:00+01:00',
    duration: Number(env.CASE_DURATION_HOURS || 72),
    maxTeamSize: Number(env.MAX_TEAM_SIZE || 8)
  };
}

async function authenticate(request, env) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const tokenHash = await sha256(token);
  const player = await env.DB.prepare(
    `SELECT p.id, p.alias, p.team_id, t.name AS team_name, t.join_code
     FROM players p LEFT JOIN teams t ON t.id = p.team_id
     WHERE p.token_hash = ?`
  ).bind(tokenHash).first();
  if (player) {
    await env.DB.prepare("UPDATE players SET last_seen = datetime('now') WHERE id = ?").bind(player.id).run();
  }
  return player || null;
}

function findClue(caseData, clueId) {
  for (const phase of caseData.phases) {
    const clue = phase.clues.find((item) => item.id === clueId);
    if (clue) return { clue, phase };
  }
  return null;
}

function solutionView(caseData) {
  const solution = caseData.solution;
  return {
    culprit: caseData.suspects.find((item) => item.id === solution.suspectId)?.name,
    method: caseData.methods.find((item) => item.id === solution.methodId)?.label,
    motive: caseData.motives.find((item) => item.id === solution.motiveId)?.label,
    reveal: solution.reveal
  };
}

async function leaderboard(env, cycleKey, limit = 20) {
  const result = await env.DB.prepare(
    `SELECT t.name, s.score, s.submitted_at,
      (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id) AS members
     FROM submissions s JOIN teams t ON t.id = s.team_id
     WHERE s.cycle_key = ?
     ORDER BY s.score DESC, s.submitted_at ASC LIMIT ?`
  ).bind(cycleKey, limit).all();
  return result.results || [];
}

async function statusResponse(request, env) {
  const cfg = config(env);
  const now = new Date();
  const cycle = getCycleState(now, cfg.start, cfg.duration);
  const player = await authenticate(request, env);
  const safeCase = visibleCase(cycle.case, cycle.elapsedHours);
  let team = null;
  let usedHints = [];
  let submission = null;

  if (player?.team_id) {
    const members = await env.DB.prepare(
      'SELECT id, alias FROM players WHERE team_id = ? ORDER BY created_at ASC'
    ).bind(player.team_id).all();
    const hintRows = await env.DB.prepare(
      'SELECT clue_id FROM hints WHERE team_id = ? AND cycle_key = ?'
    ).bind(player.team_id, cycle.key).all();
    usedHints = (hintRows.results || []).map((row) => row.clue_id);
    submission = await env.DB.prepare(
      'SELECT suspect_id, method_id, motive_id, evidence_ids, reasoning, score, submitted_at FROM submissions WHERE team_id = ? AND cycle_key = ?'
    ).bind(player.team_id, cycle.key).first();
    team = {
      id: player.team_id,
      name: player.team_name,
      joinCode: player.join_code,
      members: members.results || [],
      maxSize: cfg.maxTeamSize
    };
  }

  for (const phase of safeCase.phases) {
    for (const clue of phase.clues) {
      if (usedHints.includes(clue.id)) {
        const source = findClue(cycle.case, clue.id)?.clue;
        clue.hintUsed = true;
        clue.hintText = source?.hint;
      }
    }
  }

  let previous = null;
  if (cycle.slot > 0) {
    const previousSlot = cycle.slot - 1;
    const previousCase = CASES[previousSlot % CASES.length];
    const previousKey = `cycle-${previousSlot}`;
    previous = {
      title: previousCase.title,
      solution: solutionView(previousCase),
      leaderboard: await leaderboard(env, previousKey, 3)
    };
  }

  return json({
    ok: true,
    appName: env.APP_NAME || 'Madrid Mystery',
    serverTime: now.toISOString(),
    cycle: {
      key: cycle.key,
      number: cycle.slot + 1,
      startsAt: cycle.startsAt,
      endsAt: cycle.endsAt,
      nextUnlock: nextUnlock(cycle.case, cycle.elapsedHours, cycle.startsAt),
      hasStarted: cycle.hasStarted
    },
    case: safeCase,
    player: player ? { id: player.id, alias: player.alias } : null,
    team,
    usedHints,
    submission: submission ? { ...submission, evidenceIds: JSON.parse(submission.evidence_ids || '[]') } : null,
    leaderboard: await leaderboard(env, cycle.key),
    previous
  });
}

async function createSession(request, env) {
  const data = await bodyJson(request);
  const alias = cleanText(data.alias, 24);
  if (alias.length < 2) return fail('El alias debe tener entre 2 y 24 caracteres.');
  const token = createToken();
  const tokenHash = await sha256(token);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO players (id, alias, token_hash, created_at, last_seen) VALUES (?, ?, ?, datetime('now'), datetime('now'))"
  ).bind(id, alias, tokenHash).run();
  return json({ ok: true, token, player: { id, alias } }, 201);
}

async function createTeam(request, env, player) {
  const data = await bodyJson(request);
  const name = cleanText(data.name, 30);
  if (name.length < 2) return fail('El nombre del equipo debe tener entre 2 y 30 caracteres.');
  if (player.team_id) return fail('Ya perteneces a un equipo.', 409, 'ALREADY_IN_TEAM');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = crypto.randomUUID();
    const code = createJoinCode();
    try {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO teams (id, name, join_code, created_by, created_at) VALUES (?, ?, ?, ?, datetime('now'))").bind(id, name, code, player.id),
        env.DB.prepare('UPDATE players SET team_id = ? WHERE id = ?').bind(id, player.id)
      ]);
      return json({ ok: true, team: { id, name, joinCode: code } }, 201);
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  return fail('No se pudo crear el equipo.', 500);
}

async function joinTeam(request, env, player) {
  const data = await bodyJson(request);
  const code = cleanText(data.code, 6).toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code)) return fail('Introduce un código de seis caracteres.');
  const team = await env.DB.prepare('SELECT id, name, join_code FROM teams WHERE join_code = ?').bind(code).first();
  if (!team) return fail('No existe un equipo con ese código.', 404, 'TEAM_NOT_FOUND');
  if (player.team_id === team.id) return json({ ok: true, team: { id: team.id, name: team.name, joinCode: team.join_code } });
  if (player.team_id) return fail('Ya perteneces a otro equipo.', 409, 'ALREADY_IN_TEAM');
  const maxSize = config(env).maxTeamSize;
  const updated = await env.DB.prepare(
    'UPDATE players SET team_id = ? WHERE id = ? AND (SELECT COUNT(*) FROM players WHERE team_id = ?) < ?'
  ).bind(team.id, player.id, team.id, maxSize).run();
  if (!updated.meta?.changes) return fail('El equipo ya está completo.', 409, 'TEAM_FULL');
  return json({ ok: true, team: { id: team.id, name: team.name, joinCode: team.join_code } });
}

async function useHint(request, env, player) {
  if (!player.team_id) return fail('Únete a un equipo antes de pedir una pista.', 409, 'TEAM_REQUIRED');
  const data = await bodyJson(request);
  const cfg = config(env);
  const cycle = getCycleState(new Date(), cfg.start, cfg.duration);
  const found = findClue(cycle.case, cleanText(data.clueId, 80));
  if (!found) return fail('La pista no existe.', 404);
  if (cycle.elapsedHours < found.phase.availableAfterHours) return fail('Esa prueba aún está bloqueada.', 403, 'CLUE_LOCKED');
  await env.DB.prepare(
    "INSERT OR IGNORE INTO hints (id, team_id, cycle_key, case_id, clue_id, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))"
  ).bind(crypto.randomUUID(), player.team_id, cycle.key, cycle.case.id, found.clue.id).run();
  const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM hints WHERE team_id = ? AND cycle_key = ?').bind(player.team_id, cycle.key).first();
  return json({ ok: true, clueId: found.clue.id, hint: found.clue.hint, hintCount: Number(count.total) });
}

async function submitAccusation(request, env, player) {
  if (!player.team_id) return fail('Necesitas un equipo para enviar la acusación.', 409, 'TEAM_REQUIRED');
  const data = await bodyJson(request);
  const cfg = config(env);
  const cycle = getCycleState(new Date(), cfg.start, cfg.duration);
  if (cycle.elapsedHours < cycle.case.accusationAfterHours) return fail('La acusación final todavía está cerrada.', 403, 'ACCUSATION_LOCKED');
  const existing = await env.DB.prepare('SELECT id FROM submissions WHERE team_id = ? AND cycle_key = ?').bind(player.team_id, cycle.key).first();
  if (existing) return fail('El equipo ya envió su acusación. No se puede modificar.', 409, 'ALREADY_SUBMITTED');

  const suspectId = cleanText(data.suspectId, 60);
  const methodId = cleanText(data.methodId, 60);
  const motiveId = cleanText(data.motiveId, 60);
  const evidenceIds = Array.isArray(data.evidenceIds) ? data.evidenceIds.map((id) => cleanText(id, 80)).slice(0, 3) : [];
  const reasoning = cleanText(data.reasoning, 600);
  if (!cycle.case.suspects.some((item) => item.id === suspectId)) return fail('Selecciona una persona sospechosa.');
  if (!cycle.case.methods.some((item) => item.id === methodId)) return fail('Selecciona un método.');
  if (!cycle.case.motives.some((item) => item.id === motiveId)) return fail('Selecciona un motivo.');
  if (evidenceIds.length < 1) return fail('Selecciona al menos una prueba clave.');

  const hintRow = await env.DB.prepare('SELECT COUNT(*) AS total FROM hints WHERE team_id = ? AND cycle_key = ?').bind(player.team_id, cycle.key).first();
  const result = scoreSubmission(cycle.case, { suspectId, methodId, motiveId, evidenceIds }, Number(hintRow.total));
  await env.DB.prepare(
    `INSERT INTO submissions (id, team_id, cycle_key, case_id, suspect_id, method_id, motive_id, evidence_ids, reasoning, score, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(crypto.randomUUID(), player.team_id, cycle.key, cycle.case.id, suspectId, methodId, motiveId, JSON.stringify(evidenceIds), reasoning, result.score).run();
  return json({ ok: true, score: result.score, submitted: true }, 201);
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === 'GET' && path === '/api/status') return statusResponse(request, env);
  if (request.method === 'POST' && path === '/api/session') return createSession(request, env);

  const player = await authenticate(request, env);
  if (!player) return fail('Sesión no válida. Vuelve a entrar con tu alias.', 401, 'UNAUTHORIZED');
  if (request.method === 'POST' && path === '/api/teams') return createTeam(request, env, player);
  if (request.method === 'POST' && path === '/api/teams/join') return joinTeam(request, env, player);
  if (request.method === 'POST' && path === '/api/hints') return useHint(request, env, player);
  if (request.method === 'POST' && path === '/api/accusations') return submitAccusation(request, env, player);
  return fail('Ruta no encontrada.', 404, 'NOT_FOUND');
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/')) return await handleApi(request, env);
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return fail('Ha ocurrido un error inesperado.', 500, 'INTERNAL_ERROR');
    }
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      env.DB.prepare("UPDATE players SET token_hash = NULL WHERE last_seen < datetime('now', '-180 days')").run()
    );
  }
};
