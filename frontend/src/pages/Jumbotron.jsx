import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { RefreshCw } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Calculate player stats
const calculatePlayerStats = (stats) => {
  const pts = stats.ft_made + (stats.fg2_made * 2) + (stats.fg3_made * 3);
  const totalReb = stats.offensive_rebounds + stats.defensive_rebounds;
  const fg_made = stats.fg2_made + stats.fg3_made;
  const fg_att = fg_made + stats.fg2_missed + stats.fg3_missed;
  const ft_made = stats.ft_made;
  const ft_att = stats.ft_made + stats.ft_missed;
  
  return { 
    pts, 
    totalReb, 
    fg: `${fg_made}-${fg_att}`,
    ft: `${ft_made}-${ft_att}`,
    ast: stats.assists,
    pf: stats.fouls
  };
};

// Team Panel Component - displays one team's info and on-floor players
const TeamPanel = ({ team, teamName, teamLogo, teamColor, score, timeoutsUsed, totalTimeouts, totalFouls, bonusStatus, onFloorPlayers, allStats, isHome }) => {
  // Get stats for players on floor
  const onFloorStats = onFloorPlayers.map(playerId => {
    const player = allStats.find(p => p.id === playerId);
    if (!player) return null;
    const calc = calculatePlayerStats(player);
    return {
      number: player.player_number,
      name: player.player_name,
      ...calc
    };
  }).filter(Boolean);

  // Sort by jersey number
  onFloorStats.sort((a, b) => parseInt(a.number) - parseInt(b.number));

  return (
    <div className="flex-1 flex flex-col" data-testid={`${team}-panel`}>
      {/* Team Header */}
      <div className="flex items-center gap-4 mb-4 px-4">
        {/* Logo */}
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center border-4 overflow-hidden bg-zinc-700 flex-shrink-0"
          style={{ borderColor: teamColor }}
        >
          {teamLogo ? (
            <img src={teamLogo} alt={teamName} className="w-16 h-16 object-contain" />
          ) : (
            <span className="text-3xl font-bold text-white">{teamName?.charAt(0)}</span>
          )}
        </div>
        
        {/* Team Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-white">{teamName}</h2>
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: teamColor }}></div>
          </div>
          
          {/* Score */}
          <div className="text-5xl font-bold text-white" style={{ color: teamColor }}>
            {score}
          </div>
        </div>
        
        {/* Team Stats Column */}
        <div className="text-right">
          {/* Timeouts */}
          <div className="flex items-center justify-end gap-1 mb-2">
            <span className="text-zinc-400 text-sm mr-2">TO:</span>
            {Array.from({ length: totalTimeouts || 4 }, (_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: i < (timeoutsUsed || 0) ? '#6b7280' : teamColor
                }}
              />
            ))}
          </div>
          
          {/* Team Fouls */}
          <div className="text-zinc-400 text-sm">
            Team Fouls: <span className="text-white font-bold">{totalFouls}</span>
          </div>
          
          {/* Bonus Status */}
          {bonusStatus && (
            <div className="mt-1">
              <span className="text-xs font-bold px-2 py-1 bg-yellow-500 text-black rounded">
                {bonusStatus === "double_bonus" ? "DOUBLE BONUS" : "BONUS"}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Players Table */}
      <div className="flex-1 px-4">
        <table className="w-full">
          <thead>
            <tr className="text-zinc-400 text-sm border-b border-zinc-600">
              <th className="text-left py-2 w-12">#</th>
              <th className="text-left py-2">PLAYER</th>
              <th className="text-center py-2 w-16">PTS</th>
              <th className="text-center py-2 w-16">FG</th>
              <th className="text-center py-2 w-16">FT</th>
              <th className="text-center py-2 w-12">REB</th>
              <th className="text-center py-2 w-12">A</th>
              <th className="text-center py-2 w-12">PF</th>
            </tr>
          </thead>
          <tbody>
            {onFloorStats.length > 0 ? (
              onFloorStats.map((player, idx) => (
                <tr 
                  key={idx} 
                  className="text-white border-b border-zinc-700/50 hover:bg-zinc-700/30"
                >
                  <td className="py-3 font-bold" style={{ color: teamColor }}>
                    {player.number}
                  </td>
                  <td className="py-3 font-medium truncate max-w-[150px]">
                    {player.name}
                  </td>
                  <td className="py-3 text-center font-bold text-xl">
                    {player.pts}
                  </td>
                  <td className="py-3 text-center text-zinc-300">
                    {player.fg}
                  </td>
                  <td className="py-3 text-center text-zinc-300">
                    {player.ft}
                  </td>
                  <td className="py-3 text-center">
                    {player.totalReb}
                  </td>
                  <td className="py-3 text-center">
                    {player.ast}
                  </td>
                  <td className="py-3 text-center">
                    {player.pf >= 5 ? (
                      <span className="text-red-500 font-bold">{player.pf}</span>
                    ) : player.pf}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="py-8 text-center text-zinc-500">
                  No players on floor
                </td>
              </tr>
            )}
            {/* Fill empty rows to maintain consistent height */}
            {onFloorStats.length < 5 && Array.from({ length: 5 - onFloorStats.length }, (_, i) => (
              <tr key={`empty-${i}`} className="border-b border-zinc-700/50">
                <td colSpan="8" className="py-3">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function Jumbotron() {
  const { shareCode } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = React.useRef(false);

  useEffect(() => {
    let mounted = true;
    hasLoadedOnce.current = false;
    setLoading(true);
    
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API}/games/share/${shareCode}`);
        if (mounted) {
          setGame(res.data);
          hasLoadedOnce.current = true;
          setLoading(false);
        }
      } catch (err) {
        if (mounted && !hasLoadedOnce.current) {
          // Only set loading false on first failed attempt
          setLoading(false);
        }
        // If we've loaded once, silently ignore errors (keep showing last data)
      }
    };
    
    // Initial fetch
    fetchData();
    
    // Auto-refresh every 2 seconds
    const interval = setInterval(fetchData, 2000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [shareCode]);

  // Calculate score from quarter scores
  const calculateScore = (team) => {
    return game?.quarter_scores?.[team]?.reduce((a, b) => a + b, 0) || 0;
  };

  // Calculate total team fouls
  const calculateTeamFouls = (stats) => {
    return stats?.reduce((sum, p) => sum + (p.fouls || 0), 0) || 0;
  };

  // Get quarter/period label
  const getQuarterLabel = (q) => {
    const label = game?.period_label === "Period" ? "P" : "Q";
    if (q <= 4) return `${label}${q}`;
    return `OT${q - 4}`;
  };

  // Format clock time
  const formatClockTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto text-zinc-400" />
          <p className="mt-4 text-zinc-400">Loading jumbotron...</p>
        </div>
      </div>
    );
  }

  if (initialLoadFailed && !game) {
    return (
      <div className="min-h-screen bg-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Game Not Found</h2>
          <p className="text-zinc-400">Unable to load game data.</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto text-zinc-400" />
          <p className="mt-4 text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  const homeStats = game.home_player_stats || [];
  const awayStats = game.away_player_stats || [];
  const homeOnFloor = game.home_on_floor || [];
  const awayOnFloor = game.away_on_floor || [];
  
  const homeColor = game.home_team_color || "#dc2626";
  const awayColor = game.away_team_color || "#7c3aed";

  return (
    <div className="min-h-screen bg-zinc-800 flex flex-col" data-testid="jumbotron-page">
      {/* Header - Game Status */}
      <div className="bg-zinc-900 py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo-black.png" alt="StatMoose" className="w-6 h-6 invert opacity-60" />
          <span className="text-zinc-400 text-sm font-medium">StatMoose</span>
        </div>
        
        {/* Center - Clock and Period */}
        <div className="flex items-center gap-6">
          {game.clock_enabled && (
            <div className="text-4xl font-mono font-bold text-white">
              {formatClockTime(game.clock_time || 0)}
            </div>
          )}
          
          <div className={`text-lg font-bold px-4 py-1.5 rounded-lg ${
            game.status === "active" 
              ? (game.is_halftime ? "bg-orange-600" : "bg-green-600")
              : game.status === "scheduled" 
                ? "bg-blue-600" 
                : "bg-zinc-600"
          } text-white`}>
            {game.status === "active" 
              ? (game.is_halftime ? "HALFTIME" : getQuarterLabel(game.current_quarter))
              : game.status === "scheduled" 
                ? "NOT STARTED" 
                : "FINAL"}
          </div>
        </div>
        
        {/* Right side - Live indicator */}
        {game.status === "active" && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-red-400 text-sm font-bold">LIVE</span>
          </div>
        )}
        {game.status !== "active" && <div className="w-20"></div>}
      </div>

      {/* Main Content - Two Team Panels */}
      <div className="flex-1 flex divide-x divide-zinc-700">
        {/* Home Team */}
        <TeamPanel
          team="home"
          teamName={game.home_team_name}
          teamLogo={game.home_team_logo}
          teamColor={homeColor}
          score={calculateScore("home")}
          timeoutsUsed={game.home_timeouts_used}
          totalTimeouts={game.total_timeouts}
          totalFouls={calculateTeamFouls(homeStats)}
          bonusStatus={game.home_bonus}
          onFloorPlayers={homeOnFloor}
          allStats={homeStats}
          isHome={true}
        />
        
        {/* Away Team */}
        <TeamPanel
          team="away"
          teamName={game.away_team_name}
          teamLogo={game.away_team_logo}
          teamColor={awayColor}
          score={calculateScore("away")}
          timeoutsUsed={game.away_timeouts_used}
          totalTimeouts={game.total_timeouts}
          totalFouls={calculateTeamFouls(awayStats)}
          bonusStatus={game.away_bonus}
          onFloorPlayers={awayOnFloor}
          allStats={awayStats}
          isHome={false}
        />
      </div>

      {/* Footer - Score summary */}
      <div className="bg-zinc-900 py-2 px-6">
        <div className="flex items-center justify-center gap-8 text-zinc-400 text-sm">
          <span>{game.home_team_name}: <strong className="text-white">{calculateScore("home")}</strong></span>
          <span className="text-zinc-600">|</span>
          <span>{game.away_team_name}: <strong className="text-white">{calculateScore("away")}</strong></span>
        </div>
      </div>
    </div>
  );
}
