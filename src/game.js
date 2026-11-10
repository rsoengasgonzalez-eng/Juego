import { CASES } from './cases.js';

export const HOUR = 60 * 60 * 1000;

export function getCycleState(now, startIso, durationHours = 72) {
  const startMs = Date.parse(startIso);
  if (!Number.isFinite(startMs)) throw new Error('CASE_CYCLE_START no es una fecha válida');
  const durationMs = Number(durationHours) * HOUR;
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  const rawSlot = Math.floor((nowMs - startMs) / durationMs);
  const slot = Math.max(0, rawSlot);
  const cycleStartMs = startMs + slot * durationMs;
  const cycleEndMs = cycleStartMs + durationMs;
  const elapsedHours = rawSlot < 0 ? 0 : Math.max(0, (nowMs - cycleStartMs) / HOUR);
  const caseIndex = ((slot % CASES.length) + CASES.length) % CASES.length;
  return {
    slot,
    key: `cycle-${slot}`,
    caseIndex,
    case: CASES[caseIndex],
    startsAt: new Date(cycleStartMs).toISOString(),
    endsAt: new Date(cycleEndMs).toISOString(),
    elapsedHours,
    hasStarted: nowMs >= startMs
  };
}

export function visibleCase(caseData, elapsedHours, includeSolution = false) {
  const phases = caseData.phases.map((phase) => ({
    id: phase.id,
    title: phase.title,
    kicker: phase.kicker,
    availableAfterHours: phase.availableAfterHours,
    locked: elapsedHours < phase.availableAfterHours,
    clues: elapsedHours >= phase.availableAfterHours
      ? phase.clues.map(({ hint, ...clue }) => clue)
      : []
  }));
  const availableClues = phases.flatMap((phase) => phase.clues);
  const accusationOpen = elapsedHours >= caseData.accusationAfterHours;
  const safe = {
    id: caseData.id,
    title: caseData.title,
    subtitle: caseData.subtitle,
    location: caseData.location,
    victim: caseData.victim,
    synopsis: caseData.synopsis,
    cover: caseData.cover,
    suspects: caseData.suspects,
    methods: caseData.methods,
    motives: caseData.motives,
    phases,
    availableClues,
    accusationAfterHours: caseData.accusationAfterHours,
    accusationOpen
  };
  if (includeSolution) safe.solution = caseData.solution;
  return safe;
}

export function scoreSubmission(caseData, answer, hintCount = 0) {
  const solution = caseData.solution;
  let score = 0;
  const breakdown = {
    culprit: answer.suspectId === solution.suspectId ? 500 : 0,
    method: answer.methodId === solution.methodId ? 200 : 0,
    motive: answer.motiveId === solution.motiveId ? 250 : 0,
    evidence: 0,
    hintsPenalty: Math.min(Math.max(Number(hintCount) || 0, 0) * 50, 200)
  };
  const selectedEvidence = [...new Set(answer.evidenceIds || [])].slice(0, 3);
  breakdown.evidence = selectedEvidence.filter((id) => solution.evidenceClueIds.includes(id)).length * 50;
  score = Math.max(0, breakdown.culprit + breakdown.method + breakdown.motive + breakdown.evidence - breakdown.hintsPenalty);
  return { score, breakdown };
}

export function nextUnlock(caseData, elapsedHours, cycleStartIso) {
  const next = caseData.phases.find((phase) => phase.availableAfterHours > elapsedHours);
  if (!next) return null;
  return {
    phaseId: next.id,
    title: next.title,
    at: new Date(Date.parse(cycleStartIso) + next.availableAfterHours * HOUR).toISOString()
  };
}
