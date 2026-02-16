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
        {/* Team Header - LARGER */}
        <div className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: teamColor }}>
          <div className="flex items-center gap-6">
            {teamLogo && <img src={teamLogo} alt="" className="h-20 w-20 object-contain" />}
            <span className="text-5xl font-extrabold text-white uppercase tracking-wide" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.5)' }}>
              {teamName}
            </span>
          </div>
          <div className="flex items-center gap-12 text-white">
            <div className="text-center">
              <div className="text-lg uppercase opacity-80 tracking-wider font-bold">TIMEOUTS</div>
              <div className="text-4xl font-extrabold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>{timeouts}</div>
            </div>
            <div className="text-center">
              <div className="text-lg uppercase opacity-80 tracking-wider font-bold">FOULS</div>
              <div className="text-4xl font-extrabold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>{fouls}</div>
            </div>
            {(inBonus || doubleBonus) && (
              <div className="px-6 py-3 rounded-lg font-extrabold uppercase text-xl tracking-wider"
                style={{ backgroundColor: doubleBonus ? '#dc2626' : '#f59e0b', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                {doubleBonus ? 'DOUBLE BONUS' : 'BONUS'}
              </div>
            )}
          </div>
        </div>
        
        {/* Stats Table - LARGER FONTS */}
        <div className="flex-1 overflow-hidden px-6 py-3">
          <table className="w-full h-full text-white" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="bg-black/50">
                <th className="w-[8%] py-3 text-center font-extrabold uppercase text-xl tracking-wider">#</th>
                <th className="w-[22%] py-3 text-left font-extrabold uppercase text-xl tracking-wider">PLAYER</th>
                <th className="w-[10%] py-3 text-center font-extrabold uppercase text-xl tracking-wider">FG</th>
                <th className="w-[10%] py-3 text-center font-extrabold uppercase text-xl tracking-wider">3PT</th>
                <th className="w-[10%] py-3 text-center font-extrabold uppercase text-xl tracking-wider">FT</th>
                <th className="w-[10%] py-3 text-center font-extrabold uppercase text-xl tracking-wider">REB</th>
                <th className="w-[10%] py-3 text-center font-extrabold uppercase text-xl tracking-wider">AST</th>
                <th className="w-[8%] py-3 text-center font-extrabold uppercase text-xl tracking-wider">PF</th>
                <th className="w-[12%] py-3 text-center font-extrabold uppercase text-xl tracking-wider text-yellow-400">PTS</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white/5' : ''}>
                  <td className="py-3 text-center font-extrabold text-2xl" style={{ color: teamColor, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                    {player.player_number || player.number}
                  </td>
                  <td className="py-3 text-left font-bold truncate text-2xl">
                    {player.player_name || player.name}
                  </td>
                  <td className="py-3 text-center text-2xl font-semibold">{player.fg}</td>
                  <td className="py-3 text-center text-2xl font-semibold">{player.fg3}</td>
                  <td className="py-3 text-center text-2xl font-semibold">{player.ft}</td>
                  <td className="py-3 text-center text-2xl font-semibold">{player.totalReb}</td>
                  <td className="py-3 text-center text-2xl font-semibold">{player.ast}</td>
                  <td className="py-3 text-center text-2xl font-semibold">{player.pf}</td>
                  <td className="py-3 text-center font-extrabold text-3xl text-yellow-400" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    {player.pts}
                  </td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="bg-black/70 border-t-4 border-white/30">
                <td className="py-3" colSpan={2}>
                  <span className="font-extrabold uppercase text-2xl tracking-wider pl-6" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    TEAM TOTALS
                  </span>
                </td>
                <td className="py-3 text-center font-bold text-2xl">{totals.fg_made}-{totals.fg_att}</td>
                <td className="py-3 text-center font-bold text-2xl">{totals.fg3_made}-{totals.fg3_att}</td>
                <td className="py-3 text-center font-bold text-2xl">{totals.ft_made}-{totals.ft_att}</td>
                <td className="py-3 text-center font-bold text-2xl">{totals.reb}</td>
                <td className="py-3 text-center font-bold text-2xl">{totals.ast}</td>
                <td className="py-3 text-center font-bold text-2xl">{totals.pf}</td>
                <td className="py-3 text-center font-extrabold text-4xl text-yellow-400" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                  {totals.pts}
                </td>
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

// ============ SCORERS TABLE LAYOUT (Short & Wide - Horizontal) ============
function ScorersTableLayout({ game, homeStats, awayStats, eventLogo }) {
  const homeColor = game.home_team_color || "#f97316";
  const awayColor = game.away_team_color || "#3b82f6";
  
  const homeScore = game.home_score ?? calculateTeamScore(homeStats);
  const awayScore = game.away_score ?? calculateTeamScore(awayStats);
  
  const homeLeaders = getStatLeaders(homeStats, 3);
  const awayLeaders = getStatLeaders(awayStats, 3);
  
  // Get top stat in each category
  const getTopStats = (stats) => {
    if (!stats || stats.length === 0) {
      return [
        { label: 'PTS', value: 0, player: 'N/A', number: '-' },
        { label: 'REB', value: 0, player: 'N/A', number: '-' },
        { label: 'AST', value: 0, player: 'N/A', number: '-' }
      ];
    }
    
    const allPlayers = stats.map(p => ({ ...p, ...calculatePlayerStats(p) }));
    const ptsLeader = allPlayers.reduce((max, p) => p.pts > max.pts ? p : max, allPlayers[0]);
    const rebLeader = allPlayers.reduce((max, p) => p.totalReb > max.totalReb ? p : max, allPlayers[0]);
    const astLeader = allPlayers.reduce((max, p) => p.ast > max.ast ? p : max, allPlayers[0]);
    
    return [
      { label: 'PTS', value: ptsLeader.pts, player: ptsLeader.player_name || ptsLeader.name, number: ptsLeader.player_number || ptsLeader.number },
      { label: 'REB', value: rebLeader.totalReb, player: rebLeader.player_name || rebLeader.name, number: rebLeader.player_number || rebLeader.number },
      { label: 'AST', value: astLeader.ast, player: astLeader.player_name || astLeader.name, number: astLeader.player_number || astLeader.number }
    ];
  };
  
  const homeTopStats = getTopStats(homeStats);
  const awayTopStats = getTopStats(awayStats);
  
  return (
    <div className="h-full w-full flex items-center px-6 py-2" style={{ backgroundColor: '#0a0a12' }}>
      {/* HOME SIDE */}
      <div className="flex items-center flex-1">
        {/* Home Stats - Vertical list */}
        <div className="flex flex-col gap-1 mr-6">
          {homeTopStats.map((stat, idx) => (
            <div key={idx} className="flex items-baseline gap-2">
              <span className="text-gray-400 text-sm font-bold uppercase w-8">{stat.label}</span>
              <span className="text-white text-2xl font-black" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{stat.value}</span>
              <span className="text-gray-500 text-xs font-semibold truncate max-w-20">#{stat.number}</span>
            </div>
          ))}
        </div>
        
        {/* Home Team Name */}
        <div className="flex items-center gap-3 mr-4">
          {game.home_team_logo && (
            <img src={game.home_team_logo} alt="" className="h-12 w-12 object-contain" />
          )}
          <span className="text-xl font-extrabold text-white uppercase tracking-wider" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
            {game.home_team_name}
          </span>
        </div>
        
        {/* Home Score */}
        <div 
          className="text-6xl font-black"
          style={{ color: homeColor, textShadow: '3px 3px 6px rgba(0,0,0,0.5)' }}
        >
          {homeScore}
        </div>
      </div>
      
      {/* CENTER - VS Badge */}
      <div className="flex-shrink-0 mx-8">
        {eventLogo ? (
          <img src={eventLogo} alt="" className="h-16 w-auto object-contain" />
        ) : (
          <div 
            className="px-6 py-2 rounded-lg font-black text-2xl text-white uppercase tracking-wider"
            style={{ 
              background: 'linear-gradient(135deg, #1a1a2e 0%, #2d3748 100%)',
              border: '2px solid #4a5568',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            VS
          </div>
        )}
      </div>
      
      {/* AWAY SIDE */}
      <div className="flex items-center flex-1 justify-end">
        {/* Away Score */}
        <div 
          className="text-6xl font-black"
          style={{ color: awayColor, textShadow: '3px 3px 6px rgba(0,0,0,0.5)' }}
        >
          {awayScore}
        </div>
        
        {/* Away Team Name */}
        <div className="flex items-center gap-3 ml-4">
          <span className="text-xl font-extrabold text-white uppercase tracking-wider" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
            {game.away_team_name}
          </span>
          {game.away_team_logo && (
            <img src={game.away_team_logo} alt="" className="h-12 w-12 object-contain" />
          )}
        </div>
        
        {/* Away Stats - Vertical list (right aligned) */}
        <div className="flex flex-col gap-1 ml-6">
          {awayTopStats.map((stat, idx) => (
            <div key={idx} className="flex items-baseline gap-2 justify-end">
              <span className="text-gray-500 text-xs font-semibold truncate max-w-20">#{stat.number}</span>
              <span className="text-white text-2xl font-black" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{stat.value}</span>
              <span className="text-gray-400 text-sm font-bold uppercase w-8 text-right">{stat.label}</span>
            </div>
          ))}
        </div>
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
      <div className="flex items-center gap-16">
        {/* Home Team */}
        <div className="flex items-center gap-8">
          {game.home_team_logo && (
            <img src={game.home_team_logo} alt="" className="h-32 w-32 object-contain" />
          )}
          <div>
            <div className="text-4xl font-extrabold text-white uppercase" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              {game.home_team_name}
            </div>
            <div className="text-9xl font-black" style={{ color: homeColor, textShadow: '4px 4px 8px rgba(0,0,0,0.5)' }}>
              {homeScore}
            </div>
          </div>
        </div>
        
        {/* Divider */}
        <div className="text-6xl text-gray-500 font-black">—</div>
        
        {/* Away Team */}
        <div className="flex items-center gap-8">
          <div className="text-right">
            <div className="text-4xl font-extrabold text-white uppercase" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              {game.away_team_name}
            </div>
            <div className="text-9xl font-black" style={{ color: awayColor, textShadow: '4px 4px 8px rgba(0,0,0,0.5)' }}>
              {awayScore}
            </div>
          </div>
          {game.away_team_logo && (
            <img src={game.away_team_logo} alt="" className="h-32 w-32 object-contain" />
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

  // Determine layout
  const getLayout = () => {
    if (layoutParam === 'scorers' || layoutParam === 'table') return 'scorers';
    if (layoutParam === 'minimal') return 'minimal';
    if (config) {
      const aspectRatio = config.width / config.height;
      if (aspectRatio > 3) return 'scorers';
      if (aspectRatio > 2.5) return 'minimal';
    }
    return 'full';
  };

  if (loading && !game) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a12', fontFamily: "'Montserrat', sans-serif" }}>
        <div className="text-white text-6xl font-extrabold animate-pulse" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.5)' }}>
          LOADING...
        </div>
      </div>
    );
  }

  if (error || (!game && !loading)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a12', fontFamily: "'Montserrat', sans-serif" }}>
        <div className="text-center">
          <h2 className="text-6xl text-white font-extrabold mb-6" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.5)' }}>
            {error || "No Game Data"}
          </h2>
          <p className="text-gray-400 text-3xl font-bold">Embed: {embedCode}</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a12', fontFamily: "'Montserrat', sans-serif" }}>
        <div className="text-white text-4xl font-extrabold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          Waiting for game data...
        </div>
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
        * { font-family: 'Montserrat', sans-serif !important; }
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
        <div 
          className="absolute bottom-4 right-4 px-6 py-3 rounded-lg bg-black/80 text-white text-lg font-extrabold uppercase tracking-wider"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          {currentSource.label}
        </div>
      )}
    </div>
  );
}
