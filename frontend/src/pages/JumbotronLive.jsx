import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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
    stl: stats.steals || stats.steal || 0,
    blk: stats.blocks || stats.block || 0,
    pf: stats.fouls || stats.foul || stats.pf || 0,
    raw: { fg_made, fg_att, fg3_made, fg3_att, ft_made, ft_att, totalReb, ast: stats.assists || stats.assist || 0, pf: stats.fouls || stats.foul || stats.pf || 0, pts }
  };
};

// Get stat leaders from a team
const getStatLeaders = (stats, count = 3) => {
  if (!stats || stats.length === 0) return [];
  
  const processed = stats.map(player => ({
    id: player.id,
    number: player.player_number || player.number,
    name: player.player_name || player.name,
    ...calculatePlayerStats(player)
  }));
  
  return processed.sort((a, b) => b.pts - a.pts).slice(0, count);
};

// Calculate team total score
const calculateTeamScore = (stats) => {
  if (!stats || stats.length === 0) return 0;
  return stats.reduce((sum, p) => {
    return sum + (p.ft_made || 0) + ((p.fg2_made || 0) * 2) + ((p.fg3_made || 0) * 3);
  }, 0);
};

// ============ FULL DISPLAY LAYOUT (HD/4K screens) ============
function FullDisplayLayout({ game, homeStats, awayStats, homeOnFloor, awayOnFloor }) {
  const homeColor = game.home_team_color || "#6cb4ee";
  const awayColor = game.away_team_color || "#003366";
  
  const calculateTeamFouls = (stats) => {
    return stats?.reduce((sum, p) => sum + (p.fouls || p.foul || p.pf || 0), 0) || 0;
  };
  
  const homeFouls = calculateTeamFouls(homeStats);
  const awayFouls = calculateTeamFouls(awayStats);
  const homeTimeouts = game.home_timeouts ?? 5;
  const awayTimeouts = game.away_timeouts ?? 5;
  
  const getBonus = (fouls) => fouls >= 7;
  const getDoubleBonus = (fouls) => fouls >= 10;
  
  // Get display players
  const getDisplayPlayers = (stats, onFloor) => {
    let players = [];
    if (onFloor && onFloor.length > 0) {
      players = onFloor.map(id => {
        const p = stats.find(s => s.id === id);
        if (!p) return null;
        return { ...p, ...calculatePlayerStats(p) };
      }).filter(Boolean);
    } else if (stats && stats.length > 0) {
      players = stats.map(p => ({ ...p, ...calculatePlayerStats(p) }))
        .sort((a, b) => b.pts - a.pts).slice(0, 5);
    }
    return players.sort((a, b) => parseInt(a.player_number || 0) - parseInt(b.player_number || 0));
  };
  
  const homePlayers = getDisplayPlayers(homeStats, homeOnFloor);
  const awayPlayers = getDisplayPlayers(awayStats, awayOnFloor);
  
  const TeamPanel = ({ teamName, teamLogo, teamColor, players, timeouts, fouls, inBonus, doubleBonus }) => {
    const totals = players.reduce((acc, p) => {
      acc.pts += p.raw?.pts || 0;
      acc.fg_made += p.raw?.fg_made || 0;
      acc.fg_att += p.raw?.fg_att || 0;
      acc.fg3_made += p.raw?.fg3_made || 0;
      acc.fg3_att += p.raw?.fg3_att || 0;
      acc.ft_made += p.raw?.ft_made || 0;
      acc.ft_att += p.raw?.ft_att || 0;
      acc.reb += p.raw?.totalReb || 0;
      acc.ast += p.raw?.ast || 0;
      acc.pf += p.raw?.pf || 0;
      return acc;
    }, { pts: 0, fg_made: 0, fg_att: 0, fg3_made: 0, fg3_att: 0, ft_made: 0, ft_att: 0, reb: 0, ast: 0, pf: 0 });
    
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: 'linear-gradient(180deg, #0d1117 0%, #161b22 100%)' }}>
        {/* Team Header */}
        <div className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: teamColor }}>
          <div className="flex items-center gap-4">
            {teamLogo && <img src={teamLogo} alt="" className="h-14 w-14 object-contain" />}
            <span className="text-3xl font-bold text-white uppercase tracking-wide">{teamName}</span>
          </div>
          <div className="flex items-center gap-8 text-white">
            <div className="text-center">
              <div className="text-xs uppercase opacity-70 tracking-wider">TIMEOUTS</div>
              <div className="text-2xl font-bold">{timeouts}</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase opacity-70 tracking-wider">FOULS</div>
              <div className="text-2xl font-bold">{fouls}</div>
            </div>
            {(inBonus || doubleBonus) && (
              <div className="px-4 py-2 rounded-lg font-bold uppercase text-sm tracking-wider"
                style={{ backgroundColor: doubleBonus ? '#dc2626' : '#f59e0b' }}>
                {doubleBonus ? 'DOUBLE BONUS' : 'BONUS'}
              </div>
            )}
          </div>
        </div>
        
        {/* Stats Table - fills remaining space */}
        <div className="flex-1 overflow-hidden px-4 py-2">
          <table className="w-full h-full text-white" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="bg-black/40">
                <th className="w-[8%] py-2 text-center font-bold uppercase text-sm tracking-wider">#</th>
                <th className="w-[22%] py-2 text-left font-bold uppercase text-sm tracking-wider">PLAYER</th>
                <th className="w-[10%] py-2 text-center font-bold uppercase text-sm tracking-wider">FG</th>
                <th className="w-[10%] py-2 text-center font-bold uppercase text-sm tracking-wider">3PT</th>
                <th className="w-[10%] py-2 text-center font-bold uppercase text-sm tracking-wider">FT</th>
                <th className="w-[10%] py-2 text-center font-bold uppercase text-sm tracking-wider">REB</th>
                <th className="w-[10%] py-2 text-center font-bold uppercase text-sm tracking-wider">AST</th>
                <th className="w-[8%] py-2 text-center font-bold uppercase text-sm tracking-wider">PF</th>
                <th className="w-[12%] py-2 text-center font-bold uppercase text-sm tracking-wider text-yellow-400">PTS</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white/5' : ''}>
                  <td className="py-2 text-center font-bold text-lg" style={{ color: teamColor }}>
                    {player.player_number || player.number}
                  </td>
                  <td className="py-2 text-left font-semibold truncate text-base">
                    {player.player_name || player.name}
                  </td>
                  <td className="py-2 text-center text-base">{player.fg}</td>
                  <td className="py-2 text-center text-base">{player.fg3}</td>
                  <td className="py-2 text-center text-base">{player.ft}</td>
                  <td className="py-2 text-center text-base">{player.totalReb}</td>
                  <td className="py-2 text-center text-base">{player.ast}</td>
                  <td className="py-2 text-center text-base">{player.pf}</td>
                  <td className="py-2 text-center font-bold text-xl text-yellow-400">{player.pts}</td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="bg-black/60 border-t-2 border-white/20">
                <td className="py-2" colSpan={2}>
                  <span className="font-bold uppercase text-sm tracking-wider pl-4">TEAM TOTALS</span>
                </td>
                <td className="py-2 text-center font-semibold">{totals.fg_made}-{totals.fg_att}</td>
                <td className="py-2 text-center font-semibold">{totals.fg3_made}-{totals.fg3_att}</td>
                <td className="py-2 text-center font-semibold">{totals.ft_made}-{totals.ft_att}</td>
                <td className="py-2 text-center font-semibold">{totals.reb}</td>
                <td className="py-2 text-center font-semibold">{totals.ast}</td>
                <td className="py-2 text-center font-semibold">{totals.pf}</td>
                <td className="py-2 text-center font-bold text-2xl text-yellow-400">{totals.pts}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: '#0a0a12' }}>
      <TeamPanel 
        teamName={game.home_team_name}
        teamLogo={game.home_team_logo}
        teamColor={homeColor}
        players={homePlayers}
        timeouts={homeTimeouts}
        fouls={homeFouls}
        inBonus={getBonus(awayFouls)}
        doubleBonus={getDoubleBonus(awayFouls)}
      />
      <div className="h-1 flex-shrink-0" style={{ backgroundColor: '#1a1a2e' }} />
      <TeamPanel 
        teamName={game.away_team_name}
        teamLogo={game.away_team_logo}
        teamColor={awayColor}
        players={awayPlayers}
        timeouts={awayTimeouts}
        fouls={awayFouls}
        inBonus={getBonus(homeFouls)}
        doubleBonus={getDoubleBonus(homeFouls)}
      />
    </div>
  );
}

// ============ SCORERS TABLE LAYOUT (Short & Wide) ============
function ScorersTableLayout({ game, homeStats, awayStats }) {
  const homeColor = game.home_team_color || "#6cb4ee";
  const awayColor = game.away_team_color || "#003366";
  
  const homeScore = game.home_score ?? calculateTeamScore(homeStats);
  const awayScore = game.away_score ?? calculateTeamScore(awayStats);
  
  const homeLeaders = getStatLeaders(homeStats, 3);
  const awayLeaders = getStatLeaders(awayStats, 3);
  
  const StatLeader = ({ player, teamColor, reverse }) => (
    <div className={`flex items-center gap-4 ${reverse ? 'flex-row-reverse text-right' : ''}`}>
      <div 
        className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl text-white flex-shrink-0"
        style={{ backgroundColor: teamColor }}
      >
        {player.number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white text-lg truncate">{player.name}</div>
        <div className="text-yellow-400 font-bold text-2xl">{player.pts} PTS</div>
        <div className="text-gray-400 text-sm">
          {player.totalReb} REB • {player.ast} AST
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="h-full w-full flex items-stretch" style={{ backgroundColor: '#0a0a12' }}>
      {/* Home Leaders (Left) */}
      <div className="flex-1 flex flex-col justify-center gap-4 px-6 py-4" style={{ borderRight: '2px solid #1a1a2e' }}>
        {homeLeaders.map((player, idx) => (
          <StatLeader key={idx} player={player} teamColor={homeColor} reverse={false} />
        ))}
      </div>
      
      {/* Center Scoreboard */}
      <div className="w-[40%] flex flex-col items-center justify-center px-8" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0d1117 100%)' }}>
        {/* Home Team */}
        <div className="flex items-center gap-6 mb-4">
          {game.home_team_logo && (
            <img src={game.home_team_logo} alt="" className="h-20 w-20 object-contain" />
          )}
          <div className="text-center">
            <div className="text-2xl font-bold text-white uppercase tracking-wider">{game.home_team_name}</div>
            <div className="text-7xl font-black text-white mt-1" style={{ color: homeColor }}>{homeScore}</div>
          </div>
        </div>
        
        {/* VS Divider */}
        <div className="w-full flex items-center gap-4 my-4">
          <div className="flex-1 h-0.5 bg-white/20" />
          <span className="text-gray-500 font-bold text-xl">VS</span>
          <div className="flex-1 h-0.5 bg-white/20" />
        </div>
        
        {/* Away Team */}
        <div className="flex items-center gap-6 mt-4">
          {game.away_team_logo && (
            <img src={game.away_team_logo} alt="" className="h-20 w-20 object-contain" />
          )}
          <div className="text-center">
            <div className="text-2xl font-bold text-white uppercase tracking-wider">{game.away_team_name}</div>
            <div className="text-7xl font-black text-white mt-1" style={{ color: awayColor }}>{awayScore}</div>
          </div>
        </div>
        
        {/* Period/Quarter */}
        {(game.current_quarter || game.period) && (
          <div className="mt-6 px-6 py-2 bg-white/10 rounded-lg">
            <span className="text-gray-300 font-bold uppercase tracking-wider">
              {game.period_label || `Q${game.current_quarter || game.period}`}
            </span>
          </div>
        )}
      </div>
      
      {/* Away Leaders (Right) */}
      <div className="flex-1 flex flex-col justify-center gap-4 px-6 py-4" style={{ borderLeft: '2px solid #1a1a2e' }}>
        {awayLeaders.map((player, idx) => (
          <StatLeader key={idx} player={player} teamColor={awayColor} reverse={true} />
        ))}
      </div>
    </div>
  );
}

// ============ MINIMAL SCOREBOARD LAYOUT ============
function MinimalScoreboardLayout({ game, homeStats, awayStats }) {
  const homeColor = game.home_team_color || "#6cb4ee";
  const awayColor = game.away_team_color || "#003366";
  
  const homeScore = game.home_score ?? calculateTeamScore(homeStats);
  const awayScore = game.away_score ?? calculateTeamScore(awayStats);
  
  return (
    <div className="h-full w-full flex items-center justify-center" style={{ backgroundColor: '#0a0a12' }}>
      <div className="flex items-center gap-12">
        {/* Home Team */}
        <div className="flex items-center gap-6">
          {game.home_team_logo && (
            <img src={game.home_team_logo} alt="" className="h-24 w-24 object-contain" />
          )}
          <div>
            <div className="text-3xl font-bold text-white uppercase">{game.home_team_name}</div>
            <div className="text-8xl font-black" style={{ color: homeColor }}>{homeScore}</div>
          </div>
        </div>
        
        {/* Divider */}
        <div className="text-5xl text-gray-600 font-bold">—</div>
        
        {/* Away Team */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-3xl font-bold text-white uppercase">{game.away_team_name}</div>
            <div className="text-8xl font-black" style={{ color: awayColor }}>{awayScore}</div>
          </div>
          {game.away_team_logo && (
            <img src={game.away_team_logo} alt="" className="h-24 w-24 object-contain" />
          )}
        </div>
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============
export default function JumbotronLive() {
  const { embedCode } = useParams();
  const [searchParams] = useSearchParams();
  const layoutParam = searchParams.get('layout') || 'full';
  
  const [config, setConfig] = useState(null);
  const [currentSource, setCurrentSource] = useState(null);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch jumbotron config
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
    const configInterval = setInterval(fetchConfig, 30000);
    return () => { mounted = false; clearInterval(configInterval); };
  }, [embedCode]);

  // Fetch game data
  useEffect(() => {
    if (!currentSource) return;
    
    let mounted = true;
    let hasLoadedOnce = false;
    
    const fetchGameData = async () => {
      try {
        if (currentSource.source_type === 'statmoose') {
          let shareCode = currentSource.source_url;
          if (shareCode.includes('/jumbotron/')) shareCode = shareCode.split('/jumbotron/').pop();
          else if (shareCode.includes('/share/')) shareCode = shareCode.split('/share/').pop();
          
          const res = await axios.get(`${API}/games/share/${shareCode}`, { withCredentials: false });
          if (mounted) {
            setGame(res.data);
            hasLoadedOnce = true;
            setLoading(false);
          }
        } else if (currentSource.source_type === 'prestosports') {
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
        if (mounted && !hasLoadedOnce) setLoading(false);
      }
    };
    
    fetchGameData();
    const gameInterval = setInterval(fetchGameData, 2000);
    return () => { mounted = false; clearInterval(gameInterval); };
  }, [currentSource]);

  // Determine layout based on config dimensions or URL param
  const getLayout = () => {
    if (layoutParam === 'scorers' || layoutParam === 'table') return 'scorers';
    if (layoutParam === 'minimal') return 'minimal';
    if (config) {
      const aspectRatio = config.width / config.height;
      // If very wide (aspect ratio > 3), use scorers table layout
      if (aspectRatio > 3) return 'scorers';
      // If moderately wide (aspect ratio > 2), use minimal
      if (aspectRatio > 2.5) return 'minimal';
    }
    return 'full';
  };

  if (loading && !game) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a12', fontFamily: "'Montserrat', sans-serif" }}>
        <div className="text-white text-5xl font-bold animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (error || (!game && !loading)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a12', fontFamily: "'Montserrat', sans-serif" }}>
        <div className="text-center">
          <h2 className="text-5xl text-white font-bold mb-4">{error || "No Game Data"}</h2>
          <p className="text-gray-400 text-2xl">Embed: {embedCode}</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a12', fontFamily: "'Montserrat', sans-serif" }}>
        <div className="text-white text-3xl font-bold">Waiting for game data...</div>
      </div>
    );
  }

  const homeStats = game.home_player_stats || [];
  const awayStats = game.away_player_stats || [];
  const homeOnFloor = game.home_on_floor || [];
  const awayOnFloor = game.away_on_floor || [];
  const layout = getLayout();

  return (
    <div 
      className="overflow-hidden"
      style={{ 
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: 700,
        width: config?.width ? `${config.width}px` : '100vw',
        height: config?.height ? `${config.height}px` : '100vh',
        backgroundColor: '#0a0a12'
      }} 
      data-testid="jumbotron-live-page"
    >
      {/* Google Fonts - Montserrat Bold */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Montserrat', sans-serif; }
      `}</style>
      
      {layout === 'scorers' && (
        <ScorersTableLayout game={game} homeStats={homeStats} awayStats={awayStats} />
      )}
      {layout === 'minimal' && (
        <MinimalScoreboardLayout game={game} homeStats={homeStats} awayStats={awayStats} />
      )}
      {layout === 'full' && (
        <FullDisplayLayout 
          game={game} 
          homeStats={homeStats} 
          awayStats={awayStats}
          homeOnFloor={homeOnFloor}
          awayOnFloor={awayOnFloor}
        />
      )}
      
      {/* Schedule label */}
      {currentSource?.label && (
        <div className="absolute bottom-3 right-3 px-4 py-2 rounded-lg bg-black/70 text-white text-sm font-bold uppercase tracking-wider">
          {currentSource.label}
        </div>
      )}
    </div>
  );
}
