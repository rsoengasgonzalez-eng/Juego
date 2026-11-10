export const DEFAULT_EXPECTED_PLAYERS = 80;
export const DEFAULT_TEAM_SIZE = 8;
export const AUTO_TEAM_NAMES = [
  'Brigada Búho',
  'Brigada Lince',
  'Brigada Cuervo',
  'Brigada Zorro',
  'Brigada Halcón',
  'Brigada Gato',
  'Brigada Tejón',
  'Brigada Lobo',
  'Brigada Urraca',
  'Brigada Gecko'
];

export function automaticTeamCount(expectedPlayers = DEFAULT_EXPECTED_PLAYERS, teamSize = DEFAULT_TEAM_SIZE) {
  return Math.max(1, Math.ceil(Number(expectedPlayers) / Math.max(2, Number(teamSize))));
}

export function automaticTeamDefinitions(expectedPlayers = DEFAULT_EXPECTED_PLAYERS, teamSize = DEFAULT_TEAM_SIZE) {
  const count = automaticTeamCount(expectedPlayers, teamSize);
  return Array.from({ length: count }, (_, index) => ({
    id: `auto-team-${String(index + 1).padStart(2, '0')}`,
    name: AUTO_TEAM_NAMES[index] || `Brigada ${String(index + 1).padStart(2, '0')}`,
    inviteCode: `AUTO${String(index + 1).padStart(2, '0')}`,
    slot: index + 1,
    capacity: Number(teamSize)
  }));
}

export function chooseBalancedTeam(teams, teamSize = DEFAULT_TEAM_SIZE) {
  const capacity = Math.max(2, Number(teamSize));
  const available = teams
    .filter(team => Number(team.memberCount || 0) < capacity)
    .sort((a, b) => Number(a.memberCount || 0) - Number(b.memberCount || 0) || String(a.id).localeCompare(String(b.id)));
  return available[0] || null;
}

export function simulateBalancedAssignment(playerCount = DEFAULT_EXPECTED_PLAYERS, expectedPlayers = DEFAULT_EXPECTED_PLAYERS, teamSize = DEFAULT_TEAM_SIZE) {
  const teams = automaticTeamDefinitions(expectedPlayers, teamSize).map(team => ({ ...team, memberCount: 0 }));
  for (let player = 0; player < playerCount; player += 1) {
    let selected = chooseBalancedTeam(teams, teamSize);
    if (!selected) {
      const slot = teams.length + 1;
      selected = { id: `auto-team-${String(slot).padStart(2, '0')}`, name: `Brigada ${String(slot).padStart(2, '0')}`, inviteCode: `AUTO${String(slot).padStart(2, '0')}`, slot, capacity: teamSize, memberCount: 0 };
      teams.push(selected);
    }
    selected.memberCount += 1;
  }
  return teams;
}
