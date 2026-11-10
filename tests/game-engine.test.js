import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CASE_DURATION_HOURS,
  CLUE_COUNT,
  CLUE_INTERVAL_HOURS,
  CLUE_INTERVAL_MINUTES,
  MISSION_COUNT,
  buildCase,
  caseFingerprint,
  getCycleState,
  getPublicGame,
  scoreAccusation
} from '../src/game-engine.js';

const START = '2026-11-10T15:00:00.000Z';
const minute = value => new Date(START).getTime() + value * 60 * 1000;
const hour = value => minute(value * 60);

test('cada expediente dura 48 horas y rota al siguiente', () => {
  assert.equal(CASE_DURATION_HOURS, 48);
  assert.equal(getCycleState(hour(47.999), START).caseIndex, 0);
  const next = getCycleState(hour(48), START);
  assert.equal(next.caseIndex, 1);
  assert.equal(next.elapsedHours, 0);
});

test('las 16 pistas se desbloquean exactamente cada 30 minutos', () => {
  assert.equal(CLUE_INTERVAL_MINUTES, 30);
  assert.equal(CLUE_INTERVAL_HOURS, 0.5);
  assert.equal(CLUE_COUNT, 16);
  assert.equal(getCycleState(minute(0), START).unlockedCount, 1);
  assert.equal(getCycleState(minute(29.99), START).unlockedCount, 1);
  assert.equal(getCycleState(minute(30), START).unlockedCount, 2);
  assert.equal(getCycleState(minute(450), START).unlockedCount, 16);
});

test('el servidor no filtra pistas bloqueadas, respuestas de misión ni solución', () => {
  const publicGame = getPublicGame(minute(60), { cycleStart:START, catalogSize:1000 });
  assert.equal(publicGame.case.clues.filter(clue => clue.unlocked).length, 3);
  assert.equal('content' in publicGame.case.clues.find(clue => !clue.unlocked), false);
  assert.equal(publicGame.case.missions.length, MISSION_COUNT);
  assert.ok(publicGame.case.missions.every(mission => !('answer' in mission)));
  assert.equal('answer' in publicGame.case, false);
  assert.equal('solution' in publicGame.case, false);
});

test('cada caso contiene cinco misiones obligatorias escalonadas', () => {
  const mystery = buildCase(27);
  assert.equal(mystery.missions.length, 5);
  assert.deepEqual(mystery.missions.map(mission => mission.unlockAfterClue), [5, 7, 9, 12, 15]);
  assert.ok(mystery.missions.every(mission => mission.options.includes(mission.answer)));
  assert.ok(mystery.missions.every(mission => new Set(mission.options).size === mission.options.length));
});

test('una acusación completa obtiene 1.000 puntos y bonificación decreciente', () => {
  const mystery = buildCase(27);
  const early = scoreAccusation(mystery, mystery.answer, 8);
  const late = scoreAccusation(mystery, mystery.answer, 20);
  assert.equal(early.base, 1000);
  assert.ok(early.speedBonus > late.speedBonus);
  assert.equal(early.total, early.base + early.speedBonus);
  assert.equal(early.isCorrect, true);
});

test('el catálogo contiene 1.000 expedientes deterministas y válidos', () => {
  const fingerprints = new Set();
  for (let index = 0; index < 1000; index += 1) {
    const mystery = buildCase(index);
    assert.equal(mystery.suspects.length, 4);
    assert.equal(new Set(mystery.suspects.map(item => item.id)).size, 4);
    assert.equal(new Set(mystery.suspects.map(item => item.badgeSuffix)).size, 4);
    assert.equal(mystery.clues.length, 16);
    assert.deepEqual(mystery.clues.map(clue => clue.unlockAtHours), Array.from({ length:16 }, (_, clueIndex) => clueIndex * 0.5));
    assert.equal(mystery.missions.length, 5);
    assert.equal(new Set(mystery.choices.motives).size, 4);
    assert.equal(new Set(mystery.choices.methods).size, 4);
    assert.equal(new Set(mystery.choices.locations).size, 4);
    fingerprints.add(caseFingerprint(mystery));
  }
  assert.equal(fingerprints.size, 1000);
});
