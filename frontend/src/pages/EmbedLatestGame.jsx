import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { ExternalLink } from "lucide-react";
import MooseIcon from "@/components/MooseIcon";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EmbedLatestGame() {
  const { userId } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noGame, setNoGame] = useState(false);

  const fetchLatestGame = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/games/latest/active/${userId}`);
      if (res.data) {
        setGame(res.data);
        setNoGame(false);
      } else {
        setGame(null);
        setNoGame(true);
      }
    } catch (err) {
      setGame(null);
      setNoGame(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchLatestGame();
    const interval = setInterval(fetchLatestGame, 5000); // Auto-refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchLatestGame]);

  const calculateScore = (team) => {
    return game?.quarter_scores?.[team]?.reduce((a, b) => a + b, 0) || 0;
  };

  const getQuarterLabel = (q) => {
    if (q <= 4) return `Q${q}`;
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

  if (loading) {
    return (
      <div className="w-[1920px] h-[300px] bg-black flex items-center justify-center">
        <MooseIcon className="w-12 h-12 animate-pulse text-white" />
      </div>
    );
  }

  if (noGame || !game) {
    return (
      <div className="w-[1920px] h-[300px] bg-black flex items-center justify-center">
        <div className="text-center">
          <MooseIcon className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <p className="text-white/70 text-xl">No live game at the moment</p>
          <p className="text-white/40 text-sm mt-2">Check back when a game is in progress</p>
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
    <div 
      className="w-[1920px] h-[300px] bg-black flex items-center justify-between px-16 relative overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
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
        {/* Status badge */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 rounded-full text-white font-bold text-sm">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            LIVE - {getQuarterLabel(game.current_quarter)}
          </span>
        </div>

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

        {/* StatMoose branding */}
        <div className="flex items-center justify-center gap-2 mt-4 text-white/40">
          <MooseIcon className="w-5 h-5" />
          <span className="text-sm font-medium">StatMoose Basketball</span>
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
  );
}
