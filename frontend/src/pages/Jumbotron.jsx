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
    raw: { fg_made, fg_att, fg3_made, fg3_att, ft_made, ft_att, totalReb, ast: stats.assists || stats.assist || 0, pf: stats.fouls || stats.foul || stats.pf || 0, pts }
  };
};

// Shared font style for broadcast look - Montserrat Bold
const broadcastFont = {
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 700,
  textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
};

// Team Panel Component - Broadcast Style with Maximum Text Size
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
      <div className="relative z-10 flex flex-col h-full min-h-0">
        {/* Team Header - LARGER */}
        <div 
          className="flex items-center px-6 py-4 flex-shrink-0"
          style={{ 
            background: `linear-gradient(90deg, ${teamColor}40 0%, transparent 60%)`,
            borderBottom: `4px solid ${teamColor}`
          }}
        >
          {/* Team Logo */}
          <div className="flex-shrink-0 mr-6">
            {teamLogo ? (
              <img src={teamLogo} alt={teamName} className="w-20 h-20 object-contain drop-shadow-lg" />
            ) : (
              <div 
                className="w-20 h-20 rounded-lg flex items-center justify-center text-5xl text-white shadow-lg"
                style={{ backgroundColor: teamColor, ...broadcastFont }}
              >
                {teamName?.charAt(0) || '?'}
              </div>
            )}
          </div>
          
          {/* Team Name */}
          <h2 
            className="text-5xl text-white uppercase tracking-wide flex-1"
            style={broadcastFont}
          >
            {teamName}
          </h2>
          
          {/* Stats */}
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <span className="text-gray-300 text-2xl uppercase" style={broadcastFont}>Timeouts</span>
              <span className="text-white text-4xl" style={broadcastFont}>{timeouts}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-gray-300 text-2xl uppercase" style={broadcastFont}>Fouls</span>
              <span className="text-white text-4xl" style={broadcastFont}>{totalFouls}</span>
            </div>
            
            {(inBonus || doubleBonus) && (
              <div 
                className="px-6 py-2 rounded-md text-2xl text-white uppercase"
                style={{ 
                  backgroundColor: '#1e40af',
                  border: '2px solid #3b82f6',
                  ...broadcastFont
                }}
              >
                {doubleBonus ? "BONUS++" : "BONUS"}
              </div>
            )}
          </div>
        </div>
        
        {/* Stats Table - LARGER FONTS */}
        <div className="flex-1 px-4 min-h-0 flex flex-col">
          {/* Header Row */}
          <div 
            className="grid grid-cols-[80px_1fr_80px_100px_100px_100px_80px_70px_70px] gap-1 py-2 flex-shrink-0"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            <div className="text-gray-100 text-xl uppercase pl-4 font-extrabold" style={broadcastFont}>#</div>
            <div className="text-gray-100 text-xl uppercase font-extrabold" style={broadcastFont}>Player</div>
            <div className="text-gray-100 text-xl uppercase text-center font-extrabold" style={broadcastFont}>PTS</div>
            <div className="text-gray-100 text-xl uppercase text-center font-extrabold" style={broadcastFont}>FG</div>
            <div className="text-gray-100 text-xl uppercase text-center font-extrabold" style={broadcastFont}>3FG</div>
            <div className="text-gray-100 text-xl uppercase text-center font-extrabold" style={broadcastFont}>FT</div>
            <div className="text-gray-100 text-xl uppercase text-center font-extrabold" style={broadcastFont}>REB</div>
            <div className="text-gray-100 text-xl uppercase text-center font-extrabold" style={broadcastFont}>A</div>
            <div className="text-gray-100 text-xl uppercase text-center font-extrabold" style={broadcastFont}>PF</div>
          </div>

          {/* Player Rows - stretch to fill available space */}
          <div className="flex-1 flex flex-col justify-evenly min-h-0">
            {displayPlayers.length === 0 ? (
              <div className="text-center text-gray-400 text-3xl py-2" style={broadcastFont}>
                No players on floor
              </div>
            ) : (
              displayPlayers.map((player, index) => (
                <div 
                  key={index}
                  className="grid grid-cols-[80px_1fr_80px_100px_100px_100px_80px_70px_70px] gap-1 items-center flex-1"
                  style={{ backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)' }}
                >
                  <div className="text-3xl text-white pl-4 font-extrabold" style={broadcastFont}>
                    {player.number || '?'}
                  </div>
                  <div className="text-3xl text-white uppercase truncate font-bold" style={broadcastFont}>
                    {player.name?.split(' ').pop() || 'Unknown'}
                  </div>
                  <div className="text-3xl text-yellow-400 text-center font-extrabold" style={broadcastFont}>
                    {player.pts}
                  </div>
                  <div className="text-2xl text-white text-center font-semibold" style={broadcastFont}>
                    {player.fg}
                  </div>
                  <div className="text-2xl text-white text-center font-semibold" style={broadcastFont}>
                    {player.fg3}
                  </div>
                  <div className="text-2xl text-white text-center font-semibold" style={broadcastFont}>
                    {player.ft}
                  </div>
                  <div className="text-2xl text-white text-center font-semibold" style={broadcastFont}>
                    {player.totalReb}
                  </div>
                  <div className="text-2xl text-white text-center font-semibold" style={broadcastFont}>
                    {player.ast}
                  </div>
                  <div className={`text-2xl text-center font-semibold ${player.pf >= 5 ? 'text-red-400' : 'text-white'}`} style={broadcastFont}>
                    {player.pf}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* TOTALS Row */}
          <div 
            className="grid grid-cols-[80px_1fr_80px_100px_100px_100px_80px_70px_70px] gap-1 py-2 items-center flex-shrink-0"
            style={{ backgroundColor: '#1e40af' }}
          >
            <div className="text-2xl text-white uppercase pl-4 col-span-2 font-extrabold" style={broadcastFont}>
              TOTALS
            </div>
            <div className="text-3xl text-yellow-400 text-center font-extrabold" style={broadcastFont}>
              {totals.pts}
            </div>
            <div className="text-2xl text-white text-center font-bold" style={broadcastFont}>
              {totals.fg_made}-{totals.fg_att}
            </div>
            <div className="text-2xl text-white text-center font-bold" style={broadcastFont}>
              {totals.fg3_made}-{totals.fg3_att}
            </div>
            <div className="text-2xl text-white text-center font-bold" style={broadcastFont}>
              {totals.ft_made}-{totals.ft_att}
            </div>
            <div className="text-xl text-white text-center" style={broadcastFont}>
              {totals.reb}
            </div>
            <div className="text-xl text-white text-center" style={broadcastFont}>
              {totals.ast}
            </div>
            <div className="text-xl text-white text-center" style={broadcastFont}>
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
    
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => { mounted = false; clearInterval(interval); };
  }, [shareCode]);

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

  if (!game) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#0a1628' }}>
        <div className="text-center">
          <h2 className="text-5xl text-white mb-4" style={broadcastFont}>Game Not Found</h2>
          <p className="text-gray-400 text-2xl">Share code: {shareCode}</p>
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

  const homeTimeouts = game.home_timeouts ?? (game.total_timeouts || 5) - (game.home_timeouts_used || 0);
  const awayTimeouts = game.away_timeouts ?? (game.total_timeouts || 5) - (game.away_timeouts_used || 0);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#0f0f1a', fontFamily: "'Montserrat', sans-serif" }} data-testid="jumbotron-page">
      {/* Google Fonts - Montserrat Bold */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');`}</style>
      
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
    </div>
  );
}
