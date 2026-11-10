import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCUSATION_OPEN_HOUR,
  CASE_DURATION_HOURS,
  CLUE_COUNT,
  CLUE_INTERVAL_HOURS,
  buildCase,
  caseFingerprint,
  getCycleState,
  getPublicGame,
  scoreAccusation
} from '../src/game-engine.js';

const START = '2026-11-10T15:00:00.000Z';
const hour = value => new Date(START).getTime() + value * 60 * 60 * 1000;

test('cada expediente dura 48 horas y rota al siguiente', () => {
  assert.equal(CASE_DURATION_HOURS, 48);
  assert.equal(getCycleState(hour(47.999), START).caseIndex, 0);
  const next = getCycleState(hour(48), START);
  assert.equal(next.caseIndex, 1);
  assert.equal(next.elapsedHours, 0);
});

test('las 16 pistas se desbloquean exactamente cada 3 horas', () => {
  assert.equal(CLUE_INTERVAL_HOURS, 3);
  assert.equal(CLUE_COUNT, 16);
  assert.equal(getCycleState(hour(0), START).unlockedCount, 1);
  assert.equal(getCycleState(hour(2.999), START).unlockedCount, 1);
  assert.equal(getCycleState(hour(3), START).unlockedCount, 2);
  assert.equal(getCycleState(hour(45), START).unlockedCount, 16);
});

test('el servidor no filtra el contenido de pistas bloqueadas ni la solución', () => {
  const publicGame = getPublicGame(hour(6), { cycleStart: START, catalogSize: 1000 });
  assert.equal(publicGame.case.clues.filter(clue => clue.unlocked).length, 3);
  const locked = publicGame.case.clues.find(clue => !clue.unlocked);
  assert.equal('content' in locked, false);
  assert.equal('answer' in publicGame.case, false);
  assert.equal('solution' in publicGame.case, false);
});

test('la acusación se abre en la hora 42', () => {
  assert.equal(ACCUSATION_OPEN_HOUR, 42);
  assert.equal(getCycleState(hour(41.999), START).accusationOpen, false);
  assert.equal(getCycleState(hour(42), START).accusationOpen, true);
});

test('una acusación completa obtiene 1.000 puntos más bonificación', () => {
  const mystery = buildCase(27);
  const result = scoreAccusation(mystery, {
    suspectId: mystery.answer.suspectId,
    motive: mystery.answer.motive,
    method: mystery.answer.method,
    location: mystery.answer.location
  }, 42);
  assert.equal(result.base, 1000);
  assert.equal(result.speedBonus, 100);
  assert.equal(result.total, 1100);
  assert.equal(result.isCorrect, true);
});

test('el catálogo contiene 1.000 expedientes deterministas y válidos', () => {
  const fingerprints = new Set();
  for (let index = 0; index < 1000; index += 1) {
    const mystery = buildCase(index);
    assert.equal(mystery.suspects.length, 4);
    assert.equal(new Set(mystery.suspects.map(item => item.id)).size, 4);
    assert.equal(mystery.clues.length, 16);
    assert.deepEqual(mystery.clues.map(clue => clue.unlockAtHours), Array.from({ length: 16 }, (_, clueIndex) => clueIndex * 3));
    assert.equal(new Set(mystery.choices.motives).size, 4);
    assert.equal(new Set(mystery.choices.methods).size, 4);
    assert.equal(new Set(mystery.choices.locations).size, 4);
    fingerprints.add(caseFingerprint(mystery));
  }
  assert.equal(fingerprints.size, 1000);
});
