import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Calculate player points
const calculatePoints = (player) => {
  const fg2 = (player.fg2_made || 0) * 2;
  const fg3 = (player.fg3_made || 0) * 3;
  const ft = player.ft_made || 0;
  return fg2 + fg3 + ft;
};

// Calculate FG string (made-attempted)
const calculateFG = (player) => {
  const made = (player.fg2_made || 0) + (player.fg3_made || 0);
  const attempted = made + (player.fg2_missed || 0) + (player.fg3_missed || 0);
  return `${made}-${attempted}`;
};

// Calculate FT string (made-attempted)
const calculateFT = (player) => {
  const made = player.ft_made || 0;
  const attempted = made + (player.ft_missed || 0);
  return `${made}-${attempted}`;
};

// Calculate rebounds
const calculateRebounds = (player) => {
  return (player.oreb || player.offensive_rebounds || 0) + 
         (player.dreb || player.defensive_rebounds || 0);
};

export default function JumbotronOutput() {
  const { shareCode } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch game data
  const fetchGame = async () => {
    try {
      const response = await axios.get(`${API}/games/share/${shareCode}`);
      setGame(response.data);
      setError(null);
    } catch (err) {
      setError("Game not found");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGame();
    // Auto-refresh every 3 seconds for live updates
    const interval = setInterval(fetchGame, 3000);
    return () => clearInterval(interval);
  }, [shareCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-red-500 text-2xl">{error || "Game not found"}</div>
      </div>
    );
  }

  // Get colors
  const homeColor = game.home_team_color || "#dc2626";
  const awayColor = game.away_team_color || "#2563eb";

  // Get players on floor
  const homeOnFloor = game.home_on_floor || [];
  const awayOnFloor = game.away_on_floor || [];

  // Get player stats
  const homeStats = game.home_player_stats || [];
  const awayStats = game.away_player_stats || [];

  // Filter to only players on floor
  const homeFloorPlayers = homeStats.filter(p => homeOnFloor.includes(p.id));
  const awayFloorPlayers = awayStats.filter(p => awayOnFloor.includes(p.id));

  // If no players on floor, show roster players with stats instead
  const homeDisplayPlayers = homeFloorPlayers.length > 0 ? homeFloorPlayers : homeStats.slice(0, 5);
  const awayDisplayPlayers = awayFloorPlayers.length > 0 ? awayFloorPlayers : awayStats.slice(0, 5);

  // Calculate team fouls
  const homeTeamFouls = homeStats.reduce((sum, p) => sum + (p.foul || p.fouls || 0), 0);
  const awayTeamFouls = awayStats.reduce((sum, p) => sum + (p.foul || p.fouls || 0), 0);

  // Check bonus status (5+ fouls = bonus, 7+ = double bonus in college)
  const homeInBonus = awayTeamFouls >= 7;
  const awayInBonus = homeTeamFouls >= 7;
  const homeInDoubleBonus = awayTeamFouls >= 10;
  const awayInDoubleBonus = homeTeamFouls >= 10;

  // Get timeouts
  const homeTimeouts = game.home_timeouts ?? 5;
  const awayTimeouts = game.away_timeouts ?? 5;

  // Team Panel Component
  const TeamPanel = ({ 
    teamName, 
    teamLogo, 
    teamColor, 
    timeouts, 
    fouls, 
    inBonus, 
    inDoubleBonus, 
    players,
    isHome 
  }) => (
    <div className="flex-1 flex flex-col">
      {/* Team Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b-2 border-zinc-700">
        <div className="flex items-center gap-4">
          {/* Team Logo */}
          {teamLogo ? (
            <img src={teamLogo} alt={teamName} className="w-16 h-16 object-contain" />
          ) : (
            <div 
              className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl font-black text-white"
              style={{ backgroundColor: teamColor }}
            >
              {teamName?.charAt(0) || '?'}
            </div>
          )}
          {/* Team Name */}
          <h2 className="text-4xl font-black text-white uppercase tracking-wide">
            {teamName}
          </h2>
        </div>
        
        {/* Team Stats */}
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-zinc-400 text-sm uppercase tracking-wider">Timeouts</div>
            <div className="text-white text-3xl font-bold">{timeouts}</div>
          </div>
          <div className="text-center">
            <div className="text-zinc-400 text-sm uppercase tracking-wider">Fouls</div>
            <div className="text-white text-3xl font-bold">{fouls}</div>
          </div>
          {(inBonus || inDoubleBonus) && (
            <div 
              className="px-4 py-2 rounded-lg text-xl font-bold"
              style={{ backgroundColor: teamColor }}
            >
              {inDoubleBonus ? 'DOUBLE BONUS' : 'BONUS'}
            </div>
          )}
        </div>
      </div>

      {/* Player Stats Table */}
      <div className="flex-1 overflow-hidden">
        {/* Table Header */}
        <div 
          className="grid grid-cols-8 gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider"
          style={{ backgroundColor: `${teamColor}40` }}
        >
          <div className="text-zinc-300">#</div>
          <div className="text-zinc-300 col-span-2">Player</div>
          <div className="text-zinc-300 text-center">PTS</div>
          <div className="text-zinc-300 text-center">FG</div>
          <div className="text-zinc-300 text-center">FT</div>
          <div className="text-zinc-300 text-center">REB</div>
          <div className="text-zinc-300 text-center">A</div>
        </div>

        {/* Player Rows */}
        <div className="divide-y divide-zinc-800">
          {players.length === 0 ? (
            <div className="px-6 py-8 text-center text-zinc-500 text-xl">
              No players on floor
            </div>
          ) : (
            players.map((player, index) => (
              <div 
                key={player.id || index}
                className="grid grid-cols-8 gap-2 px-6 py-4 items-center hover:bg-zinc-800/30 transition-colors"
              >
                <div className="text-2xl font-bold text-white">
                  {player.player_number || player.number || '?'}
                </div>
                <div className="col-span-2 text-xl font-semibold text-white truncate uppercase">
                  {player.player_name?.split(' ').pop() || player.name || 'Unknown'}
                </div>
                <div className="text-2xl font-bold text-center" style={{ color: teamColor }}>
                  {calculatePoints(player)}
                </div>
                <div className="text-xl text-center text-zinc-300">
                  {calculateFG(player)}
                </div>
                <div className="text-xl text-center text-zinc-300">
                  {calculateFT(player)}
                </div>
                <div className="text-xl text-center text-zinc-300">
                  {calculateRebounds(player)}
                </div>
                <div className="text-xl text-center text-zinc-300">
                  {player.assist || player.assists || 0}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col">
      {/* Home Team Panel */}
      <TeamPanel
        teamName={game.home_team_name}
        teamLogo={game.home_team_logo}
        teamColor={homeColor}
        timeouts={homeTimeouts}
        fouls={homeTeamFouls}
        inBonus={homeInBonus}
        inDoubleBonus={homeInDoubleBonus}
        players={homeDisplayPlayers}
        isHome={true}
      />
      
      {/* Divider */}
      <div className="h-1 bg-zinc-700" />
      
      {/* Away Team Panel */}
      <TeamPanel
        teamName={game.away_team_name}
        teamLogo={game.away_team_logo}
        teamColor={awayColor}
        timeouts={awayTimeouts}
        fouls={awayTeamFouls}
        inBonus={awayInBonus}
        inDoubleBonus={awayInDoubleBonus}
        players={awayDisplayPlayers}
        isHome={false}
      />
    </div>
  );
}
