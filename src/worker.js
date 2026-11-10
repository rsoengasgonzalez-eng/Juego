import { buildCase, getCycleState, getPublicGame, scoreAccusation } from './game-engine.js';
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
const FIXED_TEAM_ID = 'fixed-team-admin';
const MISSION_POINTS = 100;

class ApiError extends Error {
  constructor(status, message, code = 'REQUEST_ERROR', details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
}

function config(env) {
  return { cycleStart: env.CASE_CYCLE_START, catalogSize: env.CATALOG_SIZE };
}

async function bodyOf(request) {
  try { return await request.json(); }
  catch { throw new ApiError(400, 'El cuerpo de la petición no es JSON válido.', 'INVALID_JSON'); }
}

function cleanText(value, min, max, label) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length < min || text.length > max) throw new ApiError(400, `${label} debe tener entre ${min} y ${max} caracteres.`, 'INVALID_FIELD');
  return text;
}

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es-ES');
}

function tokenFrom(request, body = {}) {
  const authorization = request.headers.get('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : String(body.token || '').trim();
}

function fixedCodes(env) {
  return String(env.FIXED_TEAM_CODES || '').split(',').map(code => code.trim()).filter(Boolean).slice(0, 2);
}

function requireDatabase(env) {
  if (!env.DB) throw new ApiError(503, 'Cloudflare D1 es obligatorio para guardar el progreso.', 'DB_REQUIRED');
}

async function getPlayer(env, token) {
  if (!env.DB || !token) return null;
  return env.DB.prepare(`
    SELECT id, alias, assignment_slot AS assignmentSlot, is_fixed_group AS isFixedGroup
    FROM players WHERE token = ?
  `).bind(token).first();
}

async function requirePlayer(request, env, body = {}) {
  requireDatabase(env);
  const player = await getPlayer(env, tokenFrom(request, body));
  if (!player) throw new ApiError(401, 'Registra de nuevo tu alias para continuar.', 'UNAUTHORIZED');
  return player;
}

async function getMembership(env, playerId) {
  return env.DB.prepare(`
    SELECT t.id, t.name, t.kind, t.capacity, t.invite_code AS inviteCode,
      (SELECT COUNT(*) FROM team_members members WHERE members.team_id = t.id) AS memberCount
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.player_id = ?
  `).bind(playerId).first();
}

async function ensureAutomaticTeams(env, ownerPlayerId) {
  const teamSize = Math.max(2, Number(env.AUTO_TEAM_SIZE) || DEFAULT_TEAM_SIZE);
  const expectedPlayers = Math.max(teamSize, Number(env.EXPECTED_PLAYERS) || DEFAULT_EXPECTED_PLAYERS);
  const now = new Date().toISOString();
  const definitions = automaticTeamDefinitions(expectedPlayers, teamSize);
  await env.DB.batch(definitions.map(team => env.DB.prepare(`
    INSERT OR IGNORE INTO teams
      (id, name, invite_code, owner_player_id, created_at, kind, capacity)
    VALUES (?, ?, ?, ?, ?, 'automatic', ?)
  `).bind(team.id, team.name, team.inviteCode, ownerPlayerId, now, teamSize)));
  return { teamSize, definitions };
}

async function automaticTeamRows(env) {
  const rows = await env.DB.prepare(`
    SELECT t.id, t.name, t.kind, t.capacity, COUNT(tm.player_id) AS memberCount
    FROM teams t
    LEFT JOIN team_members tm ON tm.team_id = t.id
    WHERE t.kind = 'automatic'
    GROUP BY t.id, t.name, t.kind, t.capacity
    ORDER BY t.id ASC
  `).all();
  return rows.results || [];
}

async function assignAutomaticTeam(env, playerId) {
  const current = await getMembership(env, playerId);
  if (current) return current;
  const { teamSize } = await ensureAutomaticTeams(env, playerId);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = chooseBalancedTeam(await automaticTeamRows(env), teamSize);
    if (!candidate) break;
    const now = new Date().toISOString();
    await env.DB.prepare(`
      INSERT OR IGNORE INTO team_members (team_id, player_id, joined_at, role)
      SELECT ?, ?, ?, 'member'
      WHERE (SELECT COUNT(*) FROM team_members WHERE team_id = ?) < ?
    `).bind(candidate.id, playerId, now, candidate.id, teamSize).run();
    const assigned = await getMembership(env, playerId);
    if (assigned) return assigned;
  }
  const existing = await automaticTeamRows(env);
  const suffix = String(existing.length + 1).padStart(2, '0');
  const teamId = `auto-team-${suffix}`;
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`
      INSERT OR IGNORE INTO teams
        (id, name, invite_code, owner_player_id, created_at, kind, capacity)
      VALUES (?, ?, ?, ?, ?, 'automatic', ?)
    `).bind(teamId, `Brigada ${suffix}`, `AUTO${suffix}`, playerId, now, teamSize),
    env.DB.prepare(`
      INSERT OR IGNORE INTO team_members (team_id, player_id, joined_at, role)
      VALUES (?, ?, ?, 'member')
    `).bind(teamId, playerId, now)
  ]);
  return getMembership(env, playerId);
}

async function assignFixedTeam(env, playerId, slot) {
  const capacity = 2;
  const now = new Date().toISOString();
  const name = String(env.FIXED_TEAM_NAME || 'Dúo de investigación').slice(0, 40);
  await env.DB.prepare(`
    INSERT OR IGNORE INTO teams
      (id, name, invite_code, owner_player_id, created_at, kind, capacity)
    VALUES (?, ?, 'FIXED2', ?, ?, 'fixed', ?)
  `).bind(FIXED_TEAM_ID, name, playerId, now, capacity).run();
  const used = await env.DB.prepare(`
    SELECT id FROM players WHERE is_fixed_group = 1 AND assignment_slot = ? AND id <> ?
  `).bind(slot, playerId).first();
  if (used) throw new ApiError(409, 'Ese código fijo ya fue utilizado.', 'FIXED_SLOT_USED');
  await env.DB.prepare(`
    INSERT OR IGNORE INTO team_members (team_id, player_id, joined_at, role)
    SELECT ?, ?, ?, 'member'
    WHERE (SELECT COUNT(*) FROM team_members WHERE team_id = ?) < 2
  `).bind(FIXED_TEAM_ID, playerId, now, FIXED_TEAM_ID).run();
  const assigned = await getMembership(env, playerId);
  if (!assigned) throw new ApiError(409, 'El grupo fijo de dos personas ya está completo.', 'FIXED_TEAM_FULL');
  return assigned;
}

async function createPlayer(request, env) {
  requireDatabase(env);
  const body = await bodyOf(request);
  const alias = cleanText(body.alias, 2, 24, 'El alias');
  const normalizedAlias = normalize(alias);
  const assignmentCode = String(body.assignmentCode || '').trim();
  const codes = fixedCodes(env);
  const slotIndex = assignmentCode ? codes.findIndex(code => code === assignmentCode) : -1;
  if (assignmentCode && slotIndex < 0) throw new ApiError(403, 'El código de grupo fijo no es válido.', 'INVALID_FIXED_CODE');
  if (slotIndex >= 0) {
    const occupied = await env.DB.prepare('SELECT id FROM players WHERE is_fixed_group = 1 AND assignment_slot = ?').bind(slotIndex + 1).first();
    if (occupied) throw new ApiError(409, 'Ese código de grupo fijo ya fue utilizado.', 'FIXED_SLOT_USED');
  }
  const duplicate = await env.DB.prepare('SELECT id FROM players WHERE normalized_alias = ?').bind(normalizedAlias).first();
  if (duplicate) throw new ApiError(409, 'Ese alias ya está registrado. Elige otro.', 'ALIAS_TAKEN');

  const id = crypto.randomUUID();
  const token = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await env.DB.prepare(`
      INSERT INTO players
        (id, token, alias, created_at, last_seen_at, normalized_alias, assignment_slot, is_fixed_group)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, token, alias, now, now, normalizedAlias, slotIndex >= 0 ? slotIndex + 1 : null, slotIndex >= 0 ? 1 : 0).run();
  } catch (error) {
    if (String(error).includes('UNIQUE')) throw new ApiError(409, slotIndex >= 0 ? 'Ese código fijo o alias ya está utilizado.' : 'Ese alias ya está registrado.', 'REGISTRATION_CONFLICT');
    throw error;
  }
  try {
    const team = slotIndex >= 0 ? await assignFixedTeam(env, id, slotIndex + 1) : await assignAutomaticTeam(env, id);
    return json({ player: { id, alias, token }, team, localMode: false, assignment: slotIndex >= 0 ? 'administrator-fixed-pair' : 'automatic-balanced' }, 201);
  } catch (error) {
    await env.DB.prepare('DELETE FROM players WHERE id = ?').bind(id).run();
    throw error;
  }
}

async function ensureCaseRun(env, cycle, mystery) {
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT OR IGNORE INTO case_runs
      (cycle_number, case_index, case_code, starts_at, ends_at, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'open', ?, ?)
  `).bind(cycle.cycleNumber, cycle.caseIndex, mystery.code, new Date(cycle.caseStartMs).toISOString(), new Date(cycle.caseEndMs).toISOString(), now, now).run();
  await env.DB.prepare(`
    UPDATE case_runs SET status = 'expired', updated_at = ?
    WHERE cycle_number < ? AND status = 'open'
  `).bind(now, cycle.cycleNumber).run();
}

async function ensureTeamCase(env, cycle, teamId) {
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT OR IGNORE INTO team_case_state
      (cycle_number, team_id, started_at, last_activity_at, status)
    VALUES (?, ?, ?, ?, 'investigating')
  `).bind(cycle.cycleNumber, teamId, now, now).run();
}

async function syncTeamProgress(env, cycle, mystery, teamId) {
  await ensureCaseRun(env, cycle, mystery);
  await ensureTeamCase(env, cycle, teamId);
  const now = new Date().toISOString();
  const unlocked = mystery.clues.slice(0, cycle.unlockedCount);
  if (unlocked.length) {
    await env.DB.batch(unlocked.map(clue => env.DB.prepare(`
      INSERT OR IGNORE INTO team_clue_unlocks
        (cycle_number, team_id, clue_id, clue_number, unlocked_at, unlock_source)
      VALUES (?, ?, ?, ?, ?, 'clock')
    `).bind(cycle.cycleNumber, teamId, clue.id, clue.number, new Date(cycle.caseStartMs + clue.unlockAtHours * 3600000).toISOString())));
  }
  await env.DB.batch(mystery.missions.map(mission => env.DB.prepare(`
    INSERT OR IGNORE INTO team_mission_progress
      (cycle_number, team_id, mission_id, mission_order, status)
    VALUES (?, ?, ?, ?, ?)
  `).bind(cycle.cycleNumber, teamId, mission.id, mission.order, cycle.unlockedCount >= mission.unlockAfterClue ? 'available' : 'locked')));
  await env.DB.prepare(`
    UPDATE team_mission_progress SET status = 'available'
    WHERE cycle_number = ? AND team_id = ? AND status = 'locked'
      AND mission_order IN (${mystery.missions.filter(mission => cycle.unlockedCount >= mission.unlockAfterClue).map(() => '?').join(',') || 'NULL'})
  `).bind(cycle.cycleNumber, teamId, ...mystery.missions.filter(mission => cycle.unlockedCount >= mission.unlockAfterClue).map(mission => mission.order)).run();
  await env.DB.prepare(`UPDATE team_case_state SET last_activity_at = ? WHERE cycle_number = ? AND team_id = ?`)
    .bind(now, cycle.cycleNumber, teamId).run();
}

async function teamProgress(env, cycleNumber, teamId, mystery) {
  const missionRows = await env.DB.prepare(`
    SELECT mission_id AS missionId, mission_order AS missionOrder, status, attempts,
      completed_by_player_id AS completedByPlayerId, completed_at AS completedAt, points_awarded AS pointsAwarded
    FROM team_mission_progress WHERE cycle_number = ? AND team_id = ? ORDER BY mission_order
  `).bind(cycleNumber, teamId).all();
  const byId = new Map((missionRows.results || []).map(row => [row.missionId, row]));
  const missions = mystery.missions.map(({ answer: _answer, ...mission }) => ({ ...mission, ...(byId.get(mission.id) || { status: 'locked', attempts: 0, pointsAwarded: 0 }) }));
  const state = await env.DB.prepare(`
    SELECT status, started_at AS startedAt, finished_at AS finishedAt
    FROM team_case_state WHERE cycle_number = ? AND team_id = ?
  `).bind(cycleNumber, teamId).first();
  const result = await env.DB.prepare(`
    SELECT r.missions_completed AS missionsCompleted, r.mission_score AS missionScore,
      r.accusation_score AS accusationScore, r.speed_bonus AS speedBonus,
      r.total_score AS totalScore, r.solved_correctly AS solvedCorrectly,
      r.finished_at AS finishedAt, r.elapsed_seconds AS elapsedSeconds,
      a.suspect_correct AS suspectCorrect, a.motive_correct AS motiveCorrect,
      a.method_correct AS methodCorrect, a.location_correct AS locationCorrect
    FROM team_case_results r
    JOIN team_accusations a ON a.id = r.accusation_id
    WHERE r.cycle_number = ? AND r.team_id = ?
  `).bind(cycleNumber, teamId).first();
  const completedCount = missions.filter(mission => mission.status === 'completed').length;
  return {
    state: state || { status: 'investigating' },
    missions,
    completedCount,
    allMissionsCompleted: completedCount === mystery.missions.length,
    accusationOpen: completedCount === mystery.missions.length && state?.status !== 'finished',
    result: result || null
  };
}

async function gameResponse(request, env) {
  const now = Date.now();
  const cycle = getCycleState(now, env.CASE_CYCLE_START, env.CATALOG_SIZE);
  const mystery = buildCase(cycle.caseIndex);
  const payload = getPublicGame(now, config(env));
  payload.rules.automaticTeams = true;
  payload.rules.expectedPlayers = Math.max(2, Number(env.EXPECTED_PLAYERS) || DEFAULT_EXPECTED_PLAYERS);
  payload.rules.teamSize = Math.max(2, Number(env.AUTO_TEAM_SIZE) || DEFAULT_TEAM_SIZE);
  payload.rules.expectedTeamCount = Math.ceil(payload.rules.expectedPlayers / payload.rules.teamSize);
  payload.rules.fixedPairEnabled = fixedCodes(env).length === 2;
  payload.teamProgress = null;

  if (env.DB) {
    const player = await getPlayer(env, tokenFrom(request));
    if (player) {
      const team = await getMembership(env, player.id);
      if (team) {
        await syncTeamProgress(env, cycle, mystery, team.id);
        payload.player = player;
        payload.team = team;
        payload.teamProgress = await teamProgress(env, cycle.cycleNumber, team.id, mystery);
        if (payload.teamProgress.result) payload.teamSolution = { answer: mystery.answer, explanation: mystery.solution };
      }
    }
  }
  return json(payload);
}

async function submitMission(request, env, missionId) {
  const body = await bodyOf(request);
  const player = await requirePlayer(request, env, body);
  const team = await getMembership(env, player.id);
  if (!team) throw new ApiError(409, 'No tienes un equipo asignado.', 'NO_TEAM');
  const cycle = getCycleState(Date.now(), env.CASE_CYCLE_START, env.CATALOG_SIZE);
  const mystery = buildCase(cycle.caseIndex);
  await syncTeamProgress(env, cycle, mystery, team.id);
  const mission = mystery.missions.find(item => item.id === missionId);
  if (!mission) throw new ApiError(404, 'La misión no existe en este expediente.', 'MISSION_NOT_FOUND');
  if (cycle.unlockedCount < mission.unlockAfterClue) throw new ApiError(403, `La misión requiere la pista ${mission.unlockAfterClue}.`, 'MISSION_LOCKED');
  const state = await env.DB.prepare(`SELECT status FROM team_case_state WHERE cycle_number = ? AND team_id = ?`).bind(cycle.cycleNumber, team.id).first();
  if (state?.status === 'finished') throw new ApiError(409, 'Tu equipo ya terminó este expediente.', 'TEAM_FINISHED');
  const current = await env.DB.prepare(`
    SELECT status FROM team_mission_progress WHERE cycle_number = ? AND team_id = ? AND mission_id = ?
  `).bind(cycle.cycleNumber, team.id, mission.id).first();
  if (current?.status === 'completed') return json({ correct: true, alreadyCompleted: true, progress: await teamProgress(env, cycle.cycleNumber, team.id, mystery) });

  const answer = cleanText(body.answer, 1, 160, 'La respuesta');
  const correct = normalize(answer) === normalize(mission.answer);
  const now = new Date().toISOString();
  const attemptId = crypto.randomUUID();
  const statements = [
    env.DB.prepare(`
      INSERT INTO mission_attempts
        (id, cycle_number, team_id, mission_id, player_id, answer, is_correct, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(attemptId, cycle.cycleNumber, team.id, mission.id, player.id, answer, correct ? 1 : 0, now),
    env.DB.prepare(`
      UPDATE team_mission_progress
      SET attempts = attempts + 1, last_answer = ?,
          status = CASE WHEN ? = 1 THEN 'completed' ELSE 'available' END,
          completed_by_player_id = CASE WHEN ? = 1 THEN ? ELSE completed_by_player_id END,
          completed_at = CASE WHEN ? = 1 THEN ? ELSE completed_at END,
          points_awarded = CASE WHEN ? = 1 THEN ? ELSE points_awarded END
      WHERE cycle_number = ? AND team_id = ? AND mission_id = ?
    `).bind(answer, correct ? 1 : 0, correct ? 1 : 0, player.id, correct ? 1 : 0, now, correct ? 1 : 0, MISSION_POINTS, cycle.cycleNumber, team.id, mission.id)
  ];
  if (correct) statements.push(env.DB.prepare(`
    INSERT INTO score_events
      (id, cycle_number, team_id, player_id, event_type, reference_id, points, created_at)
    VALUES (?, ?, ?, ?, 'mission', ?, ?, ?)
  `).bind(crypto.randomUUID(), cycle.cycleNumber, team.id, player.id, mission.id, MISSION_POINTS, now));
  await env.DB.batch(statements);
  return json({ correct, message: correct ? 'Misión completada por todo el equipo.' : 'La respuesta no encaja. Revisa las pistas.', progress: await teamProgress(env, cycle.cycleNumber, team.id, mystery) }, correct ? 201 : 200);
}

async function submitAccusation(request, env) {
  const body = await bodyOf(request);
  const player = await requirePlayer(request, env, body);
  const team = await getMembership(env, player.id);
  if (!team) throw new ApiError(409, 'No tienes un equipo asignado.', 'NO_TEAM');
  const nowMs = Date.now();
  const cycle = getCycleState(nowMs, env.CASE_CYCLE_START, env.CATALOG_SIZE);
  const mystery = buildCase(cycle.caseIndex);
  await syncTeamProgress(env, cycle, mystery, team.id);
  const progress = await teamProgress(env, cycle.cycleNumber, team.id, mystery);
  if (progress.state?.status === 'finished') throw new ApiError(409, 'Tu equipo ya terminó este expediente.', 'TEAM_FINISHED');
  if (!progress.allMissionsCompleted) throw new ApiError(403, 'Completa todas las misiones obligatorias antes de acusar.', 'MISSIONS_REQUIRED', { completed: progress.completedCount, required: mystery.missions.length });

  const accusation = {
    suspectId: cleanText(body.suspectId, 3, 80, 'La persona sospechosa'),
    motive: cleanText(body.motive, 3, 120, 'El motivo'),
    method: cleanText(body.method, 3, 120, 'El método'),
    location: cleanText(body.location, 3, 160, 'El lugar')
  };
  const scored = scoreAccusation(mystery, accusation, cycle.elapsedHours);
  const missionScore = progress.missions.reduce((sum, mission) => sum + Number(mission.pointsAwarded || 0), 0);
  const totalScore = missionScore + scored.base + scored.speedBonus;
  const accusationId = crypto.randomUUID();
  const now = new Date(nowMs).toISOString();
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - cycle.caseStartMs) / 1000));
  const finishedBefore = await env.DB.prepare('SELECT COUNT(*) AS count FROM team_case_results WHERE cycle_number = ?').bind(cycle.cycleNumber).first();
  const rankAtFinish = Number(finishedBefore?.count || 0) + 1;

  try {
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO team_accusations
          (id, cycle_number, case_index, team_id, submitted_by_player_id, suspect_id, motive, method, location,
           suspect_correct, motive_correct, method_correct, location_correct, is_correct, accusation_score, speed_bonus, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(accusationId, cycle.cycleNumber, cycle.caseIndex, team.id, player.id, accusation.suspectId, accusation.motive, accusation.method, accusation.location,
        scored.checks.suspect ? 1 : 0, scored.checks.motive ? 1 : 0, scored.checks.method ? 1 : 0, scored.checks.location ? 1 : 0,
        scored.isCorrect ? 1 : 0, scored.base, scored.speedBonus, now),
      env.DB.prepare(`
        INSERT INTO team_case_results
          (cycle_number, team_id, accusation_id, missions_completed, mission_score, accusation_score, speed_bonus,
           total_score, solved_correctly, finished_at, elapsed_seconds, rank_at_finish)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(cycle.cycleNumber, team.id, accusationId, progress.completedCount, missionScore, scored.base, scored.speedBonus, totalScore, scored.isCorrect ? 1 : 0, now, elapsedSeconds, rankAtFinish),
      env.DB.prepare(`
        UPDATE team_case_state SET status = 'finished', finished_at = ?, last_activity_at = ?
        WHERE cycle_number = ? AND team_id = ?
      `).bind(now, now, cycle.cycleNumber, team.id),
      env.DB.prepare(`
        INSERT INTO score_events
          (id, cycle_number, team_id, player_id, event_type, reference_id, points, created_at)
        VALUES (?, ?, ?, ?, 'accusation', ?, ?, ?)
      `).bind(crypto.randomUUID(), cycle.cycleNumber, team.id, player.id, accusationId, scored.base, now),
      env.DB.prepare(`
        INSERT INTO score_events
          (id, cycle_number, team_id, player_id, event_type, reference_id, points, created_at)
        VALUES (?, ?, ?, ?, 'speed_bonus', ?, ?, ?)
      `).bind(crypto.randomUUID(), cycle.cycleNumber, team.id, player.id, accusationId, scored.speedBonus, now)
    ]);
  } catch (error) {
    if (String(error).includes('UNIQUE')) throw new ApiError(409, 'Tu equipo ya presentó una acusación.', 'ALREADY_SUBMITTED');
    throw error;
  }
  return json({
    result: { ...scored, missionScore, total: totalScore, finishedAt: now, elapsedSeconds },
    persisted: true,
    teamFinished: true,
    caseStillOpenForOthers: nowMs < cycle.caseEndMs,
    solution: { answer: mystery.answer, explanation: mystery.solution },
    message: 'Tu equipo ha cerrado el expediente. Los demás equipos pueden seguir jugando hasta terminar o hasta las 48 horas.'
  }, 201);
}

async function profile(request, env) {
  requireDatabase(env);
  const player = await getPlayer(env, tokenFrom(request));
  if (!player) return json({ player: null, team: null, localMode: false });
  const team = await getMembership(env, player.id);
  return json({ player, team, localMode: false });
}

async function ranking(env) {
  requireDatabase(env);
  const cycle = getCycleState(Date.now(), env.CASE_CYCLE_START, env.CATALOG_SIZE);
  const rows = await env.DB.prepare(`
    SELECT t.name AS teamName, t.kind, COUNT(DISTINCT tm.player_id) AS memberCount,
      s.status, r.total_score AS totalScore, r.mission_score AS missionScore,
      r.accusation_score AS accusationScore, r.speed_bonus AS speedBonus,
      r.solved_correctly AS solvedCorrectly, r.finished_at AS finishedAt,
      r.elapsed_seconds AS elapsedSeconds
    FROM teams t
    LEFT JOIN team_members tm ON tm.team_id = t.id
    LEFT JOIN team_case_state s ON s.team_id = t.id AND s.cycle_number = ?
    LEFT JOIN team_case_results r ON r.team_id = t.id AND r.cycle_number = ?
    GROUP BY t.id, t.name, t.kind, s.status, r.total_score, r.mission_score,
      r.accusation_score, r.speed_bonus, r.solved_correctly, r.finished_at, r.elapsed_seconds
    HAVING memberCount > 0
    ORDER BY (r.total_score IS NULL) ASC, r.total_score DESC, r.elapsed_seconds ASC, t.name ASC
  `).bind(cycle.cycleNumber, cycle.cycleNumber).all();
  const progress = await env.DB.prepare(`
    SELECT COUNT(*) AS activeTeams,
      SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END) AS finishedTeams
    FROM team_case_state WHERE cycle_number = ?
  `).bind(cycle.cycleNumber).first();
  return json({ ranking: rows.results || [], localMode: false, activeTeams: Number(progress?.activeTeams || 0), finishedTeams: Number(progress?.finishedTeams || 0), caseEndsAt: new Date(cycle.caseEndMs).toISOString() });
}

async function health(env) {
  if (!env.DB) return json({ ok: false, game: 'ready', database: 'not-configured', mode: 'persistent-required' }, 503);
  try {
    const tables = await env.DB.prepare(`
      SELECT COUNT(*) AS count FROM sqlite_master
      WHERE type = 'table' AND name IN ('players','teams','team_members','case_runs','team_case_state','team_clue_unlocks','team_mission_progress','mission_attempts','team_accusations','team_case_results','score_events')
    `).first();
    const ready = Number(tables?.count || 0) === 11;
    return json({ ok: ready, game: 'ready', database: ready ? 'ready' : 'migration-required', mode: 'persistent', fixedPairConfigured: fixedCodes(env).length === 2 }, ready ? 200 : 503);
  } catch {
    return json({ ok: false, game: 'ready', database: 'unavailable', mode: 'persistent-required' }, 503);
  }
}

async function api(request, env, pathname) {
  if (request.method === 'GET' && pathname === '/api/game') return gameResponse(request, env);
  if (request.method === 'GET' && pathname === '/api/health') return health(env);
  if (request.method === 'GET' && pathname === '/api/profile') return profile(request, env);
  if (request.method === 'GET' && pathname === '/api/ranking') return ranking(env);
  if (request.method === 'POST' && pathname === '/api/players') return createPlayer(request, env);
  const missionMatch = pathname.match(/^\/api\/missions\/([^/]+)\/submit$/);
  if (request.method === 'POST' && missionMatch) return submitMission(request, env, decodeURIComponent(missionMatch[1]));
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
      if (error instanceof ApiError) return secure(json({ error: error.message, code: error.code, ...error.details }, error.status));
      console.error('Unhandled error', error);
      return secure(json({ error: 'Ha ocurrido un error inesperado.', code: 'INTERNAL_ERROR' }, 500));
    }
  }
};
