import test from 'node:test';
import assert from 'node:assert/strict';
import {
  automaticTeamDefinitions,
  chooseBalancedTeam,
  simulateBalancedAssignment
} from '../src/team-engine.js';

test('se preparan 10 brigadas de 8 para 80 participantes', () => {
  const teams = automaticTeamDefinitions(80, 8);
  assert.equal(teams.length, 10);
  assert.ok(teams.every(team => team.capacity === 8));
  assert.equal(new Set(teams.map(team => team.name)).size, 10);
});

test('80 altas automáticas terminan en diez grupos de ocho', () => {
  const teams = simulateBalancedAssignment(80, 80, 8);
  assert.equal(teams.length, 10);
  assert.deepEqual(teams.map(team => team.memberCount), Array(10).fill(8));
});

test('la diferencia entre brigadas nunca supera una persona durante las altas', () => {
  for (let players = 1; players <= 80; players += 1) {
    const counts = simulateBalancedAssignment(players, 80, 8).map(team => team.memberCount);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `desequilibrio al llegar a ${players} jugadores`);
  }
});

test('la selección prioriza el grupo menos poblado y respeta capacidad', () => {
  const selected = chooseBalancedTeam([
    { id:'auto-team-01', memberCount:8 },
    { id:'auto-team-02', memberCount:4 },
    { id:'auto-team-03', memberCount:3 }
  ], 8);
  assert.equal(selected.id, 'auto-team-03');
  assert.equal(chooseBalancedTeam([{ id:'one', memberCount:8 }], 8), null);
});

test('el jugador 81 abre una brigada de desbordamiento sin sobrellenar las anteriores', () => {
  const teams = simulateBalancedAssignment(81, 80, 8);
  assert.equal(teams.length, 11);
  assert.ok(teams.slice(0, 10).every(team => team.memberCount === 8));
  assert.equal(teams[10].memberCount, 1);
});
