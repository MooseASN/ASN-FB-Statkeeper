import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { ExternalLink } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EmbedLatestGame() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noGame, setNoGame] = useState(false);
  const [scale, setScale] = useState(1);

  // Get custom dimensions from URL params
  const customWidth = parseInt(searchParams.get('w')) || null;
  const customHeight = parseInt(searchParams.get('h')) || null;

  // Base dimensions
  const baseWidth = 1920;
  const baseHeight = 300;

  // Calculate scale based on container size
  useEffect(() => {
    const calculateScale = () => {
      if (customWidth && customHeight) {
        const scaleX = customWidth / baseWidth;
        const scaleY = customHeight / baseHeight;
        setScale(Math.min(scaleX, scaleY));
      } else {
        // Auto-scale to fit window
        const scaleX = window.innerWidth / baseWidth;
        const scaleY = window.innerHeight / baseHeight;
        setScale(Math.min(scaleX, scaleY, 1));
      }
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [customWidth, customHeight]);

  useEffect(() => {
    let mounted = true;
    
    // Initial fetch
    const initialFetch = async () => {
      try {
        const res = await axios.get(`${API}/games/latest/active/${userId}`);
        if (mounted) {
          if (res.data) {
            setGame(res.data);
            setNoGame(false);
          } else {
            setGame(null);
            setNoGame(true);
          }
        }
      } catch (err) {
        if (mounted) {
          setGame(null);
          setNoGame(true);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    initialFetch();
    
    // Auto-refresh every 5 seconds - only update if we get valid data
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/games/latest/active/${userId}`);
        if (mounted) {
          if (res.data) {
            setGame(res.data);
            setNoGame(false);
          }
          // Don't clear game on refresh failure - keep showing last data
        }
      } catch (err) {
        // Silently ignore refresh errors
      }
    }, 5000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [userId]);

  const calculateScore = (team) => {
    return game?.quarter_scores?.[team]?.reduce((a, b) => a + b, 0) || 0;
  };

  const getQuarterLabel = (q) => {
    const periodLabelType = game?.period_label;
    
    if (periodLabelType === "Half") {
      if (q === 1) return "1st Half";
      if (q === 2) return "2nd Half";
      return `OT${q - 2}`;
    }
    
    const label = periodLabelType === "Period" ? "P" : "Q";
    if (q <= 4) return `${label}${q}`;
    return `OT${q - 4}`;
  };

  const getLeadingScorer = (stats) => {
    if (!stats || stats.length === 0) return null;
    
    const withPoints = stats.map(p => ({
      ...p,
      points: p.ft_made + (p.fg2_made * 2) + (p.fg3_made * 3)
    }));
    
    const sorted = withPoints.sort((a, b) => b.points - a.points);
    return sorted[0];
  };

  // Container style for scaling
  const containerStyle = {
    width: customWidth || '100vw',
    height: customHeight || '100vh',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000'
  };

  // Banner style with scale transform
  const bannerStyle = {
    width: `${baseWidth}px`,
    height: `${baseHeight}px`,
    transform: `scale(${scale})`,
    transformOrigin: 'center center',
    fontFamily: "'Inter', system-ui, sans-serif"
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={bannerStyle} className="bg-black flex items-center justify-center">
          <img src="/logo-white.png" alt="StatMoose" className="w-12 h-12 animate-pulse" />
        </div>
      </div>
    );
  }

  if (noGame || !game) {
    return (
      <div style={containerStyle}>
        <div style={bannerStyle} className="bg-black flex items-center justify-center">
          <div className="text-center">
            <img src="/logo-white.png" alt="StatMoose" className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-white/70 text-xl">No live game at the moment</p>
            <p className="text-white/40 text-sm mt-2">Check back when a game is in progress</p>
          </div>
        </div>
      </div>
    );
  }

  const homeScore = calculateScore("home");
  const awayScore = calculateScore("away");
  const homeLeader = getLeadingScorer(game.home_player_stats);
  const awayLeader = getLeadingScorer(game.away_player_stats);
  
  const homeColor = game.home_team_color || "#dc2626";
  const awayColor = game.away_team_color || "#7c3aed";
  
  const fullViewUrl = `${window.location.origin}/live/${game.share_code}`;

  return (
    <div style={containerStyle}>
      <div 
        style={bannerStyle}
        className="bg-black flex items-center justify-between px-16 relative overflow-hidden"
      >
        {/* Background decorations */}
        <div 
          className="absolute left-0 top-0 w-1/3 h-full opacity-15"
          style={{ background: `linear-gradient(135deg, ${homeColor} 0%, transparent 100%)` }}
        />
        <div 
          className="absolute right-0 top-0 w-1/3 h-full opacity-15"
          style={{ background: `linear-gradient(225deg, ${awayColor} 0%, transparent 100%)` }}
        />

        {/* Home Team Section */}
        <div className="flex items-center gap-8 z-10">
          {/* Team Logo */}
          <div className="w-32 h-32 rounded-full flex items-center justify-center bg-white/5 border-4" style={{ borderColor: homeColor }}>
            {game.home_team_logo ? (
              <img src={game.home_team_logo} alt={game.home_team_name} className="w-24 h-24 object-contain" />
            ) : (
              <span className="text-5xl font-bold text-white">{game.home_team_name?.charAt(0)}</span>
            )}
          </div>
          
          <div className="text-left">
            <h2 className="text-3xl font-bold text-white mb-2">{game.home_team_name}</h2>
            {homeLeader && homeLeader.points > 0 && (
              <div className="text-white/70">
                <span className="text-sm">Leading:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: homeColor }}
                  >
                    {homeLeader.player_number}
                  </span>
                  <span className="text-lg font-semibold text-white">{homeLeader.player_name}</span>
                  <span className="text-2xl font-bold" style={{ color: homeColor }}>{homeLeader.points} PTS</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Score Section */}
        <div className="text-center z-10">
          {/* Clock (if enabled) - above score */}
          {game.clock_enabled && (
            <div className="mb-2">
              <span className="text-4xl font-mono font-bold text-white">
                {Math.floor((game.clock_time || 0) / 60)}:{((game.clock_time || 0) % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Score */}
          <div className="flex items-center gap-8">
            <span className="text-8xl font-black text-white" style={{ textShadow: `0 0 40px ${homeColor}` }}>
              {homeScore}
            </span>
            <span className="text-4xl text-white/30 font-light">-</span>
            <span className="text-8xl font-black text-white" style={{ textShadow: `0 0 40px ${awayColor}` }}>
              {awayScore}
            </span>
          </div>

          {/* Quarter/Period - below score */}
          <div className="mt-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 rounded-full text-white font-bold text-sm">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              {game.is_halftime ? 'HALF' : `LIVE - ${getQuarterLabel(game.current_quarter)}`}
            </span>
          </div>
        </div>

        {/* Away Team Section */}
        <div className="flex items-center gap-8 z-10">
          <div className="text-right">
            <h2 className="text-3xl font-bold text-white mb-2">{game.away_team_name}</h2>
            {awayLeader && awayLeader.points > 0 && (
              <div className="text-white/70">
                <span className="text-sm">Leading:</span>
                <div className="flex items-center gap-2 mt-1 justify-end">
                  <span className="text-2xl font-bold" style={{ color: awayColor }}>{awayLeader.points} PTS</span>
                  <span className="text-lg font-semibold text-white">{awayLeader.player_name}</span>
                  <span 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: awayColor }}
                  >
                    {awayLeader.player_number}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Team Logo */}
          <div className="w-32 h-32 rounded-full flex items-center justify-center bg-white/5 border-4" style={{ borderColor: awayColor }}>
            {game.away_team_logo ? (
              <img src={game.away_team_logo} alt={game.away_team_name} className="w-24 h-24 object-contain" />
            ) : (
              <span className="text-5xl font-bold text-white">{game.away_team_name?.charAt(0)}</span>
            )}
          </div>
        </div>

        {/* Full Stats Button */}
        <a 
          href={fullViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-6 right-6 flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-100 transition-colors z-20"
        >
          <span>Full Live Stats</span>
          <ExternalLink className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
}
