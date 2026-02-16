import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Calculate player stats (same as Jumbotron.jsx)
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
    raw: { fg_made, fg_att, fg3_made, fg3_att, ft_made, ft_att, totalReb, ast: stats.assists || stats.assist || 0, pf: stats.fouls || stats.foul || stats.pf || 0, pts }
  };
};

// Broadcast font style
const broadcastFont = {
  fontFamily: "'Arial Black', 'Helvetica Black', Impact, sans-serif",
  textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
};

// Team Panel Component
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
    displayPlayers = [...allStats]
      .map(player => ({
        number: player.player_number || player.number,
        name: player.player_name || player.name,
        ...calculatePlayerStats(player)
      }))
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 5);
  }

  displayPlayers.sort((a, b) => parseInt(a.number || 0) - parseInt(b.number || 0));

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
      {/* Team Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ 
          backgroundColor: teamColor,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
        }}
      >
        <div className="flex items-center gap-3">
          {teamLogo && (
            <img src={teamLogo} alt="" className="h-10 w-10 object-contain" />
          )}
          <span className="text-2xl font-black text-white uppercase tracking-wider" style={broadcastFont}>
            {teamName}
          </span>
        </div>
        <div className="flex items-center gap-6 text-white">
          <div className="text-center">
            <div className="text-xs uppercase opacity-80">TO</div>
            <div className="text-xl font-black" style={broadcastFont}>{timeouts}</div>
          </div>
          <div className="text-center">
            <div className="text-xs uppercase opacity-80">FOULS</div>
            <div className="text-xl font-black" style={broadcastFont}>{totalFouls}</div>
          </div>
          {(inBonus || doubleBonus) && (
            <div 
              className="px-3 py-1 rounded text-sm font-black uppercase"
              style={{ 
                backgroundColor: doubleBonus ? '#dc2626' : '#f59e0b',
                ...broadcastFont
              }}
            >
              {doubleBonus ? '2X BONUS' : 'BONUS'}
            </div>
          )}
        </div>
      </div>

      {/* Stats Table */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-2 py-1">
        <table className="w-full text-white border-collapse" style={{ fontSize: 'clamp(10px, 1.5vw, 16px)' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <th className="text-left py-1 px-2 font-black uppercase" style={broadcastFont}>#</th>
              <th className="text-left py-1 px-2 font-black uppercase" style={broadcastFont}>Player</th>
              <th className="text-center py-1 px-2 font-black uppercase" style={broadcastFont}>FG</th>
              <th className="text-center py-1 px-2 font-black uppercase" style={broadcastFont}>3PT</th>
              <th className="text-center py-1 px-2 font-black uppercase" style={broadcastFont}>FT</th>
              <th className="text-center py-1 px-2 font-black uppercase" style={broadcastFont}>REB</th>
              <th className="text-center py-1 px-2 font-black uppercase" style={broadcastFont}>AST</th>
              <th className="text-center py-1 px-2 font-black uppercase" style={broadcastFont}>PF</th>
              <th className="text-center py-1 px-2 font-black uppercase text-yellow-400" style={broadcastFont}>PTS</th>
            </tr>
          </thead>
          <tbody>
            {displayPlayers.map((player, idx) => (
              <tr 
                key={idx} 
                style={{ backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent' }}
              >
                <td className="py-1 px-2 font-bold" style={{ color: teamColor }}>{player.number}</td>
                <td className="py-1 px-2 font-semibold truncate max-w-[120px]">{player.name}</td>
                <td className="text-center py-1 px-2">{player.fg}</td>
                <td className="text-center py-1 px-2">{player.fg3}</td>
                <td className="text-center py-1 px-2">{player.ft}</td>
                <td className="text-center py-1 px-2">{player.totalReb}</td>
                <td className="text-center py-1 px-2">{player.ast}</td>
                <td className="text-center py-1 px-2">{player.pf}</td>
                <td className="text-center py-1 px-2 font-black text-yellow-400" style={broadcastFont}>{player.pts}</td>
              </tr>
            ))}
            {/* Totals Row */}
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderTop: '2px solid rgba(255,255,255,0.3)' }}>
              <td className="py-1 px-2" colSpan={2}>
                <span className="font-black uppercase" style={broadcastFont}>TOTALS</span>
              </td>
              <td className="text-center py-1 px-2 font-bold">{totals.fg_made}-{totals.fg_att}</td>
              <td className="text-center py-1 px-2 font-bold">{totals.fg3_made}-{totals.fg3_att}</td>
              <td className="text-center py-1 px-2 font-bold">{totals.ft_made}-{totals.ft_att}</td>
              <td className="text-center py-1 px-2 font-bold">{totals.reb}</td>
              <td className="text-center py-1 px-2 font-bold">{totals.ast}</td>
              <td className="text-center py-1 px-2 font-bold">{totals.pf}</td>
              <td className="text-center py-1 px-2 font-black text-yellow-400 text-lg" style={broadcastFont}>{totals.pts}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function JumbotronLive() {
  const { embedCode } = useParams();
  const [config, setConfig] = useState(null);
  const [currentSource, setCurrentSource] = useState(null);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch jumbotron config and determine current source
  useEffect(() => {
    let mounted = true;
    
    const fetchConfig = async () => {
      try {
        const res = await axios.get(`${API}/jumbotron/embed/${embedCode}`, { withCredentials: false });
        if (mounted) {
          setConfig(res.data.config);
          setCurrentSource(res.data.current_source);
        }
      } catch (err) {
        console.error("Failed to load jumbotron config:", err);
        if (mounted) {
          setError("Jumbotron not found");
          setLoading(false);
        }
      }
    };
    
    fetchConfig();
    // Refresh config every 30 seconds to check for schedule changes
    const configInterval = setInterval(fetchConfig, 30000);
    
    return () => {
      mounted = false;
      clearInterval(configInterval);
    };
  }, [embedCode]);

  // Fetch game data based on current source
  useEffect(() => {
    if (!currentSource) return;
    
    let mounted = true;
    let hasLoadedOnce = false;
    
    const fetchGameData = async () => {
      try {
        if (currentSource.source_type === 'statmoose') {
          // Extract share code from URL if it's a full URL
          let shareCode = currentSource.source_url;
          if (shareCode.includes('/jumbotron/')) {
            shareCode = shareCode.split('/jumbotron/').pop();
          } else if (shareCode.includes('/share/')) {
            shareCode = shareCode.split('/share/').pop();
          }
          
          const res = await axios.get(`${API}/games/share/${shareCode}`, { withCredentials: false });
          if (mounted) {
            setGame(res.data);
            hasLoadedOnce = true;
            setLoading(false);
          }
        } else if (currentSource.source_type === 'prestosports') {
          // Parse PrestoSports XML
          const res = await axios.post(`${API}/jumbotron/parse-prestosports`, 
            { url: currentSource.source_url },
            { withCredentials: false }
          );
          if (mounted) {
            setGame(res.data);
            hasLoadedOnce = true;
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Error fetching game data:", err);
        if (mounted && !hasLoadedOnce) {
          setLoading(false);
        }
      }
    };
    
    fetchGameData();
    // Refresh game data every 2 seconds for live updates
    const gameInterval = setInterval(fetchGameData, 2000);
    
    return () => {
      mounted = false;
      clearInterval(gameInterval);
    };
  }, [currentSource]);

  const calculateTeamFouls = (stats) => {
    return stats?.reduce((sum, p) => sum + (p.fouls || p.foul || p.pf || 0), 0) || 0;
  };

  const getBonus = (opponentFouls) => opponentFouls >= 7;
  const getDoubleBonus = (opponentFouls) => opponentFouls >= 10;

  if (loading && !game) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#0a1628' }}>
        <div className="text-white text-5xl animate-pulse" style={broadcastFont}>LOADING...</div>
      </div>
    );
  }

  if (error || (!game && !loading)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#0a1628' }}>
        <div className="text-center">
          <h2 className="text-5xl text-white mb-4" style={broadcastFont}>{error || "No Game Data"}</h2>
          <p className="text-gray-400 text-2xl">Embed code: {embedCode}</p>
          {currentSource && (
            <p className="text-gray-500 text-lg mt-2">Source: {currentSource.source_type}</p>
          )}
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#0a1628' }}>
        <div className="text-white text-3xl" style={broadcastFont}>Waiting for game data...</div>
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

  const homeTimeouts = game.home_timeouts ?? (game.total_timeouts || 5) - (game.home_timeouts_used || 0);
  const awayTimeouts = game.away_timeouts ?? (game.total_timeouts || 5) - (game.away_timeouts_used || 0);

  return (
    <div 
      className="h-screen w-screen flex flex-col overflow-hidden" 
      style={{ 
        backgroundColor: '#0f0f1a',
        width: config?.width ? `${config.width}px` : '100%',
        height: config?.height ? `${config.height}px` : '100%'
      }} 
      data-testid="jumbotron-live-page"
    >
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
      
      <div className="h-2 flex-shrink-0" style={{ backgroundColor: '#0a0a12' }} />
      
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
      
      {/* Schedule indicator - small badge showing current slot */}
      {currentSource?.label && (
        <div 
          className="absolute bottom-2 right-2 px-3 py-1 rounded bg-black/60 text-white text-xs"
          style={broadcastFont}
        >
          {currentSource.label}
        </div>
      )}
    </div>
  );
}
