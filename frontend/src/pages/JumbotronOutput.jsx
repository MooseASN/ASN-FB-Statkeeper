import { useState, useEffect, useCallback } from "react";
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

// Calculate personal fouls
const calculatePF = (player) => {
  return player.foul || player.fouls || player.pf || 0;
};

// Team Panel Component - Broadcast Style (defined outside main component)
function TeamPanel({ 
  teamName, 
  teamLogo, 
  teamColor, 
  timeouts, 
  fouls, 
  bonusStatus,
  players,
  isTop
}) {
  return (
    <div 
      className="flex-1 flex flex-col relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, #0d1f3c 0%, #162d50 50%, #1a3a5c 100%)`
      }}
    >
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(100, 150, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100, 150, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Team Header Bar */}
        <div className="flex items-center px-8 py-4">
          {/* Team Logo */}
          <div className="flex-shrink-0 mr-6">
            {teamLogo ? (
              <img 
                src={teamLogo} 
                alt={teamName} 
                className="w-20 h-20 object-contain drop-shadow-lg"
              />
            ) : (
              <div 
                className="w-20 h-20 rounded-lg flex items-center justify-center text-5xl font-black text-white shadow-lg"
                style={{ backgroundColor: teamColor }}
              >
                {teamName?.charAt(0) || '?'}
              </div>
            )}
          </div>
          
          {/* Team Name */}
          <h2 
            className="text-5xl font-black text-white uppercase tracking-widest flex-1"
            style={{ 
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              fontFamily: "'Arial Black', 'Helvetica Black', sans-serif"
            }}
          >
            {teamName}
          </h2>
          
          {/* Stats Section */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-gray-300 text-lg font-semibold tracking-wider uppercase">Timeouts</span>
              <span className="text-white text-3xl font-black">{timeouts}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-gray-300 text-lg font-semibold tracking-wider uppercase">Fouls</span>
              <span className="text-white text-3xl font-black">{fouls}</span>
            </div>
            
            {bonusStatus && (
              <div 
                className="px-5 py-2 rounded text-lg font-black uppercase tracking-wider text-white shadow-lg"
                style={{ 
                  backgroundColor: bonusStatus === 'double_bonus' ? '#dc2626' : '#eab308',
                  color: bonusStatus === 'double_bonus' ? '#ffffff' : '#000000',
                  boxShadow: bonusStatus === 'double_bonus' 
                    ? '0 0 20px rgba(220, 38, 38, 0.5)' 
                    : '0 0 20px rgba(234, 179, 8, 0.5)'
                }}
              >
                {bonusStatus === 'double_bonus' ? '2X BONUS' : 'BONUS'}
              </div>
            )}
          </div>
        </div>
        
        {/* Team color accent line */}
        <div 
          className="h-1 mx-8"
          style={{ 
            backgroundColor: teamColor,
            boxShadow: `0 0 10px ${teamColor}`
          }}
        />
        
        {/* Stats Table */}
        <div className="flex-1 px-8 py-2">
          {/* Table Header */}
          <div className="grid grid-cols-[60px_1fr_80px_90px_80px_80px_60px_60px] gap-2 py-3 border-b border-gray-600/50">
            <div className="text-gray-400 text-base font-semibold uppercase tracking-wider">#</div>
            <div className="text-gray-400 text-base font-semibold uppercase tracking-wider">Player</div>
            <div className="text-gray-400 text-base font-semibold uppercase tracking-wider text-center">PTS</div>
            <div className="text-gray-400 text-base font-semibold uppercase tracking-wider text-center">FG</div>
            <div className="text-gray-400 text-base font-semibold uppercase tracking-wider text-center">FT</div>
            <div className="text-gray-400 text-base font-semibold uppercase tracking-wider text-center">REB</div>
            <div className="text-gray-400 text-base font-semibold uppercase tracking-wider text-center">A</div>
            <div className="text-gray-400 text-base font-semibold uppercase tracking-wider text-center">PF</div>
          </div>

          {/* Player Rows */}
          <div className="divide-y divide-gray-700/30">
            {players.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-2xl">
                No players on floor
              </div>
            ) : (
              players.map((player, index) => (
                <div 
                  key={player.id || index}
                  className="grid grid-cols-[60px_1fr_80px_90px_80px_80px_60px_60px] gap-2 py-3 items-center"
                >
                  <div className="text-2xl font-bold text-white">
                    {player.player_number || player.number || '?'}
                  </div>
                  <div className="text-2xl font-bold text-white uppercase truncate">
                    {player.player_name?.split(' ').pop() || player.name?.split(' ').pop() || 'Unknown'}
                  </div>
                  <div className="text-2xl font-black text-white text-center">
                    {calculatePoints(player)}
                  </div>
                  <div className="text-xl text-white text-center">
                    {calculateFG(player)}
                  </div>
                  <div className="text-xl text-white text-center">
                    {calculateFT(player)}
                  </div>
                  <div className="text-xl text-white text-center">
                    {calculateRebounds(player)}
                  </div>
                  <div className="text-xl text-white text-center">
                    {player.assist || player.assists || 0}
                  </div>
                  <div className="text-xl text-white text-center">
                    {calculatePF(player)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Corner accents */}
      <div 
        className={`absolute ${isTop ? 'top-0 left-0' : 'bottom-0 left-0'} w-4 h-4`}
        style={{ 
          borderLeft: `3px solid ${teamColor}`, 
          borderTop: isTop ? `3px solid ${teamColor}` : 'none', 
          borderBottom: !isTop ? `3px solid ${teamColor}` : 'none' 
        }}
      />
      <div 
        className={`absolute ${isTop ? 'top-0 right-0' : 'bottom-0 right-0'} w-4 h-4`}
        style={{ 
          borderRight: `3px solid ${teamColor}`, 
          borderTop: isTop ? `3px solid ${teamColor}` : 'none', 
          borderBottom: !isTop ? `3px solid ${teamColor}` : 'none' 
        }}
      />
    </div>
  );
}

export default function JumbotronOutput() {
  const { shareCode } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch game data
  const fetchGame = useCallback(async () => {
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
  }, [shareCode]);

  useEffect(() => {
    fetchGame();
    // Auto-refresh every 3 seconds for live updates
    const interval = setInterval(fetchGame, 3000);
    return () => clearInterval(interval);
  }, [fetchGame]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-white text-3xl font-bold tracking-wider animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-red-400 text-3xl font-bold">{error || "Game not found"}</div>
      </div>
    );
  }

  // Get colors - use team colors or defaults
  const homeColor = game.home_team_color || "#d4a017"; // Gold/yellow default
  const awayColor = game.away_team_color || "#8b0000"; // Cardinal red default

  // Get players on floor
  const homeOnFloor = game.home_on_floor || [];
  const awayOnFloor = game.away_on_floor || [];

  // Get player stats
  const homeStats = game.home_player_stats || [];
  const awayStats = game.away_player_stats || [];

  // Filter to only players on floor, or show top 5 by points
  const homeFloorPlayers = homeOnFloor.length > 0 
    ? homeStats.filter(p => homeOnFloor.includes(p.id))
    : [...homeStats].sort((a, b) => calculatePoints(b) - calculatePoints(a)).slice(0, 5);
  
  const awayFloorPlayers = awayOnFloor.length > 0
    ? awayStats.filter(p => awayOnFloor.includes(p.id))
    : [...awayStats].sort((a, b) => calculatePoints(b) - calculatePoints(a)).slice(0, 5);

  // Calculate team fouls from game data or player stats
  const homeTeamFouls = game.home_team_fouls ?? homeStats.reduce((sum, p) => sum + calculatePF(p), 0);
  const awayTeamFouls = game.away_team_fouls ?? awayStats.reduce((sum, p) => sum + calculatePF(p), 0);

  // Get bonus status from game (auto-calculated) or calculate from settings
  const getBonusStatus = (opponentFouls, gameBonus) => {
    // If game has explicit bonus status, use it
    if (gameBonus) return gameBonus;
    
    // Otherwise calculate from settings
    const bonusEnabled = game.bonus_enabled ?? true;
    const doubleBonusEnabled = game.double_bonus_enabled ?? true;
    const bonusFouls = game.bonus_fouls ?? 7;
    const doubleBonusFouls = game.double_bonus_fouls ?? 10;
    
    if (doubleBonusEnabled && opponentFouls >= doubleBonusFouls) {
      return "double_bonus";
    } else if (bonusEnabled && opponentFouls >= bonusFouls) {
      return "bonus";
    }
    return null;
  };

  // Home team bonus is based on AWAY team fouls
  const homeBonusStatus = getBonusStatus(awayTeamFouls, game.home_bonus);
  const awayBonusStatus = getBonusStatus(homeTeamFouls, game.away_bonus);

  // Get timeouts (default 5 for college, 7 for NBA)
  const homeTimeouts = game.home_timeouts ?? 5;
  const awayTimeouts = game.away_timeouts ?? 5;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#0a1628' }}>
      {/* Home Team Panel (Top) */}
      <TeamPanel
        teamName={game.home_team_name}
        teamLogo={game.home_team_logo}
        teamColor={homeColor}
        timeouts={homeTimeouts}
        fouls={homeTeamFouls}
        inBonus={homeInBonus}
        players={homeFloorPlayers}
        isTop={true}
      />
      
      {/* Thin separator line */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
      
      {/* Away Team Panel (Bottom) */}
      <TeamPanel
        teamName={game.away_team_name}
        teamLogo={game.away_team_logo}
        teamColor={awayColor}
        timeouts={awayTimeouts}
        fouls={awayTeamFouls}
        inBonus={awayInBonus}
        players={awayFloorPlayers}
        isTop={false}
      />
    </div>
  );
}
