export const TEAM_INFO: Record<string, { color: string; color2: string; abbr: string; city: string }> = {
  // AFC East
  'Buffalo Bills':          { color: '#00338D', color2: '#C60C30', abbr: 'BUF', city: 'BUFFALO' },
  'Miami Dolphins':         { color: '#008E97', color2: '#FC4C02', abbr: 'MIA', city: 'MIAMI' },
  'New England Patriots':   { color: '#002244', color2: '#C60C30', abbr: 'NE',  city: 'NEW ENGLAND' },
  'New York Jets':          { color: '#125740', color2: '#000000', abbr: 'NYJ', city: 'NEW YORK' },
  // AFC North
  'Baltimore Ravens':       { color: '#241773', color2: '#9E7C0C', abbr: 'BAL', city: 'BALTIMORE' },
  'Cincinnati Bengals':     { color: '#FB4F14', color2: '#000000', abbr: 'CIN', city: 'CINCINNATI' },
  'Cleveland Browns':       { color: '#311D00', color2: '#FF3C00', abbr: 'CLE', city: 'CLEVELAND' },
  'Pittsburgh Steelers':    { color: '#FFB612', color2: '#101820', abbr: 'PIT', city: 'PITTSBURGH' },
  // AFC South
  'Houston Texans':         { color: '#03202F', color2: '#C60C30', abbr: 'HOU', city: 'HOUSTON' },
  'Indianapolis Colts':     { color: '#002C5F', color2: '#A2AAAD', abbr: 'IND', city: 'INDIANAPOLIS' },
  'Jacksonville Jaguars':   { color: '#006778', color2: '#9F792C', abbr: 'JAX', city: 'JACKSONVILLE' },
  'Tennessee Titans':       { color: '#0C2340', color2: '#4B92DB', abbr: 'TEN', city: 'TENNESSEE' },
  // AFC West
  'Denver Broncos':         { color: '#FB4F14', color2: '#002244', abbr: 'DEN', city: 'DENVER' },
  'Kansas City Chiefs':     { color: '#E31837', color2: '#FFB81C', abbr: 'KC',  city: 'KANSAS CITY' },
  'Las Vegas Raiders':      { color: '#1A1A1A', color2: '#A5ACAF', abbr: 'LV',  city: 'LAS VEGAS' },
  'Los Angeles Chargers':   { color: '#0080C6', color2: '#FFC20E', abbr: 'LAC', city: 'LOS ANGELES' },
  // NFC East
  'Dallas Cowboys':         { color: '#041E42', color2: '#869397', abbr: 'DAL', city: 'DALLAS' },
  'New York Giants':        { color: '#0B2265', color2: '#A71930', abbr: 'NYG', city: 'NEW YORK' },
  'Philadelphia Eagles':    { color: '#004C54', color2: '#A5ACAF', abbr: 'PHI', city: 'PHILADELPHIA' },
  'Washington Commanders':  { color: '#5A1414', color2: '#FFB612', abbr: 'WSH', city: 'WASHINGTON' },
  // NFC North
  'Chicago Bears':          { color: '#0B162A', color2: '#C83803', abbr: 'CHI', city: 'CHICAGO' },
  'Detroit Lions':          { color: '#0076B6', color2: '#B0B7BC', abbr: 'DET', city: 'DETROIT' },
  'Green Bay Packers':      { color: '#203731', color2: '#FFB612', abbr: 'GB',  city: 'GREEN BAY' },
  'Minnesota Vikings':      { color: '#4F2683', color2: '#FFC62F', abbr: 'MIN', city: 'MINNESOTA' },
  // NFC South
  'Atlanta Falcons':        { color: '#A71930', color2: '#000000', abbr: 'ATL', city: 'ATLANTA' },
  'Carolina Panthers':      { color: '#0085CA', color2: '#101820', abbr: 'CAR', city: 'CAROLINA' },
  'New Orleans Saints':     { color: '#9F8958', color2: '#101820', abbr: 'NO',  city: 'NEW ORLEANS' },
  'Tampa Bay Buccaneers':   { color: '#D50A0A', color2: '#FF7900', abbr: 'TB',  city: 'TAMPA BAY' },
  // NFC West
  'Arizona Cardinals':      { color: '#97233F', color2: '#000000', abbr: 'ARI', city: 'ARIZONA' },
  'Los Angeles Rams':       { color: '#003594', color2: '#FFA300', abbr: 'LAR', city: 'LOS ANGELES' },
  'San Francisco 49ers':    { color: '#AA0000', color2: '#B3995D', abbr: 'SF',  city: 'SAN FRANCISCO' },
  'Seattle Seahawks':       { color: '#002244', color2: '#69BE28', abbr: 'SEA', city: 'SEATTLE' },
};

export function getTeamColor(team: string): string {
  return TEAM_INFO[team]?.color ?? '#7A6A4F';
}

export function getTeamColor2(team: string): string {
  return TEAM_INFO[team]?.color2 ?? '#5A4E3A';
}

export function getTeamAbbr(team: string): string {
  return TEAM_INFO[team]?.abbr ?? team.slice(0, 3).toUpperCase();
}

export function getTeamCity(team: string): string {
  return TEAM_INFO[team]?.city ?? team.toUpperCase();
}
