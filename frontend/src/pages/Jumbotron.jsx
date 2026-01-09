import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Calculate player stats
const calculatePlayerStats = (stats) => {
  const pts = (stats.ft_made || 0) + ((stats.fg2_made || 0) * 2) + ((stats.fg3_made || 0) * 3);
  const totalReb = (stats.offensive_rebounds || stats.oreb || 0) + (stats.defensive_rebounds || stats.dreb || 0);
  const fg_made = (stats.fg2_made || 0) + (stats.fg3_made || 0);
  const fg_att = fg_made + (stats.fg2_missed || 0) + (stats.fg3_missed || 0);
  const ft_made = stats.ft_made || 0;
  const ft_att = (stats.ft_made || 0) + (stats.ft_missed || 0);
  
  return { 
    pts, 
    totalReb, 
    fg: `${fg_made}-${fg_att}`,
    ft: `${ft_made}-${ft_att}`,
    ast: stats.assists || stats.assist || 0,
    pf: stats.fouls || stats.foul || stats.pf || 0
  };
};

// Team Panel Component - Broadcast Style Stacked Layout
function TeamPanel({ 
  teamName, 
  teamLogo, 
  teamColor, 
  timeouts, 
  totalFouls, 
  inBonus,
  onFloorPlayers,
  allStats
}) {
  // Get stats for players on floor (or top 5 by points)
  let displayPlayers = [];
  
  if (onFloorPlayers && onFloorPlayers.length > 0) {
    displayPlayers = onFloorPlayers.map(playerId => {
      const player = allStats.find(p => p.id === playerId);
      if (!player) return null;
      const calc = calculatePlayerStats(player);
      return {
        number: player.player_number || player.number,
        name: player.player_name || player.name,
        ...calc
      };
    }).filter(Boolean);
  } else if (allStats && allStats.length > 0) {
    // Show top 5 by points if no players on floor
    displayPlayers = [...allStats]
      .map(player => ({
        number: player.player_number || player.number,
        name: player.player_name || player.name,
        ...calculatePlayerStats(player)
      }))
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 5);
  }

  // Sort by jersey number
  displayPlayers.sort((a, b) => parseInt(a.number || 0) - parseInt(b.number || 0));

  return (
    <div 
      className="flex-1 flex flex-col relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, #0d1f3c 0%, #162d50 50%, #1a3a5c 100%)`
      }}
    >
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(100, 150, 255, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100, 150, 255, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
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
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <span className="text-gray-300 text-lg font-semibold tracking-wider uppercase">Timeouts</span>
              <span className="text-white text-3xl font-black">{timeouts}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-gray-300 text-lg font-semibold tracking-wider uppercase">Fouls</span>
              <span className="text-white text-3xl font-black">{totalFouls}</span>
            </div>
            
            {inBonus && (
              <div 
                className="px-5 py-2 rounded text-lg font-black uppercase tracking-wider text-white shadow-lg ml-4"
                style={{ 
                  backgroundColor: '#0ea5e9',
                  boxShadow: '0 0 20px rgba(14, 165, 233, 0.5)'
                }}
              >
                BONUS
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
          <div className="grid grid-cols-[60px_1fr_80px_100px_80px_80px_60px_60px] gap-2 py-3 border-b border-gray-600/50">
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
            {displayPlayers.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-2xl">
                No players on floor
              </div>
            ) : (
              displayPlayers.map((player, index) => (
                <div 
                  key={index}
                  className="grid grid-cols-[60px_1fr_80px_100px_80px_80px_60px_60px] gap-2 py-3 items-center"
                >
                  <div className="text-2xl font-bold text-white">
                    {player.number || '?'}
                  </div>
                  <div className="text-2xl font-bold text-white uppercase truncate">
                    {player.name?.split(' ').pop() || 'Unknown'}
                  </div>
                  <div className="text-2xl font-black text-white text-center">
                    {player.pts}
                  </div>
                  <div className="text-xl text-white text-center">
                    {player.fg}
                  </div>
                  <div className="text-xl text-white text-center">
                    {player.ft}
                  </div>
                  <div className="text-xl text-white text-center">
                    {player.totalReb}
                  </div>
                  <div className="text-xl text-white text-center">
                    {player.ast}
                  </div>
                  <div className={`text-xl text-center ${player.pf >= 5 ? 'text-red-400 font-bold' : 'text-white'}`}>
                    {player.pf}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Jumbotron() {
  const { shareCode } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let hasLoadedOnce = false;
    
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API}/games/share/${shareCode}`);
        if (mounted) {
          setGame(res.data);
          hasLoadedOnce = true;
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching game:", err);
        if (mounted && !hasLoadedOnce) {
          setLoading(false);
        }
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
    return stats?.reduce((sum, p) => sum + (p.fouls || p.foul || p.pf || 0), 0) || 0;
  };

  // Check bonus status (opponent's fouls determine bonus)
  const getBonus = (opponentFouls) => opponentFouls >= 7;

  // Show loading only on initial load
  if (loading && !game) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#0a1628' }}>
        <div className="text-white text-3xl font-bold tracking-wider animate-pulse">LOADING...</div>
      </div>
    );
  }

  // Show error only if we never got any data
  if (!game) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#0a1628' }}>
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Game Not Found</h2>
          <p className="text-gray-400">Unable to load game data for share code: {shareCode}</p>
        </div>
      </div>
    );
  }

  const homeStats = game.home_player_stats || [];
  const awayStats = game.away_player_stats || [];
  const homeOnFloor = game.home_on_floor || [];
  const awayOnFloor = game.away_on_floor || [];
  
  const homeColor = game.home_team_color || "#d4a017";
  const awayColor = game.away_team_color || "#8b0000";

  const homeFouls = calculateTeamFouls(homeStats);
  const awayFouls = calculateTeamFouls(awayStats);

  // Calculate remaining timeouts (if using timeouts_used, otherwise show total)
  const homeTimeouts = game.home_timeouts ?? (game.total_timeouts || 5) - (game.home_timeouts_used || 0);
  const awayTimeouts = game.away_timeouts ?? (game.total_timeouts || 5) - (game.away_timeouts_used || 0);

  return (
    <div 
      className="h-screen w-screen flex flex-col overflow-hidden" 
      style={{ backgroundColor: '#0a1628' }}
      data-testid="jumbotron-page"
    >
      {/* Home Team Panel (Top Half) */}
      <TeamPanel
        teamName={game.home_team_name}
        teamLogo={game.home_team_logo}
        teamColor={homeColor}
        timeouts={homeTimeouts}
        totalFouls={homeFouls}
        inBonus={getBonus(awayFouls)}
        onFloorPlayers={homeOnFloor}
        allStats={homeStats}
      />
      
      {/* Thin separator line with subtle glow */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
      
      {/* Away Team Panel (Bottom Half) */}
      <TeamPanel
        teamName={game.away_team_name}
        teamLogo={game.away_team_logo}
        teamColor={awayColor}
        timeouts={awayTimeouts}
        totalFouls={awayFouls}
        inBonus={getBonus(homeFouls)}
        onFloorPlayers={awayOnFloor}
        allStats={awayStats}
      />
    </div>
  );
}
