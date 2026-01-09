// Demo data for basketball and football demos

// Basketball demo teams - 10 players each
export const basketballDemoTeams = {
  home: {
    id: "demo-home-basketball",
    name: "Northside Tigers",
    color: "#f97316", // Orange
    players: [
      { id: "bh1", name: "Marcus Johnson", number: "1" },
      { id: "bh2", name: "Darius Williams", number: "3" },
      { id: "bh3", name: "Tyler Brown", number: "5" },
      { id: "bh4", name: "Jordan Davis", number: "10" },
      { id: "bh5", name: "Chris Martinez", number: "12" },
      { id: "bh6", name: "Andre Thompson", number: "15" },
      { id: "bh7", name: "Kevin Moore", number: "21" },
      { id: "bh8", name: "Isaiah Jackson", number: "23" },
      { id: "bh9", name: "DeShawn Harris", number: "32" },
      { id: "bh10", name: "Malik Robinson", number: "45" },
    ]
  },
  away: {
    id: "demo-away-basketball",
    name: "Eastwood Eagles",
    color: "#3b82f6", // Blue
    players: [
      { id: "ba1", name: "Jaylen Carter", number: "0" },
      { id: "ba2", name: "Brandon Lee", number: "2" },
      { id: "ba3", name: "Cameron White", number: "4" },
      { id: "ba4", name: "Xavier Green", number: "11" },
      { id: "ba5", name: "Terrence Hall", number: "13" },
      { id: "ba6", name: "Dominic Young", number: "20" },
      { id: "ba7", name: "Aaron King", number: "22" },
      { id: "ba8", name: "Maurice Wright", number: "24" },
      { id: "ba9", name: "Lamar Scott", number: "33" },
      { id: "ba10", name: "Rashad Adams", number: "44" },
    ]
  }
};

// Football demo teams - 50 players each
export const footballDemoTeams = {
  home: {
    id: "demo-home-football",
    name: "Central Wolves",
    color: "#dc2626", // Red
    players: [
      // Quarterbacks
      { id: "fh1", name: "Jake Mitchell", number: "7", position: "QB" },
      { id: "fh2", name: "Ryan Cooper", number: "12", position: "QB" },
      // Running Backs
      { id: "fh3", name: "DeAndre Williams", number: "22", position: "RB" },
      { id: "fh4", name: "Marcus Bell", number: "28", position: "RB" },
      { id: "fh5", name: "Tyrone Jackson", number: "34", position: "RB" },
      // Wide Receivers
      { id: "fh6", name: "Chris Johnson", number: "1", position: "WR" },
      { id: "fh7", name: "Darius Brown", number: "11", position: "WR" },
      { id: "fh8", name: "Kevin Thomas", number: "14", position: "WR" },
      { id: "fh9", name: "Andre Davis", number: "18", position: "WR" },
      { id: "fh10", name: "Malik Harris", number: "81", position: "WR" },
      // Tight Ends
      { id: "fh11", name: "Tyler Martinez", number: "85", position: "TE" },
      { id: "fh12", name: "Brandon Moore", number: "88", position: "TE" },
      // Offensive Line
      { id: "fh13", name: "James Wilson", number: "70", position: "OL" },
      { id: "fh14", name: "Michael Thompson", number: "71", position: "OL" },
      { id: "fh15", name: "David Garcia", number: "72", position: "OL" },
      { id: "fh16", name: "Robert Lee", number: "73", position: "OL" },
      { id: "fh17", name: "Anthony White", number: "74", position: "OL" },
      { id: "fh18", name: "Joshua Clark", number: "75", position: "OL" },
      { id: "fh19", name: "Daniel Lewis", number: "76", position: "OL" },
      // Defensive Line
      { id: "fh20", name: "Jamal Robinson", number: "90", position: "DL" },
      { id: "fh21", name: "Terrell Young", number: "91", position: "DL" },
      { id: "fh22", name: "Marcus King", number: "92", position: "DL" },
      { id: "fh23", name: "Derek Wright", number: "93", position: "DL" },
      { id: "fh24", name: "Corey Scott", number: "94", position: "DL" },
      // Linebackers
      { id: "fh25", name: "Jordan Adams", number: "50", position: "LB" },
      { id: "fh26", name: "Cameron Hall", number: "51", position: "LB" },
      { id: "fh27", name: "Isaiah Green", number: "52", position: "LB" },
      { id: "fh28", name: "Xavier Carter", number: "54", position: "LB" },
      { id: "fh29", name: "Dominic Taylor", number: "55", position: "LB" },
      { id: "fh30", name: "Lamar Mitchell", number: "56", position: "LB" },
      // Defensive Backs
      { id: "fh31", name: "Aaron Phillips", number: "20", position: "DB" },
      { id: "fh32", name: "Brandon Turner", number: "21", position: "DB" },
      { id: "fh33", name: "Chris Campbell", number: "23", position: "DB" },
      { id: "fh34", name: "Deshawn Parker", number: "24", position: "DB" },
      { id: "fh35", name: "Jaylen Edwards", number: "25", position: "DB" },
      { id: "fh36", name: "Kevin Morgan", number: "26", position: "DB" },
      { id: "fh37", name: "Maurice Bailey", number: "27", position: "DB" },
      { id: "fh38", name: "Rashad Collins", number: "29", position: "DB" },
      // Specialists
      { id: "fh39", name: "Tyler Henderson", number: "3", position: "K" },
      { id: "fh40", name: "Ryan Brooks", number: "8", position: "P" },
      { id: "fh41", name: "Alex Rivera", number: "47", position: "LS" },
      // Additional depth
      { id: "fh42", name: "Nick Foster", number: "15", position: "WR" },
      { id: "fh43", name: "Sean Murphy", number: "33", position: "RB" },
      { id: "fh44", name: "Brian Ward", number: "42", position: "FB" },
      { id: "fh45", name: "Eric Patterson", number: "57", position: "LB" },
      { id: "fh46", name: "Travis Reed", number: "77", position: "OL" },
      { id: "fh47", name: "Greg Sanders", number: "95", position: "DL" },
      { id: "fh48", name: "Tony Price", number: "30", position: "DB" },
      { id: "fh49", name: "Matt Howard", number: "84", position: "TE" },
      { id: "fh50", name: "Steve Rogers", number: "16", position: "QB" },
    ]
  },
  away: {
    id: "demo-away-football",
    name: "Riverside Panthers",
    color: "#7c3aed", // Purple
    players: [
      // Quarterbacks
      { id: "fa1", name: "Ethan Brooks", number: "10", position: "QB" },
      { id: "fa2", name: "Noah Williams", number: "5", position: "QB" },
      // Running Backs
      { id: "fa3", name: "Jamal Thompson", number: "25", position: "RB" },
      { id: "fa4", name: "Tyrell Davis", number: "32", position: "RB" },
      { id: "fa5", name: "Donte Harris", number: "38", position: "RB" },
      // Wide Receivers
      { id: "fa6", name: "Calvin Moore", number: "2", position: "WR" },
      { id: "fa7", name: "Darius Jackson", number: "9", position: "WR" },
      { id: "fa8", name: "Andre Wilson", number: "13", position: "WR" },
      { id: "fa9", name: "Marcus Lee", number: "17", position: "WR" },
      { id: "fa10", name: "Terrence Brown", number: "82", position: "WR" },
      // Tight Ends
      { id: "fa11", name: "Kyle Martinez", number: "86", position: "TE" },
      { id: "fa12", name: "Jason Taylor", number: "89", position: "TE" },
      // Offensive Line
      { id: "fa13", name: "Marcus Garcia", number: "60", position: "OL" },
      { id: "fa14", name: "David Robinson", number: "61", position: "OL" },
      { id: "fa15", name: "Anthony Clark", number: "62", position: "OL" },
      { id: "fa16", name: "Brian Lewis", number: "63", position: "OL" },
      { id: "fa17", name: "Chris White", number: "64", position: "OL" },
      { id: "fa18", name: "Derek Young", number: "65", position: "OL" },
      { id: "fa19", name: "Eric King", number: "66", position: "OL" },
      // Defensive Line
      { id: "fa20", name: "Jamal Wright", number: "96", position: "DL" },
      { id: "fa21", name: "Corey Scott", number: "97", position: "DL" },
      { id: "fa22", name: "Marcus Adams", number: "98", position: "DL" },
      { id: "fa23", name: "Terrell Hall", number: "99", position: "DL" },
      { id: "fa24", name: "Jordan Green", number: "91", position: "DL" },
      // Linebackers
      { id: "fa25", name: "Cameron Carter", number: "40", position: "LB" },
      { id: "fa26", name: "Isaiah Taylor", number: "41", position: "LB" },
      { id: "fa27", name: "Xavier Mitchell", number: "43", position: "LB" },
      { id: "fa28", name: "Dominic Phillips", number: "44", position: "LB" },
      { id: "fa29", name: "Lamar Turner", number: "45", position: "LB" },
      { id: "fa30", name: "Aaron Campbell", number: "46", position: "LB" },
      // Defensive Backs
      { id: "fa31", name: "Brandon Parker", number: "20", position: "DB" },
      { id: "fa32", name: "Chris Edwards", number: "21", position: "DB" },
      { id: "fa33", name: "Deshawn Morgan", number: "22", position: "DB" },
      { id: "fa34", name: "Jaylen Bailey", number: "23", position: "DB" },
      { id: "fa35", name: "Kevin Collins", number: "24", position: "DB" },
      { id: "fa36", name: "Maurice Henderson", number: "26", position: "DB" },
      { id: "fa37", name: "Rashad Brooks", number: "27", position: "DB" },
      { id: "fa38", name: "Tyler Rivera", number: "28", position: "DB" },
      // Specialists
      { id: "fa39", name: "Ryan Foster", number: "4", position: "K" },
      { id: "fa40", name: "Alex Murphy", number: "6", position: "P" },
      { id: "fa41", name: "Nick Ward", number: "48", position: "LS" },
      // Additional depth
      { id: "fa42", name: "Sean Patterson", number: "14", position: "WR" },
      { id: "fa43", name: "Brian Reed", number: "35", position: "RB" },
      { id: "fa44", name: "Eric Sanders", number: "42", position: "FB" },
      { id: "fa45", name: "Travis Price", number: "47", position: "LB" },
      { id: "fa46", name: "Greg Howard", number: "67", position: "OL" },
      { id: "fa47", name: "Tony Rogers", number: "92", position: "DL" },
      { id: "fa48", name: "Matt Foster", number: "29", position: "DB" },
      { id: "fa49", name: "Steve Murphy", number: "87", position: "TE" },
      { id: "fa50", name: "Jack Williams", number: "8", position: "QB" },
    ]
  }
};

// Initialize player stats for basketball
export const initializeBasketballPlayerStats = (players) => {
  return players.map(player => ({
    ...player,
    stats: {
      points: 0,
      fgMade: 0,
      fgAttempted: 0,
      threePtMade: 0,
      threePtAttempted: 0,
      ftMade: 0,
      ftAttempted: 0,
      offRebounds: 0,
      defRebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fouls: 0
    },
    onFloor: false
  }));
};

// Create demo game object for basketball
export const createBasketballDemoGame = () => ({
  id: "demo-basketball-game",
  sport: "basketball",
  status: "live",
  home_team_id: basketballDemoTeams.home.id,
  away_team_id: basketballDemoTeams.away.id,
  home_team_name: basketballDemoTeams.home.name,
  away_team_name: basketballDemoTeams.away.name,
  home_team_color: basketballDemoTeams.home.color,
  away_team_color: basketballDemoTeams.away.color,
  home_score: 0,
  away_score: 0,
  period: 1,
  home_timeouts: 5,
  away_timeouts: 5,
  home_fouls: 0,
  away_fouls: 0,
  home_players: initializeBasketballPlayerStats(basketballDemoTeams.home.players),
  away_players: initializeBasketballPlayerStats(basketballDemoTeams.away.players),
  isDemo: true
});

// Create demo game object for football
export const createFootballDemoGame = () => ({
  id: "demo-football-game",
  sport: "football",
  status: "live",
  home_team_id: footballDemoTeams.home.id,
  away_team_id: footballDemoTeams.away.id,
  home_team_name: footballDemoTeams.home.name,
  away_team_name: footballDemoTeams.away.name,
  home_team_color: footballDemoTeams.home.color,
  away_team_color: footballDemoTeams.away.color,
  home_score: 0,
  away_score: 0,
  quarter: 1,
  home_timeouts: 3,
  away_timeouts: 3,
  possession: "home",
  ball_position: 25,
  down: 1,
  distance: 10,
  home_roster: footballDemoTeams.home.players,
  away_roster: footballDemoTeams.away.players,
  isDemo: true
});
