export const TEAM_INFO: Record<string, { color: string; abbr: string; city: string }> = {
  // AFC East
  'Buffalo Bills': { color: '#00338D', abbr: 'BUF', city: 'BUFFALO' },
  'Miami Dolphins': { color: '#008E97', abbr: 'MIA', city: 'MIAMI' },
  'New England Patriots': { color: '#002244', abbr: 'NE', city: 'NEW ENGLAND' },
  'New York Jets': { color: '#125740', abbr: 'NYJ', city: 'NEW YORK' },
  // AFC North
  'Baltimore Ravens': { color: '#241773', abbr: 'BAL', city: 'BALTIMORE' },
  'Cincinnati Bengals': { color: '#FB4F14', abbr: 'CIN', city: 'CINCINNATI' },
  'Cleveland Browns': { color: '#311D00', abbr: 'CLE', city: 'CLEVELAND' },
  'Pittsburgh Steelers': { color: '#FFB612', abbr: 'PIT', city: 'PITTSBURGH' },
  // AFC South
  'Houston Texans': { color: '#03202F', abbr: 'HOU', city: 'HOUSTON' },
  'Indianapolis Colts': { color: '#002C5F', abbr: 'IND', city: 'INDIANAPOLIS' },
  'Jacksonville Jaguars': { color: '#006778', abbr: 'JAX', city: 'JACKSONVILLE' },
  'Tennessee Titans': { color: '#0C2340', abbr: 'TEN', city: 'TENNESSEE' },
  // AFC West
  'Denver Broncos': { color: '#FB4F14', abbr: 'DEN', city: 'DENVER' },
  'Kansas City Chiefs': { color: '#E31837', abbr: 'KC', city: 'KANSAS CITY' },
  'Las Vegas Raiders': { color: '#1A1A1A', abbr: 'LV', city: 'LAS VEGAS' },
  'Los Angeles Chargers': { color: '#0080C6', abbr: 'LAC', city: 'LOS ANGELES' },
  // NFC East
  'Dallas Cowboys': { color: '#041E42', abbr: 'DAL', city: 'DALLAS' },
  'New York Giants': { color: '#0B2265', abbr: 'NYG', city: 'NEW YORK' },
  'Philadelphia Eagles': { color: '#004C54', abbr: 'PHI', city: 'PHILADELPHIA' },
  'Washington Commanders': { color: '#5A1414', abbr: 'WSH', city: 'WASHINGTON' },
  // NFC North
  'Chicago Bears': { color: '#0B162A', abbr: 'CHI', city: 'CHICAGO' },
  'Detroit Lions': { color: '#0076B6', abbr: 'DET', city: 'DETROIT' },
  'Green Bay Packers': { color: '#203731', abbr: 'GB', city: 'GREEN BAY' },
  'Minnesota Vikings': { color: '#4F2683', abbr: 'MIN', city: 'MINNESOTA' },
  // NFC South
  'Atlanta Falcons': { color: '#A71930', abbr: 'ATL', city: 'ATLANTA' },
  'Carolina Panthers': { color: '#0085CA', abbr: 'CAR', city: 'CAROLINA' },
  'New Orleans Saints': { color: '#9F8958', abbr: 'NO', city: 'NEW ORLEANS' },
  'Tampa Bay Buccaneers': { color: '#D50A0A', abbr: 'TB', city: 'TAMPA BAY' },
  // NFC West
  'Arizona Cardinals': { color: '#97233F', abbr: 'ARI', city: 'ARIZONA' },
  'Los Angeles Rams': { color: '#003594', abbr: 'LAR', city: 'LOS ANGELES' },
  'San Francisco 49ers': { color: '#AA0000', abbr: 'SF', city: 'SAN FRANCISCO' },
  'Seattle Seahawks': { color: '#002244', abbr: 'SEA', city: 'SEATTLE' },
};

export function getTeamColor(team: string): string {
  return TEAM_INFO[team]?.color ?? '#7A6A4F';
}

export function getTeamAbbr(team: string): string {
  return TEAM_INFO[team]?.abbr ?? team.slice(0, 3).toUpperCase();
}

export function getTeamCity(team: string): string {
  return TEAM_INFO[team]?.city ?? team.toUpperCase();
}
