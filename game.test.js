import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES } from '../src/cases.js';
import { getCycleState, visibleCase, scoreSubmission } from '../src/game.js';

const start = '2026-11-10T08:00:00.000Z';

test('mantiene cada caso durante 72 horas y rota al siguiente', () => {
  const first = getCycleState(new Date('2026-11-10T09:00:00.000Z'), start, 72);
  const second = getCycleState(new Date('2026-11-13T09:00:00.000Z'), start, 72);
  assert.equal(first.slot, 0);
  assert.equal(first.case.id, CASES[0].id);
  assert.equal(second.slot, 1);
  assert.equal(second.case.id, CASES[1].id);
});

test('oculta fases futuras y no filtra el texto de las pistas', () => {
  const view = visibleCase(CASES[0], 20);
  assert.equal(view.phases[0].locked, false);
  assert.equal(view.phases[1].locked, false);
  assert.equal(view.phases[2].locked, true);
  assert.equal(view.phases[2].clues.length, 0);
  assert.equal('hint' in view.phases[0].clues[0], false);
  assert.equal('solution' in view, false);
});

test('calcula puntuación y penalización de pistas', () => {
  const item = CASES[0];
  const answer = {
    suspectId: item.solution.suspectId,
    methodId: item.solution.methodId,
    motiveId: item.solution.motiveId,
    evidenceIds: item.solution.evidenceClueIds.slice(0, 3)
  };
  assert.equal(scoreSubmission(item, answer, 0).score, 1100);
  assert.equal(scoreSubmission(item, answer, 2).score, 1000);
});

test('limita el crédito de evidencias duplicadas', () => {
  const item = CASES[0];
  const clue = item.solution.evidenceClueIds[0];
  const result = scoreSubmission(item, { suspectId: 'x', methodId: 'x', motiveId: 'x', evidenceIds: [clue, clue, clue] }, 0);
  assert.equal(result.score, 50);
});

test('todos los casos tienen referencias de solución válidas e IDs únicos', () => {
  const caseIds = new Set();
  for (const item of CASES) {
    assert.equal(caseIds.has(item.id), false, `caso duplicado: ${item.id}`);
    caseIds.add(item.id);
    assert.ok(item.suspects.some((x) => x.id === item.solution.suspectId));
    assert.ok(item.methods.some((x) => x.id === item.solution.methodId));
    assert.ok(item.motives.some((x) => x.id === item.solution.motiveId));
    const clues = item.phases.flatMap((phase) => phase.clues);
    const clueIds = new Set(clues.map((clue) => clue.id));
    assert.equal(clueIds.size, clues.length, `pista duplicada en ${item.id}`);
    for (const id of item.solution.evidenceClueIds) assert.ok(clueIds.has(id), `evidencia inexistente: ${id}`);
    assert.deepEqual(item.phases.map((phase) => phase.availableAfterHours), [0, 18, 42, 60]);
  }
});
