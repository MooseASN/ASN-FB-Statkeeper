import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Calculate player stats
const calculatePlayerStats = (stats) => {
  const pts = (stats.ft_made || 0) + ((stats.fg2_made || 0) * 2) + ((stats.fg3_made || 0) * 3);
  const totalReb = (stats.offensive_rebounds || stats.oreb || 0) + (stats.defensive_rebounds || stats.dreb || 0);
  
  const fg2_made = stats.fg2_made || 0;
  const fg2_miss = stats.fg2_missed || 0;
  const fg3_made = stats.fg3_made || 0;
  const fg3_miss = stats.fg3_missed || 0;
  
  const fg_made = fg2_made + fg3_made;
  const fg_att = fg_made + fg2_miss + fg3_miss;
  const fg3_att = fg3_made + fg3_miss;
  
  const ft_made = stats.ft_made || 0;
  const ft_att = ft_made + (stats.ft_missed || 0);
  
  return { 
    pts, 
    totalReb, 
    fg: `${fg_made}-${fg_att}`,
    fg3: `${fg3_made}-${fg3_att}`,
    ft: `${ft_made}-${ft_att}`,
    ast: stats.assists || stats.assist || 0,
    pf: stats.fouls || stats.foul || stats.pf || 0,
    // Raw values for totals calculation
    raw: { fg_made, fg_att, fg3_made, fg3_att, ft_made, ft_att, totalReb, ast: stats.assists || stats.assist || 0, pf: stats.fouls || stats.foul || stats.pf || 0, pts }
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
  doubleBonus,
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

  // Calculate totals from displayed players
  const totals = displayPlayers.reduce((acc, p) => {
    acc.pts += p.raw.pts;
    acc.fg_made += p.raw.fg_made;
    acc.fg_att += p.raw.fg_att;
    acc.fg3_made += p.raw.fg3_made;
    acc.fg3_att += p.raw.fg3_att;
    acc.ft_made += p.raw.ft_made;
    acc.ft_att += p.raw.ft_att;
    acc.reb += p.raw.totalReb;
    acc.ast += p.raw.ast;
    acc.pf += p.raw.pf;
    return acc;
  }, { pts: 0, fg_made: 0, fg_att: 0, fg3_made: 0, fg3_att: 0, ft_made: 0, ft_att: 0, reb: 0, ast: 0, pf: 0 });

  return (
    <div 
      className="flex-1 flex flex-col relative overflow-hidden min-h-0"
      style={{
        background: `linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)`
      }}
    >
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full min-h-0">
        {/* Team Header Bar */}
        <div 
          className="flex items-center px-6 py-3 flex-shrink-0"
          style={{ 
            background: `linear-gradient(90deg, ${teamColor}22 0%, transparent 50%)`,
            borderBottom: `3px solid ${teamColor}`
          }}
        >
          {/* Team Logo */}
          <div className="flex-shrink-0 mr-4">
            {teamLogo ? (
              <img 
                src={teamLogo} 
                alt={teamName} 
                className="w-16 h-16 object-contain drop-shadow-lg"
              />
            ) : (
              <div 
                className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl font-black text-white shadow-lg"
                style={{ backgroundColor: teamColor }}
              >
                {teamName?.charAt(0) || '?'}
              </div>
            )}
          </div>
          
          {/* Team Name */}
          <h2 
            className="text-4xl font-black text-white uppercase tracking-wider flex-1"
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
              <span className="text-gray-300 text-base font-semibold tracking-wider uppercase">Timeouts</span>
              <span className="text-white text-3xl font-black">{timeouts}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-gray-300 text-base font-semibold tracking-wider uppercase">Fouls</span>
              <span className="text-white text-3xl font-black">{totalFouls}</span>
            </div>
            
            {(inBonus || doubleBonus) && (
              <div 
                className="px-4 py-2 rounded text-base font-black uppercase tracking-wider text-white shadow-lg ml-2"
                style={{ 
                  backgroundColor: '#1e40af',
                  border: '2px solid #3b82f6'
                }}
              >
                {doubleBonus ? "BONUS++" : "BONUS++"}
              </div>
            )}
          </div>
        </div>
        
        {/* Stats Table */}
        <div className="flex-1 px-6 py-1 min-h-0 overflow-hidden flex flex-col">
          {/* Table Header */}
          <div 
            className="grid grid-cols-[60px_1fr_70px_80px_80px_80px_70px_50px_50px] gap-1 py-2 flex-shrink-0"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            <div className="text-gray-300 text-sm font-bold uppercase tracking-wider pl-2">#</div>
            <div className="text-gray-300 text-sm font-bold uppercase tracking-wider">Player</div>
            <div className="text-gray-300 text-sm font-bold uppercase tracking-wider text-center">PTS</div>
            <div className="text-gray-300 text-sm font-bold uppercase tracking-wider text-center">FG</div>
            <div className="text-gray-300 text-sm font-bold uppercase tracking-wider text-center">3FG</div>
            <div className="text-gray-300 text-sm font-bold uppercase tracking-wider text-center">FT</div>
            <div className="text-gray-300 text-sm font-bold uppercase tracking-wider text-center">REB</div>
            <div className="text-gray-300 text-sm font-bold uppercase tracking-wider text-center">A</div>
            <div className="text-gray-300 text-sm font-bold uppercase tracking-wider text-center">PF</div>
          </div>

          {/* Player Rows */}
          <div className="flex-1 overflow-hidden">
            {displayPlayers.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-xl">
                No players on floor
              </div>
            ) : (
              displayPlayers.map((player, index) => (
                <div 
                  key={index}
                  className="grid grid-cols-[60px_1fr_70px_80px_80px_80px_70px_50px_50px] gap-1 py-2 items-center border-b border-gray-700/30"
                  style={{ backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                >
                  <div className="text-xl font-bold text-white pl-2">
                    {player.number || '?'}
                  </div>
                  <div className="text-xl font-bold text-white uppercase truncate">
                    {player.name?.split(' ').pop() || 'Unknown'}
                  </div>
                  <div className="text-xl font-black text-white text-center">
                    {player.pts}
                  </div>
                  <div className="text-lg text-white text-center">
                    {player.fg}
                  </div>
                  <div className="text-lg text-white text-center">
                    {player.fg3}
                  </div>
                  <div className="text-lg text-white text-center">
                    {player.ft}
                  </div>
                  <div className="text-lg text-white text-center">
                    {player.totalReb}
                  </div>
                  <div className="text-lg text-white text-center">
                    {player.ast}
                  </div>
                  <div className={`text-lg text-center ${player.pf >= 5 ? 'text-red-400 font-bold' : 'text-white'}`}>
                    {player.pf}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* TOTALS Row */}
          <div 
            className="grid grid-cols-[60px_1fr_70px_80px_80px_80px_70px_50px_50px] gap-1 py-2 items-center flex-shrink-0"
            style={{ backgroundColor: '#1e40af' }}
          >
            <div className="text-lg font-black text-white uppercase pl-2 col-span-2">
              TOTALS
            </div>
            <div className="text-xl font-black text-white text-center">
              {totals.pts}
            </div>
            <div className="text-lg font-bold text-white text-center">
              {totals.fg_made}-{totals.fg_att}
            </div>
            <div className="text-lg font-bold text-white text-center">
              {totals.fg3_made}-{totals.fg3_att}
            </div>
            <div className="text-lg font-bold text-white text-center">
              {totals.ft_made}-{totals.ft_att}
            </div>
            <div className="text-lg font-bold text-white text-center">
              {totals.reb}
            </div>
            <div className="text-lg font-bold text-white text-center">
              {totals.ast}
            </div>
            <div className="text-lg font-bold text-white text-center">
              {totals.pf}
            </div>
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

  // Calculate total team fouls
  const calculateTeamFouls = (stats) => {
    return stats?.reduce((sum, p) => sum + (p.fouls || p.foul || p.pf || 0), 0) || 0;
  };

  // Check bonus status (opponent's fouls determine bonus)
  const getBonus = (opponentFouls) => opponentFouls >= 7;
  const getDoubleBonus = (opponentFouls) => opponentFouls >= 10;

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
  
  const homeColor = game.home_team_color || "#6cb4ee";
  const awayColor = game.away_team_color || "#003366";

  const homeFouls = calculateTeamFouls(homeStats);
  const awayFouls = calculateTeamFouls(awayStats);

  // Calculate remaining timeouts (if using timeouts_used, otherwise show total)
  const homeTimeouts = game.home_timeouts ?? (game.total_timeouts || 5) - (game.home_timeouts_used || 0);
  const awayTimeouts = game.away_timeouts ?? (game.total_timeouts || 5) - (game.away_timeouts_used || 0);

  return (
    <div 
      className="h-screen w-screen flex flex-col overflow-hidden" 
      style={{ backgroundColor: '#0f0f1a' }}
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
        doubleBonus={getDoubleBonus(awayFouls)}
        onFloorPlayers={homeOnFloor}
        allStats={homeStats}
      />
      
      {/* Thin separator */}
      <div className="h-2 flex-shrink-0" style={{ backgroundColor: '#0a0a12' }} />
      
      {/* Away Team Panel (Bottom) */}
      <TeamPanel
        teamName={game.away_team_name}
        teamLogo={game.away_team_logo}
        teamColor={awayColor}
        timeouts={awayTimeouts}
        totalFouls={awayFouls}
        inBonus={getBonus(homeFouls)}
        doubleBonus={getDoubleBonus(homeFouls)}
        onFloorPlayers={awayOnFloor}
        allStats={awayStats}
      />
    </div>
  );
}
