import React, { useState, useEffect } from "react";
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

// Calculate team totals from all player stats
const calculateTeamTotals = (allStats) => {
  const totals = {
    fg_made: 0, fg_att: 0,
    fg3_made: 0, fg3_att: 0,
    ft_made: 0, ft_att: 0,
    reb: 0, ast: 0, tov: 0
  };
  
  allStats.forEach(p => {
    // FG (2pt + 3pt)
    totals.fg_made += (p.fg2_made || 0) + (p.fg3_made || 0);
    totals.fg_att += (p.fg2_made || 0) + (p.fg3_made || 0) + (p.fg2_missed || 0) + (p.fg3_missed || 0);
    // 3PT only
    totals.fg3_made += (p.fg3_made || 0);
    totals.fg3_att += (p.fg3_made || 0) + (p.fg3_missed || 0);
    // FT
    totals.ft_made += (p.ft_made || 0);
    totals.ft_att += (p.ft_made || 0) + (p.ft_missed || 0);
    // Other stats
    totals.reb += (p.offensive_rebounds || p.oreb || 0) + (p.defensive_rebounds || p.dreb || 0);
    totals.ast += (p.assists || p.assist || 0);
    totals.tov += (p.turnovers || p.turnover || p.tov || 0);
  });
  
  return totals;
};

// Format percentage
const formatPct = (made, att) => {
  if (att === 0) return "0%";
  return `${Math.round((made / att) * 100)}%`;
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
      className="flex-1 flex flex-col relative overflow-hidden min-h-0"
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
      <div className="relative z-10 flex flex-col h-full min-h-0">
        {/* Team Header Bar */}
        <div className="flex items-center px-6 py-2 flex-shrink-0">
          {/* Team Logo */}
          <div className="flex-shrink-0 mr-4">
            {teamLogo ? (
              <img 
                src={teamLogo} 
                alt={teamName} 
                className="w-14 h-14 object-contain drop-shadow-lg"
              />
            ) : (
              <div 
                className="w-14 h-14 rounded-lg flex items-center justify-center text-3xl font-black text-white shadow-lg"
                style={{ backgroundColor: teamColor }}
              >
                {teamName?.charAt(0) || '?'}
              </div>
            )}
          </div>
          
          {/* Team Name */}
          <h2 
            className="text-4xl font-black text-white uppercase tracking-widest flex-1"
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
              <span className="text-gray-300 text-sm font-semibold tracking-wider uppercase">Timeouts</span>
              <span className="text-white text-2xl font-black">{timeouts}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-gray-300 text-sm font-semibold tracking-wider uppercase">Fouls</span>
              <span className="text-white text-2xl font-black">{totalFouls}</span>
            </div>
            
            {inBonus && (
              <div 
                className="px-4 py-1 rounded text-sm font-black uppercase tracking-wider text-white shadow-lg ml-2"
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
          className="h-1 mx-6 flex-shrink-0"
          style={{ 
            backgroundColor: teamColor,
            boxShadow: `0 0 10px ${teamColor}`
          }}
        />
        
        {/* Stats Table */}
        <div className="flex-1 px-6 py-1 min-h-0 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[50px_1fr_70px_80px_70px_60px_50px_50px] gap-1 py-1 border-b border-gray-600/50">
            <div className="text-gray-400 text-sm font-semibold uppercase tracking-wider">#</div>
            <div className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Player</div>
            <div className="text-gray-400 text-sm font-semibold uppercase tracking-wider text-center">PTS</div>
            <div className="text-gray-400 text-sm font-semibold uppercase tracking-wider text-center">FG</div>
            <div className="text-gray-400 text-sm font-semibold uppercase tracking-wider text-center">FT</div>
            <div className="text-gray-400 text-sm font-semibold uppercase tracking-wider text-center">REB</div>
            <div className="text-gray-400 text-sm font-semibold uppercase tracking-wider text-center">A</div>
            <div className="text-gray-400 text-sm font-semibold uppercase tracking-wider text-center">PF</div>
          </div>

          {/* Player Rows */}
          <div>
            {displayPlayers.length === 0 ? (
              <div className="py-4 text-center text-gray-400 text-lg">
                No players on floor
              </div>
            ) : (
              displayPlayers.map((player, index) => (
                <div 
                  key={index}
                  className="grid grid-cols-[50px_1fr_70px_80px_70px_60px_50px_50px] gap-1 py-1.5 items-center border-b border-gray-700/20"
                >
                  <div className="text-xl font-bold text-white">
                    {player.number || '?'}
                  </div>
                  <div className="text-lg font-bold text-white uppercase truncate">
                    {player.name?.split(' ').pop() || 'Unknown'}
                  </div>
                  <div className="text-xl font-black text-white text-center">
                    {player.pts}
                  </div>
                  <div className="text-base text-white text-center">
                    {player.fg}
                  </div>
                  <div className="text-base text-white text-center">
                    {player.ft}
                  </div>
                  <div className="text-base text-white text-center">
                    {player.totalReb}
                  </div>
                  <div className="text-base text-white text-center">
                    {player.ast}
                  </div>
                  <div className={`text-base text-center ${player.pf >= 5 ? 'text-red-400 font-bold' : 'text-white'}`}>
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

// Stat Block for team comparison
function StatBlock({ label, homeValue, awayValue, homeColor, awayColor }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-center gap-4">
        <span className="text-white font-bold text-sm" style={{ color: homeColor }}>{homeValue}</span>
        <span className="text-gray-500">|</span>
        <span className="text-white font-bold text-sm" style={{ color: awayColor }}>{awayValue}</span>
      </div>
    </div>
  );
}

// Team Stats Bar Component
function TeamStatsBar({ homeStats, awayStats, homeColor, awayColor, homeTeamName, awayTeamName }) {
  const homeTotals = calculateTeamTotals(homeStats);
  const awayTotals = calculateTeamTotals(awayStats);
  
  return (
    <div 
      className="flex-shrink-0 px-8 py-3"
      style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d1f3c 100%)' }}
    >
      {/* Team names header */}
      <div className="flex justify-center gap-8 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: homeColor }} />
          <span className="text-white text-sm font-bold uppercase">{homeTeamName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: awayColor }} />
          <span className="text-white text-sm font-bold uppercase">{awayTeamName}</span>
        </div>
      </div>
      
      {/* Stats row */}
      <div className="flex justify-center gap-8">
        <StatBlock 
          label="FG" 
          homeValue={`${homeTotals.fg_made}/${homeTotals.fg_att} ${formatPct(homeTotals.fg_made, homeTotals.fg_att)}`}
          awayValue={`${awayTotals.fg_made}/${awayTotals.fg_att} ${formatPct(awayTotals.fg_made, awayTotals.fg_att)}`}
          homeColor={homeColor}
          awayColor={awayColor}
        />
        <StatBlock 
          label="3PT" 
          homeValue={`${homeTotals.fg3_made}/${homeTotals.fg3_att} ${formatPct(homeTotals.fg3_made, homeTotals.fg3_att)}`}
          awayValue={`${awayTotals.fg3_made}/${awayTotals.fg3_att} ${formatPct(awayTotals.fg3_made, awayTotals.fg3_att)}`}
          homeColor={homeColor}
          awayColor={awayColor}
        />
        <StatBlock 
          label="FT" 
          homeValue={`${homeTotals.ft_made}/${homeTotals.ft_att} ${formatPct(homeTotals.ft_made, homeTotals.ft_att)}`}
          awayValue={`${awayTotals.ft_made}/${awayTotals.ft_att} ${formatPct(awayTotals.ft_made, awayTotals.ft_att)}`}
          homeColor={homeColor}
          awayColor={awayColor}
        />
        <StatBlock 
          label="REB" 
          homeValue={homeTotals.reb}
          awayValue={awayTotals.reb}
          homeColor={homeColor}
          awayColor={awayColor}
        />
        <StatBlock 
          label="AST" 
          homeValue={homeTotals.ast}
          awayValue={awayTotals.ast}
          homeColor={homeColor}
          awayColor={awayColor}
        />
        <StatBlock 
          label="TOV" 
          homeValue={homeTotals.tov}
          awayValue={awayTotals.tov}
          homeColor={homeColor}
          awayColor={awayColor}
        />
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
      {/* Home Team Panel (Top) */}
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
      
      {/* Thin separator line */}
      <div className="h-[2px] flex-shrink-0 bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
      
      {/* Away Team Panel (Bottom) */}
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
      
      {/* Team Stats Bar (Bottom) */}
      <TeamStatsBar
        homeStats={homeStats}
        awayStats={awayStats}
        homeColor={homeColor}
        awayColor={awayColor}
        homeTeamName={game.home_team_name}
        awayTeamName={game.away_team_name}
      />
    </div>
  );
}
